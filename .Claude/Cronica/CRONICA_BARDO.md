# 🪕 A Crônica do Bardo — LabRep

> *"O que o tempo apaga, a canção preserva. Este pergaminho é a memória imutável do sistema."*
> Iniciado em: 2026-06-04 | Cronista: Bardo

---

## 📜 O Pergaminho de Fundação

### Era 0 — Sprint 0: A Fundação (2026-06-04)
**Decreto do Arquimago:** SELADO ✅
**Fase validada pelo Círculo completo (5 Magos)**

#### O que foi construído

O projeto LabRep saiu do estado de "especificação pura" para um repositório funcional com banco de dados ativo. A Tiamat havia traçado o plano; o Beholder o executou.

**Artefatos criados e validados:**

| Artefato | Função | Status |
|----------|--------|--------|
| `CLAUDE.md` | Memória central: stack, RNs, convenções | ✅ Selado |
| `.gitignore` / `.gitattributes` | Line endings LF + exclusão do .env | ✅ Selado |
| `.env.example` | Template de variáveis sem valores reais | ✅ Selado |
| `vercel.json` | SPA rewrite + cron 10h + headers de segurança | ✅ Selado |
| `api/lib/db.js` | Singleton TursoDB — zero reconexões por request | ✅ Selado |
| `api/lib/auth.js` | Middleware Clerk JWT — repId SEMPRE do token | ✅ Selado |
| `api/lib/validate.js` | validateCNPJ() + sanitize() + generateId() | ✅ Selado |
| `api/lib/planGuard.js` | Limites por plano (Free: 30 matrizes) | ✅ Selado |
| `api/v1/auth/me.js` | GET /api/v1/auth/me — sessão autenticada | ✅ Selado |
| `migrations/001_initial.sql` | DDL v1.1: 8 tabelas, 9 índices, 2 views | ✅ Selado |
| `scripts/migrate.mjs` | Runner de migration via process.env | ✅ Selado |
| GitHub | https://github.com/Awsof/LabRep.git | ✅ 2 commits |
| TursoDB | 27 objetos criados em labrep-awsof.aws-us-east-1.turso.io | ✅ Ativo |

#### Decisões arquiteturais registradas (por que não reverter)

**1 — Vanilla JS sem framework (Tiamat v1.0)**
Stack: Vanilla JS ES2022, sem React/Vue/Angular. Bundle <80KB sem build step. Decisão validada por experiência prévia em DB Lab Manager e Borboletando. Reverter exigiria reescrita total do frontend e introduziria dependências de terceiros com ciclos de breaking changes.

**2 — TursoDB (libSQL) em vez de PostgreSQL**
Banco SQLite distribuído com replicação edge. Latência <50ms no Brasil. Gratuito até ~3k usuários ativos. SQL padrão — fácil migrar para PostgreSQL em Fase 4 se necessário. O DDL usa apenas SQL92 padrão deliberadamente para garantir portabilidade futura.

**3 — Hierarquia Matriz/Posto no schema (Adendo v1.1)**
Campo `tipo_unidade` e FK auto-referencial `matriz_id` na tabela `clientes`. UNIQUE INDEX parcial: `WHERE matriz_id IS NULL AND cnpj IS NOT NULL`. Esta estrutura suporta a Rede LabForte (60 associados, 620 unidades) sem violar a unicidade de CNPJ por representante. Reverter quebraria toda a lógica de postos de coleta.

**4 — Pipeline com CHECK constraint XOR (Adendo v1.1)**
`CHECK((cliente_id IS NOT NULL AND grupo_id IS NULL) OR (cliente_id IS NULL AND grupo_id IS NOT NULL))`. Garante que negociações são com cliente OU grupo — nunca ambos, nunca nenhum. Enforced no banco, não apenas na aplicação. Reverter introduziria estados inválidos impossíveis de detectar.

**5 — `rep_id` NUNCA do request body (RN-02)**
Todo middleware `requireAuth()` extrai `repId` do JWT Clerk verificado no servidor. Nenhum endpoint aceita `rep_id` como parâmetro de entrada. Esta decisão impede IDOR (Insecure Direct Object Reference) e é o pilar de segurança do sistema. Qualquer exceção a esta regra abre vetor de acesso cruzado entre representantes.

---

## 📜 O Pergaminho de Correções

### Correção #1 — 2026-06-04 | Era: Sprint 0
**Módulo:** `scripts/migrate.mjs`
**Detectado por:** Mago da Abjuração (Círculo do Arquimago)
**Executado por:** Beholder

> **Antes:** `TURSO_AUTH_TOKEN` hardcoded no arquivo `scripts/migrate.mjs`. O arquivo foi commitado em `063851c` e pushado para o repositório público `github.com/Awsof/LabRep`. O token JWT continha claim `"a":"rw"` — acesso completo de leitura e escrita ao banco de produção.
>
> **Após:** Credenciais removidas. Arquivo reescrito para usar `process.env.TURSO_DATABASE_URL` e `process.env.TURSO_AUTH_TOKEN`. Validação de presença obrigatória das variáveis com `process.exit(1)` se ausentes. Histórico git reescrito via `git reset --soft HEAD~1` + recomit + `git push --force-with-lease`. Commit limpo: `34c5881`.
>
> **Por que não reverter:** Hardcodar credenciais em qualquer arquivo de código é violação crítica de segurança, especialmente em repositório público. Scripts de infraestrutura devem sempre ler credenciais de variáveis de ambiente ou de um gerenciador de segredos. Regra aplicável a TODO arquivo do projeto sem exceção.

> **Ação concluída (2026-06-04):** Todos os tokens do banco foram invalidados via "Invalidate All Tokens" no dashboard TursoDB. Novo token gerado com `iat: 1780613651` (diferença confirmada de 1181s em relação ao token comprometido). Conexão verificada com sucesso — 7 tabelas acessíveis. `.env` atualizado com novo token. **Correção #1 totalmente encerrada.**

---

## 📜 Decretos do Arquimago

### Decreto #1 — Sprint 0 — 2026-06-04
**Status:** ✅ SELADO

```
Mago da Ordem      → APROVADO (ressalva: plano_expira_em não verificado — escopo Sprint 2)
Mago da Abjuração  → APROVADO (bloqueante Correção #1 resolvido antes do selo)
Mago da Transmut.  → APROVADO
Mago da Ilusão     → APROVADO (sem frontend — dentro do escopo declarado)
Mago Evocador      → APROVADO (validate.js e auth.js robustos contra inputs adversariais)
```

**Autorização:** ✅ Sprint 1 AUTORIZADO. Token rotacionado e verificado em 2026-06-04.

---

## 🗺️ Estado Atual do Projeto

**Fase:** Sprint 0 concluído → Sprint 1 autorizado
**Repositório:** https://github.com/Awsof/LabRep.git (branch: main, 2 commits)
**Banco:** libsql://labrep-awsof.aws-us-east-1.turso.io (27 objetos)
**Projeto local:** C:\Users\antonio.filho\Documents\LabRep

**Próxima missão (Sprint 1 — Semanas 5–6):**
- Completar `CLERK_SECRET_KEY` no `.env`
- Criar `public/index.html` (SPA entry point)
- Criar `public/assets/js/router.js` (hash routing)
- Criar `public/assets/js/api.js` (fetch wrapper com JWT inject)
- Criar `public/assets/js/auth.js` (Clerk SDK vanilla)
- Criar `public/assets/css/design-system.css`
- Conectar projeto ao Vercel + configurar variáveis de ambiente
- Critério de conclusão: `GET /api/v1/auth/me` com JWT válido → 200
