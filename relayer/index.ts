import * as dotenv from "dotenv";
import { ethers } from 'ethers'
import { sequence } from '0xsequence'
import { RpcRelayer } from '@0xsequence/relayer'
import { Wallet } from '@0xsequence/wallet'
import { SequenceIndexerClient } from '@0xsequence/indexer'

import { JSONFilePreset } from 'lowdb/node'

// Read or create db.json
const defaultData = { }

// pnpm i @automerge/automerge-repo @automerge/automerge-repo-network-broadcastchannel @automerge/automerge-repo-network-websocket
dotenv.config(); // pass the environment variables into the process

const serverPrivateKey = process.env!.pkey!

// Get a provider
const provider = new ethers.providers.JsonRpcProvider('https://nodes.sequence.app/amoy')

// Create your server EOA
const walletEOA = new ethers.Wallet(serverPrivateKey, provider)

// Create your rpc relayer instance with relayer node you want to use
const relayer = new RpcRelayer({url: 'https://amoy-relayer.sequence.app', provider: provider})

const getAddress = async () => {
    const wallet = (await Wallet.singleOwner(walletEOA)).connect(provider, relayer)
    return await wallet.getAddress()
}

const getBalance = async () => {
    const indexer = new SequenceIndexerClient('https://amoy-indexer.sequence.app')

    // gets the native token balance
    const balance = await indexer.getEtherBalance({
        accountAddress: await getAddress(),
    })
        
    return balance.balance.balanceWei
}

const auth = async (sequenceWalletAddress: string, ethAuthProofString: string) => {

    const chainId = 'amoy'
    const walletAddress = sequenceWalletAddress

    const api = new sequence.api.SequenceAPIClient('https://api.sequence.app')

    const { isValid }: any = await api.isValidETHAuthProof({
        chainId, walletAddress, ethAuthProofString
    })

    console.log(isValid)

    if(!isValid) throw new Error('invalid wallet auth')

    return isValid

}

const getBlockNumber = async (): Promise<number> => {
	const blockNumber = await provider.getBlockNumber()
	return blockNumber
}

const wait = (ms: any) => new Promise((res) => setTimeout(res, ms))

const executeTx = async (ethAuthProofString: string, address: string) => {
    // Initialize the database
    const db: any = await JSONFilePreset('db.json', defaultData);

    // Wallet address and new block number to add
    const walletAddress = address;

try {
    // Create the Sequence server wallet
    const wallet = (await Wallet.singleOwner(walletEOA)).connect(provider, relayer);

    const erc20TokenAddress = '0xdd90126856957aa1e9c5cc3395e866b6eb830a44';
    const erc20Interface = new ethers.utils.Interface([
        'function mint(address to, uint256 amount) returns ()'
    ]);

    const blocksPerToken = 50;
    const lastBlock = await getBlockNumber();
    const newBlockNumber = lastBlock;

    // Read the current data
    await db.read();
    
    // Check if the wallet address exists, if not, initialize it
    if (!db.data[walletAddress]) {
        db.data[walletAddress] = [];  // Initialize with an empty array
    }
    
    // Add the new block number to the wallet's block list
    db.data[walletAddress].push(newBlockNumber);
    
    // Write the updated data to db.json
    await db.write();

    const randomValue = Math.floor(Math.random() * 4);
    const blocks = db.data[walletAddress];

    let lastSavedBlock;

    if (blocks && blocks.length > 0) {
        lastSavedBlock = blocks[blocks.length - 2]; // Get the last block number
        console.log(`Last block number for ${walletAddress}:`, lastSavedBlock);
    } else {
        console.log(`No blocks found for ${walletAddress}`);
    }

    const blocksSinceLastMint = lastBlock - lastSavedBlock;

    const tokensToMint = Math.floor(
        Math.min(
            blocksSinceLastMint / blocksPerToken + (blocksSinceLastMint / blocksPerToken) * randomValue, 
            1000
        )
    );

    console.log("tokensToMint", tokensToMint);

    const data = erc20Interface.encodeFunctionData('mint', [address, tokensToMint]);

    // Send the transaction here using the wallet, e.g. wallet.sendTransaction(...)
        const txn = {
            to: erc20TokenAddress,
            data
        }

        // Request the possible fee options the relayer will accept for this transaction
        const [config, context] = await Promise.all([wallet.getWalletConfig(), wallet.getWalletContext()])
        const { options, quote } = await relayer.getFeeOptions(config[0], context, txn /* , txn2, txn3, etc... */)
        // Choose a fee from the list of options returned by the relayer
        // MATIC is native to Polygon and needs to be handled differently than other ERC-20 tokens like USDC
        // === To pay the fee in native MATIC: ===
        const option = options.find(option => option.token.symbol === 'MATIC')
        console.log(options)

        if (!option) {
            
            console.log('sending the tx without a fee...')

            // Send your transaction with the fee and quote to the relayer for dispatch
            const txnResponse = await wallet.sendTransaction(txn)
            console.log(txnResponse)

            // Wait for transaction to be mined
            const txnReceipt = await txnResponse.wait()

            // Check if transaction was successful 
            if (txnReceipt.status != 1) {
                console.log(`Unexpected status: ${txnReceipt.status}`)
                throw new Error(`Unexpected status: ${txnReceipt.status}`)
            }

            return { transactionHash: txnReceipt.transactionHash }
            // return { transactionHash: 'txnReceipt.transactionHash' }
        } else { // to be used for mainnet / polygon
            console.log('sending the tx with a fee...')

            // Craft the MATIC fee payment transaction
            // revertOnError: true is required for fee payments
            const feeTxn = {
                to: option.to,
                value: option.value,
                gasLimit: option.gasLimit,
                revertOnError: true
            }
            // === MATIC fee ===

            // Send your transaction with the fee and quote to the relayer for dispatch
            const txnResponse = await wallet.sendTransaction([txn, feeTxn], undefined, undefined, quote)
            console.log(txnResponse)

            // Wait for transaction to be mined
            const txnReceipt = await txnResponse.wait()

            // Check if transaction was successful 
            if (txnReceipt.status != 1) {
                console.log(`Unexpected status: ${txnReceipt.status}`)
                throw new Error(`Unexpected status: ${txnReceipt.status}`)
            }

            return { transactionHash: txnReceipt.transactionHash }
        }
    }catch(e: any){
        console.log(e)
        throw new Error(e)
    }
}

export {
    auth,
    getAddress,
    getBalance,
    executeTx
}