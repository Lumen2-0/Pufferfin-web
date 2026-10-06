<p align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/pufferfin-logo-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset=".github/assets/pufferfin-logo.svg">
  <img alt="Logo Pufferfin" src=".github/assets/pufferfin-logo.svg" width="160">
</picture>
</p>

<h1 align="center">Pufferfin Web</h1>

<p align="center">
Le client web de Pufferfin : un serveur multimédia complet, fork de <a href="https://github.com/jellyfin/jellyfin">Jellyfin</a>,<br/>
avec une interface façon Apple TV et le pilotage de la stack *arr.
</p>

---

> [!WARNING]
> **Projet en construction.** Rien n'est encore livré : pas de version publiée. Ce dépôt est
> aujourd'hui très proche de Jellyfin Web ; les fonctionnalités décrites ci-dessous sont la
> cible du projet, pas son état actuel.

## Ce que Pufferfin ajoute à Jellyfin

Pufferfin garde tout ce que fait Jellyfin — bibliothèque, lecture, transcodage, comptes,
reprise de lecture, sous-titres — et y ajoute :

- **Une interface façon Apple TV** : grands visuels, fond noir, animations douces, navigation
  au clavier et à la télécommande.
- **Un catalogue complet, pas seulement le disque** : films, séries et personnes depuis TMDB,
  livres audio depuis Audible. Les titres absents de vos disques apparaissent à côté de ceux
  que vous possédez.
- **Un bouton unique « Lire » / « Télécharger »** : si le titre est là, on le lit ; sinon,
  Pufferfin pilote Radarr, Sonarr, Prowlarr, qBittorrent, Bazarr et Shelfmark pour aller le
  chercher.

## Un fork de Jellyfin

Pufferfin est un fork de [Jellyfin](https://github.com/jellyfin/jellyfin), le système
multimédia libre ; ce dépôt est un fork de
[`jellyfin/jellyfin-web`](https://github.com/jellyfin/jellyfin-web). L'essentiel du code de
ce dépôt est celui de Jellyfin et de ses contributeurs, et Pufferfin n'existerait pas sans
leur travail. Pufferfin n'est ni affilié à l'équipe Jellyfin ni soutenu par elle : pour un
problème propre à Pufferfin, ouvrez une issue ici, pas chez Jellyfin.

Le fork suit l'amont de près : les versions de Jellyfin Web sont fusionnées régulièrement
dans Pufferfin, et le code propre à Pufferfin est isolé pour que ces fusions restent simples.

## Ce dépôt

Ce dépôt contient le **client web officiel** de Pufferfin. C'est lui qui sert le navigateur,
le mobile et la TV.

Il n'est pas distribué seul : il est compilé et **livré dans la même image Docker que le
serveur** ([`Pufferfin/Pufferfin`](https://github.com/Pufferfin/Pufferfin)), et suit la même
version majeure que lui. Pour installer Pufferfin, suivez le déploiement décrit dans le dépôt
serveur.

## Développement

Prérequis : [Node.js](https://nodejs.org/en/download) (version indiquée dans
[`package.json`](package.json), champ `engines`) et npm.

```sh
git clone https://github.com/Pufferfin/Pufferfin-web.git
cd Pufferfin-web
npm install
npm start                   # serveur de développement
npm run build:development   # build avec sourcemaps
```

Le client a besoin d'un serveur Pufferfin pour fonctionner : voir
[`Pufferfin/Pufferfin`](https://github.com/Pufferfin/Pufferfin).

## Licence

Pufferfin Web est distribué, comme Jellyfin Web, sous **GNU General Public License v2.0**.
Voir [`LICENSE`](LICENSE). Le code issu de Jellyfin reste la propriété de ses auteurs ; les
modifications apportées par Pufferfin sont publiées sous la même licence.
