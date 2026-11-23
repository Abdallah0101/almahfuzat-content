# Mahfuzat content

This repository contains public poem data, not application code. `docs/` is the GitHub Pages root, and `docs/manifest.json` is the app's only catalog discovery entry point.

## Current editing workflow

The standalone Telegram bridge is archived and removed from the working system. No bot, server, or always-on process is required.

1. The owner sends poem text to the personal assistant on Telegram or edits it directly in VS Code.
2. The editor updates only `docs/poems/<id>.json` and follows [AGENTS.md](AGENTS.md).
3. Run `npm run manifest && npm run check` locally.
4. Commit and push to `main`.
5. GitHub Actions validates the content and publishes `docs/`.
6. The app synchronizes through `manifest.json`, `revision`, and SHA-256.

This repository contains data. Do not restore the archived bridge or propose a replacement server unless the owner explicitly requests it.

## Local validation

```sh
npm ci
npm run manifest
npm run check
```

`update-manifest` reads the actual poem files, hashes their exact bytes, and increments `catalog_version` only when the catalog changes. Re-running it without a content change is idempotent.

## Content rules

- A verse `id` is permanent. Only `number` changes when verses are inserted or reordered.
- Verse numbers are consecutive starting at 1.
- `text` equals `first_hemistich`, one newline, then `second_hemistich`.
- Increase `revision` by exactly 1 when changing an existing poem.
- Use `is_complete=false` during incremental additions.
- Preserve the original Arabic text and diacritics. Never invent or silently correct verses.
- Never commit personal recordings, backups, credentials, or user identifiers.
- `mahfuzat-demo.json` is synthetic test data, not an attributed scientific poem.

## Publishing

Pushes to `main` run `.github/workflows/validate-and-publish.yml`. The workflow regenerates and checks the manifest, runs tests, and publishes `docs/` through GitHub Pages. Git history provides rollback points.

Public catalog:

```text
https://abdallah0101.github.io/almahfuzat-content/manifest.json
```
