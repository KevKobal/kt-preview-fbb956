/* =========================================================================
   VOLÉA — Configurateur : moteur de prix + aperçu SVG dynamique
   ========================================================================= */
(function () {
  const CFG = window.VOLEA_CONFIG;
  const { Cart, fmt, toast } = window.VOLEA;

  /* ---------- State ---------- */
  const state = { type: "fenetre", w: 1000, h: 1200, sel: {}, pose: false, qty: 1 };

  function defaultsFor(type) {
    const p = CFG.pricing[type];
    const sel = {};
    Object.keys(p.options).forEach((k) => {
      const def = p.options[k].choices.find((c) => c.default) || p.options[k].choices[0];
      sel[k] = def.id;
    });
    return sel;
  }
  function startDims(type) {
    const L = CFG.pricing[type].limits;
    return { w: Math.round((L.wMin + L.wMax) / 4), h: Math.round((L.hMin + L.hMax) / 4) };
  }

  /* ---------- Pricing engine ---------- */
  function priceParts() {
    const p = CFG.pricing[state.type];
    const m2 = Math.max(p.minM2, (state.w * state.h) / 1e6);
    const baseProduct = p.base + p.pricePerM2 * m2;

    let rateSum = 0, addSum = 0;
    const lines = [];
    Object.keys(p.options).forEach((k) => {
      const grp = p.options[k];
      const ch = grp.choices.find((c) => c.id === state.sel[k]);
      if (!ch) return;
      if (ch.type === "rate" && ch.delta) { rateSum += ch.delta; lines.push({ label: grp.label + " · " + ch.label, val: ch.delta * baseProduct, pct: ch.delta }); }
      else if (ch.type === "add" && ch.delta) { addSum += ch.delta; lines.push({ label: grp.label + " · " + ch.label, val: ch.delta }); }
    });

    let productPrice = baseProduct * (1 + rateSum) + addSum;
    let poseVal = 0;
    if (state.pose) { poseVal = productPrice * CFG.pose.delta; }
    const unit = productPrice + poseVal;

    return { m2, baseProduct, lines, productPrice, poseVal, unit, total: unit * state.qty };
  }

  /* ---------- Validation ---------- */
  function dimError(type, w, h) {
    const L = CFG.pricing[type].limits;
    const errs = {};
    if (!w || w < L.wMin || w > L.wMax) errs.w = `Entre ${L.wMin} et ${L.wMax} mm`;
    if (!h || h < L.hMin || h > L.hMax) errs.h = `Entre ${L.hMin} et ${L.hMax} mm`;
    return errs;
  }

  /* ---------- SVG preview (re-dimensionné en direct) ---------- */
  function colorHex() {
    const grp = CFG.pricing[state.type].options.couleur;
    const ch = grp ? grp.choices.find((c) => c.id === state.sel.couleur) : null;
    return ch ? ch.hex : "#F4F4F1";
  }

  function renderPreview() {
    const w = Math.max(1, state.w), h = Math.max(1, state.h);
    const ratio = w / h;
    const availW = 270, availH = 190;
    let dw, dh;
    if (availW / availH > ratio) { dh = availH; dw = dh * ratio; } else { dw = availW; dh = dw / ratio; }
    const cx = 200, cy = 158;
    const x = cx - dw / 2, y = cy - dh / 2;
    const frame = colorHex();
    const dark = isDark(frame);
    const stroke = dark ? "rgba(255,255,255,.25)" : "rgba(0,0,0,.18)";
    let inner = "";

    if (state.type === "fenetre") {
      const fb = Math.max(7, dw * 0.05); // frame border
      inner += glass(x + fb, y + fb, dw - 2 * fb, dh - 2 * fb);
      // mullion for 2 vantaux
      if (state.sel.vantaux === "2v") {
        inner += `<rect x="${cx - fb / 2}" y="${y + fb}" width="${fb}" height="${dh - 2 * fb}" fill="${frame}" stroke="${stroke}" stroke-width="0.6"/>`;
        inner += handle(cx - fb / 2 - 5, cy, dark);
        inner += handle(cx + fb / 2 + 5, cy, dark);
      } else if (state.sel.vantaux !== "fixe") {
        inner += handle(x + fb + 6, cy, dark);
      }
      // oscillo indicator
      if (state.sel.ouverture === "oscillo") {
        inner += `<path d="M${x + fb} ${y + dh - fb} L${cx} ${y + fb + 14} L${x + dw - fb} ${y + dh - fb}" fill="none" stroke="${dark ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.28)'}" stroke-width="1" stroke-dasharray="4 3"/>`;
      }
      inner = `<rect x="${x}" y="${y}" width="${dw}" height="${dh}" rx="3" fill="${frame}" stroke="${stroke}" stroke-width="1"/>` + inner;
    } else {
      // VOLET ROULANT : coffre + tablier à lames
      const coffreH = Math.max(10, dh * 0.12);
      const yb = y + coffreH;
      const bodyH = dh - coffreH;
      // tablier
      inner += `<rect x="${x}" y="${yb}" width="${dw}" height="${bodyH}" rx="2" fill="${shade(frame, dark ? 1.08 : 0.96)}" stroke="${stroke}" stroke-width="1"/>`;
      const slats = Math.max(6, Math.round(bodyH / 9));
      const sh = bodyH / slats;
      for (let i = 1; i < slats; i++) {
        inner += `<line x1="${x}" y1="${yb + i * sh}" x2="${x + dw}" y2="${yb + i * sh}" stroke="${dark ? 'rgba(255,255,255,.16)' : 'rgba(0,0,0,.13)'}" stroke-width="1"/>`;
      }
      // guides
      inner += `<rect x="${x}" y="${yb}" width="3" height="${bodyH}" fill="${shade(frame, dark ? 1.2 : 0.86)}"/>`;
      inner += `<rect x="${x + dw - 3}" y="${yb}" width="3" height="${bodyH}" fill="${shade(frame, dark ? 1.2 : 0.86)}"/>`;
      // coffre
      inner += `<rect x="${x - 2}" y="${y}" width="${dw + 4}" height="${coffreH}" rx="3" fill="${frame}" stroke="${stroke}" stroke-width="1"/>`;
      inner += `<line x1="${x - 2}" y1="${y + coffreH}" x2="${x + dw + 2}" y2="${y + coffreH}" stroke="${stroke}" stroke-width="1"/>`;
      // manoeuvre indicator
      if (state.sel.manoeuvre === "manuel") {
        inner += `<path d="M${x + dw + 7} ${yb} q8 ${bodyH / 2} 0 ${bodyH}" fill="none" stroke="${'#9aa3a0'}" stroke-width="1.4"/>`;
      } else if (state.sel.manoeuvre === "solaire") {
        inner += `<rect x="${x - 20}" y="${y}" width="13" height="${coffreH}" rx="2" fill="#1d2733" stroke="#2c3a4a"/><line x1="${x - 17}" y1="${y + 2}" x2="${x - 17}" y2="${y + coffreH - 2}" stroke="#3a5a7a" stroke-width="0.8"/><line x1="${x - 13}" y1="${y + 2}" x2="${x - 13}" y2="${y + coffreH - 2}" stroke="#3a5a7a" stroke-width="0.8"/>`;
      } else {
        // electric switch
        inner += `<rect x="${x + dw + 8}" y="${cy - 9}" width="13" height="18" rx="3" fill="#2b313b"/><circle cx="${x + dw + 14.5}" cy="${cy - 3}" r="1.6" fill="#7ddca0"/><circle cx="${x + dw + 14.5}" cy="${cy + 4}" r="1.6" fill="#6a7280"/>`;
      }
    }

    // dimension guides
    const gOff = 16;
    const dimColor = "#7a8488";
    inner += `<line x1="${x}" y1="${y + dh + gOff}" x2="${x + dw}" y2="${y + dh + gOff}" stroke="${dimColor}" stroke-width="1"/>
      <line x1="${x}" y1="${y + dh + gOff - 4}" x2="${x}" y2="${y + dh + gOff + 4}" stroke="${dimColor}" stroke-width="1"/>
      <line x1="${x + dw}" y1="${y + dh + gOff - 4}" x2="${x + dw}" y2="${y + dh + gOff + 4}" stroke="${dimColor}" stroke-width="1"/>`;
    inner += `<line x1="${x - gOff}" y1="${y}" x2="${x - gOff}" y2="${y + dh}" stroke="${dimColor}" stroke-width="1"/>
      <line x1="${x - gOff - 4}" y1="${y}" x2="${x - gOff + 4}" y2="${y}" stroke="${dimColor}" stroke-width="1"/>
      <line x1="${x - gOff - 4}" y1="${y + dh}" x2="${x - gOff + 4}" y2="${y + dh}" stroke="${dimColor}" stroke-width="1"/>`;

    const stage = document.getElementById("previewStage");
    stage.innerHTML =
      `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="gl" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#eaf2f3"/><stop offset="0.5" stop-color="#cfe0e2"/><stop offset="1" stop-color="#b8ccce"/>
          </linearGradient>
          <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="rgba(255,255,255,.7)"/><stop offset="0.4" stop-color="rgba(255,255,255,0)"/>
          </linearGradient>
        </defs>
        ${inner}
      </svg>` +
      `<span class="preview__dimlabel" style="left:50%;bottom:8px;transform:translateX(-50%)">L ${state.w} mm</span>` +
      `<span class="preview__dimlabel" style="left:8px;top:50%;transform:translateY(-50%) rotate(-90deg);transform-origin:left center">H ${state.h} mm</span>`;
  }

  function glass(gx, gy, gw, gh) {
    if (gw <= 0 || gh <= 0) return "";
    return `<rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" fill="url(#gl)"/>
      <rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" fill="url(#shine)"/>
      <path d="M${gx} ${gy + gh * 0.7} L${gx + gw * 0.45} ${gy} L${gx + gw * 0.7} ${gy} L${gx} ${gy + gh}Z" fill="rgba(255,255,255,.25)"/>`;
  }
  function handle(hx, hy, dark) {
    const c = dark ? "#d8d8d8" : "#6b6f76";
    return `<rect x="${hx - 1.5}" y="${hy - 9}" width="3" height="18" rx="1.5" fill="${c}"/>`;
  }
  function isDark(hex) {
    const c = hex.replace("#", "");
    const r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) < 140;
  }
  function shade(hex, f) {
    const c = hex.replace("#", "");
    let r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
    r = Math.min(255, Math.round(r * f)); g = Math.min(255, Math.round(g * f)); b = Math.min(255, Math.round(b * f));
    return `rgb(${r},${g},${b})`;
  }

  /* ---------- Render options panel ---------- */
  function renderOptions() {
    const p = CFG.pricing[state.type];
    const host = document.getElementById("optionsHost");
    let html = "";
    Object.keys(p.options).forEach((k) => {
      const grp = p.options[k];
      html += `<div class="optgroup"><label>${grp.label}</label><div class="opts">`;
      grp.choices.forEach((c) => {
        const on = state.sel[k] === c.id ? " on" : "";
        const sw = grp.type === "color" ? `<span class="swatch" style="background:${c.hex}"></span>` : "";
        const delta = priceTag(c);
        html += `<button type="button" class="opt${on}" data-grp="${k}" data-id="${c.id}">${sw}${c.label}${delta}</button>`;
      });
      html += `</div></div>`;
    });
    host.innerHTML = html;
    host.querySelectorAll(".opt").forEach((b) =>
      b.addEventListener("click", () => { state.sel[b.dataset.grp] = b.dataset.id; renderOptions(); renderPreview(); renderSummary(); })
    );
  }
  function priceTag(c) {
    if (!c.delta) return "";
    if (c.type === "add") return ` <span class="plus">+${c.delta} €</span>`;
    const pct = Math.round(c.delta * 100);
    return ` <span class="plus">${pct > 0 ? "+" : ""}${pct}%</span>`;
  }

  /* ---------- Render summary ---------- */
  function buildSummaryText() {
    const p = CFG.pricing[state.type];
    const parts = [`${state.w}×${state.h} mm`];
    Object.keys(p.options).forEach((k) => {
      const ch = p.options[k].choices.find((c) => c.id === state.sel[k]);
      if (ch) parts.push(ch.label);
    });
    if (state.pose) parts.push("avec pose");
    return parts.join(" · ");
  }

  function renderSummary() {
    const errs = dimError(state.type, state.w, state.h);
    const valid = !errs.w && !errs.h;
    const pp = priceParts();
    document.getElementById("sumName").textContent = CFG.pricing[state.type].label;
    document.getElementById("sumSpec").textContent = buildSummaryText();
    document.getElementById("sumPrice").innerHTML = valid ? `${fmt(pp.unit)} <small>TTC / unité</small>` : `— <small>renseignez les mesures</small>`;

    // breakdown
    const bk = document.getElementById("breakdown");
    let rows = `<div class="r"><span>Base (${pp.m2.toFixed(2)} m²)</span><span>${fmt(pp.baseProduct)}</span></div>`;
    pp.lines.forEach((l) => {
      rows += `<div class="r"><span>${l.label}</span><span>+${fmt(l.val)}</span></div>`;
    });
    if (state.pose) rows += `<div class="r"><span>${CFG.pose.label}</span><span>+${fmt(pp.poseVal)}</span></div>`;
    bk.innerHTML = valid ? rows : "";

    const btn = document.getElementById("addBtn");
    btn.disabled = !valid;
    btn.innerHTML = valid
      ? `Ajouter au panier · ${fmt(pp.total)}`
      : "Renseignez des mesures valides";
  }

  /* ---------- Dimension inputs ---------- */
  function bindDims() {
    ["w", "h"].forEach((dim) => {
      const inp = document.getElementById("dim_" + dim);
      inp.value = state[dim];
      inp.addEventListener("input", () => {
        state[dim] = parseInt(inp.value, 10) || 0;
        const errs = dimError(state.type, state.w, state.h);
        const hintEl = document.getElementById("hint_" + dim);
        if (errs[dim]) { inp.classList.add("bad"); hintEl.textContent = errs[dim]; hintEl.classList.add("err"); }
        else { inp.classList.remove("bad"); const L = CFG.pricing[state.type].limits; hintEl.textContent = `de ${L[dim + "Min"]} à ${L[dim + "Max"]} mm`; hintEl.classList.remove("err"); }
        renderPreview(); renderSummary();
      });
    });
    refreshDimHints();
  }
  function refreshDimHints() {
    const L = CFG.pricing[state.type].limits;
    ["w", "h"].forEach((dim) => {
      const el = document.getElementById("hint_" + dim);
      if (el) { el.textContent = `de ${L[dim + "Min"]} à ${L[dim + "Max"]} mm`; el.classList.remove("err"); }
      const inp = document.getElementById("dim_" + dim);
      if (inp) { inp.value = state[dim]; inp.classList.remove("bad"); }
    });
  }

  /* ---------- Qty + pose ---------- */
  function bindQty() {
    const inp = document.getElementById("qtyInput");
    const setQ = (v) => { state.qty = Math.max(1, Math.min(99, v)); inp.value = state.qty; renderSummary(); };
    document.getElementById("qtyMinus").addEventListener("click", () => setQ(state.qty - 1));
    document.getElementById("qtyPlus").addEventListener("click", () => setQ(state.qty + 1));
    inp.addEventListener("input", () => setQ(parseInt(inp.value, 10) || 1));
  }
  function bindPose() {
    const cb = document.getElementById("poseToggle");
    cb.addEventListener("change", () => { state.pose = cb.checked; renderPreview(); renderSummary(); });
  }

  /* ---------- Product switch ---------- */
  function switchProduct(type) {
    state.type = type;
    state.sel = defaultsFor(type);
    const d = startDims(type);
    state.w = d.w; state.h = d.h; state.qty = 1; state.pose = false;
    document.querySelectorAll("[data-prod]").forEach((b) => b.classList.toggle("on", b.dataset.prod === type));
    document.getElementById("qtyInput").value = 1;
    document.getElementById("poseToggle").checked = false;
    refreshDimHints();
    renderOptions(); renderPreview(); renderSummary();
  }

  /* ---------- Add to cart ---------- */
  function bindAdd() {
    document.getElementById("addBtn").addEventListener("click", () => {
      const errs = dimError(state.type, state.w, state.h);
      if (errs.w || errs.h) return;
      const pp = priceParts();
      const p = CFG.pricing[state.type];
      const options = {};
      Object.keys(p.options).forEach((k) => {
        const ch = p.options[k].choices.find((c) => c.id === state.sel[k]);
        options[p.options[k].label] = ch ? ch.label : "";
      });
      Cart.add({
        type: state.type,
        name: p.label,
        w: state.w, h: state.h,
        options, pose: state.pose,
        summary: buildSummaryText(),
        unitPrice: Math.round(pp.unit),
        qty: state.qty,
        lineTotal: Math.round(pp.unit) * state.qty,
      });
      toast("Ajouté au panier ✓");
      window.VOLEA.openCart();
    });
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    // preselect from URL ?p=volet
    const params = new URLSearchParams(location.search);
    const initial = params.get("p") === "volet" ? "volet" : "fenetre";
    state.sel = defaultsFor(initial);
    state.type = initial;
    const d = startDims(initial); state.w = d.w; state.h = d.h;

    document.querySelectorAll("[data-prod]").forEach((b) =>
      b.addEventListener("click", () => switchProduct(b.dataset.prod))
    );
    document.querySelectorAll("[data-prod]").forEach((b) => b.classList.toggle("on", b.dataset.prod === initial));

    bindDims(); bindQty(); bindPose(); bindAdd();
    renderOptions(); renderPreview(); renderSummary();
  });
})();
