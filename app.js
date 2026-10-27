"use strict";

// Configuration prospect : toutes les données fictives sont regroupées ici.
const CONFIG = {
  client: "Commune de Gibloux",
  title: "Gibloux · Police du feu",
  district: "Sarine",
  today: "2026-10-27",
  // Séance hebdomadaire de la police du feu : jeudi, 7 h – 8 h 30.
  seance: { day: 2, last: -5, time: "7 h – 8 h 30" },
  storageKey: "gibloux-police-feu-demo-v1",
  seed: 1752,
  contact: { name: "Ayoub Seddiki", company: "We Softwarez", email: "ayoub@wesoftwarez.com" },
  user: { role: "Spécialiste communal·e en protection incendie", short: "Spécialiste communal·e", initials: "SC" },
  villages: [
    "Corpataux",
    "Magnedens",
    "Farvagny-le-Grand",
    "Farvagny-le-Petit",
    "Grenilles",
    "Posat",
    "Rossens",
    "Vuisternens-en-Ogoz",
    "Estavayer-le-Gibloux",
    "Rueyres-Saint-Laurent",
    "Villarlod",
    "Villarsel-le-Gibloux",
  ],
  // Délais proposés par gravité, en jours (paramétrables, pas une prescription).
  delais: { grave: 10, important: 30, mineur: 60, rappel: 20, entendu: 10, decision: 30 },
};

// Règlement de l’ECAB du 20 juin 2018, art. 18 al. 1.
const RISK = {
  eleve: { label: "Risque élevé", years: 5 },
  faible: { label: "Risque faible", years: 10 },
};

// Directives de protection incendie AEAI 2015 citées dans les constats.
const AEAI = {
  "12-15": "Prévention des incendies et protection incendie organisationnelle",
  "15-15": "Distances de sécurité incendie, systèmes porteurs et compartiments coupe-feu",
  "16-15": "Voies d’évacuation et de sauvetage",
  "17-15": "Signalisation des voies d’évacuation, éclairage et alimentation de sécurité",
  "18-15": "Dispositifs d’extinction",
  "20-15": "Installations de détection d’incendie",
  "24-15": "Installations thermiques",
  "25-15": "Installations aérauliques",
  "26-15": "Matières dangereuses",
};

// Grille de contrôle sur place, regroupée par directive.
const CHECKLIST = [
  { ref: "16-15", group: "Voies d’évacuation", points: [
    { id: "ve1", q: "Voies d’évacuation libres de tout stockage", d: "Matériel stocké dans une voie d’évacuation" },
    { id: "ve2", q: "Portes de sortie ouvrables sans clé dans le sens de la fuite", d: "Porte de sortie verrouillée ou non ouvrable dans le sens de la fuite", sev: "grave" },
  ] },
  { ref: "15-15", group: "Compartimentage", points: [
    { id: "cp1", q: "Portes coupe-feu fermées et se refermant seules", d: "Porte coupe-feu maintenue ouverte ou ferme-porte défectueux" },
    { id: "cp2", q: "Traversées de câbles et de gaines obturées", d: "Traversée de câbles ou de gaine non obturée" },
  ] },
  { ref: "17-15", group: "Signalisation et éclairage de sécurité", points: [
    { id: "se1", q: "Signalisation des sorties visible et complète", d: "Signalisation des voies d’évacuation manquante ou masquée", sev: "mineur" },
    { id: "se2", q: "Éclairage de sécurité fonctionnel au test", d: "Éclairage de sécurité hors service au test" },
  ] },
  { ref: "18-15", group: "Dispositifs d’extinction", points: [
    { id: "ex1", q: "Extincteurs en place, accessibles et entretenus", d: "Extincteur manquant, inaccessible ou entretien échu", sev: "mineur" },
  ] },
  { ref: "24-15", group: "Installations thermiques", points: [
    { id: "th1", q: "Local de chauffage libre de tout entreposage", d: "Local de chauffage utilisé comme dépôt" },
    { id: "th2", q: "Dernier rapport du maître ramoneur sans remarque", d: "Remarque du maître ramoneur non levée" },
  ] },
  { ref: "26-15", group: "Matières dangereuses", points: [
    { id: "md1", q: "Gaz et liquides inflammables stockés de manière conforme", d: "Stockage non conforme de gaz ou de liquides inflammables" },
  ] },
  { ref: "20-15", group: "Détection d’incendie", onlyRisk: "eleve", points: [
    { id: "dt1", q: "Centrale de détection sans dérangement", d: "Installation de détection en dérangement", sev: "grave" },
  ] },
  { ref: "12-15", group: "Organisation", points: [
    { id: "or1", q: "Consignes et plans d’évacuation affichés", d: "Consignes ou plans d’évacuation absents", sev: "mineur" },
    { id: "or2", q: "Accès sapeurs-pompiers dégagés", d: "Accès sapeurs-pompiers obstrué" },
  ] },
];

const SEV = {
  grave: { label: "Grave", rank: 3 },
  important: { label: "Important", rank: 2 },
  mineur: { label: "Mineur", rank: 1 },
};

// Procédure communale après un contrôle (règlement ECAB, art. 19 let. g).
const STAGES = [
  { id: "brouillon", label: "Rapport à signer", short: "À signer" },
  { id: "rapport", label: "Rapport envoyé", short: "Délai en cours" },
  { id: "rappel", label: "Rappel", short: "Rappel" },
  { id: "entendu", label: "Droit d’être entendu", short: "Droit d’être entendu" },
  { id: "decision", label: "Décision", short: "Décision" },
  { id: "prefet", label: "Préfet", short: "Chez le préfet" },
  { id: "leve", label: "Levée confirmée", short: "Clos" },
];
const STAGE = Object.fromEntries(STAGES.map((s, k) => [s.id, { ...s, k }]));

/* ---------- Données ---------- */

// Bâtiments fictifs soumis au contrôle périodique (habitations individuelles exclues, art. 18 al. 2).
const BUILDINGS = [
  { id: "b01", v: "Farvagny-le-Grand", name: "Auberge du Tilleul", type: "Restaurant avec salle et chambres", risk: "eleve", owner: "Auberge du Tilleul Sàrl", street: "Route de l’Église 4" },
  { id: "b02", v: "Rossens", name: "Menuiserie Charrière", type: "Atelier de menuiserie", risk: "eleve", owner: "Menuiserie Charrière SA", street: "Zone artisanale 11" },
  { id: "b03", v: "Corpataux", name: "Immeuble Les Pommiers", type: "Immeuble locatif, 9 logements", risk: "faible", owner: "Gérance Sarine-Ouest SA", street: "Chemin des Pommiers 3" },
  { id: "b04", v: "Vuisternens-en-Ogoz", name: "Garage du Gibloux", type: "Garage et carrosserie", risk: "eleve", owner: "Garage du Gibloux Sàrl", street: "Route cantonale 27" },
  { id: "b05", v: "Villarlod", name: "Ferme En Craux", type: "Exploitation agricole avec rural", risk: "faible", owner: "Exploitation En Craux", street: "En Craux 2" },
  { id: "b06", v: "Estavayer-le-Gibloux", name: "Résidence Les Lilas", type: "Logements protégés pour aînés", risk: "eleve", owner: "Fondation Les Lilas", street: "Rue du Château 9" },
  { id: "b07", v: "Magnedens", name: "PPE Le Verger", type: "Propriété par étages, 12 lots", risk: "faible", owner: "Communauté PPE Le Verger", street: "Route du Verger 15" },
  { id: "b08", v: "Grenilles", name: "Salle polyvalente", type: "Salle de plus de 300 personnes", risk: "eleve", owner: "Commune de Gibloux", street: "Place du Village 1" },
  { id: "b09", v: "Rossens", name: "Immeuble La Croisée", type: "Immeuble mixte, commerce et 6 logements", risk: "faible", owner: "Immobilière La Croisée SA", street: "Route de Fribourg 40" },
  { id: "b10", v: "Posat", name: "Crèche Les Petits Pas", type: "Structure d’accueil de jour", risk: "eleve", owner: "Association Les Petits Pas", street: "Chemin de la Chapelle 2" },
  { id: "b11", v: "Farvagny-le-Petit", name: "Immeuble Le Belvédère", type: "Immeuble locatif, 14 logements", risk: "faible", owner: "Caisse de pension fictive", street: "Route du Belvédère 8" },
  { id: "b12", v: "Rueyres-Saint-Laurent", name: "Fromagerie", type: "Fromagerie et magasin", risk: "faible", owner: "Société de laiterie", street: "Route de la Fromagerie 1" },
  { id: "b13", v: "Farvagny-le-Grand", name: "Cycle d’orientation", type: "École secondaire", risk: "eleve", owner: "Association régionale fictive", street: "Route du Collège 20" },
  { id: "b14", v: "Corpataux", name: "École primaire", type: "École primaire", risk: "eleve", owner: "Commune de Gibloux", street: "Route de l’École 6" },
  { id: "b15", v: "Rossens", name: "Restaurant du Barrage", type: "Restaurant", risk: "eleve", owner: "Restaurant du Barrage SA", street: "Route du Lac 2" },
  { id: "b16", v: "Villarsel-le-Gibloux", name: "Rural Les Planches", type: "Rural avec stockage de fourrage", risk: "faible", owner: "Exploitation Les Planches", street: "Les Planches 5" },
  { id: "b17", v: "Vuisternens-en-Ogoz", name: "Immeuble Le Moulin", type: "Immeuble locatif, 8 logements", risk: "faible", owner: "PPE Le Moulin", street: "Chemin du Moulin 4" },
  { id: "b18", v: "Estavayer-le-Gibloux", name: "Église et cure", type: "Lieu de culte", risk: "faible", owner: "Paroisse", street: "Place de l’Église" },
  { id: "b19", v: "Farvagny-le-Grand", name: "Centre commercial", type: "Commerce de détail", risk: "eleve", owner: "Centre Farvagny SA", street: "Route de Bulle 30" },
  { id: "b20", v: "Magnedens", name: "Atelier de carrosserie", type: "Atelier avec cabine de peinture", risk: "eleve", owner: "Carrosserie Magnedens Sàrl", street: "Zone d’activités 3" },
  { id: "b21", v: "Grenilles", name: "Immeuble Les Sorbiers", type: "Immeuble locatif, 6 logements", risk: "faible", owner: "Gérance Sarine-Ouest SA", street: "Chemin des Sorbiers 2" },
  { id: "b22", v: "Rossens", name: "Hangar communal", type: "Dépôt de voirie", risk: "faible", owner: "Commune de Gibloux", street: "Route de la Voirie 1" },
  { id: "b23", v: "Posat", name: "Chapelle de Posat", type: "Lieu de culte", risk: "faible", owner: "Paroisse", street: "Posat" },
  { id: "b24", v: "Corpataux", name: "Local du feu", type: "Local des sapeurs-pompiers", risk: "faible", owner: "Commune de Gibloux", street: "Route de la Sarine 10" },
  { id: "b25", v: "Farvagny-le-Petit", name: "Scierie du Gibloux", type: "Scierie et stockage de bois", risk: "eleve", owner: "Scierie du Gibloux SA", street: "Route de la Scierie 7" },
  { id: "b26", v: "Villarlod", name: "Auberge communale", type: "Restaurant et salle de société", risk: "eleve", owner: "Commune de Gibloux", street: "Route principale 12" },
  { id: "b27", v: "Rueyres-Saint-Laurent", name: "Immeuble Le Clos", type: "Immeuble locatif, 5 logements", risk: "faible", owner: "Particulier", street: "Le Clos 3" },
  { id: "b28", v: "Estavayer-le-Gibloux", name: "Atelier mécanique", type: "Atelier agricole", risk: "faible", owner: "Particulier", street: "Route des Champs 6" },
  { id: "b29", v: "Rossens", name: "Immeuble Les Gentianes", type: "Immeuble locatif, 18 logements", risk: "faible", owner: "Gérance Sarine-Ouest SA", street: "Route des Gentianes 2" },
  { id: "b30", v: "Vuisternens-en-Ogoz", name: "Salle paroissiale", type: "Salle de réunion", risk: "faible", owner: "Paroisse", street: "Route de l’Église 2" },
  { id: "b31", v: "Magnedens", name: "Ferme Le Pré-Neuf", type: "Exploitation agricole avec rural", risk: "faible", owner: "Exploitation Le Pré-Neuf", street: "Le Pré-Neuf 1" },
  { id: "b32", v: "Farvagny-le-Grand", name: "Administration communale", type: "Bâtiment administratif", risk: "faible", owner: "Commune de Gibloux", street: "Route de l’Administration 2" },
  { id: "b33", v: "Grenilles", name: "Garage Les Râpes", type: "Garage", risk: "eleve", owner: "Garage Les Râpes Sàrl", street: "Les Râpes 4" },
  { id: "b34", v: "Villarsel-le-Gibloux", name: "Immeuble La Fontaine", type: "Immeuble locatif, 4 logements", risk: "faible", owner: "Particulier", street: "La Fontaine 1" },
  { id: "b35", v: "Corpataux", name: "Boulangerie du Pont", type: "Boulangerie avec four à bois", risk: "faible", owner: "Boulangerie du Pont Sàrl", street: "Route du Pont 5" },
  { id: "b36", v: "Posat", name: "Home de jour", type: "Accueil de jour pour aînés", risk: "eleve", owner: "Fondation fictive", street: "Chemin du Home 1" },
];

const MANIFS = [
  { id: "m1", name: "Loto de la société de jeunesse", place: "Salle polyvalente, Grenilles", date: 18, persons: 350, b: "b08" },
  { id: "m2", name: "Marché de Noël", place: "Place du village, Farvagny-le-Grand", date: 39, persons: 800, b: null },
];

