require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const authRoutes = require('./routes/auth');
const scoresRoutes = require('./routes/scores');

const { Score } = require('./models');
const { authenticateDatabase, syncDatabase } = require('./config/sync_db');

const TetrisGame = require('./services/TetrisGame');
const TetrisTimeAttackGame = require('./services/TetrisTimeAttackGame');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const games = new Map();
const gameModes = {
    CLASSIC: {
        name: 'Classic',
        description: 'A classic endless game mode.',
    },
    TIME_ATTACK: {
        name: 'Time Attack',
        description: 'Score as much as possible within a time limit.',
    },
};
const gameSelect = {
    CLASSIC: TetrisGame,
    TIME_ATTACK: TetrisTimeAttackGame,
};

(async () => {
    try {
        await authenticateDatabase();
        await syncDatabase();
    } catch (error) {
        console.error('Database initialization error:', error);
        process.exit(1);
    }
})();

// Middleware
app.use(
    cors({
        origin: process.env.NODE_ENV !== 'development' ? process.env.CLIENT_URL : '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header'],
    })
);
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/scores', scoresRoutes);

// Route: Get available game modes
app.get('/game-modes', (req, res) => {
    res.json({ modes: Object.keys(gameModes), details: gameModes });
});

// Generate unique game ID
const getNewGameId = () => `${uuidv4()}-${Date.now()}`;

// Token validation
const validateWebSocketToken = (token) => {
    if (!token) throw new Error('Authentication required');
    return jwt.verify(token, process.env.JWT_SECRET);
};

// WebSocket connection
wss.on('connection', (ws, request) => {
    try {
        const url = new URL(request.url, `ws://${request.headers.host}`);
        const token = url.searchParams.get('token');
        const decoded = validateWebSocketToken(token);
        ws.mode = url.searchParams.get('mode') || 'CLASSIC';

        if (!gameModes[ws.mode]) {
            throw new Error('Invalid game mode');
        }

        ws.userId = decoded.id;
        initializeNewGame(ws);

        ws.on('message', (message) => handleWebSocketMessage(ws, message));
        ws.on('close', () => handleWebSocketClose(ws.gameId));
    } catch (error) {
        ws.close(1008, error.message);
    }
});

// Initialize a new game
const initializeNewGame = (ws) => {
    const gameId = getNewGameId();
    const GameClass = gameSelect[ws.mode];
    const game = new GameClass();
    games.set(gameId, game);
    ws.gameId = gameId;

    game.startGame(ws);

    ws.send(
        JSON.stringify({
            type: 'GAME_INITIALIZED',
            gameId,
            gameState: game.getGameState(),
        })
    );
};

// Handle WebSocket messages
const handleWebSocketMessage = async (ws, message) => {
    try {
        const data = JSON.parse(message);
        const game = games.get(data.gameId || ws.gameId);

        if (!game) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Game not found' }));
            return;
        }

        switch (data.type) {
            case 'MOVE_LEFT':
                game.movePiece('left');
                break;
            case 'MOVE_RIGHT':
                game.movePiece('right');
                break;
            case 'MOVE_DOWN':
                game.movePiece('down');
                break;
            case 'ROTATE':
                game.rotatePiece();
                break;
            case 'NEW_GAME':
                initializeNewGame(ws);
                return;
            default:
                ws.send(JSON.stringify({ type: 'ERROR', message: 'Unknown command' }));
                return;
        }

        ws.send(
            JSON.stringify({
                type: game.gameOver ? 'GAME_OVER' : 'GAME_UPDATE',
                gameState: game.getGameState(),
            })
        );

        if (game.gameOver) {
            await saveUserScore(
                data.gameId || ws.gameId,
                game.getGameState().score,
                game.getGameState().level,
                ws.userId
            );
        }
    } catch (error) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid message format' }));
    }
};

// Handle WebSocket close
const handleWebSocketClose = (gameId) => {
    const game = games.get(gameId);
    if (game?.descendInterval) clearInterval(game.descendInterval);
    games.delete(gameId);
};

// Save score
const saveUserScore = async (gameId, score, level, userId) => {
    try {
        if (!score || !level || !gameId) throw new Error('Score, gameId, and level are required');

        const existingScore = await Score.findOne({ where: { gameId } });
        if (existingScore) throw new Error('This score already exists');

        const newScore = await Score.create({ score, gameId, level, UserId: userId });
        return { message: 'Score saved successfully', score: newScore };
    } catch (error) {
        console.error('Error saving score:', error.message);
        return { error: error.message };
    }
};

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { server, wss };
