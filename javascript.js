const STORE_NAME = "QuickMart";
const DISCOUNT_LIMIT = 100;
const DISCOUNT_RATE = 0.1;
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const products = [
  { id: 1, name: "Milk (1 L)", price: 1.8, category: "Dairy", emoji: "🥛" },
  { id: 2, name: "Bread", price: 2.5, category: "Bakery", emoji: "🍞" },
  { id: 3, name: "Eggs (dozen)", price: 4.2, category: "Dairy", emoji: "🥚" },
  { id: 4, name: "Apples (1 kg)", price: 2.4, category: "Produce", emoji: "🍎" },
  { id: 5, name: "Rice (5 kg)", price: 12.99, category: "Pantry", emoji: "🍚" },
  { id: 6, name: "Honey", price: 18, category: "Pantry", emoji: "🍯" },
  { id: 7, name: "Cheese", price: 6.3, category: "Dairy", emoji: "🧀" },
  { id: 8, name: "Coffee", price: 0.65, category: "Beverages", emoji: "☕" },
  { id: 9, name: "Water", price: 1, category: "Beverages", emoji: "💧" },
  { id: 10, name: "Tomatoes (1 kg)", price: 2.9, category: "Produce", emoji: "🍅" },
  { id: 11, name: "Butter (400 g)", price: 2.04, category: "Dairy", emoji: "🧈" },
  { id: 12, name: "Croissant", price: 1.5, category: "Bakery", emoji: "🥐" },
  { id: 13, name: "Apple juice", price: 0.89, category: "Beverages", emoji: "🧃" },
  { id: 14, name: "Oranges (1 kg)", price: 1.8, category: "Produce", emoji: "🍊" },
];

let order = [];
let orderNumber = 1;
let activeCategory = "All";
let returnFocus = null;

const productList = document.querySelector("#product-list");
const orderList = document.querySelector("#order-list");
const itemCountEl = document.querySelector("#item-count");
const subtotalEl = document.querySelector("#subtotal");
const discountRow = document.querySelector("#discount-row");
const discountEl = document.querySelector("#discount");
const savingsNote = document.querySelector("#savings-note");
const finalTotalEl = document.querySelector("#final-total");
const amountPaidInput = document.querySelector("#amount-paid");
const changeText = document.querySelector("#change-text");
const searchEl = document.querySelector("#search");
const categorySelect = document.querySelector("#category-select");
const categoryTabs = document.querySelector("#category-tabs");
const categoryHeading = document.querySelector("#category-heading");
const productCount = document.querySelector("#product-count");
const orderTitle = document.querySelector("#order-title");
const receiptOverlay = document.querySelector("#receipt-overlay");
const receiptBox = document.querySelector("#receipt");

function formatMoney(amount) {
  return currency.format(amount);
}

