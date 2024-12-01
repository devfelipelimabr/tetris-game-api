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
const TetrisGame = require('./services/TetrisGame');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({
    server,
    maxPayload: 1024 * 1024, // Max 1MB
});

(async () => {
    try {
        await authenticateDatabase();
        await syncDatabase();
    } catch (error) {
        process.exit(1);
    }
})();

// Configuração do CORS
app.use(
    cors({
        origin: process.env.NODE_ENV !== 'development' ? process.env.CLIENT_URL : '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header'],
    })
);

// Middleware para parsing de JSON
app.use(express.json());

// Rotas
app.use('/auth', authRoutes);
app.use('/scores', scoresRoutes);

const games = new Map();

// Middleware de validação de token
const validateWebSocketToken = (token) => {
    if (!token) {
        throw new Error('Authentication required');
    }
    return jwt.verify(token, process.env.JWT_SECRET);
};

// Função central de conexão WebSocket
const handleWebSocketConnection = (ws, request) => {
    try {
        const url = new URL(request.url, `ws://${request.headers.host}`);
        const token = url.searchParams.get('token');
        const decoded = validateWebSocketToken(token);
        ws.userId = decoded.id;

        const gameId = `${uuidv4()}-${Date.now()}`;
        const game = new TetrisGame();
        games.set(gameId, game);

        game.startGame(ws);

        ws.send(
            JSON.stringify({
                type: 'GAME_INITIALIZED',
                gameId,
                gameState: game.getGameState(),
            })
        );

        ws.on('message', (message) => handleWebSocketMessage(ws, message));
        ws.on('close', () => handleWebSocketClose(gameId));
    } catch (error) {
        ws.close(1008, error.message);
    }
};

// Função para lidar com mensagens WebSocket
const handleWebSocketMessage = (ws, message) => {
    try {
        const data = JSON.parse(message);
        const game = games.get(data.gameId);

        if (!game) {
            ws.send(
                JSON.stringify({
                    type: 'ERROR',
                    message: 'Game not found',
                })
            );
            return;
        }

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
            default:
                ws.send(
                    JSON.stringify({
                        type: 'ERROR',
                        message: 'Unknown command',
                    })
                );
                return;
        }

        ws.send(
            JSON.stringify({
                type: game.gameOver ? 'GAME_OVER' : 'GAME_UPDATE',
                gameState: game.getGameState(),
            })
        );
    } catch (error) {
        ws.send(
            JSON.stringify({
                type: 'ERROR',
                message: 'Invalid message format',
            })
        );
    }
};

// Função para lidar com o fechamento do WebSocket
const handleWebSocketClose = (gameId) => {
    const game = games.get(gameId);
    if (game?.descendInterval) {
        clearInterval(game.descendInterval);
    }
    games.delete(gameId);
};

// Configuração do WebSocket
wss.on('connection', handleWebSocketConnection);

// Porta do Servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Tetris server running on port ${PORT}`);
});
