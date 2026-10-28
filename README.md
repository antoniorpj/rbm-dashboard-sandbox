# RBM Dashboard Sandbox

Projeto Next.js mínimo que reproduz a configuração do Global Malaria Dashboard (RBM Partnership to End Malaria / UNOPS) para que uma equipe externa desenvolva **um módulo** que depois será copiado para o projeto principal.

Guia completo de regras e estrutura: [Diretrizes de integração — Dashboard externo](LINK_DA_DOC).

## Requisitos

- Node.js 20 (`nvm use` lê o `.nvmrc`)
- npm (o `package-lock.json` é commitado; o CI usa `npm ci`)

## Rodar

```bash
npm ci
cp "src/app/[locale]/unitaid/.env.example" .env.local
npm run dev
# http://localhost:3000/en/unitaid  (também /fr/unitaid e /pt/unitaid)
```

## Onde codar

Só estas três pastas são da equipe externa; tudo o mais é o "hospedeiro" e é protegido:

```
src/app/[locale]/unitaid/   # página, componentes, hooks, services, lib (server-only), types, i18n, docs
src/app/api/unitaid/        # rotas de API: data (GET proxy) e notifications (POST)
public/unitaid/             # assets estáticos do módulo
```

Leia `src/app/[locale]/unitaid/README.md` para a responsabilidade de cada subpasta.

## O que não tocar

Qualquer arquivo fora das três pastas acima (configurações, `src/config.ts`, `src/i18n.ts`, shell em `src/ui/shell`, `messages/*.json`, `package.json`, `scripts/`). O script de contrato guarda o hash de cada um desses arquivos em `scripts/protected-files.json` e falha se algum mudar.

Precisa de uma dependência nova ou de uma alteração no hospedeiro? Registre em `src/app/[locale]/unitaid/INTEGRATION.md` e combine com a equipe interna antes.

## Validação (local e CI)

```bash
npm run lint             # ESLint (next/core-web-vitals)
npm run format:check     # Biome (tabs, aspas duplas); `npm run format` corrige
npm run check:contract   # regras de integração (pastas, i18n, imports, env, dependências)
npm run build            # build de produção, sem rede
```

O workflow `.github/workflows/ci.yml` roda os quatro comandos em todo push e pull request. Uma falha de contrato imprime o grupo (`[paths]`, `[protected]`, `[i18n]`, `[imports]`, `[env]`, `[deps]`) e o arquivo envolvido.

## Entrega

1. Os quatro comandos acima verdes.
2. `INTEGRATION.md`, `README.md` e `.env.example` do módulo preenchidos.
3. Tag ou commit indicado à equipe interna, que copia as três pastas para o projeto principal.

## Para o mantenedor (equipe interna)

Depois de alterar qualquer arquivo do starter, regenere os manifestos:

```bash
node scripts/check-contract.mjs --snapshot
```

Isso reescreve `scripts/protected-files.json` e `scripts/approved-dependencies.json`. O CI nunca usa `--snapshot`.
