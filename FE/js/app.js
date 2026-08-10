let inventoryData = {
  summary: {
    totalItems: 0,
    lowStock: 0,
    maintenanceCount: 0,
  },
  inventory: [],
};

let filteredInventory = [];
let editingItemId = null;

const LOW_STOCK_THRESHOLD = 5;

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function statusClass(status) {
  const normalized = status.toLowerCase().replace(/\s+/g, "-");
  return `status-${normalized}`;
}

function statusToDisplay(status) {
  return status.replace(/_/g, " ");
}

function statusToEnum(status) {
  return status.replace(/\s+/g, "_");
}

function iconSvg(path) {
  return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

function renderSummary(summary) {
  const totalItems = document.getElementById("totalItems");
  const lowStock = document.getElementById("lowStock");
  const maintenanceCount = document.getElementById("maintenanceCount");

  if (totalItems) totalItems.textContent = summary.totalItems.toLocaleString();
  if (lowStock) lowStock.textContent = summary.lowStock.toLocaleString();
  if (maintenanceCount) maintenanceCount.textContent = summary.maintenanceCount.toLocaleString();
}

function renderFilters() {
  const categoryFilter = document.getElementById("categoryFilter");
  const locationFilter = document.getElementById("locationFilter");
  const categories = ["All Categories", ...new Set(inventoryData.inventory.map((item) => item.category))];
  const locations = ["All Locations", ...new Set(inventoryData.inventory.map((item) => item.location))];

  if (categoryFilter) {
    const previous = categoryFilter.value || "All Categories";
    categoryFilter.innerHTML = categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("");
    if (categories.includes(previous)) categoryFilter.value = previous;
  }

  if (locationFilter) {
    const previous = locationFilter.value || "All Locations";
    locationFilter.innerHTML = locations.map((location) => `<option value="${escapeHtml(location)}">${escapeHtml(location)}</option>`).join("");
    if (locations.includes(previous)) locationFilter.value = previous;
  }
}

function renderTable(rows) {
  const tableBody = document.getElementById("tableBody");
  const tableFooter = document.getElementById("tableFooter");

  if (!tableBody || !tableFooter) return;

  if (!rows.length) {
    // An empty inventory and an over-filtered one need different offers: one
    // needs a first item, the other needs the filters cleared.
    const nothingAtAll = !inventoryData.inventory.length;
    tableBody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <p>${nothingAtAll ? "No inventory items yet." : "No items match the current filters."}</p>
            ${
              nothingAtAll
                ? `<button class="modal-btn primary" type="button" id="emptyAddBtn">Add your first item</button>`
                : `<button class="modal-btn secondary" type="button" id="clearFiltersBtn">Clear filters</button>`
            }
          </div>
        </td>
      </tr>`;
    tableFooter.textContent = "Showing 0-0 of 0 records";
    return;
  }

  tableBody.innerHTML = rows
    .map((item) => {
      return `
        <tr>
          <td>${escapeHtml(item.code)}</td>
          <td class="item-name">${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.category)}</td>
          <td>${escapeHtml(item.quantity)}</td>
          <td>${formatCurrency(item.amount)}</td>
          <td><span class="status-chip ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td>
          <td>
            <div class="actions">
              <button class="table-action edit" type="button" data-id="${escapeHtml(item.id)}" aria-label="Edit ${escapeHtml(item.name)}">
                ${iconSvg("<path d='M3 11.5V13h1.5L12 5.5 10.5 4 3 11.5Z' /><path d='m9.7 4.3 2 2' />")}
              </button>
              <button class="table-action delete" type="button" data-id="${escapeHtml(item.id)}" aria-label="Delete ${escapeHtml(item.name)}">
                ${iconSvg("<path d='M3.5 4.5h9' /><path d='M6 4.5V3.4h4V4.5' /><path d='M5.5 6v6' /><path d='M8 6v6' /><path d='M10.5 6v6' /><path d='M4.5 4.5l.6 8.5h5.8l.6-8.5' />")}
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  tableFooter.textContent = `Showing 1-${rows.length} of ${rows.length} records`;
}

function applyFilters() {
  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");
  const locationFilter = document.getElementById("locationFilter");

  const searchValue = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const categoryValue = categoryFilter ? categoryFilter.value : "All Categories";
  const locationValue = locationFilter ? locationFilter.value : "All Locations";

  filteredInventory = inventoryData.inventory.filter((item) => {
    const matchesSearch =
      !searchValue ||
      [item.code, item.name, item.category, item.location, item.status]
        .join(" ")
        .toLowerCase()
        .includes(searchValue);

    const matchesCategory = categoryValue === "All Categories" || item.category === categoryValue;
    const matchesLocation = locationValue === "All Locations" || item.location === locationValue;

    return matchesSearch && matchesCategory && matchesLocation;
  });

  renderTable(filteredInventory);
}

function clearFilters() {
  const search = document.getElementById("searchInput");
  const category = document.getElementById("categoryFilter");
  const location = document.getElementById("locationFilter");
  if (search) search.value = "";
  if (category) category.value = "All Categories";
  if (location) location.value = "All Locations";
  applyFilters();
}

function findItemById(id) {
  return inventoryData.inventory.find((item) => item.id === id);
}

// The export endpoint accepts the same filters as the dashboard, so a download
// contains exactly the rows currently on screen.
function currentFilterParams() {
  const search = document.getElementById("searchInput")?.value.trim();
  const category = document.getElementById("categoryFilter")?.value;
  const location = document.getElementById("locationFilter")?.value;

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (category && category !== "All Categories") params.set("category", category);
  if (location && location !== "All Locations") params.set("location", location);
  return params;
}

async function downloadExport(format) {
  const params = currentFilterParams();
  params.set("format", format);

  try {
    const { blob, filename } = await apiBlob(`/inventory/export?${params}`);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    alert(error.message || "Export failed.");
  }
}

function setUserAvatar() {
  const user = getSessionUser();
  const avatar = document.getElementById("userAvatar");
  if (!avatar || !user) return;
  avatar.setAttribute("aria-label", `${user.name} (${user.role})`);
  avatar.title = `${user.name} — ${user.email}`;
}

function openModal(mode, item) {
  const overlay = document.getElementById("itemModalOverlay");
  const title = document.getElementById("itemModalTitle");
  const form = document.getElementById("itemForm");
  const error = document.getElementById("itemModalError");

  if (!overlay || !form) return;

  editingItemId = mode === "edit" ? item.id : null;
  title.textContent = mode === "edit" ? "Edit Inventory Item" : "New Inventory Item";
  error.textContent = "";
  form.reset();

  if (mode === "edit" && item) {
    form.itemName.value = item.name;
    form.category.value = item.category;
    form.purchaseDate.value = item.purchaseDate ? item.purchaseDate.slice(0, 10) : "";
    form.quantity.value = item.quantity;
    form.amount.value = item.amount;
    form.location.value = item.location;
    form.status.value = statusToEnum(item.status);
  } else {
    form.status.value = "Available";
  }

  overlay.hidden = false;
}

function closeModal() {
  const overlay = document.getElementById("itemModalOverlay");
  if (overlay) overlay.hidden = true;
  editingItemId = null;
}

async function handleItemFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const error = document.getElementById("itemModalError");
  const submitBtn = document.getElementById("itemModalSubmit");

  const payload = {
    itemName: form.itemName.value.trim(),
    category: form.category.value.trim(),
    purchaseDate: form.purchaseDate.value,
    quantity: Number(form.quantity.value),
    amount: form.amount.value,
    location: form.location.value.trim(),
    status: form.status.value,
  };

  submitBtn.disabled = true;
  error.textContent = "";

  try {
    if (editingItemId) {
      await apiJson(`/inventory/${editingItemId}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      await apiJson("/inventory", { method: "POST", body: JSON.stringify(payload) });
    }
    closeModal();
    await refreshDashboard();
  } catch (err) {
    error.textContent = err.message || "Unable to save item.";
  } finally {
    submitBtn.disabled = false;
  }
}

// Each sidebar entry maps to a view. Orders and Suppliers have no API behind
// them yet, so they show an explicit notice instead of a dead link.
const VIEWS = {
  dashboard: {
    title: "Inventory Dashboard",
    subtitle: "Manage and track your company assets.",
    summary: true,
    table: true,
    actions: true,
  },
  inventory: {
    title: "Inventory",
    subtitle: "Every item on record. Use the filters above to narrow the list.",
    summary: false,
    table: true,
    actions: true,
  },
  reports: {
    title: "Reports",
    subtitle: "Stock levels at a glance. Download the full data set below.",
    summary: true,
    table: false,
    actions: true,
  },
  orders: {
    title: "Orders",
    subtitle: "",
    placeholder: "Order tracking is not built yet — the API has no orders endpoint.",
  },
  suppliers: {
    title: "Suppliers",
    subtitle: "",
    placeholder: "Supplier records are not built yet — the API has no suppliers endpoint.",
  },
  support: {
    title: "Support",
    subtitle: "",
    placeholder: "Need help? Contact your administrator.",
  },
};

let currentView = "dashboard";

function setView(name) {
  const view = VIEWS[name];
  if (!view) return;
  currentView = name;

  document.querySelectorAll("#sidebar [data-view]").forEach((link) => {
    link.classList.toggle("active", link.dataset.view === name);
  });

  const show = (id, visible) => {
    const el = document.getElementById(id);
    if (el) el.hidden = !visible;
  };

  show("summaryGrid", !!view.summary);
  show("tableCard", !!view.table);
  show("dashboardActions", !!view.actions);
  show("placeholderView", !!view.placeholder);

  const title = document.getElementById("dashboardTitle");
  const subtitle = document.getElementById("dashboardSubtitle");
  if (title) title.textContent = view.title;
  if (subtitle) {
    subtitle.textContent = view.subtitle;
    subtitle.hidden = !view.subtitle;
  }

  if (view.placeholder) {
    const pTitle = document.getElementById("placeholderTitle");
    const pText = document.getElementById("placeholderText");
    if (pTitle) pTitle.textContent = view.title;
    if (pText) pText.textContent = view.placeholder;
  }

  // Search and filters only mean something where a table is visible.
  const filters = document.querySelector(".header-filters");
  const search = document.querySelector(".header-search");
  if (filters) filters.hidden = !view.table;
  if (search) search.hidden = !view.table;
}

async function refreshDashboard() {
  await loadData();
  renderFilters();
  applyFilters();
  renderSummary(inventoryData.summary);
}

// Re-fetches the row before editing so the form shows current values even if
// another user changed the item since this page loaded.
async function handleEdit(id) {
  try {
    openModal("edit", mapItem(await apiJson(`/inventory/${id}`)));
  } catch (error) {
    if (error.status === 404) {
      alert("That item no longer exists.");
      await refreshDashboard();
      return;
    }
    const cached = findItemById(id);
    if (cached) openModal("edit", cached);
    else alert(error.message || "Unable to load that item.");
  }
}

async function handleDelete(id) {
  const item = findItemById(id);
  if (!item) return;
  if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;

  try {
    await apiFetch(`/inventory/${id}`, { method: "DELETE" });
    await refreshDashboard();
  } catch (error) {
    if (error.status === 403) {
      alert("You do not have permission to delete items (admin role required).");
    } else {
      alert(error.message || "Unable to delete item.");
    }
  }
}

function mapItem(item) {
  return {
    id: item.id,
    code: item.itemCode,
    name: item.itemName,
    category: item.category,
    location: item.location,
    quantity: item.quantity,
    amount: Number(item.amount),
    status: statusToDisplay(item.status),
    purchaseDate: item.purchaseDate,
  };
}

async function loadData() {
  const response = await apiJson("/inventory?limit=1000");
  const items = response.data.map(mapItem);

  inventoryData = {
    summary: {
      totalItems: response.meta.total,
      lowStock: items.filter((item) => item.quantity <= LOW_STOCK_THRESHOLD).length,
      maintenanceCount: items.filter((item) => item.status === "Maintenance").length,
    },
    inventory: items,
  };

  filteredInventory = [...inventoryData.inventory];
}

function bindEvents() {
  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");
  const locationFilter = document.getElementById("locationFilter");
  const exportExcelBtn = document.getElementById("exportExcelBtn");
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  const exportPdfBtn = document.getElementById("exportPdfBtn");
  const newEntryBtn = document.getElementById("newEntryBtn");
  const logoutLink = document.getElementById("logoutLink");
  const tableBody = document.getElementById("tableBody");
  const itemForm = document.getElementById("itemForm");
  const itemModalClose = document.getElementById("itemModalClose");
  const itemModalCancel = document.getElementById("itemModalCancel");
  const itemModalOverlay = document.getElementById("itemModalOverlay");

  searchInput?.addEventListener("input", applyFilters);
  categoryFilter?.addEventListener("change", applyFilters);
  locationFilter?.addEventListener("change", applyFilters);
  exportExcelBtn?.addEventListener("click", () => downloadExport("xlsx"));
  exportCsvBtn?.addEventListener("click", () => downloadExport("csv"));
  exportPdfBtn?.addEventListener("click", () => window.print());
  newEntryBtn?.addEventListener("click", () => openModal("create"));
  logoutLink?.addEventListener("click", (event) => {
    event.preventDefault();
    logout();
  });

  document.getElementById("sidebar")?.addEventListener("click", (event) => {
    const link = event.target.closest("[data-view]");
    if (!link) return;
    event.preventDefault();
    setView(link.dataset.view);
  });

  tableBody?.addEventListener("click", (event) => {
    const editBtn = event.target.closest(".table-action.edit");
    const deleteBtn = event.target.closest(".table-action.delete");
    if (editBtn) {
      handleEdit(editBtn.dataset.id);
    } else if (deleteBtn) {
      handleDelete(deleteBtn.dataset.id);
    } else if (event.target.closest("#emptyAddBtn")) {
      openModal("create");
    } else if (event.target.closest("#clearFiltersBtn")) {
      clearFilters();
    }
  });

  itemForm?.addEventListener("submit", handleItemFormSubmit);
  itemModalClose?.addEventListener("click", closeModal);
  itemModalCancel?.addEventListener("click", closeModal);
  itemModalOverlay?.addEventListener("click", (event) => {
    if (event.target === itemModalOverlay) closeModal();
  });
}

async function renderApp() {
  setUserAvatar();
  bindEvents();
  // Honour a deep link like index.html#reports, else land on the dashboard.
  setView(VIEWS[window.location.hash.slice(1)] ? window.location.hash.slice(1) : "dashboard");
  try {
    await loadData();
  } catch (error) {
    console.error("Failed to load inventory from the API.", error);
    inventoryData = { summary: { totalItems: 0, lowStock: 0, maintenanceCount: 0 }, inventory: [] };
    filteredInventory = [];
  }
  renderSummary(inventoryData.summary);
  renderFilters();
  applyFilters();
}

document.addEventListener("componentsLoaded", async () => {
  if (!requireAuthOrRedirect()) return;
  await renderApp();
});
