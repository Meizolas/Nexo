# Constitution — Plataforma Integrada Jurídica e Imobiliária

**Versão:** 1.0.0  
**Status:** Aprovada para início do desenvolvimento  
**Arquitetura:** Monólito modular  
**Backend principal:** Node.js + NestJS + TypeScript  

## 1. Propósito

Este documento estabelece as decisões técnicas, arquiteturais e de qualidade obrigatórias para a construção da plataforma integrada de gestão jurídica e imobiliária.

A plataforma deve permitir que uma organização opere em dois âmbitos dentro do mesmo sistema:

- **Advocacia:** clientes, processos, movimentações, prazos, audiências, documentos e comunicação;
- **Imobiliário:** proprietários, locatários, imóveis, contratos, cobranças, pagamentos, comprovantes, recibos e manutenção.

Os módulos compartilham usuários, autenticação, clientes, documentos, notificações e auditoria, mas suas regras de negócio devem permanecer isoladas.

---

## 2. Princípios fundamentais

### 2.1 Segurança e privacidade desde o início

Dados jurídicos, pessoais, contratuais e financeiros são sensíveis. Nenhuma funcionalidade poderá ser considerada concluída sem controle de acesso, validação de entrada, rastreabilidade e proteção adequada dos documentos.

### 2.2 Entrega rápida sem comprometer a estrutura

O MVP deve ser desenvolvido com rapidez, mas não poderá depender de código improvisado, regras críticas no frontend ou automações externas como fonte principal da verdade.

### 2.3 Uma plataforma, dois módulos

Advocacia e Imobiliário devem compartilhar o mesmo design system, autenticação e infraestrutura. A troca de âmbito deve ocorrer dentro da aplicação, preservando a sessão do usuário e carregando menus, permissões, cores e dados correspondentes.

### 2.4 Monólito modular antes de microsserviços

O backend será uma única aplicação NestJS organizada por módulos de domínio. Microsserviços somente poderão ser adotados quando houver uma necessidade comprovada de escala, isolamento, equipe ou disponibilidade.

### 2.5 Backend como autoridade

Permissões, cálculos, prazos, cobranças, estados de processos, liberação de documentos e auditoria devem ser controlados pelo backend. O frontend nunca será considerado uma barreira de segurança.

### 2.6 Rastreabilidade obrigatória

Ações críticas devem ser registradas: criação, atualização, exclusão lógica, download de documentos, alteração de permissões, confirmação de pagamento e mudança de status.

---

## 3. Stack oficial

### 3.1 Frontend

- Next.js com App Router;
- TypeScript em modo `strict`;
- React;
- Tailwind CSS;
- shadcn/ui;
- React Hook Form;
- Zod para validação de formulários;
- TanStack Query para estado remoto, quando necessário;
- Lucide Icons;
- Playwright para testes de fluxo crítico.

### 3.2 Backend

- Node.js em versão LTS;
- NestJS;
- TypeScript em modo `strict`;
- API REST;
- Prisma ORM;
- class-validator e class-transformer nos DTOs;
- Swagger/OpenAPI;
- Jest para testes;
- Pino para logs estruturados;
- BullMQ para filas quando tarefas assíncronas exigirem confiabilidade;
- Redis apenas quando filas, cache ou controle distribuído forem necessários.

### 3.3 Dados e arquivos

- PostgreSQL como banco principal;
- Supabase como provedor inicial de PostgreSQL, Auth e Storage;
- Buckets privados para contratos, processos, comprovantes e documentos pessoais;
- URLs assinadas e temporárias para download;
- Prisma Migrate para versionamento do banco.

### 3.4 Integrações

- Meta WhatsApp Cloud API para mensagens;
- n8n para orquestrações auxiliares;
- provedor de e-mail transacional configurável;
- gateway de pagamento definido em fase posterior;
- Docker para padronização dos ambientes.

### 3.5 Restrições da stack

