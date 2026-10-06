/**
 * PortalSync Cloud Client
 * 
 * Authenticated HTTP communication layer connecting the desktop runner
 * to the PortalSync Next.js Cloud Control Plane (/api/v1/).
 * 
 * Zero external dependencies — uses Node.js global fetch and native primitives.
 */

'use strict';

class CloudClientError extends Error {
  constructor(message, status = 500, data = null, endpoint = '') {
    super(message);
    this.name = 'CloudClientError';
    this.status = status;
    this.data = data;
    this.endpoint = endpoint;
  }
}

class CloudClient {
  /**
   * @param {Object} options
   * @param {string} [options.baseUrl] - Base URL of PortalSync Cloud API (default: PORTALSYNC_CLOUD_URL or http://localhost:3000)
   * @param {string} [options.token] - Runner Token ps_live_<org_id> (default: PORTALSYNC_RUNNER_TOKEN)
   * @param {number} [options.timeoutMs] - Request timeout in ms (default: 15000)
   * @param {Function} [options.fetch] - Custom fetch implementation (default: globalThis.fetch)
   */
  constructor(options = {}) {
    const rawUrl = options.baseUrl || process.env.PORTALSYNC_CLOUD_URL || 'http://localhost:3000';
    this.baseUrl = rawUrl.replace(/\/+$/, '');
    this.token = options.token || process.env.PORTALSYNC_RUNNER_TOKEN || '';
    this.timeoutMs = options.timeoutMs || 15000;
    this.fetchFn = options.fetch || (typeof fetch !== 'undefined' ? fetch : globalThis.fetch);

    if (typeof this.fetchFn !== 'function') {
      throw new Error('CloudClient requires a global fetch or options.fetch function');
    }
  }

  /**
   * Set or update runner token
   * @param {string} token 
   */
  setToken(token) {
    this.token = token || '';
  }

