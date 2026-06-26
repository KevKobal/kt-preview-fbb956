/* =========================================================================
   Fonction serverless STRIPE CHECKOUT pour Voléa (site statique)
   -------------------------------------------------------------------------
   Crée une session de paiement Stripe à partir des articles du panier et
   renvoie l'URL de paiement. Compatible Netlify Functions.
   (Pour Vercel/Cloudflare, voir les notes en bas.)

   MISE EN PLACE
   1. Crée un compte sur https://stripe.com (gratuit).
   2. Récupère ta clé secrète (Developers → API keys → "Secret key", sk_live_… ou sk_test_…).
   3. Déploie ce dossier sur Netlify et ajoute la variable d'environnement
      STRIPE_SECRET_KEY = ta clé secrète.
   4. Copie l'URL de la fonction (ex: https://ton-site.netlify.app/.netlify/functions/stripe-checkout)
      et colle-la dans assets/js/config.js → integrations.stripeCheckoutEndpoint.

   ⚠️  Ne mets JAMAIS ta clé secrète dans le code du site (assets/js).
       Elle ne doit vivre que côté serveur (variable d'environnement).
   ========================================================================= */

const Stripe = require("stripe");

exports.handler = async (event) => {
  // CORS (le site statique appelle cette fonction depuis un autre domaine)
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: "Method Not Allowed" };

  try {
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const body = JSON.parse(event.body || "{}");

    const line_items = (body.items || []).map((it) => ({
      quantity: it.qty,
      price_data: {
        currency: "eur",
        unit_amount: it.amount, // en centimes
        product_data: { name: it.name },
      },
    }));

    if (body.shipping && body.shipping > 0) {
      line_items.push({
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: body.shipping,
          product_data: { name: "Livraison" },
        },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      customer_email: body.customerEmail,
      client_reference_id: body.orderRef,
      metadata: { orderRef: body.orderRef || "" },
      success_url: body.successUrl,
      cancel_url: body.cancelUrl,
    });

    return { statusCode: 200, headers, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

/* -------------------------------------------------------------------------
   VARIANTE VERCEL (api/stripe-checkout.js) :
   --------------------------------------------------------------------------
   import Stripe from "stripe";
   export default async function handler(req, res) {
     res.setHeader("Access-Control-Allow-Origin", "*");
     if (req.method === "OPTIONS") return res.status(204).end();
     const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
     const { items, shipping, customerEmail, orderRef, successUrl, cancelUrl } = req.body;
     const line_items = items.map(it => ({ quantity: it.qty, price_data:{ currency:"eur", unit_amount: it.amount, product_data:{ name: it.name } } }));
     if (shipping > 0) line_items.push({ quantity:1, price_data:{ currency:"eur", unit_amount: shipping, product_data:{ name:"Livraison" } } });
     const session = await stripe.checkout.sessions.create({ mode:"payment", payment_method_types:["card"], line_items, customer_email: customerEmail, client_reference_id: orderRef, success_url: successUrl, cancel_url: cancelUrl });
     res.status(200).json({ url: session.url });
   }
   ------------------------------------------------------------------------- */
