/**
 * Reference In-Process PortalSync Cloud Control Plane API Server
 * Implements exact REST API v1 contracts from PROJECT.md
 */

const http = require('node:http');
const crypto = require('node:crypto');
const { VALID_STATUS_TRANSITIONS } = require('./fixtures');

class MockCloudServer {
  constructor() {
    this.server = null;
    this.port = 0;
    this.url = '';
    this.runs = new Map();
    this.workflows = new Map();
    this.artifacts = new Map();
    this.requestLog = [];
  }

  reset() {
    this.runs.clear();
    this.workflows.clear();
    this.artifacts.clear();
    this.requestLog = [];
  }

  addWorkflow(workflow) {
    const id = workflow.id || crypto.randomUUID();
    const fullWorkflow = {
      id,
      org_id: workflow.org_id,
      name: workflow.name || 'Test Workflow',
      portal_url: workflow.portal_url || 'https://example.com/portal',
      schema_version: workflow.schema_version || '1.0.0',
      workflow_definition: workflow.workflow_definition || {},
      filter_rules: workflow.filter_rules || {},
      created_at: workflow.created_at || new Date().toISOString(),
      updated_at: workflow.updated_at || new Date().toISOString(),
    };
    this.workflows.set(id, fullWorkflow);
    return fullWorkflow;
  }

  addRun(run) {
    const id = run.id || crypto.randomUUID();
    const fullRun = {
      id,
      org_id: run.org_id,
      workflow_id: run.workflow_id,
      status: run.status || 'pending',
      total_items_discovered: run.total_items_discovered || 0,
      items_processed: run.items_processed || 0,
      items_downloaded: run.items_downloaded || 0,
      started_at: run.started_at || new Date().toISOString(),
      completed_at: run.completed_at || null,
      error_summary: run.error_summary || null,
    };
    this.runs.set(id, fullRun);
    return fullRun;
  }

  authenticate(req) {
    // 1. Check Bearer token or x-runner-token
    const authHeader = req.headers['authorization'] || '';
    const runnerHeader = req.headers['x-runner-token'] || '';

    let token = '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (runnerHeader) {
      token = runnerHeader.trim();
    }

    if (token) {
      if (!token.startsWith('ps_live_')) {
        return { ok: false, error: 'Invalid token prefix: must start with ps_live_' };
      }
      const orgId = token.replace('ps_live_', '').trim();
      if (!orgId) {
        return { ok: false, error: 'Token missing org identifier' };
      }
      return { ok: true, orgId, type: 'runner' };
    }

    // 2. Check mock session cookie
    const cookieHeader = req.headers['cookie'] || '';
    if (cookieHeader.includes('mock_session_org=')) {
      const match = cookieHeader.match(/mock_session_org=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return { ok: true, orgId: match[1], type: 'session' };
      }
    }

