async function loadComponent(id, file) {
  const target = document.getElementById(id);

  if (!target) return;

  try {
    // Same version stamp as the scripts, so component HTML can never be served
    // from cache while the JS that drives it is fresh.
    const response = await fetch(`${file}?v=${window.ASSET_VERSION || "dev"}`);

    if (!response.ok) {
      throw new Error(`Failed to load ${file}`);
    }

    target.innerHTML = await response.text();
  } catch (error) {
    const fallbacks = {
      sidebar: `<aside class="sidebar">
  <div class="brand">
    <div class="brand-name">Inventory Pro</div>
    <div class="brand-subtitle">Admin Console</div>
  </div>

  <nav class="sidebar-nav" aria-label="Primary">
    <a href="#dashboard" class="nav-item active" data-view="dashboard"><span class="nav-icon" aria-hidden="true">▦</span><span>Dashboard</span></a>
    <a href="#inventory" class="nav-item" data-view="inventory"><span class="nav-icon" aria-hidden="true">▣</span><span>Inventory</span></a>
    <a href="#orders" class="nav-item" data-view="orders"><span class="nav-icon" aria-hidden="true">↻</span><span>Orders</span></a>
    <a href="#suppliers" class="nav-item" data-view="suppliers"><span class="nav-icon" aria-hidden="true">◫</span><span>Suppliers</span></a>
    <a href="#reports" class="nav-item" data-view="reports"><span class="nav-icon" aria-hidden="true">▤</span><span>Reports</span></a>
  </nav>

  <div class="sidebar-spacer"></div>

  <button class="new-btn" type="button" id="newEntryBtn"><span class="btn-icon">+</span><span>New Entry</span></button>

  <div class="sidebar-footer">
    <a href="#support" class="footer-link" data-view="support"><span class="nav-icon" aria-hidden="true">?</span><span>Support</span></a>
    <a href="#" class="footer-link" id="logoutLink"><span class="nav-icon" aria-hidden="true">↪</span><span>Logout</span></a>
  </div>
</aside>`,
      header: `<header class="header">
  <div class="header-search">
    <span class="search-icon" aria-hidden="true">⌕</span>
    <input id="searchInput" type="text" placeholder="Search Item Name..." />
  </div>

  <div class="header-filters" aria-label="Inventory filters">
    <select id="categoryFilter" class="header-filter" aria-label="Category filter"></select>
    <select id="locationFilter" class="header-filter" aria-label="Location filter"></select>
  </div>

  <div class="header-actions">
    <button class="icon-button" type="button" aria-label="Notifications"><span aria-hidden="true">◔</span><span class="notification-dot"></span></button>
    <button class="icon-button" type="button" aria-label="Settings"><span aria-hidden="true">⚙</span></button>
    <div class="avatar" aria-label="Profile">AP</div>
  </div>
</header>`,
      content: `<main class="dashboard-page">
  <section class="dashboard-header">
    <div class="dashboard-title">
      <h1 id="dashboardTitle">Inventory Dashboard</h1>
      <p id="dashboardSubtitle">Manage and track your company assets.</p>
    </div>

    <div class="dashboard-actions" id="dashboardActions">
      <button class="add-btn" type="button" id="addItemBtn"><span class="btn-icon" aria-hidden="true">+</span><span>Add Item</span></button>
      <button class="export-btn" type="button" id="exportExcelBtn">Export Excel</button>
      <button class="export-btn" type="button" id="exportCsvBtn">Export CSV</button>
      <button class="export-btn" type="button" id="exportPdfBtn">Export PDF</button>
    </div>
  </section>

  <section class="summary-grid" id="summaryGrid" aria-label="Inventory summary">
    <article class="summary-card">
      <div class="summary-label"><span class="summary-icon" aria-hidden="true">▢</span><span>Total Items</span></div>
      <div class="summary-value" id="totalItems">0</div>
    </article>
    <article class="summary-card">
      <div class="summary-label"><span class="summary-icon" aria-hidden="true">△</span><span>Low Stock</span></div>
      <div class="summary-value" id="lowStock">0</div>
    </article>
    <article class="summary-card">
      <div class="summary-label"><span class="summary-icon" aria-hidden="true">⌁</span><span>In Maintenance</span></div>
      <div class="summary-value" id="maintenanceCount">0</div>
    </article>
  </section>

  <div class="load-error" id="loadError" role="alert" hidden></div>

  <section class="placeholder-card" id="placeholderView" aria-live="polite" hidden>
    <h2 id="placeholderTitle">Not available yet</h2>
    <p id="placeholderText"></p>
  </section>

  <section class="table-card" id="tableCard" aria-label="Inventory list">
    <table class="inventory-table">
      <thead>
        <tr>
          <th>Item Code</th>
          <th>Item Name</th>
          <th>Category</th>
          <th>Quantity</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="tableBody"></tbody>
    </table>

    <div class="table-footer" id="tableFooter">Showing 0-0 of 0 records</div>
  </section>
</main>
<div class="modal-overlay" id="itemModalOverlay" hidden>
  <div class="modal-card">
    <div class="modal-header">
      <h2 id="itemModalTitle">New Inventory Item</h2>
      <button class="modal-close" type="button" id="itemModalClose" aria-label="Close">&times;</button>
    </div>
    <form class="modal-form" id="itemForm">
      <div class="modal-field"><label for="itemName">Item Name</label><input id="itemName" name="itemName" type="text" required /></div>
      <div class="modal-field"><label for="itemCategory">Category</label><input id="itemCategory" name="category" type="text" required /></div>
      <div class="modal-row">
        <div class="modal-field"><label for="itemPurchaseDate">Purchase Date</label><input id="itemPurchaseDate" name="purchaseDate" type="date" required /></div>
        <div class="modal-field"><label for="itemQuantity">Quantity</label><input id="itemQuantity" name="quantity" type="number" min="1" required /></div>
      </div>
      <div class="modal-row">
        <div class="modal-field"><label for="itemAmount">Amount (USD)</label><input id="itemAmount" name="amount" type="number" min="0" step="0.01" required /></div>
        <div class="modal-field"><label for="itemLocation">Location</label><input id="itemLocation" name="location" type="text" required /></div>
      </div>
      <div class="modal-field">
        <label for="itemStatus">Status</label>
        <select id="itemStatus" name="status">
          <option value="Available">Available</option>
          <option value="In_Use">In Use</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Retired">Retired</option>
        </select>
      </div>
      <div class="modal-error" id="itemModalError"></div>
      <div class="modal-actions">
        <button type="button" class="modal-btn secondary" id="itemModalCancel">Cancel</button>
        <button type="submit" class="modal-btn primary" id="itemModalSubmit">Save Item</button>
      </div>
    </form>
  </div>
</div>`,
    };

    target.innerHTML = fallbacks[id] ?? "";
    console.warn(`Using fallback markup for ${id} because ${file} could not be loaded.`, error);
  }
}

async function loadAllComponents() {
  await Promise.all([
    loadComponent("sidebar", "pages/sidebar.html"),
    loadComponent("header", "pages/header.html"),
    loadComponent("content", "pages/dashboard.html"),
  ]);

  document.dispatchEvent(new Event("componentsLoaded"));
}

loadAllComponents();