const DAY = 86400000;
const TODAY = new Date(CONFIG.today + "T12:00:00");

function rng(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Dernier contrôle, EGID et prochain contrôle dû : reproductibles grâce à la graine.
function enrichBuildings() {
  const r = rng(CONFIG.seed);
  const fixed = { b01: -88, b02: -61, b03: -170, b04: -340, b05: -420, b06: -40, b07: -150, b08: -55, b10: -48, b15: -12, b20: -2, b25: -1890, b26: -1960, b11: -3700, b36: -1800, b33: -1700 };
  for (const b of BUILDINGS) {
    const span = RISK[b.risk].years * 365;
    b.last = fixed[b.id] ?? -Math.floor(r() * span * 1.04);
    b.next = b.last + span;
    b.egid = String(190000000 + Math.floor(r() * 899999));
  }
}

function seedDossiers() {
  const def = (title, ref, sev, loc, extra = {}) => ({ title, ref, sev, loc, status: "ouvert", ...extra });
  const h = (d, text, who = "Commune") => ({ d, text, who });
  const list = [
    {
      id: "PF-2026-018", b: "b01", control: -88, stage: "rapport", deadline: 4, source: "Contrôle périodique",
      defects: [
        def("Porte coupe-feu de la cuisine maintenue ouverte par une cale", "15-15", "important", "Rez · cuisine", {
          status: "preuve",
          proof: { d: -1, by: "Propriétaire", kind: "Photo", name: "porte-cuisine-fermee.jpg", note: "Cale retirée, ferme-porte réglé par le concierge." },
        }),
        def("Entretien des extincteurs échu", "18-15", "mineur", "Salle à manger et étage", {
          status: "preuve",
          proof: { d: -1, by: "Propriétaire", kind: "Attestation", name: "attestation-entretien-extincteurs.pdf", note: "Rapport d’entretien de l’entreprise, octobre 2026." },
        }),
        def("Signalisation de sortie manquante au 1er étage", "17-15", "mineur", "1er étage · couloir des chambres"),
      ],
      history: [h(-88, "Contrôle périodique effectué"), h(-85, "Rapport de contrôle envoyé, délai au " + "{d:4}"), h(-1, "Deux preuves déposées par le propriétaire", "Propriétaire")],
    },
    {
      id: "PF-2026-022", b: "b02", control: -61, stage: "rapport", deadline: -9, source: "Contrôle périodique",
      defects: [
        def("Copeaux et chutes de bois stockés devant la sortie de secours", "16-15", "important", "Atelier · sortie est"),
        def("Traversée de gaine d’aspiration non obturée", "15-15", "important", "Atelier · local de filtration"),
      ],
      history: [h(-61, "Contrôle périodique effectué"), h(-59, "Rapport de contrôle envoyé, délai au {d:-9}")],
    },
    {
      id: "PF-2026-009", b: "b03", control: -170, stage: "rappel", deadline: -6, source: "Contrôle périodique",
      defects: [
        def("Vélos et poussettes stockés dans la cage d’escalier", "16-15", "important", "Cage d’escalier · rez"),
        def("Porte du local de chauffage sans ferme-porte", "15-15", "important", "Sous-sol · chaufferie"),
      ],
      history: [h(-170, "Contrôle périodique effectué"), h(-168, "Rapport de contrôle envoyé"), h(-138, "Délai échu sans nouvelles"), h(-26, "Rappel envoyé, nouveau délai au {d:-6}")],
    },
    {
      id: "PF-2025-047", b: "b04", control: -340, stage: "entendu", deadline: -3, source: "Contrôle périodique",
      defects: [
        def("Bidons de solvants stockés hors armoire de sécurité", "26-15", "grave", "Atelier de carrosserie"),
        def("Extincteur de l’atelier absent", "18-15", "mineur", "Atelier de mécanique"),
      ],
      history: [h(-340, "Contrôle périodique effectué"), h(-338, "Rapport de contrôle envoyé"), h(-300, "Rappel envoyé"), h(-13, "Droit d’être entendu ouvert, observations attendues au {d:-3}"), h(-3, "Aucune observation reçue")],
    },
    {
      id: "PF-2025-031", b: "b05", control: -420, stage: "decision", deadline: -14, source: "Contrôle périodique",
      defects: [def("Dépôt de bois de chauffage contre la façade du rural", "15-15", "important", "Façade sud"), def("Accès sapeurs-pompiers obstrué par des machines agricoles", "12-15", "important", "Cour de ferme")],
      history: [h(-420, "Contrôle périodique effectué"), h(-418, "Rapport de contrôle envoyé"), h(-360, "Rappel envoyé"), h(-320, "Droit d’être entendu"), h(-44, "Décision communale notifiée, délai au {d:-14}"), h(-14, "Délai de la décision échu, travaux non exécutés")],
    },
    {
      id: "PF-2026-027", b: "b06", control: -40, stage: "rapport", deadline: 5, source: "Contrôle périodique avec l’ECAB",
      prolongation: { d: -2, days: 60, reason: "L’entreprise d’installation de détection ne peut intervenir qu’en décembre. Devis signé joint." },
      defects: [def("Installation de détection en dérangement au 2e étage", "20-15", "grave", "2e étage · couloir"), def("Éclairage de sécurité hors service au test", "17-15", "important", "Cage d’escalier B")],
      history: [h(-40, "Contrôle périodique effectué avec l’Inspection cantonale du feu"), h(-38, "Rapport de contrôle envoyé, délai au {d:5}"), h(-2, "Demande de prolongation de 60 jours", "Propriétaire")],
    },
    {
      id: "PF-2026-030", b: "b07", control: -150, stage: "entendu", deadline: 3, source: "Contrôle périodique",
      observations: { d: -1, text: "La communauté des propriétaires a voté les travaux d’obturation lors de l’assemblée du 20 octobre. L’entreprise interviendra la semaine du 16 novembre. Nous demandons de pouvoir terminer à cette date." },
      defects: [def("Traversées de câbles non obturées dans les caves", "15-15", "important", "Sous-sol · caves")],
      history: [h(-150, "Contrôle périodique effectué"), h(-148, "Rapport de contrôle envoyé"), h(-100, "Rappel envoyé"), h(-7, "Droit d’être entendu ouvert, observations attendues au {d:3}"), h(-1, "Observations reçues", "Propriétaire")],
    },
    {
      id: "PF-2026-033", b: "b08", control: -55, stage: "rapport", deadline: 21, source: "Contrôle périodique",
      defects: [def("Chaises empilées dans le dégagement de la scène", "16-15", "important", "Scène · dégagement arrière"), def("Plan d’évacuation absent dans le hall", "12-15", "mineur", "Hall d’entrée")],
      history: [h(-55, "Contrôle périodique effectué"), h(-53, "Rapport transmis au service des bâtiments communaux, délai au {d:21}")],
    },
    {
      id: "PF-2026-035", b: "b35", control: -16, stage: "rapport", deadline: -2, source: "Annonce du maître ramoneur", interdiction: -16,
      defects: [def("Fissures dans le conduit de fumée du four à bois", "24-15", "grave", "Fournil")],
      history: [h(-17, "Annonce du maître ramoneur : conduit fissuré", "Maître ramoneur"), h(-16, "Interdiction de faire du feu prononcée (art. 47 LECAB)"), h(-15, "Rapport envoyé, délai au {d:-2}")],
    },
    {
      id: "PF-2026-012", b: "b10", control: -48, stage: "rapport", deadline: 12, source: "Contrôle périodique",
      defects: [
        def("Poussettes stockées dans le couloir d’évacuation", "16-15", "important", "Rez · couloir", { status: "leve", proof: { d: -20, by: "Propriétaire", kind: "Photo", name: "couloir-degage.jpg" } }),
        def("Consignes d’évacuation non affichées", "12-15", "mineur", "Salle de jeux", { status: "leve", proof: { d: -9, by: "Propriétaire", kind: "Photo", name: "consignes-affichees.jpg" } }),
      ],
      history: [h(-48, "Contrôle périodique effectué"), h(-46, "Rapport de contrôle envoyé"), h(-19, "Premier défaut levé"), h(-8, "Second défaut levé, toutes les preuves validées")],
    },
    {
      id: "PF-2026-036", b: "b20", control: -2, stage: "brouillon", deadline: null, source: "Contrôle périodique",
      defects: [def("Filtre de la cabine de peinture encrassé", "25-15", "important", "Cabine de peinture"), def("Bonbonnes de gaz stockées au sous-sol", "26-15", "grave", "Sous-sol")],
      history: [h(-2, "Contrôle périodique effectué, rapport à signer")],
    },
    {
      id: "PF-2026-034", b: "b15", control: -12, stage: "rapport", deadline: 18, source: "Contrôle périodique",
      defects: [def("Éclairage de sécurité hors service au test", "17-15", "important", "Terrasse couverte · sortie"), def("Extincteur de la cuisine inaccessible", "18-15", "mineur", "Cuisine")],
      history: [h(-12, "Contrôle périodique effectué"), h(-10, "Rapport de contrôle envoyé, délai au {d:18}")],
    },
    {
      id: "PF-2025-052", b: "b11", control: -230, stage: "prefet", deadline: null, source: "Contrôle sporadique",
      defects: [def("Galetas utilisé comme dépôt de meubles combustibles", "16-15", "important", "Combles")],
      history: [h(-230, "Contrôle sporadique effectué"), h(-228, "Rapport de contrôle envoyé"), h(-190, "Rappel envoyé"), h(-150, "Droit d’être entendu"), h(-120, "Décision communale notifiée"), h(-60, "Requête au préfet de la Sarine (art. 48 LECAB)"), h(-21, "Le préfet a ordonné les travaux, délai fixé au 30.11.2026", "Préfecture")],
    },
  ];
  for (const ds of list) {
    ds.history = ds.history.map((x) => ({ ...x, text: x.text.replace(/\{d:(-?\d+)\}/, (_, n) => fmtDate(Number(n))) }));
    ds.sibat = { control: ds.stage !== "brouillon" && ds.id !== "PF-2026-034", levee: false };
  }
  return list;
}

/* ---------- État ---------- */

function freshState() {
  return { v: 1, dossiers: seedDossiers(), plans: {}, pv: [], manifs: {}, introSeen: false, drafts: {}, done: {} };
}
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(CONFIG.storageKey));
    if (s && s.v === 1 && Array.isArray(s.dossiers)) return s;
  } catch {
    /* état illisible : on repart de la démonstration */
  }
  return freshState();
}
function saveState() {
  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(STATE));
    return true;
  } catch {
    return false;
  }
}

