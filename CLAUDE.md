# LabRep — Memória Central do Projeto

## O que é o LabRep

CRM vertical SaaS para representantes comerciais de laboratório clínico no Brasil. O representante é dono da própria carteira de clientes — independentemente de qual apoio (laboratório parceiro) ele trabalha. Ao migrar de apoio, leva tudo consigo.

**Repositório:** https://github.com/Awsof/LabRep.git
**Planejamento visual:** `labrep-planejamento.html` (na raiz)
**Especificação técnica:** Tiamat v1.0 + Adendo v1.1

---

## Stack Técnica (decisões imutáveis)

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Frontend | Vanilla JS (ES2022), sem framework | Zero dependências que quebram, bundle <80KB, sem build step |
| Roteamento | Hash Routing manual (`#/carteira`, `#/cliente/:id`) | SPA sem servidor de roteamento |
| Auth (frontend) | `@clerk/clerk-js` via CDN | SDK vanilla — sem React, sem Next.js |
| Cache offline | IndexedDB | Offline-first para uso em campo (celular sem sinal) |
| PWA | Service Worker + manifest.json | Instalável no Android como app nativo |
| Backend | Vercel Serverless Functions (Node.js 20.x) | Zero servidor para manter, escala automática |
| Auth (backend) | `@clerk/backend` — verifica JWT Clerk | Validação stateless no edge |
| Banco de dados | TursoDB (libSQL/SQLite distribuído) | SQL padrão, <50ms no Brasil, free até ~3k usuários |
| Pagamentos | Stripe (PIX + cartão) | Assinaturas recorrentes Pro/Pro+ |
| Email | Resend | Alertas de follow-up, confirmações |
| CNPJ | BrasilAPI (`brasilapi.com.br/api/cnpj/v1/:cnpj`) | Gratuito, preenche dados automaticamente |
| CI/CD | GitHub Actions → Vercel | Deploy automático em cada push para main |

**NÃO usar:** React, Next.js, Vue, Angular, Webpack, Vite, TypeScript (até Fase 4), ORM, Prisma.

---

## Regras de Negócio Críticas (RN)

- **RN-01 — Portabilidade total:** Exportação CSV disponível mesmo no plano Free. A carteira é do rep.
- **RN-02 — RLS por rep_id:** O `rep_id` em queries SEMPRE vem do JWT verificado, NUNCA de `req.body` ou `req.query`.
- **RN-03 — CNPJ único por matriz:** `UNIQUE INDEX` parcial: `WHERE matriz_id IS NULL AND cnpj IS NOT NULL`. Postos compartilham CNPJ da matriz sem violar constraint.
- **RN-04 — Histórico imutável:** Interações são soft-deleted (`arquivada = 1`), nunca hard-deleted.
- **RN-05 — Apoio como referência:** Sair de um apoio não apaga dados do representante.
- **RN-06 — Limites por plano:**
  - Free: máx 30 clientes-matriz, sem alertas, sem pipeline
  - Pro (R$79/mês): ilimitado, alertas, pipeline, PWA
  - Pro+ (R$149/mês): tudo + relatórios PDF + analytics
  - B2B (R$1.200/mês): dashboard de gestor de apoio
- **RN-07 — Hierarquia Matriz/Posto:** `tipo_unidade IN ('matriz','posto_coleta')`. Todo posto tem `matriz_id` válido.
- **RN-08 — CNPJ de Posto:** Posto com `cnpj_proprio=0` herda CNPJ da matriz para exibição, sem constraint de unicidade.
- **RN-09 — Mobile primário:** Busca + ficha rápida + registrar interação funcionam em 360px, 1 mão, 3G.
- **RN-10 — Pipeline de Grupo:** `pipeline` suporta `cliente_id` OU `grupo_id` (CHECK constraint — nunca ambos).
- **RN-11 — Mobile mínimo:** Busca, ficha, últimas 5 interações, registrar interação: <5s em 3G.
- **RN-12 — Offline obrigatório:** Registrar interação funciona sem internet (IndexedDB queue, sync ao reconectar).

