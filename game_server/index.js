const WebSocket = require("ws");
const axios = require('axios').default

const players = new Map();
const sockets = new Map();

const rooms = new Map();
const matchDuration = 30000;

const maxFoodCount = 40000;

const worldWidth = 10000;
const worldHeight = 10000;

const chunkCount = 8;
const chunkWidth = worldWidth / chunkCount;
const chunkHeight = worldHeight / chunkCount;

const initialSize = 60;

const baseApi = "http://localhost:16002"
const getRoomWithId = baseApi + "/room/"
const resetRoomWithId = baseApi + "/reset/"

const server = new WebSocket.Server({ port: 16000 });

server.on("connection", (socket) => {

	socket.on("message", async (data) => {
		const json = JSON.parse(data);

		if (json.type === "connect") {
			console.log(json);
			const id = json.id
			sockets.set(id, socket);

			const playerData = {
				username: json.username,
				chunkId: 0,
				position: {
					x: Math.random() * worldWidth * 2 - worldWidth,
					y: Math.random() * worldHeight * 2 - worldHeight,
				},
				size: initialSize,
				color: {
					r: Math.floor(Math.random() * 255),
					g: Math.floor(Math.random() * 255),
					b: Math.floor(Math.random() * 255),
				},
			};
			players.set(id, playerData);

			let room = rooms.get(json.roomId)
			if (!room) {
				room = (await axios.get(getRoomWithId + json.roomId).catch(e => console.log(e))).data
				rooms.set(json.roomId, room)
			}
			const chunks = [];

			let found = room.chunks.find((chunk) =>
				chunkContainsPoint(playerData.position, chunk)
			);

			if (found) {
				playerData.chunkId = found.id;
				found.players.push(id);
				room.playerCount++;
				found.neighbours.forEach((n) => chunks.push(room.chunks[n]));
				chunks.push(found);
			}

			socket.send(
				JSON.stringify({
					type: "roomFound",
					roomId: room.id,
					chunks,
					playerID: id,
					matchDuration,
					...playerData,
				})
			);
		}

		if (json.type === "positionChanged") {
			if (!players.has(json.id) || rooms.get(json.roomId).gameOver) return;
			const playerData = players.get(json.id);
			const chunk = rooms.get(json.roomId).chunks[playerData.chunkId];
			if (!chunkContainsPoint(playerData.position, chunk)) {
				let found = rooms.get(json.roomId).chunks.find((c) =>
					chunkContainsPoint(playerData.position, c)
				);

				if (found) {
					playerData.chunkId = found.id;
					chunk.players.splice(chunk.players.indexOf(json.id), 1);
					found.players.push(json.id);

					const chunks = [];
					found.neighbours.forEach((n) =>
						chunks.push(rooms.get(json.roomId).chunks[n])
					);
					chunks.push(found);
				}
			}
			players.set(json.id, { ...playerData, position: json.newPos });
		}

		if (json.type === "sizeChanged") {
			const playerData = players.get(json.id);
			const chunk = rooms.get(json.roomId).chunks[playerData.chunkId];
			playerData.size = json.newSize;
			players.set(json.id, playerData);

			let chunks = [
				chunk,
				...chunk.neighbours.map((n) => rooms.get(json.roomId).chunks[n]),
			];

			for (let c of chunks) {
				for (let i = c.food.length - 1; i >= 0; i--) {
					if (json.food.x === c.food[i].x && json.food.y === c.food[i].y) {
						c.food.splice(i, 1);
						rooms.get(json.roomId).foodCount--;
						return;
					}
				}
			}
		}

		if (json.type === "playerEaten") {
			if (!players.has(json.eaten) || rooms.get(json.roomId).gameOver) return;
			players.delete(json.eaten);
			sockets.get(json.eaten).send(
				JSON.stringify({
					type: "eaten",
					eater: players.get(json.eater).username,
				})
			);
			sockets.delete(json.eaten);
			const room = rooms.get(json.roomId);
			let found = room.chunks.find((chunk) =>
				chunk.players.includes(json.eaten)
			);
			if (found) {
				found.players.splice(found.players.indexOf(json.id), 1);
				rooms.get(json.roomId).playerCount--;
				return;
			}
		}

		if (json.type === "close") {
			if (!sockets.has(json.id)) return;
			players.delete(json.id);
			sockets.get(json.id).close();
			sockets.delete(json.id);
			const room = rooms.get(json.roomId);
			let found = room.chunks.find((chunk) => chunk.players.includes(json.id));
			if (found) {
				found.players.splice(found.players.indexOf(json.id), 1);
				room.playerCount--;
				return;
			}
		}
	});
});

