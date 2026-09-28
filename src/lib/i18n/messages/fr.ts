import type { Messages } from "@/lib/i18n/messages";
import type { CityCopy, PricingItemCopy } from "@/lib/i18n/types";
import type { LocationPage } from "@/lib/locations";
import {
  ALBERTA_GST_PERCENT,
  PRICING_HUB,
  PRICING_PACKAGES,
  PRICING_RETAINERS,
  formatCad,
  getPricingItem,
} from "@/lib/pricing";
import { SOCIAL_NETWORKS_LABEL } from "@/lib/site";
import type { HomeCopy } from "@/lib/visitorRegion";
import { frEmails } from "@/lib/i18n/messages/frEmails";

const cad = (cents: number) => formatCad(cents, 0, "fr-CA");
const price = (id: string) => cad(getPricingItem(id)?.amount ?? 0);

/** "de Calgary", "d’Edmonton" */
const de = (name: string) => (/^[aeiouyh]/i.test(name) ? `d’${name}` : `de ${name}`);

const pricingItems: Record<string, PricingItemCopy> = {
  addon_hub: {
    name: "DigiSol Hub",
    blurb:
      "CRM, séquences de suivi, relances après audit et résultats de campagnes, pour les équipes qui ont déjà un site (ou qui veulent le Hub avant une refonte).",
    badge: "Commencer par le Hub",
    includes: [
      "Espace de travail dédié à votre entreprise dans DigiSol Hub",
      "Capture de prospects et pipeline de départ",
      "Séquences de courriels et de suivi",
      "Relances après audit et suivi des campagnes",
      "Code de suivi pour votre site existant",
    ],
  },
  foundation: {
    name: "Fondation",
    blurb:
      "Conception de site Web sur mesure et développement Next.js pour tous les secteurs en Alberta : commerce de détail, métiers, services professionnels, hôtellerie et plus.",
    badge: "Point de départ",
    timeline: "2 à 3 semaines",
    includes: [
      "Design axé sur votre marque (pas un gabarit)",
      "Développement Next.js · jusqu’à 6 pages principales",
      "Pensé pour le mobile, Core Web Vitals rapides",
      "Formulaires de contact et capture de prospects dans DigiSol Hub",
      "Configuration de GA4 et du suivi interne",
      "Données structurées d’entreprise locale aux coordonnées cohérentes",
    ],
  },
  growth: {
    name: "Moteur de croissance",
    blurb:
      "Fondation, plus le SEO local, l’optimisation des conversions et l’automatisation du Hub pour que la clientèle des environs vous trouve et passe à l’action. S’adapte à n’importe quelle zone desservie.",
    badge: "Le plus réservé",
    timeline: "4 à 5 semaines",
    includes: [
      "Tout ce qui est inclus dans Fondation",
      "Profil d’entreprise Google et base de citations",
      "SEO local de départ, sur la page et hors page",
      "Parcours de conversion (appels à l’action, formulaires, pages de remerciement)",
      "Séquence de courriels de suivi dans DigiSol Hub",
      "Ensemble de départ de pages par ville ou par service",
    ],
  },
  full_funnel: {
    name: "Entonnoir complet",
    blurb:
      "Design, ingénierie, SEO local et publicité payante sous un même toit, pour les entreprises prêtes à dominer leur marché.",
    badge: "Grande échelle",
    timeline: "6 à 8 semaines",
    includes: [
      "Tout ce qui est inclus dans Moteur de croissance",
      "Structure de campagnes Google Ads et Meta",
      "Pages d’atterrissage optimisées pour le trafic payant",
      "Tableau de bord de suivi des campagnes dans le Hub",
      "Lancement de contenu mensuel façon Dispatch",
      "Revue stratégique trimestrielle",
    ],
  },
  retainer_local: {
    name: "Forfait Croissance locale",
    blurb: "SEO continu, inscriptions, accompagnement pour les avis et séquences dans le Hub.",
    includes: [
      "SEO local et entretien des citations",
      "Conseils sur la fréquence des publications et photos du profil Google",
      "Ajustement des séquences et du suivi des prospects",
      "Notes de performance mensuelles",
    ],
  },
  retainer_ads: {
    name: "Forfait Publicité payante",
    blurb: "Gestion Google et Meta en plus de votre site (budget publicitaire en sus).",
    includes: [
      "Création et optimisation des campagnes",
      "Notes sur les tests de créations",
      "Rythme du budget et rapports",
      "Ajustements d’optimisation des pages d’atterrissage",
    ],
  },
  retainer_full: {
    name: "Forfait Croissance complète",
    blurb: "SEO local, publicité payante et contenu à exporter réunis dans un seul moteur mensuel.",
    badge: "Idéal pour croître",
    includes: [
      "Tout ce qui est inclus dans les forfaits Local et Publicité",
      "Affiches IA et contenu à exporter pour les réseaux sociaux",
      "Contenu hors page façon Dispatch",
      "Soutien prioritaire dans le Hub",
    ],
  },
  addon_pages: {
    name: "Pages supplémentaires (×3)",
    blurb: "Trois pages supplémentaires conçues sur mesure (services, villes ou offres).",
    includes: ["3 pages sur mesure", "Titres SEO et données structurées", "Intégrées au menu"],
  },
  addon_city: {
    name: "Pages par ville (×4)",
    blurb: "Quatre pages de SEO local pour les villes de l’Alberta que vous desservez.",
    includes: ["4 pages par ville", "Maillage interne", "Plan du site et données structurées"],
  },
  addon_ecommerce: {
    name: "Module commerce en ligne / catalogue",
    blurb: "Catalogue de produits ou de réservations ajouté à votre site DigiSol.",
    includes: ["Expérience de catalogue", "Transfert vers le paiement", "Structure prête pour l’inventaire"],
  },
  addon_custom_app: {
    name: "Module d’application Web sur mesure",
    blurb: "Portails, enchères, tableaux de bord ou outils propres à votre secteur.",
    includes: ["Développement d’un MVP ciblé", "Authentification et rôles au besoin", "Données prêtes pour le Hub"],
  },
  addon_brand: {
    name: "Mise à jour de l’identité visuelle",
    blurb: "Déclinaisons du logo, couleurs, ton : appliqués au site et au Hub.",
    includes: ["Trousse logo et couleurs", "Notes sur le ton", "Éléments prêts pour les affiches"],
  },
};

const timeline = (id: string) => pricingItems[id]?.timeline ?? "";
const itemName = (id: string) => pricingItems[id]?.name ?? getPricingItem(id)?.name ?? id;

const guarantees = [
  {
    id: "revisions",
    title: "Révisions illimitées jusqu’au lancement",
    body: "Nous peaufinons le design et les textes jusqu’à ce que vous soyez satisfait, dans les limites des pages et fonctionnalités prévues à votre soumission. Les nouvelles pages ou fonctionnalités font l’objet d’une soumission distincte, avant le début des travaux.",
  },
  {
    id: "on_time",
    title: "Garantie de lancement à temps",
    body: "Votre date de lancement figure dans votre soumission écrite. Si nous la manquons et que le retard vient de nous, votre prochain mois de forfait mensuel est gratuit.",
  },
  {
    id: "response",
    title: "Réponse en un jour ouvrable",
    body: "Chaque demande de soutien reçoit une réponse d’une vraie personne en un jour ouvrable, avant comme après le lancement.",
  },
];
const guaranteeFinePrint =
  "La date de lancement est reportée si le contenu, les commentaires ou les approbations arrivent en retard. La portée correspond à ce qui figure dans votre soumission signée.";

