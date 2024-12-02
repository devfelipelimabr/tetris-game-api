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
        console.error('Database initialization error:', error);
        process.exit(1);
    }
})();

// CORS Configuration
app.use(
    cors({
        origin: process.env.NODE_ENV !== 'development' ? process.env.CLIENT_URL : '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header'],
    })
);

// Middleware for JSON parsing
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/scores', scoresRoutes);

// Game management
const games = new Map();

// Generate unique game ID
const getNewGameId = () => `${uuidv4()}-${Date.now()}`;

// Token validation middleware
const validateWebSocketToken = (token) => {
    if (!token) {
        throw new Error('Authentication required');
    }
    return jwt.verify(token, process.env.JWT_SECRET);
};

// Central WebSocket connection handler
const handleWebSocketConnection = (ws, request) => {
    try {
        const url = new URL(request.url, `ws://${request.headers.host}`);
        const token = url.searchParams.get('token');
        const decoded = validateWebSocketToken(token);
        ws.userId = decoded.id;

        // Initialize first game
        initializeNewGame(ws);

        // Set up message and close handlers
        ws.on('message', (message) => handleWebSocketMessage(ws, message));
        ws.on('close', () => handleWebSocketClose(ws.gameId));
    } catch (error) {
        ws.close(1008, error.message);
    }
};

// Initialize a new game for a WebSocket connection
const initializeNewGame = (ws) => {
    const gameId = getNewGameId();
    const game = new TetrisGame();
    games.set(gameId, game);
    ws.gameId = gameId;  // Attach gameId to WebSocket

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
                initializeNewGame(ws);
                return;
            default:
                ws.send(
                    JSON.stringify({
                        type: 'ERROR',
                        message: 'Unknown command',
                    })
                );
                return;
        }

        console.log('gameId: ' + (data.gameId || ws.gameId),
            'Score: ' + game.getGameState().score,
            'Level: ' + game.getGameState().level,
            'userId: ' + ws.userId,
            'GameOver: ' + game.gameOver)

        ws.send(
            JSON.stringify({
                type: game.gameOver ? 'GAME_OVER' : 'GAME_UPDATE',
                gameState: game.getGameState(),
            })
        );

        if (game.gameOver) {
            const scoreSave = await saveUserScore(
                data.gameId || ws.gameId,
                game.getGameState().score,
                game.getGameState().level,
                ws.userId);

            if (scoreSave.error) {
                console.error(scoreSave.error);
            } else {
                console.info(scoreSave.message);
            }

            ws.on('close', () => handleWebSocketClose(ws.gameId));
        }

    } catch (error) {
        ws.send(
            JSON.stringify({
                type: 'ERROR',
                message: 'Invalid message format',
            })
        );
    }
};

// Handle WebSocket closure
const handleWebSocketClose = (gameId) => {
    const game = games.get(gameId);
    if (game?.descendInterval) {
        clearInterval(game.descendInterval);
    }
    games.delete(gameId);
};

// Save score to database
const saveUserScore = async (gameId, score, level, userId) => {
    try {
        if (!score || !level || !gameId) {
            return ({ error: 'Score, gameId and level are required.' });
        }

        const scoreExists = await Score.findOne({ where: { gameId } });

        if (scoreExists) {
            return ({ error: 'This score already exists' });
        }

        const newScore = await Score.create({
            score: score,
            gameId: gameId,
            level: level,
            UserId: userId
        });

        return ({ message: 'Score saved successfully.', score: newScore });
    } catch (error) {
        return ({ error: error.message });
    }
};

// WebSocket server configuration
wss.on('connection', handleWebSocketConnection);

// Server port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Tetris server running on port ${PORT}`);
});

module.exports = { server, wss };  // Export for potential testing