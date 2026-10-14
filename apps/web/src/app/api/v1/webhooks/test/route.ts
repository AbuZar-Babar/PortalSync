import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { authenticateRunnerOrUser } from '@/lib/auth/runner-auth';

export const dynamic = 'force-dynamic';

interface WebhookTestRequestBody {
  url: string;
  secret?: string;
  payload?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  const startTime = performance.now();

  try {
    // 1. Authenticate runner or session user
    const auth = await authenticateRunnerOrUser(req);
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const isTestCall = isDevelopment && req.headers.get('x-test-bypass') === 'true';

    if (!auth.success && !isDevelopment && !isTestCall) {
      return NextResponse.json(
        {
          success: false,
          status: 401,
          statusText: 'Unauthorized',
          latency_ms: 0,
          latencyMs: 0,
          reachable: false,
          error: 'Unauthorized',
          message: 'Authentication required to dispatch webhook test probes.',
        },
        { status: 401 }
      );
    }

    // 2. Parse and validate JSON request body
    let body: WebhookTestRequestBody;
    try {
      body = (await req.json()) as WebhookTestRequestBody;
    } catch {
      return NextResponse.json(
        {
          success: false,
          status: 400,
          statusText: 'Bad Request',
          latency_ms: 0,
          latencyMs: 0,
          reachable: false,
          error: 'Invalid JSON',
          message: 'Malformed request body. Expected JSON object with a url field.',
        },
        { status: 400 }
      );
    }

    const { url, secret, payload } = body;

    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json(
        {
          success: false,
          status: 400,
          statusText: 'Bad Request',
          latency_ms: 0,
          latencyMs: 0,
          reachable: false,
          error: 'Missing required field: url',
          message: 'Invalid webhook request. A destination URL is required.',
        },
        { status: 400 }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.trim());
    } catch {
      return NextResponse.json(
        {
          success: false,
          status: 400,
          statusText: 'Bad Request',
          latency_ms: 0,
          latencyMs: 0,
          reachable: false,
          error: 'Malformed URL',
          message: 'Webhook URL must be a valid RFC 3986 URL beginning with http:// or https://.',
        },
        { status: 400 }
      );
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json(
        {
          success: false,
          status: 400,
          statusText: 'Bad Request',
          latency_ms: 0,
          latencyMs: 0,
          reachable: false,
          error: 'Invalid protocol',
          message: 'Only HTTP and HTTPS webhook destinations are supported.',
        },
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV === 'production') {
      const hostname = parsedUrl.hostname.toLowerCase();
      const isPrivateOrLoopback =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '169.254.169.254' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.');

      if (isPrivateOrLoopback) {
        return NextResponse.json(
          {
            success: false,
            status: 400,
            statusText: 'Bad Request',
            latency_ms: 0,
            latencyMs: 0,
            reachable: false,
            error: 'Invalid Destination',
            message: 'Webhook destination cannot resolve to private or loopback IP addresses.',
          },
          { status: 400 }
        );
      }
    }

    // 3. Construct authentic test payload
    const testPayload = payload || {
      event: 'workflow.test_ping',
      timestamp: new Date().toISOString(),
      source: 'Workflow-Capture-SaaS Control Plane',
      organization_id: auth.success ? auth.context.orgId : 'test_organization',
      message: 'Authentic webhook ping verification from FlowMind Workspace',
      version: '1.0.0',
    };

    const payloadString = JSON.stringify(testPayload);

    // 4. Compute HMAC-SHA256 signature if secret is provided
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'ReFlow-Webhook-Verifier/1.0 (ReFlow Cloud Control Plane)',
      'X-ReFlow-Delivery': 'test-ping',
      'X-ReFlow-Event': 'workflow.test_ping',
      'X-FlowMind-Delivery': 'test-ping',
      'X-FlowMind-Event': 'workflow.test_ping',
    };

    if (secret && typeof secret === 'string' && secret.trim().length > 0) {
      const hmac = crypto.createHmac('sha256', secret.trim());
      hmac.update(payloadString);
      const signature = hmac.digest('hex');
      headers['X-ReFlow-Signature'] = `sha256=${signature}`;
      headers['X-FlowMind-Signature'] = `sha256=${signature}`;
      headers['X-Hub-Signature-256'] = `sha256=${signature}`;
    }

    // 5. Perform authentic outbound fetch() with strict 5000ms timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let response: Response;
    try {
      response = await fetch(parsedUrl.toString(), {
        method: 'POST',
        headers,
        body: payloadString,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const latencyMs = Math.round(performance.now() - startTime);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        status: response.status,
        statusText: response.statusText || 'OK',
        latency_ms: latencyMs,
        latencyMs,
        reachable: true,
        message: `HTTP ${response.status} ${response.statusText || 'OK'} — Destination server acknowledged webhook test payload (${latencyMs}ms).`,
      });
    } else {
      return NextResponse.json({
        success: false,
        status: response.status,
        statusText: response.statusText || 'Error',
        latency_ms: latencyMs,
        latencyMs,
        reachable: true,
        message: `HTTP ${response.status} ${response.statusText || 'Error'} — Destination server responded with status ${response.status} (${latencyMs}ms). Ensure your endpoint handles HTTP POST requests.`,
      });
    }
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - startTime);
    const isTimeout =
      err instanceof Error &&
      (err.name === 'AbortError' ||
        err.message.toLowerCase().includes('aborted') ||
        err.message.toLowerCase().includes('timeout'));

    const errorMsg = isTimeout
      ? 'Connection timed out after 5,000ms'
      : err instanceof Error
      ? err.message
      : 'Network communication failure';

    return NextResponse.json({
      success: false,
      status: 0,
      statusText: 'Unreachable',
      latency_ms: latencyMs,
      latencyMs,
      reachable: false,
      error: errorMsg,
      message: isTimeout
        ? 'Destination unreachable: Connection timed out after 5,000ms. Verify host and port accessibility.'
        : `Destination unreachable: ${errorMsg} (${latencyMs}ms). Ensure your server permits incoming HTTP POST webhooks.`,
    });
  }
}
