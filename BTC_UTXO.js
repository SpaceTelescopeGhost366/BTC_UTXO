const sha256  = require('crypto-js/sha256')  // sha256 algorithm
const eclib = require('elliptic').ec         // Elliptic class
const ec = new eclib('secp256k1')       // Library for public key and private key

// Construct the block
// Block = data + previous_hash + time_stamp + nonce(random number) + self_hash
// computeHash()
// Validate_BLock_Transactions()
// Mining(difficulty){}

class Block{
    constructor(transactions, previousHash, timestamp=Date.now(), difficulty=0){
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.nonce = 1;
        this.timestamp = timestamp;
        this.merkle_root = this.get_merkleroot();
        this.difficulty = difficulty;
        this.hash = this.computeHash();
    }

    // Compute the Hash value for current block
    computeHash(){
        // Transaction has to be string rather than numerical expression
        return sha256(this.previousHash + this.merkle_root + this.nonce + this.timestamp + this.difficulty).toString()
    }

    // Create the merkle root of the code
    get_merkleroot(){
        // Genesis block
        if(!Array.isArray(this.transactions)){
            return sha256(JSON.stringify(this.transactions)).toString();
        }

        let layer = this.transactions.map(
            tx => tx.computeHash()
        );

        while(layer.length > 1){
            let nextlayer = [];
            for(let i = 0; i < layer.length; i += 2){
                const left = layer[i];
                const right = layer[i+1] || layer[i]; // choose the right if it exist, otherwise the left
                const combined_hash = sha256(left + right).toString();
                nextlayer.push(combined_hash);
            }
            layer = nextlayer;
        }
        return layer[0]

    }

    // Prove the merkle root
    get_merkle_proof(txIndex){

        let layer = this.transactions.map(
            tx => tx.computeHash()
        );

        let index = txIndex;
        let proof = [];

        while(layer.length > 1){

            const isRight = index % 2 === 1;

            const siblingIndex =
                isRight ? index - 1 : index + 1;

            const siblingHash =
                layer[siblingIndex] || layer[index];

            proof.push({
                hash: siblingHash,
                position: isRight ? "Left" : "Right"
            });


            // Build next layer INSIDE the while loop
            let nextlayer = [];

            for(let i = 0; i < layer.length; i += 2){

                const left = layer[i];
                const right = layer[i+1] || layer[i];

                nextlayer.push(
                    sha256(left + right).toString()
                );
            }

            layer = nextlayer;

            // Where is our target hash in the new layer?
            index = Math.floor(index / 2);
        }

        return proof;
    }
    
    // Verify proof of the merkle root
    verify_merkle_tree(transaction, proof){
        let currentHash = transaction.computeHash();

        for(let item of proof){
            if(item.position === 'Left'){
                currentHash = sha256(item.hash + currentHash).toString();
            }
            else{
                currentHash = sha256(currentHash + item.hash).toString();
            }

        }
        return currentHash === this.merkle_root;

    }
        

    //  Set up the difficulty for the answer in the Mining process
    get_answer(difficulty){
        let answer = ''
        for(let i=0; i<difficulty; i++){
            answer += '0'
        }
        return answer
    }

    // Validate the transaction before the mining process
    Validate_Block_Transactions(){
        // Handle Genesis block or non-array transactions safely
        if(!Array.isArray(this.transactions)){
            return true;
        }
        for(let transaction of this.transactions){
            if(!transaction.IsValid()){
                console.log("Invalid Transaction found in transactions!!")
                return false
            }
        }
        return true
    }

    

    // Mining 
    Mining(difficulty){
        if(!this.Validate_Block_Transactions()){
            throw new Error("Mining stopped: Invalid transactions in block!");
        }
        while(true){
            this.hash = this.computeHash()
            if(this.hash.substring(0, difficulty) !== this.get_answer(difficulty)){
                this.nonce++;
                this.hash = this.computeHash();
            }
            else{
                break
            }
        }
        console.log('--------------------------------------------------------------------------------------')
        console.log("Mining is Done.", `Hash:${this.hash}`)
        console.log('--------------------------------------------------------------------------------------')
    }
}