    return { ok: false, error: 'Unauthorized: missing runner token or session' };
  }

  async start(port = 0) {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        try {
          await this.handleRequest(req, res);
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      this.server.listen(port, '127.0.0.1', () => {
        this.port = this.server.address().port;
        this.url = `http://127.0.0.1:${this.port}`;
        resolve(this.url);
      });

      this.server.on('error', reject);
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        if (typeof this.server.closeAllConnections === 'function') {
          this.server.closeAllConnections();
        }
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  async parseBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        if (!body) return resolve({});
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(new Error('Invalid JSON payload'));
        }
      });
      req.on('error', reject);
    });
  }

  sendJson(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  async handleRequest(req, res) {
    const parsedUrl = new URL(req.url, this.url || 'http://127.0.0.1');
    const pathname = parsedUrl.pathname;
    const method = req.method;

    this.requestLog.push({ method, pathname, headers: req.headers, query: Object.fromEntries(parsedUrl.searchParams) });

    // Authentication check for /api/v1/*
    if (pathname.startsWith('/api/v1/')) {
      const auth = this.authenticate(req);
      if (!auth.ok) {
        return this.sendJson(res, 401, { error: auth.error });
      }
      req.auth = auth;
    }

    // 1. /api/v1/runs
    if (pathname === '/api/v1/runs') {
      if (method === 'GET') {
        const statusFilter = parsedUrl.searchParams.get('status');
        const workflowIdFilter = parsedUrl.searchParams.get('workflow_id');

        let matched = Array.from(this.runs.values()).filter((r) => r.org_id === req.auth.orgId);
        if (statusFilter) {
          matched = matched.filter((r) => r.status === statusFilter);
        }
        if (workflowIdFilter) {
          matched = matched.filter((r) => r.workflow_id === workflowIdFilter);
        }
        // Order by started_at descending
        matched.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
        return this.sendJson(res, 200, { runs: matched });
      }

      if (method === 'POST') {
        let body;
        try {
          body = await this.parseBody(req);
        } catch (err) {
          return this.sendJson(res, 400, { error: err.message });
        }

        if (!body.workflow_id) {
          return this.sendJson(res, 400, { error: 'Missing required field: workflow_id' });
        }

        const run = {
          id: crypto.randomUUID(),
          org_id: req.auth.orgId,
          workflow_id: body.workflow_id,
          status: body.status || 'pending',
          total_items_discovered: body.total_items_discovered || 0,
          items_processed: 0,
          items_downloaded: 0,
          started_at: new Date().toISOString(),
          completed_at: null,
          error_summary: null,
        };
        this.runs.set(run.id, run);
        return this.sendJson(res, 201, { run });
      }

      if (method === 'PATCH') {
        let body;
        try {
          body = await this.parseBody(req);
        } catch (err) {
          return this.sendJson(res, 400, { error: err.message });
        }

        if (!body.run_id) {
          return this.sendJson(res, 400, { error: 'Missing required field: run_id' });
        }

        const run = this.runs.get(body.run_id);
        if (!run) {
          return this.sendJson(res, 404, { error: `Run with id ${body.run_id} not found` });
        }

        if (run.org_id !== req.auth.orgId) {
          return this.sendJson(res, 403, { error: 'Forbidden: run belongs to different organization' });
        }

        // Validate atomic status transition if status is being updated
        if (body.status) {
          if (body.status === 'running') {
            if (run.status !== 'pending' && run.status !== 'requires_action') {
              return this.sendJson(res, 409, {
                error: `Invalid status transition: cannot claim run in '${run.status}' state as 'running'. Only 'pending' or 'requires_action' runs can transition to 'running'.`,
              });
            }
            run.status = 'running';
          } else if (body.status !== run.status) {
            const allowedTransitions = VALID_STATUS_TRANSITIONS[run.status] || [];
            if (!allowedTransitions.includes(body.status)) {
              return this.sendJson(res, 409, {
                error: `Invalid status transition: cannot transition from '${run.status}' to '${body.status}'. Allowed: [${allowedTransitions.join(', ')}]`,
              });
            }
            run.status = body.status;
          }
        }

        if (body.items_processed !== undefined) run.items_processed = body.items_processed;
        if (body.items_downloaded !== undefined) run.items_downloaded = body.items_downloaded;
        if (body.error_summary !== undefined) run.error_summary = body.error_summary;
        if (body.completed_at !== undefined) run.completed_at = body.completed_at;
        if (body.status === 'completed' && !run.completed_at) {
          run.completed_at = new Date().toISOString();
        }

        return this.sendJson(res, 200, { run });
      }

      return this.sendJson(res, 405, { error: 'Method Not Allowed' });
    }

    // 2. /api/v1/workflows
    if (pathname === '/api/v1/workflows') {
      if (method === 'GET') {
        const workflowId = parsedUrl.searchParams.get('id') || parsedUrl.searchParams.get('workflow_id');
        if (workflowId) {
          const wf = this.workflows.get(workflowId);
          if (!wf || wf.org_id !== req.auth.orgId) {
            return this.sendJson(res, 404, { error: 'Workflow not found' });
          }
          return this.sendJson(res, 200, { workflow: wf, workflows: [wf] });
        }
        const workflows = Array.from(this.workflows.values()).filter((w) => w.org_id === req.auth.orgId);
        return this.sendJson(res, 200, { workflows });
      }

      if (method === 'POST') {
        let body;
        try {
          body = await this.parseBody(req);
        } catch (err) {
          return this.sendJson(res, 400, { error: err.message });
        }

        if (!body.name || !body.portal_url) {
          return this.sendJson(res, 400, { error: 'Missing required fields: name, portal_url' });
        }

        const definition = body.workflow_definition || {};
        if (body.upload_to_cloud !== undefined) definition.upload_to_cloud = body.upload_to_cloud;
        if (body.target_folder !== undefined) definition.target_folder = body.target_folder;

        const workflow = {
          id: crypto.randomUUID(),
          org_id: req.auth.orgId,
          name: body.name,
          portal_url: body.portal_url,
          schema_version: body.schema_version || '1.0.0',
          workflow_definition: definition,
          filter_rules: body.filter_rules || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.workflows.set(workflow.id, workflow);
        return this.sendJson(res, 201, { workflow });
      }

      if (method === 'PATCH') {
        let body;
        try {
          body = await this.parseBody(req);
        } catch (err) {
          return this.sendJson(res, 400, { error: err.message });
        }

        const targetId = body.workflow_id || body.id;
        if (!targetId) {
          return this.sendJson(res, 400, { error: 'Missing required field: workflow_id' });
        }

        const workflow = this.workflows.get(targetId);
        if (!workflow) {
          return this.sendJson(res, 404, { error: `Workflow with id ${targetId} not found` });
        }
        if (workflow.org_id !== req.auth.orgId) {
          return this.sendJson(res, 403, { error: 'Forbidden: workflow belongs to different organization' });
        }

        if (body.name) workflow.name = body.name;
        if (body.portal_url) workflow.portal_url = body.portal_url;
        if (body.upload_to_cloud !== undefined) workflow.workflow_definition.upload_to_cloud = body.upload_to_cloud;
        if (body.target_folder !== undefined) workflow.workflow_definition.target_folder = body.target_folder;
        if (body.workflow_definition) {
          workflow.workflow_definition = { ...workflow.workflow_definition, ...body.workflow_definition };
        }
        workflow.updated_at = new Date().toISOString();

        return this.sendJson(res, 200, { workflow });
      }

      return this.sendJson(res, 405, { error: 'Method Not Allowed' });
    }

    // 2b. /api/v1/workflows/:id (Next.js dynamic route contract)
    const workflowPathMatch = pathname.match(/^\/api\/v1\/workflows\/([a-zA-Z0-9_-]+)$/);
    if (workflowPathMatch) {
      const targetWfId = workflowPathMatch[1];
      if (method === 'GET') {
        const wf = this.workflows.get(targetWfId);
        if (!wf || wf.org_id !== req.auth.orgId) {
          return this.sendJson(res, 404, { error: 'Workflow not found' });
        }
        return this.sendJson(res, 200, { workflow: wf });
      }

      if (method === 'PATCH') {
        let body;
        try {
          body = await this.parseBody(req);
        } catch (err) {
          return this.sendJson(res, 400, { error: err.message });
        }

        const wf = this.workflows.get(targetWfId);
        if (!wf) {
          return this.sendJson(res, 404, { error: `Workflow with id ${targetWfId} not found` });
        }
        if (wf.org_id !== req.auth.orgId) {
          return this.sendJson(res, 403, { error: 'Forbidden: workflow belongs to different organization' });
        }

        if (body.name) wf.name = body.name;
        if (body.portal_url) wf.portal_url = body.portal_url;
        if (body.upload_to_cloud !== undefined) wf.workflow_definition.upload_to_cloud = body.upload_to_cloud;
        if (body.target_folder !== undefined) wf.workflow_definition.target_folder = body.target_folder;
        if (body.workflow_definition) {
          wf.workflow_definition = { ...wf.workflow_definition, ...body.workflow_definition };
        }
        wf.updated_at = new Date().toISOString();

        return this.sendJson(res, 200, { workflow: wf });
      }

      return this.sendJson(res, 405, { error: 'Method Not Allowed' });
    }

    // 3. /api/v1/artifacts
    if (pathname === '/api/v1/artifacts') {
      if (method === 'GET') {
        const runId = parsedUrl.searchParams.get('run_id');
        if (!runId) {
          return this.sendJson(res, 400, { error: 'Missing required query param: run_id' });
        }
        const artifacts = Array.from(this.artifacts.values()).filter((a) => a.run_id === runId);
        return this.sendJson(res, 200, { artifacts });
      }

      if (method === 'POST') {
        let body;
        try {
          body = await this.parseBody(req);
        } catch (err) {
          return this.sendJson(res, 400, { error: err.message });
        }

        const { run_id, file_name, file_size_bytes, sha256_hash, cloud_storage_path, item_metadata } = body;
        if (!run_id || !file_name || !sha256_hash) {
          return this.sendJson(res, 400, {
            error: 'Missing required artifact fields: run_id, file_name, and sha256_hash are mandatory',
          });
        }

        const run = this.runs.get(run_id);
        if (!run) {
          return this.sendJson(res, 404, { error: `Run with id ${run_id} not found` });
        }

        const artifact = {
          id: crypto.randomUUID(),
          run_id,
          file_name,
          file_size_bytes: file_size_bytes !== undefined ? file_size_bytes : 0,
          sha256_hash,
          cloud_storage_path: cloud_storage_path || null,
          item_metadata: item_metadata || {},
          synced_to_drive: false,
          created_at: new Date().toISOString(),
        };

        this.artifacts.set(artifact.id, artifact);
        return this.sendJson(res, 201, { artifact });
      }

      return this.sendJson(res, 405, { error: 'Method Not Allowed' });
    }

    // 3b. /api/v1/artifacts/download
    if (pathname === '/api/v1/artifacts/download') {
      if (method === 'GET') {
        const artifactId = parsedUrl.searchParams.get('id');
        if (!artifactId) {
          return this.sendJson(res, 400, { error: 'Missing artifact id parameter' });
        }

        const artifact = this.artifacts.get(artifactId);
        if (!artifact) {
          return this.sendJson(res, 404, { error: 'Artifact not found' });
        }

        const run = this.runs.get(artifact.run_id);
        if (run && run.org_id !== req.auth.orgId) {
          return this.sendJson(res, 403, { error: 'Unauthorized: Artifact belongs to a different organization' });
        }

        if (!artifact.cloud_storage_path) {
          return this.sendJson(res, 404, { error: 'Artifact is stored locally only and has not been synced to cloud storage' });
        }

        if (parsedUrl.searchParams.get('redirect') === 'true' || artifact.signed_redirect) {
          res.writeHead(307, {
            Location: `https://storage.supabase.co/object/sign/wf_artifacts/${encodeURIComponent(artifact.file_name)}?token=mock_signed_token`,
          });
          return res.end();
        }

        const fileContent = artifact.content || Buffer.from(`FlowMind Cloud Artifact Export\nFile: ${artifact.file_name}\nSHA-256: ${artifact.sha256_hash}\n`);
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(artifact.file_name)}"`,
          'Content-Length': String(Buffer.byteLength(fileContent)),
        });
        return res.end(fileContent);
      }

      return this.sendJson(res, 405, { error: 'Method Not Allowed' });
    }

    return this.sendJson(res, 404, { error: `Route ${pathname} not found` });
  }
}

module.exports = {
  MockCloudServer,
};
