# Evidência de Testes Locais e Fluxos Principais (E2E)

Este documento demonstra a execução prática dos principais fluxos financeiros do **Wager-Core**. Todos os comandos abaixo foram executados via **Windows PowerShell**, comprovando o comportamento de criação de carteira, validação de saldos, débitos, créditos, reembolsos, reconciliação financeira e idempotência.

---

### 1. Criação da Carteira (Wallet)
Cria a carteira inicial para o jogador. O sistema retorna o ID único da nova carteira (`01a12302-288c-76ef-86c4-e12f27f924eb`), que será utilizado nas próximas requisições.

**Comando:**
```powershell
PS > $wallet = Invoke-RestMethod -Uri "http://localhost:3000/wallets" -Method Post -ContentType "application/json" -Body '{"playerId": "0192f28f-5dc0-7d58-bdb2-814ad6a0f4a1", "currency": "BRL"}'
PS > $wallet.id
```

**Retorno do Terminal:**
```console
01a12302-288c-76ef-86c4-e12f27f924eb
```

---

### 2. Aposta Rejeitada por Saldo Insuficiente (BET 1)
O sistema intercepta a aposta (`BET`) e rejeita a transação para impedir que a carteira (atualmente com R$ 0,00) fique com saldo negativo.

**Comando:**
```powershell
PS > Invoke-RestMethod -Uri "http://localhost:3000/transactions/process" -Method Post -ContentType "application/json" -Body "{
    `"providerId`": `"provider-a`",
    `"externalTransactionId`": `"txn-bet-001`",
    `"idempotencyKey`": `"idemp-bet-001`",
    `"walletId`": `"01a12302-288c-76ef-86c4-e12f27f924eb`",
    `"playerId`": `"0192f28f-5dc0-7d58-bdb2-814ad6a0f4a1`",
    `"roundId`": `"round-01`",
    `"gameId`": `"fortune-tiger`",
    `"kind`": `"BET`",
    `"money`": { `"amount`": `"10.00`", `"currency`": `"BRL`" }
}"
```

**Retorno do Terminal:**
```console
id                                   status   resultBalanceAmount
--                                   ------   -------------------
01a12311-ff0e-7766-a73c-b4859a95b219 REJECTED                    
```

---

### 3. Pagamento de Prêmio (WIN)
Simulação de um ganho na rodada (`WIN`). O sistema processa o crédito e atualiza o saldo da carteira para R$ 50,00.

**Comando:**
```powershell
PS > Invoke-RestMethod -Uri "http://localhost:3000/transactions/process" -Method Post -ContentType "application/json" -Body "{
    `"providerId`": `"provider-a`",
    `"externalTransactionId`": `"txn-win-001`",
    `"idempotencyKey`": `"idemp-win-001`",
    `"walletId`": `"01a12302-288c-76ef-86c4-e12f27f924eb`",
    `"playerId`": `"0192f28f-5dc0-7d58-bdb2-814ad6a0f4a1`",
    `"roundId`": `"round-01`",
    `"gameId`": `"fortune-tiger`",
    `"kind`": `"WIN`",
    `"money`": { `"amount`": `"50.00`", `"currency`": `"BRL`" }
}"
```

**Retorno do Terminal:**
```console
id                                   status    resultBalanceAmount
--                                   ------    -------------------
01a12312-5f46-73ee-9dab-dd8e06a519e0 PROCESSED 50.00              
```

---

### 4. Reconciliação Financeira
Aciona o motor de auditoria. O sistema varre a tabela *Ledger* (extrato financeiro imutável) e comprova que a soma dos débitos e créditos (R$ 50,00) bate exatamente com o saldo atual da carteira.

**Comando:**
```powershell
PS > Invoke-RestMethod -Uri "http://localhost:3000/wallets/01a12302-288c-76ef-86c4-e12f27f924eb/reconcile" -Method Post
```

**Retorno do Terminal:**
```console
walletId      : 01a12302-288c-76ef-86c4-e12f27f924eb
isBalanced    : True
walletBalance : 50.00
ledgerSum     : 50.00
difference    : 0.00
```