- JavaScript sem tipagem não deve ser usado no código da aplicação;
- Express puro não deve substituir o NestJS;
- MongoDB não deve ser adotado como banco principal;
- o frontend não deve executar operações diretas em tabelas sensíveis;
- regras críticas não devem existir exclusivamente no n8n;
- nenhuma dependência deve ser adicionada sem necessidade clara.

---

## 4. Arquitetura

### 4.1 Estrutura geral

```text
apps/
├── web/                 # Next.js
└── api/                 # NestJS

packages/
├── ui/                  # Design system compartilhado
├── contracts/           # Tipos e contratos compartilhados
├── config/              # Configurações comuns
└── eslint-config/       # Regras de código
```

O repositório deve utilizar monorepo, preferencialmente com pnpm workspaces e Turborepo.

### 4.2 Módulos do backend

```text
src/
├── modules/
│   ├── auth/
│   ├── organizations/
│   ├── users/
│   ├── clients/
│   ├── legal/
│   │   ├── cases/
│   │   ├── movements/
│   │   ├── deadlines/
│   │   ├── hearings/
│   │   └── legal-documents/
│   ├── real-estate/
│   │   ├── properties/
│   │   ├── owners/
│   │   ├── tenants/
│   │   ├── leases/
│   │   ├── charges/
│   │   ├── payments/
│   │   └── maintenance/
│   ├── documents/
│   ├── notifications/
│   ├── integrations/
│   │   ├── whatsapp/
│   │   ├── email/
│   │   └── n8n/
│   └── audit/
├── common/
├── config/
└── main.ts
```

### 4.3 Camadas internas

Cada módulo deve, quando aplicável, separar:

- `controller`: entrada e saída HTTP;
- `service` ou `use-case`: regras de negócio;
- `repository`: acesso a dados quando a abstração for necessária;
- `dto`: contratos de entrada e saída;
- `entities` ou `domain`: estruturas e regras do domínio;
- `events`: eventos internos;
- `tests`: testes unitários e de integração.

Controllers devem ser pequenos. Eles não podem conter regras de negócio, queries complexas ou comunicação direta com serviços externos.

### 4.4 Comunicação entre módulos

- Um módulo não deve acessar tabelas de outro módulo indiscriminadamente;
- comunicação direta deve ocorrer por serviços públicos bem definidos;
- eventos internos podem ser usados para notificações e auditoria;
- dependências circulares devem ser evitadas;
- módulos compartilhados não devem conhecer regras específicas dos domínios Jurídico ou Imobiliário.

---

## 5. Multi-organização e isolamento de dados

Todas as entidades pertencentes a uma organização devem conter `organizationId`.

O backend deve extrair a organização do usuário autenticado. O cliente não poderá escolher livremente um `organizationId` para acessar dados.

Regras obrigatórias:

- toda consulta deve ser filtrada pela organização atual;
- identificadores previsíveis não podem permitir acesso cruzado;
- usuários de uma organização nunca podem visualizar dados de outra;
- testes de isolamento entre organizações são obrigatórios;
- índices compostos devem considerar `organizationId` quando necessário;
- unicidade funcional deve ser definida por organização, quando aplicável.

O sistema deve funcionar inicialmente para um cliente, mas estar preparado para atender novos escritórios e administradoras sem alteração estrutural profunda.

---

## 6. Autenticação e autorização

### 6.1 Autenticação

O Supabase Auth será utilizado inicialmente. O frontend obtém a sessão e envia o JWT à API. O NestJS deve validar assinatura, expiração e claims antes de processar a requisição.

### 6.2 Perfis iniciais

- `SUPER_ADMIN`: administração técnica da plataforma;
- `ORG_ADMIN`: administração da organização;
- `LAWYER`: gestão jurídica;
- `REAL_ESTATE_MANAGER`: gestão imobiliária;
- `STAFF`: colaborador com permissões limitadas;
- `CLIENT`: cliente jurídico;
- `OWNER`: proprietário de imóvel;
- `TENANT`: locatário.

