// ============ MODULES ============ 
const http = require('http');
const express = require('express')
const sqlite3 = require('sqlite3').verbose();
const socketIO = require('socket.io');

const port = 3000;

// ============ INIT ============ 
var app = express();
var server = http.Server(app);
var io = socketIO(server);

// Add the folder 'public' to be used without settings the path everytime
app.use(express.static('public'));

// Default route at / -> we juste send the html file
app.get('/', (req, res) => {
    res.sendFile('index.html', {root: __dirname });
});

// When there is a connection with socketio
io.on('connection', (socket) => {

    // Request DB to get the 5 first highscores Then emit data through socket
    GetTopHighScores(5, socket);

    // Listen on registerScore
    socket.on('registerScore', (data) => {
        // Add score to the database
        RegisterScore(data.score);
    });

    // automatic event on disconnect client
    socket.on('disconnect', () => {
    });
});

function SendHighScore(_socket, _rowsScores)
{
    // Format data to a simple array
    let topHighscores = [];
    _rowsScores.forEach((row) => {
        topHighscores.push(row.score);
    });

    // send the restult to the client
    _socket.emit('sendHighscore', {
        highscores: topHighscores,
    });
}

function GetTopHighScores(_numberOfResults, _socket)
{
    // Open the database MemoryGame.db3 in read only mode
    let db = new sqlite3.Database('./db/MemoryGame.db3', sqlite3.OPEN_READONLY, (err) => {
        if (err)
            console.error(err.message);
    });

    // we pre format the sql request
    let sqlRequest = 'SELECT score as score FROM HighScore ORDER BY score LIMIT ' + _numberOfResults;

    // Execute the sql request
    // serialize() indicate to sqlite to first finish the current task before executing another one
    // all() indicate sqlite to get all response from the request at once (cached in memory) and not each time a new one is found
    //  |_ we want all highscore at once to send them all directly (not recommended if the result is too big)
    db.serialize(() => {
        db.all(sqlRequest, (err, rows) => {
            if (err)
                console.error(err.message);

            // once the result arrived we send it to the client
            if (rows != undefined && _socket)
                SendHighScore(_socket, rows);
        });
    });

    // Close the DB
    db.close((err) => {
        if (err)
            console.error(err.message);
    });
}

function RegisterScore(_scoreValue)
{
    // Open the DB
    let db = new sqlite3.Database('./db/MemoryGame.db3', sqlite3.OPEN_READWRITE, (err) => {
        if (err)
            console.error(err.message);
    });

    // INSERT INTO - we do not fill in the name field but we can imagine to add a prompt / input field and add the name of the player later
    let sqlRequest = 'INSERT INTO  HighScore VALUES('+ _scoreValue + ', "")';

    // insert one row into the langs table
    db.run(sqlRequest, function(err) {
        if (err)
            return console.error(err.message);
    });

    // Close the DB
    db.close((err) => {
        if (err)
            console.error(err.message);
    });
}

// Launch the app on port : localhost:3000
server.listen(port, () =>
{
    console.log(`STARTING SERVER ON PORT ${port}`);
});