---

### 5. Aposta Bem-sucedida (BET 2)
Realização de uma nova aposta de R$ 10,00. Como agora a carteira possui fundos, a aposta é autorizada e processada, atualizando o saldo para R$ 40,00.

**Comando:**
```powershell
PS > Invoke-RestMethod -Uri "http://localhost:3000/transactions/process" -Method Post -ContentType "application/json" -Body "{
    `"providerId`": `"provider-a`",
    `"externalTransactionId`": `"txn-bet-002`",
    `"idempotencyKey`": `"idemp-bet-002`",
    `"walletId`": `"01a12302-288c-76ef-86c4-e12f27f924eb`",
    `"playerId`": `"0192f28f-5dc0-7d58-bdb2-814ad6a0f4a1`",
    `"roundId`": `"round-01`",
    `"gameId`": `"fortune-tiger`",
    `"kind`": `"BET`",
    `"money`": { `"amount`": `"10.00`", `"currency`": `"BRL`" }
}"
```

**Retorno do Terminal:**
```console
id                                   status    resultBalanceAmount
--                                   ------    -------------------
01a12313-db18-701a-8e7e-5ac16c5c9a24 PROCESSED 40.00              
```

---

### 6. Reembolso de Aposta Cancelada (REFUND)
Simulação de cancelamento de uma rodada, onde a provedora estorna a aposta referenciada (`txn-bet-002`). O saldo de R$ 10,00 é imediatamente creditado de volta para o jogador.

**Comando:**
```powershell
PS > Invoke-RestMethod -Uri "http://localhost:3000/transactions/process" -Method Post -ContentType "application/json" -Body "{
    `"providerId`": `"provider-a`",
    `"externalTransactionId`": `"txn-refund-001`",
    `"idempotencyKey`": `"idemp-refund-001`",
    `"walletId`": `"01a12302-288c-76ef-86c4-e12f27f924eb`",
    `"playerId`": `"0192f28f-5dc0-7d58-bdb2-814ad6a0f4a1`",
    `"roundId`": `"round-01`",
    `"gameId`": `"fortune-tiger`",
    `"kind`": `"REFUND`",
    `"referenceExternalTransactionId`": `"txn-bet-002`", 
    `"money`": { `"amount`": `"10.00`", `"currency`": `"BRL`" }
}"
```

**Retorno do Terminal:**
```console
id                                   status    resultBalanceAmount
--                                   ------    -------------------
01a12316-c90d-75e6-a6ca-c2b510157f6f PROCESSED 50.00              
```

---

### 7. Teste de Idempotência (Proteção contra Dupla Cobrança)
Simulação do envio repetido da transação de reembolso (mesmo Payload e `idempotencyKey`). A aplicação intercepta a duplicidade e responde com o estado já processado, mantendo a consistência do saldo em R$ 50,00 e garantindo a idempotência exigida pela provedora.

**Comando:**
```powershell
PS > Invoke-RestMethod -Uri "http://localhost:3000/transactions/process" -Method Post -ContentType "application/json" -Body "{
    `"providerId`": `"provider-a`",
    `"externalTransactionId`": `"txn-refund-001`",
    `"idempotencyKey`": `"idemp-refund-001`",
    `"walletId`": `"01a12302-288c-76ef-86c4-e12f27f924eb`",
    `"playerId`": `"0192f28f-5dc0-7d58-bdb2-814ad6a0f4a1`",
    `"roundId`": `"round-01`",
    `"gameId`": `"fortune-tiger`",
    `"kind`": `"REFUND`",
    `"referenceExternalTransactionId`": `"txn-bet-002`", 
    `"money`": { `"amount`": `"10.00`", `"currency`": `"BRL`" }
}"
```

**Retorno do Terminal:**
```console
id                                   status    resultBalanceAmount
--                                   ------    -------------------
01a12316-c90d-75e6-a6ca-c2b510157f6f PROCESSED 50.00              
```