### 6.3 Permissões

Somente RBAC não é suficiente. O sistema deve validar também a propriedade e o contexto do recurso.

Exemplo: possuir perfil `CLIENT` não autoriza visualizar todos os processos; autoriza apenas os processos explicitamente associados ao usuário.

### 6.4 Regras adicionais

- MFA deve ser exigido para administradores e recomendado para profissionais;
- endpoints privados devem negar acesso por padrão;
- alteração de perfil e permissão deve gerar auditoria;
- sessão inválida, expirada ou revogada deve ser rejeitada;
- mensagens de erro não devem revelar detalhes internos.

---

## 7. Diretrizes do banco de dados

### 7.1 Convenções

- tabelas e colunas no banco em `snake_case`;
- código TypeScript em `camelCase`;
- IDs preferencialmente em UUID;
- datas armazenadas em UTC;
- valores monetários em `Decimal`, nunca em ponto flutuante;
- CPF, CNPJ, telefone e CEP armazenados normalizados;
- timestamps mínimos: `created_at` e `updated_at`;
- exclusão lógica com `deleted_at` em registros que precisam de histórico.

### 7.2 Integridade

- relações devem possuir foreign keys;
- estados devem ser representados por enums ou tabelas controladas;
- constraints devem impedir dados obviamente inválidos;
- operações financeiras relacionadas devem usar transações;
- migrations são obrigatórias em qualquer mudança de schema;
- alterações manuais em produção são proibidas, salvo incidente documentado.

### 7.3 Auditoria

A auditoria deve registrar, no mínimo:

- organização;
- usuário;
- ação;
- tipo e ID da entidade;
- dados anteriores e posteriores quando permitido;
- IP e user agent quando disponíveis;
- data e hora;
- correlation ID da requisição.

Logs de auditoria não devem armazenar senhas, tokens, segredos ou conteúdo integral de documentos.

---

## 8. Documentos e arquivos

- todos os arquivos sensíveis devem permanecer em buckets privados;
- downloads devem utilizar URLs assinadas com curta validade;
- o backend deve verificar autorização antes de gerar uma URL;
- nome, tipo MIME, tamanho, hash, proprietário e contexto devem ser registrados;
- tamanho e extensões permitidas devem ser validados;
- arquivos não podem ser executados pelo servidor;
- o nome físico do objeto não deve depender do nome enviado pelo usuário;
- exclusões relevantes devem ser auditadas;
- documentos podem ter visibilidade `INTERNAL`, `CLIENT_VISIBLE` ou `RESTRICTED`;
- notas internas nunca devem aparecer no portal do cliente.

Antivírus ou varredura de malware deve ser planejado antes da liberação pública de uploads em larga escala.

---

## 9. Regras do módulo Jurídico

O módulo deve suportar:

- clientes pessoa física e jurídica;
- processos e partes vinculadas;
- número do processo, tribunal, comarca, vara e assunto;
- advogado responsável;
- movimentações;
- prazos;
- audiências;
- documentos;
- observações internas;
- informações simplificadas para o cliente.

Regras obrigatórias:

- movimentação interna e descrição visível ao cliente devem ser campos distintos;
- prazo deve possuir responsável, data, status e prioridade;
- prazo vencido não pode desaparecer do painel;
- conclusão de prazo crítico deve registrar usuário e horário;
- alteração de vencimento deve ser auditada;
- notificações não substituem a conferência profissional do prazo;
- integrações com tribunais somente serão implementadas por meios autorizados e documentados.

---

## 10. Regras do módulo Imobiliário

O módulo deve suportar:

- proprietários e locatários;
- imóveis e unidades;
- contratos de locação;
- cobranças recorrentes;
- pagamentos;
- comprovantes;
- recibos;
- reajustes;
- solicitações de manutenção;
- histórico de ocupação.

