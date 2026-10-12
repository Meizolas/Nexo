# Requisitos do produto — MVP

**Status:** Rascunho executável  
**Base:** Constituição 1.0.0  
**Objetivo:** definir o comportamento observável do MVP sem substituir regras jurídicas, contábeis ou de proteção de dados que ainda exijam validação.

## 1. Visão do produto

A plataforma permite que uma organização execute operações jurídicas e imobiliárias em uma única aplicação, mantendo regras, permissões e dados de cada domínio isolados. Usuários internos alternam de âmbito sem uma nova autenticação. Usuários externos acessam somente recursos explicitamente associados a eles.

## 2. Atores

| Ator                  | Objetivo principal no MVP                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| `SUPER_ADMIN`         | Operar a plataforma e administrar organizações sem acesso rotineiro ao conteúdo sensível delas.       |
| `ORG_ADMIN`           | Administrar usuários, permissões e configurações da própria organização.                              |
| `LAWYER`              | Operar clientes, processos, movimentações, prazos, audiências e documentos jurídicos autorizados.     |
| `REAL_ESTATE_MANAGER` | Operar imóveis, contratos, cobranças, pagamentos, recibos e manutenção.                               |
| `STAFF`               | Executar somente as operações concedidas dentro da organização.                                       |
| `CLIENT`              | Consultar processos e documentos jurídicos explicitamente liberados e enviar documentos/solicitações. |
| `TENANT`              | Consultar o próprio contrato, cobranças e recibos, enviar comprovantes e solicitar manutenção.        |
| `OWNER`               | Papel cadastrado no MVP; portal próprio permanece pós-MVP.                                            |

## 3. Requisitos transversais

### FR-001 — Autenticação

- O usuário deve autenticar-se por meio do Supabase Auth.
- A API deve rejeitar token ausente, inválido, expirado ou revogado.
- Administradores devem utilizar MFA antes do acesso a funções administrativas.

**Aceite:** nenhum endpoint privado responde com dados sem uma identidade válida e autorizada.

### FR-002 — Isolamento organizacional

- Todo recurso organizacional deve possuir `organizationId`.
- A organização efetiva deve ser obtida do contexto autenticado, nunca aceita livremente do corpo da requisição.
- Consultas por ID devem combinar o identificador do recurso com a organização efetiva.

**Aceite:** testes E2E demonstram que um usuário da organização A não consegue listar, consultar, alterar ou inferir recursos da organização B.

### FR-003 — Autorização contextual

- A API deve combinar papel, permissão, organização, âmbito e vínculo com o recurso.
- Endpoints privados devem negar acesso por padrão.
- Alterações de papel ou permissão devem ser auditadas.

**Aceite:** ocultar uma opção no frontend nunca é o único controle de acesso.

### FR-004 — Auditoria

- Criação, alteração, exclusão lógica, alteração de permissão, download sensível, mudança de status e confirmação de pagamento devem gerar evento de auditoria.
- O evento deve conter organização, ator, ação, entidade, data, correlation ID e, quando permitido, estado anterior e posterior.
- Tokens, segredos, senhas e conteúdo integral de documentos não devem ser persistidos no log.

### FR-005 — Documentos privados

- Arquivos sensíveis devem permanecer em buckets privados.
- Uploads devem validar tamanho, extensão e tipo MIME e registrar hash e metadados.
- Downloads devem exigir autorização e usar URL assinada de curta duração.
- A visibilidade deve ser `INTERNAL`, `CLIENT_VISIBLE` ou `RESTRICTED`.

### FR-006 — Experiência comum

- Usuários internos autorizados devem alternar entre Jurídico e Imobiliário sem refazer login.
- Menus, breadcrumbs, cores e permissões devem refletir o âmbito ativo.
- Todas as telas de dados devem possuir estados de carregamento, vazio e erro.
- A interface deve ser responsiva e buscar conformidade WCAG 2.1 AA.

## 4. Módulo Jurídico

### FR-LEGAL-001 — Clientes

- Cadastrar pessoa física ou jurídica com dados normalizados.
- Permitir exclusão lógica quando houver necessidade de histórico.
- Impedir acesso fora da organização.

### FR-LEGAL-002 — Processos

- Cadastrar número, tribunal, comarca, vara, assunto, partes e advogado responsável.
- Associar um ou mais clientes ao processo.
- Manter informação interna separada do resumo liberado ao cliente.

### FR-LEGAL-003 — Movimentações

- Registrar data, descrição interna e descrição opcional visível ao cliente.
- Nunca publicar automaticamente a descrição interna no portal.
- Auditar criação, edição, publicação e retirada de visibilidade.

### FR-LEGAL-004 — Prazos

- Registrar responsável, vencimento, prioridade e status.
- Exibir prazos vencidos até que recebam tratamento explícito.
- Registrar ator e horário da conclusão.
- Auditar alteração de vencimento.

### FR-LEGAL-005 — Audiências

- Registrar processo, data, horário, local ou link, responsável e observações.
- Exibir ao cliente somente os campos marcados como visíveis.