/* ---------- Utilitaires ---------- */

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const dateOf = (d) => new Date(TODAY.getTime() + d * DAY);
function fmtDate(d) {
  const x = dateOf(d);
  return `${String(x.getDate()).padStart(2, "0")}.${String(x.getMonth() + 1).padStart(2, "0")}.${x.getFullYear()}`;
}
const fmtShort = (d) => fmtDate(d).slice(0, 5);
const fmtLong = (d) => dateOf(d).toLocaleDateString("fr-CH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fmtDay = (d) => dateOf(d).toLocaleDateString("fr-CH", { weekday: "long", day: "numeric", month: "long" });
const yearOf = (d) => dateOf(d).getFullYear();
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;
function relDay(d) {
  if (d === 0) return "aujourd’hui";
  if (d === -1) return "hier";
  if (d === 1) return "demain";
  if (Math.abs(d) > 400) {
    const y = Math.round(Math.abs(d) / 365);
    return d < 0 ? `il y a ${y} ans` : `dans ${y} ans`;
  }
  return d < 0 ? `il y a ${-d} j` : `dans ${d} j`;
}
const building = (id) => BUILDINGS.find((b) => b.id === id);
const dossier = (id) => STATE.dossiers.find((d) => d.id === id);
const isClosed = (ds) => ds.stage === "leve";
const openDefects = (ds) => ds.defects.filter((x) => x.status !== "leve");
const allLifted = (ds) => ds.defects.every((x) => x.status === "leve");
const overdue = (ds) => !isClosed(ds) && ds.deadline !== null && ds.deadline < 0 && ds.stage !== "prefet";
const maxSev = (ds) => openDefects(ds).reduce((m, x) => (SEV[x.sev].rank > SEV[m].rank ? x.sev : m), "mineur");
function controlStatus(b) {
  const plan = STATE.plans[b.id];
  if (plan !== undefined) return { k: "plan", label: `Planifié le ${fmtShort(plan)}`, level: "info" };
  if (b.next < 0) return { k: "late", label: `En retard de ${relDay(b.next).replace("il y a ", "")}`, level: "crit" };
  if (b.next <= 120) return { k: "soon", label: `À planifier · ${fmtDate(b.next)}`, level: "warn" };
  return { k: "ok", label: `Prochain : ${yearOf(b.next)}`, level: "good" };
}
function nextStep(ds) {
  if (isClosed(ds)) return null;
  if (ds.stage === "brouillon") return { a: "sign", label: "Signer et envoyer le rapport" };
  if (allLifted(ds)) return { a: "close", label: "Confirmer la levée par écrit" };
  if (ds.stage === "prefet") return null;
  if (!overdue(ds) && !(ds.stage === "entendu" && ds.observations)) return null;
  return {
    rapport: { a: "rappel", label: "Envoyer un rappel" },
    rappel: { a: "entendu", label: "Ouvrir le droit d’être entendu" },
    entendu: { a: "decision", label: "Rendre une décision" },
    decision: { a: "prefet", label: "Requérir le préfet (art. 48 LECAB)" },
  }[ds.stage];
}
function log(ds, text, who = "Commune") {
  ds.history.push({ d: 0, text, who });
}
function pv(text) {
  STATE.pv.push({ text, t: Date.now() });
}

/* ---------- Icônes ---------- */

const ICONS = {
  flame: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.6 1.2 2.5 2 2.8C10.5 9 11 6 12 3z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  building: '<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M2 21h20M8 8h3M8 12h3M8 16h3"/>',
  route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h8"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  back: '<path d="m15 6-6 6 6 6"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  alert: '<path d="M12 3.5 2.5 20h19zM12 10v4.5M12 17.2h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  doc: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13h6M9 17h4"/>',
  send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>',
  print: '<path d="M7 9V3h10v6M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M7 14h10v7H7z"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
  gavel: '<path d="m14 6 4 4M9 11l4 4M11.5 8.5l5-5 4 4-5 5zM3 21l7-7M2 21h9"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  database: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  reset: '<path d="M4 4v6h6M4.5 15a8 8 0 1 0 1.9-8.3L4 10"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m5.7 5.7 12.6 12.6"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
};
const ic = (n, c = "") => `<svg class="ic ${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

/* ---------- Composants ---------- */

const sevTag = (sev) => `<span class="sev sev-${sev}">${SEV[sev].label}</span>`;
const aeai = (ref) => `<span class="aeai" title="Directive AEAI ${ref} : ${esc(AEAI[ref])}">AEAI ${ref}</span>`;
const riskTag = (r) => `<span class="risk risk-${r}">${RISK[r].label} · ${RISK[r].years} ans</span>`;
function pill(level, text, icon) {
  const i = icon || (level === "good" ? "check" : level === "info" ? "calendar" : level === "warn" ? "clock" : "alert");
  return `<span class="pill pill-${level}">${ic(i)}${esc(text)}</span>`;
}
function stagePill(ds) {
  if (isClosed(ds)) return pill("good", "Clos");
  if (ds.stage === "brouillon") return pill("info", "Rapport à signer", "doc");
  if (ds.stage === "prefet") return pill("crit", "Chez le préfet", "gavel");
  if (overdue(ds)) return pill("crit", { rapport: "Délai échu", rappel: "Rappel échu", entendu: "Observations échues", decision: "Décision échue" }[ds.stage]);
  return pill(ds.stage === "rapport" ? "good" : "warn", STAGE[ds.stage].short, ds.stage === "rapport" ? "clock" : "alert");
}
function deadlineCell(ds) {
  if (isClosed(ds)) return `<span class="dl"><b>Clos</b></span>`;
  if (ds.deadline === null) return `<span class="dl"><b>—</b><small>${ds.stage === "prefet" ? "délai du préfet" : "pas encore envoyé"}</small></span>`;
  const late = ds.deadline < 0;
  return `<span class="dl ${late ? "late" : ""}"><b>${fmtShort(ds.deadline)}</b><small>${late ? `échu ${relDay(ds.deadline)}` : relDay(ds.deadline)}</small></span>`;
}

function stepper(ds) {
  const order = ["rapport", "rappel", "entendu", "decision", "prefet"];
  const cur = isClosed(ds) ? -1 : ds.stage === "brouillon" ? -0.5 : order.indexOf(ds.stage);
  return `<ol class="stepper" aria-label="Étapes de la procédure">
    <li class="${cur >= 0 || isClosed(ds) ? "done" : "now"}"><i></i><span>Contrôle</span></li>
    ${order
      .map((s, k) => {
        const cls = isClosed(ds) ? (k <= maxReached(ds) ? "done" : "skip") : k < cur ? "done" : k === cur ? (overdue(ds) ? "now late" : "now") : "";
        return `<li class="${cls}"><i></i><span>${STAGE[s].label}</span></li>`;
      })
      .join("")}
    <li class="${isClosed(ds) ? "done end" : "end"}"><i></i><span>Levée</span></li>
  </ol>`;
}
function maxReached(ds) {
  const order = ["rapport", "rappel", "entendu", "decision", "prefet"];
  let m = 0;
  for (const h of ds.history) {
    if (/Rappel/.test(h.text)) m = Math.max(m, 1);
    if (/Droit d’être entendu/.test(h.text)) m = Math.max(m, 2);
    if (/Décision/.test(h.text)) m = Math.max(m, 3);
    if (/préfet/.test(h.text)) m = Math.max(m, 4);
  }
  return Math.min(m, order.length - 1);
}

function dossierRow(ds, opts = {}) {
  const b = building(ds.b);
  const open = openDefects(ds);
  const proofs = ds.defects.filter((x) => x.status === "preuve").length;
  return `<a class="drow" href="#/dossiers/${ds.id}">
    <span class="drow-main">
      <b>${esc(b.name)}</b><small>${esc(b.v)} · ${esc(b.type)}</small>
      <span class="drow-meta"><span class="ref">${ds.id}</span>${riskTag(b.risk)}${open.length ? sevTag(maxSev(ds)) : ""}${proofs ? `<span class="flag info">${plural(proofs, "preuve à valider", "preuves à valider")}</span>` : ""}${ds.prolongation ? `<span class="flag">Prolongation demandée</span>` : ""}${ds.interdiction !== undefined && !isClosed(ds) ? `<span class="flag crit">${ic("ban")}Interdiction de faire du feu</span>` : ""}</span>
    </span>
    <span class="drow-def"><b>${open.length}</b><small>${open.length > 1 ? "défauts ouverts" : "défaut ouvert"} sur ${ds.defects.length}</small></span>
    <span class="drow-stage">${stagePill(ds)}</span>
    <span class="drow-dl">${deadlineCell(ds)}</span>
    ${opts.noChev ? "" : ic("chevron", "chev")}
  </a>`;
}

function emptyState(title, text) {
  return `<div class="empty">${ic("check")}<b>${esc(title)}</b><p>${esc(text)}</p></div>`;
}
function pageHead(kicker, title, sub = "", actions = "") {
  return `<div class="page-head"><div><p class="kicker">${kicker}</p><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ""}</div>${actions ? `<div class="head-actions">${actions}</div>` : ""}</div>`;
}

/* ---------- Coquille ---------- */

const NAV = [
  { id: "", label: "Séance du jeudi", short: "Séance", icon: "calendar", count: () => agenda().total, crit: true },
  { id: "dossiers", label: "Dossiers", short: "Dossiers", icon: "folder", count: () => STATE.dossiers.filter((d) => !isClosed(d)).length },
  { id: "batiments", label: "Bâtiments", short: "Bâtiments", icon: "building" },
  { id: "planification", label: "Planification", short: "Planifier", icon: "route", count: () => BUILDINGS.filter((b) => controlStatus(b).k === "late").length, warn: true },
];

function shell(route, content) {
  const cur = route.split("/")[0];
  return `<div class="app">
    <aside class="side" aria-label="Navigation principale">
      <div class="brand"><span class="mark" aria-hidden="true">${ic("flame")}</span><span><b>Gibloux</b><small>Police du feu</small></span></div>
      <button class="side-search" type="button" data-action="search">${ic("search")}<span>Rechercher</span><kbd>⌘K</kbd></button>
      <nav class="nav">
        ${NAV.map((n) => {
          const c = n.count ? n.count() : 0;
          return `<a class="nav-i" href="#/${n.id}" ${cur === n.id ? 'aria-current="page"' : ""}>${ic(n.icon)}<span>${n.label}</span>${c ? `<em class="cnt ${n.crit ? "info" : n.warn ? "warn" : ""}">${c}</em>` : ""}</a>`;
        }).join("")}
      </nav>
      <div class="side-card">
        <span class="side-label">Sur le terrain</span>
        <a class="nav-i" href="#/controle/b13">${ic("phone")}<span>Contrôle sur place</span></a>
        <a class="nav-i" href="#/proprietaire/PF-2026-018">${ic("user")}<span>Espace propriétaire</span></a>
      </div>
      <div class="sources">
        <a class="source-row" href="#/principe"><i class="sw sw-sibat" aria-hidden="true"></i><span><b>SIBAT · ECAB</b><small>${plural(STATE.dossiers.filter(sibatPending).length, "saisie à reporter", "saisies à reporter")}</small></span></a>
        <a class="nav-i small" href="#/principe" ${cur === "principe" ? 'aria-current="page"' : ""}>${ic("info")}<span>Comment ça fonctionne</span></a>
      </div>
      <div class="me"><span class="avatar">${CONFIG.user.initials}</span><span><b>${esc(CONFIG.user.short)}</b><small>Accrédité·e ECAB · Gibloux</small></span></div>
    </aside>
    <header class="topbar">
      <a class="brand" href="#/"><span class="mark" aria-hidden="true">${ic("flame")}</span><span><b>Gibloux</b><small>Police du feu</small></span></a>
      <button class="icon-btn" type="button" data-action="search" aria-label="Rechercher">${ic("search")}</button>
      <a class="icon-btn" href="#/principe" aria-label="Comment ça fonctionne">${ic("info")}</a>
    </header>
    <main id="main" tabindex="-1">
      <div class="demo-bar"><span>${ic("info")}Maquette · bâtiments, propriétaires et dossiers fictifs</span><button type="button" data-action="reset">Réinitialiser</button></div>
      ${content}
      <footer class="foot">Une maquette imaginée par ${esc(CONFIG.contact.company)} · <a href="mailto:${CONFIG.contact.email}">${CONFIG.contact.email}</a></footer>
    </main>
    <nav class="tabbar" aria-label="Navigation">
      ${NAV.map((n) => `<a href="#/${n.id}" ${cur === n.id ? 'aria-current="page"' : ""}>${ic(n.icon)}<span>${n.short}</span></a>`).join("")}
      <a href="#/controle/b13" ${cur === "controle" ? 'aria-current="page"' : ""}>${ic("phone")}<span>Contrôle</span></a>
    </nav>
  </div>`;
}
const sibatPending = (ds) => (ds.stage !== "brouillon" && !ds.sibat.control) || (isClosed(ds) && !ds.sibat.levee);

/* ---------- Séance du jeudi ---------- */

function agenda() {
  const open = STATE.dossiers.filter((d) => !isClosed(d));
  const a = {
    sign: open.filter((d) => d.stage === "brouillon"),
    proofs: open.filter((d) => d.defects.some((x) => x.status === "preuve")),
    prolong: open.filter((d) => d.prolongation),
    obs: open.filter((d) => d.stage === "entendu" && d.observations),
    steps: open.filter((d) => {
      const n = nextStep(d);
      return n && ["rappel", "entendu", "decision", "prefet"].includes(n.a) && !(d.stage === "entendu" && d.observations);
    }),
    close: open.filter((d) => d.stage !== "brouillon" && allLifted(d)),
    plan: BUILDINGS.filter((b) => ["late", "soon"].includes(controlStatus(b).k)),
    manifs: MANIFS.filter((m) => !STATE.manifs[m.id]),
  };
  a.total = a.sign.length + a.proofs.length + a.prolong.length + a.obs.length + a.steps.length + a.close.length + a.manifs.length;
  return a;
}

function viewSeance() {
  const a = agenda();
  const open = STATE.dossiers.filter((d) => !isClosed(d));
  const late = open.filter(overdue);
  const lateCtl = BUILDINGS.filter((b) => controlStatus(b).k === "late");
  const sd = CONFIG.seance.day;
  const sec = (id, icon, title, sub, items, body) =>
    items.length ? `<section class="ag" id="ag-${id}"><div class="ag-h">${ic(icon)}<div><h2>${title}<em>${items.length}</em></h2><p>${sub}</p></div></div><div class="ag-list">${body}</div></section>` : "";
  return `${pageHead(`Séance de la police du feu · ${cap(fmtDay(sd))}, ${CONFIG.seance.time}`, "Ordre du jour préparé.", `Tout ce qui demande une décision depuis la séance du ${fmtDate(CONFIG.seance.last)}, avec le courrier prêt.`, `<button type="button" class="btn ghost" data-action="print">${ic("print")}Imprimer l’ordre du jour</button>`)}
  ${STATE.introSeen ? "" : intro()}
  <section class="kpis" aria-label="Indicateurs">
    <a class="kpi" href="#/dossiers"><span class="kpi-l">Dossiers ouverts</span><b>${open.length}</b><span class="kpi-s">${open.reduce((n, d) => n + openDefects(d).length, 0)} défauts à lever</span></a>
    <a class="kpi kpi-crit" href="#/dossiers?f=echus"><span class="kpi-l">${ic("alert")}Délais échus</span><b>${late.length}</b><span class="kpi-s">à faire avancer cette semaine</span></a>
    <a class="kpi kpi-info" href="#ag-proofs"><span class="kpi-l">${ic("upload")}Preuves reçues</span><b>${a.proofs.reduce((n, d) => n + d.defects.filter((x) => x.status === "preuve").length, 0)}</b><span class="kpi-s">déposées en ligne par les propriétaires</span></a>
    <a class="kpi kpi-warn" href="#/planification"><span class="kpi-l">${ic("route")}Contrôles en retard</span><b>${lateCtl.length}</b><span class="kpi-s">sur ${BUILDINGS.length} bâtiments soumis</span></a>
  </section>
  <div class="seance">
    <div class="ag-col">
      ${sec("sign", "doc", "Rapports de contrôle à signer", "Contrôles effectués cette semaine : le rapport est rédigé, il reste à le valider.", a.sign, a.sign.map(agSign).join(""))}
      ${sec("proofs", "upload", "Preuves reçues à valider", "Déposées par les propriétaires depuis leur lien personnel.", a.proofs, a.proofs.map(agProofs).join(""))}
      ${sec("prolong", "clock", "Demandes de prolongation", "À accorder ou refuser, avec un nouveau délai.", a.prolong, a.prolong.map(agProlong).join(""))}
      ${sec("obs", "people", "Observations reçues · droit d’être entendu", "À examiner avant de rendre une décision.", a.obs, a.obs.map(agObs).join(""))}
      ${sec("steps", "gavel", "Délais échus · étape suivante", "Rappel, droit d’être entendu, décision ou requête au préfet : le courrier est prêt.", a.steps, a.steps.map(agStep).join(""))}
      ${sec("close", "check", "Levées à confirmer par écrit", "Tous les défauts sont levés : confirmation au propriétaire et report dans SIBAT.", a.close, a.close.map(agClose).join(""))}
      ${sec("manifs", "people", "Manifestations · protection incendie", "Préavis à donner avant les manifestations à venir.", a.manifs, a.manifs.map(agManif).join(""))}
      ${a.total ? "" : emptyState("Ordre du jour vide", "Tous les points ont été traités.")}
      <section class="ag ag-plan">
        <div class="ag-h">${ic("route")}<div><h2>Contrôles périodiques à planifier<em>${a.plan.length}</em></h2><p>Échus ou dus d’ici quatre mois, sans date fixée.</p></div><a class="link" href="#/planification">Planifier ${ic("chevron")}</a></div>
        <div class="chips-row">${villageSummary(a.plan)}</div>
      </section>
    </div>
    <aside class="pv" aria-label="Procès-verbal">
      <div class="pv-h"><h2>Procès-verbal</h2><span>${fmtDate(sd)}</span></div>
      ${STATE.pv.length ? `<ol class="pv-list">${STATE.pv.map((p) => `<li>${esc(p.text)}</li>`).join("")}</ol>` : `<p class="pv-empty">Chaque décision prise dans l’ordre du jour s’inscrit ici automatiquement.</p>`}
      <div class="pv-a"><button type="button" class="btn ghost small" data-action="pv-copy" ${STATE.pv.length ? "" : "disabled"}>${ic("copy")}Copier le PV</button></div>
    </aside>
  </div>`;
}

function intro() {
  return `<section class="intro" aria-label="Principe">
    <div class="intro-steps" aria-hidden="true">
      <span>${ic("phone")}<b>Contrôle</b><small>sur place, sur téléphone</small></span>
      <span>${ic("send")}<b>Rapport</b><small>envoyé avec un lien</small></span>
      <span>${ic("upload")}<b>Preuves</b><small>déposées par le propriétaire</small></span>
      <span>${ic("gavel")}<b>Séance</b><small>décisions du jeudi</small></span>
    </div>
    <div class="intro-t">
      <h2>Chaque défaut suivi jusqu’à sa levée. SIBAT reste la référence de l’ECAB.</h2>
      <p>Le jeudi matin, l’ordre du jour se prépare seul : preuves reçues, délais échus, prolongations demandées. Chaque décision produit son courrier et s’inscrit au procès-verbal.</p>
      <div class="intro-a"><a class="btn primary" href="#ag-proofs">Commencer par les preuves reçues</a><button class="btn ghost" type="button" data-action="intro-close">Masquer</button></div>
    </div>
  </section>`;
}

function agHead(ds, extra = "") {
  const b = building(ds.b);
  return `<div class="agi-h"><a href="#/dossiers/${ds.id}"><b>${esc(b.name)}</b><small>${esc(b.v)} · <span class="ref">${ds.id}</span> · ${esc(b.owner)}</small></a>${extra}</div>`;
}
function agSign(ds) {
  return `<article class="agi">${agHead(ds, pill("info", "Contrôle du " + fmtShort(ds.control), "doc"))}
    <ul class="mini-def">${ds.defects.map((x) => `<li>${sevTag(x.sev)}<span>${esc(x.title)}</span>${aeai(x.ref)}</li>`).join("")}</ul>
    <div class="agi-a"><button type="button" class="btn ghost small" data-letter="rapport" data-id="${ds.id}">${ic("doc")}Voir le rapport</button><button type="button" class="btn primary small" data-step="sign" data-id="${ds.id}">${ic("send")}Signer et envoyer · délai ${fmtShort(deadlineFor(ds))}</button></div>
  </article>`;
}
function agProofs(ds) {
  return `<article class="agi">${agHead(ds, deadlineCell(ds))}
    ${ds.defects
      .filter((x) => x.status === "preuve")
      .map((x) => {
        const k = ds.defects.indexOf(x);
        return `<div class="proof">
          <div class="proof-f">${proofThumb(x.proof)}</div>
          <div class="proof-t"><b>${esc(x.title)}</b><small>${aeai(x.ref)} · ${esc(x.loc)}</small><p>${x.proof.note ? `« ${esc(x.proof.note)} »` : ""} <span class="muted">${esc(x.proof.kind)} déposée ${relDay(x.proof.d)}</span></p></div>
          <div class="proof-a"><button type="button" class="btn ghost small" data-proof="reject" data-id="${ds.id}" data-k="${k}">Insuffisante</button><button type="button" class="btn primary small" data-proof="ok" data-id="${ds.id}" data-k="${k}">${ic("check")}Lever le défaut</button></div>
        </div>`;
      })
      .join("")}
    ${openDefects(ds).filter((x) => x.status === "ouvert").length ? `<p class="agi-note">${plural(openDefects(ds).filter((x) => x.status === "ouvert").length, "autre défaut reste ouvert", "autres défauts restent ouverts")} dans ce dossier.</p>` : ""}
  </article>`;
}
function proofThumb(p) {
  if (p.data && /^data:image/.test(p.data)) return `<img src="${p.data}" alt="Preuve : ${esc(p.name)}"/>`;
  const isPdf = /\.pdf$/i.test(p.name);
  return `<span class="thumb ${isPdf ? "pdf" : "img"}">${ic(isPdf ? "doc" : "camera")}<small>${isPdf ? "PDF" : "Photo"}</small></span>`;
}
function agProlong(ds) {
  const p = ds.prolongation;
  return `<article class="agi">${agHead(ds, deadlineCell(ds))}
    <blockquote>« ${esc(p.reason)} »<cite>Demande du ${fmtDate(p.d)} · ${p.days} jours supplémentaires</cite></blockquote>
    ${ds.defects.some((x) => x.sev === "grave" && x.status !== "leve") ? `<p class="agi-warn">${ic("alert")}Le dossier contient un défaut grave : une mesure provisoire peut être exigée en attendant.</p>` : ""}
    <div class="agi-a"><button type="button" class="btn ghost small" data-prolong="no" data-id="${ds.id}">Refuser</button><button type="button" class="btn primary small" data-prolong="yes" data-id="${ds.id}">${ic("check")}Accorder · nouveau délai ${fmtShort(ds.deadline + p.days)}</button></div>
  </article>`;
}
function agObs(ds) {
  return `<article class="agi">${agHead(ds, deadlineCell(ds))}
    <blockquote>« ${esc(ds.observations.text)} »<cite>Observations du ${fmtDate(ds.observations.d)}</cite></blockquote>
    <div class="agi-a"><button type="button" class="btn ghost small" data-step="decision" data-id="${ds.id}">${ic("gavel")}Rendre une décision</button><button type="button" class="btn primary small" data-obs="accept" data-id="${ds.id}">${ic("check")}Admettre · délai au ${fmtShort(Math.max(ds.deadline, 0) + 21)}</button></div>
  </article>`;
}
function agStep(ds) {
  const n = nextStep(ds);
  const b = building(ds.b);
  const why = {
    rappel: `Délai du rapport échu ${relDay(ds.deadline)}, aucune preuve reçue.`,
    entendu: `Délai du rappel échu ${relDay(ds.deadline)}. Avant toute décision, le propriétaire peut s’exprimer.`,
    decision: `Délai d’observations échu ${relDay(ds.deadline)}, aucune réponse de ${esc(b.owner)}.`,
    prefet: `Délai de la décision échu ${relDay(ds.deadline)}. Le préfet peut ordonner les travaux et, à défaut, la commune les faire exécuter aux frais du propriétaire (art. 48 LECAB).`,
  }[n.a];
  return `<article class="agi">${agHead(ds, stagePill(ds))}
    <p class="agi-why">${why}</p>
    <ul class="mini-def">${openDefects(ds).map((x) => `<li>${sevTag(x.sev)}<span>${esc(x.title)}</span>${aeai(x.ref)}</li>`).join("")}</ul>
    <div class="agi-a"><button type="button" class="btn ghost small" data-letter="${n.a}" data-id="${ds.id}">${ic("doc")}Voir le courrier</button><button type="button" class="btn ${n.a === "prefet" ? "danger" : "primary"} small" data-step="${n.a}" data-id="${ds.id}">${ic(n.a === "prefet" ? "gavel" : "send")}${esc(n.label)}</button></div>
  </article>`;
}
function agClose(ds) {
  return `<article class="agi">${agHead(ds, pill("good", "Tous les défauts levés"))}
    <ul class="mini-def">${ds.defects.map((x) => `<li>${ic("check", "ok")}<span>${esc(x.title)}</span><small>levé · preuve du ${fmtShort(x.proof ? x.proof.d : 0)}</small></li>`).join("")}</ul>
    <div class="agi-a"><button type="button" class="btn ghost small" data-letter="close" data-id="${ds.id}">${ic("doc")}Voir la confirmation</button><button type="button" class="btn primary small" data-step="close" data-id="${ds.id}">${ic("check")}Confirmer la levée et clore</button></div>
  </article>`;
}
function agManif(m) {
  return `<article class="agi"><div class="agi-h"><span><b>${esc(m.name)}</b><small>${esc(m.place)} · ${cap(fmtDay(m.date))} · env. ${m.persons} personnes</small></span>${pill("warn", "Préavis à donner")}</div>
    <ul class="mini-def plain"><li>${ic("check", "ok")}<span>Voies d’évacuation et sorties dégagées pendant la manifestation</span></li><li>${ic("check", "ok")}<span>Extincteurs et consignes en place, responsable sécurité désigné</span></li>${m.persons > 300 ? `<li>${ic("alert", "warn")}<span>Plus de 300 personnes : vérifier l’occupation maximale autorisée de la salle</span></li>` : ""}</ul>
    <div class="agi-a"><button type="button" class="btn primary small" data-manif="${m.id}">${ic("check")}Préavis favorable avec conditions</button></div>
  </article>`;
}
function villageSummary(list) {
  const by = {};
  list.forEach((b) => (by[b.v] = (by[b.v] || 0) + 1));
  return Object.entries(by)
    .sort((x, y) => y[1] - x[1])
    .map(([v, n]) => `<a class="chip" href="#/planification?v=${encodeURIComponent(v)}">${esc(v)} <em>${n}</em></a>`)
    .join("");
}
function deadlineFor(ds) {
  const worst = ds.defects.reduce((m, x) => (SEV[x.sev].rank > SEV[m].rank ? x.sev : m), "mineur");
  return CONFIG.delais[worst];
}

/* ---------- Dossiers ---------- */

const UI = { q: "", bq: "", village: "", risk: "", sel: new Set() };
const FILTERS = [
  ["", "Ouverts"],
  ["echus", "Délais échus"],
  ["preuves", "Preuves à valider"],
  ["procedure", "En procédure"],
  ["clos", "Clos"],
];

function viewDossiers(q) {
  const f = q.f || "";
  let list = STATE.dossiers.filter((d) => (f === "clos" ? isClosed(d) : !isClosed(d)));
  if (f === "echus") list = list.filter(overdue);
  if (f === "preuves") list = list.filter((d) => d.defects.some((x) => x.status === "preuve"));
  if (f === "procedure") list = list.filter((d) => ["entendu", "decision", "prefet"].includes(d.stage));
  const qq = UI.q.trim().toLowerCase();
  if (qq) list = list.filter((d) => [d.id, building(d.b).name, building(d.b).v, building(d.b).owner, ...d.defects.map((x) => x.title)].join(" ").toLowerCase().includes(qq));
  list.sort((x, y) => Number(overdue(y)) - Number(overdue(x)) || (x.deadline ?? 999) - (y.deadline ?? 999));
  return `${pageHead("Dossiers", "Chaque défaut, jusqu’à sa levée.", "Un dossier par contrôle. L’étape de la procédure, le délai et les preuves reçues sont visibles d’un coup d’œil.")}
  <div class="toolbar">
    <div class="chips" role="group" aria-label="Filtre">${FILTERS.map(([v, l]) => `<a class="chip" href="#/dossiers${v ? "?f=" + v : ""}" aria-current="${f === v}">${l}</a>`).join("")}</div>
    <label class="field search-f">${ic("search")}<input type="search" placeholder="Bâtiment, propriétaire, village, n° de dossier" value="${esc(UI.q)}" data-input="q" aria-label="Rechercher un dossier"/></label>
  </div>
  <section class="card flush">
    <div class="list-h"><span>${plural(list.length, "dossier", "dossiers")}</span><span class="cols"><span>Défauts</span><span>Étape</span><span>Délai</span></span></div>
    <div class="rows" id="dlist">${list.length ? list.map((d) => dossierRow(d)).join("") : emptyState("Aucun dossier", "Rien ne correspond à ce filtre.")}</div>
  </section>`;
}

function viewDossier(id) {
  const ds = dossier(id);
  if (!ds) return viewNotFound();
  const b = building(ds.b);
  const n = nextStep(ds);
  return `<a class="back" href="#/dossiers">${ic("back")}Dossiers</a>
  ${pageHead(`<span class="ref">${ds.id}</span> · ${esc(ds.source)} du ${fmtDate(ds.control)}`, esc(b.name), `${esc(b.street)}, ${esc(b.v)} · ${esc(b.type)}`, stagePill(ds))}
  ${ds.interdiction !== undefined && !isClosed(ds) ? `<div class="banner crit">${ic("ban")}<div><b>Interdiction de faire du feu en vigueur depuis le ${fmtDate(ds.interdiction)}</b><p>Prononcée en raison d’un danger imminent (art. 47 LECAB). À lever après contrôle et autorisation du maître ramoneur.</p></div></div>` : ""}
  <section class="card stepper-card">${stepper(ds)}
    ${n ? `<div class="next"><div><small>Prochaine étape</small><b>${esc(n.label)}</b></div><div class="next-a"><button type="button" class="btn ghost" data-letter="${n.a}" data-id="${ds.id}">${ic("doc")}Voir le courrier</button><button type="button" class="btn ${n.a === "prefet" ? "danger" : "primary"}" data-step="${n.a}" data-id="${ds.id}">${ic(n.a === "prefet" ? "gavel" : "send")}${esc(n.label)}</button></div></div>` : !isClosed(ds) ? `<div class="next calm"><div><small>${ds.stage === "prefet" ? "En attente" : "Délai en cours"}</small><b>${ds.stage === "prefet" ? "Le préfet a été saisi" : `Le propriétaire a jusqu’au ${fmtDate(ds.deadline)}`}</b></div></div>` : ""}
  </section>
  <div class="grid-2 wide-left">
    <section class="card">
      <div class="card-h"><h2>Défauts constatés</h2><span class="muted">${openDefects(ds).length} ouverts sur ${ds.defects.length}</span></div>
      <div class="defects">${ds.defects.map((x, k) => defectCard(ds, x, k)).join("")}</div>
    </section>
    <div class="stack">
      <section class="card">
        <div class="card-h"><h2>Propriétaire</h2></div>
        <p class="owner"><b>${esc(b.owner)}</b><small>${esc(b.street)}, ${esc(b.v)}</small></p>
        <a class="btn ghost full" href="#/proprietaire/${ds.id}">${ic("user")}Voir son espace en ligne</a>
        <p class="card-foot">Le propriétaire reçoit un lien personnel avec le rapport : il y dépose ses preuves, demande une prolongation ou formule ses observations, sans compte à créer.</p>
      </section>
      <section class="card">
        <div class="card-h"><h2>Courriers</h2></div>
        <div class="letters">${lettersFor(ds).map(([k, l]) => `<button type="button" class="letter-r" data-letter="${k}" data-id="${ds.id}">${ic("doc")}<span>${l}</span>${ic("chevron", "chev")}</button>`).join("")}</div>
      </section>
      <section class="card">
        <div class="card-h"><h2>SIBAT</h2><span class="src-note">ECAB</span></div>
        <label class="tick"><input type="checkbox" data-sibat="control" data-id="${ds.id}" ${ds.sibat.control ? "checked" : ""} ${ds.stage === "brouillon" ? "disabled" : ""}/><span>Contrôle du ${fmtShort(ds.control)} reporté dans SIBAT</span></label>
        <label class="tick"><input type="checkbox" data-sibat="levee" data-id="${ds.id}" ${ds.sibat.levee ? "checked" : ""} ${isClosed(ds) ? "" : "disabled"}/><span>Levée des défauts reportée dans SIBAT</span></label>
        <p class="card-foot">Renseigner le système d’information du bâtiment de l’ECAB reste une tâche du ou de la spécialiste communal·e (règlement ECAB, art. 19 let. i). La maquette en garde la trace.</p>
      </section>
      <section class="card">
        <div class="card-h"><h2>Historique</h2></div>
        <ol class="timeline">${[...ds.history].reverse().map((h) => `<li class="tl-${h.who === "Commune" ? "c" : h.who === "Propriétaire" ? "p" : "o"}"><i aria-hidden="true"></i><span><b>${esc(h.text)}</b><small>${fmtDate(h.d)} · ${esc(h.who)}</small></span></li>`).join("")}</ol>
      </section>
    </div>
  </div>`;
}

function defectCard(ds, x, k) {
  const st = x.status === "leve" ? pill("good", "Levé") : x.status === "preuve" ? pill("info", "Preuve à valider", "upload") : pill(x.sev === "grave" ? "crit" : "warn", "Ouvert");
  return `<article class="defect ${x.status}">
    <div class="defect-h"><span class="num">${k + 1}</span><div><b>${esc(x.title)}</b><small>${esc(x.loc)}</small></div>${st}</div>
    <div class="defect-m">${sevTag(x.sev)}${aeai(x.ref)}<span class="muted">${esc(AEAI[x.ref])}</span>${x.photo ? `<span class="muted">${ic("camera")}${esc(x.photo)}</span>` : ""}</div>
    ${x.proof ? `<div class="proof small"><div class="proof-f">${proofThumb(x.proof)}</div><div class="proof-t"><b>${esc(x.proof.name)}</b><p>${x.proof.note ? `« ${esc(x.proof.note)} »` : ""} <span class="muted">${esc(x.proof.kind)} · ${fmtDate(x.proof.d)}</span></p></div>${x.status === "preuve" ? `<div class="proof-a"><button type="button" class="btn ghost small" data-proof="reject" data-id="${ds.id}" data-k="${k}">Insuffisante</button><button type="button" class="btn primary small" data-proof="ok" data-id="${ds.id}" data-k="${k}">${ic("check")}Lever</button></div>` : ""}</div>` : ""}
    ${x.rejected ? `<p class="agi-note">Preuve précédente jugée insuffisante le ${fmtDate(x.rejected)}.</p>` : ""}
  </article>`;
}

function lettersFor(ds) {
  const out = [["rapport", "Rapport de contrôle"]];
  const reached = maxReached(ds);
  if (reached >= 1 || ds.stage === "rappel") out.push(["rappel", "Rappel"]);
  if (reached >= 2) out.push(["entendu", "Droit d’être entendu"]);
  if (reached >= 3) out.push(["decision", "Décision"]);
  if (reached >= 4) out.push(["prefet", "Requête au préfet"]);
  if (ds.interdiction !== undefined) out.push(["interdiction", "Interdiction de faire du feu"]);
  const n = nextStep(ds);
  if (n && !out.some(([k]) => k === n.a) && n.a !== "sign") out.push([n.a, "Projet · " + n.label]);
  if (isClosed(ds)) out.push(["close", "Confirmation de levée"]);
  return out;
}

/* ---------- Bâtiments ---------- */

function viewBuildings() {
  return `${pageHead("Bâtiments", "Les bâtiments soumis au contrôle périodique.", `Typologie selon l’ECAB : ${RISK.eleve.years} ans pour un risque élevé, ${RISK.faible.years} ans pour un risque faible. Les habitations individuelles relèvent de la responsabilité des propriétaires.`)}
  ${buildingFilters()}
  <div id="blist">${buildingTable()}</div>`;
}
function buildingFilters() {
  return `<div class="toolbar">
    <label class="field search-f">${ic("search")}<input type="search" placeholder="Bâtiment, propriétaire, EGID" value="${esc(UI.bq)}" data-input="bq" aria-label="Rechercher un bâtiment"/></label>
    <label class="field select-f"><span class="sr">Village</span><select data-input="village"><option value="">Tous les villages</option>${CONFIG.villages.map((v) => `<option ${UI.village === v ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></label>
    <div class="seg-ctl" role="group" aria-label="Typologie">${[["", "Tous"], ["eleve", "Risque élevé"], ["faible", "Risque faible"]].map(([v, l]) => `<button type="button" data-risk="${v}" aria-current="${UI.risk === v}">${l}</button>`).join("")}</div>
  </div>`;
}
function filteredBuildings() {
  const q = UI.bq.trim().toLowerCase();
  return BUILDINGS.filter((b) => (!UI.village || b.v === UI.village) && (!UI.risk || b.risk === UI.risk) && (!q || [b.name, b.owner, b.v, b.egid, b.type].join(" ").toLowerCase().includes(q)));
}
function buildingTable() {
  const list = filteredBuildings().sort((x, y) => x.next - y.next);
  if (!list.length) return emptyState("Aucun bâtiment", "Aucun bâtiment ne correspond à ces filtres.");
  return `<div class="btable" role="table" aria-label="Bâtiments">
    <div class="bt-h" role="row"><span role="columnheader">Bâtiment</span><span role="columnheader">Typologie</span><span role="columnheader">Dernier contrôle</span><span role="columnheader">Contrôle périodique</span><span role="columnheader">Dossier</span></div>
    ${list
      .map((b) => {
        const st = controlStatus(b);
        const ds = STATE.dossiers.find((d) => d.b === b.id && !isClosed(d));
        return `<a class="bt-r" role="row" href="#/batiments/${b.id}">
        <span class="bt-n" role="cell"><b>${esc(b.name)}</b><small>${esc(b.v)} · ${esc(b.type)}</small></span>
        <span role="cell" data-l="Typologie">${riskTag(b.risk)}</span>
        <span role="cell" data-l="Dernier contrôle" class="bt-c"><b>${fmtDate(b.last)}</b><small>${relDay(b.last)}</small></span>
        <span role="cell" data-l="Contrôle périodique">${pill(st.level, st.label)}</span>
        <span role="cell" data-l="Dossier" class="bt-c">${ds ? `<b class="${overdue(ds) ? "late" : ""}">${openDefects(ds).length} défaut${openDefects(ds).length > 1 ? "s" : ""}</b><small>${STAGE[ds.stage].short}</small>` : `<small>Aucun dossier ouvert</small>`}</span>
      </a>`;
      })
      .join("")}
  </div>`;
}

function viewBuilding(id) {
  const b = building(id);
  if (!b) return viewNotFound();
  const st = controlStatus(b);
  const dss = STATE.dossiers.filter((d) => d.b === b.id);
  const span = RISK[b.risk].years;
  const past = [b.last, b.last - span * 365].filter((d) => d > -9000);
  return `<a class="back" href="#/batiments">${ic("back")}Bâtiments</a>
  ${pageHead(`${esc(b.v)} · EGID ${b.egid}`, esc(b.name), `${esc(b.street)} · ${esc(b.type)}`, `<a class="btn primary" href="#/controle/${b.id}">${ic("phone")}Démarrer un contrôle</a>`)}
  <section class="kpis small">
    <div class="kpi"><span class="kpi-l">Typologie ECAB</span><b class="kpi-txt">${RISK[b.risk].label}</b><span class="kpi-s">contrôle tous les ${span} ans</span></div>
    <div class="kpi"><span class="kpi-l">Dernier contrôle</span><b class="kpi-txt">${fmtDate(b.last)}</b><span class="kpi-s">${relDay(b.last)}</span></div>
    <div class="kpi ${st.k === "late" ? "kpi-crit" : st.k === "soon" ? "kpi-warn" : ""}"><span class="kpi-l">Prochain contrôle</span><b class="kpi-txt">${STATE.plans[b.id] !== undefined ? fmtDate(STATE.plans[b.id]) : fmtDate(b.next)}</b><span class="kpi-s">${esc(st.label)}</span></div>
    <div class="kpi"><span class="kpi-l">Propriétaire</span><b class="kpi-txt sm">${esc(b.owner)}</b><span class="kpi-s">fictif</span></div>
  </section>
  <div class="grid-2 wide-left">
    <section class="card">
      <div class="card-h"><h2>Dossiers</h2></div>
      <div class="rows">${dss.length ? dss.map((d) => dossierRow(d)).join("") : emptyState("Aucun dossier", "Aucun défaut en suivi pour ce bâtiment.")}</div>
    </section>
    <section class="card">
      <div class="card-h"><h2>Contrôles périodiques</h2><span class="src-note">tous les ${span} ans</span></div>
      <ol class="timeline">
        <li class="tl-next"><i></i><span><b>${STATE.plans[b.id] !== undefined ? "Contrôle planifié" : "Prochain contrôle dû"}</b><small>${fmtDate(STATE.plans[b.id] ?? b.next)} · ${relDay(STATE.plans[b.id] ?? b.next)}</small></span></li>
        ${past.map((d, k) => `<li class="tl-c"><i></i><span><b>Contrôle périodique${k === 0 && dss.length ? ` · ${dss[0].defects.length} défauts constatés` : k === 0 ? " · sans défaut" : ""}</b><small>${fmtDate(d)}</small></span></li>`).join("")}
      </ol>
    </section>
  </div>`;
}

/* ---------- Planification ---------- */

function viewPlanning(q) {
  if (q.v) UI.village = q.v;
  const groups = [
    ["late", "En retard", "Le contrôle périodique aurait dû avoir lieu."],
    ["soon", "À planifier d’ici quatre mois", "Échéance proche, aucune date fixée."],
    ["plan", "Planifiés", "Avis de contrôle à envoyer aux propriétaires."],
  ];
  const list = filteredBuildings();
  const yearCount = (y) => BUILDINGS.filter((b) => yearOf(b.next) === y).length;
  const y0 = TODAY.getFullYear();
  return `${pageHead("Planification", "Les contrôles périodiques, village par village.", "Sélectionnez les bâtiments d’une même tournée : les avis de contrôle sont générés pour chaque propriétaire.")}
  <section class="years" aria-label="Contrôles dus par année">
    ${[y0, y0 + 1, y0 + 2, y0 + 3, y0 + 4].map((y) => `<div><small>${y}</small><b>${y === y0 ? BUILDINGS.filter((b) => b.next < 365 - dayOfYear()).length : yearCount(y)}</b><span>${y === y0 ? "dont en retard" : "contrôles dus"}</span>${y === y0 ? `<em>${BUILDINGS.filter((b) => b.next < 0).length}</em>` : ""}</div>`).join("")}
  </section>
  ${buildingFilters()}
  <div id="plist">${planGroups(groups, list)}</div>
  <div class="planbar ${UI.sel.size ? "on" : ""}" id="planbar">${planbar()}</div>`;
}
function dayOfYear() {
  const s = new Date(TODAY.getFullYear(), 0, 1);
  return Math.floor((TODAY - s) / DAY);
}
function planGroups(groups, list) {
  return groups
    .map(([k, title, sub]) => {
      const items = list.filter((b) => controlStatus(b).k === k).sort((x, y) => x.next - y.next);
      if (!items.length) return "";
      return `<section class="card flush plan-g"><div class="plan-h"><div><h2>${title}<em>${items.length}</em></h2><p>${sub}</p></div></div>
        ${items
          .map(
            (b) => `<label class="plan-r ${k === "plan" ? "is-plan" : ""}">
            ${k === "plan" ? ic("calendar") : `<input type="checkbox" data-sel="${b.id}" ${UI.sel.has(b.id) ? "checked" : ""}/>`}
            <span class="plan-n"><b>${esc(b.name)}</b><small>${esc(b.v)} · ${esc(b.owner)}</small></span>
            ${riskTag(b.risk)}
            <span class="plan-d ${k === "late" ? "late" : ""}"><b>${k === "plan" ? fmtDate(STATE.plans[b.id]) : fmtDate(b.next)}</b><small>${k === "plan" ? "avis à envoyer" : `dernier : ${fmtDate(b.last)}`}</small></span>
          </label>`,
          )
          .join("")}
      </section>`;
    })
    .join("");
}
function planbar() {
  const n = UI.sel.size;
  const d = nextWeekday(4, 14);
  return `<span><b>${n}</b> ${n > 1 ? "bâtiments sélectionnés" : "bâtiment sélectionné"}</span>
    <label class="field date-f">${ic("calendar")}<input type="date" id="plan-date" value="${dateOf(d).toISOString().slice(0, 10)}" aria-label="Date de la tournée"/></label>
    <button type="button" class="btn primary" data-action="plan" ${n ? "" : "disabled"}>${ic("route")}Planifier la tournée</button>`;
}
function nextWeekday(wd, min) {
  for (let d = min; d < min + 7; d++) if (dateOf(d).getDay() === wd) return d;
  return min;
}

/* ---------- Contrôle sur place ---------- */

function viewControl(id) {
  const b = building(id);
  if (!b) return viewNotFound();
  const draft = (STATE.drafts[id] = STATE.drafts[id] || { answers: {}, notes: {}, sev: {}, photos: {} });
  const groups = CHECKLIST.filter((g) => !g.onlyRisk || g.onlyRisk === b.risk);
  const total = groups.reduce((n, g) => n + g.points.length, 0);
  const done = Object.keys(draft.answers).filter((k) => groups.some((g) => g.points.some((p) => p.id === k))).length;
  const defects = Object.values(draft.answers).filter((a) => a === "def").length;
  return `<div class="ctl">
  <a class="back" href="#/batiments/${b.id}">${ic("back")}${esc(b.name)}</a>
  ${pageHead(`Contrôle périodique · ${cap(fmtDay(0))}`, esc(b.name), `${esc(b.v)} · ${esc(b.type)} · ${RISK[b.risk].label}`)}
  <div class="ctl-progress"><span style="width:${(done / total) * 100}%"></span></div>
  <p class="ctl-count"><b>${done}</b> points sur ${total} · <b class="${defects ? "late" : ""}">${plural(defects, "défaut", "défauts")}</b> ${b.id !== "b13" ? "" : `<span class="muted">· Choisir un autre bâtiment : <a href="#/batiments">liste</a></span>`}</p>
  ${groups
    .map(
      (g) => `<section class="card ctl-g"><div class="card-h"><h2>${g.group}</h2>${aeai(g.ref)}</div>
      ${g.points
        .map((p) => {
          const a = draft.answers[p.id];
          return `<div class="ctl-p ${a ? "is-" + a : ""}">
            <p>${esc(p.q)}</p>
            <div class="seg3" role="group" aria-label="${esc(p.q)}">
              <button type="button" data-ans="ok" data-p="${p.id}" data-b="${b.id}" aria-pressed="${a === "ok"}">${ic("check")}Conforme</button>
              <button type="button" data-ans="def" data-p="${p.id}" data-b="${b.id}" aria-pressed="${a === "def"}">${ic("alert")}Défaut</button>
              <button type="button" data-ans="na" data-p="${p.id}" data-b="${b.id}" aria-pressed="${a === "na"}">S.o.</button>
            </div>
            ${
              a === "def"
                ? `<div class="ctl-def">
                  <b>${esc(p.d)}</b>
                  <div class="sevs" role="group" aria-label="Gravité">${Object.keys(SEV).map((s) => `<button type="button" data-sev="${s}" data-p="${p.id}" data-b="${b.id}" aria-pressed="${(draft.sev[p.id] || p.sev || "important") === s}"><b>${SEV[s].label}</b><small>${CONFIG.delais[s]} jours</small></button>`).join("")}</div>
                  <input class="ctl-note" type="text" placeholder="Emplacement, par ex. « sous-sol, local technique »" value="${esc(draft.notes[p.id] || "")}" data-note="${p.id}" data-b="${b.id}" aria-label="Emplacement du défaut"/>
                  <label class="photo-btn">${ic("camera")}<span>${draft.photos[p.id] ? esc(draft.photos[p.id]) : "Ajouter une photo"}</span><input type="file" accept="image/*" capture="environment" data-photo="${p.id}" data-b="${b.id}"/></label>
                </div>`
                : ""
            }
          </div>`;
        })
        .join("")}
    </section>`,
    )
    .join("")}
  <div class="ctl-end">
    <button type="button" class="btn primary big" data-finish="${b.id}" ${done ? "" : "disabled"}>${ic("doc")}Terminer · générer le rapport</button>
    <p class="muted">${defects ? `Le rapport proposera un délai de ${CONFIG.delais[worstDraftSev(draft)]} jours, selon le défaut le plus grave.` : "Sans défaut, le contrôle est simplement enregistré."}</p>
  </div>
  </div>`;
}
function worstDraftSev(draft) {
  let w = "mineur";
  for (const [p, a] of Object.entries(draft.answers)) {
    if (a !== "def") continue;
    const s = draft.sev[p] || findPoint(p).sev || "important";
    if (SEV[s].rank > SEV[w].rank) w = s;
  }
  return w;
}
function findPoint(id) {
  for (const g of CHECKLIST) for (const p of g.points) if (p.id === id) return { ...p, ref: g.ref };
  return null;
}

/* ---------- Espace propriétaire ---------- */

function viewOwner(id) {
  const ds = dossier(id);
  if (!ds) return viewNotFound();
  const b = building(ds.b);
  const open = openDefects(ds);
  const days = ds.deadline;
  return `<div class="owner-app">
    <header class="ow-top"><span class="mark" aria-hidden="true">${ic("flame")}</span><span><b>${esc(CONFIG.client)}</b><small>Police du feu · espace propriétaire</small></span><a class="ow-exit" href="#/dossiers/${ds.id}">Vue commune</a></header>
    <main id="main" tabindex="-1" class="ow-main">
      <p class="ow-demo">${ic("info")}Aperçu de ce que reçoit le propriétaire : un lien personnel, sans compte.</p>
      <p class="kicker">Dossier ${ds.id} · contrôle du ${fmtDate(ds.control)}</p>
      <h1>${esc(b.name)}</h1>
      <p class="sub">${esc(b.street)}, ${esc(b.v)}</p>
      ${
        isClosed(ds)
          ? `<div class="ow-dl good">${ic("check")}<div><b>Tous les défauts sont levés</b><p>Merci. La commune vous a confirmé la levée par écrit.</p></div></div>`
          : days === null
            ? ""
            : `<div class="ow-dl ${days < 0 ? "crit" : days < 8 ? "warn" : ""}">${ic("clock")}<div><b>${days < 0 ? `Délai dépassé depuis ${-days} jours` : `${days} jours pour lever ${open.length > 1 ? "les défauts" : "le défaut"}`}</b><p>Délai fixé au ${fmtDate(days)}${ds.stage === "entendu" ? " pour vos observations" : ""}.</p></div></div>`
      }
      ${ds.stage === "entendu" && !ds.observations ? `<section class="ow-card"><h2>Vous pouvez vous exprimer</h2><p>Avant de rendre une décision, la commune vous invite à faire part de vos observations.</p><form data-owner-obs="${ds.id}"><label class="sr" for="obs">Observations</label><textarea id="obs" name="t" rows="4" placeholder="Vos observations…" required></textarea><button class="btn primary full" type="submit">${ic("send")}Envoyer mes observations</button></form></section>` : ""}
      ${ds.observations ? `<section class="ow-card sent">${ic("check")}<p>Observations envoyées le ${fmtDate(ds.observations.d)}.</p></section>` : ""}
      <h2 class="ow-h">${plural(ds.defects.length, "défaut constaté", "défauts constatés")}</h2>
      ${ds.defects
        .map((x, k) => `<section class="ow-card def-${x.status}">
          <div class="ow-def-h"><span class="num">${k + 1}</span><div><b>${esc(x.title)}</b><small>${esc(x.loc)}</small></div></div>
          <p class="ow-why">${esc(ownerHint(x))}</p>
          ${
            x.status === "leve"
              ? `<p class="ow-st good">${ic("check")}Levé par la commune</p>`
              : x.status === "preuve"
                ? `<p class="ow-st info">${ic("clock")}Preuve envoyée le ${fmtDate(x.proof.d)}, en cours de vérification</p>`
                : `<form class="ow-up" data-owner-proof="${ds.id}" data-k="${k}">
                    ${x.rejected ? `<p class="ow-st warn">${ic("alert")}La preuve précédente n’a pas suffi. Merci d’en envoyer une nouvelle.</p>` : ""}
                    <label class="drop">${ic("upload")}<span><b>Photo ou attestation</b><small>JPG, PNG ou PDF</small></span><input type="file" name="f" accept="image/*,application/pdf" required/></label>
                    <input type="text" name="n" placeholder="Commentaire (facultatif)" aria-label="Commentaire"/>
                    <button class="btn primary full" type="submit">${ic("send")}Envoyer la preuve</button>
                  </form>`
          }
        </section>`)
        .join("")}
      ${!isClosed(ds) && !ds.prolongation && ["rapport", "rappel"].includes(ds.stage) ? `<details class="ow-card ow-more"><summary>Besoin de plus de temps ?</summary><form data-owner-prolong="${ds.id}"><label>Durée<select name="days"><option value="30">30 jours</option><option value="60">60 jours</option><option value="90">90 jours</option></select></label><label>Motif<textarea name="r" rows="3" required placeholder="Par ex. : l’entreprise ne peut intervenir qu’en décembre."></textarea></label><button class="btn ghost full" type="submit">Demander une prolongation</button></form></details>` : ""}
      ${ds.prolongation ? `<section class="ow-card sent">${ic("clock")}<p>Demande de prolongation de ${ds.prolongation.days} jours envoyée le ${fmtDate(ds.prolongation.d)}. Réponse après la séance du jeudi.</p></section>` : ""}
      <p class="ow-foot">Questions : police du feu de la commune · données fictives de démonstration</p>
    </main>
  </div>`;
}
function ownerHint(x) {
  const h = {
    "15-15": "Les portes et traversées coupe-feu empêchent la fumée et le feu de passer d’un local à l’autre.",
    "16-15": "Les voies d’évacuation doivent rester libres pour pouvoir sortir rapidement.",
    "17-15": "La signalisation et l’éclairage de sécurité guident vers la sortie en cas de coupure.",
    "18-15": "Les extincteurs doivent être en place, accessibles et entretenus.",
    "20-15": "L’installation de détection doit fonctionner en tout temps.",
    "24-15": "Le chauffage et les conduits de fumée doivent être sûrs et dégagés.",
    "25-15": "Les installations de ventilation peuvent propager un incendie si elles sont mal entretenues.",
    "26-15": "Les matières inflammables doivent être stockées dans des conditions sûres.",
    "12-15": "Les consignes, plans et accès facilitent l’évacuation et l’intervention des pompiers.",
  };
  return h[x.ref] || "";
}

/* ---------- Courriers ---------- */

function letter(ds, kind) {
  const b = building(ds.b);
  const D = CONFIG.delais;
  const list = (arr) => arr.map((x, k) => `${k + 1}. ${x.title} (${x.loc}) · directive AEAI ${x.ref}`).join("\n");
  const open = openDefects(ds);
  const dl = (n) => fmtDate(Math.max(0, ds.deadline ?? 0) + n);
  const head = `${CONFIG.client}\nPolice du feu\n\n${b.owner}\n${b.street}\n${b.v}\n\nGibloux, le ${fmtDate(0)}\n\nDossier ${ds.id} · ${b.name}, ${b.street}, ${b.v} · EGID ${b.egid}\n`;
  const sign = `\n\nMeilleures salutations.\n\nPour la police du feu\n${CONFIG.user.role}`;
  const T = {
    rapport: ["Rapport de contrôle", `Madame, Monsieur,\n\nLors du ${ds.source.toLowerCase()} du ${fmtDate(ds.control)}, effectué en application de l’art. 42 de la loi sur l’assurance immobilière, la prévention et les secours en matière de feu (LECAB) et des art. 17 ss du règlement de l’ECAB du 20 juin 2018, les défauts suivants ont été constatés :\n\n${list(ds.defects)}\n\nNous vous prions d’y remédier d’ici au ${fmtDate(ds.deadline ?? deadlineFor(ds))}.\n\nVous pouvez nous transmettre vos preuves (photos, attestations d’entreprise) au moyen du lien personnel joint à ce courrier, ou y demander une prolongation motivée.`],
    rappel: ["Rappel", `Madame, Monsieur,\n\nLe délai fixé dans notre rapport de contrôle est échu le ${fmtDate(ds.deadline ?? 0)}. À ce jour, les défauts suivants ne sont pas levés :\n\n${list(open)}\n\nNous vous impartissons un nouveau délai au ${dl(D.rappel)}.\n\nSans nouvelles de votre part, nous serons amenés à poursuivre la procédure.`],
    entendu: ["Droit d’être entendu", `Madame, Monsieur,\n\nMalgré notre rappel, les défauts suivants ne sont pas levés :\n\n${list(open)}\n\nAvant de rendre une décision, nous vous donnons la possibilité de vous déterminer par écrit d’ici au ${dl(D.entendu)}, conformément au code de procédure et de juridiction administrative (CPJA).`],
    decision: ["Décision", `Madame, Monsieur,\n\nVu le rapport de contrôle du ${fmtDate(ds.control)}, le rappel et le droit d’être entendu qui vous a été accordé,\n\nla police du feu décide :\n\n1. Les défauts suivants doivent être levés d’ici au ${dl(D.decision)} :\n${list(open)}\n\n2. À défaut, la commune requerra du préfet qu’il ordonne l’exécution des travaux (art. 48 LECAB).\n\nVoies de droit : [à compléter selon la pratique communale].`],
    prefet: ["Requête au préfet de la " + CONFIG.district, `Monsieur le Préfet,\n\nNous vous soumettons le dossier ${ds.id} concernant le bâtiment ${b.name}, ${b.street}, ${b.v}, propriété de ${b.owner}.\n\nMalgré le rapport de contrôle du ${fmtDate(ds.control)}, le rappel, le droit d’être entendu et notre décision, les défauts suivants ne sont pas levés :\n\n${list(open)}\n\nNous vous prions d’ordonner l’exécution des travaux nécessaires en application de l’art. 48 al. 1 LECAB. Si le propriétaire n’obtempère pas dans le délai que vous fixerez, la commune pourra les faire exécuter à ses frais (art. 48 al. 2 LECAB).\n\nLe dossier complet (rapport, courriers, preuves et historique) est joint.`],
    close: ["Confirmation de levée des défauts", `Madame, Monsieur,\n\nNous vous confirmons que les défauts constatés lors du ${ds.source.toLowerCase()} du ${fmtDate(ds.control)} sont levés :\n\n${list(ds.defects)}\n\nLe dossier ${ds.id} est clos. Nous vous remercions de votre collaboration.`],
    interdiction: ["Interdiction de faire du feu", `Madame, Monsieur,\n\nÀ la suite de l’annonce du maître ramoneur, un danger imminent a été constaté sur l’installation suivante :\n\n${list(ds.defects)}\n\nEn application de l’art. 47 LECAB, il est interdit de faire du feu dans cette installation avec effet immédiat, jusqu’à sa remise en état et au contrôle du maître ramoneur.`],
    avis: ["Avis de contrôle périodique", ""],
  };
  T.sign = T.rapport;
  const [subject, body] = T[kind];
  return { subject, text: `${head}\nObjet : ${subject}\n\n${body}${sign}` };
}

function openLetter(id, kind) {
  const ds = dossier(id);
  const L = letter(ds, kind);
  const m = document.getElementById("modal");
  m.innerHTML = `<div class="modal-in">
    <div class="modal-h"><div><p class="kicker">Projet de courrier · ${ds.id}</p><h2 id="modal-title">${esc(L.subject)}</h2></div><button class="icon-btn" type="button" data-action="close-modal" aria-label="Fermer">${ic("close")}</button></div>
    <div class="paper"><pre>${esc(L.text)}</pre><span class="wm">Projet · maquette</span></div>
    <p class="hint">${ic("info")}Généré à partir du dossier. Dans la version réelle, il reprendrait vos modèles communaux, en-tête et signatures.</p>
    <div class="modal-a"><button type="button" class="btn ghost" data-copy="letter">${ic("copy")}Copier</button><button type="button" class="btn primary" data-action="print-letter">${ic("print")}Imprimer · PDF</button></div>
  </div>`;
  m._copy = L.text;
  m.showModal();
}

/* ---------- Principe ---------- */

function viewPrinciple() {
  return `${pageHead("Comment ça fonctionne", "À côté de SIBAT, pas à sa place.", "SIBAT reste le système d’information du bâtiment de l’ECAB. Cet outil suit ce qui se passe entre le contrôle et la levée du dernier défaut.")}
  <section class="card">
    <ol class="flow-steps">
      <li><span>1</span><b>Contrôle sur place</b><p>Grille par directive AEAI sur téléphone, photos, gravité et emplacement. Le rapport est rédigé automatiquement.</p></li>
      <li><span>2</span><b>Rapport et lien personnel</b><p>Le propriétaire reçoit le rapport et un lien sans compte pour déposer ses preuves ou demander une prolongation.</p></li>
      <li><span>3</span><b>Séance du jeudi</b><p>Preuves reçues, délais échus, prolongations et observations, avec le courrier prêt et le procès-verbal tenu au fil de la séance.</p></li>
      <li><span>4</span><b>Procédure jusqu’au bout</b><p>Rappel, droit d’être entendu, décision, requête au préfet (art. 48 LECAB) : chaque étape a son délai et son modèle de courrier.</p></li>
      <li><span>5</span><b>Levée et SIBAT</b><p>Confirmation écrite au propriétaire, puis rappel de reporter le contrôle et la levée dans SIBAT.</p></li>
    </ol>
  </section>
  <div class="grid-3">
    <section class="card principle">${ic("database")}<h2>SIBAT reste la référence</h2><p>La typologie et les dates des contrôles viennent de l’ECAB. L’outil ne remplace pas la saisie dans SIBAT : il rappelle ce qui reste à y reporter.</p></section>
    <section class="card principle">${ic("shield")}<h2>Le cadre fribourgeois</h2><p>Contrôle périodique tous les 5 ou 10 ans selon la typologie (règlement ECAB, art. 18), procédure suivie par le ou la spécialiste communal·e (art. 19 let. g).</p></section>
    <section class="card principle">${ic("people")}<h2>Moins d’allers-retours</h2><p>Les preuves arrivent au bon dossier, sans courrier papier à ressaisir. Les relances partent avec la liste à jour.</p></section>
  </div>
  <section class="card next-card">
    <h2>À vérifier ensemble jeudi</h2>
    <ol>
      <li><b>Vos modèles de courriers</b> et la manière dont vous rédigez aujourd’hui rapports, rappels et décisions.</li>
      <li><b>Les délais</b> que vous appliquez selon la gravité, et la suite donnée aux dossiers qui n’avancent pas.</li>
      <li><b>Ce que SIBAT permet d’exporter</b> pour reprendre la liste des bâtiments, leur typologie et la date du dernier contrôle.</li>
    </ol>
    <div class="next-a"><a class="btn primary" href="mailto:${CONFIG.contact.email}?subject=${encodeURIComponent("Gibloux · police du feu")}">${ic("send")}Écrire à ${esc(CONFIG.contact.name)}</a><span>${esc(CONFIG.contact.company)} · ${CONFIG.contact.email}</span></div>
  </section>`;
}
function viewNotFound() {
  return `${pageHead("Page introuvable", "Cette page n’existe pas.")}<a class="btn primary" href="#/">Retour à la séance</a>`;
}

/* ---------- Recherche ---------- */

function openSearch() {
  const m = document.getElementById("modal");
  m.innerHTML = `<div class="modal-in search-m"><label class="search-big">${ic("search")}<input id="gsearch" type="search" placeholder="Bâtiment, propriétaire, village, n° de dossier…" autocomplete="off" aria-label="Recherche globale"/><kbd>Échap</kbd></label><div id="gresults" class="gresults">${searchResults("")}</div></div>`;
  m.classList.add("top");
  m.showModal();
  document.getElementById("gsearch").focus();
}
function searchResults(q) {
  q = q.trim().toLowerCase();
  if (!q) {
    return `<p class="g-l">Suggestions</p>
    <a class="g-r" href="#/dossiers/PF-2025-031" data-close>${ic("gavel")}<span><b>Ferme En Craux</b><small>Décision échue, requête au préfet à préparer</small></span></a>
    <a class="g-r" href="#/proprietaire/PF-2026-018" data-close>${ic("user")}<span><b>Espace propriétaire</b><small>Ce que reçoit l’Auberge du Tilleul</small></span></a>
    <a class="g-r" href="#/controle/b13" data-close>${ic("phone")}<span><b>Contrôle sur place</b><small>Cycle d’orientation, Farvagny-le-Grand</small></span></a>`;
  }
  const ds = STATE.dossiers.filter((d) => [d.id, building(d.b).name, building(d.b).owner, building(d.b).v].join(" ").toLowerCase().includes(q)).slice(0, 6);
  const bs = BUILDINGS.filter((b) => [b.name, b.owner, b.v, b.egid].join(" ").toLowerCase().includes(q)).slice(0, 6);
  if (!ds.length && !bs.length) return `<p class="g-empty">Aucun résultat pour « ${esc(q)} ».</p>`;
  return `${ds.length ? `<p class="g-l">Dossiers</p>${ds.map((d) => `<a class="g-r" href="#/dossiers/${d.id}" data-close>${ic("folder")}<span><b>${esc(building(d.b).name)}</b><small>${d.id} · ${STAGE[d.stage].short}</small></span></a>`).join("")}` : ""}
  ${bs.length ? `<p class="g-l">Bâtiments</p>${bs.map((b) => `<a class="g-r" href="#/batiments/${b.id}" data-close>${ic("building")}<span><b>${esc(b.name)}</b><small>${esc(b.v)} · ${RISK[b.risk].label}</small></span></a>`).join("")}` : ""}`;
}

/* ---------- Actions ---------- */

function doStep(ds, a) {
  const b = building(ds.b);
  const D = CONFIG.delais;
  const base = Math.max(0, ds.deadline ?? 0);
  if (a === "sign") {
    ds.stage = "rapport";
    ds.deadline = deadlineFor(ds);
    log(ds, `Rapport de contrôle signé et envoyé, délai au ${fmtDate(ds.deadline)}`);
    pv(`${b.name} (${ds.id}) : rapport de contrôle signé, délai au ${fmtDate(ds.deadline)}.`);
    return "Rapport envoyé au propriétaire avec son lien personnel.";
  }
  if (a === "rappel") {
    ds.stage = "rappel";
    ds.deadline = base + D.rappel;
    log(ds, `Rappel envoyé, nouveau délai au ${fmtDate(ds.deadline)}`);
    pv(`${b.name} (${ds.id}) : rappel, nouveau délai au ${fmtDate(ds.deadline)}.`);
    return "Rappel envoyé.";
  }
  if (a === "entendu") {
    ds.stage = "entendu";
    ds.deadline = base + D.entendu;
    log(ds, `Droit d’être entendu ouvert, observations attendues au ${fmtDate(ds.deadline)}`);
    pv(`${b.name} (${ds.id}) : droit d’être entendu accordé jusqu’au ${fmtDate(ds.deadline)}.`);
    return "Courrier « droit d’être entendu » envoyé.";
  }
  if (a === "decision") {
    ds.stage = "decision";
    ds.deadline = base + D.decision;
    delete ds.observations;
    log(ds, `Décision communale notifiée, délai au ${fmtDate(ds.deadline)}`);
    pv(`${b.name} (${ds.id}) : décision rendue, levée exigée au ${fmtDate(ds.deadline)}.`);
    return "Décision notifiée.";
  }
  if (a === "prefet") {
    ds.stage = "prefet";
    ds.deadline = null;
    log(ds, `Requête au préfet de la ${CONFIG.district} (art. 48 LECAB)`);
    pv(`${b.name} (${ds.id}) : dossier transmis au préfet de la ${CONFIG.district} (art. 48 LECAB).`);
    return "Requête au préfet préparée avec le dossier complet.";
  }
  if (a === "close") {
    ds.stage = "leve";
    ds.deadline = null;
    log(ds, "Levée des défauts confirmée par écrit, dossier clos");
    pv(`${b.name} (${ds.id}) : levée confirmée, dossier clos. Reporter dans SIBAT.`);
    return "Dossier clos. Pensez à reporter la levée dans SIBAT.";
  }
}

function readFile(file) {
  return new Promise((res) => {
    if (!file || !/^image\//.test(file.type) || file.size > 900000) return res(null);
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => res(null);
    r.readAsDataURL(file);
  });
}

/* ---------- Routeur ---------- */

let STATE = null;
let lastPath = null;
function parseRoute() {
  const h = location.hash.replace(/^#\/?/, "");
  const [path, qs] = h.split("?");
  return { path, q: Object.fromEntries(new URLSearchParams(qs || "")) };
}
function render() {
  const { path, q } = parseRoute();
  if (/^ag-/.test(path)) return;
  const p = path.split("/");
  let html;
  if (p[0] === "proprietaire") {
    document.getElementById("app").innerHTML = viewOwner(p[1]);
    document.title = `Espace propriétaire · ${CONFIG.client}`;
    if (path !== lastPath) window.scrollTo(0, 0);
    lastPath = path;
    return;
  }
  if (p[0] === "") html = viewSeance();
  else if (p[0] === "dossiers" && p[1]) html = viewDossier(p[1]);
  else if (p[0] === "dossiers") html = viewDossiers(q);
  else if (p[0] === "batiments" && p[1]) html = viewBuilding(p[1]);
  else if (p[0] === "batiments") html = viewBuildings();
  else if (p[0] === "planification") html = viewPlanning(q);
  else if (p[0] === "controle") html = viewControl(p[1] || "b13");
  else if (p[0] === "principe") html = viewPrinciple();
  else html = viewNotFound();
  const y = window.scrollY;
  document.getElementById("app").innerHTML = shell(path, html);
  document.title = `${titleFor(p)} · ${CONFIG.title}`;
  if (path === lastPath) window.scrollTo(0, y);
  else {
    window.scrollTo(0, 0);
    if (lastPath !== null) document.getElementById("main").focus({ preventScroll: true });
  }
  lastPath = path;
}
function rerender() {
  saveState();
  render();
}
function titleFor(p) {
  if (p[0] === "dossiers" && p[1]) return p[1];
  if (p[0] === "batiments" && p[1]) return building(p[1])?.name || "Bâtiment";
  if (p[0] === "controle") return "Contrôle sur place";
  if (p[0] === "principe") return "Comment ça fonctionne";
  const n = NAV.find((x) => x.id === p[0]);
  return n ? n.label : "Page";
}
function toast(msg) {
  const n = document.getElementById("notice");
  n.textContent = msg;
  n.classList.add("on");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => n.classList.remove("on"), 3800);
}
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const t = document.createElement("textarea");
    t.value = text;
    document.body.appendChild(t);
    t.select();
    document.execCommand("copy");
    t.remove();
  }
  toast("Texte copié dans le presse-papiers.");
}
function closeDialogs() {
  for (const id of ["sheet", "modal"]) {
    const d = document.getElementById(id);
    if (d.open) d.close();
  }
}

