# Matriz inicial de autorização

**Status:** Rascunho para validação  
**Regra central:** negar por padrão e conceder pelo menor privilégio necessário.

Esta matriz representa permissões padrão. Permissões explícitas da organização podem restringir ainda mais o acesso, especialmente para `STAFF`.

## Legenda

- **A:** administrar, incluindo criar, alterar e encerrar quando aplicável.
- **O:** operar dentro do domínio e da organização.
- **P:** acessar apenas recursos próprios ou explicitamente associados.
- **—:** sem acesso padrão.

| Recurso                 | SUPER_ADMIN | ORG_ADMIN | LAWYER | REAL_ESTATE_MANAGER | STAFF        | CLIENT | OWNER | TENANT |
| ----------------------- | ----------- | --------- | ------ | ------------------- | ------------ | ------ | ----- | ------ |
| Organizações            | A           | P         | —      | —                   | —            | —      | —     | —      |
| Usuários e papéis       | A¹          | A²        | —      | —                   | —            | —      | —     | —      |
| Auditoria               | A¹          | P         | —      | —                   | —            | —      | —     | —      |
| Clientes compartilhados | —³          | A         | O      | O                   | Configurável | P      | P     | P      |
| Processos               | —³          | A         | O      | —                   | Configurável | P      | —     | —      |
| Movimentações jurídicas | —³          | A         | O      | —                   | Configurável | P⁴     | —     | —      |
| Prazos e audiências     | —³          | A         | O      | —                   | Configurável | P⁴     | —     | —      |
| Imóveis e unidades      | —³          | A         | —      | O                   | Configurável | —      | P⁵    | P⁵     |
| Contratos de locação    | —³          | A         | —      | O                   | Configurável | —      | P⁵    | P      |
| Cobranças e pagamentos  | —³          | A         | —      | O                   | Configurável | —      | P⁵    | P      |
| Manutenção              | —³          | A         | —      | O                   | Configurável | —      | P⁵    | P      |
| Documentos              | —³          | A         | O      | O                   | Configurável | P⁴     | P⁵    | P⁴     |
| Notificações            | —³          | A         | O      | O                   | Configurável | P      | P⁵    | P      |

1. Operações técnicas da plataforma; acesso a conteúdo de organizações requer procedimento excepcional, justificativa e auditoria.
2. Somente dentro da própria organização; não pode conceder `SUPER_ADMIN`.
3. Sem acesso rotineiro ao conteúdo do tenant.
4. Apenas itens associados e marcados como visíveis ao respectivo portal.
5. Cadastro existe no MVP, mas o portal do proprietário é pós-MVP; acesso interativo permanece desabilitado até sua entrega.

## Regras contextuais obrigatórias

Para o portal jurídico, `portal.legal.read` permite ao papel `CLIENT` consultar apenas processos derivados de `PartyUserLink` ativo na organização e participantes do processo como `CLIENT`. A permissão não substitui a checagem de vínculo e visibilidade por recurso. O envio de arquivo usa `portal.legal.documents.upload`; solicitações usam `portal.legal.service-requests.create`, ambas sujeitas à mesma validação do processo e do vínculo ativo.

Documentos enviados pelo cliente ficam `INTERNAL`; somente a equipe com permissões de documentos pode consultá-los. Solicitações são notificações internas apenas para advogados ativos ainda associados ao processo.

A gestão de vínculos usa `legal.portal-access.manage`: conceder ou reativar requer `Party` ativa com papel `CLIENT` e usuário ativo com membership e papel `CLIENT` ativos na mesma organização. A revogação invalida o acesso imediatamente. Todas essas operações são auditadas.

Operações imobiliárias usam `real-estate.properties.read/create`, `real-estate.units.create`, `real-estate.ownership.manage`; contratos usam `real-estate.leases.read/create/update/activate/cancel/end`; cobranças usam `real-estate.charges.read/generate`. Cada consulta/escrita valida a organização; proprietários vinculados precisam possuir `PartyRoleCode.OWNER` ativo, e participantes de contrato precisam possuir `PartyRoleCode.TENANT` ativo, sempre na mesma organização.

`ORG_ADMIN` e `REAL_ESTATE_MANAGER` recebem as permissões de contrato por padrão; `STAFF` depende de concessão explícita. `TENANT` não usa essas permissões administrativas: o futuro portal terá leitura própria e condicionada a vínculo ativo entre identidade, `Party` participante e contrato da organização. Ativar, cancelar ou encerrar contrato exige revalidação do estado e auditoria.

Geração de cobranças é uma operação administrativa e auditada de `ORG_ADMIN` ou `REAL_ESTATE_MANAGER`; `STAFF` depende de concessão explícita. O futuro portal do locatário usará permissão própria e vínculo com `LeaseTenant`, sem receber `real-estate.charges.read` administrativo.

Uma decisão de autorização deve avaliar, nesta ordem:

1. sessão e token válidos;
2. vínculo ativo do usuário;
3. organização efetiva;
4. papel e permissões concedidas;
5. âmbito ativo, quando aplicável;
6. estado do recurso;
7. vínculo do usuário com o recurso;
8. visibilidade específica de campos e documentos.

## Operações especialmente protegidas

Exigem permissão específica, revalidação de contexto e auditoria:

- alterar papel ou permissões;
- consultar ou exportar auditoria;
- alterar vencimento ou concluir prazo crítico;
- alterar valor, multa, juros ou desconto;
- confirmar, cancelar ou estornar pagamento;
- gerar URL de download de documento sensível;
- alterar visibilidade de documento ou movimentação;
- encerrar contrato;
- executar suporte excepcional com acesso a dados de organização.

## Comportamento de segurança

- A existência de um recurso de outra organização não deve ser revelada.
- Respostas de autorização não devem expor regras internas ou dados pessoais.
- Listagens devem aplicar o escopo antes da paginação e da ordenação.
- Exportações devem usar as mesmas regras das consultas interativas.
- Jobs, webhooks e automações devem possuir identidade técnica e escopo explícitos.
