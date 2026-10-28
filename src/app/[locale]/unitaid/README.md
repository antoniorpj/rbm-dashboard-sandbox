# Módulo `unitaid`

Esta pasta e `src/app/api/unitaid/` são as únicas áreas editáveis pela equipe externa. Tudo o que estiver aqui será copiado tal como está para o Global Malaria Dashboard.

## Responsabilidade de cada pasta

| Pasta / arquivo | O que vai aqui |
| --- | --- |
| `page.tsx` | Server component: só `generateMetadata` e `<PageContent />` |
| `page-content.tsx` | `"use client"`: composição da página |
| `components/` | Componentes React exclusivos do módulo (gráficos, filtros, cards) |
| `hooks/` | Hooks (ex.: `useUnitaidDataset`) |
| `services/` | Chamadas a `/api/unitaid/...` tipadas (client-side) |
| `lib/` | Código **server-only**: fontes externas, parsers, cache, env. Começa com `import "server-only"` |
| `types/` | Tipos e contratos compartilhados entre página e API |
| `utils/` | Funções puras (formatadores, opções de gráfico) |
| `data/` | Dados estáticos pequenos (listas, mapeamentos). Assets maiores vão em `public/unitaid/` |
| `styles/` | CSS próprio, classes prefixadas `.unitaid-` |
| `i18n/` | Traduções do módulo (`en`, `fr`, `pt`), mesmas chaves nos três |
| `.env.example` | Todas as variáveis `UNITAID_*` com valor de exemplo |
| `INTEGRATION.md` | O que a equipe interna precisa fazer fora do módulo |

## Regras rápidas

- O navegador só chama `/api/unitaid/...`; fontes externas e segredos ficam em `lib/` e nas rotas de API.
- `process.env` só em `lib/env.ts` e em `src/app/api/unitaid/**`.
- Imports do hospedeiro permitidos: `@/navigation`, `@/fonts`, `@/utils/server/crypto`, `@/utils/common-functions`, `next-intl`.
- Nenhuma string visível fora de `i18n/`.
- `npm run check:contract` valida tudo isso; o CI roda o mesmo comando.

## Fonte de dados de exemplo

`GET /api/unitaid/data?dataset=sample` lê `UNITAID_SOURCE_URL` (CSV publicado) e, se a variável estiver vazia ou a fonte falhar, usa `public/unitaid/sample.csv`. O build e o desenvolvimento local funcionam sem rede.

## Notificações

`POST /api/unitaid/notifications` exige `Authorization: Bearer <UNITAID_NOTIFICATIONS_TOKEN>` e um JSON com `eventId`, `type`, `occurredAt` (ISO 8601) e `data` opcional.

```bash
curl -X POST http://localhost:3000/api/unitaid/notifications \
  -H "Authorization: Bearer change-me" \
  -H "Content-Type: application/json" \
  -d '{"eventId":"evt-001","type":"dataset.updated","occurredAt":"2026-10-27T12:00:00Z","data":{"dataset":"sample"}}'
```

| Resposta | Significado |
| --- | --- |
| 202 | Aceito e registrado; cache do dataset invalidado |
| 200 `duplicate: true` | `eventId` já recebido |
| 400 | JSON inválido ou campos faltando |
| 401 | Token ausente ou inválido |
| 413 | Corpo maior que 1 MB |
| 503 | `UNITAID_NOTIFICATIONS_TOKEN` não configurado no servidor |

A persistência atual é em memória (`src/app/api/unitaid/_lib/store.ts`) e não sobrevive a reinícios; a implementação durável é decidida pela equipe interna na integração.
