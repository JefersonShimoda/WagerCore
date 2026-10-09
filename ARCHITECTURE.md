# WagerCore - Arquitetura e Decisões Técnicas

Este documento centraliza os limites arquiteturais, invariantes financeiros e escolhas de infraestrutura adotadas no WagerCore para atender às rigorosas regras de negócio.

## Limites Arquiteturais e Componentes
O projeto segue princípios de Clean Architecture adaptados ao ecossistema NestJS:
- **Domínio:** Entidades estritamente encapsuladas (`Money`, `Wallet`, `WagerTransaction`, `WalletLedgerEntry`). Nenhuma lógica de infraestrutura, ORM ou validação de framework interfere aqui.
- **Aplicação (Use Cases):** Orquestra chamadas do domínio. Centraliza e controla as transações de banco de dados, gravação no outbox e obtenção de locks.
- **Infraestrutura:** Camada de adaptadores contendo MikroORM (PostgreSQL), roteadores HTTP, Publishers e Consumers SQS.

## Modelo de Domínio e Precisão Monetária
- O dinheiro não pode ser tratado como `number` numérico ou ponto flutuante genérico devido às imprecisões e limitações da IEEE 754 no JavaScript.
- A classe `Money` utiliza a biblioteca `decimal.js` sob o capô, manipulando valores sempre como `string` ("25.00"). No PostgreSQL, essas colunas são geradas como tipo `DECIMAL(12, 2)`, e serializadas estritamente como string nas requisições.
- **Invariante:** Operações matemáticas resultam em novas instâncias imutáveis. Validações bloqueiam conflitos de moeda, notação científica ou valores negativos ilícitos.

## Concorrência por Carteira
- Não utilizamos locks globais ou de Redis. Aplicamos um **Lock Pessimista de Linha** (`LockMode.PESSIMISTIC_WRITE` / `SELECT ... FOR UPDATE`) apontando unicamente para a *Wallet* requerida.
- O ciclo `read -> calculate -> update` da movimentação de saldo é blindado diretamente no processo transacional de persistência. Múltiplas instâncias podem operar na mesma wallet de forma sequencial sem anomalia de "lost updates". Várias instâncias operando sobre wallets distintas prosseguem em paralelo puro.

## Idempotência Persistente
- Não confiamos na rede ou cache em memória. A tabela `wager_transactions` possui a restrição `UNIQUE(provider_id, idempotency_key)`. Requisições duplicadas sofrem conflito e falham transacionalmente sem repetição do efeito.
- A fila SQS processa e registra identificadores em uma tabela `inbox`. Esse padrão garante entrega e processamento unificado *exactly-once* sem mover saldos duas vezes.

## Atomicidade, Inbox, e Outbox Transacional
- O SQS não fornece consistência financeira por si só. Utilizamos o Padrão **Transactional Outbox**.
- O crédito, o débito, o ledger e o registro do evento de sucesso caem estritamente na *mesma transação* de commit do MikroORM.
- Um processo cron lê as linhas recém-commitadas na tabela `outbox` e propaga a mensagem para o SQS de maneira resiliente. Garantimos a regra: "Nenhum evento é emitido antes do commit, e nenhum efeito do banco se perde".

## SQS: ACK após Commit, Retries e DLQ
- A confirmação de que a mensagem SQS foi recebida e deve sair da fila (`ACK`) ocorre unicamente após o bloco de commit do banco.
- Caso ocorra *deadlock* de banco ou a transação falhe, nenhuma confirmação de `ACK` é enviada. O sistema obedece a política do visibilidade do SQS e tenta novamente (*retry* com backoff).
- Falhas definitivas ou sintáticas deslocam a mensagem para a DLQ associada, garantindo recuperação contra dados envenenados sem travar a fila.

## Reversões Fora de Ordem (Out-of-Order)
- Mensagens de `REFUND` ou `ROLLBACK` podem bater na API e/ou Fila antes de seu referente `BET` chegar. O domínio compreende esse descompasso: a transação é criada, mas alocada como `PENDING_REFERENCE`.
- Um *worker* interno periódico caça processos pendentes e simula o reprocesso. Assim que a operação referenciada chegar no banco, o fluxo destrava. Sem referência após o limite máximo, a aposta atinge o status terminal de `REJECTED`.

## Saldo e Ledger Imutável
- Nenhuma operação sobrecreve informações de log (ledger). `WalletLedgerEntry` age com a premissa de *append-only*.
- A regra de negócio principal proíbe saldo negativo e impõe validação na própria camada de aplicação (INSUFFICIENT_FUNDS). Como mecanismo de defesa da infraestrutura, a própria migration possui uma constraint: `CHECK (balance >= 0)`.

## Observabilidade e Segurança
- Implementação de logs estruturados utilizando `nestjs-pino`.
- `correlationId` é trafegado ponta a ponta sem expor sensíveis (*messageId*, *transactionId*, *walletId* e status).
- Métricas Prometheus ativas para total de transações, latência, conflitos de banco, *retries* e lag na Outbox.

## Decisões Técnicas e Trade-offs
- O uso de lock pessimista (`FOR UPDATE`) diminui as chances de erros transicionais concorrentes em detrimento da velocidade síncrona, visto que requisições paradas esperam na porta do banco. Esta decisão é estritamente aderente e ideal ao cenário financeiro (onde conformidade importa mais que latência em microssegundos).
- Para assegurar blindagem contra poluição de Global Context (do MikroORM), os testes de integração E2E não abrem chamadas explícitas de persistência cruzando domínios. A reconciliação do invariante do Ledger e checagens estritas ocorrem via API (e.g. `/wallets/:id/reconcile`) e contêineres independentes (MiniStack e TestContainers).

## Fluxo de Processamento Financeiro

<img width="3686" height="2964" alt="Fluxo de Processamento Financeiro" src="https://github.com/user-attachments/assets/968688b2-958d-483c-ba40-3b7d270743c7" />

## Concorrência

<img width="3106" height="8478" alt="Diagrama de Concorrência" src="https://github.com/user-attachments/assets/38395390-8b25-48f7-ad6a-dc7ad4f743a2" />

## Inbox, Outbox e recuperação de falhas

<img width="3200" height="2138" alt="Inbox, Outbox e recuperação de falhas" src="https://github.com/user-attachments/assets/98c5de71-080c-477f-8936-f2965b4fc660" />

## Entidade-Relacionamento

<img width="7167" height="2892" alt="EntidadeRelacionamento" src="https://github.com/user-attachments/assets/a486d605-8283-46b7-bbd0-ddf6484d0c7a" />