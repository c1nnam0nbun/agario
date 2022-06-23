const express = require('express')
const app = express()

const cors = require("cors")
const bodyParser = require("body-parser")

app.use(
    cors(), 
    bodyParser.json()
)

const PORT = 16002

const uuid = require('uuid')

const maxRooms = 1;
const maxPlayers = 100;
const rooms = {};

const maxFoodCount = 40000;

const worldWidth = 10000;
const worldHeight = 10000;

const chunkCount = 8;
const chunkWidth = worldWidth / chunkCount;
const chunkHeight = worldHeight / chunkCount;

app.get("/available", (_, res) => {
    let roomId
    for (const [id, playerCount] of Object.entries(rooms)) {
        if (playerCount < maxPlayers) {
            roomId = id
            break
        }
    }
    if (!roomId && Object.entries(rooms).length < maxRooms) {
        roomId = uuid.v4()
        rooms[roomId] = 0
    }
    res.send(JSON.stringify(roomId))
})

app.get("/room/:id", (req, res) => {
    res.send(JSON.stringify(initRoom(req.params.id)))
    rooms[req.params.id]++
})

app.get("/reset/:id", (req, res) => {
    res.send(JSON.stringify(initRoom(req.params.id)))
})


app.delete("/removePlayer/:roomId", (req, _) => {
    if (rooms[req.params.roomId]) rooms[req.params.roomId]--
})

function initRoom(roomId) {
    const date = new Date();
    const room = {
        id: roomId,
        playerCount: 0,
        foodCount: 0,
        chunks: [],
        startTime: date.getTime(),
        gameOver: false,
    };

    const food = [];

    for (let j = 0; j < maxFoodCount; j++) {
        const x = Math.random() * worldWidth * 2 - worldWidth;
        const y = Math.random() * worldHeight * 2 - worldHeight;
        room.foodCount++;
        food.push({
            x,
            y,
            r: 10,
            color: {
                r: Math.floor(Math.random() * 255),
                g: Math.floor(Math.random() * 255),
                b: Math.floor(Math.random() * 255),
            },
        });
    }

    let id = 0;
    for (let x = 0; x < chunkCount * 2; x++) {
        for (let y = 0; y < chunkCount * 2; y++) {
            let chunk = {
                id: id++,
                position: {
                    x: 0,
                    y: 0,
                },
                players: [],
                food: [],
                neighbours: [],
            };

            chunk.position.x = -worldWidth + x * chunkWidth;
            chunk.position.y = -worldHeight + y * chunkHeight;

            food
                .filter((f) => {
                    return chunkContainsPoint(f, chunk);
                })
                .forEach((f) => chunk.food.push(f));
            room.chunks.push(chunk);
        }
    }

    for (let x = 0; x < chunkCount * 2; x++) {
        for (let y = 0; y < chunkCount * 2; y++) {
            let i = y + x * chunkCount * 2;

            if (x > 0) {
                room.chunks[i].neighbours.push(i - chunkCount * 2);
            }
            if (x < chunkCount * 2 - 1) {
                room.chunks[i].neighbours.push(i + chunkCount * 2);
            }
            if (y > 0) {
                room.chunks[i].neighbours.push(i - 1);
                if (x > 0) room.chunks[i].neighbours.push(i - chunkCount * 2 - 1);
                if (x < chunkCount * 2 - 1)
                    room.chunks[i].neighbours.push(i + chunkCount * 2 - 1);
            }
            if (y < chunkCount * 2 - 1) {
                room.chunks[i].neighbours.push(i + 1);
                if (x > 0) room.chunks[i].neighbours.push(i - chunkCount * 2 + 1);
                if (x < chunkCount * 2 - 1)
                    room.chunks[i].neighbours.push(i + chunkCount * 2 + 1);
            }
        }
    }
    rooms[roomId] = room.playerCount
    return room
}

app.listen(PORT)

function chunkContainsPoint(point, chunk) {
	return (
		point.x >= chunk.position.x &&
		point.y >= chunk.position.y &&
		point.x <= chunk.position.x + chunkWidth &&
		point.y <= chunk.position.y + chunkHeight
	);
};