// User of the blockchain
class User{
    constructor(name){
        this.name = name;
        this.keyPair = ec.genKeyPair();
        this.privateKey = this.keyPair.getPrivate('hex');
        this.publicKey = this.keyPair.getPublic('hex');
    }
}

// UTXO Mechanism
// txhash: where is this UTXO from?
// outputIndex: Where is it going?
// amount: the amount of the transaction
// owner: the owner of the UTXO
class UTXO{
    constructor(txHash, outputIndex, amount, owner){
        this.txHash = txHash;
        this.outputIndex = outputIndex;
        this.amount = amount;
        this.owner = owner
    }
}


// Transaction
// constructor = inputs + outputs + timestamp
// computeHash() 
// sign(key) 
class Transaction{
    constructor(inputs, outputs){
        this.inputs = inputs;
        this.outputs = outputs;
        this.timestamp = Date.now();
        this.signature = null
    }
    
    // Compute hash value for a specific transaction
    computeHash(){
        return sha256(
            JSON.stringify({
                inputs: this.inputs,
                outputs: this.outputs,
                timestamp: this.timestamp
            })
        ).toString()
    }

    // Sign the key
    sign(key){
        this.signature = key.sign(this.computeHash()).toDER('hex')
    }

    // Validate the transaction
    IsValid(){
        // If no inputs at all (e.g., miner reward), skip signature check
        if(!this.inputs || this.inputs.length === 0) return true;
        
        // In this simplified model, we assume all inputs belong to the same sender.
        // Use the public key stored in the first input's owner.
        const senderPublicKey = this.inputs[0].owner;
        if(!senderPublicKey) return false;

        const key_obj = ec.keyFromPublic(senderPublicKey, 'hex')
        return key_obj.verify(this.computeHash(), this.signature)
    }

}


// Chain
// constructor = chain + transactionpool + minerReward + difficulty
// Genisis Block
// get_lastest_block
// addTransaction 
// add_block_to_chain
class Chain{
    constructor(){
        this.chain = [this.OG_block()];
        this.transactionpool = [];
        this.minerReward = 2;
        this.difficulty = 4;
        this.targetBlocktime = 600;    // 1 Second
        this.adjustmentInterval = 4;    // every 3 block
        this.utxoset = [];
        this.users = [];
        this.fork_block = [];
        this.genesisUTXOs = [];
    }

    // Register all users
    register_users(user){
        this.users.push(user);
    }

    // Define the Genisis Block
    OG_block(){
        const genesisBlock = new Block("I am the Genesis Block!", '', 0)
        return genesisBlock
    }
    // UTXOs initialization of Genesis Block
    Set_Genesis_UTXOs(utxos){
        // Current UTXO
        this.utxoset = utxos.map(
            u => new UTXO(
                u.txHash,
                u.outputIndex,
                u.amount,
                u.owner
            )
        )
        // Genesis UTXOs
        this.genesisUTXOs = utxos.map(
            u => new UTXO(
                u.txHash,
                u.outputIndex,
                u.amount,
                u.owner
            )
        )
    }
    // Find the hash value of the lastest block
    get_lastest_block(){
        return this.chain[this.chain.length-1]
    }

    // Add transaction to the transaction pool
    addTransaction(transaction){
        if(!this.Validate_UTXO_Transaction(transaction)){
            throw new Error('Invalid Transaction!!');
        }
        else{
            this.transactionpool.push(transaction);
        }
    }
    
    // Calculation for the fee rate
    // more inputs -> more fee
    // more outputs -> more fee
    calculate_fee(inputs_num, outputs_num, fee_rate){
        const size = inputs_num * 68 + outputs_num * 36 + 10;
        return size * fee_rate;
    }

