import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import { auth, executeTx, getAddress, getBalance } from '.';

const PORT = process.env.PORT || 4000
const app = express();

const corsOptions = {
    origin: ['http://localhost:3000'],
};
  
app.use(cors(corsOptions));
app.use(bodyParser.json())

const ethAuthProofmiddleware = async (req, res, next) => {
    try{
        if(await auth(req.body.wallet, req.body.ethAuthProofString)){
            next()
        } else {
            throw Error('Not Authorized')
        }
    }catch(e){
        res.send({msg: e, status: 500})
    }
};

app.use('/transaction', ethAuthProofmiddleware);

app.post('/transaction', async (req: any, res: any) => {
    try{
        const tx = await executeTx(
                            req.body.ethAuthProofString,
                            req.body.address
                        )

        res.send({tx: tx, status: 200})
    }catch(e){
        res.send({msg: e, status: 500})
    }
})

app.listen(PORT, async () => {
    console.log(`listening on port: ${PORT}`)
    console.log(`relaying from this sequence wallet: ${await getAddress()}`)
    
    const balance = await getBalance();
    
    if(Number(balance) == 0)
        console.log(`please top up with the native token, your current balance is ${balance}`)
})