const homeGeneral: HomeCopy = {
  heroEyebrow: "Conception Web, ingénierie et marketing de croissance",
  heroTitleLead: "Conception de sites Web,",
  heroTitleAccent: "développement et marketing",
  heroTitleTail: "",
  heroTagline: "Là où le design, l’ingénierie et la croissance se rencontrent",
  heroSub: "Des sites sur mesure que nous concevons et développons, puis le marketing qui les remplit",
  heroBody:
    "DigiSol accompagne les entreprises en croissance avec des sites Web à l’image de leur marque, des développements Next.js modernes, le référencement (SEO) et la publicité payante. Que vous serviez un marché local ou des clients au-delà des frontières, nous concevons le site, bâtissons la plateforme et aidons les bonnes personnes à vous trouver et à passer à l’action.",
  heroMarkets: "Travail à distance · Amérique du Nord et au-delà",
  whyTitle: "L’avantage DigiSol",
  whyBody:
    "Nous concevons le site Web, le programmons pour convertir et en faisons la promotion : un seul partenaire, plutôt qu’un designer, un développeur et une agence.",
  designBook: "Des pages pensées selon la façon dont vos clients s’informent et achètent vraiment",
  devSpeed: "Des temps de chargement ultrarapides qui protègent votre SEO et vos conversions",
  mktPaid: "Des campagnes Meta et Google ciblées selon votre marché",
  mktSeo: "Un SEO et une visibilité locale ajustés aux endroits où vous vendez vraiment",
  audienceIntro:
    "Jeunes pousses et entreprises établies profitent de la même méthode : un site conçu sur mesure, du code qui convertit et un marketing qui livre, peu importe où vous exercez vos activités.",
  audienceStartupBody:
    "Un site conçu sur mesure et un développement léger pour lancer avec une image crédible, puis un positionnement clair pour que les bons clients vous trouvent.",
  audienceStartupPoint: "Stratégie de lancement et positionnement sur le marché",
  audienceEstablishedBody:
    "Refaites le site que vos clients utilisent vraiment, puis modernisez la plateforme qui le soutient, avec le marketing et l’optimisation des conversions intégrés pour les entreprises établies.",
  servicesPaid:
    "Google Ads, Meta Ads et SEO pour que les recherches dans vos marchés se transforment en clients.",
  servicesCommerce:
    "Boutiques en ligne et plateformes Web ou d’enchères sur mesure pour les détaillants et les entreprises de services qui doivent vendre, afficher et croître.",
  auditBody: `Une courte présentation sur ce que les entreprises devraient corriger en premier : design, vitesse, SEO et le parcours de la visite jusqu’au contrat. Exportez des légendes prêtes pour ${SOCIAL_NETWORKS_LABEL} ci-dessous.`,
  contactTitle: "Prêt à faire croître votre entreprise en ligne?",
  contactBody:
    "Obtenez une soumission ou une consultation stratégique gratuite pour la conception Web, le développement sur mesure, le SEO et les campagnes, pour les entreprises qui vendent localement ou au-delà des frontières.",
  chatGreetingAudience: "entreprises",
};

const homeAlberta: HomeCopy = {
  ...homeGeneral,
  heroEyebrow: "Conception Web, ingénierie et croissance, enracinées en Alberta",
  heroBody:
    "Établie à Airdrie, DigiSol conçoit le site, bâtit la plateforme et gère le SEO, Google Ads et les campagnes Meta pour les entreprises en croissance, de Calgary et Edmonton jusqu’aux clients partout au Canada et ailleurs. L’Alberta est notre port d’attache; votre marché, c’est partout où vous vendez.",
  heroMarkets: "Airdrie · Calgary · Edmonton · Partout en Alberta · Travail à distance partout au pays",
  whyBody:
    "Nous concevons le site Web, le programmons pour convertir et en faisons la promotion : un seul partenaire, plutôt qu’un designer, un développeur et une agence. De profondes racines albertaines, au service de nos clients partout où ils grandissent.",
  mktPaid: "Des campagnes Meta et Google ciblées selon les marchés où vous vendez",
  mktSeo:
    "SEO et visibilité locale : forts dans Google Maps en Alberta, ajustés à tous les endroits où vous exercez vos activités",
  audienceIntro:
    "Jeunes pousses et entreprises établies profitent de la même méthode : un site conçu sur mesure, du code qui convertit et un marketing qui livre, que vous soyez à deux pas en Alberta ou en pleine croissance ailleurs.",
  audienceStartupBody:
    "Un site conçu sur mesure et un développement léger pour lancer avec une image crédible, puis un positionnement clair pour que les bons clients vous trouvent dans votre marché.",
  audienceEstablishedBody:
    "Refaites le site que vos clients utilisent vraiment, puis modernisez la plateforme qui le soutient, avec le marketing et l’optimisation des conversions intégrés pour les entreprises établies prêtes à croître.",
  servicesPaid:
    "Google Ads, Meta Ads et SEO, y compris la recherche locale en Alberta à Airdrie, Calgary et Edmonton, pour que les marchés qui comptent pour vous se transforment en clients.",
  contactBody:
    "Obtenez une soumission ou une consultation stratégique gratuite pour la conception Web, le développement sur mesure, le SEO et les campagnes. Enracinés en Alberta, heureux de travailler avec des entreprises partout où vous vendez.",
  chatGreetingAudience: "entreprises en croissance",
};

function homeCity(page: LocationPage): Partial<HomeCopy> {
  const isAirdrie = page.slug === "airdrie";
  const of = de(page.name);
  return {
    heroEyebrow: page.regionLabel,
    heroTitleLead: isAirdrie ? "Conception Web à Airdrie," : "Conception de sites Web,",
    heroTitleAccent: "développement et marketing",
    heroTitleTail: isAirdrie ? "" : `à ${page.name}`,
    heroTagline: "Là où le design, l’ingénierie et la croissance se rencontrent",
    heroSub: page.subhead,
    heroBody: page.intro,
    heroMarkets: `Nous servons aussi ${page.nearby}`,
    whyTitle: "L’avantage DigiSol",
    whyBody: `Nous concevons le site Web, le programmons pour convertir et en faisons la promotion : un seul partenaire pour les entreprises ${of}, plutôt qu’un designer, un développeur et une agence.`,
    designBook: `Des pages pensées selon la façon dont les clients ${of} s’informent et achètent vraiment`,
    mktPaid: `Des campagnes Meta et Google ciblées pour ${page.name} et les marchés environnants`,
    mktSeo: `Un SEO local qui vous place en tête dans Google Maps à ${page.name} et dans les recherches à proximité`,
    servicesPaid: `Google Ads, Meta Ads et SEO local pour ${page.name} et les marchés voisins, pour que les recherches locales se transforment en clients.`,
    servicesCommerce: `Boutiques en ligne et plateformes Web ou d’enchères sur mesure pour les détaillants et entreprises de services ${of} qui doivent vendre, afficher et croître.`,
    auditBody: `Une courte présentation sur ce que les entreprises ${of} devraient corriger en premier : design, vitesse, SEO local et le parcours de la visite jusqu’au contrat. Exportez des légendes prêtes pour ${SOCIAL_NETWORKS_LABEL} ci-dessous.`,
    contactTitle: `Prêt à faire croître votre entreprise à ${page.name}?`,
    contactBody: `Obtenez une soumission ou une consultation stratégique gratuite pour la conception Web, le développement sur mesure, le SEO local et les campagnes à ${page.name} et dans les environs. Enracinés en Alberta, ouverts aux entreprises partout où vous vendez.`,
    chatGreetingAudience: `entreprises ${of}`,
  };
}

const homeLocationsHub: Partial<HomeCopy> = {
  heroEyebrow: "Zones desservies par DigiSol · Partout en Alberta",
  heroTitleLead: "Conception de sites Web,",
  heroTitleAccent: "développement et marketing",
  heroTitleTail: "partout en Alberta",
  heroTagline: "Là où le design, l’ingénierie et la croissance se rencontrent",
  heroSub:
    "Des sites sur mesure que nous concevons et développons, puis le marketing qui les remplit dans chaque marché que nous desservons.",
  heroBody:
    "Une seule méthode DigiSol pour Calgary, Edmonton, Red Deer, Cochrane et Airdrie : design, ingénierie, SEO et campagnes. L’Alberta est notre port d’attache; votre marché, c’est partout où vous vendez.",
  heroMarkets: "Airdrie · Calgary · Edmonton · Red Deer · Cochrane · Partout en Alberta",
  contactTitle: "Prêt à croître partout en Alberta?",
  contactBody:
    "Obtenez une soumission ou une consultation stratégique gratuite pour la conception Web, le développement sur mesure, le SEO local et les campagnes, partout en Alberta et ouverts aux entreprises où que vous vendiez.",
};

