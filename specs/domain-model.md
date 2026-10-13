# Modelo conceitual de domínio

**Status:** Modelo evolutivo do MVP  
**Nota:** conceitos com decisões abertas permanecem limitados ao baseline seguro descrito nos requisitos até aprovação funcional.

## 1. Plataforma e identidade

```text
Organization
  └── Membership ── User
          ├── Role
          └── PermissionGrant

Organization
  ├── AuditEvent
  ├── Notification
  ├── Document
  └── Party
          └──< PartyUserLink >── User (acesso externo ao portal)
```

- `Organization`: tenant e fronteira principal de isolamento.
- `User`: identidade de acesso vinculada ao Supabase Auth.
- `Membership`: vínculo do usuário com organização, estado e papéis.
- `Role` e `PermissionGrant`: autorização base e exceções restritivas/concedidas.
- `Party`: pessoa física ou jurídica reutilizável como cliente, proprietário, locatário ou parte processual.
- `AuditEvent`: registro imutável de ação relevante.
- `Document`: metadados do arquivo privado; o conteúdo reside no storage.
- `Notification`: comunicação oficial interna, independentemente dos canais externos.
- Solicitação de atendimento do portal é persistida como notificação interna não lida para advogados ativos associados ao processo; o MVP não possui entidade de conversa nem status além da leitura da notificação.
- `PartyUserLink`: vínculo explícito e revogável entre a identidade autenticada (`User`) e uma `Party` cliente da mesma organização; registra quem concedeu o acesso.
- O vínculo mantém `createdAt` e `revokedAt`; a combinação organização/parte/usuário é única para permitir reativação auditada sem duplicar associações.

## 2. Jurídico

```text
Party ──< CaseParty >── LegalCase ── LawyerAssignment ── User
  └──< PartyUserLink >── User (portal)
                            ├── CaseMovement
                            ├── LegalDeadline
                            ├── Hearing
                            └── DocumentLink ── Document
```

- `LegalCase`: processo pertencente à organização.
- `CaseParty`: participação de uma pessoa no processo, com tipo contextual.
- `LawyerAssignment`: responsabilidade profissional pelo processo.
- `CaseMovement`: movimentação com descrição interna separada do texto preparado para o cliente, publicado somente por ação explícita.
- `LegalDeadline`: prazo com responsável, vencimento, prioridade e estado.
- `Hearing`: evento processual agendado.
- `Hearing.isClientVisible`: autorização explícita para expor título, data e local da audiência futura; padrão falso.
- `DocumentLink`: associação controlada entre documento e recurso jurídico.

### Invariantes jurídicas

- `PartyUserLink` associa explicitamente uma identidade autenticada a uma `Party` cliente; o vínculo é revogável e auditado.
- O portal expõe somente campos preparados para o cliente, movimentações publicadas, audiências explicitamente visíveis e documentos `CLIENT_VISIBLE`; prazos e anotações internas permanecem privados.
- Um acesso ativo exige `Party` não excluída, com papel `CLIENT`, participante do processo como cliente na mesma organização.
- O download de documento revalida organização, contexto `LEGAL_CASE`, visibilidade, estado ativo e vínculo do usuário antes de emitir URL assinada temporária.
- Arquivos enviados pelo cliente permanecem `INTERNAL` e ligados ao processo; somente a equipe pode posteriormente revisar e, por ação explícita, publicar uma cópia/versão visível ao cliente.
- Todo processo deve pertencer a exatamente uma organização.
- Um cliente externo só visualiza processo por associação explícita entre sua identidade e uma `Party` participante.
- Texto interno nunca deve ser usado como fallback para texto visível ao cliente.
- A criação de uma movimentação não a publica. Editar uma movimentação publicada retira a publicação e exige nova aprovação explícita.
- Prazo concluído registra obrigatoriamente ator e instante da conclusão.
- Prazo aberto pode ser concluído ou dispensado com tratamento explícito; prazos tratados não podem voltar a ser editados.
- Responsável pelo prazo deve possuir membership ativo na organização proprietária do processo.
- Mudança de vencimento preserva o valor anterior na auditoria.
- Prazo vencido continua consultável e destacado enquanto não houver tratamento explícito.
- Audiência agendada recebe status explícito de realizada ou cancelada; a transição e seu desfecho são auditados.

## 3. Imobiliário

```text
Party (Owner) ──< Ownership >── Property ──< Unit
                                             └── Lease ──< LeaseTenant >── Party (Tenant)
                                                   ├── Charge ──< Payment
                                                   │      └── Receipt
                                                   └── MaintenanceRequest

Document ── DocumentLink ── Lease | Charge | Payment | MaintenanceRequest
```

