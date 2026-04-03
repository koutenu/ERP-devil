/**
 * 电子制造业多智能体协同平台 - Node.js 后端
 * 使用内置 http/https 模块，无需安装依赖
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const BASE = path.dirname(__dirname);
const DATA_DIR = path.join(BASE, 'data');

// ============ 数据加载 ============
function loadJSON(fname) {
  try {
    const d = fs.readFileSync(path.join(DATA_DIR, fname), 'utf8');
    return JSON.parse(d);
  } catch { return null; }
}

function saveJSON(fname, data) {
  fs.writeFileSync(path.join(DATA_DIR, fname), JSON.stringify(data, null, 2));
}

// ============ 用户 & Token ============
let users = loadJSON('users.json')?.users || [
  {id:'u001',username:'admin',password_hash:'demo123',name:'管理员',role:'admin',avatar:'👨‍💼'},
  {id:'u002',username:'buyer',password_hash:'demo123',name:'采购员小李',role:'buyer',avatar:'🛒'},
  {id:'u003',username:'warehouse',password_hash:'demo123',name:'仓管小王',role:'warehouse',avatar:'📦'},
  {id:'u004',username:'finance',password_hash:'demo123',name:'财务小张',role:'finance',avatar:'💰'},
  {id:'u005',username:'cs',password_hash:'demo123',name:'客服小陈',role:'cs',avatar:'🎧'},
];
if (!fs.existsSync(path.join(DATA_DIR, 'users.json'))) {
  saveJSON('users.json', {users});
}
let tokens = {};

function makeToken(uid) {
  const t = crypto.randomBytes(16).toString('hex');
  tokens[t] = { uid, expire: Date.now() + 24 * 3600 * 1000 };
  return t;
}

function authUser(req) {
  const h = req.headers['authorization'] || '';
  const t = h.replace('Bearer ', '');
  const info = tokens[t];
  if (!info || info.expire < Date.now()) return null;
  return users.find(u => u.id === info.uid);
}

function requireAuth(req) {
  const user = authUser(req);
  if (!user) return null;
  req._user = user;
  return user;
}

// ============ 请求体解析 ============
function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', c => d += c);
    req.on('end', () => resolve(d));
    req.on('error', reject);
  });
}

// ============ 根路径 / ============
if (url === "/" || url === "") {
  res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify({ name: "电子制造业多智能体协同平台 API", version: "1.0.0", status: "running", docs: "/api/auth/login" }));
  return;
}

function parseBody(req) {
  return readBody(req).then(d => {
    try { return JSON.parse(d); } catch { return {}; }
  });
}

// ============ 模拟智能体 ============
function runAgent(query, user) {
  const q = query.toLowerCase();
  let reply = '';

  if (q.includes('bom') || q.includes('物料清单')) {
    reply = `📋 BOM 表: PROD-001（智能感应小夜灯）

| 器件名称 | 规格 | 数量 |
|--|--|--|
| 主控MCU | STM8S003F3P6 | 1pcs |
| PIR人体感应模块 | HC-SR501 | 1pcs |
| LED灯珠 | 2835暖白光 0.5W | 6pcs |
| 锂电池保护IC | DW01A | 1pcs |
| 充电管理IC | TP4056 | 1pcs |
| 锂电池 | 3.7V 500mAh | 1pcs |
| PCB板 | 双层 50x50mm | 1pcs |

💰 电子器件成本合计：¥8.50/台
（实际成本含结构件、包材、组装费约 ¥18.80/台）`;
  } else if (q.includes('订单') || q.includes('新订单')) {
    const orders = loadJSON('orders.json')?.sales || [];
    const pending = orders.filter(o => o.status === '待发货');
    reply = `🛒 各平台待发货订单（共 ${pending.length} 单）

| 订单号 | 平台 | 产品 | 金额 | 收件人 |
|--|--|--|--|--|
| ${pending[0]?.order_id?.slice(-16) || 'N/A'} | ${pending[0]?.platform || ''} | ${pending[0]?.items?.[0]?.product_name || ''} | ¥${pending[0]?.total_amount || 0} | ${pending[0]?.customer?.name || ''} |
| ${pending[1]?.order_id?.slice(-16) || 'N/A'} | ${pending[1]?.platform || ''} | ${pending[1]?.items?.[0]?.product_name || ''} | ¥${pending[1]?.total_amount || 0} | ${pending[1]?.customer?.name || ''} |

${pending.some(o => o.is_urgent) ? '🚨 含加急订单，请优先处理！' : ''}`;
  } else if (q.includes('库存') || q.includes('补货') || q.includes('预警')) {
    const inv = loadJSON('inventory.json') || [];
    const low = inv.filter(r => r.available < r.safety_stock);
    reply = low.length > 0
      ? `🔴 库存预警：${low.length} 个 SKU 低于安全库存\n\n` + low.map(r =>
        `• ${r.product_name}（${r.sku}）\n  可用: ${r.available} | 安全库存: ${r.safety_stock} | 缺口: ${r.safety_stock - r.available}pcs\n  建议补货量: ${Math.max((r.safety_stock - r.available) * 2, r.safety_stock * 3)}pcs`
      ).join('\n\n')
      : '✅ 所有 SKU 库存均在安全水位以上';
  } else if (q.includes('利润') || q.includes('财务') || q.includes('盈利')) {
    reply = `💰 利润报表（2026年3月）

| 项目 | 金额 | 备注 |
|--|--|--|
| 销售收入 | ¥3,351.00 | 5笔已完成订单 |
| 预估产品成本 | ¥1,742.52 | 按52%估算 |
| 预估毛利 | ¥1,608.48 | 毛利率 48.0% |
| 物流成本 | ¥49.00 | 均摊 |
| 月净利润估算 | ¥1,559.48 | |

📊 月度趋势（近3月）
1月: 收入¥72,300 / 利润¥18,900
2月: 收入¥68,100 / 利润¥17,200
3月: 收入¥91,100 / 利润¥25,045

⚠️ 注：以上为预估算，实际以财务账面为准`;
  } else if (q.includes('模具') || q.includes('生产') || q.includes('交期')) {
    const pos = loadJSON('orders.json')?.purchase || [];
    const molds = pos.filter(po => po.items?.some(it => String(it.product_name).includes('模具')));
    reply = `🔧 模具订单状态

| 模具名称 | 供应商 | 状态 | 交样日期 | 进度 |
|--|--|--|--|--|
| ${molds[0]?.items?.[0]?.product_name || '小夜灯外壳模具'} | ${molds[0]?.supplier_name || '深圳精密模具厂'} | ${molds[0]?.status || '生产中'} | ${molds[0]?.expected_delivery || '03-30'} | 🔵 65% |

📋 模具工序：设计评审 → 开模 → 试模 → 修模 → 验收 → 量产
⏰ 预计交样：${molds[0]?.expected_delivery || '2026-03-30'}`;
  } else if (q.includes('供应商') || q.includes('采购') || q.includes('询价')) {
    const sups = loadJSON('suppliers.json') || [];
    const motors = sups.filter(s => s.category.includes('电机'));
    reply = `🛒 电机供应商推荐（共 ${motors.length} 家）

${motors.slice(0, 3).map((s, i) =>
  `${i + 1}. ${s.name}
   ⭐${s.rating} | 交期 ${s.lead_time_days}天 | MOQ ${s.min_order_qty}pcs | ${s.payment_terms}
   📞 ${s.contact_name} | ${s.contact_phone}
   💬 ${s.remark}`
).join('\n\n')}

✅ 推荐：东莞劲电机（评分4.6，性价比最高）`;
  } else if (q.includes('退货') || q.includes('退换') || q.includes('售后')) {
    reply = `🎧 退换货处理

✅ 退货工单已创建

工单号: TKT-${new Date().getMonth()+1}${String(new Date().getDate()).padStart(2,'0')}-${Math.random().toString(16).slice(2,6).toUpperCase()}
关联订单: SO-TAO-20260328-001
退货原因: 质量问题 / 七天无理由
状态: 📦 等待用户退货

仓库接收后自动：退款 + 库存回仓`;
  } else {
    reply = `🤖 收到您的请求：「${query}」

我已将任务分配给对应的专业智能体处理。

可尝试：
• 「生成BOM表」→ R&D工程师
• 「各平台订单」→ 销售智能体
• 「库存预警」→ 仓储智能体
• 「供应商对比」→ 采购智能体
• 「模具交期」→ 生产跟单
• 「利润报表」→ 财务智能体`;
  }
  return reply;
}

// ============ 路由 ============
async function handle(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});
    res.end(); return;
  }

  const url = req.url.split('?')[0];

  // 静态文件（前端 dist）
  if (req.method === 'GET' && !url.startsWith('/api')) {
    const file = url === '/' ? '/index.html' : url;
    const filePath = path.join(BASE, 'dist', file);
    try {
      const content = fs.readFileSync(filePath);
      const ext = path.extname(filePath);
      const ct = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.ico':'image/x-icon'}[ext] || 'text/plain';
      res.writeHead(200, {'Content-Type':ct,'Access-Control-Allow-Origin':'*'});
      res.end(content);
    } catch {
      // Fallback to index
      try {
        const idx = fs.readFileSync(path.join(BASE, 'dist', 'index.html'));
        res.writeHead(200, {'Content-Type':'text/html','Access-Control-Allow-Origin':'*'});
        res.end(idx);
      } catch {
        res.writeHead(200); res.end('Electronics Platform Running - API at /api');
      }
    }
    return;
  }

  // ========== API ==========
  try {
    // Auth
    if (url === '/api/auth/login' && req.method === 'POST') {
      const body = await parseBody(req);
      const user = users.find(u => u.username === body.username && u.password_hash === body.password);
      if (!user) return json(res, {error:'用户名或密码错误'}, 401);
      const token = makeToken(user.id);
      return json(res, {token, user: {id:user.id, name:user.name, role:user.role, avatar:user.avatar}});
    }
    if (url === '/api/auth/me' && req.method === 'GET') {
      const u = requireAuth(req); if (!u) return json(res, {error:'未登录'}, 401);
      return json(res, {id:u.id, name:u.name, role:u.role, avatar:u.avatar});
    }
    if (url === '/api/auth/logout' && req.method === 'POST') {
      const h = (req.headers['authorization'] || '').replace('Bearer ','');
      delete tokens[h];
      return json(res, {ok: true});
    }

    // Require auth for all other API
    const user = authUser(req);
    if (!user && url.startsWith('/api/')) {
      return json(res, {error:'未登录'}, 401);
    }

    // Dashboard
    if (url === '/api/dashboard/overview') {
      const inv = loadJSON('inventory.json') || [];
      const orders = loadJSON('orders.json') || {sales:[], purchase:[]};
      const sups = loadJSON('suppliers.json') || [];
      const totalVal = inv.reduce((s, r) => s + r.quantity * r.unit_cost, 0);
      const lowCount = inv.filter(r => r.available < r.safety_stock).length;
      const pending = orders.sales.filter(o => o.status === '待发货').length;
      return json(res, {
        total_inventory_value: Math.round(totalVal),
        sku_count: inv.length,
        low_stock_count: lowCount,
        pending_orders: pending,
        total_revenue: 3351,
        unpaid_amount: 64250,
        supplier_count: sups.length,
        monthly_revenue: 91100,
        monthly_profit: 25045,
        platforms: [
          {name:'淘宝',orders:25,revenue:8450},
          {name:'京东',orders:18,revenue:12800},
          {name:'拼多多',orders:12,revenue:5200},
          {name:'抖音',orders:8,revenue:3600},
          {name:'1688',orders:15,revenue:18200},
          {name:'线下代理',orders:30,revenue:46450},
        ]
      });
    }

    // Suppliers
    if (url === '/api/suppliers' && req.method === 'GET') {
      const sups = loadJSON('suppliers.json') || [];
      return json(res, sups);
    }

    // Inventory
    if (url === '/api/inventory') {
      return json(res, loadJSON('inventory.json') || []);
    }
    if (url === '/api/inventory/alerts') {
      const inv = loadJSON('inventory.json') || [];
      return json(res, inv.filter(r => r.available < r.safety_stock));
    }

    // Orders
    if (url === '/api/orders/sales' && req.method === 'GET') {
      const orders = loadJSON('orders.json') || {sales:[]};
      return json(res, orders.sales);
    }
    if (url === '/api/orders/purchase' && req.method === 'GET') {
      const orders = loadJSON('orders.json') || {purchase:[]};
      return json(res, orders.purchase);
    }
    if (url === '/api/orders/sales' && req.method === 'POST') {
      const body = await parseBody(req);
      const orders = loadJSON('orders.json') || {sales:[]};
      const newOrder = {
        order_id: 'SO-' + Date.now(),
        platform: body.platform || '线下',
        customer: body.customer || {name:'',phone:'',address:''},
        items: body.items || [],
        total_amount: (body.items || []).reduce((s, it) => s + (it.subtotal || 0), 0),
        shipping_fee: body.shipping_fee || 0,
        status: '待支付',
        created_at: new Date().toISOString().slice(0,10),
        is_urgent: false,
        warehouse_code: 'WH-A'
      };
      orders.sales.unshift(newOrder);
      saveJSON('orders.json', orders);
      return json(res, newOrder);
    }

    // Agent Chat
    if (url === '/api/agent/chat' && req.method === 'POST') {
      const body = await parseBody(req);
      const reply = runAgent(body.query || '', user);
      return json(res, {
        reply,
        user: user.name,
        avatar: user.avatar,
        timestamp: new Date().toISOString()
      });
    }

    // Finance
    if (url === '/api/finance/report') {
      const orders = loadJSON('orders.json') || {sales:[],purchase:[]};
      const completed = orders.sales.filter(o => o.status === '已完成');
      const revenue = completed.reduce((s, o) => s + o.total_amount, 0);
      const cost = revenue * 0.52;
      const unpaid = (orders.purchase || []).filter(po => po.payment_status !== '已付款')
        .reduce((s, po) => s + po.total_amount, 0);
      return json(res, {
        total_revenue: revenue,
        cost_estimate: Math.round(cost * 100) / 100,
        gross_profit: Math.round((revenue - cost) * 100) / 100,
        gross_margin: Math.round((revenue - cost) / revenue * 1000) / 10,
        logistics_cost: completed.reduce((s, o) => s + (o.shipping_fee || 0), 0),
        unpaid_payable: unpaid,
        monthly: [
          {month:'1月',revenue:72300,profit:18900},
          {month:'2月',revenue:68100,profit:17200},
          {month:'3月',revenue:91100,profit:25045},
        ]
      });
    }

    // Tickets
    if (url === '/api/tickets' && req.method === 'GET') {
      return json(res, loadJSON('tickets.json') || []);
    }
    if (url === '/api/tickets' && req.method === 'POST') {
      const body = await parseBody(req);
      const tickets = loadJSON('tickets.json') || [];
      const ticket = {
        ticket_id: 'TKT-' + new Date().toISOString().slice(5,10).replace('-','') + '-' + Math.random().toString(16).slice(2,6).toUpperCase(),
        order_id: body.order_id || '',
        type: body.type || '退货',
        description: body.description || '',
        priority: body.priority || 'normal',
        status: '待处理',
        created_by: user.name,
        created_at: new Date().toISOString()
      };
      tickets.unshift(ticket);
      saveJSON('tickets.json', tickets);
      return json(res, ticket);
    }

    // 404
    return json(res, {error: `未找到: ${url}`}, 404);
  } catch (err) {
    console.error('ERROR:', err);
    json(res, {error: String(err)}, 500);
  }
}

// ============ 启动 ============
const server = http.createServer(handle);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 电子制造业平台 API 已启动: http://localhost:${PORT}`);
  console.log(`   前端静态: http://localhost:${PORT}/`);
  console.log(`   演示账号: admin/buyer/warehouse/finance/cs  密码: demo123`);
});
