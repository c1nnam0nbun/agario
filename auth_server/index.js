const express = require('express')
const app = express()

const cors = require("cors")
const bodyParser = require("body-parser")

app.use(
    cors(), 
    bodyParser.json()
)

const PORT = 16001

const uuid = require('uuid')
const axios = require('axios').default
const players = {}

const baseApi = "http://localhost:16002"
const getRoomIdEndpoint = baseApi + "/available"
const removePlayerEndpoint = baseApi + "/removePlayer/"

const WebSocket = require('ws').WebSocket
const ws = new WebSocket("ws://localhost:16000")

app.post("/connect", async (req, res) => {
    const id = uuid.v4()
    const username = req.body.username
    players[id] = username
    const roomId = (await axios.get(getRoomIdEndpoint)).data
    res.send(JSON.stringify({id, roomId}))
})

app.post("/disconnect", (req) => {
    const {socketId, roomId} = req.body
    delete players[socketId]
    ws.send(JSON.stringify({ type: "close", id: socketId, roomId }));
    axios.delete(removePlayerEndpoint + roomId).catch(_ => {})
})

app.listen(PORT)