Regras obrigatórias:

- dinheiro deve usar tipo decimal;
- cobrança deve possuir competência, vencimento, valor e status;
- pagamentos devem ser idempotentes;
- recebimento de webhook não significa pagamento confirmado sem validação;
- alterações em valores, multas, juros e descontos devem ser auditadas;
- comprovante enviado pelo locatário não altera automaticamente a cobrança para paga, salvo integração validada;
- contratos encerrados devem permanecer no histórico;
- geração mensal deve impedir cobranças duplicadas para a mesma competência.

---

## 11. Portal dos clientes

O portal deve exibir apenas informações liberadas para o usuário autenticado.

### Cliente jurídico

- processos associados;
- situação e resumo autorizado;
- movimentações visíveis;
- próximos eventos;
- documentos liberados;
- canal para envio de documentos e solicitação de atendimento.

O acesso aos processos exige vínculo explícito, ativo e auditado entre a identidade autenticada e uma `Party` cliente participante do processo na mesma organização. O portal mostra movimentações publicadas, audiências futuras marcadas explicitamente como visíveis e documentos ativos `CLIENT_VISIBLE`. Prazos, notas internas e conteúdo não preparado para o cliente permanecem privados. O cliente pode enviar documentos vinculados ao processo; eles ficam `INTERNAL` para revisão da equipe e nunca são publicados automaticamente. Solicitações de atendimento são encaminhadas como notificações internas aos advogados ativos associados ao processo; o MVP não inclui conversa, resposta pelo portal ou workflow de status próprio.

### Locatário

- contrato vigente;
- cobranças;
- faturas e recibos;
- envio de comprovantes;
- solicitações de manutenção;
- notificações de vencimento e reajuste.

### Proprietário

O portal do proprietário poderá ser entregue após o MVP e deve contemplar imóveis, repasses, demonstrativos e inadimplência, conforme regras aprovadas.

---

## 12. Notificações, WhatsApp e n8n

### 12.1 Fonte da verdade

Notificações externas são canais de comunicação. O estado oficial deve permanecer no PostgreSQL.

### 12.2 WhatsApp

- utilizar a Meta WhatsApp Cloud API;
- respeitar templates e janelas de atendimento aplicáveis;
- evitar detalhes jurídicos sensíveis na mensagem;
- preferir mensagem resumida com link autenticado para a plataforma;
- registrar tentativa, provedor, status, data e erro;
- webhooks devem validar autenticidade e ser idempotentes;
- falha no WhatsApp não pode apagar nem invalidar a notificação interna.

### 12.3 n8n

O n8n pode:

- orquestrar notificações;
- integrar serviços externos;
- executar fluxos administrativos;
- consumir webhooks seguros da API;
- apoiar sincronizações.

O n8n não pode:

- decidir permissões;
- calcular sozinho valores oficiais;
- confirmar pagamento sem validação da API;
- alterar prazo crítico sem uma operação autenticada;
- acessar diretamente dados de outras organizações;
- conter a única cópia de uma regra de negócio essencial.

---

## 13. API REST

### 13.1 Convenções

- prefixo `/api/v1`;
- recursos no plural;
- métodos HTTP utilizados semanticamente;
- paginação em listagens;
- filtros permitidos explicitamente;
- DTOs separados para criação, atualização, filtros e respostas;
- Swagger atualizado junto com o código;
- códigos HTTP coerentes;
- erros em formato padronizado.