/* ---------- Événements ---------- */

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-step],[data-letter],[data-proof],[data-prolong],[data-obs],[data-manif],[data-action],[data-copy],[data-risk],[data-ans],[data-sev],[data-finish],[data-close],dialog");
  if (!t) return;
  if (t.tagName === "DIALOG") {
    if (e.target === t) t.close();
    return;
  }
  const ds = t.dataset.id ? dossier(t.dataset.id) : null;
  if (t.dataset.step) {
    const msg = doStep(ds, t.dataset.step);
    rerender();
    return toast(msg);
  }
  if (t.dataset.letter) return openLetter(t.dataset.id, t.dataset.letter === "sign" ? "rapport" : t.dataset.letter);
  if (t.dataset.proof) {
    const x = ds.defects[Number(t.dataset.k)];
    const b = building(ds.b);
    if (t.dataset.proof === "ok") {
      x.status = "leve";
      log(ds, `Défaut levé sur preuve : ${x.title}`);
      pv(`${b.name} (${ds.id}) : défaut levé sur preuve, « ${x.title} ».`);
      toast(allLifted(ds) ? "Défaut levé. Tous les défauts du dossier sont levés." : "Défaut levé.");
    } else {
      x.status = "ouvert";
      x.rejected = 0;
      log(ds, `Preuve jugée insuffisante : ${x.title}`);
      pv(`${b.name} (${ds.id}) : preuve insuffisante pour « ${x.title} », le propriétaire est invité à compléter.`);
      toast("Le propriétaire est invité à envoyer une nouvelle preuve.");
    }
    return rerender();
  }
  if (t.dataset.prolong) {
    const b = building(ds.b);
    const p = ds.prolongation;
    if (t.dataset.prolong === "yes") {
      ds.deadline = ds.deadline + p.days;
      log(ds, `Prolongation de ${p.days} jours accordée, délai au ${fmtDate(ds.deadline)}`);
      pv(`${b.name} (${ds.id}) : prolongation de ${p.days} jours accordée, délai au ${fmtDate(ds.deadline)}.`);
    } else {
      log(ds, "Prolongation refusée, délai maintenu");
      pv(`${b.name} (${ds.id}) : prolongation refusée, délai maintenu au ${fmtDate(ds.deadline)}.`);
    }
    delete ds.prolongation;
    rerender();
    return toast("Décision notée au procès-verbal. Le propriétaire est informé.");
  }
  if (t.dataset.obs) {
    const b = building(ds.b);
    ds.stage = "rapport";
    ds.deadline = Math.max(ds.deadline, 0) + 21;
    delete ds.observations;
    log(ds, `Observations admises, nouveau délai au ${fmtDate(ds.deadline)}`);
    pv(`${b.name} (${ds.id}) : observations admises, délai au ${fmtDate(ds.deadline)}.`);
    rerender();
    return toast("Observations admises, nouveau délai fixé.");
  }
  if (t.dataset.manif) {
    const m = MANIFS.find((x) => x.id === t.dataset.manif);
    STATE.manifs[m.id] = true;
    pv(`${m.name} (${fmtDate(m.date)}) : préavis favorable avec conditions.`);
    rerender();
    return toast("Préavis noté au procès-verbal.");
  }
  if (t.dataset.risk !== undefined) {
    UI.risk = t.dataset.risk;
    return render();
  }
  if (t.dataset.ans) {
    const d = STATE.drafts[t.dataset.b];
    d.answers[t.dataset.p] = d.answers[t.dataset.p] === t.dataset.ans ? undefined : t.dataset.ans;
    if (!d.answers[t.dataset.p]) delete d.answers[t.dataset.p];
    return rerender();
  }
  if (t.dataset.sev) {
    STATE.drafts[t.dataset.b].sev[t.dataset.p] = t.dataset.sev;
    return rerender();
  }
  if (t.dataset.finish) return finishControl(t.dataset.finish);
  if (t.dataset.copy === "letter") return copy(document.getElementById("modal")._copy);
  if (t.hasAttribute("data-close") && !t.dataset.action) return closeDialogs();
  const a = t.dataset.action;
  if (a === "search") return openSearch();
  if (a === "close-modal") return document.getElementById("modal").close();
  if (a === "intro-close") {
    STATE.introSeen = true;
    return rerender();
  }
  if (a === "print") return window.print();
  if (a === "print-letter") {
    let area = document.getElementById("print-area");
    if (!area) {
      area = document.createElement("div");
      area.id = "print-area";
      document.body.appendChild(area);
    }
    area.innerHTML = `<pre>${esc(document.getElementById("modal")._copy)}</pre>`;
    document.body.classList.add("print-letter");
    window.print();
    return document.body.classList.remove("print-letter");
  }
  if (a === "pv-copy") return copy(`Procès-verbal · séance de la police du feu du ${fmtDate(CONFIG.seance.day)}\n\n` + STATE.pv.map((p, k) => `${k + 1}. ${p.text}`).join("\n"));
  if (a === "plan") {
    const v = document.getElementById("plan-date").value;
    const d = Math.round((new Date(v + "T12:00:00") - TODAY) / DAY);
    if (!(d >= 0)) return toast("Choisissez une date à venir.");
    for (const id of UI.sel) STATE.plans[id] = d;
    pv(`Tournée de contrôles périodiques fixée au ${fmtDate(d)} : ${[...UI.sel].map((id) => building(id).name).join(", ")}.`);
    const n = UI.sel.size;
    UI.sel.clear();
    rerender();
    return toast(`${plural(n, "contrôle planifié", "contrôles planifiés")} le ${fmtDate(d)}. Les avis de contrôle sont prêts.`);
  }
  if (a === "reset") {
    if (!confirm("Réinitialiser la démonstration ? Les décisions, preuves et contrôles ajoutés seront effacés.")) return;
    STATE = freshState();
    enrichBuildings();
    Object.assign(UI, { q: "", bq: "", village: "", risk: "" });
    UI.sel.clear();
    rerender();
    return toast("Démonstration réinitialisée.");
  }
});

