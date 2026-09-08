const sha256  = require('crypto-js/sha256')  // sha256 algorithm
const eclib = require('elliptic').ec         // Elliptic class
const ec = new eclib('secp256k1')       // Library for public key and private key

// Construct the block
// Block = data + previous_hash + time_stamp + nonce(random number) + self_hash
// computeHash()
// Validate_BLock_Transactions()
// Mining(difficulty){}

class Block{
    constructor(transactions, previousHash){
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.nonce = 1;
        this.timestamp = Date.now();
        this.hash = this.computeHash();
    }

    // Compute the Hash value for current block
    computeHash(){
        // Transaction has to be string rather than numerical expression
        return sha256(JSON.stringify(this.transactions) + this.previousHash + this.nonce + this.timestamp).toString()
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
        this.utxoset = [];
        this.users = [];
    }

    // Register all users
    register_users(user){
        this.users.push(user);
    }

    // Define the Genisis Block
    OG_block(){
        const genesisBlock = new Block("I am the Genesis Block!", '')
        return genesisBlock
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



    // Pick enougth UTXOs that belongs to one user
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
        new_block.Mining(this.difficulty)
        this.chain.push(new_block) 
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
        this.transactionpool.push(miner_reward_transaction)

        // Mining 
        // Package all the transaction from the pool and push them to the block
        // Get the hash value for the lastest block
        const newblock = new Block(
            this.transactionpool,
            this.get_lastest_block().hash
        );
        newblock.Mining(this.difficulty)

        // Add the block to the chain
        this.chain.push(newblock)

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

    // Validate the UTXO in the Transaction
    Validate_UTXO_Transaction(transaction){
        // Coinbase Transaction
        // If the input == 0, accept it immediately
        if(transaction.inputs.length === 0){
            return true;
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


// Forge the coin
const ghostcoin = new Chain();


// Generate Users and miner
const Bob = new User("Bob")
const Alice = new User("Alice")
const Jacky = new User("Jacky")
const Miner = new User("Miner")

// Register everybody on the chain
ghostcoin.register_users(Bob);
ghostcoin.register_users(Alice);
ghostcoin.register_users(Jacky);
ghostcoin.register_users(Miner);


// Bob starts with one UTXO worth 100
const B_UTXO = new UTXO(
    "Genesis-tx",
    0,
    100,
    Bob.publicKey
);

const A_UTXO = new UTXO(
    "Genesis-tx",
    1,
    100,
    Alice.publicKey
);

const J_UTXO = new UTXO(
    "Genesis-tx",
    2,
    100,
    Jacky.publicKey
);


ghostcoin.utxoset.push(B_UTXO);
ghostcoin.utxoset.push(A_UTXO);
ghostcoin.utxoset.push(J_UTXO);


// Bob spend his 100 UTXO
// Input: 100 Bob's UTXO
// Output: 30 -> Alice
//         70 -> Bob

ghostcoin.send(Bob, Alice, 30);
ghostcoin.send(Jacky, Alice, 20);


// Call the miner to do the mining
ghostcoin.mineTransactionPool(Miner.publicKey);

// Second round of the transaction
ghostcoin.send(Alice, Jacky, 120);
ghostcoin.mineTransactionPool(Miner.publicKey);

ghostcoin.send(Jacky, Bob, 180);
ghostcoin.mineTransactionPool(Miner.publicKey);

console.log('UTXO Set:', ghostcoin.utxoset);
console.log(ghostcoin.chain);
console.log(ghostcoin.chain[1].transactions);
console.log(ghostcoin.chain[2].transactions);