const cities: Record<string, CityCopy> = {
  calgary: {
    regionLabel: "Calgary et la vallée de la Bow",
    headline: "Conception de sites Web, développement et SEO local à Calgary",
    subhead:
      "Des sites sur mesure et du marketing de croissance pour les entreprises de Calgary qui veulent plus de clients locaux, pas un autre gabarit.",
    intro:
      "DigiSol est établie à Airdrie et travaille avec des entreprises de Calgary qui veulent un site Web rapide et sur mesure, ainsi que le SEO local et les campagnes Google Ads et Meta qui le remplissent. Les mêmes nom, adresse et téléphone partout, des pages de services claires et des parcours de conversion pensés pour la clientèle albertaine.",
    focus: [
      "Conception Web et développement Next.js axés sur Calgary",
      "Cohérence du profil d’entreprise Google et des citations pour les recherches à Calgary",
      "Campagnes Google Ads et Meta géociblées sur Calgary et les villes voisines",
      "Optimisation des formulaires, des appels à l’action et du suivi pour transformer le trafic de Calgary en rendez-vous",
    ],
    nearby: "Airdrie, Cochrane, Okotoks et la grande région de Calgary",
    keywords: [
      "conception site web Calgary",
      "développeur web Calgary",
      "SEO local Calgary",
      "agence marketing numérique Calgary",
      "Google Ads Calgary",
    ],
  },
  edmonton: {
    regionLabel: "Edmonton et la région de la capitale",
    headline: "Conception de sites Web, développement et SEO local à Edmonton",
    subhead:
      "Des sites Web axés sur l’ingénierie et un marketing complet pour les entreprises d’Edmonton prêtes à dominer la recherche locale.",
    intro:
      "Depuis Airdrie, DigiSol conçoit des sites Web sur mesure pour les entreprises d’Edmonton et les jumelle au SEO local, aux citations, à une stratégie d’avis et à des campagnes payantes. Un seul partenaire, du premier coup d’œil jusqu’à la vente conclue, plutôt qu’une pile de pigistes déconnectés.",
    focus: [
      "Conception Web à Edmonton avec des pages Next.js rapides et faciles à indexer",
      "SEO local pour la visibilité à Edmonton dans Google Maps et les résultats organiques",
      "Publicité sur Google et les réseaux sociaux ciblant Edmonton et les communautés voisines",
      "Suivi des prospects dans DigiSol Hub pour garder un œil sur la performance de votre entonnoir à Edmonton",
    ],
    nearby: "St. Albert, Sherwood Park et la grande région d’Edmonton",
    keywords: [
      "conception site web Edmonton",
      "entreprise SEO Edmonton",
      "développeur web Edmonton",
      "marketing numérique Edmonton",
      "optimisation des conversions Edmonton",
    ],
  },
  "red-deer": {
    regionLabel: "Red Deer et le centre de l’Alberta",
    headline: "Conception de sites Web, développement et SEO local à Red Deer",
    subhead:
      "Les entreprises du centre de l’Alberta obtiennent un site sur mesure et le travail hors page qui aide la clientèle de Red Deer à vous trouver.",
    intro:
      "Red Deer se trouve entre Calgary et Edmonton : DigiSol couvre ce corridor avec la conception Web, le SEO local et des campagnes axées sur les recherches du centre de l’Alberta. Des nom, adresse et téléphone cohérents, un solide profil Google et un site conçu pour convertir.",
    focus: [
      "Sites Web sur mesure pour les entreprises de Red Deer et du centre de l’Alberta",
      "Citations locales et configuration du profil d’entreprise Google pour Red Deer",
      "Annonces sur Google et les réseaux sociaux pour les zones desservies à Red Deer",
      "Des habitudes de SEO hors page, façon Dispatch, qui rapportent mois après mois",
    ],
    nearby: "Lacombe, Innisfail et les villes du centre de l’Alberta",
    keywords: [
      "conception site web Red Deer",
      "développeur web Red Deer",
      "SEO local Red Deer",
      "marketing numérique Red Deer Alberta",
      "Google Ads Red Deer",
    ],
  },
  cochrane: {
    regionLabel: "Cochrane et le comté de Rocky View",
    headline: "Conception de sites Web, développement et SEO local à Cochrane",
    subhead:
      "Tout près de la base de DigiSol à Airdrie : des sites Web sur mesure et une croissance locale pour les entreprises de Cochrane.",
    intro:
      "Les entreprises de Cochrane rivalisent souvent à la fois dans les recherches locales et dans celles de la région de Calgary. DigiSol conçoit et développe le site, puis gère le SEO local et les campagnes pour que la clientèle de Cochrane, et les acheteurs des environs de Calgary, puissent vous trouver et vous joindre.",
    focus: [
      "Conception Web pour les détaillants, gens de métier et services professionnels de Cochrane",
      "SEO local ajusté aux recherches à Cochrane et dans le comté de Rocky View",
      "Inscriptions et avis qui correspondent à vos coordonnées à Cochrane",
      "Des pages axées sur la conversion qui transforment les visites locales en consultations",
    ],
    nearby: "Airdrie, Calgary et le corridor de la vallée de la Bow",
    keywords: [
      "conception site web Cochrane",
      "développeur web Cochrane Alberta",
      "SEO local Cochrane",
      "marketing numérique Cochrane AB",
      "concepteur de sites web près de Cochrane",
    ],
  },
  airdrie: {
    regionLabel: "Airdrie, port d’attache de DigiSol",
    headline: "Conception Web, développement et marketing à Airdrie",
    subhead:
      "Conception de sites Web, développement, SEO et marketing numérique établis à Airdrie : des sites sur mesure et des campagnes qui aident la clientèle locale à vous trouver.",
    intro:
      "Le siège social de DigiSol est à Airdrie, en Alberta. Nous concevons et programmons des sites Web sur mesure pour les entreprises locales, puis gérons le marketing à Airdrie (SEO local, Google Ads et Meta) pour que la clientèle des environs vous trouve dans les recherches et réserve vos services.",
    focus: [
      "Conception Web et développement Next.js à Airdrie (sans lourdeur de gabarit)",
      "Profil d’entreprise Google, citations et cohérence des coordonnées pour les recherches à Airdrie",
      "Marketing à Airdrie : SEO local, Google Ads et Meta pour le nord de la région de Calgary",
      "Optimisation des pages pour que le trafic d’Airdrie réserve une consultation gratuite",
    ],
    nearby: "Calgary, Cochrane et des communautés partout en Alberta",
    keywords: [
      "conception web Airdrie",
      "développement web Airdrie",
      "marketing Airdrie",
      "conception site web Airdrie",
      "SEO local Airdrie",
    ],
  },
};

const retainerList = PRICING_RETAINERS.map(
  (r) => `${itemName(r.id).replace(/^Forfait /, "")} (${cad(r.amount)}/mois)`,
).join(", ");

