<p align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/pufferfin-logo-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset=".github/assets/pufferfin-logo.svg">
  <img alt="Pufferfin logo" src=".github/assets/pufferfin-logo.svg" width="160">
</picture>
</p>

<h1 align="center">Pufferfin Web</h1>

<p align="center">
The web client for Pufferfin: a complete media server, forked from <a href="https://github.com/jellyfin/jellyfin">Jellyfin</a>,<br/>
with an Apple TV style interface and built-in control of the *arr stack.
</p>

---

> [!WARNING]
> **Work in progress.** No release yet. The Pufferfin interface lives in
> `src/apps/pufferfin`; the rest of the client is still Jellyfin Web.

## What Pufferfin adds to Jellyfin

Pufferfin keeps everything Jellyfin does (library, playback, transcoding, accounts, resume,
subtitles) and adds:

- **An Apple TV style interface**: large artwork, black background, smooth animations,
  keyboard and remote navigation.
- **A complete catalog, not just your disks**: movies, shows and people from TMDB,
  audiobooks from Audible. Titles missing from your disks appear next to the ones you
  own.
- **A single "Play" / "Download" button**: if the title is there, it plays; otherwise,
  Pufferfin drives Radarr, Sonarr, Prowlarr, qBittorrent, Bazarr and Shelfmark to fetch
  it.

## A fork of Jellyfin

Pufferfin is a fork of [Jellyfin](https://github.com/jellyfin/jellyfin), the free software
media system; this repository is a fork of
[`jellyfin/jellyfin-web`](https://github.com/jellyfin/jellyfin-web). Most of the code in
this repository is the work of Jellyfin and its contributors, and Pufferfin would not exist
without them. Pufferfin is neither affiliated with nor endorsed by the Jellyfin team: for
an issue specific to Pufferfin, open it here, not with Jellyfin.

The fork tracks upstream closely: Jellyfin Web releases are merged into Pufferfin
regularly, and Pufferfin's own code is kept isolated so these merges stay simple.

## This repository

This repository contains the **official web client** for Pufferfin. It serves browsers,
mobile and TV.

It is not distributed on its own: it is built and **shipped in the same Docker image as
the server** ([`Lumen2-0/Pufferfin`](https://github.com/Lumen2-0/Pufferfin)), and follows
the same major version. To install Pufferfin, follow the deployment described in the server
repository.

## Development

Prerequisites: [Node.js](https://nodejs.org/en/download) (version specified in
[`package.json`](package.json), `engines` field) and npm.

```sh
git clone https://github.com/Lumen2-0/Pufferfin-web.git
cd Pufferfin-web
npm install
npm start                   # development server
npm run build:development   # build with sourcemaps
```

The client needs a Pufferfin server to run: see
[`Lumen2-0/Pufferfin`](https://github.com/Lumen2-0/Pufferfin).

## License

Like Jellyfin Web, Pufferfin Web is distributed under the **GNU General Public License
v2.0**. See [`LICENSE`](LICENSE). Code originating from Jellyfin remains the property of
its authors; changes made by Pufferfin are released under the same license.
