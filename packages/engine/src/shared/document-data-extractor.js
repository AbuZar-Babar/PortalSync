/**
 * src/shared/document-data-extractor.js
 * 
 * Zero-dependency document data extraction and financial reconciliation engine:
 * - Decompresses and extracts text streams from PDF buffers
 * - Parses accounting fields (Invoice #, Date, Due Date, Tax, Subtotal, Total)
 * - Parses CSV, TSV, and JSON tabular payloads
 * - Performs automated Web-to-Document amount reconciliation
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/**
 * Strips currency symbols, thousands commas, and whitespace, returning a clean float or null
 */
function parseNumericCurrency(val) {
  if (val == null) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const str = String(val).replace(/[$€£¥]/g, '').replace(/,/g, '').trim();
  const match = str.match(/[-+]?\d+(?:\.\d+)?/);
  if (!match) return null;
  const num = parseFloat(match[0]);
  return isNaN(num) ? null : num;
}

/**
 * Extracts visible text runs from raw PDF binary buffers by inspecting
 * FlateDecode compressed streams and unescaped PDF string literals.
 */
function extractTextFromPdfBuffer(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return '';
  }

  const textChunks = [];

  function extractStreamText(streamStr) {
    if (!streamStr) return;

    // 1. Process PDF text objects BT ... ET
    const btEtRegex = /BT[\s\S]*?ET/g;
    let match;
    while ((match = btEtRegex.exec(streamStr)) !== null) {
      const block = match[0];

      // Extract parenthesized literal strings: (string text) Tj, [(str1) 120 (str2)] TJ
      const stringLiteralRegex = /\((?:[^()\\]|\\.)*\)/g;
      let strMatch;
      while ((strMatch = stringLiteralRegex.exec(block)) !== null) {
        let rawStr = strMatch[0].slice(1, -1);
        rawStr = rawStr
          .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\b/g, '\b')
          .replace(/\\f/g, '\f')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\\\/g, '\\');

        if (rawStr.trim()) {
          textChunks.push(rawStr.trim());
        }
      }

      // Extract hex strings: <48656C6C6F>
      const hexLiteralRegex = /<([0-9A-Fa-f\s]{2,})>/g;
      let hexMatch;
      while ((hexMatch = hexLiteralRegex.exec(block)) !== null) {
        const hex = hexMatch[1].replace(/\s+/g, '');
        if (hex.length >= 2 && hex.length % 2 === 0) {
          try {
            const buf = Buffer.from(hex, 'hex');
            const decoded = buf.toString('latin1');
            if (/^[\x20-\x7E\s]+$/.test(decoded) && decoded.trim()) {
              textChunks.push(decoded.trim());
            }
          } catch {}
        }
      }
    }
  }

  // Scan PDF streams: stream ... endstream
  const streamMarker = Buffer.from('stream');
  const endStreamMarker = Buffer.from('endstream');
  let searchPos = 0;

  while (searchPos < buffer.length) {
    const streamStartIdx = buffer.indexOf(streamMarker, searchPos);
    if (streamStartIdx === -1) break;

    let dataStart = streamStartIdx + 6;
    if (buffer[dataStart] === 0x0d && buffer[dataStart + 1] === 0x0a) {
      dataStart += 2;
    } else if (buffer[dataStart] === 0x0a || buffer[dataStart] === 0x0d) {
      dataStart += 1;
    }

    const streamEndIdx = buffer.indexOf(endStreamMarker, dataStart);
    if (streamEndIdx === -1) break;

    let dataEnd = streamEndIdx;
    if (dataEnd > dataStart && (buffer[dataEnd - 1] === 0x0a || buffer[dataEnd - 1] === 0x0d)) {
      dataEnd -= 1;
      if (dataEnd > dataStart && buffer[dataEnd - 1] === 0x0d) {
        dataEnd -= 1;
      }
    }

    const streamSlice = buffer.subarray(dataStart, dataEnd);

    // Check preceding dictionary for /FlateDecode
    const precedingHeader = buffer.subarray(Math.max(0, streamStartIdx - 250), streamStartIdx).toString('latin1');
    const isFlate = precedingHeader.includes('/FlateDecode') || precedingHeader.includes('/Fl');

    let decompressed = null;
    if (isFlate) {
      try {
        decompressed = zlib.inflateSync(streamSlice);
      } catch {
        try {
          decompressed = zlib.inflateRawSync(streamSlice);
        } catch {}
      }
    }

    const contentBuffer = decompressed || streamSlice;
    try {
      const contentStr = contentBuffer.toString('latin1');
      extractStreamText(contentStr);
    } catch {}

    searchPos = streamEndIdx + 9;
  }

  // Fallback scan for uncompressed text runs
  if (textChunks.length < 5) {
    const rawStr = buffer.toString('latin1');
    extractStreamText(rawStr);

    const asciiRegex = /[\x20-\x7E\t\r\n]{4,}/g;
    let m;
    while ((m = asciiRegex.exec(rawStr)) !== null) {
      const run = m[0].trim();
      if (run && (run.includes('Invoice') || run.includes('Total') || run.includes('Due') || run.includes('Date') || run.includes('Amount') || run.includes('$') || run.includes('Tax'))) {
        textChunks.push(run);
      }
    }
  }

  return textChunks.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Extracts key accounting and invoice fields using targeted regular expressions
 */
