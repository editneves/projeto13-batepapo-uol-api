import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from 'dotenv'
import joi from "joi";
import dayjs from "dayjs";

dotenv.config()
const app = express()
app.use(express.json())
app.use(cors())
const PORT = 5000;


const mongoClient = new MongoClient(process.env.DATABASE_URL)
let db;

await mongoClient.connect()
db = mongoClient.db()
console.log("Conectado ao banco de dados")


const messageBodySchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid('message', 'private_message').required(),
});
const headerSchema = joi.string().required();


app.post("/participants", async (req, res) => {
    console.log("entrou")
    const { name } = req.body;
    const participante = await db.collection("participants").findOne(req.body)

    if (participante) {
        return res.sendStatus(409);
    }

    const now = dayjs();
    try {
        await db.collection('participants').insertOne({ ...req.body, lastStatus: now.valueOf() });
        await db.collection('messages').insertOne({ from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: now.format('HH:mm:ss') });
        return res.sendStatus(201);

    } catch (err) {

        console.log(err)
        return res.sendStatus(500)

    }
})

app.get("/participants", async (req, res) => {

    try {
        const listParticipants = await db.collection("participants").find({}).toArray();
        return res.send(listParticipants);

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
});

app.post("/messages", async (req, res) => {

    const user = req.headers.user;
    const messageBody = req.body;
    const newUser = await db.collection("participants").findOne({ name: user });

    // if (validation.error) {
    //     const errors = validation.error.details.map((detail) => detail.message);
    //     return res.status(422).send(errors);
    // }
    // const validation = messageBodySchema.validate(messageBody, { abortEarly: false });

    const now = dayjs();
    if (newUser) {
        try {
            await db.collection('messages').insertOne({ ...req.body, from: user, time: now.format('HH:mm:ss') });
            return res.sendStatus(201);
        } catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
    }
})
app.get("/messages", async (req, res) => {
    const user = req.headers.user;
    const limit = parseInt(req.query.limit);
    const messageBody = req.body

    try {
        const buscarMessages = await db.collection("messages").find({ from: user, to: user, to: 'Todos' }).toArray();
        const listMessages = buscarMessages.reverse().slice(0, limit)
        return res.send(listMessages);

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }


});


app.post("/status", async (req, res) => {
    console.log("entrou status")
    const user = req.headers.user;
    const { name } = req.body;
    const participante = await db.collection("participants").findOne({ name: user })
    if (!participante) {
        return res.sendStatus(404);
    }
    const now = dayjs();
    if (participante) {
        try {
            await db.collection('participants').insertOne({ ...req.body, lastStatus: now.valueOf() });
            return res.sendStatus(200);
        } catch (err) {
            console.log(err)
            return res.sendStatus(500)

        }
    }
})

setInterval(async () => {
    console.log("inativo")
    try {
        const now = dayjs();
        const seconds = Date.now() - 10000;
        console.log("inativo", seconds)
        const userInactive = await db.collection("participants").find({ lastStatus: seconds }).toArray();
        if (userInactive.length > 0) {
            console.log("in", 1)
            userInactive.map(async (inactive) => {
                console.log("in", 1)
                //await db.collection('participants').deleteOne({_id: inactive.id  } );
                await db.collection("participants").deleteMany({ laststatus: seconds });
                console.log("in", inactive.id)
                await db.collection("messages").insertOne({ from: inactive.name, to: "Todos", text: "sai da sala...", type: "status", time: now.format('HH:mm:ss') })
            })
        }
    } catch (error) {
        console.error(error);
    }
}, 5000);


app.listen(PORT, () => console.log(`servidor rodando na porta ${PORT}`))