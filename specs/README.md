# Especificações do produto

Este diretório transforma a constituição do projeto em documentos executáveis de produto e engenharia.

## Ordem de leitura

1. [constitution.md](constitution.md) — princípios e decisões obrigatórias.
2. [product-requirements.md](product-requirements.md) — escopo funcional e critérios de aceite do MVP.
3. [authorization-matrix.md](authorization-matrix.md) — autorização inicial por papel e contexto.
4. [domain-model.md](domain-model.md) — entidades, relações e invariantes de negócio.
5. [delivery-backlog.md](delivery-backlog.md) — ordem de implementação e portões de qualidade.
6. [open-decisions.md](open-decisions.md) — decisões que ainda precisam de validação.

## Hierarquia de decisão

Em caso de conflito, `constitution.md` prevalece. Requisitos funcionais não podem reduzir as garantias de segurança, isolamento, auditoria ou qualidade definidas na constituição.

Os documentos desta pasta são incrementais. Uma decisão funcional aprovada deve atualizar o requisito, o modelo de domínio e os itens de backlog afetados.