function roundMoney(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function getCategories() {
  return ["All", ...new Set(products.map((product) => product.category))];
}

function renderCategories() {
  categoryTabs.replaceChildren();
  categorySelect.replaceChildren();

  getCategories().forEach((category) => {
    const label = category === "All" ? "Everything" : category;
    const tab = createElement("button", `category-tab${category === activeCategory ? " active" : ""}`, label);
    tab.type = "button";
    tab.setAttribute("aria-pressed", String(category === activeCategory));
    tab.addEventListener("click", () => setCategory(category));
    categoryTabs.appendChild(tab);

    const option = createElement("option", "", label);
    option.value = category;
    option.selected = category === activeCategory;
    categorySelect.appendChild(option);
  });
}

function setCategory(category) {
  activeCategory = category;
  categorySelect.value = category;
  renderCategories();
  renderProducts();
}

function renderProducts() {
  productList.replaceChildren();
  const term = searchEl.value.trim().toLocaleLowerCase();
  const visibleProducts = products.filter((product) => {
    const matchesText = `${product.name} ${product.category}`.toLocaleLowerCase().includes(term);
    const matchesCategory = activeCategory === "All" || product.category === activeCategory;
    return matchesText && matchesCategory;
  });

  const heading = activeCategory === "All" ? "All the good things" : `${activeCategory} favorites`;
  categoryHeading.textContent = heading;
  productCount.textContent = `${String(visibleProducts.length).padStart(2, "0")} ITEMS`;

  if (visibleProducts.length === 0) {
    const empty = createElement("div", "no-results");
    empty.appendChild(createElement("strong", "", "Nothing on this shelf."));
    empty.appendChild(createElement("span", "", "Try another search or category."));
    productList.appendChild(empty);
    return;
  }

  visibleProducts.forEach((product, index) => {
    const card = createElement("article", "product-card");
    card.style.animationDelay = `${Math.min(index, 8) * 35}ms`;
    const art = createElement("div", "product-art");

    if (product.image) {
      const image = document.createElement("img");
      image.src = product.image;
      image.alt = product.name;
      image.addEventListener("error", () => {
        art.replaceChildren(createElement("span", "product-emoji", product.emoji || "✦"));
      }, { once: true });
      art.appendChild(image);
    } else {
      art.appendChild(createElement("span", "product-emoji", product.emoji || "✦"));
    }

    card.appendChild(art);

    const info = createElement("div", "product-info");
    info.appendChild(createElement("h3", "product-name", product.name));
    info.appendChild(createElement("span", "product-price", formatMoney(product.price)));
    card.appendChild(info);

    const addButton = createElement("button", "add-btn", "Add");
    addButton.type = "button";
    addButton.setAttribute("aria-label", `Add ${product.name} to basket`);
    addButton.addEventListener("click", () => addToOrder(product.id));
    card.appendChild(addButton);
    productList.appendChild(card);
  });
}

function findOrderItem(productId) {
  return order.find((item) => item.id === productId);
}

function addToOrder(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  const existing = findOrderItem(productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    order.push({ id: product.id, name: product.name, price: product.price, quantity: 1 });
  }
  setMessage("");
  renderOrder();
}

function changeQuantity(productId, amount) {
  const item = findOrderItem(productId);
  if (!item) return;
  item.quantity += amount;
  if (item.quantity <= 0) {
    order = order.filter((orderItem) => orderItem.id !== productId);
  }
  renderOrder();
}

function removeFromOrder(productId) {
  order = order.filter((item) => item.id !== productId);
  renderOrder();
}

function calculateItemCount() {
  return order.reduce((total, item) => total + item.quantity, 0);
}

function calculateSubtotal() {
  return roundMoney(order.reduce((total, item) => total + item.price * item.quantity, 0));
}

function calculateDiscount(subtotal) {
  return subtotal > DISCOUNT_LIMIT ? roundMoney(subtotal * DISCOUNT_RATE) : 0;
}

function calculateFinalTotal() {
  const subtotal = calculateSubtotal();
  return roundMoney(subtotal - calculateDiscount(subtotal));
}

function setMessage(text, isError = false) {
  changeText.textContent = text;
  changeText.classList.toggle("bad", isError);
}

function renderOrder() {
  orderList.replaceChildren();
  const count = calculateItemCount();
  itemCountEl.textContent = `${count} ${count === 1 ? "item" : "items"}`;
  orderTitle.textContent = `Order #${String(orderNumber).padStart(3, "0")}`;

  if (order.length === 0) {
    const empty = createElement("div", "empty-basket");
    empty.appendChild(createElement("span", "", "🧺"));
    empty.appendChild(createElement("p", "", "Your basket is taking a little breather. Add something lovely."));
    orderList.appendChild(empty);
  } else {
    order.forEach((item) => {
      const row = createElement("article", "order-card");
      const main = createElement("div", "order-card-main");
      main.appendChild(createElement("span", "order-name", item.name));
      main.appendChild(createElement("span", "order-unit-price", `${formatMoney(item.price)} each`));
      row.appendChild(main);
      row.appendChild(createElement("span", "order-line-total", formatMoney(item.price * item.quantity)));

      const actions = createElement("div", "order-card-actions");
      const controls = createElement("div", "qty-controls");
      const minus = createElement("button", "qty-btn", "−");
      minus.type = "button";
      minus.setAttribute("aria-label", `Decrease ${item.name} quantity`);
      minus.addEventListener("click", () => changeQuantity(item.id, -1));
      controls.appendChild(minus);
      controls.appendChild(createElement("span", "qty-value", String(item.quantity)));
      const plus = createElement("button", "qty-btn", "+");
      plus.type = "button";
      plus.setAttribute("aria-label", `Increase ${item.name} quantity`);
      plus.addEventListener("click", () => changeQuantity(item.id, 1));
      controls.appendChild(plus);
      actions.appendChild(controls);

      const remove = createElement("button", "remove-btn", "Remove");
      remove.type = "button";
      remove.setAttribute("aria-label", `Remove ${item.name} from basket`);
      remove.addEventListener("click", () => removeFromOrder(item.id));
      actions.appendChild(remove);
      row.appendChild(actions);
      orderList.appendChild(row);
    });
  }

  renderTotals();
}

function renderTotals() {
  const subtotal = calculateSubtotal();
  const discount = calculateDiscount(subtotal);
  subtotalEl.textContent = formatMoney(subtotal);
  finalTotalEl.textContent = formatMoney(roundMoney(subtotal - discount));
  discountRow.hidden = discount === 0;
  discountEl.textContent = `−${formatMoney(discount)}`;
  savingsNote.hidden = discount === 0;
  savingsNote.textContent = discount > 0 ? `You saved ${formatMoney(discount)} on this basket. Nice.` : "";
  renderChange();
}

function renderChange() {
  const entered = amountPaidInput.value.trim();
  if (order.length === 0 || entered === "") {
    setMessage("");
    return;
  }
  const paid = Number(entered);
  if (!Number.isFinite(paid) || paid < 0) {
    setMessage("Enter a valid amount received.", true);
  } else if (paid >= calculateFinalTotal()) {
    setMessage(`Change due: ${formatMoney(roundMoney(paid - calculateFinalTotal()))}`);
  } else {
    setMessage(`${formatMoney(roundMoney(calculateFinalTotal() - paid))} still to go.`, true);
  }
}

function clearOrder() {
  order = [];
  amountPaidInput.value = "";
  setMessage("");
  renderOrder();
}

function requestNewOrder() {
  if (order.length > 0 && !window.confirm("Start a new order and clear this basket?")) return;
  orderNumber += 1;
  clearOrder();
  closeReceipt();
}

function completeSale() {
  if (order.length === 0) {
    setMessage("Add at least one product before completing the sale.", true);
    return;
  }
  const entered = amountPaidInput.value.trim();
  const paid = entered === "" ? calculateFinalTotal() : Number(entered);
  if (!Number.isFinite(paid) || paid < 0) {
    setMessage("Enter a valid amount received.", true);
    amountPaidInput.focus();
    return;
  }
  if (paid < calculateFinalTotal()) {
    renderChange();
    amountPaidInput.focus();
    return;
  }
  showReceipt(paid);
}

function showReceipt(paid) {
  returnFocus = document.activeElement;
  receiptBox.replaceChildren();

  const top = createElement("div", "receipt-top");
  const brand = createElement("div");
  brand.appendChild(createElement("div", "receipt-brand", STORE_NAME));
  brand.appendChild(createElement("p", "receipt-subtitle", "GOOD THINGS, CLOSE TO HOME"));
  top.appendChild(brand);
  const close = createElement("button", "receipt-close", "×");
  close.type = "button";
  close.setAttribute("aria-label", "Close receipt");
  close.addEventListener("click", closeReceipt);
  top.appendChild(close);
  receiptBox.appendChild(top);

  const meta = createElement("div", "receipt-meta");
  meta.appendChild(createElement("span", "", `ORDER #${String(orderNumber).padStart(3, "0")}`));
  meta.appendChild(createElement("span", "", new Date().toLocaleString()));
  receiptBox.appendChild(meta);

  const table = createElement("table", "receipt-table");
  const head = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["ITEM", "QTY", "TOTAL"].forEach((label) => headerRow.appendChild(createElement("th", "", label)));
  head.appendChild(headerRow);
  table.appendChild(head);

  const body = document.createElement("tbody");
  order.forEach((item) => {
    const row = document.createElement("tr");
    row.appendChild(createElement("td", "", item.name));
    row.appendChild(createElement("td", "", String(item.quantity)));
    row.appendChild(createElement("td", "", formatMoney(item.price * item.quantity)));
    body.appendChild(row);
  });
  table.appendChild(body);
  receiptBox.appendChild(table);

  const subtotal = calculateSubtotal();
  const discount = calculateDiscount(subtotal);
  const totals = createElement("div", "receipt-totals");
  appendReceiptTotal(totals, "Items", String(calculateItemCount()));
  appendReceiptTotal(totals, "Subtotal", formatMoney(subtotal));
  if (discount > 0) appendReceiptTotal(totals, "Thank-you · 10%", `−${formatMoney(discount)}`);
  appendReceiptTotal(totals, "Total paid", formatMoney(calculateFinalTotal()), "receipt-grand");
  appendReceiptTotal(totals, "Amount received", formatMoney(paid));
  appendReceiptTotal(totals, "Change", formatMoney(roundMoney(paid - calculateFinalTotal())));
  receiptBox.appendChild(totals);
  receiptBox.appendChild(createElement("p", "receipt-thanks", "Thanks for shopping local."));

  const actions = createElement("div", "receipt-actions");
  const print = createElement("button", "button receipt-print", "Print receipt");
  print.type = "button";
  print.addEventListener("click", () => window.print());
  actions.appendChild(print);
  const next = createElement("button", "button receipt-new", "Start new order");
  next.type = "button";
  next.addEventListener("click", requestNewOrder);
  actions.appendChild(next);
  receiptBox.appendChild(actions);

  receiptOverlay.hidden = false;
  document.body.style.overflow = "hidden";
  close.focus();
}

function appendReceiptTotal(container, label, value, className = "") {
  const row = createElement("p", className);
  row.appendChild(createElement("span", "", label));
  row.appendChild(createElement("strong", "", value));
  container.appendChild(row);
}

function closeReceipt() {
  if (receiptOverlay.hidden) return;
  receiptOverlay.hidden = true;
  document.body.style.overflow = "";
  if (returnFocus instanceof HTMLElement) returnFocus.focus();
}

document.querySelector("#clear-order").addEventListener("click", () => {
  if (order.length === 0) {
    amountPaidInput.value = "";
    setMessage("");
    renderTotals();
  } else if (window.confirm("Clear all items from this basket?")) {
    clearOrder();
  }
});
document.querySelector("#complete-sale").addEventListener("click", completeSale);
document.querySelector("#new-order").addEventListener("click", requestNewOrder);
searchEl.addEventListener("input", renderProducts);
categorySelect.addEventListener("change", () => setCategory(categorySelect.value));
amountPaidInput.addEventListener("input", renderChange);
receiptOverlay.addEventListener("click", (event) => {
  if (event.target === receiptOverlay) closeReceipt();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !receiptOverlay.hidden) closeReceipt();
  if (event.key === "/" && !receiptOverlay.hidden && document.activeElement !== searchEl) {
    event.preventDefault();
    searchEl.focus();
  }
});

renderCategories();
renderProducts();
renderOrder();