function finishControl(id) {
  const b = building(id);
  const d = STATE.drafts[id];
  const defects = Object.entries(d.answers)
    .filter(([, a]) => a === "def")
    .map(([p]) => {
      const pt = findPoint(p);
      return { title: pt.d, ref: pt.ref, sev: d.sev[p] || pt.sev || "important", loc: d.notes[p] || "Emplacement à préciser", status: "ouvert", ...(d.photos[p] ? { photo: d.photos[p] } : {}) };
    });
  STATE.done[id] = 0;
  applyDone();
  delete STATE.plans[id];
  delete STATE.drafts[id];
  if (!defects.length) {
    pv(`${b.name} : contrôle périodique sans défaut.`);
    rerender();
    toast("Contrôle enregistré sans défaut. Pensez à le reporter dans SIBAT.");
    location.hash = `#/batiments/${id}`;
    return;
  }
  const n = STATE.dossiers.filter((x) => x.id.startsWith("PF-2026")).length + 30;
  const ds = { id: `PF-2026-0${n}`, b: id, control: 0, stage: "brouillon", deadline: null, source: "Contrôle périodique", defects, history: [{ d: 0, text: "Contrôle périodique effectué, rapport à signer", who: "Commune" }], sibat: { control: false, levee: false } };
  STATE.dossiers.unshift(ds);
  saveState();
  location.hash = `#/dossiers/${ds.id}`;
  toast(`Rapport rédigé : ${plural(defects.length, "défaut", "défauts")}. Il apparaît dans l’ordre du jour du jeudi.`);
}

