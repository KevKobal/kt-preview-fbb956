/* =========================================================================
   VOLÉA — Logique partagée : panier, helpers, header, drawer
   ========================================================================= */
(function () {
  const CFG = window.VOLEA_CONFIG;
  const CUR = CFG.settings.currency;

  /* ---------- Helpers ---------- */
  const fmt = (n) =>
    new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      .format(Math.round(n)) + " " + CUR;
  const fmt2 = (n) =>
    new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " " + CUR;

  /* ---------- Panier (localStorage) ---------- */
  const CART_KEY = "volea_cart_v1";
  const Cart = {
    items() {
      try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
      catch (e) { return []; }
    },
    save(items) {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
      Cart.syncBadge();
      document.dispatchEvent(new CustomEvent("cart:change"));
    },
    add(item) {
      const items = Cart.items();
      item.id = "L" + Date.now().toString(36) + Math.floor(Math.random() * 1000);
      items.push(item);
      Cart.save(items);
    },
    remove(id) {
      Cart.save(Cart.items().filter((i) => i.id !== id));
    },
    setQty(id, qty) {
      const items = Cart.items();
      const it = items.find((i) => i.id === id);
      if (it) { it.qty = Math.max(1, qty); it.lineTotal = it.unitPrice * it.qty; }
      Cart.save(items);
    },
    clear() { localStorage.removeItem(CART_KEY); Cart.syncBadge(); },
    count() { return Cart.items().reduce((s, i) => s + i.qty, 0); },
    subtotal() { return Cart.items().reduce((s, i) => s + i.unitPrice * i.qty, 0); },
    shipping() {
      const sub = Cart.subtotal();
      if (sub === 0) return 0;
      return sub >= CFG.settings.freeShippingFrom ? 0 : CFG.settings.shippingFlat;
    },
    total() { return Cart.subtotal() + Cart.shipping(); },
    syncBadge() {
      const c = Cart.count();
      document.querySelectorAll("[data-cart-badge]").forEach((el) => {
        el.textContent = c;
        el.style.display = c > 0 ? "grid" : "none";
      });
    },
  };

  /* ---------- Toast ---------- */
  let toastEl;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
      "<span>" + msg + "</span>";
    toastEl.classList.add("show");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove("show"), 2600);
  }

  /* ---------- Icône produit (mini, pour le panier) ---------- */
  function productIcon(type) {
    if (type === "volet") {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 8h18M3 11h18M3 14h18M3 17h18"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M12 3v18M3 12h18"/></svg>';
  }

  /* ---------- Cart drawer ---------- */
  function buildDrawer() {
    if (document.getElementById("cartDrawer")) return;
    const overlay = document.createElement("div");
    overlay.className = "drawer-overlay";
    overlay.id = "cartOverlay";
    const drawer = document.createElement("aside");
    drawer.className = "drawer";
    drawer.id = "cartDrawer";
    drawer.innerHTML =
      '<div class="drawer__head"><h3>Votre panier</h3>' +
      '<button class="drawer__close" id="cartClose" aria-label="Fermer">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>' +
      '<div class="drawer__items" id="cartItems"></div>' +
      '<div class="drawer__foot" id="cartFoot"></div>';
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    overlay.addEventListener("click", closeCart);
    document.getElementById("cartClose").addEventListener("click", closeCart);
    document.addEventListener("cart:change", renderDrawer);
    renderDrawer();
  }

  function renderDrawer() {
    const wrap = document.getElementById("cartItems");
    const foot = document.getElementById("cartFoot");
    if (!wrap) return;
    const items = Cart.items();
    if (!items.length) {
      wrap.innerHTML =
        '<div class="cart-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg>' +
        "<p>Votre panier est vide.</p></div>";
      foot.innerHTML = '<a class="btn btn--ghost btn--block" href="configurateur.html">Configurer un produit</a>';
      return;
    }
    wrap.innerHTML = items.map((it) =>
      '<div class="citem">' +
        '<div class="citem__thumb">' + productIcon(it.type) + "</div>" +
        '<div class="citem__info"><b>' + it.name + "</b>" +
          "<p>" + it.summary + "</p>" +
          '<div class="citem__bottom">' +
            '<span class="citem__price">' + fmt(it.unitPrice * it.qty) + (it.qty > 1 ? ' <small style="color:var(--ink-soft);font-weight:500">(×' + it.qty + ")</small>" : "") + "</span>" +
            '<button class="citem__rm" data-rm="' + it.id + '">Retirer</button>' +
          "</div>" +
        "</div>" +
      "</div>"
    ).join("");
    wrap.querySelectorAll("[data-rm]").forEach((b) =>
      b.addEventListener("click", () => { Cart.remove(b.dataset.rm); toast("Article retiré"); })
    );
    const ship = Cart.shipping();
    foot.innerHTML =
      '<div class="drawer__total"><span>Sous-total TTC' +
        (ship === 0 ? ' · <span style="color:var(--ok);font-weight:600">livraison offerte</span>' : "") +
      '</span><b>' + fmt(Cart.subtotal()) + "</b></div>" +
      '<a class="btn btn--brass btn--block btn--lg" href="commande.html">Passer la commande</a>' +
      '<a class="btn btn--ghost btn--block" style="margin-top:10px" href="configurateur.html">Ajouter un produit</a>';
  }

  function openCart() { buildDrawer(); document.getElementById("cartOverlay").classList.add("open"); document.getElementById("cartDrawer").classList.add("open"); document.body.style.overflow = "hidden"; }
  function closeCart() { const o = document.getElementById("cartOverlay"), d = document.getElementById("cartDrawer"); if (o) o.classList.remove("open"); if (d) d.classList.remove("open"); document.body.style.overflow = ""; }

  /* ---------- Header / nav ---------- */
  function initHeader() {
    document.querySelectorAll("[data-cart-open]").forEach((el) =>
      el.addEventListener("click", (e) => { e.preventDefault(); openCart(); })
    );
    const burger = document.querySelector(".burger");
    const nav = document.querySelector(".nav");
    if (burger && nav) burger.addEventListener("click", () => nav.classList.toggle("open"));
    Cart.syncBadge();
    buildDrawer();
  }

  /* ---------- Brand name with accent on last letter ---------- */
  function renderBrandNames() {
    const nm = CFG.brand.name;
    const html = nm.length > 1 ? nm.slice(0, -1) + "<b>" + nm.slice(-1) + "</b>" : nm;
    document.querySelectorAll("[data-brand-name]").forEach((el) => (el.innerHTML = html));
    document.querySelectorAll("[data-brand-plain]").forEach((el) => (el.textContent = nm));
    document.querySelectorAll("[data-brand-tagline]").forEach((el) => (el.textContent = CFG.brand.tagline));
    document.querySelectorAll("[data-brand-email]").forEach((el) => { el.textContent = CFG.brand.email; if (el.tagName === "A") el.href = "mailto:" + CFG.brand.email; });
    document.querySelectorAll("[data-brand-phone]").forEach((el) => { el.textContent = CFG.brand.phone; if (el.tagName === "A") el.href = "tel:" + CFG.brand.phoneHref; });
    document.querySelectorAll("[data-brand-address]").forEach((el) => (el.textContent = CFG.brand.address));
    document.querySelectorAll("[data-lead-time]").forEach((el) => (el.textContent = CFG.settings.leadTimeText));
    const y = document.querySelector("[data-year]");
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ---------- Expose ---------- */
  window.VOLEA = { Cart, fmt, fmt2, toast, openCart, closeCart, productIcon };

  document.addEventListener("DOMContentLoaded", () => {
    renderBrandNames();
    initHeader();
  });
})();