export const fr: Messages = {
  home: {
    general: homeGeneral,
    alberta: homeAlberta,
    locationsHub: homeLocationsHub,
    city: homeCity,
  },
  cities,
  pricingItems,

  meta: {
    homeTitle: "DigiSol | Conception Web, développement et marketing à Airdrie",
    homeDescription:
      "Conception Web, développement Next.js, SEO et marketing numérique à Airdrie. DigiSol bâtit des sites rapides qui aident la clientèle locale à vous trouver et à passer à l’action.",
    homeShareDescription:
      "Sites Web sur mesure, SEO et marketing de croissance depuis Airdrie, en Alberta : un seul partenaire, du premier coup d’œil jusqu’à la vente conclue.",
    homeShareAlt: "DigiSol : sites Web sur mesure, SEO et marketing de croissance depuis Airdrie, en Alberta",
    locationsTitle: "Villes desservies en Alberta | DigiSol",
    locationsDescription:
      "Conception Web, développement et SEO local par DigiSol pour Calgary, Edmonton, Red Deer, Cochrane et Airdrie. La même expérience DigiSol complète, partout en Alberta.",
    locationsShareDescription:
      "L’expérience DigiSol complète pour toute l’Alberta : design, ingénierie, marketing, Kaylev, vidéo d’audit et contact.",
    locationsShareAlt: "Conception Web et marketing DigiSol partout en Alberta",
    cityShareAlt: (city) => `Conception Web et marketing DigiSol pour les entreprises ${de(city)}`,
  },

  shareCard: {
    subline: "Conception Web, SEO et marketing · Airdrie, Alberta",
    cta: "Soumission gratuite",
    home: "Des sites Web sur mesure, puis le marketing qui les remplit",
    citySubline: (city) => `Conception Web, SEO et marketing · ${city}, Alberta`,
    city: (city) => `Des sites Web qui amènent plus de clients aux entreprises ${de(city)}`,
    locationsSubline: "Airdrie · Calgary · Edmonton · Red Deer · Cochrane",
    locations: "Conception Web, développement et SEO local partout en Alberta",
    locationsCta: "Trouver votre ville",
    pricingSubline: "Des prix transparents · en dollars canadiens, plus TPS",
    pricing: (from) => `Sites Web sur mesure à partir de ${from}. Tous nos prix sont publiés.`,
    pricingCta: "Comparer les forfaits",
    aboutSubline: "Fondateur et PDG, DigiSol · Airdrie, Alberta",
    about: "Développeur full stack certifié et spécialiste en marketing numérique",
    aboutCta: "Voir les diplômes",
    blogKicker: "Guides DigiSol",
    blog: "Des guides pratiques sur les avis Google, la recherche locale et les sites Web qui attirent des clients",
    blogCta: "Guides gratuits",
    dispatchKicker: "DigiSol Dispatch",
    dispatch: "Notes de SEO local et de croissance pour les entreprises de l’Alberta",
    dispatchCta: "Lire le dernier numéro",
    privacy: "Comment DigiSol traite vos données",
    videoKicker: "DigiSol Médias · Vidéo",
    video: "Audit de site Web : ce que les entreprises de l’Alberta devraient corriger en premier",
    videoCta: "Regarder la présentation",
  },

  cityJsonLd: {
    offerDesignHome: "Conception et développement Web à Airdrie",
    offerDesign: (city) => `Conception et développement de sites Web à ${city}`,
    offerMarketingHome: "Marketing et SEO local à Airdrie",
    offerMarketing: (city) => `Marketing numérique et SEO local à ${city}`,
    q1Home: "Qui offre la conception et le développement Web à Airdrie?",
    q1: (city) => `Qui offre la conception et le développement de sites Web à ${city}?`,
    a1Home:
      "DigiSol est un studio établi à Airdrie qui conçoit et développe des sites Web sur mesure (Next.js) pour les entreprises locales, puis en fait la promotion avec le SEO local et des campagnes payantes.",
    a1: (city) =>
      `DigiSol conçoit et développe des sites Web sur mesure pour les entreprises ${de(city)} depuis son siège social d’Airdrie, avec du SEO local et des campagnes ciblant ${city} et les marchés voisins.`,
    q2Home: "DigiSol offre-t-elle le marketing et le SEO à Airdrie?",
    q2: (city) => `DigiSol offre-t-elle le marketing et le SEO à ${city}?`,
    a2: (city) =>
      `Oui. DigiSol gère le SEO local, Google Ads et les campagnes Meta pour ${city}, ainsi que l’optimisation des conversions pour que le trafic se transforme en consultations réservées.`,
    q3: "Où se trouve DigiSol?",
    a3: (address, phone) => `Le siège social de DigiSol est situé au ${address}. Téléphone : ${phone}.`,
  },

  language: {
    switchLabel: "Langue",
    suggestion: "Ce site est aussi offert en français.",
    suggestionCta: "Voir en français",
    dismiss: "Fermer",
    englishOnly: "Cette page est offerte en anglais seulement.",
  },

  nav: {
    skip: "Passer au contenu",
    homeAria: "Accueil DigiSol",
    logoAlt: "DigiSol : ingénierie et croissance",
    primaryAria: "Menu principal",
    mobileAria: "Menu mobile",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
    getQuote: "Soumission gratuite",
    contact: "Contact",
    hubLogin: "Connexion au Hub",
    links: [
      { href: "/#services", label: "Services" },
      { href: "/pricing", label: "Tarifs" },
      { href: "/#why-us", label: "Pourquoi nous" },
      { href: "/blog", label: "Guides (EN)" },
      { href: "/#dispatch", label: "Dispatch" },
      { href: "/media/website-audit", label: "Médias" },
      { href: "/locations/airdrie", label: "Airdrie" },
      { href: "/about", label: "À propos" },
    ],
  },

  footer: {
    jumpTo: "Aller à",
    jumps: [
      { href: "/#top", label: "Haut de page" },
      { href: "/#why-us", label: "Pourquoi nous" },
      { href: "/#services", label: "Services" },
      { href: "/pricing", label: "Tarifs" },
      { href: "/#audience", label: "Qui nous aidons" },
      { href: "/blog", label: "Guides (EN)" },
      { href: "/#dispatch", label: "Dispatch" },
      { href: "/media/website-audit", label: "Médias" },
      { href: "/about", label: "À propos" },
      { href: "/locations", label: "Villes" },
      { href: "/#contact", label: "Contact" },
    ],
    footerAria: "Pied de page",
    serviceCities: "Villes desservies",
    contact: "Contact",
    tagline: (region) =>
      `Conception Web, développement, SEO et marketing pour les entreprises en croissance, avec siège social en ${region}.`,
    rights: (year, region) => `© ${year} DigiSol. ${region}. Tous droits réservés.`,
    privacy: "Politique de confidentialité (EN)",
  },

  hero: {
    bookConsultation: "Réserver une consultation gratuite",
    exploreServices: "Découvrir nos services",
  },

  dualThreat: {
    eyebrow: "Concevoir. Bâtir. Croître.",
    design: {
      title: "Le savoir-faire du design",
      custom: "Un site conçu à partir de votre marque, pas un gabarit avec votre logo par-dessus",
      layout: "Mise en page, typographie et couleurs pour que la prochaine étape soit évidente",
      system: "Un système visuel réutilisable dans vos annonces et courriels, pas une maquette unique",
    },
    developer: {
      title: "L’avantage du développeur",
      stack: "Ingénierie Next.js / React moderne, conçue pour grandir",
      noBloat: "Zéro lourdeur de gabarit : des plateformes sur mesure, pas des constructeurs de pages",
      apis: "Des intégrations API sur mesure qui relient vos vrais outils",
    },
    marketing: {
      title: "Le moteur marketing",
      funnels: "Des entonnoirs qui convertissent, du premier clic à la vente",
      cro: "Une optimisation des conversions guidée par les données, chaque test appuyé par des preuves",
    },
  },

  kaylev: {
    eyebrow: "IA DigiSol · Kaylev",
    title: "Voici Kaylev : votre moteur de croissance autonome, 24 h sur 24",
    intro:
      "La plupart des sites Web restent là à ne rien faire. Le vôtre devrait conclure des ventes. Capture de prospects, audits, campagnes et des heures récupérées chaque semaine.",
    pillars: [
      {
        title: "Capture de prospects jour et nuit",
        body: "Ne manquez plus jamais un prospect intéressé. Kaylev capte les demandes venant des réseaux sociaux et du site à toute heure et y répond instantanément, avant que l’intérêt refroidisse.",
      },
      {
        title: "Audits de site et SEO local autonomes",
        body: "Kaylev analyse votre présence Web, repère les pertes de performance et renforce votre classement local pour que la clientèle de votre secteur vous trouve en premier.",
      },
      {
        title: "Campagnes multicanales orchestrées",
        body: "Des relances par courriel automatisées aux publications coordonnées sur les réseaux sociaux, Kaylev gère vos démarches sans un clic manuel à chaque étape.",
      },
      {
        title: "Plus de 15 heures récupérées par semaine",
        body: "Fini la saisie de données répétitive, les publications manuelles et les relances de base : concentrez-vous sur la conclusion de ventes et la gestion de votre entreprise.",
      },
    ],
    advantageTitle: "L’avantage DigiSol",
    advantage:
      "Vous obtenez un site Web de calibre mondial, bâti sur mesure, et un employé IA dédié dès le premier jour. Aucuns frais mensuels de logiciel gonflés : seulement de la croissance automatisée.",
    advantageCity: (city) =>
      `Vous obtenez un site Web de calibre mondial, bâti sur mesure, et un employé IA dédié dès le premier jour, conçus pour faire croître les entreprises ${de(city)}. Aucuns frais mensuels de logiciel gonflés : seulement de la croissance automatisée.`,
    freeAudit: "Obtenir un audit de site gratuit",
    bookConsult: "Réserver une consultation",
    chatHint:
      "Vous préférez écrire? Ouvrez Kaylev sur cette page et donnez-lui votre adresse Web pour un audit instantané.",
  },

  services: {
    eyebrow: "Design, ingénierie et marketing",
    title: "Un seul toit, du design jusqu’au client",
    intro:
      "Nous concevons le site Web, bâtissons la plateforme et remplissons l’entonnoir. Le même partenaire de la première maquette jusqu’au contrat signé.",
    design: {
      title: "Conception de sites Web",
      body: "Tout commence ici. Nous concevons l’apparence, la mise en page et le parcours vers la prise de contact, puis nous développons et faisons la promotion de ce même design. Vous n’achetez pas un gabarit avec votre logo collé dessus.",
    },
    dev: {
      title: "Développement Web et d’applications sur mesure",
      body: "React, Next.js et plateformes sur mesure qui livrent le design sous forme de site rapide et durable : haute performance, sans lourdeur de gabarit ni constructeur de pages fragile.",
    },
    paidTitle: "Campagnes de recherche et publicité payante",
    cro: {
      title: "Intégration de l’entonnoir complet et optimisation des conversions",
      body: "Transformez les visiteurs en prospects grâce à l’analytique, aux parcours de conversion et aux séquences de courriels et de suivi intégrés au produit.",
    },
    commerceTitle: "Commerce en ligne et plateformes",
    pricingLine: (from) => `Des prix transparents : sites Web sur mesure à partir de ${from} plus TPS.`,
    seePackages: "Voir les forfaits",
  },

  googleAutopilot: {
    eyebrow: "Google, vérifié chaque semaine",
    title: "Votre Analytics, Search Console et Ads, ajustés chaque lundi",
    intro:
      "La plupart des entreprises configurent Google une fois et n’y retouchent plus jamais. Les réglages dérivent, le suivi se brise et l’argent publicitaire fuit. Nous vérifions vos comptes Google chaque semaine et corrigeons ce qui cloche, souvent en un seul clic.",
    pillars: [
      {
        id: "analytics",
        title: "Des données fiables",
        body: "Nous vérifions que Google Analytics compte chaque visite une seule fois, conserve une année complète d’historique et traite les appels, formulaires et réservations comme des conversions.",
      },
      {
        id: "search",
        title: "Trouvé sur Google",
        body: "Search Console confirme que vos pages clés sont indexées et que vos plans de site sont lus, et montre les recherches où vous êtes près de la première page.",
      },
      {
        id: "ads",
        title: "Des annonces qui ne gaspillent pas",
        body: "Nous signalons les recherches qui coûtent de l’argent sans apporter de prospects, les campagnes diffusées sur des réseaux peu qualifiés et le suivi des conversions défectueux. Rien ne change à vos dépenses publicitaires sans votre accord.",
      },
      {
        id: "report",
        title: "Un rapport clair chaque semaine",
        body: "Chaque lundi, la vérification recommence. Les correctifs sans risque s’appliquent en un clic, et Kaylev peut expliquer n’importe quel résultat en termes simples.",
      },
    ],
    cta: "Demander une vérification de Google",
    ownership:
      "Vous restez propriétaire de chaque compte Google. Vous ajoutez simplement DigiSol comme utilisateur et pouvez nous retirer en tout temps.",
  },

  guarantee: {
    eyebrow: "La garantie DigiSol",
    title: "Trois promesses, par écrit",
    intro: "Chaque projet de site Web inclut ces garanties, précisées dans votre soumission.",
    items: guarantees,
    finePrint: guaranteeFinePrint,
    short:
      "Révisions illimitées jusqu’au lancement, garantie de lancement à temps et réponse en un jour ouvrable.",
  },

  techStack: {
    eyebrow: "Infrastructure de niveau entreprise",
    title: "Conçu avec des outils modernes",
    intro:
      "DigiSol bâtit des applications Web rapides sur des outils que nous utilisons nous-mêmes : le site, le Hub et les campagnes qui les soutiennent.",
    items: [
      {
        name: "Supabase",
        category: "Serveur et base de données",
        description:
          "PostgreSQL, données en temps réel et sécurité au niveau des lignes pour le Hub et les espaces clients.",
      },
      {
        name: "Cursor & Next.js",
        category: "Architecture et environnement",
        description: "Développement assisté par l’IA pour des applications React rapides, rendues côté serveur.",
      },
      {
        name: "Resend",
        category: "Courriels transactionnels",
        description: "Courriels par API pour le suivi des prospects, les séquences et les avis transactionnels.",
      },
      {
        name: "OpenAI",
        category: "IA",
        description:
          "Les modèles derrière Kaylev, les ébauches de séquences, les textes d’affiches et les rapports d’audit.",
      },
      {
        name: "Tailwind CSS",
        category: "Interface",
        description:
          "Un style utilitaire pour des pages adaptatives et accessibles qui gardent l’allure DigiSol.",
      },
    ],
    customEyebrow: "Solutions sur mesure",
    customTitle: "Besoin d’outils particuliers?",
    customBody:
      "Les outils suivent le projet : la performance, le flux de travail et la façon dont l’entreprise vend vraiment.",
    customFoot: "Conçu pour la vitesse et la recherche →",
  },

  websiteAudit: {
    eyebrow: "Médias",
    title: "Voyez comment DigiSol fait l’audit de votre site",
    bookConsult: "Réserver une consultation",
    fullPage: "Page média complète et transcription (en anglais)",
    videoFallback: "Télécharger la vidéo d’audit de site DigiSol",
  },

  auditExport: {
    title: "Exporter vers les réseaux sociaux",
    body: (linkedin, handle) =>
      `Des légendes prêtes pour cette vidéo d’audit (en anglais) : Facebook, ${linkedin ? "LinkedIn, " : ""}Instagram (@${handle}), ou téléchargez la trousse complète. Les liens mènent à wwwdigisol.com.`,
    copyFacebook: "Copier la publication Facebook",
    copyLinkedin: "Copier la publication LinkedIn",
    copyInstagram: "Copier la légende Instagram",
    shareFacebook: "Partager sur Facebook",
    shareLinkedin: "Partager sur LinkedIn",
    shareInstagram: "Partager sur Instagram",
    copyUrl: "Copier le lien de la page média",
    copyVideo: "Copier le lien de la vidéo",
    download: "Télécharger la trousse",
    sharing: "Partage en cours…",
    shared: "Partagé : choisissez Instagram dans le menu",
    captionCopied: "Légende copiée : collez-la dans Instagram",
  },

  audience: {
    eyebrow: "Clientèle cible",
    title: "Qui nous aidons",
    startupTitle: "Pour les jeunes pousses",
    startupPoints: [
      "Un design fidèle à votre marque, sans allure de gabarit",
      "Déploiement rapide et échéanciers de lancement serrés",
      "Des MVP complets à coût raisonnable",
    ],
    establishedTitle: "Pour les entreprises établies",
    establishedPoints: [
      "Une refonte qui reflète votre façon de vendre aujourd’hui",
      "Des remises à niveau qui rétablissent la vitesse et le SEO local",
      "Une intégration marketing avancée entre vos campagnes et votre produit",
      "Optimisation des conversions et modernisation des anciennes plateformes Web",
    ],
  },

  blogHighlights: {
    eyebrow: "Guides DigiSol (en anglais)",
    title: "Des guides pratiques pour les propriétaires d’entreprises locales",
    intro:
      "Des conseils clairs sur les avis Google, la recherche locale et les sites Web qui attirent des clients. Gratuits, sans courriel requis. Nos guides sont pour l’instant offerts en anglais.",
    minRead: (minutes) => `${minutes} min de lecture`,
    readGuide: "Lire le guide",
    seeAll: "Voir tous les guides",
  },

  dispatchArchive: {
    titleAlberta: "Notes de SEO local et de croissance pour les entreprises albertaines",
    titleGeneral: "Notes de SEO et de croissance pour les entreprises en croissance",
    introAlberta:
      "SEO local, citations, avis et notes d’ingénierie Next.js pour Airdrie, Calgary, Edmonton et Red Deer. Lisez le numéro, puis exportez-le vers vos réseaux, ou abonnez-vous ci-dessous pour recevoir le prochain par courriel. Les numéros sont publiés en anglais.",
    introGeneral:
      "SEO, citations, avis et notes d’ingénierie Next.js applicables à n’importe quel marché. Lisez le numéro, puis exportez-le vers vos réseaux, ou abonnez-vous ci-dessous pour recevoir le prochain par courriel. Les numéros sont publiés en anglais.",
    volume: (volume, month, year) => `Volume ${volume} · ${month} ${year}`,
    minRead: (minutes) => `${minutes} min de lecture`,
    readIssue: "Lire le numéro",
    exportSocials: "Exporter vers les réseaux",
  },

  dispatchSubscribe: {
    title: "Recevez le prochain Dispatch par courriel",
    body: "De deux à quatre numéros par mois (en anglais), envoyés dès leur publication. Désabonnement en tout temps. Nous ne vous enverrons pas le numéro que vous venez de lire.",
    done: "Vous êtes inscrit. Surveillez votre boîte de réception pour le prochain numéro.",
    name: "Nom",
    email: "Courriel",
    company: "Entreprise",
    optional: "(facultatif)",
    companyPlaceholder: "Entreprise inc.",
    subscribing: "Inscription…",
    subscribe: "S’abonner au Dispatch",
    error: "Inscription impossible",
  },

  localSeo: {
    eyebrow: (city) => `Recherche locale · ${city}`,
    headingHome: "Conception Web, développement et marketing à Airdrie",
    heading: (city) => `Conception de sites Web, développement et marketing à ${city}`,
    bodyHome:
      "Le siège social de DigiSol est à Airdrie. Quand quelqu’un cherche un concepteur Web, un développeur Web ou du marketing à Airdrie, il devrait trouver un vrai studio local, pas une boutique de gabarits nationale. Nous concevons et développons le site, puis gérons le SEO et les campagnes qui aident la clientèle des environs à vous réserver.",
    designHeading: (city) => `Conception et développement de sites Web à ${city}`,
    designBody: (city) =>
      `Des sites Next.js sur mesure, pas des gabarits de constructeur de pages. Des temps de chargement rapides, des pages de services claires, une mise en page pensée pour le mobile et des parcours de conversion bâtis selon la façon dont la clientèle ${de(city)} fait ses demandes.`,
    designHome:
      "Que vous ayez besoin d’une refonte pour une entreprise de métiers, d’un site de services professionnels ou d’une vitrine pour un détaillant d’Airdrie, l’ingénierie et le design restent sous un même toit.",
    designCity: (city) =>
      `Nous travaillons avec les entreprises ${de(city)} depuis la base de DigiSol à Airdrie, avec les mêmes coordonnées et signaux du profil d’entreprise Google qui soutiennent le classement local.`,
    marketingHeading: (city) => `Marketing, SEO et campagnes payantes à ${city}`,
    marketingBody: (city, nearby) =>
      `SEO local pour la visibilité dans Google Maps et les résultats organiques, campagnes Google Ads et Meta géociblées sur ${city} et ${nearby}, plus l’optimisation des conversions pour que le trafic se transforme en appels réservés. Le travail hors page (citations, avis et nom, adresse et téléphone cohérents) fait partie du plan dès le départ.`,
    whyTitle: "Pourquoi les entreprises locales choisissent DigiSol",
    call: "Appelez au",
    orForm: "ou utilisez le formulaire ci-dessous pour une consultation stratégique gratuite",
    coffee: ". Un café à Airdrie? Avec plaisir.",
  },

  contact: {
    eyebrow: "Contact",
    browseFirst: "Vous préférez d’abord voir les forfaits?",
    seePricing: "Voir les tarifs DigiSol",
    otherWaysAria: "Autres façons de joindre DigiSol",
    talkNow: "Vous préférez parler maintenant?",
    nextTitle: "Les prochaines étapes",
    steps: [
      "Envoyez le formulaire, appelez ou textez. Vous parlez à Cameron, le fondateur, pas à un centre d’appels.",
      "Une consultation gratuite pour comprendre vos objectifs, votre clientèle et votre budget.",
      "Une soumission écrite claire, avec des forfaits à prix fixe. Sans engagement.",
    ],
    fullName: "Nom complet",
    namePlaceholder: "Alex Tremblay",
    business: "Nom de l’entreprise et site Web",
    businessPlaceholder: "Entreprise inc. — entreprise.ca",
    email: "Adresse courriel",
    phone: "Téléphone",
    phoneHint: "(facultatif, pour un rappel rapide)",
    service: "Service souhaité",
    selectService: "Choisissez un service",
    services: {
      design: "Conception de site Web",
      dev: "Développement Web sur mesure",
      marketing: "Marketing numérique",
      combined: "Design + développement + marketing",
    },
    details: "Détails du projet",
    detailsPlaceholder: "Objectifs, échéancier, outils actuels et ce à quoi ressemble le succès…",
    submit: "Demander une consultation gratuite",
    sending: "Envoi…",
    received: "Merci, votre message a bien été reçu.",
    error: (email, phone) =>
      `Un problème est survenu lors de l’envoi du formulaire. Écrivez à ${email} ou appelez au ${phone}.`,
  },

  quickQuote: {
    heading: "Obtenez une soumission gratuite",
    sub: "Donnez-nous l’essentiel. Vous recevrez une soumission claire, sans engagement.",
    name: "Votre nom",
    email: "Courriel",
    phone: "Téléphone (facultatif)",
    need: "De quoi avez-vous besoin?",
    options: {
      design: "Nouveau site Web",
      dev: "Application Web sur mesure",
      marketing: "SEO et marketing",
      combined: "Site Web + marketing",
    },
    submit: "Obtenir ma soumission gratuite",
    sending: "Envoi…",
    received: "Merci, votre message a bien été reçu.",
    error: (email, phone) => `Un problème est survenu. Écrivez à ${email} ou appelez au ${phone}.`,
  },

  contactOptions: {
    call: "Appeler",
    callNumber: (phone) => `Appeler au ${phone}`,
    text: "Texto",
    email: "Courriel",
    book: "Réserver un appel",
    bookDetail: "Choisissez le moment qui vous convient",
    chat: "Écrire à Kaylev",
    chatDetail: "Réponses instantanées, jour et nuit",
  },

  contactInfo: {
    founder: "Fondateur et PDG",
    credentials:
      "Développeur full stack certifié et spécialiste en marketing numérique et médias sociaux",
  },

  listings: {
    googleRating: "Note Google",
    leaveReview: "Laisser un avis Google",
    reviewAria: "Laisser un avis Google pour DigiSol",
  },

  mobileBar: {
    aria: "Joindre DigiSol",
    call: "Appeler",
    text: "Texto",
    quote: "Soumission",
  },

  geoBanner: {
    looking: (city) => `Vous cherchez DigiSol à ${city}?`,
    open: (city) => `Ouvrir la page ${de(city)}`,
    stay: "Rester sur l’accueil Alberta",
  },

  intlBanner: {
    unitedStates: "des États-Unis",
    outsideCanada: "de l’extérieur du Canada",
    visiting: (where) =>
      `Vous nous visitez ${where}? DigiSol bâtit des sites Web et des systèmes de croissance pour les entreprises de partout.`,
    seeHow: "Voir notre façon de travailler",
    cities: "Villes desservies en Alberta",
  },

  chat: {
    greetingAlberta: (name) => `Bonjour! Ici ${name}, l’IA de DigiSol. J’aide les entreprises de l’Alberta, et celles qui grandissent ailleurs, à colmater leurs fuites de conversion et à croître en ligne.

Vous avez un site Web? Donnez-moi l’adresse et je ferai un audit gratuit. Pas encore de site, ou des questions sur les coûts ou vos besoins? Je peux vous réserver une consultation gratuite avec Cameron : donnez-moi simplement votre courriel.`,
    greetingGeneral: (name) => `Bonjour! Ici ${name}, l’IA de DigiSol. Que vous soyez tout près ou loin d’ici, nous aidons les entreprises à colmater leurs fuites de conversion et à croître en ligne.

Vous avez un site Web? Donnez-moi l’adresse et je ferai un audit gratuit. Pas encore de site, ou des questions sur les coûts ou vos besoins? Je peux vous réserver une consultation gratuite avec Cameron : donnez-moi simplement votre courriel.`,
    panelAria: (name) => `Discussion avec ${name} de DigiSol`,
    subtitle: "Audit de site gratuit",
    close: "Fermer la discussion",
    working: "En cours",
    typing: (name) => `${name} écrit…`,
    error: "Un problème est survenu. Réessayez.",
    inputLabel: (name) => `Message à ${name}`,
    placeholder: "Écrivez ou utilisez le micro…",
    mic: "Micro",
    micStrings: {
      stop: "Arrêter",
      unsupported: "La dictée vocale fonctionne avec Chrome ou Edge.",
      blocked: "Autorisez le micro, puis réessayez.",
      failed: "Le micro n’a pas démarré.",
    },
    send: "Envoyer le message",
    hide: "Masquer",
    hideAria: (name) => `Masquer ${name}`,
    openAria: (name) => `Écrire à ${name}`,
  },

  about: {
    metaTitle: "À propos de Cameron Brown | Diplômes et certifications | DigiSol",
    metaDescription:
      "Découvrez Cameron Brown, fondateur de DigiSol : un changement de carrière de la tôlerie commerciale vers la conception Web, le développement full stack et le marketing numérique. Diplômé avec distinction du Sundance College, formation full stack chez Mimo et certifications HubSpot Academy.",
    ogTitle: "À propos de Cameron Brown | DigiSol",
    ogDescription:
      "Une passion pour le design, l’ingénierie et la croissance, avec des certifications HubSpot, un diplôme du Sundance College (avec distinction) et une formation full stack chez Mimo.",
    eyebrow: "À propos · Diplômes",
    photoAlt: (name) => `${name}, fondateur de DigiSol`,
    role: () => "Fondateur et PDG, DigiSol",
    bio: {
      headline: "Design, code et croissance, bâtis avec la même détermination sur le terrain",
      body: [
        "Je m’appelle Cameron Brown, fondateur de DigiSol à Airdrie. Après quinze ans comme installateur en tôlerie commerciale, j’ai fait un changement de carrière réfléchi vers le travail qui me tient le plus à cœur : concevoir des sites Web qui inspirent confiance, les programmer pour qu’ils performent et en faire la promotion pour que les entreprises albertaines soient trouvées.",
        "Ce parcours se reflète encore dans ma façon de travailler : mesurer deux fois, livrer du travail propre et assumer la finition. J’apporte la même intensité aux développements full stack, au SEO local, aux campagnes par courriel et sur les réseaux sociaux, et aux parcours de conversion qui transforment le trafic en consultations réservées.",
        "J’ai obtenu mon diplôme avec distinction du Sundance College (diplôme en marketing numérique et médias sociaux), j’ai suivi une formation en développement full stack chez Mimo et je continue d’accumuler les certifications HubSpot Academy pour que la stratégie et l’exécution restent à jour.",
      ],
      education: [
        {
          title: "Diplôme en marketing numérique et médias sociaux",
          school: "Sundance College",
          note: "Diplômé avec distinction",
        },
        {
          title: "Développement full stack",
          school: "Mimo",
          note: "Bases de l’ingénierie Web moderne",
        },
      ],
    },
    cta: "Réserver une consultation gratuite",
    certTitle: "Certificats et badges",
    certBody:
      "Certifications HubSpot Academy, ceintures Microsoft Word de SIMnet et documents à l’appui : les preuves derrière le savoir-faire DigiSol.",
  },

  credentials: {
    filtersAria: "Filtrer les diplômes",
    tabs: { all: "Tous", hubspot: "HubSpot", education: "Formation et outils" },
    openPdf: "Ouvrir le PDF",
    blurbs: {
      "hubspot-email": "Segmentation, délivrabilité, design et mesure.",
      "hubspot-inbound": "Contenu, promotion sur les réseaux sociaux, suivi des prospects et marketing client.",
      "hubspot-sales": "Stratégie de vente axée sur le marketing et outils d’accompagnement des ventes.",
      "hubspot-social": "Stratégie sociale inbound, engagement, politiques et rendement.",
      "simnet-purple": "Maîtrise avancée de Microsoft Word.",
      "simnet-white": "Maîtrise de base de Microsoft Word.",
      "simnet-yellow": "Certification Microsoft Word ceinture jaune de SIMnet (PDF).",
    },
  },

  confirmation: {
    metaTitle: "Confirmation | DigiSol",
    metaDescription: "Votre demande de consultation DigiSol a bien été reçue. Nous vous répondrons sous peu.",
    title: "Confirmation",
    lead: "Votre demande de consultation est bien enregistrée.",
    body: "Merci de nous avoir écrit. Cameron vous répondra à l’adresse courriel fournie, habituellement en un jour ouvrable.",
    back: "Retour à DigiSol",
  },

  pricingSuccess: {
    metaTitle: "Paiement reçu | DigiSol",
    metaDescription: "Merci d’avoir choisi DigiSol. Nous confirmerons la portée sous peu.",
    eyebrow: "Paiement Stripe terminé",
    title: "C’est confirmé",
    body: "Votre paiement a été accepté. Cameron vous écrira pour confirmer la portée, l’échéancier et le lancement de votre projet DigiSol.",
    ref: "Réf. :",
    back: "Retour à DigiSol",
    contact: "Contact",
  },

  pricingPage: {
    metaTitle: `Tarifs | DigiSol : sites Web sur mesure à partir de ${price("foundation")}, forfaits SEO et croissance`,
    metaDescription: `Des tarifs Web transparents pour les entreprises albertaines : sites sur mesure à partir de ${price("foundation")}, Moteur de croissance avec SEO local à ${price("growth")} et Entonnoir complet avec publicité à ${price("full_funnel")} (CAD, plus TPS). Comparez les forfaits, les échéanciers et la FAQ.`,
    ogTitle: `Tarifs DigiSol : sites Web sur mesure à partir de ${price("foundation")}`,
    shareAlt: "Forfaits de site Web, SEO et marketing DigiSol",
    cancelled: "Paiement annulé : ajustez votre sélection et réessayez quand vous voulez.",
    quoteHeading: "Vous hésitez entre les forfaits? Obtenez une soumission gratuite",
    quoteSub:
      "Donnez-nous l’essentiel. Vous recevrez une soumission claire, sans engagement, et vous pouvez demander une facturation 50/50.",
    introEyebrow: "Des prix transparents",
    introTitle: (from) => `Sites Web sur mesure à partir de ${from}`,
    introBody: (gst) =>
      `Des forfaits clairs pour le design, le développement, le SEO local et la publicité, avec tous les prix publiés. Aucun gabarit, aucune facture surprise. Prix en dollars canadiens, plus TPS de ${gst} %.`,
    compareCta: "Comparer les forfaits",
    quoteCta: "Soumission gratuite",
    valueAria: "Pourquoi DigiSol",
    valuePoints: [
      {
        title: "Un design sur mesure, jamais un gabarit",
        body: "Conçu autour de votre marque et de votre clientèle, puis développé en site Next.js rapide. Aucun constructeur de pages, aucun thème que tout le monde utilise déjà.",
      },
      {
        title: "En ligne en quelques semaines, pas en quelques mois",
        body: `Fondation se lance habituellement en ${timeline("foundation")} et Moteur de croissance en ${timeline("growth")}. Votre échéancier est confirmé par écrit avant le début des travaux.`,
      },
      {
        title: "Prospects suivis dès le premier jour",
        body: "Chaque formulaire alimente DigiSol Hub, avec des alertes instantanées, des courriels de suivi et une analytique qui montre ce qui fonctionne.",
      },
      {
        title: "Des prix publiés d’avance",
        body: `En dollars canadiens, plus TPS de ${ALBERTA_GST_PERCENT} %. Payez en entier au moment du paiement, ou 50 % au départ et 50 % au lancement.`,
      },
    ],
    compareEyebrow: "Les forfaits en un coup d’œil",
    compareTitle: "Ce que comprend chaque forfait",
    compareBody:
      "Chaque forfait comprend un design et un développement sur mesure. Les niveaux supérieurs ajoutent le SEO local, le suivi automatisé et la publicité payante.",
    swipe: "Faites glisser le tableau pour comparer les trois forfaits.",
    tableCaption: "Comparaison des forfaits de site Web DigiSol",
    packageHeader: "Forfait",
    oneTimePlusGst: "paiement unique, plus TPS",
    included: "Inclus",
    notIncluded: "Non inclus",
    rows: [
      { label: "Lancement habituel", cells: PRICING_PACKAGES.map((p) => timeline(p.id)) },
      { label: "Design sur mesure (pas un gabarit)", cells: [true, true, true] },
      { label: "Pages principales", cells: ["Jusqu’à 6", "Jusqu’à 6", "Jusqu’à 6"] },
      { label: "Développement rapide, pensé pour le mobile", cells: [true, true, true] },
      { label: "Formulaires et capture de prospects dans DigiSol Hub", cells: [true, true, true] },
      { label: "Google Analytics et suivi des conversions", cells: [true, true, true] },
      { label: "Données structurées d’entreprise locale", cells: [true, true, true] },
      { label: "Pages par ville ou par service", cells: [false, "Ensemble de départ", "Ensemble de départ"] },
      { label: "Profil d’entreprise Google et citations", cells: [false, true, true] },
      { label: "SEO local de départ", cells: [false, true, true] },
      { label: "Parcours de conversion (appels à l’action, formulaires, pages de remerciement)", cells: [false, true, true] },
      { label: "Suivi automatisé par courriel", cells: [false, true, true] },
      { label: "Configuration des campagnes Google Ads et Meta", cells: [false, false, true] },
      { label: "Pages d’atterrissage pour le trafic payant", cells: [false, false, true] },
      { label: "Tableau de bord des campagnes dans le Hub", cells: [false, false, true] },
      { label: "Revue stratégique trimestrielle", cells: [false, false, true] },
    ],
    compareFooterPre:
      "Choisissez un forfait, la croissance mensuelle et les modules dans le configurateur ci-dessous, ou",
    compareFooterLink: "obtenez une soumission gratuite",
    compareFooterPost: "si vous hésitez.",
    localEyebrow: "Comment nous nous comparons",
    localTitle: "Ce que coûte habituellement un site Web en Alberta",
    localBody:
      "Moteur de croissance comprend le SEO local et le suivi des prospects, habituellement facturés à part, à un prix inférieur à celui d’une agence typique.",
    localItems: [
      {
        option: "Constructeur de site à faire soi-même",
        price: "Environ 20 $ à 75 $ par mois",
        note: "Plus votre propre temps. Vous choisissez un gabarit et le configurez vous-même; le SEO, le suivi des prospects et les relances sont à votre charge.",
      },
      {
        option: "Pigiste ou configuration de gabarit",
        price: "Habituellement 1 500 $ à 8 000 $",
        note: "La qualité et la portée varient beaucoup. Le SEO local, un CRM et les campagnes publicitaires sont habituellement en sus, ou non offerts.",
      },
      {
        option: "Agence à services complets",
        price: "Habituellement 10 000 $ à 25 000 $ et plus",
        note: "Pour un site de 4 ou 5 pages. Vous obtenez une équipe, mais vous payez aussi ses frais généraux.",
      },
      {
        option: "Moteur de croissance DigiSol",
        price: `${price("growth")}, paiement unique`,
        note: "Design et développement sur mesure, SEO local et configuration du profil d’entreprise Google, et suivi automatisé des prospects, pour un seul prix publié.",
        highlight: true,
      },
    ],
    localNote:
      "Fourchettes typiques tirées de guides de prix 2026 pour Calgary et le Canada, avant taxes. Chaque projet est différent : comparez ce qui est inclus, pas seulement le prix.",
    faqEyebrow: "Questions",
    faqTitle: "FAQ sur les tarifs et le processus",
    faq: [
      {
        q: "Combien coûte un site Web avec DigiSol?",
        a: `Les sites sur mesure commencent à ${price("foundation")} avec Fondation. Moteur de croissance, qui ajoute le SEO local et le suivi automatisé, coûte ${price("growth")}. Entonnoir complet, qui ajoute la configuration des annonces Google et Meta, coûte ${price("full_funnel")}. Tous les prix sont en dollars canadiens, plus TPS de ${ALBERTA_GST_PERCENT} %.`,
      },
      {
        q: "Pourquoi payer pour un site sur mesure plutôt qu’un gabarit?",
        a: "Un gabarit est conçu pour tout le monde : il charge plus de code que nécessaire et ressemble à des milliers d’autres sites. Nous concevons autour de votre clientèle et bâtissons un site rapide, prêt à capter et à suivre les prospects dès le premier jour, pour qu’il rapporte ce qu’il coûte.",
      },
      {
        q: "Combien de temps faut-il pour un site Web?",
        a: `Les délais de lancement habituels sont de ${timeline("foundation")} pour Fondation, de ${timeline("growth")} pour Moteur de croissance et de ${timeline("full_funnel")} pour Entonnoir complet. Le compte à rebours commence au lancement du projet, une fois votre contenu, votre logo et vos accès reçus, et votre échéancier est confirmé par écrit avant le début des travaux.`,
      },
      {
        q: "Garantissez-vous votre travail?",
        a: `Oui, par écrit. ${guarantees.map((g) => `${g.title} : ${g.body}`).join(" ")} ${guaranteeFinePrint}`,
      },
      {
        q: "Comment puis-je payer?",
        a: `Payez en entier par carte grâce au paiement sécurisé Stripe sur cette page, ou demandez une facture pour payer 50 % au départ et 50 % au lancement. La TPS de ${ALBERTA_GST_PERCENT} % est ajoutée au paiement.`,
      },
      {
        q: "Y a-t-il des frais mensuels?",
        a: `DigiSol héberge et entretient votre site, ce qui est couvert par n’importe quel forfait mensuel : ${retainerList}. Vous lancez sans forfait mensuel? Demandez les options d’hébergement dans votre soumission. Le budget publicitaire est payé séparément à Google et à Meta.`,
      },
      {
        q: "Suis-je propriétaire de mon domaine et de mon contenu?",
        a: "Oui. Votre domaine, vos textes, votre logo et vos photos vous appartiennent. Nous hébergeons et entretenons le site pour qu’il reste rapide et sécuritaire.",
      },
      {
        q: "Que se passe-t-il après ma prise de contact?",
        a: "D’abord, une consultation gratuite sur vos objectifs, vos services et votre budget. Ensuite, vous recevez une soumission écrite avec la portée et l’échéancier. Nous concevons le site et vous l’approuvez avant le développement. Nous lançons avec le suivi en place, et vous pouvez ajouter un forfait mensuel pour le SEO, la publicité et le suivi continus.",
      },
      {
        q: "Puis-je commencer plus petit?",
        a: `Oui. Si vous avez déjà un site Web, DigiSol Hub seul coûte ${cad(PRICING_HUB[0].amount)} et ajoute le suivi des prospects et les relances. Des pages supplémentaires (${price("addon_pages")} pour 3) et des pages par ville (${price("addon_city")} pour 4) peuvent s’ajouter en tout temps.`,
      },
      {
        q: "Et si mon projet ne correspond à aucun forfait?",
        a: `Demandez une soumission gratuite et nous l’évaluerons. Les modules courants comprennent un catalogue de commerce en ligne ou de réservation (${price("addon_ecommerce")}) et un module d’application Web sur mesure pour les portails ou tableaux de bord (${price("addon_custom_app")}).`,
      },
    ],
  },

  pricingBuilder: {
    launchOffer: (code) => `Offre de lancement · code ${code}`,
    launchBody: (build, other) =>
      `${build} % de rabais sur la conception et le développement de site (Fondation, Moteur de croissance, Entonnoir complet) et ${other} % sur tout le reste : le Hub, les modules et le premier mois de tout forfait mensuel.`,
    launchWindow: "Du 2 au 31 octobre.",
    launchStarts: "Dès le 2 octobre",
    promoApplied: (code) => `${code} appliqué`,
    applyCode: (code) => `Appliquer ${code}`,
    perMonth: " / mois",
    oneTime: " paiement unique",
    pctOff: (pct, code, recurring) =>
      `${pct} % de rabais avec ${code}${recurring ? " (premier mois)" : ""}`,
    pctOffShort: (pct, recurring) => `${pct} % de rabais${recurring ? " le premier mois" : ""}`,
    typicalLaunch: (value) => `Lancement habituel : ${value}`,
    yourStack: "Votre sélection",
    selectSome: "Choisissez le Hub, un forfait mensuel ou un module.",
    promoLabel: "Code promo",
    apply: "Appliquer",
    promoSaves: (code, amount) => `${code} vous fait économiser ${amount}`,
    promoInvalid: (value) => `« ${value} » n’est pas un code promo valide.`,
    promoUpcoming: (code) => `${code} commence le 2 octobre.`,
    promoEnded: (code) => `${code} a pris fin le 31 octobre.`,
    oneTimeSubtotal: "Sous-total (paiement unique)",
    gst: (pct) => `TPS (${pct} %)`,
    firstMonth: "Premier mois",
    monthlySubtotal: "Sous-total mensuel",
    mo: "/mois",
    thenMonthly: (amount) => `Ensuite ${amount}/mois, TPS incluse`,
    workEmail: "Courriel professionnel",
    emailPlaceholder: "vous@entreprise.ca",
    company: "Entreprise",
    companyPlaceholder: "Votre entreprise",
    industry: "Secteur",
    industryPlaceholder: "Métiers, commerce de détail, clinique, hôtellerie…",
    cityIndustry: (city) => `Entreprises ${de(city)}`,
    notes: "Notes",
    notesPlaceholder: "Villes desservies, incontournables…",
    redirecting: "Redirection vers Stripe…",
    pay: "Payer en toute sécurité avec Stripe",
    consultFirst: "Je préfère une consultation d’abord",
    stripeNotReady:
      "Le paiement Stripe sera activé dès que les clés Stripe de DigiSol seront en place. Vous pouvez tout de même composer votre sélection : si le paiement est hors ligne, réservez une consultation et nous facturerons le même forfait.",
    stripeReady: (gst) =>
      `Paiement sécurisé Stripe · CAD · TPS de ${gst} % (Alberta) ajoutée au paiement · portée confirmée après le paiement.`,
    invoice: "Les forfaits de site Web peuvent aussi être payés 50 % au départ et 50 % au lancement, sur facture.",
    requestInvoice: "Demander une facture",
    seeGuarantee: "Voir la garantie",
    selectOne: "Choisissez au moins une option pour continuer.",
    checkoutUnavailable: "Paiement non disponible",
    checkoutFailed: "Le paiement a échoué",
    strongEyebrow: "Votre site a obtenu un bon score",
    strongTitle: "Tirez parti du trafic que vous avez déjà",
    strongBody:
      "Un bon audit n’exige pas d’abord une refonte. Voici les options du Hub, des forfaits mensuels et de croissance qui transforment un bon site en contrats. Un forfait de site complet reste offert en option au bas de la page.",
    hubHeading: "DigiSol Hub",
    retainersHeading: "Forfaits mensuels",
    retainersBody: "Croissance locale, publicité payante ou croissance complète. Choisissez-en un, ou passez.",
    noRetainer: "Aucun forfait mensuel",
    noRetainerBody: "Le Hub et les modules à paiement unique seulement.",
    addonsHeading: "Modules de croissance",
    addonsBody: "Pages supplémentaires, pages par ville et identité visuelle, ajoutées au site que vous avez déjà.",
    rebuildSummary:
      "Besoin d’une refonte complète? Ouvrez Fondation, Moteur de croissance et Entonnoir complet",
    noPackage: "Aucun forfait de site",
    noPackageBody: "Seulement le Hub, les forfaits mensuels et les modules.",
    defaultEyebrow: "Des prix qui s’adaptent",
    defaultTitle: "Composez le mandat dont votre secteur a besoin",
    defaultBody: (gst) =>
      `Choisissez un forfait de base, ajoutez un moteur de croissance mensuel si vous voulez du SEO ou de la publicité en continu, puis empilez des modules pour les villes, le commerce en ligne ou les applications sur mesure. La même force double de DigiSol (design, ingénierie et marketing) pour tous les secteurs de l’Alberta. Les prix affichés excluent la TPS de ${gst} %; la taxe est ajoutée au paiement Stripe.`,
    coreHeading: "1 · Forfait de base",
    monthlyHeading: "2 · Croissance mensuelle (facultatif)",
    launchOnly: "Lancement seulement",
    launchOnlyBody: "Aucun forfait mensuel : payez le développement et lancez vos campagnes plus tard.",
    modulesHeading: "3 · Modules d’expansion",
  },

  emails: frEmails,
};