document.addEventListener("change", async (e) => {
  const t = e.target;
  if (t.dataset.input === "village") {
    UI.village = t.value;
    if (parseRoute().q.v !== undefined) {
      location.hash = "#/" + parseRoute().path;
      return;
    }
    return render();
  }
  if (t.dataset.sel) {
    t.checked ? UI.sel.add(t.dataset.sel) : UI.sel.delete(t.dataset.sel);
    const bar = document.getElementById("planbar");
    bar.innerHTML = planbar();
    bar.classList.toggle("on", UI.sel.size > 0);
    return;
  }
  if (t.dataset.sibat) {
    dossier(t.dataset.id).sibat[t.dataset.sibat] = t.checked;
    rerender();
    return toast(t.checked ? "Report dans SIBAT noté." : "Report dans SIBAT retiré.");
  }
  if (t.name === "f" && t.closest(".drop")) {
    const drop = t.closest(".drop");
    drop.classList.toggle("has", !!t.files[0]);
    drop.querySelector("b").textContent = t.files[0] ? t.files[0].name : "Photo ou attestation";
    drop.querySelector("small").textContent = t.files[0] ? `${Math.max(1, Math.round(t.files[0].size / 1024))} Ko · prêt à envoyer` : "JPG, PNG ou PDF";
    return;
  }
  if (t.dataset.photo) {
    const f = t.files[0];
    if (!f) return;
    STATE.drafts[t.dataset.b].photos[t.dataset.photo] = f.name;
    return rerender();
  }
});