Formato mínimo de erro:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Dados inválidos.",
  "details": [],
  "correlationId": "uuid"
}
```

### 13.2 Idempotência

Webhooks, geração de cobranças, confirmação de pagamentos e operações suscetíveis a repetição devem aceitar ou gerar chaves de idempotência.

### 13.3 Versionamento

Mudanças incompatíveis exigem nova versão da API. Campos não devem ser removidos silenciosamente.

---

## 14. Frontend e identidade visual

### 14.1 Estrutura compartilhada

- uma única aplicação web;
- seletor de âmbito visível no cabeçalho;
- sidebar e conteúdo adaptados ao módulo ativo;
- navegação protegida por permissões;
- layout responsivo;
- estados de carregamento, vazio e erro obrigatórios;
- acessibilidade mínima seguindo WCAG 2.1 AA.

### 14.2 Advocacia

- base branca;
- cor secundária predominante: verde-musgo `#4F5D3A`;
- sidebar verde-musgo;
- textos e ícones da sidebar em branco ou creme claro.

### 14.3 Imobiliário

- base branca;
- cor secundária predominante: vermelho-vinho `#7A263A`;
- sidebar vermelho-vinho;
- textos e ícones da sidebar em branco ou creme claro.

### 14.4 Estado do âmbito

O âmbito ativo deve ser mantido na navegação e refletido nos menus, breadcrumbs, cores e permissões. Trocar de módulo não deve autenticar novamente o usuário.

---

## 15. Validação e tratamento de erros

- toda entrada externa deve ser validada;
- DTOs rejeitam campos inesperados quando aplicável;
- o frontend valida para experiência, o backend valida para segurança;
- erros externos devem ser traduzidos para erros internos seguros;
- retries devem possuir limite e backoff;
- falhas não podem deixar pagamentos ou cobranças em estado ambíguo;
- exceções não tratadas devem ser registradas com correlation ID;
- segredos e dados pessoais não podem aparecer nos logs.

---

## 16. Testes e qualidade

### 16.1 Testes obrigatórios

- unitários para regras de negócio;
- integração para banco e módulos críticos;
- E2E para autenticação, isolamento e fluxos principais;
- contrato para webhooks e integrações relevantes.

### 16.2 Fluxos mínimos cobertos

- login e bloqueio de acesso indevido;
- isolamento entre organizações;
- cliente visualizando somente seus processos;
- locatário visualizando somente seus contratos;
- criação e conclusão de prazo;
- criação mensal sem cobrança duplicada;
- upload privado e download autorizado;
- confirmação idempotente de pagamento;
- registro de auditoria em ações críticas.

### 16.3 Portões de qualidade

Antes do merge, devem passar:

- lint;
- verificação de tipos;
- testes automatizados;
- build do frontend e backend;
- verificação de migrations;
- revisão de segurança para funcionalidades sensíveis.

Cobertura percentual isolada não substitui testes relevantes. Regras financeiras, permissões e isolamento devem possuir cobertura direta.

---

## 17. Observabilidade e operação

- logs estruturados em JSON;
- correlation ID por requisição;
- health check da API;
- métricas de erro e latência;
- monitoramento de jobs e webhooks;
- alertas para falhas repetidas;
- ambientes separados: desenvolvimento, homologação e produção;
- segredos somente em variáveis seguras;
- backups automáticos e restauração testada;
- deploy com rollback possível.

---

## 18. LGPD e retenção

O projeto deve aplicar minimização de dados, finalidade, controle de acesso e rastreabilidade.

- coletar apenas dados necessários;
- informar finalidade de uso;
- registrar consentimento quando essa for a base aplicável;
- permitir correção de dados;
- implementar política de retenção;
- permitir anonimização ou exclusão quando juridicamente cabível;
- preservar dados quando existir obrigação legal ou exercício regular de direitos;
- identificar operador, controlador e responsáveis antes da produção;
- documentar incidentes de segurança.

Decisões jurídicas específicas devem ser validadas por profissional competente antes do lançamento.

---

## 19. Git e processo de desenvolvimento

### 19.1 Branches

- `main`: produção;
- `develop`: integração, se a equipe realmente necessitar;
- `feat/<descricao>`: funcionalidades;
- `fix/<descricao>`: correções;
- `chore/<descricao>`: manutenção.

Para equipe pequena e prazo curto, é permitido trunk-based development com branches curtas e pull requests pequenos.

