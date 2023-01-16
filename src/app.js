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

const participantsBodySchema = joi.object({
    name: joi.string().required(),
});



app.post("/participants", async (req, res) => {
    const { name } = req.body;
    const validation = participantsBodySchema.validate(name, { abortEarly: true });
    if (validation.error) {
        return res.sendStatus(422)
    }
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
    const validation = messageBodySchema.validate(messageBody, { abortEarly: true });
    if (validation.error) {
        return res.sendStatus(422)
    }
    const validationt = headerSchema.validate(user, { abortEarly: true });
    if (validationt.error) {
        return res.sendStatus(422)
    }
    const newUser = await db.collection("participants").findOne({ name: user });
    if (!newUser) {
        return res.sendStatus(422)
    }
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
    const  id  = req.body.id;

    if (limit === 0 || limit < 0) {
        return res.sendStatus(422);
    }
    if (limit) {
        try {
            if (user != messageBody.to) {
                const del = await db.collection('messages').deleteOne({to: 'private_message'});
                //const del = await db.collection('messages').deleteOne({ _id: messages._id  });
                console.log("entrei", del )
            }
            const buscarMessages = await db.collection("messages").find({ from: user, to: user, to: 'Todos' }).toArray();
            const listMessages = buscarMessages.reverse().slice(0, limit)
            return res.send(listMessages);
        } catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
    }

});

app.post("/status", async (req, res) => {
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
    try {
        const now = dayjs();
        const seconds = now.valueOf() - 10000;
        const userInactive = await db.collection("participants").find({ lastStatus: seconds }).toArray();
        if (userInactive.length > 0) {
            userInactive.map(async (inactive) => {
                const userInactive = await db.collection("participants").find({ lastStatus: seconds }).toArray();
                if (userInactive.lastStatus > seconds) {
                    await db.collection('participants').deleteOne({ _id: inactive._id });
                    await db.collection("messages").insertOne({ from: inactive.name, to: "Todos", text: "sai da sala...", type: "status", time: now.format('HH:mm:ss') })


                }
            })
        }
    } catch (error) {
        console.error(error);
    }
}, 15000);

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`))