/**
 * Test Fixtures & Vectors
 */

const crypto = require('node:crypto');

const ORG_1_ID = 'e3b0c442-98fc-4c14-9afe-000000000001';
const ORG_2_ID = 'e3b0c442-98fc-4c14-9afe-000000000002';

const TOKENS = {
  validOrg1: `ps_live_${ORG_1_ID}`,
  validOrg2: `ps_live_${ORG_2_ID}`,
  validShort: 'ps_live_89f214ac',
  invalidPrefix: `ps_test_${ORG_1_ID}`,
  invalidNoPrefix: ORG_1_ID,
  invalidEmpty: '',
  invalidRandom: 'random_bearer_token_12345',
  invalidMalformedPrefix: 'ps_live',
};

const SAMPLE_RECORDED_WORKFLOW = {
  metadata: {
    recordingId: 'rec_supplier_invoices_v1',
    name: 'Acme Supplier Invoices',
    version: '1.0.0',
    startUrl: 'https://supplier.acme-corp.internal/invoices',
    mode: 'LOOP',
    createdAt: '2026-10-06T10:00:00Z',
    description: 'Automated retrieval of monthly supplier invoices',
  },
  steps: [
    {
      id: 'step_1_nav',
      type: 'NAVIGATE',
      url: 'https://supplier.acme-corp.internal/invoices',
      timeoutMs: 15000,
    },
    {
      id: 'step_2_auth_check',
      type: 'AUTH_PROBE',
      selector: '#login-container',
      required: false,
    },
    {
      id: 'step_3_table_discovery',
      type: 'TABLE_DISCOVERY',
      tableSelector: '#invoice-grid',
      rowSelector: 'tbody tr.invoice-row',
    },
    {
      id: 'step_4_download_item',
      type: 'CLICK_DOWNLOAD',
      downloadButtonSelector: 'a.btn-download-pdf',
      filenamePattern: 'INV_{invoiceNumber}_{date}.pdf',
    },
    {
      id: 'step_5_pagination',
      type: 'PAGINATE',
      nextButtonSelector: 'button.pagination-next',
      maxPages: 5,
    },
  ],
};

const SAMPLE_QUICK_SETUP_PAYLOAD = {
  org_id: ORG_1_ID,
  name: 'Acme Invoices Quick Setup',
  portal_url: 'https://supplier.acme-corp.internal/invoices',
  schedule: '0 9 * * 1', // Weekly on Mondays at 9am
  target_folder: 'C:\\Invoices\\Acme',
  upload_to_cloud: true,
  filter_rules: {
    status: 'unpaid',
    min_amount: 100,
  },
};

function computeSha256(bufferOrString) {
  const buf = typeof bufferOrString === 'string' ? Buffer.from(bufferOrString) : bufferOrString;
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function createSamplePdf(invoiceNumber = 'INV-1001', amount = '150.00', date = '2026-10-01') {
  const content = `%PDF-1.4\n1 0 obj\n<< /Title (Invoice ${invoiceNumber}) /Amount (${amount}) /Date (${date}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n`;
  const buffer = Buffer.from(content, 'utf-8');
  const sha256 = computeSha256(buffer);
  return {
    buffer,
    filename: `${invoiceNumber}_${date}.pdf`,
    sizeBytes: buffer.length,
    sha256,
    invoiceNumber,
    amount,
    date,
  };
}

const EMPTY_BUFFER = Buffer.alloc(0);
const EMPTY_BUFFER_HASH = computeSha256(EMPTY_BUFFER); // e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855

const VALID_STATUS_TRANSITIONS = {
  pending: ['running', 'cancelled'],
  running: ['requires_action', 'completed', 'failed'],
  requires_action: ['running', 'failed'],
  completed: [],
  failed: [],
  cancelled: [],
};

module.exports = {
  ORG_1_ID,
  ORG_2_ID,
  TOKENS,
  SAMPLE_RECORDED_WORKFLOW,
  SAMPLE_QUICK_SETUP_PAYLOAD,
  EMPTY_BUFFER,
  EMPTY_BUFFER_HASH,
  VALID_STATUS_TRANSITIONS,
  computeSha256,
  createSamplePdf,
};