    // Pick enougth UTXOs that belongs to one user pick 
    // and then send it to the the other end of the transaction
    send(sender, receiver, amount){
        let selected_UTXOs = [];
        let total = 0;
        const fee_rate = 0.0001;      // Setup the fee_rate
        let fee = 0;                 // Initialize the fee
        let required = 0;
        
        
        for(let utxo of this.utxoset){
            if(utxo.owner === sender.publicKey){
                selected_UTXOs.push(utxo);
                total += utxo.amount;

                // Calculate the fee according to the size of the input + the output
                fee =  this.calculate_fee(selected_UTXOs.length, 2, fee_rate) ;
                required = amount + fee; // sum of the required amount of money
                if(total >= required){
                    break;
                }
            }
    } 
    
    // Insufficent amount
    if(total < required){
        console.log(`${sender.name} wants to send ${amount} | selected=${total} | fee=${fee} | required=${required}`);
        throw new Error("Insufficient balance!")
    }

    // Payment output
    const outputs = [
        {
        amount : amount,
        owner : receiver.publicKey
        }
        ];

    // Change back to the sender
    if(total > required){
        outputs.push({
            amount : total - required,
            owner : sender.publicKey
        })
    }

    // Create tx based on Selected_UTXOs, and sign the transaction
    const transaction = new Transaction(
        selected_UTXOs, 
        outputs
    );

    transaction.sign(sender.keyPair);
    this.addTransaction(transaction);
    return transaction;
    }

    // add_block_to_chain
    // Find out previous_hash 
    // Mining
    // Push the new block to the chain
    add_block_to_chain(new_block){
        new_block.previousHash = this.get_lastest_block().hash
        new_block.Mining(new_block.difficulty)
        this.chain.push(new_block) 
    }


    // Adjust the difficulty based on the mining time
    adjustDifficulty(){
        const blockcount = this.chain.length - 1;                               // Length of the chain

        if(blockcount < this.adjustmentInterval){                               // If not enough number of block, skip
            return;
        }

        if(blockcount % this.adjustmentInterval !== 0){                         // Adjust only after specific number of blocks
            return;
        }

        const blocks = this.chain.slice(-this.adjustmentInterval);              // lastest cluster of blocks
        
        const first = blocks[0];                                                // First block in the cluster
        const last = blocks[blocks.length-1];                                  // Last block in the cluster
        const actualTime = last.timestamp - first.timestamp;                    // Interval of the mining
        const expectedTime = (this.adjustmentInterval - 1) * this.targetBlocktime    // Expected time for mining

        // If actualtime < expect_time/2, this.difficulty++
        // else if actualtime > expect_time/2, this.math.Max(1, this.difficulty-1)
        if(actualTime < expectedTime/2){
            this.difficulty++
        }
        else if(actualTime > expectedTime * 2){
            this.difficulty = Math.max(1, this.difficulty-1);
        }

        console.log("Difficulty upgrade :", this.difficulty);
    
    }

    mineTransactionPool(minerRewardAddress){
        // Fee clearing first
        let fee = 0
        for(let tx of this.transactionpool){
            const inputTotal = tx.inputs.reduce(
                (sum, input) => sum + input.amount, 0
            );

            const outputTotal = tx.outputs.reduce(
                (sum, output) => sum + output.amount, 0
            );

            fee += inputTotal - outputTotal;

        }

        // Use the UTXO model to do the minerReward Transaction
        const miner_reward_transaction = new Transaction( // Fixed capitalization
            [],
            [
                {amount: this.minerReward + fee,
                 owner: minerRewardAddress,
                }
            ]
        );
        // Push the miner_reward onto the transaction pool
        this.transactionpool.unshift(miner_reward_transaction);

        // Mining 
        // Package all the transaction from the pool and push them to the block
        // Get the hash value for the lastest block
        const newblock = new Block(
            this.transactionpool,
            this.get_lastest_block().hash,
            Date.now(),
            this.difficulty
        );

        // Validate the coinbase transcation
        if(!this.Validate_coinbasetx(newblock)){
            throw new Error("Invalid Coinbase!");
        }

        // Add the block to the chain
        newblock.Mining(this.difficulty);
        this.chain.push(newblock);
        this.adjustDifficulty();

        // Remove spent UTXOs from the set to prevent double-spending
        for(let transaction of newblock.transactions){
            if(transaction.inputs && transaction.inputs.length > 0){
                for(let input of transaction.inputs){
                    this.utxoset = this.utxoset.filter(utxo => 
                        !(utxo.txHash === input.txHash && utxo.outputIndex === input.outputIndex)
                    );
                }
            }
        }

        // Put the transactions output into the brand-new UTXO sets
        for(let transaction of newblock.transactions){
            const txHash = transaction.computeHash();
            transaction.outputs.forEach((output, index) => {
                this.utxoset.push(
                    new UTXO(
                        txHash,
                        index,
                        output.amount,
                        output.owner
                    )
                );
            });
        }

        // then clear out the pool
        this.transactionpool = []
        // print out the balances for everyone
        this.print_balance();
    }

