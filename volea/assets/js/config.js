/* =========================================================================
   VOLÉA — CONFIGURATION
   -------------------------------------------------------------------------
   👉  TOUT CE QUI EST MODIFIABLE SE TROUVE DANS CE SEUL FICHIER.
       Marque, coordonnées, TARIFS, options, et branchements
       (Stripe pour le paiement CB + email pour recevoir le bon de commande).
   ========================================================================= */

window.VOLEA_CONFIG = {

  /* ---------------------------------------------------------------------
     1) MARQUE & COORDONNÉES
     --------------------------------------------------------------------- */
  brand: {
    name: "Voléa",                       // Nom affiché (le « a » est mis en valeur)
    tagline: "Fenêtres & volets sur-mesure",
    email: "contact@volea.fr",           // Affiché aux clients
    phone: "01 23 45 67 89",
    phoneHref: "+33123456789",
    address: "12 rue des Artisans, 69000 Lyon",
    siret: "000 000 000 00000",          // Mentions légales
  },

  /* ---------------------------------------------------------------------
     2) PARAMÈTRES GÉNÉRAUX
     --------------------------------------------------------------------- */
  settings: {
    currency: "€",
    tvaRate: 0.20,                        // 20 % (les prix affichés sont TTC)
    freeShippingFrom: 1500,              // Livraison offerte au-dessus de ce montant TTC
    shippingFlat: 79,                    // Frais de livraison forfaitaires sinon
    leadTimeText: "3 à 4 semaines",      // Délai de fabrication annoncé
  },

  /* ---------------------------------------------------------------------
     3) BRANCHEMENTS  (voir README.md pour les 5 min de mise en place)
     --------------------------------------------------------------------- */
  integrations: {

    // --- Réception du bon de commande par EMAIL ---
    // Crée un formulaire gratuit sur https://formspree.io et colle l'URL ici.
    // Tant que c'est vide, la commande est affichée et un PDF est généré,
    // mais aucun email n'est envoyé.
    formspreeEndpoint: "",               // ex: "https://formspree.io/f/abcdefgh"

    // --- Paiement par CARTE BANCAIRE via STRIPE ---
    // Le site est statique : Stripe a besoin d'un petit point d'accès serveur
    // (fonction serverless) pour créer la session de paiement de façon sécurisée.
    // Déploie la fonction fournie dans README.md (Netlify/Vercel/Cloudflare,
    // gratuit) puis colle son URL ici.
    // Tant que c'est vide, le bon de commande est enregistré/envoyé et le
    // client est invité à régler (mode "devis"), sans débit en ligne.
    stripeCheckoutEndpoint: "",          // ex: "https://xxxx.netlify.app/.netlify/functions/checkout"
  },

  /* ---------------------------------------------------------------------
     4) TARIFS  —  ⚠️ MODIFIE LIBREMENT CES VALEURS (€ TTC)
     ---------------------------------------------------------------------
     Le prix d'un produit =  (prix de base) + (prix au m² × surface)
                             puis multiplié/augmenté par les options choisies.
     Surface = Largeur(mm) × Hauteur(mm) / 1 000 000, avec un minimum facturé.
     Chaque option a un "delta" :
        type "add"   -> ajoute un montant fixe en €
        type "rate"  -> ajoute un pourcentage du sous-total (0.18 = +18 %)
     --------------------------------------------------------------------- */
  pricing: {

    /* ============== FENÊTRE ============== */
    fenetre: {
      label: "Fenêtre sur-mesure",
      base: 120,            // forfait de base (€)
      pricePerM2: 380,      // prix au m² (€)
      minM2: 0.5,           // surface minimale facturée
      // Bornes de saisie (mm)
      limits: { wMin: 400, wMax: 2400, hMin: 400, hMax: 2400 },
      options: {
        materiau: {
          label: "Matériau",
          choices: [
            { id: "pvc",  label: "PVC",            type: "rate", delta: 0,    default: true },
            { id: "alu",  label: "Aluminium",      type: "rate", delta: 0.35 },
            { id: "bois", label: "Bois",           type: "rate", delta: 0.55 },
          ],
        },
        vantaux: {
          label: "Configuration",
          choices: [
            { id: "1v", label: "1 vantail",  type: "rate", delta: 0,    default: true },
            { id: "2v", label: "2 vantaux",  type: "rate", delta: 0.16 },
            { id: "fixe", label: "Châssis fixe", type: "rate", delta: -0.18 },
          ],
        },
        ouverture: {
          label: "Ouverture",
          choices: [
            { id: "battant", label: "À la française", type: "add", delta: 0, default: true },
            { id: "oscillo", label: "Oscillo-battant", type: "add", delta: 60 },
          ],
        },
        vitrage: {
          label: "Vitrage",
          choices: [
            { id: "double",   label: "Double vitrage", type: "rate", delta: 0, default: true },
            { id: "phonique", label: "Acoustique renforcé", type: "rate", delta: 0.12 },
            { id: "triple",   label: "Triple vitrage", type: "rate", delta: 0.22 },
          ],
        },
        couleur: {
          label: "Coloris",
          type: "color",
          choices: [
            { id: "blanc",  label: "Blanc",          hex: "#F4F4F1", type: "rate", delta: 0, default: true },
            { id: "gris",   label: "Gris anthracite", hex: "#3C3F44", type: "rate", delta: 0.10 },
            { id: "beige",  label: "Beige sable",     hex: "#D9C9A8", type: "rate", delta: 0.10 },
            { id: "chene",  label: "Chêne doré",      hex: "#B07B4F", type: "rate", delta: 0.14 },
          ],
        },
      },
    },

    /* ============== VOLET ROULANT ============== */
    volet: {
      label: "Volet roulant sur-mesure",
      base: 90,
      pricePerM2: 230,
      minM2: 0.5,
      limits: { wMin: 500, wMax: 3000, hMin: 500, hMax: 2800 },
      options: {
        manoeuvre: {
          label: "Manœuvre",
          choices: [
            { id: "manuel",  label: "Manuel (sangle/treuil)", type: "add", delta: 0, default: true },
            { id: "filaire", label: "Électrique filaire",     type: "add", delta: 110 },
            { id: "radio",   label: "Électrique radio",       type: "add", delta: 165 },
            { id: "solaire", label: "Solaire (sans fil)",     type: "add", delta: 290 },
          ],
        },
        coffre: {
          label: "Type de pose",
          choices: [
            { id: "renovation", label: "Rénovation (coffre apparent)", type: "rate", delta: 0, default: true },
            { id: "tunnel",     label: "Sous linteau (tunnel)",        type: "rate", delta: 0.06 },
            { id: "bloc",       label: "Bloc-baie (neuf)",             type: "rate", delta: 0.12 },
          ],
        },
        lame: {
          label: "Lame",
          choices: [
            { id: "alu",   label: "Aluminium isolé", type: "rate", delta: 0, default: true },
            { id: "pvc",   label: "PVC",             type: "rate", delta: -0.08 },
          ],
        },
        couleur: {
          label: "Coloris",
          type: "color",
          choices: [
            { id: "blanc",  label: "Blanc",           hex: "#F4F4F1", type: "rate", delta: 0, default: true },
            { id: "gris",   label: "Gris anthracite", hex: "#3C3F44", type: "rate", delta: 0.10 },
            { id: "beige",  label: "Beige",           hex: "#D9C9A8", type: "rate", delta: 0.10 },
            { id: "marron", label: "Marron",          hex: "#5A3E2B", type: "rate", delta: 0.10 },
          ],
        },
      },
    },
  },

  /* Option transverse (s'applique aux deux produits) */
  pose: {
    label: "Pose par un artisan partenaire",
    note: "Installation par un professionnel près de chez vous (devis confirmé après commande).",
    type: "rate",
    delta: 0.35,   // +35 % du prix produit
  },
};