### FR-LEGAL-006 — Portal do cliente jurídico

- A identidade autenticada só pode acessar processos de `Party` cliente vinculada explicitamente ao usuário por vínculo ativo na mesma organização.
- A concessão exige usuário ativo com membership ativo e papel `CLIENT`; concessão, reativação e revogação são auditadas.
- Usuários internos autorizados podem conceder e revogar o vínculo de acesso de clientes a partir da gestão de clientes jurídicos.
- Exibir somente dados preparados ao cliente: número/assunto do processo, resumo do cliente, movimentações publicadas com descrição do cliente, audiências futuras explicitamente visíveis e documentos ativos `CLIENT_VISIBLE`.
- Nunca expor anotações internas, descrição interna de movimentação, prazos ou documentos não liberados; não usar texto interno como fallback.
- O endpoint de download revalida o vínculo e gera URL assinada temporária somente após autorização.
- O cliente pode enviar arquivo PDF, JPEG, PNG, WebP ou DOCX de até 20 MB associado ao processo; o servidor valida o conteúdo real e grava como `INTERNAL`, sem publicação automática.
- O cliente pode enviar solicitação com assunto e mensagem (10–1750 caracteres) ao advogado ativo associado ao processo; a solicitação chega como notificação interna, sem envio externo.
- O escopo atual não inclui conversa/resposta do escritório nem workflow próprio de status para a solicitação; a notificação interna serve como caixa de entrada e permite marcação de leitura.

## 5. Módulo Imobiliário

### FR-RE-001 — Pessoas e imóveis

- Cadastrar pessoas/empresas com um ou ambos os papéis `OWNER` e `TENANT`.
- Cadastrar imóvel com nome, tipo e endereço opcional; para o primeiro incremento, nome é o único campo obrigatório e tipo assume `RESIDENTIAL` por padrão.
- Cada imóvel novo deve ter ao menos um proprietário já cadastrado com papel `OWNER` ativo na mesma organização.
- Permitir vários proprietários atuais, encerramento auditado de vínculo e consulta ao histórico de titularidade; percentual/fração ideal ainda não é controlado.
- Cadastrar unidades com nome único dentro do imóvel; um imóvel sem subdivisão pode usar uma unidade única.
- Listas, imóveis, unidades e proprietários devem respeitar organização, permissões e exclusão lógica.

### FR-RE-002 — Contratos

- Registrar participantes, unidade, vigência, valor, dia de vencimento e status.
- Contratos encerrados devem permanecer consultáveis no histórico.
- Apenas um vínculo de ocupação incompatível pode estar ativo para a mesma unidade e período.

### FR-RE-003 — Cobranças

- Registrar contrato, competência, vencimento, valor e status.
- Valores monetários devem usar decimal.
- A geração recorrente deve ser idempotente e impedir duplicidade para contrato, tipo e competência.
- Multas, juros, descontos e mudanças de valor devem ser auditados.

### FR-RE-004 — Comprovantes e pagamentos

- O locatário pode enviar comprovante para análise.
- O envio do comprovante não confirma o pagamento automaticamente.
- A confirmação manual deve registrar ator, data, valor e chave de idempotência.
- Repetir uma confirmação com a mesma chave não pode duplicar efeitos financeiros.

### FR-RE-005 — Recibos

- Um recibo somente pode ser emitido para pagamento confirmado.
- O recibo deve possuir identificador estável e permanecer associado ao pagamento.

### FR-RE-006 — Manutenção

- O locatário pode abrir solicitação vinculada à sua unidade/contrato.
- A equipe autorizada pode classificar, atualizar status e registrar interações.
- Notas internas não podem aparecer no portal do locatário.

### FR-RE-007 — Portal do locatário

- Exibir somente contrato vigente e histórico permitido do usuário autenticado.
- Exibir cobranças, recibos, comprovantes e solicitações de manutenção associadas.

## 6. Comunicação

### FR-COMM-001 — Notificação interna

- Uma notificação deve existir no banco antes ou independentemente de seu envio externo.
- Falha de canal externo não pode apagar ou invalidar a notificação interna.

### FR-COMM-002 — E-mail e WhatsApp

- Registrar canal, template, destinatário normalizado, provedor, tentativas, status e erro seguro.
- Mensagens jurídicas devem evitar detalhes sensíveis e preferir link autenticado.
- Webhooks devem validar autenticidade e ser idempotentes.
- Retentativas devem possuir limite e backoff.

## 7. Fora do MVP

- Portal do proprietário.
- Gateway de pagamento e conciliação automática.
- Assinatura eletrônica.
- Aplicativo nativo.
- Integração com tribunais sem meio oficial autorizado.
- Relatórios avançados e contabilidade completa.
- Customização irrestrita por organização.

## 8. Critério de aceite do MVP

O MVP estará funcionalmente pronto quando os fluxos mínimos da constituição forem aprovados em homologação, todos os portões automatizados passarem e não houver falha conhecida de severidade crítica envolvendo autenticação, autorização, isolamento, documentos, prazos ou dinheiro.
