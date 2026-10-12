# Modelo conceitual de domínio

**Status:** Rascunho inicial  
**Nota:** este documento descreve conceitos e invariantes; o schema Prisma será derivado apenas após validação das decisões abertas.

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

- `Property`: imóvel administrado.
- `Unit`: unidade locável; imóvel sem subdivisão pode possuir uma unidade única.
- `Ownership`: vínculo histórico entre proprietário e imóvel/unidade.
- `Lease`: contrato com vigência, valor e regras de cobrança.
- `LeaseTenant`: um ou mais locatários participantes.
- `Charge`: obrigação financeira de uma competência.
- `Payment`: liquidação total ou parcial, conforme decisão funcional.
- `Receipt`: comprovante emitido pelo sistema após confirmação.
- `MaintenanceRequest`: solicitação ligada ao contrato ou unidade.

### Invariantes imobiliárias

- Valores monetários usam decimal e moeda explícita quando necessário.
- A combinação que identifica uma cobrança recorrente deve possuir constraint de unicidade no banco.
- Confirmar novamente o mesmo pagamento com a mesma chave de idempotência retorna o resultado anterior.
- Comprovante enviado é evidência para análise, não confirmação de pagamento.
- Contratos encerrados não são removidos do histórico.
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
