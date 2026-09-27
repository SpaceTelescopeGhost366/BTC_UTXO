## Features

### Core Bitcoin Mechanics

- ✅ secp256k1 public/private keys
- ✅ Signed transactions
- ✅ UTXO model
- ✅ Automatic UTXO selection + change
- ✅ Double-spend protection
- ✅ Transaction fees
- ✅ Mempool
- ✅ Coinbase / miner rewards
- ✅ Hash-linked blocks
- ✅ Proof-of-Work mining
- ✅ Merkle tree + Merkle proofs
- ✅ Independent block validation
- ✅ Multiple logical nodes
- ✅ Fork detection
- ✅ Chain reorganization
- ✅ Difficulty adjustment

### Architecture

```text
Keys
 ↓
Signed Transactions
 ↓
UTXO + Mempool
 ↓
Fees + Coinbase
 ↓
Merkle Tree
 ↓
Block
 ↓
Proof-of-Work
 ↓
Independent Validation
 ↓
Fork / Reorganization
 ↓
Difficulty Adjustment
```

## Inspiration

This project was inspired by a Bitcoin/blockchain tutorial series on Bilibili:

[Original tutorial series on Bilibili](https://space.bilibili.com/43276908/lists/28609?type=season)

I used the series as a starting point, then independently extended and refined the implementation based on concepts described in Satoshi Nakamoto's [Bitcoin: A Peer-to-Peer Electronic Cash System](https://bitcoin.org/bitcoin.pdf).

## Scope

This project focuses on understanding the core mechanisms behind Bitcoin and Nakamoto consensus rather than achieving full Bitcoin compatibility.

### Intentionally Not Implemented

- Real P2P networking
- Bitcoin Script
- Persistent blockchain storage
- Full SPV client
- Exact Bitcoin difficulty-retarget algorithm
- Exact cumulative-chainwork fork selection
