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

- Um contrato deve pertencer à organização efetiva e referenciar uma unidade ativa da mesma organização.
- Os campos obrigatórios são: unidade, ao menos um locatário, responsável financeiro, data inicial, valor mensal, moeda, dia de vencimento e status.
- A data final é opcional para contratos por prazo indeterminado; quando informada, deve ser igual ou posterior à data inicial.
- O valor mensal deve ser decimal positivo. A moeda usa código ISO 4217 e assume `BRL` no MVP.
- O dia de vencimento deve estar entre 1 e 28, garantindo uma data válida em todos os meses.
- Um contrato pode possuir vários locatários, todos `Party` ativos com papel `TENANT` na mesma organização.
- Um locatário não pode aparecer repetido no mesmo contrato e exatamente um participante deve ser o responsável financeiro principal.
- Os estados são `DRAFT`, `ACTIVE`, `ENDED` e `CANCELED`. As únicas transições aceitas são `DRAFT → ACTIVE`, `DRAFT → CANCELED` e `ACTIVE → ENDED`.
- Todo contrato é criado em `DRAFT`; o cliente não pode ignorar a operação de ativação informando diretamente outro estado.
- A ativação deve revalidar unidade, participantes, responsável financeiro, vigência e valor.
- Contratos em rascunho não ocupam a unidade. Ao ativar, não pode existir outro contrato ativo da unidade cujo período de vigência se sobreponha, considerando data final ausente como prazo indeterminado.
- Campos estruturais e financeiros podem ser editados diretamente apenas em rascunho. Mudanças posteriores exigem operação específica e auditada; reajustes serão tratados junto às regras financeiras.
- Contratos encerrados ou cancelados são terminais, não podem ser reativados nem excluídos fisicamente e permanecem consultáveis no histórico.
- Criação, edição, ativação, cancelamento e encerramento devem registrar auditoria com estado anterior e novo estado.

Critérios de aceite desta fatia:

- aceitar rascunho válido com um ou vários locatários e um único responsável financeiro;
- rejeitar unidade ou participante inativo, inexistente ou pertencente a outra organização;
- rejeitar participante sem papel `TENANT`, participante duplicado, nenhum responsável ou mais de um responsável financeiro;
- rejeitar vigência, valor ou dia de vencimento inválido;
- rejeitar transição de estado não permitida e alteração direta de contrato fora de `DRAFT`;
- rejeitar ativação com período sobreposto a outro contrato ativo da unidade;
- preservar e permitir consultar contratos `ENDED` e `CANCELED` no histórico da organização.

### FR-RE-003 — Cobranças

- Registrar organização, contrato, tipo, competência, vencimento, valor-base, moeda e status.
- A competência usa o formato mensal `AAAA-MM` e representa o mês do vencimento; o vencimento combina o mês da competência com o dia definido no contrato.
- Valores monetários usam decimal. A cobrança guarda um snapshot do aluguel mensal e da moeda vigentes no momento da geração.
- Os estados são `OPEN`, `PAID` e `CANCELED`; a geração cria somente `OPEN`. “Vencida” é uma condição derivada quando a cobrança continua aberta após o vencimento.
- A geração mensal considera somente contratos `ACTIVE` cuja vigência intersecte a competência solicitada.
- A chave funcional de idempotência é organização, contrato, tipo e competência, protegida por constraint de unicidade no banco.
- Repetir a geração da mesma competência retorna as cobranças existentes sem duplicá-las ou alterar seus valores.
- O único tipo gerado nesta etapa é `RENT`. Tipos adicionais exigem regra funcional própria.
- Multas, juros e descontos podem ser lançados manualmente como valores fixos positivos, sempre com motivo e auditoria; o total é `valor-base + multas + juros - descontos`.
- Ajustes podem ser incluídos ou cancelados somente enquanto a cobrança estiver `OPEN`. Eles não são editados nem excluídos, preservando o histórico.
- A soma dos descontos ativos não pode tornar o total negativo, inclusive após o cancelamento de uma multa ou juros. A operação usa trava da cobrança para manter essa regra sob concorrência.
- Percentuais, cálculo por dias de atraso, reajustes e aplicação automática continuam dependendo de regra aprovada.

Critérios de aceite desta fatia:

- gerar uma cobrança aberta por contrato elegível para a competência;
- calcular vencimento pelo dia configurado no contrato e copiar valor/moeda sem usar ponto flutuante;
- ignorar contratos em rascunho, encerrados, cancelados ou fora da vigência da competência;
- repetir a mesma solicitação sem criar duplicidade nem alterar a cobrança já existente;
- isolar geração, consulta e listagem pela organização efetiva;
- auditar cada lote com competência, quantidade criada e quantidade já existente.
- registrar e cancelar ajustes manuais sem apagar o histórico, recalculando o total com decimal;
- rejeitar ajustes em cobrança não aberta e descontos que tornariam o total negativo.

### FR-RE-004 — Comprovantes e pagamentos

- Um comprovante é um documento privado vinculado a uma cobrança e possui estado `PENDING`, `ACCEPTED` ou `REJECTED`.
- Nesta fatia administrativa, a equipe autorizada pode enviar comprovante para uma cobrança `OPEN`; o envio pelo locatário será exposto no portal próprio.
- O arquivo reutiliza validação de conteúdo, limite de 20 MB, hash SHA-256, storage privado e download por URL assinada temporária.
- A análise aceita ou rejeita uma única vez, registra revisor/data/observação e exige motivo na rejeição.
- O envio ou aceite do comprovante não confirma o pagamento automaticamente nem altera a cobrança para `PAID`.
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
