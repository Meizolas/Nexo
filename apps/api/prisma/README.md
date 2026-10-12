# Convenções de persistência

O schema Prisma usa PostgreSQL como fonte principal de verdade. Toda alteração de estrutura deve ser entregue por migration versionada.

## Regras para novos modelos

- IDs são UUID, preferencialmente com `@default(dbgenerated("gen_random_uuid()"))` e `@db.Uuid`.
- Entidades de tenant recebem `organizationId` e índice composto adequado ao padrão de consulta.
- Datas são persistidas em UTC usando `DateTime` e `@db.Timestamptz`.
- Dinheiro usa `Decimal` com precisão explícita, nunca `Float`.
- Registros históricos recebem `deletedAt DateTime? @map("deleted_at") @db.Timestamptz` quando exclusão lógica for aplicável.
- Campos Prisma permanecem em `camelCase`; tabelas e colunas usam `@@map` e `@map` em `snake_case`.
- Unicidade funcional multi-organização inclui `organizationId`.
- Relações obrigatórias recebem foreign keys; não devem existir IDs relacionais sem relation correspondente, salvo migration intermediária documentada.

## Fluxo de alteração

```bash
corepack pnpm --filter api prisma:format
corepack pnpm --filter api prisma:validate
corepack pnpm --filter api prisma:migrate:dev --name descricao_da_mudanca
corepack pnpm --filter api prisma:generate
```

Não execute alterações manuais de schema em produção.

## Consultas HTTP

- Listagens usam `PageOptionsDto` e limitam `pageSize` a 100.
- Cada módulo declara sua própria lista de campos permitidos para ordenação.
- Filtros são DTOs explícitos do recurso; parâmetros desconhecidos são rejeitados pela validação global.
- Nunca encaminhe diretamente objetos de query recebidos do cliente para `where` ou `orderBy` do Prisma.
