# Plataforma Integrada Jurídica e Imobiliária

Monorepo da plataforma descrita em [specs/constitution.md](specs/constitution.md).

## Estrutura

- `apps/web`: aplicação Next.js.
- `apps/api`: API NestJS.
- `packages/ui`: componentes compartilhados.
- `packages/contracts`: contratos TypeScript compartilhados.
- `packages/config`: configurações comuns.
- `packages/eslint-config`: regras compartilhadas de lint.
- `specs`: constituição, requisitos e backlog.

## Pré-requisitos

- Node.js 24 ou superior.
- Corepack com pnpm 12.9.1.
- Docker para o PostgreSQL local.

## Primeira execução

```bash
corepack pnpm install
docker compose up -d postgres
corepack pnpm --filter api prisma:migrate:deploy
corepack pnpm dev
```

Antes de iniciar, copie `.env.example` para `.env`, preencha as credenciais do Supabase e use apenas valores do ambiente apropriado. No Supabase Storage, crie um bucket privado com o nome definido por `SUPABASE_STORAGE_BUCKET` (o padrão é `documents`).

A API utiliza `http://localhost:3001/api/v1`, expõe o health check em `/api/v1/health` e a documentação Swagger em `/api/docs`.

O web usa Supabase Auth com sessão em cookies e protege o shell por validação no servidor. Endpoints privados da API exigem `Authorization: Bearer <jwt>` e o cabeçalho `x-organization-id` com uma organização vinculada ao usuário. Administradores precisam apresentar uma sessão Supabase com nível `aal2`.

## Verificações

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Para mudanças de banco, siga as convenções em [apps/api/prisma/README.md](apps/api/prisma/README.md).
