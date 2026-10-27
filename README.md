# Gibloux · Police du feu

Maquette statique autonome, en français de Suisse, préparée pour la police du feu de la Commune de Gibloux (district de la Sarine, canton de Fribourg). Aucun paquet ni service externe au chargement.

Elle suit ce qui se passe entre le contrôle d’un bâtiment et la levée du dernier défaut. SIBAT, le système d’information du bâtiment de l’ECAB, reste la référence : la maquette ne le remplace pas et rappelle ce qui reste à y reporter.

## Parcours conseillé pour la séance du jeudi (10 minutes)

1. **Séance du jeudi** : l’ordre du jour se construit seul (rapports à signer, preuves reçues, prolongations, observations, délais échus, levées à confirmer, manifestations).
2. **Preuves reçues** → « Lever le défaut » : la décision s’inscrit au procès-verbal à droite.
3. **Résidence Les Lilas** → accorder la prolongation de 60 jours.
4. **Ferme En Craux** → « Voir le courrier » : requête au préfet selon l’art. 48 LECAB.
5. **Contrôle sur place** (sur téléphone) : grille par directive AEAI, défaut, gravité, photo → « Terminer » crée le dossier et le rapport à signer.
6. **Espace propriétaire** : ce que reçoit le propriétaire, avec dépôt de preuve et demande de prolongation sans compte.
7. **Planification** : sélectionner des bâtiments d’un même village et fixer la tournée.

## Cadre juridique repris

- LECAB (RSF 732.1.1) : art. 23 (tâches de la commune, dénonciation au préfet), art. 42 (contrôle des bâtiments, spécialiste accrédité), art. 47 (interdiction de faire du feu), art. 48 (travaux ordonnés par le préfet, exécution aux frais du propriétaire), art. 129 (amende de 50 à 2000 francs).
- Règlement de l’ECAB du 20 juin 2018 : art. 15 (typologie, système d’information du bâtiment), art. 18 (contrôle périodique tous les 5 ans à risque élevé, tous les 10 ans à risque faible, habitations individuelles exclues), art. 19 (tâches du ou de la spécialiste communal·e, notamment let. g et i).
- Directives de protection incendie AEAI 2015 : 12-15, 15-15, 16-15, 17-15, 18-15, 20-15, 24-15, 25-15, 26-15.

À faire valider par la commune avant tout usage : les délais par gravité (10, 30, 60 jours), le délai du droit d’être entendu (10 jours), les voies de droit des décisions et les modèles de courriers. Ce sont des propositions de démonstration, pas des prescriptions.

## Configuration

Les données sont en tête de `app.js` : `CONFIG` (villages, délais, séance), `BUILDINGS` (36 bâtiments fictifs), `CHECKLIST` (grille de contrôle), `seedDossiers()` (13 dossiers illustratifs). Changer `storageKey` à chaque nouvelle version des données.

## Lancer

```sh
python3 -m http.server 4173
```

Ouvrir http://localhost:4173. Le bouton « Réinitialiser » restaure la démonstration.

## Limites assumées

- Aucune connexion à SIBAT : les cases « reporté dans SIBAT » gardent seulement la trace.
- Bâtiments, propriétaires, EGID et dossiers sont fictifs ; seuls les noms des villages sont réels.
- Décisions, preuves et contrôles ajoutés restent dans ce navigateur uniquement.
## Déploiement

Importer le dépôt `Callme7liwa/gibloux` dans un **nouveau** projet Vercel : branche `main`, dossier racine `.`, preset **Other**, sans commande de build, dossier de sortie `.`.

## Indexation

- Le HTML contient `noindex,nofollow,noarchive`, `robots.txt` interdit l’exploration et `vercel.json` ajoute `X-Robots-Tag`. Ces réglages ne constituent pas un contrôle d’accès.
