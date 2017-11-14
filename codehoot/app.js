/*
    NB: (This was mentioned in the docuementation) app.js is essentially all of the 'server' code
    Comments explain each important section of this file, generally this is each socket event listener function.
*/

var express = require("express");
var app = express();  
var server = require("http").createServer(app);  
var io = require("socket.io")(server);

var roomsDict = {};

/*
    Setup Express and Socket.IO
    Init the roomsDict object, essentially stores all the games, their coreresponding info and players etc
*/
app.use(express.static(__dirname));

io.on("connection", function(socket){
    console.log('A user connected');

    socket.on("disconnect", function(){
        console.log('A user disconnected');
        Object.keys(roomsDict).forEach(function(gameId){
            for (var i = 0; i < roomsDict[gameId].length; i++)
            {
                if (socket.id == roomsDict[gameId][i].socketId)
                {
                    io.in(gameId).emit("genericUniversalNotification", "warning", ("<strong>" +
                     roomsDict[gameId][i].userName + " </strong> has disconnected."));
                    var needNewHost = roomsDict[gameId][i].isHost;
                    io.in(gameId).emit("removePlayerStatus", i);
                    roomsDict[gameId].splice(i, 1);
                    if (roomsDict[gameId].length <= 0 ||
                     (roomsDict[gameId].length == 1 && roomsDict[gameId].indexOf("IN PROGRESS") != -1))
                        delete roomsDict[gameId];
                    else if (needNewHost){
                        roomsDict[gameId][0].isHost = true;
                        io.in(gameId).emit("genericUniversalNotification", "info", "<strong>" + roomsDict[gameId][0].userName +
                         "</strong> is now the <strong>Host.</strong>");
                    }
                    console.log(roomsDict);
                    break;
                }
            }
        });
    });

    /*
        Above shows the handling of a disconnect, essentially finds out which player disconnected, amend their status
        and sends a notification to all the players telling that said player left. It will also resassign a new Host if necessary 
        and notify the rest of the players.
    */
    socket.on("message", function(message){
        console.log(message);
    });

    socket.on("requestLobbyList", function(){
        socket.emit("getLobbyList", roomsDict);
    });

    socket.on("emitToAllClientsInRoom", function(message, gameId, optionalOne, optionalTwo){
        //TODO setup optional parameters
        console.log("MESSAGE : " + message);
        io.in(gameId).emit(message, optionalOne, optionalTwo);
    });

    /*
        Above are various socket.on functions that listen for socket events from the client. "message" was used for testing 
        purposes early on in development, "requestLobbyList" are for clients that want to see which games are currently active 
        (the list of current games), and "emitToAllClientsInRoom" are for parameter specific socket events that need to be emitted
        to all clients within a specific game (room).
    */

    socket.on("joinHostGame", function(gameId, name, isJoin, isHost, gameType){
        var player = {userName: name.trim(), placing: 0, failedTrials: 0, charCount: 0,
         isHost: isHost, gameType: gameType, socketId: socket.id}; 
        if (!isJoin)
        {
            socket.join(gameId);
        }else if (roomsDict.hasOwnProperty(gameId)){
            if (roomsDict[gameId].indexOf("IN PROGRESS") != -1){
                socket.emit("invalidInput", "inProgress");
                return;
            }else if (roomsDict[gameId].length == 10){
                socket.emit("invalidInput", "maxPlayers");
                return;
            }else{
                for (var i = 0; i < roomsDict[gameId].length; i++)
                {
                    if (player.userName == roomsDict[gameId][i].userName)
                    {
                        socket.emit("invalidInput", "name");
                        return;
                    }else if (roomsDict[gameId][i].gameType != "")
                        player.gameType = roomsDict[gameId][i].gameType;
                }
                socket.join(gameId);
            }
        }else{
            //console.log(roomsDict);
            socket.emit("invalidInput", "id");
            return;
        }

        if (!roomsDict[gameId])
            roomsDict[gameId] = [player];
        else
            roomsDict[gameId].push(player);
        //roomsDict[gameId] = (roomsDict[gameId])? (roomsDict[gameId].append(player)) : ([player]);
        //console.log(gameId);
        //console.log(roomsDict[gameId]);
        console.log(roomsDict);

        io.in(gameId).emit("connectedToRoom", gameId, roomsDict[gameId]);
        io.in(gameId).emit("genericUniversalNotification", "success", "<strong>" + player.userName + "</strong> has connected!");
    });

    /*
        Essentially "joinHostGame" handles clients (players) that wish to either host or join a game, setting them up with
        a Game ID and a room (game) if hosting. If joining then checks are done for invalid input (name taken,
        game in progress and invalid ID (missing fields is done client side)), then putting them (if no invalid input)
        into the desired game. A notification (and sound fx played) is sent to all players within a room when a new player joins.
    */

    socket.on("gameSettings", function(gameId, gametype){
        console.log(gametype);
        var problemSet = [];
        var num = (gametype.charAt(0) == "O")? 1 : parseInt(gametype.charAt(0)); // if its "(O)ne Major Problem"
        for (var i = 0; i < num; i++)
        {
            while (true)
            {
                problem = Math.round(Math.random() * ((num != 1)? 11 : 4));
                if (problemSet.indexOf(problem) == -1){
                    problemSet.push(problem);
                    break;
                }
            }
        }
        console.log(problemSet);
        roomsDict[gameId].push("IN PROGRESS");
        io.in(gameId).emit("startGame", problemSet);
    });

    socket.on("exitRoom", function(gameId){
        if (roomsDict.hasOwnProperty(gameId))
            delete roomsDict[gameId];
        console.log("ROOMS DICT IS NOW : " + roomsDict);
        socket.leave(gameId);
    });

});

/*
    Above, the "gameSettings" socket event listener sets up the appropriate settings for the game when the socket event is sent
    to the 'server'. The problems used for the game are determined here, what set of problems it should pick
    from and the amount based on the game type. The "startGame" socket event is also emitted to the room (game) to start it.
    Once a game has ended "exitRoom" deletes the room (game) from the roomsDict object, and closes said room.
*/

app.get("/", function(req, res){
    res.sendFile(__dirname + "/index.html");
});

server.listen(process.env.PORT || 3000);