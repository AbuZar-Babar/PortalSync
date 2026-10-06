/**
 * Mock Chrome CDP Server (emulates Chrome remote debugging endpoint)
 */

const http = require('node:http');

class MockCdpServer {
  constructor() {
    this.server = null;
    this.port = 0;
    this.url = '';
  }

  async start(port = 9222) {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        const url = req.url;
        if (url === '/json/version' || url === '/json/version/') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(
            JSON.stringify({
              Browser: 'Chrome/128.0.6613.120',
              'Protocol-Version': '1.3',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'V8-Version': '12.8.374.24',
              'WebKit-Version': '537.36 (@c2ebbb6249b6b...)',
              webSocketDebuggerUrl: `ws://127.0.0.1:${this.port}/devtools/browser/mock-browser-id`,
            })
          );
        }

        if (url === '/json' || url === '/json/list' || url === '/json/list/') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(
            JSON.stringify([
              {
                description: '',
                devtoolsFrontendUrl: `/devtools/inspector.html?ws=127.0.0.1:${this.port}/devtools/page/page-1`,
                id: 'mock-page-1',
                title: 'PortalSync Dashboard',
                type: 'page',
                url: 'http://localhost:3000/dashboard',
                webSocketDebuggerUrl: `ws://127.0.0.1:${this.port}/devtools/page/mock-page-1`,
              },
            ])
          );
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
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
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}

module.exports = {
  MockCdpServer,
};
