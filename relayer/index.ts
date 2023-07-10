import * as dotenv from "dotenv";
import { ethers } from 'ethers'
import { sequence } from '0xsequence'
import { RpcRelayer } from '@0xsequence/relayer'
import { Wallet } from '@0xsequence/wallet'
import { SequenceIndexerClient } from '@0xsequence/indexer'

dotenv.config(); // pass the environment variables into the process

const serverPrivateKey = process.env!.pkey!

// Get a provider
const provider = new ethers.providers.JsonRpcProvider('https://nodes.sequence.app/mumbai')

// Create your server EOA
const walletEOA = new ethers.Wallet(serverPrivateKey, provider)

// Create your rpc relayer instance with relayer node you want to use
const relayer = new RpcRelayer({url: 'https://mumbai-relayer.sequence.app', provider: provider})

const getAddress = async () => {
    const wallet = (await Wallet.singleOwner(walletEOA)).connect(provider, relayer)
    return await wallet.getAddress()
}

const getBalance = async () => {
    const indexer = new SequenceIndexerClient('https://mumbai-indexer.sequence.app')

    // gets the native token balance
    const balance = await indexer.getEtherBalance({
        accountAddress: await getAddress(),
    })
        
    return balance.balance.balanceWei
}

const auth = async (sequenceWalletAddress: string, ethAuthProofString: string) => {

    const chainId = 'mumbai'
    const walletAddress = sequenceWalletAddress

    const api = new sequence.api.SequenceAPIClient('https://api.sequence.app')
    
    const { isValid } = await api.isValidETHAuthProof({
        chainId, walletAddress, ethAuthProofString
    })

    console.log(isValid)

    if(!isValid) throw new Error('invalid wallet auth')

    return isValid

}

const executeTx = async (ethAuthProofString: string, address: string) => {
    
    try{

        // Create your Sequence server wallet, controlled by your server EOA, and connect it to the relayer
        const wallet = (await Wallet.singleOwner(walletEOA)).connect(provider, relayer)

        const erc20TokenAddress = '0xb70d525c171072d21f7f89f65836f22daba1cd57'

        // Craft your transaction
        const erc20Interface = new ethers.utils.Interface([
            'function earn(address recipient_) external'
        ])
    

        const data = erc20Interface.encodeFunctionData(
            'earn', [address]
        )
    
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