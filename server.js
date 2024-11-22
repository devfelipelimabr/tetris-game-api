require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const authRoutes = require('./routes/auth');
const scoresRoutes = require('./routes/scores');
const { authenticateDatabase, syncDatabase } = require('./config/sync_db');
const TetrisGame = require("./services/TetrisGame");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

(async () => {
    await authenticateDatabase();
    await syncDatabase();
})();

// Configuração do CORS
app.use(cors({
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header'],
}));

// Middleware para parsing de JSON
app.use(express.json());

// Rotas
app.use('/auth', authRoutes);
app.use('/scores', scoresRoutes);

const games = new Map();

// WebSocket
wss.on('connection', (ws, request) => {
    const url = new URL(request.url, `ws://${request.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
        ws.close(1008, 'Authentication required');
        return;
    }

    console.log(`Token recebido: ${token}`);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        ws.userId = decoded.id;

        const gameId = uuidv4() + Date.now().toString();
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
    } catch (error) {
        ws.close(1008, 'Invalid token');
    }
});

// Porta do Servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Tetris server running on port ${PORT}`);
});
