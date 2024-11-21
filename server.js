const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const TetrisGame = require("./services/TetrisGame");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

const games = new Map();

wss.on('connection', (ws) => {
    const gameId = Date.now().toString();
    const game = new TetrisGame();
    games.set(gameId, game);

    game.startGame(ws);

    ws.send(JSON.stringify({
        type: 'GAME_INITIALIZED',
        gameId,
        gameState: game.getGameState()
    }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        const game = games.get(data.gameId);

        if (!game) return;

        switch (data.type) {
            case 'MOVE_LEFT':
                game.movepiece('left');
                break;
            case 'MOVE_RIGHT':
                game.movepiece('right');
                break;
            case 'MOVE_DOWN':
                game.movepiece('down');
                break;
            case 'ROTATE':
                game.rotatePiece();
                break;
            case 'NEW_GAME':
                game.startGame(ws);
                break;
        }

        const response = {
            type: game.gameOver ? 'GAME_OVER' : 'GAME_UPDATE',
            gameState: game.getGameState()
        };

        ws.send(JSON.stringify(response));
    });

    ws.on('close', () => {
        if (games.has(gameId)) {
            const game = games.get(gameId);
            if (game.descendInterval) {
                clearInterval(game.descendInterval);
            }
            games.delete(gameId);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Tetris server running on port ${PORT}`);
});