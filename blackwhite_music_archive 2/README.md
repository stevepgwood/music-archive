# Black & White Music Archive — starter

This is the first, front-end-only prototype for your music archive.

## What works now
- Responsive black-and-white layout
- Demo track list with artwork placeholders
- Search by title, artist, genre, or key
- Genre filtering
- Sort by date, title, BPM, or key
- Shared audio player UI with play/pause, next/previous, and seek controls

## What is not connected yet
The demo tracks are placeholders. No music is uploaded or stored by this starter. The admin login, secure uploads, database, and published/draft permissions must be added before using it as a real music site.

## Preview locally
Open `index.html` in a browser. For a better local development experience, use a local static server such as VS Code Live Server.

## Planned production architecture
- Cloudflare Pages: website hosting
- Cloudflare Worker: authenticated admin API
- Cloudflare D1: track metadata and draft/published state
- Cloudflare R2: audio files and artwork
- Worker-enforced authorization: only your account can upload, edit, publish, or delete
- Public endpoints: only return published tracks and playback URLs

Do not put Cloudflare API tokens, R2 secrets, or admin credentials in front-end JavaScript. Secrets belong in Worker environment bindings.
