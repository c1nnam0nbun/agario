<p>Clone of multiplayer game Agario with distributed server. It was created on top of previously created centralized version, so implementation might look slightly redundant.
The idea is that there are three distinct servers implementing some parts of app logic. These are:</p>
<list>
    <li>room_server: responsible for initializing room data and finding available room (room with less than max amount of players). Uses express framework for its endpoints</li>
    <li>auth_server: responsible for adding and removing players from fame world. Makes requests to room_server via axios for room id, sends messages to game_server via WebSocket, implements its own endpoints via express</li>
    <li>game_server: responsible for regular game world updates, such as players' positions, sizes etc. game_server is WebSocket server, which exchanges messages with players</li>
</list>
<p>To start the game, clone the repository and run <bold>npm run start</bold> to start all servers simultaneously or <bold>npm run <game/room/auth>_server</bold> to start servers separately.
<bold>NOTE</bold>: as servers need to communicate between them, the order should be room_server->auth_server->game_server
When servers are running, open (index.html) in browser to start playing.</p>