  /**
   * Build request headers with runner token
   * @returns {Record<string, string>}
   */
  _getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
      headers['x-runner-token'] = this.token;
    }
    return headers;
  }

  /**
   * Internal HTTP request helper
   * @param {string} endpoint 
   * @param {RequestInit} [options] 
   * @returns {Promise<any>}
   */
  async _request(endpoint, options = {}) {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${path}`;
    const headers = {
      ...this._getHeaders(),
      ...(options.headers || {}),
    };

    let controller;
    let timer;
    if (typeof AbortController !== 'undefined') {
      controller = new AbortController();
      timer = setTimeout(() => controller.abort(), this.timeoutMs);
    }

    try {
      const response = await this.fetchFn(url, {
        ...options,
        headers,
        signal: controller ? controller.signal : undefined,
      });

      let responseData = null;
      const contentType = response.headers && typeof response.headers.get === 'function'
        ? response.headers.get('content-type')
        : '';

      if (contentType && contentType.includes('application/json')) {
        try {
          responseData = await response.json();
        } catch {
          responseData = null;
        }
      } else {
        try {
          const text = await response.text();
          try {
            responseData = JSON.parse(text);
          } catch {
            responseData = text ? { message: text } : null;
          }
        } catch {
          responseData = null;
        }
      }

      if (!response.ok) {
        const errorMsg = responseData?.error || responseData?.message || `HTTP ${response.status} ${response.statusText}`;
        throw new CloudClientError(
          `Cloud API Error [${response.status}] ${path}: ${errorMsg}`,
          response.status,
          responseData,
          path
        );
      }

      return responseData;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new CloudClientError(`Cloud API Timeout (${this.timeoutMs}ms) requesting ${path}`, 408, null, path);
      }
      if (err instanceof CloudClientError) {
        throw err;
      }
      throw new CloudClientError(`Cloud API Network Failure on ${path}: ${err.message}`, 0, null, path);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /**
   * Health check / ping endpoint
   * Validates server reachable and token acceptance
   * @returns {Promise<{ ok: boolean, status: number, data?: any, error?: string }>}
   */
  async checkHealth() {
    try {
      const res = await this._request('/api/v1/runs?status=pending', { method: 'GET' });
      return { ok: true, status: 200, data: res };
    } catch (err) {
      return {
        ok: false,
        status: err.status || 0,
        error: err.message,
        data: err.data,
      };
    }
  }

  /**
   * Get pending runs assigned to this runner's organization
   * GET /api/v1/runs?status=pending
   * @returns {Promise<Array<any>>} Array of ExecutionRun objects
   */
  async getPendingRuns() {
    const data = await this._request('/api/v1/runs?status=pending', {
      method: 'GET',
    });
    if (data && Array.isArray(data.runs)) {
      return data.runs;
    }
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  }

  /**
   * Atomically claim a pending run (pending -> running)
   * PATCH /api/v1/runs with status='running'
   * @param {string} runId 
   * @returns {Promise<any>} Claimed run object
   */
  async claimRun(runId) {
    if (!runId) throw new Error('claimRun requires runId');
    const data = await this._request('/api/v1/runs', {
      method: 'PATCH',
      body: JSON.stringify({
        run_id: runId,
        status: 'running',
      }),
    });
    return data?.run || data;
  }

  /**
   * Update run execution progress telemetry
   * PATCH /api/v1/runs
   * @param {string} runId 
   * @param {Object} data 
   * @param {number} [data.items_processed] 
   * @param {number} [data.items_downloaded] 
   * @returns {Promise<any>}
   */
  async updateRunProgress(runId, data = {}) {
    if (!runId) throw new Error('updateRunProgress requires runId');
    const payload = {
      run_id: runId,
      ...data,
    };
    const res = await this._request('/api/v1/runs', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res?.run || res;
  }

  /**
   * Update run status (e.g. requires_action, completed, failed)
   * PATCH /api/v1/runs
   * @param {string} runId 
   * @param {'pending'|'running'|'requires_action'|'completed'|'failed'|'cancelled'} status 
   * @param {Object} [extra] - Additional fields like error_summary, completed_at, items_processed, items_downloaded
   * @returns {Promise<any>}
   */
  async updateRunStatus(runId, status, extra = {}) {
    if (!runId) throw new Error('updateRunStatus requires runId');
    if (!status) throw new Error('updateRunStatus requires status');
    const payload = {
      run_id: runId,
      status,
      ...extra,
    };
    const res = await this._request('/api/v1/runs', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res?.run || res;
  }

  /**
   * Register a downloaded invoice or artifact in the cloud
   * POST /api/v1/artifacts
   * @param {string} runId 
   * @param {Object} artifact
   * @param {string} artifact.file_name
   * @param {number} [artifact.file_size_bytes]
   * @param {string} artifact.sha256_hash
   * @param {string} [artifact.storage_path]
   * @param {string} [artifact.cloud_storage_path]
   * @param {Object} [artifact.item_metadata]
   * @returns {Promise<any>} Created RunArtifact object
   */
  async registerArtifact(runId, artifact = {}) {
    if (!runId) throw new Error('registerArtifact requires runId');
    if (!artifact.file_name) throw new Error('registerArtifact requires artifact.file_name');
    if (!artifact.sha256_hash) throw new Error('registerArtifact requires artifact.sha256_hash');

    const payload = {
      run_id: runId,
      file_name: artifact.file_name,
      file_size_bytes: artifact.file_size_bytes || 0,
      sha256_hash: artifact.sha256_hash,
      cloud_storage_path: artifact.cloud_storage_path || artifact.storage_path || null,
      item_metadata: artifact.item_metadata || {},
    };

    const res = await this._request('/api/v1/artifacts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.artifact || res;
  }

  /**
   * Retrieve workflow definition from cloud
   * GET /api/v1/workflows
   * @param {string} [workflowId]
   * @returns {Promise<any>} Workflow object or array of workflows
   */
  async getWorkflow(workflowId) {
    if (!workflowId) {
      const data = await this._request('/api/v1/workflows', { method: 'GET' });
      return data?.workflows || data;
    }

    try {
      // Try querying with ID parameter
      const data = await this._request(`/api/v1/workflows?id=${encodeURIComponent(workflowId)}`, { method: 'GET' });
      if (data?.workflow) return data.workflow;
      if (data?.workflows && Array.isArray(data.workflows)) {
        const found = data.workflows.find(w => w.id === workflowId);
        if (found) return found;
      }
      if (data && data.id === workflowId) return data;
    } catch {
      // Fallback: fetch all and find by ID
      const data = await this._request('/api/v1/workflows', { method: 'GET' });
      const workflows = data?.workflows || (Array.isArray(data) ? data : []);
      const found = workflows.find(w => w.id === workflowId);
      if (found) return found;
      throw new CloudClientError(`Workflow not found: ${workflowId}`, 404, null, '/api/v1/workflows');
    }

    throw new CloudClientError(`Workflow not found: ${workflowId}`, 404, null, '/api/v1/workflows');
  }

  /**
   * Diagnostic test connection to Cloud API
   * @returns {Promise<{connected: boolean, url: string, pendingRunsCount?: number, error?: string}>}
   */
  async testConnection() {
    try {
      const res = await this._request('/api/v1/runs?status=pending', { method: 'GET' });
      return {
        connected: true,
        url: this.baseUrl,
        pendingRunsCount: Array.isArray(res?.runs) ? res.runs.length : 0,
      };
    } catch (err) {
      return {
        connected: false,
        url: this.baseUrl,
        error: err.message,
      };
    }
  }
}

module.exports = {
  CloudClient,
  CloudClientError,
};