---

## Hierarquia de Dados

```
Grupo (Rede LabForte, Grupo São Lucas)
  └── Cliente/Matriz (CNPJ único por rep)
        └── Posto de Coleta (CNPJ próprio ou herdado)
```

Pipeline pode ser contra um Cliente individual OU um Grupo inteiro.

---

## Estrutura de Arquivos

```
labrep/
├── .Claude/                ← Agentes AI (Beholder, Tiamat, Conselho, Cidade)
│   ├── Agents/             ← Beholder (11 olhos) + Tiamat (5 cabeças)
│   ├── Conselho/           ← Arquimago + 5 magos (Quality Gates)
│   ├── Cidade/             ← Bardo, Clérigo, Feiticeiro, Plebeu
│   ├── Cronica/            ← CRONICA_BARDO.md (histórico imutável)
│   └── Skills/             ← grimório de skills (Escudo Arcano, etc.)
├── .github/workflows/ci.yml
├── api/
│   ├── lib/                ← db.js, auth.js, planGuard.js, validate.js
│   └── v1/                 ← endpoints REST
├── public/
│   ├── index.html          ← SPA único
│   ├── manifest.json
│   ├── sw.js
│   └── assets/css/ + js/pages/
├── migrations/
│   └── 001_initial.sql
├── .env.example
├── .env                    ← NÃO commitar (no .gitignore)
├── .gitignore
├── vercel.json
└── CLAUDE.md               ← este arquivo
```

---

## Variáveis de Ambiente

Ver `.env.example` para a lista completa. Chaves já confirmadas:

```bash
CLERK_PUBLISHABLE_KEY=pk_test_51TedqKALOIEa04vtAm7Wie24SDTAoNxsN4LBHL1LJmBTjbDlhiKRmUVnTD7Vqenek2ShWV4FB6KujqQ7ZAuzhpL900x0PEUrIo
STRIPE_PUBLISHABLE_KEY=pk_test_51TedqKALOIEa04vtAm7Wie24SDTAoNxsN4LBHL1LJmBTjbDlhiKRmUVnTD7Vqenek2ShWV4FB6KujqQ7ZAuzhpL900x0PEUrIo
```

Chaves secretas (`sk_test_*`, `TURSO_AUTH_TOKEN`, `CRON_SECRET`) nunca entram no git.

---

## Ecossistema de Agentes (.Claude/)

| Agente | Função |
|--------|--------|
| Beholder | Orquestrador — roteia tarefas para os Olhos especialistas |
| Tiamat | Arquiteta — elabora especificações e planos de projeto |
| Arquimago | Quality Gate — audita entregas antes do merge |
| Bardo | Registra correções e decisões imutáveis na Crônica |

**Invocar Beholder** para qualquer tarefa de desenvolvimento.
**Invocar Tiamat** para planejamento de novas features.
**`[Conjurar: Escudo Arcano em arquivo]`** para proteger arquivos críticos de alteração.

---

## Convenções de Código

- **Sem comentários óbvios.** Apenas WHY não-óbvio (constraint, workaround, invariante).
- **ES Modules nativos:** `import/export` em todos os arquivos JS. Sem `require()`.
- **CSS Custom Properties:** Toda cor, espaçamento e tipografia via variável CSS em `design-system.css`.
- **XSS prevention:** Strings de origem externa injetadas via `innerHTML` passam por `sanitize()`. Exceção documentada: excerpts FTS com `<mark>` já sanitizados na persistência.
- **Sem console.log em produção:** CI bloqueia PR com `console.log` fora de blocos `if (DEV)`.
- **rep_id nunca do body:** Middleware `auth.js` injeta `repId` — endpoints nunca leem do request body.

---

## Comandos Úteis

```bash
# Desenvolvimento local (Vercel CLI)
npx vercel dev

# Criar banco TursoDB
turso db create labrep-prod

# Rodar migrations no banco
turso db shell labrep-prod < migrations/001_initial.sql

# Verificar sintaxe JS
node --check api/lib/auth.js

# Push inicial
git push -u origin main
```
