const API = 'https://linkdin-nle6.onrender.com';

// ─── STATE ───────────────────────────────────────────────────────
let allProducts = [];
let allCustomers = [];
let allSales = [];
let cart = [];

// ─── NAVIGATION ──────────────────────────────────────────────────
function navigate(page, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  if (el) el.classList.add('active');

  const titles = {
    dashboard: 'Dashboard', billing: '⚡ New Bill',
    inventory: 'Inventory', customers: 'Customers',
    sales: 'Sales History', analytics: 'Analytics'
  };
  document.getElementById('page-title').textContent = titles[page];

  const actions = document.getElementById('topbar-actions');
  actions.innerHTML = '';

  if (page === 'dashboard') loadDashboard();
  if (page === 'inventory') { loadInventory(); actions.innerHTML = '<button class="btn btn-primary" onclick="openModal(\'add-product-modal\')">+ Add Product</button>'; }
  if (page === 'customers') { loadCustomers(); actions.innerHTML = '<button class="btn btn-primary" onclick="openModal(\'add-customer-modal\')">+ Add Customer</button>'; }
  if (page === 'sales') loadSales();
  if (page === 'billing') loadBillingPage();
  if (page === 'analytics') loadAnalytics();
}

// ─── API HELPER ───────────────────────────────────────────────────
async function api(endpoint, options = {}) {
  try {
    const res = await fetch(API + endpoint, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

// ─── TOAST ───────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = (type === 'success' ? '✓ ' : '✕ ') + msg;
  t.className = 'show ' + type;
  setTimeout(() => t.className = '', 3000);
}

// ─── MODALS ──────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ─── DASHBOARD ───────────────────────────────────────────────────
async function loadDashboard() {
  const [products, customers, sales] = await Promise.all([
    api('/products'), api('/customers'), api('/sales')
  ]);

  if (products) {
    allProducts = products;
    document.getElementById('stat-products').textContent = products.length;
    const lowStock = products.filter(p => p.quantity <= 5);
    if (lowStock.length > 0) {
      document.getElementById('low-stock-alert').style.display = 'flex';
      document.getElementById('low-stock-text').textContent =
        lowStock.map(p => `${p.name} (${p.quantity} left)`).join(', ');
      document.getElementById('an-lowstock').textContent = lowStock.length;
    }
  }

  if (customers) {
    allCustomers = customers;
    document.getElementById('stat-customers').textContent = customers.length;
  }

  if (sales) {
    allSales = sales;
    const today = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter(s => s.date === today);
    const todayRev = todaySales.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
    document.getElementById('stat-revenue').textContent = '₹' + todayRev.toLocaleString('en-IN');
    document.getElementById('stat-bills').textContent = todaySales.length;
    document.getElementById('stat-revenue-sub').textContent = `${todaySales.length} transactions today`;

    renderRevenueChart(sales);
    renderRecentSales(sales, customers);
  }

  renderTopProducts(allProducts);
}

function renderRevenueChart(sales) {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const now = new Date();
  const data = Array(7).fill(0);
  const labels = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const daySales = sales.filter(s => s.date === dateStr);
    data[6 - i] = daySales.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
    labels.push(days[d.getDay()]);
  }

  const max = Math.max(...data, 1);
  const chart = document.getElementById('revenue-chart');
  chart.innerHTML = data.map((v, i) =>
    `<div class="chart-col">
      <div class="chart-bar ${i === 6 ? 'highlight' : ''}" style="height:${Math.max(4, (v/max)*140)}px" title="₹${v.toLocaleString('en-IN')}"></div>
    </div>`
  ).join('');

  document.getElementById('chart-labels').innerHTML = labels.map((l, i) =>
    `<span class="chart-label" style="${i===6?'color:var(--accent);font-weight:700':''}">${l}</span>`
  ).join('');
}

function renderRecentSales(sales, customers) {
  const custMap = {};
  (customers || []).forEach(c => custMap[c.id] = c);
  const recent = [...sales].sort((a,b) => b.id - a.id).slice(0, 5);
  const colors = ['#7c6aff','#ff6b6b','#00e5a0','#ffcc00','#ff9f43'];

  document.getElementById('recent-sales-list').innerHTML = recent.length === 0
    ? '<div style="color:var(--muted);font-size:13px;">No sales yet</div>'
    : recent.map((s, i) => {
        const cust = custMap[s.customer_id];
        const initials = cust ? cust.name.slice(0,2).toUpperCase() : '??';
        return `<div class="sale-row">
          <div class="sale-avatar" style="background:${colors[i%colors.length]}22; color:${colors[i%colors.length]}">${initials}</div>
          <div class="sale-info">
            <div class="sale-name">${cust ? cust.name : 'Customer #'+s.customer_id}</div>
            <div class="sale-time">Sale #${s.id} · ${s.date}</div>
          </div>
          <div class="sale-amount">₹${parseFloat(s.total_amount||0).toLocaleString('en-IN')}</div>
        </div>`;
      }).join('');
}

function renderTopProducts(products) {
  const sorted = [...products].sort((a,b) => b.price - a.price).slice(0,5);
  document.getElementById('top-products-list').innerHTML = sorted.map(p =>
    `<div style="display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border);">
      <span style="font-size:13px; font-weight:600;">${p.name}</span>
      <span class="tag tag-purple" style="font-size:11px;">₹${parseFloat(p.price).toLocaleString('en-IN')}</span>
    </div>`
  ).join('');
}

// ─── INVENTORY ───────────────────────────────────────────────────
async function loadInventory() {
  const products = await api('/products');
  if (!products) return;
  allProducts = products;
  renderInventoryTable(products);
}

function renderInventoryTable(products) {
  document.getElementById('inventory-table').innerHTML = products.map(p => {
    const stock = p.quantity;
    const statusTag = stock === 0 ? '<span class="tag tag-red">Out of Stock</span>'
      : stock <= 5 ? '<span class="tag tag-yellow">Low Stock</span>'
      : '<span class="tag tag-green">In Stock</span>';
    return `<tr>
      <td><span style="font-family:'Space Mono';color:var(--muted);">#${p.id}</span></td>
      <td><strong>${p.name}</strong></td>
      <td style="color:var(--muted); max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.description || '—'}</td>
      <td style="font-family:'Space Mono'; font-weight:700;">₹${parseFloat(p.price).toLocaleString('en-IN')}</td>
      <td><span style="font-family:'Space Mono';">${p.quantity}</span></td>
      <td>${statusTag}</td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-ghost" style="padding:5px 10px; font-size:12px;" onclick="editProduct(${JSON.stringify(p).replace(/"/g,'&quot;')})">Edit</button>
          <button class="btn btn-danger" style="padding:5px 10px; font-size:12px;" onclick="deleteProduct(${p.id})">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function filterInventory(q) {
  const filtered = allProducts.filter(p =>
    p.name.toLowerCase().includes(q.toLowerCase()) ||
    (p.description||'').toLowerCase().includes(q.toLowerCase())
  );
  renderInventoryTable(filtered);
}

function editProduct(p) {
  document.getElementById('product-modal-title').textContent = 'Edit Product';
  document.getElementById('edit-product-id').value = p.id;
  document.getElementById('p-name').value = p.name;
  document.getElementById('p-price').value = p.price;
  document.getElementById('p-desc').value = p.description || '';
  document.getElementById('p-qty').value = p.quantity;
  openModal('add-product-modal');
}

async function saveProduct() {
  const id = document.getElementById('edit-product-id').value;
  const data = {
    name: document.getElementById('p-name').value,
    price: parseFloat(document.getElementById('p-price').value),
    description: document.getElementById('p-desc').value,
    quantity: parseInt(document.getElementById('p-qty').value)
  };
  if (!data.name || isNaN(data.price)) { toast('Fill all required fields', 'error'); return; }

  const result = id
    ? await api(`/products/${id}`, { method:'PUT', body: JSON.stringify(data) })
    : await api('/products', { method:'POST', body: JSON.stringify(data) });

  if (result) {
    toast(id ? 'Product updated!' : 'Product added!');
    closeModal('add-product-modal');
    document.getElementById('edit-product-id').value = '';
    document.getElementById('product-modal-title').textContent = 'Add Product';
    loadInventory();
  } else {
    toast('Error saving product', 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  const r = await api(`/products/${id}`, { method:'DELETE' });
  if (r !== null) { toast('Product deleted'); loadInventory(); }
  else toast('Error deleting', 'error');
}

// ─── CUSTOMERS ───────────────────────────────────────────────────
async function loadCustomers() {
  const customers = await api('/customers');
  if (!customers) return;
  allCustomers = customers;
  renderCustomersTable(customers);
}

function renderCustomersTable(customers) {
  document.getElementById('customers-table').innerHTML = customers.map(c =>
    `<tr>
      <td><span style="font-family:'Space Mono';color:var(--muted);">#${c.id}</span></td>
      <td><strong>${c.name}</strong></td>
      <td style="font-family:'Space Mono';">${c.contact}</td>
      <td style="color:var(--muted);">—</td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-ghost" style="padding:5px 10px; font-size:12px;" onclick="editCustomer(${JSON.stringify(c).replace(/"/g,'&quot;')})">Edit</button>
          <button class="btn btn-danger" style="padding:5px 10px; font-size:12px;" onclick="deleteCustomer(${c.id})">Delete</button>
        </div>
      </td>
    </tr>`
  ).join('');
}

function filterCustomers(q) {
  const filtered = allCustomers.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase()) || c.contact.includes(q)
  );
  renderCustomersTable(filtered);
}

function editCustomer(c) {
  document.getElementById('customer-modal-title').textContent = 'Edit Customer';
  document.getElementById('edit-customer-id').value = c.id;
  document.getElementById('c-name').value = c.name;
  document.getElementById('c-contact').value = c.contact;
  openModal('add-customer-modal');
}

async function saveCustomer() {
  const id = document.getElementById('edit-customer-id').value;
  const data = {
    name: document.getElementById('c-name').value,
    contact: document.getElementById('c-contact').value
  };
  if (!data.name || !data.contact) { toast('Fill all fields', 'error'); return; }

  const result = id
    ? await api(`/customers/${id}`, { method:'PUT', body: JSON.stringify(data) })
    : await api('/customers', { method:'POST', body: JSON.stringify(data) });

  if (result) {
    toast(id ? 'Customer updated!' : 'Customer added!');
    closeModal('add-customer-modal');
    document.getElementById('edit-customer-id').value = '';
    document.getElementById('customer-modal-title').textContent = 'Add Customer';
    loadCustomers();
    loadBillingCustomers();
  } else toast('Error saving customer', 'error');
}

async function deleteCustomer(id) {
  if (!confirm('Delete this customer?')) return;
  const r = await api(`/customers/${id}`, { method:'DELETE' });
  if (r !== null) { toast('Customer deleted'); loadCustomers(); }
  else toast('Error deleting', 'error');
}

// ─── SALES ───────────────────────────────────────────────────────
async function loadSales() {
  const [sales, customers] = await Promise.all([api('/sales'), api('/customers')]);
  if (!sales) return;
  allSales = sales;
  allCustomers = customers || [];
  renderSalesTable(sales);
}

function renderSalesTable(sales) {
  const custMap = {};
  allCustomers.forEach(c => custMap[c.id] = c);
  document.getElementById('sales-table').innerHTML = [...sales].sort((a,b)=>b.id-a.id).map(s =>
    `<tr>
      <td><span class="tag tag-purple">#${s.id}</span></td>
      <td><strong>${custMap[s.customer_id] ? custMap[s.customer_id].name : 'Customer #'+s.customer_id}</strong></td>
      <td style="font-family:'Space Mono'; color:var(--muted);">${s.date}</td>
      <td style="color:var(--muted);">—</td>
      <td style="font-family:'Space Mono'; font-weight:700; color:var(--accent3);">₹${parseFloat(s.total_amount||0).toLocaleString('en-IN')}</td>
      <td><button class="btn btn-ghost" style="padding:5px 10px; font-size:12px;" onclick="viewBill(${s.id})">View Bill</button></td>
    </tr>`
  ).join('');
}

function filterSales(q) {
  const query = typeof q === 'string' ? q.toLowerCase() : '';
  const custMap = {};
  allCustomers.forEach(c => custMap[c.id] = c);
  const filtered = allSales.filter(s => {
    const name = custMap[s.customer_id] ? custMap[s.customer_id].name.toLowerCase() : '';
    return String(s.id).includes(query) || name.includes(query);
  });
  renderSalesTable(filtered);
}

async function viewBill(saleId) {
  const [sale, items] = await Promise.all([
    api(`/sales/${saleId}`),
    api(`/sales/${saleId}/items`)
  ]);

  const custMap = {};
  allCustomers.forEach(c => custMap[c.id] = c);
  const cust = custMap[sale.customer_id];

  let content = `━━━━━━━━━━━━━━━━━━━━━━━━━
        BillFlow Store
   Smart Billing & Inventory
━━━━━━━━━━━━━━━━━━━━━━━━━

Bill #${sale.id}
Date: ${sale.date}
Customer: ${cust ? cust.name : 'N/A'}
Contact: ${cust ? cust.contact : 'N/A'}

─────────────────────────
ITEM             QTY  PRICE
─────────────────────────
`;

  let subtotal = 0;
  if (items && items.length) {
    items.forEach(item => {
      const lineTotal = item.quantity * item.price;
      subtotal += lineTotal;
      const name = (item.product_name || 'Product').padEnd(15).slice(0,15);
      content += `${name}  ${String(item.quantity).padStart(3)}  ₹${lineTotal.toFixed(2)}\n`;
    });
  }

  const gst = subtotal * 0.18;
  const total = parseFloat(sale.total_amount || subtotal + gst);
  content += `
─────────────────────────
Subtotal:         ₹${subtotal.toFixed(2)}
GST (18%):        ₹${gst.toFixed(2)}
─────────────────────────
TOTAL:            ₹${total.toFixed(2)}
─────────────────────────

     Thank you for shopping!
     Visit us again :)
━━━━━━━━━━━━━━━━━━━━━━━━━`;

  document.getElementById('receipt-content').textContent = content;
  openModal('receipt-modal');
}

// ─── BILLING ─────────────────────────────────────────────────────
async function loadBillingPage() {
  const [products, customers] = await Promise.all([api('/products'), api('/customers')]);
  if (products) {
    allProducts = products;
    renderProductTiles(products);
  }
  if (customers) {
    allCustomers = customers;
    loadBillingCustomers();
  }
}

function loadBillingCustomers() {
  const sel = document.getElementById('bill-customer');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select Customer —</option>' +
    allCustomers.map(c => `<option value="${c.id}">${c.name} (${c.contact})</option>`).join('');
}

function renderProductTiles(products) {
  document.getElementById('products-grid').innerHTML = products.map(p =>
    `<div class="product-tile" onclick="addToCart(${p.id})">
      <div class="p-name">${p.name}</div>
      <div class="p-price">₹${parseFloat(p.price).toLocaleString('en-IN')}</div>
      <div class="p-stock ${p.quantity <= 5 ? 'low' : ''}">
        ${p.quantity <= 5 ? '⚠ ' : ''}${p.quantity} in stock
      </div>
    </div>`
  ).join('');
}

function filterProducts() {
  const q = document.getElementById('product-search').value.toLowerCase();
  const filtered = allProducts.filter(p => p.name.toLowerCase().includes(q));
  renderProductTiles(filtered);
}

function addToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;
  if (product.quantity === 0) { toast('Out of stock!', 'error'); return; }

  const existing = cart.find(i => i.product_id === productId);
  if (existing) {
    if (existing.quantity >= product.quantity) { toast('Max stock reached', 'error'); return; }
    existing.quantity++;
  } else {
    cart.push({ product_id: productId, name: product.name, price: parseFloat(product.price), quantity: 1 });
  }
  updateCart();
  toast(`${product.name} added to cart`);
}

function updateCart() {
  const cartEl = document.getElementById('cart-items');
  const discount = parseFloat(document.getElementById('discount')?.value || 0);

  if (cart.length === 0) {
    cartEl.innerHTML = `<div style="text-align:center; padding:40px; color:var(--muted); font-size:13px;">
      <div style="font-size:32px; margin-bottom:10px;">🛒</div>Add products to start billing</div>`;
    document.getElementById('cart-subtotal').textContent = '₹0.00';
    document.getElementById('cart-gst').textContent = '₹0.00';
    document.getElementById('cart-total').textContent = '₹0.00';
    return;
  }

  cartEl.innerHTML = cart.map((item, i) =>
    `<div class="cart-item">
      <div style="flex:1">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">₹${item.price.toFixed(2)} each</div>
      </div>
      <div class="qty-ctrl">
        <button class="qty-btn" onclick="changeQty(${i}, -1)">−</button>
        <span class="qty-num">${item.quantity}</span>
        <button class="qty-btn" onclick="changeQty(${i}, 1)">+</button>
      </div>
      <button class="remove-btn" onclick="removeFromCart(${i})">✕</button>
    </div>`
  ).join('');

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const gst = subtotal * 0.18;
  const discountAmt = subtotal * (discount / 100);
  const total = subtotal + gst - discountAmt;

  document.getElementById('cart-subtotal').textContent = '₹' + subtotal.toFixed(2);
  document.getElementById('cart-gst').textContent = '₹' + gst.toFixed(2);
  document.getElementById('cart-total').textContent = '₹' + total.toFixed(2);
}

function changeQty(index, delta) {
  cart[index].quantity += delta;
  if (cart[index].quantity <= 0) cart.splice(index, 1);
  updateCart();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCart();
}

function clearCart() {
  cart = [];
  updateCart();
}

async function processBill() {
  if (cart.length === 0) { toast('Cart is empty!', 'error'); return; }
  const customerId = document.getElementById('bill-customer').value;
  if (!customerId) { toast('Select a customer!', 'error'); return; }

  const discount = parseFloat(document.getElementById('discount')?.value || 0);
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const gst = subtotal * 0.18;
  const total = subtotal + gst - (subtotal * discount / 100);

  const today = new Date().toISOString().split('T')[0];
  const sale = await api('/sales', {
    method: 'POST',
    body: JSON.stringify({ customer_id: parseInt(customerId), date: today, total_amount: total })
  });

  if (!sale) { toast('Error creating sale', 'error'); return; }

  for (const item of cart) {
    await api(`/sales/${sale.id}/items`, {
      method: 'POST',
      body: JSON.stringify({ product_id: item.product_id, quantity: item.quantity, price: item.price })
    });
    await api(`/products/${item.product_id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity: item.quantity })
    });
  }

  // show receipt
  const cust = allCustomers.find(c => c.id == customerId);
  let receiptContent = `━━━━━━━━━━━━━━━━━━━━━━━━━
        BillFlow Store
━━━━━━━━━━━━━━━━━━━━━━━━━
Bill #${sale.id}
Date: ${today}
Customer: ${cust ? cust.name : ''}

─────────────────────────
ITEM             QTY  PRICE
─────────────────────────
`;
  cart.forEach(item => {
    const lineTotal = item.price * item.quantity;
    const name = item.name.padEnd(15).slice(0,15);
    receiptContent += `${name}  ${String(item.quantity).padStart(3)}  ₹${lineTotal.toFixed(2)}\n`;
  });

  receiptContent += `
─────────────────────────
Subtotal:         ₹${subtotal.toFixed(2)}
GST (18%):        ₹${gst.toFixed(2)}
Discount:         ${discount}%
─────────────────────────
TOTAL:            ₹${total.toFixed(2)}
─────────────────────────
     Thank you! Come again :)
━━━━━━━━━━━━━━━━━━━━━━━━━`;

  document.getElementById('receipt-content').textContent = receiptContent;
  openModal('receipt-modal');

  toast('Bill generated! ₹' + total.toFixed(2));
  clearCart();
  allProducts = (await api('/products')) || allProducts;
  renderProductTiles(allProducts);
}

function printReceipt() {
  const content = document.getElementById('receipt-content').textContent;
  const win = window.open('', '_blank');
  win.document.write(`<html><head><title>Bill</title><style>body{font-family:monospace;padding:20px;white-space:pre;}</style></head><body>${content}</body></html>`);
  win.print();
}

// ─── ANALYTICS ───────────────────────────────────────────────────
async function loadAnalytics() {
  const [sales, products, customers] = await Promise.all([
    api('/sales'), api('/products'), api('/customers')
  ]);

  if (sales) {
    const total = sales.reduce((s, x) => s + parseFloat(x.total_amount || 0), 0);
    const avg = sales.length ? total / sales.length : 0;
    document.getElementById('an-total-rev').textContent = '₹' + total.toLocaleString('en-IN', {maximumFractionDigits:0});
    document.getElementById('an-aov').textContent = '₹' + avg.toLocaleString('en-IN', {maximumFractionDigits:0});
    document.getElementById('an-sales').textContent = sales.length;
    renderMonthlyChart(sales);
  }

  if (products) {
    const low = products.filter(p => p.quantity <= 5).length;
    document.getElementById('an-lowstock').textContent = low;
    renderTopProductsAnalytics(products);
  }
}

function renderMonthlyChart(sales) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthlyData = Array(12).fill(0);
  sales.forEach(s => {
    const m = new Date(s.date).getMonth();
    if (!isNaN(m)) monthlyData[m] += parseFloat(s.total_amount || 0);
  });

  const max = Math.max(...monthlyData, 1);
  const chart = document.getElementById('monthly-chart');
  chart.innerHTML = monthlyData.map((v, i) =>
    `<div class="chart-col">
      <div class="chart-bar ${i === new Date().getMonth() ? 'highlight' : ''}"
        style="height:${Math.max(4, (v/max)*180)}px" title="₹${v.toFixed(0)}"></div>
    </div>`
  ).join('');

  document.getElementById('monthly-labels').innerHTML = months.map((l, i) =>
    `<span class="chart-label" style="${i===new Date().getMonth()?'color:var(--accent);font-weight:700':''}">${l}</span>`
  ).join('');
}

function renderTopProductsAnalytics(products) {
  const sorted = [...products].sort((a,b) => (b.price * (100-b.quantity)) - (a.price * (100-a.quantity))).slice(0,5);
  const maxVal = Math.max(...products.map(p => p.price), 1);
  document.getElementById('top-products-analytics').innerHTML = sorted.map(p =>
    `<div style="margin-bottom:14px;">
      <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:5px;">
        <span style="font-weight:600;">${p.name}</span>
        <span style="font-family:'Space Mono'; color:var(--accent);">₹${parseFloat(p.price).toLocaleString('en-IN')}</span>
      </div>
      <div style="background:var(--bg3); border-radius:4px; height:6px; overflow:hidden;">
        <div style="height:100%; width:${(p.price/maxVal*100).toFixed(0)}%; background:var(--accent); border-radius:4px; transition:width 0.6s ease;"></div>
      </div>
    </div>`
  ).join('');
}

// ─── INIT ─────────────────────────────────────────────────────────
loadDashboard();