### 19.2 Commits

Utilizar Conventional Commits:

- `feat:` funcionalidade;
- `fix:` correção;
- `refactor:` refatoração;
- `test:` testes;
- `docs:` documentação;
- `chore:` manutenção.

### 19.3 Pull requests

- escopo pequeno e objetivo;
- descrição do que mudou;
- evidência de teste;
- migration destacada;
- impacto de segurança informado;
- proibição de segredos e credenciais.

---

## 20. Ordem oficial do MVP

### Etapa 1 — Fundação

- monorepo;
- ambientes;
- autenticação;
- organizações;
- usuários, perfis e permissões;
- auditoria;
- storage privado;
- design system e layout base;
- alternância entre âmbitos.

### Etapa 2 — Jurídico

- clientes;
- processos;
- movimentações;
- prazos;
- audiências;
- documentos;
- portal do cliente;
- notificações internas.

### Etapa 3 — Imobiliário

- proprietários e locatários;
- imóveis;
- contratos;
- cobranças;
- comprovantes;
- pagamentos manuais;
- recibos;
- portal do locatário.

### Etapa 4 — Comunicação

- WhatsApp;
- e-mail;
- templates;
- jobs de lembrete;
- histórico de envio;
- retries controlados.

### Etapa 5 — Evolução pós-MVP

- gateway de pagamento;
- assinatura eletrônica;
- integração autorizada com sistemas jurídicos;
- portal do proprietário;
- conciliação automática;
- relatórios avançados;
- aplicativo mobile, se houver demanda validada.

---

## 21. Fora do escopo inicial

- microsserviços;
- aplicativo nativo;
- inteligência artificial tomando decisões jurídicas;
- múltiplos gateways simultâneos;
- integração não autorizada por scraping;
- contabilidade completa;
- CRM de marketing completo;
- customização irrestrita por organização.

Qualquer inclusão deve ser avaliada quanto a prazo, dependências e impacto no MVP.

---

## 22. Definition of Done

Uma tarefa somente é considerada concluída quando:

- requisitos e regras de aceite foram atendidos;
- permissões foram verificadas;
- entradas foram validadas;
- erros possuem tratamento adequado;
- testes necessários foram criados e aprovados;
- documentação da API foi atualizada;
- migrations foram incluídas quando necessárias;
- logs não expõem dados sensíveis;
- interface possui estados de loading, vazio e erro;
- auditoria foi implementada quando aplicável;
- build e lint passam;
- comportamento foi validado em ambiente de homologação.

---

## 23. Governança desta constituição

Esta constituição é a referência principal para decisões técnicas do projeto.

Mudanças devem:

1. apresentar justificativa;
2. registrar benefícios e riscos;
3. avaliar impacto no prazo e nos dados existentes;
4. atualizar este arquivo;
5. incrementar a versão conforme o impacto.

Classificação de versão:

- **PATCH:** esclarecimento sem mudança arquitetural;
- **MINOR:** nova regra ou ampliação compatível;
- **MAJOR:** alteração de arquitetura, stack ou princípio fundamental.

Exceções temporárias devem possuir responsável, justificativa e prazo para correção. Urgência não elimina requisitos de segurança, isolamento de dados ou auditoria.

---

## 24. Decisão técnica consolidada

```text
Frontend: Next.js + TypeScript
Backend: Node.js + NestJS + TypeScript
Banco: PostgreSQL
ORM: Prisma
Autenticação: Supabase Auth + JWT validado pela API
Arquivos: Supabase Storage privado
Arquitetura: monólito modular em monorepo
WhatsApp: Meta Cloud API
Automação: n8n como auxiliar
Infraestrutura: Docker
Modelo de dados: multi-organização desde o início
```

Esta combinação é obrigatória para o MVP e foi escolhida para equilibrar velocidade de desenvolvimento, organização, segurança e capacidade de evolução.