function parseFinanceFieldsFromText(text) {
  if (!text || typeof text !== 'string') {
    return {};
  }

  const fields = {};

  // 1. Invoice Number
  const invoiceNumMatch = text.match(/\b(?:Invoice\s*(?:No|Number|#)?|Inv\s*#?)\s*[:#-]?\s*([A-Z0-9][A-Z0-9-_\/]{2,24})\b/i);
  if (invoiceNumMatch) {
    fields.Doc_Invoice_Number = invoiceNumMatch[1].trim();
  }

  // 2. Invoice Date
  const dateMatch = text.match(/\b(?:Invoice\s*Date|Date\s*Issued|Billing\s*Date|Date)\s*[:#-]?\s*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\b/i);
  if (dateMatch) {
    fields.Doc_Date = dateMatch[1].trim();
  }

  // 3. Due Date
  const dueDateMatch = text.match(/\b(?:Due\s*Date|Payment\s*Due|Pay\s*By)\s*[:#-]?\s*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\b/i);
  if (dueDateMatch) {
    fields.Doc_Due_Date = dueDateMatch[1].trim();
  }

  // 4. Tax / VAT Amount
  const taxMatch = text.match(/\b(?:Tax|VAT|GST|Sales\s*Tax)\s*[:#-]?\s*([$€£¥]?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\b/i);
  if (taxMatch) {
    fields.Doc_Tax_Amount = taxMatch[1].trim();
  }

  // 5. Subtotal
  const subtotalMatch = text.match(/\b(?:Subtotal|Sub-Total|Net\s*Amount)\s*[:#-]?\s*([$€£¥]?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\b/i);
  if (subtotalMatch) {
    fields.Doc_Subtotal = subtotalMatch[1].trim();
  }

  // 6. Total Amount
  const totalMatch = text.match(/\b(?:Total\s*Due|Amount\s*Due|Balance\s*Due|Grand\s*Total|Invoice\s*Total|Total)\s*[:#-]?\s*([$€£¥]?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\b/i);
  if (totalMatch) {
    fields.Doc_Total_Amount = totalMatch[1].trim();
  }

  return fields;
}

/**
 * Extracts tabular metadata and totals from CSV, TSV, or JSON files
 */
function extractFromCsvOrJson(buffer, ext) {
  if (!buffer || !Buffer.isBuffer(buffer)) return {};
  const content = buffer.toString('utf8').trim();
  if (!content) return {};

  const fields = {};

  if (ext === '.json') {
    try {
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        fields.Doc_Row_Count = data.length;
        if (data.length > 0 && typeof data[0] === 'object') {
          const sample = data[0];
          for (const [k, v] of Object.entries(sample)) {
            if (/invoice|bill|doc_num/i.test(k) && typeof v === 'string') fields.Doc_Invoice_Number = v;
            if (/date/i.test(k) && typeof v === 'string') fields.Doc_Date = v;
            if (/total|amount|due/i.test(k) && v != null) fields.Doc_Total_Amount = String(v);
          }
        }
      } else if (typeof data === 'object') {
        for (const [k, v] of Object.entries(data)) {
          if (/invoice|bill/i.test(k) && typeof v === 'string') fields.Doc_Invoice_Number = v;
          if (/date/i.test(k) && typeof v === 'string') fields.Doc_Date = v;
          if (/total|amount/i.test(k) && v != null) fields.Doc_Total_Amount = String(v);
        }
      }
    } catch {}
    return fields;
  }

  // CSV or TSV
  const delimiter = ext === '.tsv' ? '\t' : ',';
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length > 0) {
    fields.Doc_Row_Count = Math.max(0, lines.length - 1);
    const headers = lines[0].split(delimiter).map(h => h.replace(/^["']|["']$/g, '').trim());
    if (headers.length > 0) {
      fields.Doc_Columns = headers.slice(0, 10).join(', ');
    }

    // Inspect first row data
    if (lines.length > 1) {
      const firstRow = lines[1].split(delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());
      headers.forEach((h, idx) => {
        const val = firstRow[idx] || '';
        if (/invoice|doc_no|inv_#/i.test(h) && val) fields.Doc_Invoice_Number = val;
        if (/due_date/i.test(h) && val) fields.Doc_Due_Date = val;
        else if (/date/i.test(h) && val) fields.Doc_Date = val;
        if (/tax|vat/i.test(h) && val) fields.Doc_Tax_Amount = val;
        if (/total|amount|balance/i.test(h) && val) fields.Doc_Total_Amount = val;
      });
    }
  }

  return fields;
}

/**
 * Automated reconciliation between parsed document fields and web table fields
 */
function reconcileWithWebFields(docFields = {}, webFields = {}) {
  if (!docFields || typeof docFields !== 'object') {
    return { status: 'UNVERIFIED', delta: null };
  }

  const docTotalNum = parseNumericCurrency(docFields.Doc_Total_Amount || docFields.Doc_Subtotal);

  // Scan webFields for candidate amount values
  let webTotalNum = null;
  let candidateFieldKey = null;

  // 1. Priority check on specific key names
  const priorityKeys = ['total', 'total_amount', 'amount_due', 'balance_due', 'invoice_total', 'amount', 'balance', 'price', 'net'];
  for (const pKey of priorityKeys) {
    for (const [k, v] of Object.entries(webFields)) {
      if (k.toLowerCase() === pKey || k.toLowerCase().replace(/[^a-z]/g, '') === pKey) {
        const num = parseNumericCurrency(v);
        if (num !== null) {
          webTotalNum = num;
          candidateFieldKey = k;
          break;
        }
      }
    }
    if (webTotalNum !== null) break;
  }

  // 2. Fallback scan on any key matching amount or currency-like string
  if (webTotalNum === null) {
    for (const [k, v] of Object.entries(webFields)) {
      if (/amount|total|balance|due|price|cost|net/i.test(k)) {
        const num = parseNumericCurrency(v);
        if (num !== null) {
          webTotalNum = num;
          candidateFieldKey = k;
          break;
        }
      }
    }
  }

  if (webTotalNum !== null && docTotalNum !== null) {
    const delta = Number((docTotalNum - webTotalNum).toFixed(2));
    const isMatch = Math.abs(delta) <= 0.01;
    return {
      status: isMatch ? 'MATCHED' : 'MISMATCH',
      delta,
      matchedKey: candidateFieldKey
    };
  }

  if (Object.keys(docFields).length > 0) {
    return { status: 'EXTRACTED', delta: null };
  }

  return { status: 'UNVERIFIED', delta: null };
}

/**
 * Universal document extraction and reconciliation entrypoint
 */
function extractFromFile(filePath, fileBuffer = null, webFields = {}) {
  if (!filePath && !fileBuffer) {
    return { extractedFields: {}, reconciliationStatus: 'UNVERIFIED', reconciliationDelta: null };
  }

  let buf = fileBuffer;
  if (!buf && filePath && fs.existsSync(filePath)) {
    try {
      buf = fs.readFileSync(filePath);
    } catch {
      return { extractedFields: {}, reconciliationStatus: 'UNVERIFIED', reconciliationDelta: null };
    }
  }

  if (!buf || !Buffer.isBuffer(buf) || buf.length === 0) {
    return { extractedFields: {}, reconciliationStatus: 'UNVERIFIED', reconciliationDelta: null };
  }

  const ext = path.extname(filePath || '').toLowerCase();
  let extractedFields = {};

  if (ext === '.pdf') {
    const rawText = extractTextFromPdfBuffer(buf);
    extractedFields = parseFinanceFieldsFromText(rawText);
  } else if (['.csv', '.tsv', '.json'].includes(ext)) {
    extractedFields = extractFromCsvOrJson(buf, ext);
  } else if (['.txt', '.text', '.log'].includes(ext)) {
    const rawText = buf.toString('utf8');
    extractedFields = parseFinanceFieldsFromText(rawText);
  }

  const reconciliation = reconcileWithWebFields(extractedFields, webFields);

  return {
    extractedFields,
    reconciliationStatus: reconciliation.status,
    reconciliationDelta: reconciliation.delta
  };
}

module.exports = {
  extractTextFromPdfBuffer,
  parseFinanceFieldsFromText,
  parseNumericCurrency,
  extractFromCsvOrJson,
  reconcileWithWebFields,
  extractFromFile
};
