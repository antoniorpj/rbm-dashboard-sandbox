# RBM Dashboard Sandbox

Minimal Next.js project that reproduces the setup of the Global Malaria Dashboard (RBM Partnership to End Malaria / UNOPS) so that an external team can develop **one module** that will later be copied into the main project.

Full guide of rules and structure: [Integration guidelines — External dashboard](LINK_TO_DOC).

## Requirements

- Node.js 20 (`nvm use` reads the `.nvmrc`)
- npm (the `package-lock.json` is committed; CI uses `npm ci`)

## Running

```bash
npm ci
cp "src/app/[locale]/unitaid/.env.example" .env.local
npm run dev
# http://localhost:3000/en/unitaid  (also /fr/unitaid and /pt/unitaid)
```

## Where to code

Only these three folders belong to the external team; everything else is the "host" and is protected:

```
src/app/[locale]/unitaid/   # page, components, hooks, services, lib (server-only), types, i18n, docs
src/app/api/unitaid/        # API routes: data (GET proxy) and notifications (POST)
public/unitaid/             # static assets of the module
```

Read `src/app/[locale]/unitaid/README.md` for the responsibility of each subfolder.

## What not to touch

Any file outside the three folders above (configuration files, `src/config.ts`, `src/i18n.ts`, the shell in `src/ui/shell`, `messages/*.json`, `package.json`, `scripts/`). The contract script stores the hash of each of these files in `scripts/protected-files.json` and fails if any of them changes.

Need a new dependency or a change in the host? Record it in `src/app/[locale]/unitaid/INTEGRATION.md` and agree with the internal team first.

## Validation (local and CI)

```bash
npm run lint             # ESLint (next/core-web-vitals)
npm run format:check     # Biome (tabs, double quotes); `npm run format` fixes
npm run check:contract   # integration rules (folders, i18n, imports, env, dependencies)
npm run build            # production build, no network
```

The `.github/workflows/ci.yml` workflow runs the four commands on every push and pull request. A contract failure prints the group (`[paths]`, `[protected]`, `[i18n]`, `[imports]`, `[env]`, `[deps]`) and the file involved.

## Delivery

1. The four commands above are green.
2. The module's `INTEGRATION.md`, `README.md` and `.env.example` are filled in.
3. A tag or commit is communicated to the internal team, which copies the three folders into the main project.

## For the maintainer (internal team)

After changing any starter file, regenerate the manifests:

```bash
node scripts/check-contract.mjs --snapshot
```

This rewrites `scripts/protected-files.json` and `scripts/approved-dependencies.json`. CI never uses `--snapshot`.
