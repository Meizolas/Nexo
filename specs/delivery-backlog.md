# Backlog de entrega do MVP

**Status:** Pronto para refinamento técnico  
**Estratégia:** entregar fatias verticais pequenas, cada uma contendo migration, API, autorização, interface, auditoria, documentação e testes aplicáveis.

## Marco 0 — Especificação

- [x] Consolidar requisitos funcionais iniciais.
- [x] Criar matriz inicial de autorização.
- [x] Criar modelo conceitual de domínio.
- [x] Ordenar o backlog técnico e funcional.
- [ ] Resolver decisões bloqueantes registradas em `open-decisions.md`.
- [ ] Aprovar critérios de aceite com responsáveis de negócio.

## Marco 1 — Fundação do monorepo

- [x] Inicializar repositório Git.
- [x] Criar workspace pnpm e Turborepo.
- [x] Criar `apps/web` com Next.js, TypeScript strict e App Router.
- [x] Criar `apps/api` com NestJS e TypeScript strict.
- [x] Criar pacotes `ui`, `contracts`, `config` e `eslint-config`.
- [x] Configurar lint, format, typecheck, test e build.
- [x] Configurar Docker para dependências locais.
- [x] Criar documentação de ambiente e arquivo `.env.example` sem segredos.
- [x] Configurar CI com os portões mínimos.

**Saída:** clone limpo instala, valida, testa e compila com comandos documentados.

## Marco 2 — Base da API e persistência

- [x] Configurar Prisma e PostgreSQL.
- [x] Criar convenções de IDs, datas, valores e exclusão lógica.
- [x] Criar validação global e formato padronizado de erros.
- [x] Criar correlation ID e logs Pino com redação de dados sensíveis.
- [x] Configurar `/api/v1`, Swagger e health check.
- [x] Padronizar paginação, filtros e ordenação permitida.
- [x] Criar suporte transacional e contrato de idempotência.

**Saída:** API base observável, documentada e integrada ao banco.

## Marco 3 — Identidade, organizações e autorização

- [x] Integrar Supabase Auth e validar JWT na API.
- [x] Modelar organizações, usuários e memberships.
- [x] Implementar papéis e permissões contextuais.
- [x] Criar contexto organizacional confiável por requisição.
- [x] Criar guards/policies reutilizáveis e negação por padrão.
- [x] Implementar auditoria básica.
- [x] Criar testes E2E de acesso cruzado e propriedade de recursos.
- [x] Implementar exigência de MFA administrativo.

**Saída:** isolamento de tenant demonstrado por testes positivos e negativos.

## Marco 4 — Plataforma compartilhada e shell web

- [x] Implementar `Party` e papéis contextuais de pessoa.
- [x] Implementar storage privado e metadados de documentos.
- [x] Implementar upload, URL assinada, visibilidade e auditoria.
- [x] Implementar notificações internas.
- [x] Criar design system compartilhado.
- [x] Criar layout autenticado e navegação protegida.
- [x] Criar temas Jurídico e Imobiliário.
- [x] Implementar alternância de âmbito.
- [x] Padronizar loading, vazio, erro e acesso negado.

**Saída:** usuário autenticado navega com segurança e utiliza recursos compartilhados.

## Marco 5 — Jurídico

- [x] Clientes PF/PJ.
- [x] Processos, partes e advogado responsável.
- [x] Movimentações internas e publicáveis.
- [x] Prazos, painel de vencidos e conclusão/tratamento auditado.
- [x] Audiências.
- [x] Documentos jurídicos vinculados ao processo.
- [x] Portal do cliente jurídico: consulta e download restritos por vínculo explícito, com gestão auditada de acesso, movimentações publicadas, audiências futuras visíveis e documentos autorizados.
- [x] Upload privado do cliente (documentos `INTERNAL`) e solicitação de atendimento via notificação interna ao advogado ativo do processo.
- [x] E2E HTTP: portal vinculado ao cliente e autorização de imóveis (inclui negação para `CLIENT` e tenant alheio; Prisma substituído por mock).
- [ ] E2E integrado ao PostgreSQL/storage e cobertura do fluxo jurídico mínimo completo.

**Saída:** equipe jurídica e cliente executam os fluxos definidos no MVP.

## Marco 6 — Imobiliário

- [x] Cadastro base de proprietários/locatários, imóveis, unidades e histórico de propriedade (sem fração ideal; ver OD-020/021).
- [x] Definir campos, participantes, estados, transições, autorização e exclusividade de ocupação dos contratos (OD-004B/012/022/023).
- [ ] Contratos e histórico de ocupação.
- [ ] Geração idempotente de cobranças recorrentes.
- [ ] Multas, juros e descontos auditados.
- [ ] Upload e análise de comprovantes.
- [ ] Confirmação manual idempotente de pagamentos.
- [ ] Recibos.
- [ ] Solicitações de manutenção.
- [ ] Portal do locatário.
- [ ] Testes E2E do fluxo imobiliário mínimo.

**Saída:** gestão imobiliária opera contratos e recebimentos manuais com rastreabilidade.

## Marco 7 — Comunicação

- [ ] Selecionar e integrar provedor de e-mail.
- [ ] Criar catálogo de templates e preferências.
- [ ] Integrar Meta WhatsApp Cloud API.
- [ ] Implementar assinatura/verificação e idempotência de webhooks.
- [ ] Adicionar BullMQ/Redis somente para jobs que exijam confiabilidade.
- [ ] Implementar lembretes, retries e histórico de entrega.
- [ ] Integrar n8n por endpoints autenticados quando houver fluxo aprovado.
- [ ] Criar testes de contrato das integrações.

**Saída:** mensagens externas rastreáveis e desacopladas do estado oficial.

## Marco 8 — Hardening e homologação

- [ ] Executar revisão de autorização e isolamento por endpoint.
- [ ] Revisar logs, erros, dados pessoais e segredos.
- [ ] Validar concorrência, transações e idempotência financeira.
- [ ] Executar testes de acessibilidade e responsividade.
- [ ] Definir retenção, anonimização e resposta a incidentes.
- [ ] Configurar métricas, alertas, backup e teste de restauração.
- [ ] Preparar ambientes de homologação e produção com rollback.
- [ ] Executar homologação e registrar aceite.

**Saída:** release candidate sem falhas críticas conhecidas.

## Definition of Ready de uma história

Uma história pode entrar em implementação quando possuir:

- ator e objetivo definidos;
- regras de autorização e organização;
- entradas, saídas e estados descritos;
- critérios de aceite verificáveis;
- impacto em auditoria e documentos analisado;
- dependências e decisões abertas identificadas.

## Definition of Done operacional

Além da constituição, cada história deve entregar no mesmo incremento:

- migration reversível quando aplicável;
- endpoint e contrato documentado;
- interface com estados completos;
- testes relevantes, incluindo cenários negativos;
- logs seguros e correlation ID;
- auditoria das ações previstas;
- lint, typecheck, testes e builds aprovados.