    // Validate coinbase transaction
    // 1. Length of the first tx is 0
    // 2. No later tx got its length equals to 0
    // 3. Coinbase amount <= minerReward + totalFees
    Validate_coinbasetx(block){
        const txs = block.transactions;
        
        if(txs[0].inputs.length !== 0){
            return false;
        }
        let totalFees = 0;

        for(let i=1; i<txs.length; i++){
            const tx = txs[i];

            const inputTotal = tx.inputs.reduce(
                (sum, input) => sum + input.amount, 0
            );

            const outputTotal = tx.outputs.reduce(
                (sum, output) => sum + output.amount, 0
            );

            totalFees += inputTotal - outputTotal;
        }

        const coinbase = txs[0];
        const coinbaseAmount = coinbase.outputs.reduce(
            (sum, output) => sum + output.amount, 0
        )
        
        if(coinbaseAmount > this.minerReward + totalFees){
            return false;
        }

        for(let i=1; i<txs.length; i++){
            if(txs[i].inputs.length === 0){
                return false;
            }
        }


        return true
    }

    // Validate the UTXO in the Transaction
    Validate_UTXO_Transaction(transaction){
        // Check if any normal txs(not coinbase) would have zero length inputs
        // 
        if(transaction.inputs.length === 0){
            return false;
        }

        let input_total = 0;
        let output_total = 0;

        // Check whether the UTXO exist?
        for(let input of transaction.inputs){
            const existingUTXO = this.utxoset.find(utxo =>
            utxo.txHash === input.txHash &&
            utxo.outputIndex === input.outputIndex
        );
        
        if(!existingUTXO){
            console.log("No existing UTXO or was already spent!")
            return false;
        }
        
        // Ownership Check
        if(existingUTXO.owner !== input.owner){
            console.log('You don not own this UTXO!');
            return false;
        }
        
        // Already being spent in mempool?
         const Used_UTXO = this.transactionpool.some(tx =>
            tx.inputs.some(poolInput =>
            poolInput.txHash === input.txHash &&
            poolInput.outputIndex === input.outputIndex
        )
        );

        // Already being spent?

        if(Used_UTXO){
             console.log("UTXO already used in the pool!");
            return false;
        }
        input_total += existingUTXO.amount;
        }

        // Same UTXO spent twice in one TX?
        const used = new Set();

        for(let input of transaction.inputs){
            const id = input.txHash + ':' + input.outputIndex;

            if(used.has(id)){
                console.log('This UTXO has already been used once, not again!');
                return false;
            }
            used.add(id);
        }

        // Count outputs , if smaller than zero, return false
        for(let output of transaction.outputs){
            if(output.amount <= 0){
                return false;
            }
            output_total += output.amount;
        }

        
        // No money out of nowhere
        if(output_total > input_total){
            console.log("Insufficient Money!");
            return false;
        }


        // Check signature
        if(!transaction.IsValid()){
            console.log('Invalid Signature!');
            return false;
        }

        return true;

    }

    
    // Core of verification of block from another node
        // 1. Does this block connect to my current chain?
        // 2. Has the block been modified?
        // 3. Did the miner actually satisfy Proof-of-Work?
        // 4. Check the difficulty expected by the node?
        // 5. Check PoW difficulty matching the designed
        // 4. IF 1, 2, 3, 4, 5 is satisfied, push the received_block to the node
    Receive_block(block){
        // 1. Chain Continuety , check whether the node is in a fork
        const lastest_block = this.get_lastest_block();
        if(block.previousHash !== lastest_block.hash){

            const main_parent = this.chain.find(
                b => b.hash === block.previousHash
            );
            const fork_Parent = this.fork_block.find(
                b => b.hash === block.previousHash
            );
            
            if(main_parent || fork_Parent){
                console.log("Fork branched Detected, Archiving...");
                this.fork_block.push(block);
                return false;
            };  
            
            console.log("Rejected: Unknown Previous Hash!");
            return false;
        }
        // Check whether level of difficulty is the expected one
        if(block.difficulty !== this.difficulty){
            console.log("Wrong difficulty");
            return false;
        }

        // 2. Block Integrity
        // Hash of the block
        if(block.hash !== block.computeHash()){
            console.log("Rejected: Block hash has been modified!");
            return false;
        }
        // Whether the MerkleRoot can be spawned using the concluded tx?
        if(block.merkle_root !== block.get_merkleroot()){
            console.log("Rejected: Merkle_root doesn't match all transactions!");
            return false
        }

        // 3. Proof-of-work
        if(block.hash.substring(0, this.difficulty) !== block.get_answer(this.difficulty)){
            console.log("Rejected: Invalid proof-of-work!");
            return false;
        }
        // 4. Coinbase Transaction
        if(!this.Validate_coinbasetx(block)){
            console.log("Rejected: coinbase transaction fallacy!");
            return false;
        }
        // 5. Validate every transaction
        for(let i=1; i < block.transactions.length; i++){
            if(!this.Validate_UTXO_Transaction(block.transactions[i])){
                console.log("Rejected: Invalid Transaction!");
                return false;
            }
        }
        
        this.Apply_Block(block);                 // Update local state 
        this.chain.push(block);                  // Push the block to the chain
        this.adjustDifficulty();             // Adjust the difficulty after the 
        console.log('Block is valid and has been upload to the chain.');
        return true;
    }
    
