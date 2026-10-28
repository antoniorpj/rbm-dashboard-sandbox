# INTEGRATION.md — módulo `unitaid`

Preenchido pela equipe externa. Lista tudo o que a equipe interna precisa fazer **fora** das pastas do módulo ao migrar para o Global Malaria Dashboard.

## 1. Identificação

| Item | Valor |
| --- | --- |
| Slug | `unitaid` |
| Namespace i18n | `Unitaid` |
| URL final | `/{locale}/unitaid` |
| Rotas de API | `GET /api/unitaid/data?dataset=sample`, `POST /api/unitaid/notifications` |
| Versão entregue | _preencher (tag ou commit do sandbox)_ |

## 2. Item de menu (sidebar)

| Campo | Valor |
| --- | --- |
| Grupo da sidebar | _a definir pela equipe interna_ |
| `href` | `/unitaid` |
| `translationKey` | `partners_subitem_unitaid` (renomear junto com as chaves em `i18n/*.json` se o grupo mudar) |
| `tooltipTranslationKey` | `partners_subitem_unitaid_tooltip` |
| Ícone (lucide-react) | `Activity` |
| Tag `New` | sim |

## 3. Variáveis de ambiente

| Variável | Obrigatória | Exemplo | Descrição |
| --- | --- | --- | --- |
| `UNITAID_SOURCE_URL` | não | `https://docs.google.com/spreadsheets/d/e/.../pub?output=csv` | CSV publicado da fonte externa; vazio usa a amostra incluída |
| `UNITAID_NOTIFICATIONS_TOKEN` | sim (produção) | `<segredo longo>` | Token Bearer exigido pelo endpoint de notificações |
| `UNITAID_REVALIDATE_SECONDS` | não | `300` | Cache do fetch externo em segundos |

## 4. Dependências novas

Nenhuma. (Se houver, listar nome, versão, justificativa e aprovação.)

## 5. Fontes externas

| Fonte | URL base | Autenticação | Formato | Atualização | Cache tag | Contato |
| --- | --- | --- | --- | --- | --- | --- |
| _preencher_ | | | CSV | | `unitaid-sample` | |

## 6. Endpoint de notificações

- Contrato: ver `README.md` (campos `eventId`, `type`, `occurredAt`, `data`).
- Emissor: _quem envia, com que frequência, de qual IP/serviço_.
- Segredo: configurar `UNITAID_NOTIFICATIONS_TOKEN` no ambiente e o mesmo valor no emissor.
- Persistência: a entrega usa memória (`src/app/api/unitaid/_lib/store.ts`); a equipe interna escolhe a implementação durável (S3 ou banco) trocando a classe retornada por `getNotificationStore()`.

## 7. Assets em `public/unitaid/`

| Arquivo | Uso | Tamanho |
| --- | --- | --- |
| `sample.csv` | Fallback do dataset `sample` | < 5 KB |

## 8. Opcionais

- URL localizada (`/pt/...`, `/fr/...`): _não solicitada_. Se solicitada, adicionar em `pathnames` no `src/config.ts` do hospedeiro: `'/unitaid': { en: '/unitaid', fr: '...', pt: '...' }`.
- Modo standalone (sem sidebar/header): _não_.
- `Link` tipado: o hospedeiro só precisa de `'/unitaid': '/unitaid'` em `pathnames` se usar `Link`/`useRouter` de `@/navigation` com esse destino.

## 9. Limitações e pendências

- _preencher_

## 10. Checklist de entrega

- [ ] `npm run lint` verde
- [ ] `npm run check:contract` verde
- [ ] `npm run build` verde (sem `UNITAID_SOURCE_URL`)
- [ ] Página abre em `/en/unitaid`, `/fr/unitaid`, `/pt/unitaid`
- [ ] Este arquivo, `README.md` e `.env.example` atualizados
