/* =========================================================================
   VOLÉA — Commande / Checkout
   Récapitulatif → coordonnées → bon de commande PDF + email → paiement Stripe
   ========================================================================= */
(function () {
  const CFG = window.VOLEA_CONFIG;
  const { Cart, fmt, fmt2, toast } = window.VOLEA;

  const PENDING_KEY = "volea_pending_order";

  /* ---------- Order reference ---------- */
  function makeRef() {
    return "VLA-" + Date.now().toString(36).toUpperCase().slice(-5) +
      Math.floor(Math.random() * 900 + 100);
  }

  /* ---------- Render order recap ---------- */
  function renderRecap() {
    const items = Cart.items();
    const host = document.getElementById("recapItems");
    if (!host) return;
    if (!items.length) { location.href = "configurateur.html"; return; }

    host.innerHTML = items.map((it) => {
      const optStr = Object.keys(it.options).map((k) => it.options[k]).join(" · ");
      return `<div class="oitem">
        <div><b>${it.name}</b> ${it.qty > 1 ? "×" + it.qty : ""}
          <span class="muted">${it.w}×${it.h} mm · ${optStr}${it.pose ? " · avec pose" : ""}</span>
        </div>
        <div style="white-space:nowrap;font-weight:700">${fmt(it.unitPrice * it.qty)}</div>
      </div>`;
    }).join("");

    const sub = Cart.subtotal(), ship = Cart.shipping(), total = Cart.total();
    const ht = total / (1 + CFG.settings.tvaRate);
    const tva = total - ht;
    document.getElementById("recapTotals").innerHTML =
      `<div class="r"><span>Sous-total</span><span>${fmt(sub)}</span></div>
       <div class="r"><span>Livraison</span><span>${ship === 0 ? "Offerte" : fmt(ship)}</span></div>
       <div class="r"><span>dont TVA (20 %)</span><span>${fmt(tva)}</span></div>
       <div class="r grand"><span>Total TTC</span><b>${fmt(total)}</b></div>`;

    // payment button label depends on integration mode
    const stripeOn = !!CFG.integrations.stripeCheckoutEndpoint;
    const payBtn = document.getElementById("payBtn");
    payBtn.innerHTML = stripeOn
      ? `Payer ${fmt(total)} par carte`
      : `Valider ma commande · ${fmt(total)}`;

    const modeNote = document.getElementById("modeNote");
    if (!stripeOn && modeNote) {
      modeNote.style.display = "flex";
    }
  }

  /* ---------- PDF bon de commande ---------- */
  function buildPDF(order) {
    if (!window.jspdf) return null;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210;
    let y = 20;
    const ink = [21, 24, 30], soft = [110, 118, 130], brass = [176, 123, 79];

    // header
    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(...ink);
    doc.text(CFG.brand.name, 18, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...soft);
    doc.text(CFG.brand.tagline, 18, y + 5);
    doc.setFontSize(9);
    doc.text(CFG.brand.address, W - 18, y, { align: "right" });
    doc.text(CFG.brand.email + "  ·  " + CFG.brand.phone, W - 18, y + 5, { align: "right" });

    y += 16;
    doc.setDrawColor(...brass); doc.setLineWidth(0.6); doc.line(18, y, W - 18, y);

    y += 12;
    doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...ink);
    doc.text("BON DE COMMANDE", 18, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...soft);
    doc.text("Référence : " + order.ref, W - 18, y - 4, { align: "right" });
    doc.text("Date : " + order.date, W - 18, y + 1, { align: "right" });

    // client block
    y += 10;
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...ink);
    doc.text("Client", 18, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(60, 60, 60);
    const c = order.customer;
    const cl = [
      `${c.prenom} ${c.nom}`, c.email, c.telephone,
      c.adresse + (c.complement ? ", " + c.complement : ""),
      `${c.cp} ${c.ville}`,
    ];
    cl.forEach((line, i) => doc.text(String(line || ""), 18, y + 6 + i * 5));

    // table
    y += 6 + cl.length * 5 + 8;
    doc.setFillColor(...ink); doc.rect(18, y, W - 36, 8, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
    doc.text("DÉSIGNATION", 21, y + 5.4);
    doc.text("QTÉ", W - 70, y + 5.4, { align: "center" });
    doc.text("PU TTC", W - 48, y + 5.4, { align: "right" });
    doc.text("TOTAL TTC", W - 21, y + 5.4, { align: "right" });
    y += 8;

    doc.setTextColor(40, 40, 40);
    order.items.forEach((it) => {
      const optStr = Object.keys(it.options).map((k) => k + ": " + it.options[k]).join(", ") + (it.pose ? ", avec pose" : "");
      doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
      doc.text(it.name + "  —  " + it.w + "x" + it.h + " mm", 21, y + 6);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...soft);
      const wrapped = doc.splitTextToSize(optStr, 110);
      doc.text(wrapped, 21, y + 11);
      doc.setTextColor(40, 40, 40); doc.setFontSize(9.5);
      doc.text(String(it.qty), W - 70, y + 6, { align: "center" });
      doc.text(fmt(it.unitPrice), W - 48, y + 6, { align: "right" });
      doc.text(fmt(it.unitPrice * it.qty), W - 21, y + 6, { align: "right" });
      y += 11 + wrapped.length * 3.6 + 4;
      doc.setDrawColor(225, 221, 210); doc.setLineWidth(0.2); doc.line(18, y, W - 18, y);
      y += 3;
    });

    // totals
    y += 4;
    const tx = W - 70, vx = W - 21;
    const rows = [
      ["Sous-total", fmt(order.subtotal)],
      ["Livraison", order.shipping === 0 ? "Offerte" : fmt(order.shipping)],
      ["dont TVA (20%)", fmt(order.tva)],
    ];
    doc.setFontSize(9.5); doc.setTextColor(...soft); doc.setFont("helvetica", "normal");
    rows.forEach((r) => { doc.text(r[0], tx, y); doc.text(r[1], vx, y, { align: "right" }); y += 5.5; });
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...ink);
    doc.text("TOTAL TTC", tx, y + 1); doc.text(fmt(order.total), vx, y + 1, { align: "right" });

    // footer
    y += 14;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...soft);
    if (c.notes) { const n = doc.splitTextToSize("Remarques : " + c.notes, W - 36); doc.text(n, 18, y); y += n.length * 4 + 2; }
    doc.text("Délai de fabrication estimé : " + CFG.settings.leadTimeText + ".", 18, y);
    doc.text("Paiement : " + order.paymentLabel + ".", 18, y + 4.5);
    doc.text(CFG.brand.name + " · SIRET " + CFG.brand.siret + " · " + CFG.brand.email, 18, 285);

    return doc;
  }

  /* ---------- Email via Formspree ---------- */
  async function sendEmail(order) {
    const ep = CFG.integrations.formspreeEndpoint;
    if (!ep) return { skipped: true };
    const itemsText = order.items.map((it) =>
      `• ${it.name} ${it.w}x${it.h}mm ×${it.qty} — ${fmt(it.unitPrice * it.qty)}\n   ` +
      Object.keys(it.options).map((k) => k + ": " + it.options[k]).join(", ") + (it.pose ? ", avec pose" : "")
    ).join("\n");
    const c = order.customer;
    const payload = {
      _subject: `Nouvelle commande ${order.ref} — ${fmt(order.total)}`,
      Référence: order.ref,
      Date: order.date,
      Client: `${c.prenom} ${c.nom}`,
      Email: c.email,
      Téléphone: c.telephone,
      Adresse: `${c.adresse} ${c.complement || ""}, ${c.cp} ${c.ville}`,
      Remarques: c.notes || "—",
      Articles: "\n" + itemsText,
      "Total TTC": fmt(order.total),
      Paiement: order.paymentLabel,
    };
    try {
      const r = await fetch(ep, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      return { ok: r.ok };
    } catch (e) { return { ok: false, error: e.message }; }
  }

  /* ---------- Stripe ---------- */
  async function goToStripe(order) {
    const ep = CFG.integrations.stripeCheckoutEndpoint;
    const r = await fetch(ep, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderRef: order.ref,
        customerEmail: order.customer.email,
        successUrl: location.origin + location.pathname + "?paid=1",
        cancelUrl: location.href,
        items: order.items.map((it) => ({
          name: it.name + " " + it.w + "x" + it.h + "mm" + (it.pose ? " + pose" : ""),
          amount: Math.round(it.unitPrice * 100),
          qty: it.qty,
        })),
        shipping: Math.round(order.shipping * 100),
      }),
    });
    if (!r.ok) throw new Error("Stripe " + r.status);
    const data = await r.json();
    if (!data.url) throw new Error("URL Stripe manquante");
    location.href = data.url;
  }

  /* ---------- Submit ---------- */
  function collectForm() {
    const g = (id) => (document.getElementById(id).value || "").trim();
    return {
      prenom: g("f_prenom"), nom: g("f_nom"), email: g("f_email"), telephone: g("f_tel"),
      adresse: g("f_adresse"), complement: g("f_comp"), cp: g("f_cp"), ville: g("f_ville"), notes: g("f_notes"),
    };
  }
  function validateForm(c) {
    const req = { f_prenom: c.prenom, f_nom: c.nom, f_email: c.email, f_tel: c.telephone, f_adresse: c.adresse, f_cp: c.cp, f_ville: c.ville };
    let ok = true;
    Object.keys(req).forEach((id) => {
      const el = document.getElementById(id);
      const bad = !req[id];
      el.classList.toggle("bad", bad);
      if (bad) ok = false;
    });
    if (c.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) { document.getElementById("f_email").classList.add("bad"); ok = false; }
    return ok;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const c = collectForm();
    if (!validateForm(c)) { toast("Vérifiez les champs en rouge"); return; }

    const items = Cart.items();
    if (!items.length) return;
    const total = Cart.total();
    const order = {
      ref: makeRef(),
      date: new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }),
      customer: c, items,
      subtotal: Cart.subtotal(), shipping: Cart.shipping(), total,
      tva: total - total / (1 + CFG.settings.tvaRate),
      paymentLabel: CFG.integrations.stripeCheckoutEndpoint ? "Carte bancaire (Stripe)" : "À régler (devis confirmé)",
    };
    localStorage.setItem(PENDING_KEY, JSON.stringify({ ref: order.ref, email: c.email, total }));

    const btn = document.getElementById("payBtn");
    btn.disabled = true; btn.textContent = "Traitement…";

    // 1) PDF (téléchargé pour le client + conservé)
    const doc = buildPDF(order);
    if (doc) { try { doc.save("bon-de-commande-" + order.ref + ".pdf"); } catch (e2) {} }

    // 2) Email au marchand
    await sendEmail(order);

    // 3) Paiement
    if (CFG.integrations.stripeCheckoutEndpoint) {
      try { await goToStripe(order); return; }
      catch (err) {
        toast("Paiement indisponible — commande enregistrée");
        finish(order.ref);
      }
    } else {
      finish(order.ref);
    }
  }

  function finish(ref) {
    Cart.clear();
    localStorage.removeItem(PENDING_KEY);
    showSuccess(ref);
  }

  function showSuccess(ref) {
    const main = document.getElementById("checkoutMain");
    const stripeOn = !!CFG.integrations.stripeCheckoutEndpoint;
    main.innerHTML =
      `<div class="success">
        <div class="success__ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
        <h1>Merci pour votre commande !</h1>
        <p>${stripeOn ? "Votre paiement a bien été pris en compte." : "Votre commande a bien été enregistrée."}</p>
        <p>Un récapitulatif vous a été remis (PDF). Nous revenons vers vous très vite${stripeOn ? "" : " pour finaliser le règlement"}.</p>
        <div class="success__ref">Référence&nbsp;: <b>${ref}</b></div>
        <div><a class="btn btn--primary btn--lg" href="index.html">Retour à l'accueil</a></div>
      </div>`;
    document.querySelector(".checkout__grid")?.classList.remove("checkout__grid");
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(location.search);
    if (params.get("paid") === "1") {
      const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || "{}");
      finish(pending.ref || "—");
      return;
    }
    renderRecap();
    document.addEventListener("cart:change", renderRecap);
    const form = document.getElementById("checkoutForm");
    if (form) form.addEventListener("submit", handleSubmit);
  });
})();