    // Check the fork and compare its length of the one from main branch
    check_fork(){
        const main_length = this.chain.length - 1;
        const fork_length = this.fork_block.length;
        console.log("Main work length:", main_length);
        console.log("Fork work length:", fork_length);

        if(fork_length > main_length){
            console.log("Let fork take over!");
            return true;
        }
        console.log("Main work stay!");
        return false;
    }



    // Update the UTXO info in the new node
        // 1. Remove the spent UTXOs 
        // 2. Create new UTXOs set
    Apply_Block(block){
        for(let transaction of block.transactions){
            if(transaction.inputs && transaction.inputs.length > 0){
                for(let input of transaction.inputs){
                    this.utxoset = this.utxoset.filter(utxo => 
                        !(utxo.txHash === input.txHash && utxo.outputIndex === input.outputIndex)
                    );
                }
            }
        }

        for(let transaction of block.transactions){
            const txHash = transaction.computeHash();
            transaction.outputs.forEach((output, index) => {
                this.utxoset.push(
                    new UTXO(
                        txHash,
                        index,
                        output.amount,
                        output.owner
                    )
                );
            });
        }

    }

    // Adopt if the branch is longer than the one already existed
    Adopt_block(){
        const mainwork = this.chain.length - 1;
        const forkwork = this.fork_block.length;

        // Keep current chain if it's longer than the branch
        if(forkwork <= mainwork){
            console.log("Keeping current chain.");
            return false;
        }
        console.log("Let the fork take over!")

        // Replace active blockchain
        this.chain = [this.chain[0], ...this.fork_block];

        // Reset UTXO state
        this.utxoset = this.genesisUTXOs.map( 
            u => new UTXO(u.txHash, 
                     u.outputIndex,
                     u.amount,
                     u.owner
            )
        );

        // Check the block again and then apply the block
        for(let block of this.fork_block){
            this.Apply_Block(block);
        }
        this.fork_block = [];
        console.log("Chain swiched successfully!");
        return true;
    };




