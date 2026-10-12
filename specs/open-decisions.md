# Registro de decisões

**Status:** Mantido durante o refinamento dos marcos do projeto.

Este documento registra decisões aprovadas e pontos que ainda não podem ser implementados sem validação funcional.

## Decisões abertas

| ID     | Decisão necessária                                                         | Marco limite | Impacto se adiada                                     |
| ------ | -------------------------------------------------------------------------- | ------------ | ----------------------------------------------------- |
| OD-004 | Quais campos são obrigatórios para processo e contrato?                    | 5            | Schema, formulários e validação.                      |
| OD-006 | Quais status e transições são permitidos para processo, prazo e audiência? | 5            | Regras jurídicas e notificações.                      |
| OD-008 | Quais prioridades tornam um prazo “crítico”?                               | 5            | Auditoria, UX e lembretes.                            |
| OD-009 | Pagamentos parciais, excedentes, estornos e cancelamentos entram no MVP?   | 6            | Modelo financeiro e recibos.                          |
| OD-010 | Fórmula e momento de multa, juros, desconto e reajuste.                    | 6            | Cálculo oficial de cobranças.                         |
| OD-011 | Qual chave funcional impede duplicidade de cobrança mensal?                | 6            | Constraint e idempotência.                            |
| OD-012 | Pode haver múltiplos locatários e responsáveis financeiros no contrato?    | 6            | Schema, cobrança e portal.                            |
| OD-013 | Quais estados e responsáveis compõem o fluxo de manutenção?                | 6            | Interface e autorização.                              |
| OD-014 | Qual provedor de e-mail será utilizado?                                    | 7            | Implementação e configuração.                         |
| OD-015 | Quais eventos geram mensagem e por quais canais?                           | 7            | Templates, consentimento e custos.                    |
| OD-017 | Qual prazo de retenção se aplica a cada categoria de dado/documento?       | 8            | LGPD, exclusão e backups.                             |
| OD-018 | Onde serão hospedados web, API, Redis e jobs?                              | 8            | CI/CD, rede, custos e operação.                       |
| OD-020 | Imóveis coproprietários exigem fração ideal/percentual para cada titular?  | 6            | Repasses, responsabilidades e relatórios financeiros. |
| OD-021 | Quais dados cadastrais detalhados de imóvel/unidade são obrigatórios?      | 6            | Endereço, unidade, filtros e futuras integrações.     |

## Decisões tomadas

**OD-019 — Acesso ao portal jurídico:** a identidade externa acessa somente por vínculo explícito e revogável entre usuário autenticado e `Party` com papel `CLIENT` na mesma organização. A concessão exige membership `CLIENT` ativo e é auditada.

| ID      | Decisão                      | Resultado                                                                                                                                                                            |
| ------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OD-001  | Participação em organizações | Um usuário pode possuir vários memberships. O cliente informa a organização ativa por cabeçalho, e o backend aceita somente vínculos ativos do usuário autenticado.                  |
| OD-002  | Permissões de `STAFF`        | O papel fornece uma base mínima; concessões ou negações individuais são registradas por permissão, com negação explícita tendo precedência.                                          |
| OD-003  | Acesso do `SUPER_ADMIN`      | Não existe acesso automático ao conteúdo dos tenants. Acesso organizacional exige membership ou um futuro fluxo excepcional, justificado e auditado.                                 |
| OD-004A | Cadastro de PF e PJ          | Nome, tipo e ao menos um papel contextual são obrigatórios. CPF/CNPJ, e-mail e telefone são opcionais; quando informado, o documento fiscal deve ser válido e único por organização. |
| OD-005  | Papéis simultâneos de pessoa | Uma pessoa pode possuir vários papéis contextuais na mesma organização, como cliente, proprietário e locatário.                                                                      |
| OD-007  | Número de processo           | O número CNJ é opcional no cadastro; quando informado, deve passar pela validação estrutural e dos dígitos verificadores do padrão CNJ.                                              |
| OD-016  | Arquivos permitidos          | Uploads aceitam PDF, JPEG, PNG, WebP e DOCX, com limite máximo de 20 MB por arquivo e validação do conteúdo real.                                                                    |

## Premissas provisórias seguras

Enquanto uma decisão permanecer aberta:

- negar acesso em vez de ampliar privilégio;
- não confirmar pagamento automaticamente;
- não excluir definitivamente registros com valor histórico;
- não publicar conteúdo interno;
- não enviar dado sensível por canal externo;
- não implementar cálculo financeiro cuja fórmula não tenha sido aprovada;
- não criar integração externa sem autenticação, idempotência e rastreabilidade.
