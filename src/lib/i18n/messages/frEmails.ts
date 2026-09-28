import type { enEmails } from "@/lib/i18n/messages/enEmails";
import type { Widen } from "@/lib/i18n/types";

export const frEmails: Widen<typeof enEmails> = {
  auditSubject: (score, source, tier) => {
    if (source === "visitor_chat") {
      return tier === "strong"
        ? `Votre audit DigiSol : ${score}/100 (site solide) + DigiSol Hub`
        : `Votre audit de site DigiSol : ${score}/100`;
    }
    if (tier === "strong") return `Votre site obtient ${score}/100 : gardez vos acquis avec DigiSol Hub`;
    if (tier === "solid") return `Un coup d’œil rapide sur votre site Web (${score}/100)`;
    return "Quelques correctifs qui aideraient votre site Web";
  },
  auditOpener: (opts) => {
    const hi =
      opts.source === "visitor_chat"
        ? `Bonjour${opts.first ? ` ${opts.first}` : ""}, merci d’avoir demandé un audit de site DigiSol.`
        : `Bonjour${opts.first ? ` ${opts.first}` : ""}, j’ai jeté un coup d’œil rapide à votre site.`;
    if (opts.tier === "strong") {
      return `${hi} Bonne nouvelle : il obtient déjà un bon score (${opts.score}/100). L’occasion, maintenant, c’est de transformer ce trafic en contrats et de garder vos suivis bien organisés.`;
    }
    if (opts.tier === "solid") {
      return `${hi} Vous êtes en bonne posture (${opts.score}/100), avec quelques améliorations claires qui aideraient plus de visiteurs à passer à l’action.`;
    }
    return `${hi} Il y a une vraie marge d’amélioration dans la vitesse de chargement, le classement local et la conversion des visiteurs en appels.`;
  },
  defaultSummary: (url) => `DigiSol a analysé ${url} et a préparé un court suivi.`,
  fallbackWeaknessesStrong: [
    "Continuez de mesurer ce qui convertit (formulaires, appels, consultations réservées)",
    "Protégez la vitesse et la clarté sur mobile à mesure que vous ajoutez du contenu",
  ],
  fallbackWeaknesses: [
    "Clarifier l’appel à l’action principal",
    "Resserrer la vitesse des pages et les bases du SEO",
  ],
  strengthsHeading: "Ce qui fonctionne :",
  scoreFrame: (tier, score, url) =>
    tier === "strong"
      ? `<p><strong>Score :</strong> ${score}/100 pour ${url}, un excellent résultat. Un audit de ce niveau doit quand même créer de la valeur : DigiSol Hub garde vos prospects, vos séquences et vos suivis actifs pour que la force du site se transforme en rendez-vous.</p>`
      : tier === "solid"
        ? `<p><strong>Score rapide :</strong> ${score}/100 pour ${url} : une base solide, avec une courte liste d’améliorations qui rapportent habituellement en premier.</p>`
        : `<p><strong>Score rapide :</strong> ${score}/100 pour ${url} : voici ce que nous attaquerions en premier.</p>`,
  fixHeading: (tier) =>
    tier === "strong"
      ? "Gardez ces points à jour (même les bons sites glissent ici) :"
      : "Analyse : à corriger en premier :",
  hubPitch: (tier, pricingUrl) =>
    tier === "strong"
      ? `<p><strong>Votre site est en bonne forme : voici quoi faire avec ce trafic :</strong></p>
<ul>
<li><strong>DigiSol Hub</strong> : CRM, séquences de suivi et résultats de campagnes sur le site que vous avez déjà.</li>
<li><strong>Forfait Croissance locale, Publicité payante ou Croissance complète</strong> : SEO, publicité et suivi en continu.</li>
<li><strong>Pages supplémentaires et pages par ville</strong> : élargissez votre portée sans refonte complète.</li>
</ul>
<p><a href="${pricingUrl}">Voir le Hub, les forfaits mensuels et les options de croissance</a> (les refontes restent facultatives sur cette page).</p>`
      : tier === "needs_work"
        ? `<p>Commencez par la présentation d’audit ci-dessus, puis <a href="${pricingUrl}">consultez nos forfaits et tarifs</a> quand vous serez prêt à combler les lacunes.</p>`
        : `<p><a href="${pricingUrl}">Voir les tarifs DigiSol</a> : forfaits de site Web, Hub et croissance mensuelle.</p>`,
  videoIntro: "Regardez la présentation d’audit de site DigiSol",
  videoDetail: "(en anglais : ce que nous examinons en design, vitesse, SEO local et conversion) :",
  helpHeading: "Comment DigiSol peut vous aider (sans engagement) :",
  consultLine: (founder, title, strong) =>
    `Si vous voulez une présentation en direct, ${founder} (${title}) se fera un plaisir de vous rencontrer pour une courte consultation : aucune pression, simplement de la clarté sur ce qui ferait vraiment avancer les choses${strong ? " (y compris si le Hub seul est la bonne prochaine étape)" : " pour votre site"}.`,
  bookConsult: "Réserver une consultation",
  pricing: "Tarifs",
  casl: (source) =>
    source === "visitor_chat"
      ? "Vous recevez ce message parce que vous avez demandé un audit de site DigiSol."
      : "Vous recevez ce message parce que l’adresse courriel de votre entreprise est publiée sur votre site Web et que ce message concerne votre présence en ligne.",
  footer: "DigiSol · Alberta, Canada. Répondez à ce courriel pour vous désabonner en tout temps.",
  products: {
    hubWorkspace: {
      name: "Espace de travail DigiSol Hub",
      blurb:
        "Votre site est en bonne forme : le Hub transforme les visiteurs en prospects suivis, en séquences de suivi et en consultations réservées, sans une autre feuille de calcul.",
    },
    conversionPolish: {
      name: "Peaufinage des conversions",
      blurb:
        "De légers ajustements aux appels à l’action et aux formulaires pour qu’un bon site décroche plus de contrats avec le trafic que vous obtenez déjà.",
    },
    growthCoaching: {
      name: "Accompagnement de croissance continu",
      blurb:
        "Inscriptions, avis et séquences du Hub tenus à jour pour que le score reste élevé et que les prospects continuent d’avancer.",
    },
    foundation: {
      name: "Site Web Fondation",
      blurb:
        "Un site Next.js propre et rapide qui se charge bien sur mobile et envoie les prospects dans DigiSol Hub.",
    },
    localSeo: {
      name: "SEO local et visibilité",
      blurb:
        "Aidez la clientèle des environs à vous trouver : inscriptions, SEO sur la page et pages de services plus claires pour la recherche en Alberta.",
    },
    conversionPaths: {
      name: "Parcours de conversion",
      blurb:
        "Des appels à l’action, des formulaires et un suivi plus clairs pour que les visiteurs deviennent des rendez-vous.",
    },
    hub: {
      name: "DigiSol Hub",
      blurb:
        "Gardez vos contacts, vos courriels de suivi et vos relances après audit au même endroit pour que rien ne tombe entre les craques, même pendant l’amélioration du site.",
    },
  },
  consultSubject: "Votre consultation gratuite avec DigiSol",
  consultHi: (first) =>
    `Bonjour${first ? ` ${first}` : ""}, merci d’avoir discuté avec Kaylev sur le site de DigiSol.`,
  consultBody: (requirements, founder, title) =>
    `Vous avez demandé les prochaines étapes${requirements ? ` (${requirements})` : ""}, et vous n’avez pas à tout déterminer seul. ${founder} (${title}) offre une <strong>consultation gratuite</strong> : un court appel, sans pression, pour clarifier ce qui aiderait votre entreprise à croître en ligne.`,
  consultCta: "Réserver votre consultation gratuite",
  consultDirect: "Ou joignez Cameron directement :",
  consultCasl:
    "Vous recevez ce message parce que vous avez demandé une consultation DigiSol par l’entremise de Kaylev. DigiSol · Alberta, Canada. Répondez à ce courriel pour vous désabonner en tout temps.",
};