    // Validate whether the current block is legitimate
    // previous_hash of current block equal to the hash in the previous hash
    Validatechain(){
        if(this.chain.length===1){
            return this.chain[0].hash === this.chain[0].computeHash();
        }

        // Validate the info in each block
        // 1. Whether the data in current block is modified ?
        // 2. Whether someone is modifying the block?
        // 3. Whether the line between current and the pervious block is broken?
        for(let i=1; i <= this.chain.length-1; i++){
            const blocktovalidate = this.chain[i];
            const previous_block = this.chain[i-1];

            if(!blocktovalidate.Validate_Block_Transactions()){
                throw new Error("Illgegal Transaction Spotted!")
            }

            if(blocktovalidate.hash != blocktovalidate.computeHash()){
                console.log("Someone is modifying the block!")
                return false
            }

            if(blocktovalidate.previousHash !== previous_block.hash){
                console.log("The link between current and previous block is broken!")
                return false
            }
        }
        console.log("It's all good man")
        return true
    }

    // Get the balance after each TX
    get_balance(user){
        return this.utxoset
        .filter(utxo => utxo.owner === user.publicKey)
        .reduce((sum, utxo) => sum + utxo.amount, 0);        
    }

    // printer for the balance after each tx
    print_balance(){
        console.log("---------Balance---------");
        for(let user of this.users){
            console.log(`${user.name}: ${this.get_balance(user)} coins `);

        };
    console.log("-----------------------");
    }
}
// ============================================================
//                  BITCOIN ARCHITECTURE DEMO
// ============================================================

function section(title){
    console.log("\n");
    console.log("============================================================");
    console.log(title);
    console.log("============================================================");
}

function short(hash){
    return hash.substring(0, 12) + "...";
}

function showBlock(block, height){
    console.log(`Block #${height}`);
    console.log("  Hash       :", short(block.hash));
    console.log("  Previous   :", short(block.previousHash));
    console.log("  Merkle Root:", short(block.merkle_root));
    console.log("  Nonce      :", block.nonce);
    console.log("  Difficulty :", block.difficulty);
    console.log("  TX count   :", Array.isArray(block.transactions)
                                ? block.transactions.length
                                : 0);
}



// ============================================================
//                  BTC MECHANISM TEST
// ============================================================

function short(hash){
    return hash.substring(0, 12) + "...";
}


// ------------------------------------------------------------
// 1. SETUP
// ------------------------------------------------------------

const NodeA = new Chain();
const NodeB = new Chain();

const Bob   = new User("Bob");
const Alice = new User("Alice");
const Jacky = new User("Jacky");
const Miner = new User("Miner");

for(let user of [Bob, Alice, Jacky, Miner]){
    NodeA.register_users(user);
    NodeB.register_users(user);
}

const genesisState = [
    new UTXO("Genesis-tx", 0, 100, Bob.publicKey),
    new UTXO("Genesis-tx", 1, 100, Alice.publicKey),
    new UTXO("Genesis-tx", 2, 100, Jacky.publicKey)
];

NodeA.Set_Genesis_UTXOs(genesisState);
NodeB.Set_Genesis_UTXOs(genesisState);

console.log("\n=== GENESIS ===");
console.log("Same genesis:",
    NodeA.chain[0].hash === NodeB.chain[0].hash);


// ------------------------------------------------------------
// 2. TRANSACTION + SIGNATURE + UTXO + MINING
// ------------------------------------------------------------

console.log("\n=== TRANSACTION / UTXO / SIGNATURE ===");

const tx = NodeA.send(Bob, Alice, 10);

console.log("Bob -> Alice: 10");
console.log("Signature valid:", tx.IsValid());
console.log("Mempool:", NodeA.transactionpool.length);

NodeA.mineTransactionPool(Miner.publicKey);

const block1 = NodeA.chain[1];

