# Voléa — Site de commande de fenêtres & volets roulants sur-mesure

Site **statique** (HTML/CSS/JS, aucun framework) hébergeable tel quel sur GitHub
Pages, Netlify, Vercel, OVH, etc. Le client configure sa fenêtre ou son volet à
ses dimensions, voit son **prix en temps réel**, ajoute au panier, paie par
**carte bancaire (Stripe)**, et vous recevez le **bon de commande par email + un
PDF**.

---

## 📁 Structure

```
index.html              → Page d'accueil (vitrine premium)
configurateur.html      → Configurateur (dimensions, options, aperçu, prix live)
commande.html           → Tunnel de commande (coordonnées → PDF + email → paiement)
assets/
  css/styles.css        → Design system complet
  js/config.js          → ⭐ TOUT ce qui se modifie : marque, TARIFS, branchements
  js/app.js             → Panier, header, helpers
  js/configurateur.js   → Moteur de prix + aperçu SVG dynamique
  js/commande.js        → Récap, génération du bon de commande PDF, email, Stripe
serverless/
  stripe-checkout.js    → Fonction de paiement à déployer (Netlify/Vercel)
  package.json
```

> 👉 **Tout ce que vous avez à éditer au quotidien se trouve dans
> `assets/js/config.js`.** Le reste fonctionne tout seul.

---

## 1. Personnaliser la marque et les tarifs

Ouvrez `assets/js/config.js` :

- **`brand`** : nom, email, téléphone, adresse, SIRET (affichés partout + sur le PDF).
- **`settings`** : TVA, seuil de livraison offerte, frais de port, délai annoncé.
- **`pricing`** : le cœur. Pour chaque produit (`fenetre`, `volet`) :
  - `base` : forfait de départ en €
  - `pricePerM2` : prix au m²
  - `limits` : dimensions mini/maxi autorisées (mm)
  - `options` : chaque option a un `delta`
    - `type: "add"` → ajoute un montant fixe en € (ex: `delta: 110`)
    - `type: "rate"` → ajoute un pourcentage (ex: `delta: 0.22` = +22 %)
  - `couleur` (type `"color"`) : ajoutez/retirez des coloris avec leur `hex`.

> **Formule :** `prix = (base + prix/m² × surface)` puis application des options
> (les `rate` en %, les `add` en €), puis l'option pose si cochée.
> La surface = Largeur × Hauteur (en m²), avec un minimum facturé (`minM2`).

Aucune compétence technique nécessaire : changez les nombres, enregistrez,
rechargez la page.

---

## 2. Recevoir les commandes par email (gratuit, 3 min)

1. Créez un compte sur **[Formspree](https://formspree.io)** (offre gratuite).
2. Créez un formulaire, associez **votre adresse email**.
3. Copiez l'URL du formulaire (ex: `https://formspree.io/f/abcdefgh`).
4. Collez-la dans `config.js` → `integrations.formspreeEndpoint`.

À chaque commande, vous recevez un email récapitulatif complet (client,
articles, dimensions, options, total). Le client, lui, télécharge
automatiquement son **bon de commande PDF**.

> Alternatives possibles au même endroit : [FormSubmit](https://formsubmit.co),
> [Web3Forms](https://web3forms.com)… toute API acceptant un POST JSON convient.

---

## 3. Activer le paiement par carte (Stripe, ~10 min)

Le site étant statique, Stripe a besoin d'une petite **fonction serveur** pour
créer la session de paiement **sans jamais exposer votre clé secrète**. Tout est
fourni dans `serverless/`.

1. Créez un compte **[Stripe](https://stripe.com)** (gratuit).
2. Récupérez votre **clé secrète** : Developers → API keys → *Secret key*.
3. Déployez le dossier `serverless/` sur **[Netlify](https://netlify.com)**
   (gratuit) :
   - nouveau site → glissez-déposez ou connectez le repo,
   - placez `stripe-checkout.js` dans `netlify/functions/`,
   - ajoutez la variable d'environnement **`STRIPE_SECRET_KEY`** = votre clé,
   - déployez.
4. Copiez l'URL de la fonction
   (ex: `https://votre-site.netlify.app/.netlify/functions/stripe-checkout`).
5. Collez-la dans `config.js` → `integrations.stripeCheckoutEndpoint`.

C'est tout : le bouton « Payer par carte » redirige désormais vers la page de
paiement sécurisée Stripe (Visa, Mastercard, CB…), puis ramène le client sur une
page de confirmation.

> **Avant d'activer :** testez en mode test avec une clé `sk_test_…` et la carte
> Stripe `4242 4242 4242 4242` (date future, CVC quelconque).

### Tant que Stripe n'est pas branché ?

Le site fonctionne en **mode devis** : la commande est enregistrée, le PDF
généré et l'email envoyé ; le client est informé que vous le recontactez pour le
règlement. Vous pouvez donc lancer le site immédiatement et brancher le paiement
plus tard.

---

## 4. Mettre le site en ligne

C'est déjà un site statique. Sur **GitHub Pages** : activez Pages sur la branche,
racine `/`. Le site est servi tel quel. (Un fichier `.nojekyll` est présent pour
servir le dossier `assets/` sans transformation.)

---

## 5. Aller plus loin (optionnel)

- **Pièces jointes PDF dans l'email marchand** : possible en passant le PDF en
  base64 à un service comme Web3Forms, ou via l'email de reçu Stripe.
- **Paiement en plusieurs fois** : activable dans le tableau de bord Stripe.
- **Nouveaux produits** : dupliquez un bloc dans `pricing` et ajoutez un bouton
  `data-prod` dans `configurateur.html`.

---

Des questions sur une personnalisation précise ? Tout est commenté en français
dans `config.js`.
