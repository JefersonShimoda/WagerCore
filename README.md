# WagerCore

WagerCore é o motor de carteira ("Wallet Engine") projetado em **NestJS** para suportar de modo contínuo, as requisições financeiras e operações transacionais massivas (Apostas, Prêmios e Estornos). O sistema foca primordialmente na prevenção absoluta de anomalias monetárias, duplicação e dependência frágil de serviços externos.

---

## Objetivo do Projeto e Visão Geral
A infraestrutura garante que, independentemente da carga massiva ou concorrência simultânea entre instâncias, cada operação:
- Resulta em um balanço imutável de ledger (`wallet.balance == sum(ledger)`).
- Não emite eventos à plataforma antes da certeza final da escrita transacional (Outbox).
- Deduplica mensagens automaticamente e garante idêntica aplicação financeira (*exactly-once semantics*) baseada no `idempotency_key`.
- Preserva estritamente escalas de moeda em Decimal.

## Stack Tecnológica
- **Plataforma:** Node.js gerenciado nativamente pelo [Bun](https://bun.sh/)
- **Framework:** [NestJS](https://nestjs.com/)
- **Linguagem:** TypeScript (Strict Mode ativado)
- **Banco de Dados:** PostgreSQL 15
- **ORM:** MikroORM (PostgreSqlDriver e Migrator)
- **Mensageria:** SQS (Emulada via MiniStack)
- **Testes:** Bun Test e Testcontainers

## Pré-requisitos
Certifique-se de que o seu ambiente tem o fundamental:
- Instalação global do [Bun](https://bun.sh/) v1+ (`curl -fsSL https://bun.sh/install | bash`)
- Instalação e execução ativa do [Docker](https://www.docker.com/) com Docker Compose (para subirmos dependências de SQS e BD).

## Configuração das Variáveis de Ambiente
Na raiz da aplicação, configure o arquivo de ambiente. O arquivo ".env" foi enviado via email.

## Inicialização (Banco e MiniStack SQS)
Suba os contêineres auxiliares que representam o seu ecossistema distribuído via `docker-compose`. Isso emula as instâncias primárias do PostgreSQL e as filas SQS (`wager-transactions.fifo` e sua homônima de DLQ) no MiniStack.

```bash
docker-compose up -d
```

## Setup de Migrations e Aplicação
1. Instale as dependências com velocidade utilizando o Bun:
```bash
bun install
```

2. Aplique a estrutura inicial e invariantes/constraints no banco (ex: `CHECK balance >= 0`):
```bash
bun run mikro-orm migration:up
```

3. Inicie o WagerCore na porta alocada:
```bash
bun run start:dev
```

## Comandos Disponíveis (Build, Lint e Tipagem)
A suite de scripts segue os padrões Clean.
- **Formatação de Sintaxe (ESLint/Prettier):** `bun run lint`
- **Checagem Completa de Tipos Sem Emitir JS:** `bun run typecheck`
- **Build de Produção:** `bun run build`

---

## Endpoints HTTP Disponíveis

### Criar ou Retornar Carteira Existente
Criação limpa com saldo zerado, vinculando de forma unívoca (`playerId` + `currency`).

**POST** `/wallets`
```json
{
  "playerId": "0192f28f-5dc0-7d58-bdb2-814ad6a0f4a1",
  "currency": "BRL"
}
```

### Submeter Transação Financeira
Exemplo para envio de um estorno (`REFUND`) atrelado a uma Aposta (`BET`) anterior. O endpoint utiliza o modelo síncrono da classe WagerTransaction e devolve status e *flags*.

**POST** `/transactions/process`
```json
{
  "providerId": "provider-a",
  "externalTransactionId": "txn-55566",
  "idempotencyKey": "txn-55566-idemp",
  "referenceExternalTransactionId": "txn-12345",
  "walletId": "01a122ae-59b7-7174-bb50-df4e089fdbd0",
  "playerId": "0192f28f-5dc0-7d58-bdb2-814ad6a0f4a1",
  "roundId": "round-987",
  "gameId": "fortune-chimp",
  "kind": "REFUND",
  "money": {
    "amount": "25.00",
    "currency": "BRL"
  }
}
```

### Reconciliação Passiva e Verificação de Regras
Invoque sob demanda para confirmar que a somatória atômica do histórico e o registro do saldo fixo bateram com exatidão (`isBalanced`).

**GET** `/wallets/:id/reconcile`
**Resposta esperada:** 200 OK
```json
{
  "walletId": "01a122ae-59b7-7174-bb50-df4e089fdbd0",
  "balance": "100.00",
  "ledgerSum": "100.00",
  "isBalanced": true
}
```

---

## Testes de Integração e Concorrência (E2E)
A execução de toda a suíte transacional **dispensa mock de instâncias**. O `Testcontainers` subirá ativamente conteineres do PostgreSQL e do MiniStack para provar as transações lado a lado.

Você pode rodar os testes sem a necessidade de parar o WagerCore na sua máquina, uma vez que as portas sob os containers são encapsuladas e isoladas durante os ciclos:

```bash
bun test test/concurrency.e2e.spec.ts
```
*(Garante a exata execução do ciclo perante estresse brutal simultâneo (50 paralelos) atestando que os lockdowns pessimistas não se romperam e o saldo final se igualou a 1 entrada no banco).*

```bash
bun test test/out-of-order.e2e.spec.ts
```
*(Confirma que pacotes invertidos como REFUND disparado primeiro caem perfeitamente para aguardo transacional de PENDING_REFERENCE e são re-acordados e confirmados quando o referente bater).*

Rodar tudo junto e unitários da seção principal de Domínio de Money/Wallet/Ledger:
```bash
bun test
```

## Diagrama de Arquitetura

<img width="2786" height="1934" alt="Diagrama de Arquitetura" src="https://github.com/user-attachments/assets/9fc2de6d-1e50-431a-99a9-e808128624b7" />