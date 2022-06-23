const axios = require('axios').default

const baseApi = "http://localhost:16002"
const getRoomIdEndpoint = baseApi + "/available"
const initRoomEndpoint = baseApi + "/room/"

test("Get available room request returns room id", async () => {
    const roomId = (await axios.get(getRoomIdEndpoint)).data
    expect(roomId).not.toBe(undefined)
})


test("Init room returns valid room", async() => {
    const roomId = (await axios.get(getRoomIdEndpoint)).data
    expect(roomId).not.toBe(undefined)
    const room = (await axios.get(initRoomEndpoint + roomId)).data
    expect(room).not.toBe(undefined)
    expect(room.id).toBe(roomId)
    expect(room.chunks.length).not.toBe(0)
    expect(room.foodCount).toBe(40000)
})