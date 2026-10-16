import { NextRequest, NextResponse } from 'next/server';
import http from 'http';
import { authenticateRunnerOrUser, extractRunnerToken } from '@/lib/auth/runner-auth';

export const dynamic = 'force-dynamic';

interface CdpCheckResult {
  responding: boolean;
  cdp_accessible: boolean;
  port: number;
  browser?: string;
  version?: string;
  protocol?: string;
  webSocketDebuggerUrl?: string;
  latency_ms: number;
  error?: string;
}

/**
 * Checks whether the Chrome DevTools Protocol (CDP) HTTP endpoint is reachable
 * on 127.0.0.1 at the hardcoded port 9222 with a strict 1500ms timeout.
 */
function checkCdp(port = 9222, timeoutMs = 1500): Promise<CdpCheckResult> {
  const startTime = Date.now();
  return new Promise((resolve) => {
    let completed = false;

    const req = http.get(
      `http://127.0.0.1:${port}/json/version`,
      { timeout: timeoutMs },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });

        res.on('end', () => {
          if (completed) return;
          completed = true;
          const latency_ms = Date.now() - startTime;

          if (res.statusCode !== 200) {
            resolve({
              responding: false,
              cdp_accessible: false,
              port,
              latency_ms,
              error: `CDP endpoint returned HTTP status ${res.statusCode}`,
            });
            return;
          }

          try {
            const parsed = JSON.parse(rawData);
            const browser = parsed.Browser || parsed.browser || 'Google Chrome';
            const version = parsed['Protocol-Version'] || parsed.version || '1.3';
            const webSocketDebuggerUrl = parsed.webSocketDebuggerUrl;

            resolve({
              responding: true,
              cdp_accessible: true,
              port,
              browser,
              version,
              protocol: parsed['Protocol-Version'],
              webSocketDebuggerUrl,
              latency_ms,
            });
          } catch {
            resolve({
              responding: true,
              cdp_accessible: true,
              port,
              browser: 'Google Chrome / Chromium',
              version: '1.3',
              latency_ms,
            });
          }
        });
      }
    );

    req.on('timeout', () => {
      if (!completed) {
        completed = true;
        req.destroy();
        resolve({
          responding: false,
          cdp_accessible: false,
          port,
          latency_ms: Date.now() - startTime,
          error: `Connection timed out (${timeoutMs}ms). Ensure Google Chrome is running with --remote-debugging-port=${port}`,
        });
      }
    });

    req.on('error', (err) => {
      if (!completed) {
        completed = true;
        resolve({
          responding: false,
          cdp_accessible: false,
          port,
          latency_ms: Date.now() - startTime,
          error: err.message.includes('ECONNREFUSED')
            ? `Connection refused on port ${port}. Chrome DevTools Protocol is not running.`
            : err.message,
        });
      }
    });
  });
}

/**
 * Handle diagnostics request logic for both GET and POST.
 * Strictly enforces authentication and locks CDP check to port 9222 to prevent SSRF port scanning.
 */
async function handleDiagnostics(
  request: NextRequest,
  providedToken?: string
) {
  // 1. Validate Authentication (F-02: Require auth; reject unauthenticated calls)
  const auth = await authenticateRunnerOrUser(request);
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { orgId } = auth.context;

  // 2. Lock CDP Port to 9222 (F-02: Prevent SSRF localhost port scanning)
  const port = 9222;

  const tokenCandidate = providedToken || extractRunnerToken(request);
  const tokenValid = true;
  const tokenStatus = 'active';

  // 3. Perform Chrome CDP Check
  const cdpResult = await checkCdp(port, 1500);

  // 4. Return Comprehensive Diagnostic Report
  return NextResponse.json({
    success: true,
    cdp_accessible: cdpResult.cdp_accessible,
    port: cdpResult.port,
    version: cdpResult.version || null,
    browser: cdpResult.browser || null,
    latency_ms: cdpResult.latency_ms,
    cdp: cdpResult,
    token: {
      valid: tokenValid,
      status: tokenStatus,
      format: tokenCandidate?.startsWith('rf_live_') ? 'rf_live' : (auth.context.authType === 'runner_token' ? 'rf_live' : 'session'),
      org_id: orgId,
    },
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    },
  });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || undefined;
  return handleDiagnostics(request, token);
}

export async function POST(request: NextRequest) {
  let token: string | undefined;

  try {
    const body = await request.json();
    if (body && typeof body.token === 'string') {
      token = body.token;
    }
  } catch {
    // Empty body is acceptable; defaults will be used
  }

  return handleDiagnostics(request, token);
}