- `Property`: imóvel administrado, com nome, tipo, endereço básico opcional e estado operacional.
- `Unit`: unidade locável com identificador único no imóvel; imóvel sem subdivisão pode possuir uma unidade única.
- `Ownership`: vínculo histórico entre `Party` OWNER e `Property`, com datas de início/fim; aceita coproprietários, mas não guarda fração ideal enquanto a regra estiver aberta.
- `Lease`: contrato de uma unidade, com vigência, valor mensal, moeda, dia de vencimento e estado explícito.
- `LeaseTenant`: vínculo histórico entre contrato e um ou mais `Party` com papel `TENANT`; exatamente um vínculo identifica o responsável financeiro principal.
- `Charge`: obrigação financeira mensal que preserva tipo, competência, vencimento, valor-base, moeda e estado.
- `ChargeAdjustment`: lançamento manual e histórico de multa, juros ou desconto, com valor fixo, motivo e estado ativo/cancelado.
- `PaymentProof`: análise de um documento privado associado à cobrança, com estado pendente, aceito ou rejeitado e revisor opcional até a decisão.
- `Payment`: liquidação total ou parcial, conforme decisão funcional.
- `Receipt`: comprovante emitido pelo sistema após confirmação.
- `MaintenanceRequest`: solicitação ligada ao contrato ou unidade.

### Invariantes imobiliárias

- Um imóvel novo exige ao menos um vínculo com `Party` ativa de papel `OWNER` da mesma organização.
- Encerrar um vínculo de propriedade define `endedAt` e preserva o histórico; não se exclui fisicamente.
- Um mesmo proprietário não pode ter mais de um vínculo ativo repetido ao mesmo imóvel.
- Unidades são identificadas por nome dentro do imóvel; ocupação e locação ficam para `Lease`.
- Um contrato pertence à mesma organização de sua unidade e de todos os participantes.
- Todo contrato possui ao menos um locatário ativo, sem participantes repetidos, e exatamente um responsável financeiro, que deve pertencer ao conjunto de locatários.
- A vigência usa data inicial obrigatória e data final opcional; data final ausente representa prazo indeterminado.
- O dia de vencimento fica entre 1 e 28 no MVP; valor mensal é decimal positivo e a moeda padrão é `BRL`.
- `DRAFT` pode transicionar para `ACTIVE` ou `CANCELED`; `ACTIVE` pode transicionar apenas para `ENDED`; estados terminais não são reativados.
- Apenas `ACTIVE` representa ocupação confirmada. A ativação é rejeitada quando o período se sobrepõe ao de outro contrato ativo da mesma unidade.
- Dados estruturais e financeiros são editáveis diretamente somente em `DRAFT`; alterações posteriores usam operações específicas e auditadas.
- Valores monetários usam decimal e moeda explícita quando necessário.
- A competência da cobrança é o primeiro dia do mês de referência e é apresentada como `AAAA-MM`; o vencimento usa o dia configurado no contrato dentro desse mesmo mês.
- A combinação `organizationId + leaseId + type + competence` identifica uma cobrança recorrente e possui constraint de unicidade no banco.
- A geração usa somente contratos `ACTIVE` cuja vigência intersecte o mês solicitado, copia valor/moeda do contrato e cria status `OPEN`.
- Repetir uma geração não altera cobranças existentes; “vencida” é uma condição derivada de `OPEN` e `dueDate`.
- O total da cobrança é o valor-base acrescido das multas e juros ativos e reduzido pelos descontos ativos, sem permitir resultado negativo.
- Ajustes financeiros existem apenas como valor fixo manual, exigem motivo, só mudam enquanto a cobrança está aberta e são cancelados sem exclusão do histórico.
- Confirmar novamente o mesmo pagamento com a mesma chave de idempotência retorna o resultado anterior.
- Comprovante enviado é evidência para análise, não confirmação de pagamento.
- Aceitar ou rejeitar comprovante é uma transição única e auditada; rejeição exige motivo e nenhuma das decisões altera automaticamente o estado da cobrança.
- Contratos encerrados ou cancelados não são removidos do histórico.
- Intervalos de ocupação incompatíveis não podem ser criados para a mesma unidade.
- Recibo depende de pagamento confirmado e não pode ser reatribuído.

## 4. Comunicação

```text
Notification
  └── DeliveryAttempt
          ├── EMAIL
          ├── WHATSAPP
          └── future channels

ExternalWebhook ── IdempotencyRecord
AsyncJob ── DeliveryAttempt
```

- `DeliveryAttempt`: tentativa individual, resposta segura do provedor e estado.
- `ExternalWebhook`: envelope verificado do evento externo.
- `IdempotencyRecord`: chave, operação, resultado e validade definidos pela operação.
- `AsyncJob`: trabalho confiável executado fora da requisição quando necessário.

## 5. Campos transversais mínimos

Entidades organizacionais devem considerar:

- `id` UUID;
- `organizationId` UUID;
- `createdAt` e `updatedAt` em UTC;
- `deletedAt` quando exclusão lógica for necessária;
- versão ou mecanismo equivalente quando concorrência puder causar perda de atualização.

Dados normalizados, como CPF, CNPJ, telefone e CEP, devem ter separação clara entre formato persistido e formato de apresentação.

## 6. Limites de módulo

- `legal` não acessa diretamente tabelas internas de `real-estate`.
- `real-estate` não acessa diretamente tabelas internas de `legal`.
- Ambos dependem de contratos públicos de `clients/parties`, `documents`, `notifications` e `audit`.
- Auditoria pode receber eventos dos módulos, mas não deve conter regra de negócio deles.
- Integrações externas não alteram estado oficial sem passar por um caso de uso do módulo proprietário.