document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.dataset.input === "q") {
    UI.q = t.value;
    const pos = t.selectionStart;
    render();
    const n = document.querySelector('[data-input="q"]');
    n.focus();
    n.setSelectionRange(pos, pos);
  } else if (t.dataset.input === "bq") {
    UI.bq = t.value;
    const el = document.getElementById("blist") || document.getElementById("plist");
    if (document.getElementById("blist")) el.innerHTML = buildingTable();
    else {
      const pos = t.selectionStart;
      render();
      const n = document.querySelector('[data-input="bq"]');
      n.focus();
      n.setSelectionRange(pos, pos);
    }
  } else if (t.dataset.note) {
    STATE.drafts[t.dataset.b].notes[t.dataset.note] = t.value;
    saveState();
  } else if (t.id === "gsearch") {
    document.getElementById("gresults").innerHTML = searchResults(t.value);
  }
});

document.addEventListener("submit", async (e) => {
  const f = e.target;
  e.preventDefault();
  if (f.dataset.ownerProof) {
    const ds = dossier(f.dataset.ownerProof);
    const x = ds.defects[Number(f.dataset.k)];
    const file = f.f.files[0];
    if (!file) return;
    const data = await readFile(file);
    x.status = "preuve";
    delete x.rejected;
    x.proof = { d: 0, by: "Propriétaire", kind: /pdf/.test(file.type) ? "Attestation" : "Photo", name: file.name, note: f.n.value.trim(), ...(data ? { data } : {}) };
    log(ds, `Preuve déposée : ${x.title}`, "Propriétaire");
    if (!saveState()) {
      delete x.proof.data;
      saveState();
    }
    render();
    return toast("Preuve envoyée. Elle apparaît dans l’ordre du jour de la commune.");
  }
  if (f.dataset.ownerProlong) {
    const ds = dossier(f.dataset.ownerProlong);
    ds.prolongation = { d: 0, days: Number(f.days.value), reason: f.r.value.trim() };
    log(ds, `Demande de prolongation de ${f.days.value} jours`, "Propriétaire");
    rerender();
    return toast("Demande envoyée. Réponse après la séance du jeudi.");
  }
  if (f.dataset.ownerObs) {
    const ds = dossier(f.dataset.ownerObs);
    ds.observations = { d: 0, text: f.t.value.trim() };
    log(ds, "Observations reçues", "Propriétaire");
    rerender();
    return toast("Observations envoyées à la commune.");
  }
});

document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    closeDialogs();
    openSearch();
  }
  if (e.key === "Enter" && e.target.id === "gsearch") {
    const first = document.querySelector("#gresults .g-r");
    if (first) first.click();
  }
});
document.getElementById("modal").addEventListener("close", (e) => e.target.classList.remove("top"));
window.addEventListener("hashchange", () => {
  if (/^#ag-/.test(location.hash)) return;
  closeDialogs();
  render();
});
// Ancres internes de la séance : défilement sans changer de route.
document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#ag-"]');
  if (!a) return;
  e.preventDefault();
  const el = document.querySelector(a.getAttribute("href"));
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
});

// Contrôles terminés dans la démonstration : ils remplacent la date du dernier contrôle.
function applyDone() {
  for (const b of BUILDINGS) {
    const d = (STATE.done || {})[b.id];
    if (d === undefined) continue;
    b.last = d;
    b.next = d + RISK[b.risk].years * 365;
  }
}

enrichBuildings();
STATE = loadState();
STATE.done = STATE.done || {};
applyDone();
render();