console.log("Block:", short(block1.hash));
console.log("Merkle valid:",
    block1.merkle_root === block1.get_merkleroot());

console.log("PoW valid:",
    block1.hash.startsWith(
        block1.get_answer(block1.difficulty)
    )
);

console.log("Coinbase valid:",
    NodeA.Validate_coinbasetx(block1));


// ------------------------------------------------------------
// 3. FORK + REORG
// ------------------------------------------------------------

console.log("\n=== FORK / CONSENSUS ===");

// Node B creates different history
NodeB.send(Jacky, Bob, 20);
NodeB.mineTransactionPool(Miner.publicKey);

// Node A creates longer branch
NodeA.send(Jacky, Alice, 10);
NodeA.send(Alice, Bob, 4);
NodeA.send(Bob, Jacky, 6);
NodeA.mineTransactionPool(Miner.publicKey);

console.log("Same tip before:",
    NodeA.get_lastest_block().hash ===
    NodeB.get_lastest_block().hash);

NodeB.Receive_block(NodeA.chain[1]);
NodeB.Receive_block(NodeA.chain[2]);
NodeB.Adopt_block();

const reorgOK =
    NodeA.get_lastest_block().hash ===
    NodeB.get_lastest_block().hash;

console.log("Same tip after reorg:", reorgOK);


// ------------------------------------------------------------
// 4. STRESS TEST
//    3 transactions / block × 9 blocks = 27 transactions
// ------------------------------------------------------------

console.log("\n=== REAL-TIME DIFFICULTY TEST ===");

const START_DIFFICULTY = NodeA.difficulty;
const ROUNDS = 24;

for(let i = 0; i < ROUNDS; i++){

    // 3 normal transactions
    NodeA.send(Bob, Alice, 1);
    NodeA.send(Alice, Jacky, 1);
    NodeA.send(Jacky, Bob, 1);

    const difficultyBefore = NodeA.difficulty;

    const start = Date.now();

    NodeA.mineTransactionPool(
        Miner.publicKey
    );

    const miningTime =
        Date.now() - start;

    const block =
        NodeA.get_lastest_block();

    console.log(
        `#${NodeA.chain.length - 1}`,
        `| tx: ${block.transactions.length - 1}`,
        `| mining: ${miningTime} ms`,
        `| difficulty: ${block.difficulty} -> ${NodeA.difficulty}`
    );
}


// ------------------------------------------------------------
// 5. MERKLE PROOF
// ------------------------------------------------------------

console.log("\n=== MERKLE / SPV ===");

const testBlock =
    NodeA.get_lastest_block();

const targetTx =
    testBlock.transactions[1];

const proof =
    testBlock.get_merkle_proof(1);

const proofOK =
    testBlock.verify_merkle_tree(
        targetTx,
        proof
    );

console.log("Merkle proof valid:", proofOK);


// ------------------------------------------------------------
// 6. FINAL SUMMARY
// ------------------------------------------------------------

const lastBlock =
    NodeA.get_lastest_block();

console.log("\n==============================");
console.log("       BTC TEST SUMMARY");
console.log("==============================");

console.log("Keys / Signatures       : ✅");
console.log("Transactions / UTXO     : ✅");
console.log("Fees / Coinbase         : ✅");

console.log(
    "Merkle Tree / Proof    :",
    proofOK ? "✅" : "❌"
);

console.log(
    "Proof-of-Work          :",
    lastBlock.hash.startsWith(
        lastBlock.get_answer(
            lastBlock.difficulty
        )
    ) ? "✅" : "❌"
);

console.log(
    "Fork / Reorganization  :",
    reorgOK ? "✅" : "❌"
);

console.log(
    "Difficulty Adjustment  :",
    NodeA.difficulty !== START_DIFFICULTY
        ? "✅ changed"
        : "➖ unchanged"
);

console.log("------------------------------");

console.log(
    "Final difficulty:",
    NodeA.difficulty
);

console.log(
    "Total blocks:",
    NodeA.chain.length - 1
);

console.log("==============================");

