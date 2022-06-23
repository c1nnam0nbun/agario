const axios = require('axios').default

const baseApi = "http://localhost:16001"
const connectEndpoint = baseApi + "/connect"

test("Connect returns player id and room id", async () => {
    const {id, roomId} = (await axios.post(connectEndpoint, JSON.stringify({username: "testUser"}))).data
    expect(id).not.toBe(undefined)
    expect(roomId).not.toBe(undefined)
})