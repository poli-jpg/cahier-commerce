// Contenu de l'assistant d'aide. Pour ajouter une question : copie un bloc et modifie-le.
export type Sujet = {
  id: string;
  question: string;
  intro: string;
  etapes?: string[];
  astuce?: string;
  action?: { label: string; href: string };
};

export const SUJETS: Sujet[] = [
  {
    id: "vente",
    question: "Comment enregistrer une vente ?",
    intro: "Quand un client achète :",
    etapes: [
      "Touchez le bouton vert « + » en bas de l'écran.",
      "Touchez « Ajouter » sur chaque produit, puis + ou − pour la quantité.",
      "Touchez « Continuer ».",
      "Choisissez « Tout payé », puis Espèces, Wave ou Orange Money.",
      "Touchez « Valider la vente ».",
    ],
    astuce: "Le stock des produits vendus baisse tout seul.",
    action: { label: "Nouvelle vente", href: "/vendre" },
  },
  {
    id: "lebalma",
    question: "Un client prend sans tout payer (Lebalma)",
    intro: "Pour une vente à crédit :",
    etapes: [
      "Faites la vente comme d'habitude, jusqu'à l'écran « Paiement ».",
      "Choisissez « Une partie » et tapez ce qu'il donne, ou « Rien pour l'instant ».",
      "Choisissez le client dans la liste (ou « + Nouveau client »).",
      "Touchez « Valider la vente ».",
    ],
    astuce: "Ce qu'il doit apparaît tout de suite dans l'onglet « Lebalma » et sur sa fiche.",
    action: { label: "Nouvelle vente", href: "/vendre" },
  },
  {
    id: "remboursement",
    question: "Un client vient payer sa dette",
    intro: "Quand un client vous donne de l'argent pour ce qu'il doit :",
    etapes: [
      "Touchez « Lebalma » en bas, puis le nom du client.",
      "Touchez « Enregistrer un paiement ».",
      "Tapez le montant reçu et choisissez le moyen de paiement.",
      "Touchez « Confirmer ».",
    ],
    astuce: "Le paiement règle d'abord ses achats les plus anciens. On ne peut jamais payer plus que la dette.",
    action: { label: "Voir le Lebalma", href: "/lebalma" },
  },
  {
    id: "erreur-paiement",
    question: "J'ai tapé un mauvais montant",
    intro: "Un paiement ne s'efface jamais, mais on peut l'annuler :",
    etapes: [
      "Ouvrez la fiche du client.",
      "Dans « Paiements reçus », touchez « Annuler ce paiement » sous la bonne ligne.",
      "Écrivez la raison (par exemple « erreur, il a donné 1 000 »), puis confirmez.",
      "Enregistrez ensuite le bon montant.",
    ],
    astuce: "La ligne annulée reste visible, barrée : vous gardez la trace de ce qui s'est passé.",
    action: { label: "Voir mes clients", href: "/clients" },
  },
  {
    id: "prix",
    question: "Vendre moins cher ou un produit hors liste",
    intro: "Sur l'écran « Paiement » d'une vente, chaque article a une case « Prix » : remplacez le prix pour un prix négocié. Pour un article qui n'est pas dans vos produits, touchez « + Montant libre » en bas de la liste des produits.",
    action: { label: "Nouvelle vente", href: "/vendre" },
  },
  {
    id: "produit",
    question: "Comment ajouter un produit ?",
    intro: "Pour enregistrer ce que vous vendez :",
    etapes: [
      "Touchez « Produits » en bas, puis « Ajouter ».",
      "Écrivez le nom (avec la contenance ou la teinte), le prix de vente et la catégorie.",
      "Indiquez combien vous en avez maintenant.",
      "Touchez « Ajouter le produit ».",
    ],
    astuce: "Après un ajout, touchez « Ajouter un autre » pour enchaîner.",
    action: { label: "Ajouter un produit", href: "/produits/nouveau" },
  },
  {
    id: "stock",
    question: "J'ai reçu de la marchandise",
    intro: "Pour augmenter le stock :",
    etapes: [
      "Touchez « Produits » en bas, puis le produit.",
      "Dans « Marchandise reçue », tapez le nombre de pièces arrivées.",
      "Touchez « Ajouter au stock ».",
    ],
    astuce: "Si le stock affiché est faux, utilisez « Corriger après comptage » et tapez ce que vous avez vraiment.",
    action: { label: "Voir mes produits", href: "/produits" },
  },
  {
    id: "chiffres",
    question: "Que veulent dire les chiffres de l'accueil ?",
    intro:
      "« Ventes du jour » : tout ce que vous avez vendu aujourd'hui. « Argent encaissé » : l'argent vraiment reçu aujourd'hui, y compris les dettes remboursées. « Vendu à crédit » : la part des ventes du jour qui n'a pas été payée. « Lebalma » : tout ce que vos clients vous doivent.",
    action: { label: "Voir les ventes du jour", href: "/ventes" },
  },
  {
    id: "client",
    question: "Comment ajouter un client ?",
    intro: "Touchez « Clients » en bas, puis « Ajouter ». Seul le nom est obligatoire ; le téléphone aide à le retrouver et à l'appeler.",
    astuce: "Vous pouvez aussi créer le client pendant une vente, avec « + Nouveau client ».",
    action: { label: "Ajouter un client", href: "/clients/nouveau" },
  },
  {
    id: "installer",
    question: "Mettre l'appli sur mon écran d'accueil",
    intro: "Pour l'ouvrir comme une vraie application :",
    etapes: [
      "iPhone : dans Safari, touchez Partager puis « Sur l'écran d'accueil ».",
      "Android : dans Chrome, touchez ⋮ puis « Ajouter à l'écran d'accueil ».",
    ],
  },
];
