# BTC_UTXO

A toy Bitcoin implementation in JavaScript built to understand the core ideas behind Bitcoin from first principles.

> **Goal:** reproduce the main mechanisms described in the Bitcoin whitepaper — not Bitcoin Core itself.

This project focuses on how transactions, UTXOs, signatures, mining, Proof-of-Work, Merkle trees, and node validation fit together into a simplified form of Nakamoto consensus.

---

## Why this project?

Instead of treating Bitcoin as a black box, this project rebuilds its main components step by step:

```text
Keys
  ↓
Signed Transactions
  ↓
UTXO Validation
  ↓
Mempool
  ↓
Fees + Coinbase
  ↓
Merkle Tree
  ↓
Block
  ↓
Proof-of-Work
  ↓
Blockchain
  ↓
Independent Node Validation
  ↓
Fork Handling / Chain Selection
```

The emphasis is on **understanding the architecture**, not reproducing every production detail.

---

## Roadmap

```text
Transactions
    ↓
UTXO
    ↓
Digital Signatures
    ↓
Transaction Fees
    ↓
Blocks
    ↓
Proof-of-Work
    ↓
Coinbase
    ↓
Merkle Tree
    ↓
Multiple Nodes
    ↓
Fork Handling
    ↓
Chain Consensus
    ↓
Difficulty Adjustment
```

### Current focus

**Difficulty Adjustment**

---

## Progress

| Layer | Progress |
|---|---|
| Transactions / UTXO | ██████████ 100% |
| Blocks / Mining | █████████░ 90% |
| Merkle / SPV concepts | █████████░ 90% |
| Consensus simulation | ████████░░ 80% |
| Real P2P networking | Out of scope |

---

# Implemented Features

## 1. Wallet / Cryptography

- ✅ secp256k1 keypairs
- ✅ public/private keys
- ✅ transaction hashing
- ✅ digital signatures
- ✅ signature verification

---

## 2. Transactions / UTXO

- ✅ transaction inputs and outputs
- ✅ UTXO model
- ✅ spending existing UTXOs
- ✅ creating new UTXOs from transaction outputs
- ✅ automatic change output
- ✅ automatic UTXO selection
- ✅ balance calculation from the UTXO set
- ✅ UTXO existence validation
- ✅ ownership validation
- ✅ duplicate-input protection
- ✅ mempool double-spend protection
- ✅ input/output amount validation

---

## 3. Fees / Mining Incentives

- ✅ basic transaction fee calculation
- ✅ miner collects transaction fees
- ✅ Coinbase transaction
- ✅ only one Coinbase transaction per block
- ✅ Coinbase must be the first transaction
- ✅ Coinbase reward limited to subsidy + transaction fees
- ✅ arbitrary zero-input minting rejected

---

## 4. Blocks / Proof-of-Work

- ✅ block structure
- ✅ previous-block hash linking
- ✅ nonce-based mining
- ✅ simplified Proof-of-Work
- ✅ block hash integrity validation
- ✅ Proof-of-Work validation when receiving blocks
- ✅ blockchain tamper detection

---

## 5. Merkle Tree

- ✅ Merkle tree construction
- ✅ Merkle root stored in the block
- ✅ odd-leaf duplication
- ✅ Merkle proof generation
- ✅ Merkle proof verification
- ✅ simplified SPV / transaction inclusion concept

---

## 6. Nodes / Consensus

- ✅ multiple logical blockchain nodes
- ✅ independent block validation
- ✅ fork detection
- ✅ fork storage
- ✅ chain reorganization
- ✅ simplified longest-chain consensus

> The current implementation uses a fixed difficulty, so chain length is used as a proxy for accumulated Proof-of-Work.

---

# Current Upgrade: Difficulty Adjustment

The final major feature planned for this project is a simplified difficulty-adjustment mechanism.

Conceptually:

```text
Target block time
        ↓
Observe actual block time
        ↓
Blocks too fast?
    → increase difficulty

Blocks too slow?
    → decrease difficulty
```

Planned components:

- ⬜ target block time
- ⬜ difficulty adjustment interval
- ⬜ difficulty stored per block
- ⬜ `adjustDifficulty()`
- ⬜ validation using each block's historical difficulty

The goal is to understand the feedback loop behind Bitcoin's difficulty retargeting, not reproduce Bitcoin's exact 2016-block algorithm.

---

# Networking Scope

The project currently simulates two logical nodes:

```text
Node A
   │
   │ proposes block
   ▼
Node B
   │
   ├─ verify previous hash
   ├─ verify block hash
   ├─ verify Merkle root
   ├─ verify Proof-of-Work
   ├─ verify Coinbase
   ├─ verify transactions
   └─ accept / reject
```

For learning purposes, blocks are passed directly between node objects rather than through a full TCP/P2P network.

The important idea being demonstrated is:

> **A node does not trust another node's block. It independently verifies the block before updating its own state.**

Real peer discovery, networking, serialization protocols, and block propagation are intentionally outside the main scope of this project.

---

# Simplifications / Limitations

This is an educational implementation, so several production Bitcoin features are intentionally simplified or omitted.

- 🟡 multi-input transactions assume inputs belong to the same sender
- 🟡 Merkle proofs are implemented, but there is no full SPV client
- 🟡 chain selection currently uses block count because difficulty is fixed
- ❌ integer satoshis are not used; amounts are JavaScript floating-point values
- ❌ Bitcoin Script is not implemented
- ❌ real Bitcoin block serialization is not implemented
- ❌ persistent blockchain storage is not implemented
- ❌ peer discovery is not implemented
- ❌ real P2P transaction/block propagation is not implemented
- ❌ Bitcoin Core compatibility is not a goal

---

# Core Idea

The project can be summarized as:

```text
Digital Signatures
+
UTXO Rules
+
Hash-Linked Blocks
+
Proof-of-Work
+
Independent Validation
+
Fork Resolution
+
Mining Incentives
=
Simplified Nakamoto Consensus
```

---

# Project Status

The main Bitcoin architecture is already implemented.

The final major educational feature is:

**Difficulty Adjustment**

After that, the project will be considered feature-complete for its original purpose:

> **understanding how Bitcoin works internally, rather than rebuilding Bitcoin Core.**

---

## Tech Stack

- JavaScript / Node.js
- `crypto-js`
- `elliptic`
- secp256k1
- SHA-256

---

## Disclaimer

This project is for educational purposes only.

It is **not** production-ready cryptocurrency software and should not be used to secure real funds.
