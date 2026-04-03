const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE = __dirname;
const PUBLIC = path.join(BASE, 'public');
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(BASE);

function readJSON(fname) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, fname), 'utf8')); }
  catch { return null; }
}
function writeJSON(fname, data) {
  fs.writeFileSync(path.join(DATA_DIR, fname), JSON.stringify(data, null, 2));
}
function loadUsers() { return readJSON('users.json') || {}; }
function saveUsers(u) { writeJSON('users.json', u); }
function sendJSON(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

const MIME = {
  '.html':'text/html','.js':'application/javascript','.css':'text/css',
  '.json':'application/json','.png':'image/png','.jpg':'image/jpeg',
  '.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2'
};

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // API routes
  if (url.startsWith('/api/')) {
    if (url === '/api/auth/login' && req.method === 'POST') {
      let body = ''; req.on('data', c => body += c);
      req.on('end', () => {
        const { username, password } = JSON.parse(body);
        const users = loadUsers();
        const user = Object.values(users).find(u => u.username === username && u.password === password);
        if (user) {
          const token = Buffer.from(username + ':' + Date.now()).toString('base64');
          sendJSON(res, { token, user: { username: user.username, role: user.role, name: user.name } });
        } else {
          sendJSON(res, { error: '用户名或密码错误' }, 401);
        }
      }); return;
    }
    if (url === '/api/dashboard/overview' && req.method === 'GET') {
      sendJSON(res, { totalOrders: 156, totalSuppliers: 12, lowStockAlerts: 3, pendingTasks: 8, monthlyRevenue: 2850000 }); return;
    }
    if (url === '/api/suppliers' && req.method === 'GET') {
      sendJSON(res, readJSON('suppliers.json') || []); return;
    }
    if (url === '/api/inventory' && req.method === 'GET') {
      sendJSON(res, readJSON('inventory.json') || []); return;
    }
    if (url === '/api/orders/sales' && req.method === 'GET') {
      sendJSON(res, readJSON('orders.json') || []); return;
    }
    if (url === '/api/agent/chat' && req.method === 'POST') {
      let body = ''; req.on('data', c => body += c);
      req.on('end', () => {
        const { message } = JSON.parse(body);
        sendJSON(res, { reply: `智能体已收到：「${message}」，正在协调7个专业智能体处理中...`, agent: 'orchestrator' });
      }); return;
    }
    sendJSON(res, { error: 'API不存在' }, 404); return;
  }

  // Serve React frontend (SPA)
  let fp = path.join(PUBLIC, url);
  if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
    const ext = path.extname(fp).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(fs.readFileSync(fp)); return;
  }
  // Fallback to index.html (SPA)
  const idx = path.join(PUBLIC, 'index.html');
  if (fs.existsSync(idx)) {
    res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(fs.readFileSync(idx));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body><h1>电子制造业多智能体协同平台</h1><p>前端构建未完成，请稍候。</p></body></html>');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API+前端服务已启动: http://0.0.0.0:${PORT}`);
  console.log(`✅ API: http://0.0.0.0:${PORT}/api`);
  console.log(`✅ 前端: http://0.0.0.0:${PORT}/`);
});
