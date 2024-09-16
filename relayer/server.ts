import express from 'express'
import cors from 'cors'
import { auth, executeTx, getAddress } from './index.js';

const PORT = process.env.PORT || 4000
const app = express();

const corsOptions = {
    origin: ['http://localhost:3001'],
};
  
app.use(cors(corsOptions));
app.use(express.json())

const ethAuthProofmiddleware = async (req: any, res: any, next: any) => {
    try{
        if(await auth(req.body.address, req.body.ethAuthProofString)){
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
})