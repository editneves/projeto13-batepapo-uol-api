import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from 'dotenv'

dotenv.config()

const mongoClient = new MongoClient(process.env.DATABASE_URL)

let db; 
 
try {
    await mongoClient.connect()
    const db = mongoClient.db() 

} catch (error) {
    console.log('Deu erro no app')
}

const app = express()
app.use(express.json())
app.use(cors())


app.post("/participants", async (req, res) => {
    console.log(db)
    const { name } = req.body

    try { 

        const participante = await db.collection("participants").findOne({ name })

        if (participante) return res.status(409).send("Esse nome já está cadastrado!")

        await db.collection("participants").insertOne({ name })

        res.send("ok")

    } catch (err) {

        console.log(err)
        res.status(422).send("O nome não foi salvo!") 

    }
})



const PORT = 5000;
app.listen(PORT, () => console.log(`servidor rodando na porta${PORT}`))
