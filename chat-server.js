"use strict";

process.title = 'node-chat'; // Optional. Process name for ps command

var webSocketsServerPort = 1337;

// websocket and http servers
var WebSocketServer = require('websocket').server;
var http = require('http');

// Global variables
var history = []; // last 100 messages
var clients = []; // list of currently connected users

// Helper function for escaping input strings
function htmlEntities(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

var colors = ['red', 'green', 'blue', 'magenta', 'purple', 'plum', 'orange'];
colors.sort((a, b) => {
    return Math.random() > 0.5;
});

// HTTP Server
var server = http.createServer((request, response) => {}); // process HTTP request.
server.listen(webSocketsServerPort, () => {
    console.log((new Date()) + " Server is listening on port " + webSocketsServerPort);
});

// WebSocket Server
var wsServer = new WebSocketServer({
    httpServer: server
});

// Called when user tries to connect to ws server
wsServer.on('request', (request) => {
    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
    
    // accept connection
    var connection = request.accept(null, request.origin); // check that the client is connecting from the same origin (ie. my website)
    var index = clients.push(connection) - 1; // we need to know the client index to remove them on 'close' event
    var userName = false;
    var userColor = false;

    console.log((new Date()) + ' Connection accepted.');

    // send chat history
    if (history.length > 0){
        connection.sendUTF(
            JSON.stringify({ type: 'history', data: history })
        );
    }

    // handle user messages
    connection.on('message', (message) => {
        if(message.type === 'utf8'){
            if(userName === false) {
                userName = htmlEntities(message.utf8Data); // remember user name
                userColor = colors.shift(); // get random color and send it to the user
                connection.sendUTF(
                    JSON.stringify({ type: 'color', data: userColor })
                );
                console.log((new Date()) + ' User is known as: ' + userName + ' with ' + userColor + ' color.');
            } else { 
                console.log((new Date()) + ' Received message from ' + userName + ': ' + message.utf8Data);

                var obj = {
                    time: (new Date()).getTime(),
                    text: htmlEntities(message.utf8Data),
                    author: userName,
                    color: userColor
                };
                history.push(obj);
                history = history.slice(-100);

                var json = JSON.stringify({ type: 'message', data: obj });
                for(var i = 0; i < clients.length; i++){
                    clients[i].sendUTF(json);
                }
            }
        }
    });

    // user disconnected
    connection.on('close', (connection) => {
        if (userName !== false && userColor !== false) { 
            console.log((new Date()) + " Peer " + connection.remoteAddress + " disconnected.");

            clients.splice(index, 1);
            colors.push(userColor);
        }
    });
});