const resetRoom = async (roomId) => {
	const room = (await axios.get(resetRoomWithId + roomId)).data
	rooms.set(json.roomId, room)

	for (const [id, playerData] of players.entries()) {
		let data = playerData;
		data = {
			...playerData,
			chunkId: 0,
			position: {
				x: Math.random() * worldWidth * 2 - worldWidth,
				y: Math.random() * worldHeight * 2 - worldHeight,
			},
			size: initialSize,
		};

		players.set(id, data);

		chunks = [];

		let found = room.chunks.find((chunk) =>
			chunkContainsPoint(data.position, chunk)
		);

		if (found) {
			data.chunkId = found.id;
			found.players.push(id);
			room.playerCount++;
			found.neighbours.forEach((n) => chunks.push(room.chunks[n]));
			chunks.push(found);
		}

		chunks = chunks.map((c) => {
			return {
				...c,
				players: c.players.map((p) => {
					return { ...players.get(p), id: p };
				}),
			};
		});

		sockets.get(id).send(
			JSON.stringify({
				type: "roomReset",
				chunks,
				...data,
			})
		);
	}
};

setInterval(() => {
	if (sockets.keys().next().value) {
		rooms.forEach((room) => {
			if (room.gameOver) return;
			const food = [];
			for (let i = room.foodCount; i < maxFoodCount; i++) {
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

			room.chunks.forEach((chunk) => {
				food
					.filter((f) => chunkContainsPoint(f, chunk))
					.forEach((f) => chunk.food.push(f));
				chunk.players.forEach((playerId) => {
					let chunks = [chunk, ...chunk.neighbours.map((n) => room.chunks[n])];
					chunks = chunks.map((c) => {
						return {
							...c,
							players: c.players.map((p) => {
								return { ...players.get(p), id: p };
							}),
						};
					});
					const socket = sockets.get(playerId);
					if (socket)
						socket.send(
							JSON.stringify({
								type: "tick",
								chunks,
							})
						);
				});
			});
		});
	}
}, 100);

setInterval(() => {
	const date = new Date();
	rooms.forEach(room =>{
		if (!room.gameOver) {
			if (date.getTime() - room.startTime >= matchDuration) {
				room.startTime = date.getTime() - 30000;
				room.gameOver = true;
				setTimeout(() => {
					resetRoom(room.id);
				}, 10000);

				let results = [];
				for (let chunk of room.chunks) {
					for (let playerId of chunk.players) {
						let player = players.get(playerId);
						results.push({ username: player.username, size: player.size });
					}
				}

				for (let chunk of room.chunks) {
					for (let playerId of chunk.players) {
						let socket = sockets.get(playerId);
						socket.send(
							JSON.stringify({
								type: "gameOver",
								results,
							})
						);
					}
				}
			}
		}

		for (let chunk of room.chunks) {
			for (let playerId of chunk.players) {
				let timeLeft = matchDuration - (date.getTime() - room.startTime);
				const socket = sockets.get(playerId);
				if (socket)
					socket.send(
						JSON.stringify({
							type: "timeUpdate",
							timeLeft,
						})
					);
			}
		}
	})
}, 1000);

const chunkContainsPoint = (point, chunk) => {
	return (
		point.x >= chunk.position.x &&
		point.y >= chunk.position.y &&
		point.x <= chunk.position.x + chunkWidth &&
		point.y <= chunk.position.y + chunkHeight
	);
};
