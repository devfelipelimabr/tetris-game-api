module.exports = class TetrisGame {
    constructor() {
        this.level = 1;
        this.baseInterval = 1000;
        this.levelTimer = null;
        this.width = 10;
        this.height = 20;
        this.board = this.createEmptyBoard();
        this.currentPiece = null;
        this.nextPiece = null;
        this.currentPosition = { x: 0, y: 0 };
        this.score = 0;
        this.gameOver = false;
        this.descendInterval = null;

        this.pieces = [
            {
                shape: [[1, 1, 1, 1]],
                color: 'cyan',
                name: 'I'
            },
            {
                shape: [[1, 1], [1, 1]],
                color: 'yellow',
                name: 'O'
            },
            {
                shape: [[1, 1, 1], [0, 1, 0]],
                color: 'purple',
                name: 'T'
            },
            {
                shape: [[1, 1, 1], [1, 0, 0]],
                color: 'orange',
                name: 'L'
            },
            {
                shape: [[1, 1, 0], [0, 1, 1]],
                color: 'green',
                name: 'S'
            },
            {
                shape: [[0, 1, 1], [1, 1, 0]],
                color: 'red',
                name: 'Z'
            },
            {
                shape: [[1, 1, 1], [0, 0, 1]],
                color: 'blue',
                name: 'J'
            }
        ];
    }

    createEmptyBoard() {
        return Array(this.height).fill().map(() =>
            Array(this.width).fill(null)
        );
    }

    startGame(ws) {
        this.gameOver = false;
        this.score = 0;
        this.level = 1;
        this.board = this.createEmptyBoard();
        this.spawnPiece();
        this.startDescending(ws);
        this.startLevelTimer(ws);
    }

    startLevelTimer(ws) {
        if (this.levelTimer) {
            clearInterval(this.levelTimer);
        }
        this.levelTimer = setInterval(() => {
            if (!this.gameOver) {
                this.incrementLevel(ws);
            }
        }, 5 * 60 * 1000); // 5 minutos
    }

    startDescending(ws) {
        if (this.descendInterval) {
            clearInterval(this.descendInterval);
        }

        this.descendInterval = setInterval(() => {
            if (this.gameOver) {
                clearInterval(this.descendInterval);
                clearInterval(this.levelTimer); // Para o timer de nível ao fim do jogo
                ws.send(JSON.stringify({
                    type: 'GAME_OVER',
                    gameState: this.getGameState()
                }));
                return;
            }

            this.movePiece('down');

            ws.send(JSON.stringify({
                type: 'GAME_UPDATE',
                gameState: this.getGameState()
            }));
        }, this.getCurrentInterval());
    }

    spawnPiece() {
        this.currentPiece = this.nextPiece || this.getRandomPiece();
        this.nextPiece = this.getRandomPiece();

        this.currentPosition = {
            x: Math.floor(this.width / 2) - Math.floor(this.currentPiece.shape[0].length / 2),
            y: 0
        };

        if (this.checkCollision()) {
            this.gameOver = true;
            if (this.descendInterval) {
                clearInterval(this.descendInterval);
            }
        }
    }

    getRandomPiece() {
        return this.pieces[Math.floor(Math.random() * this.pieces.length)];
    }

    movePiece(direction) {
        if (this.gameOver) return;

        switch (direction) {
            case 'left':
                this.currentPosition.x--;
                if (this.checkCollision()) {
                    this.currentPosition.x++;
                }
                break;
            case 'right':
                this.currentPosition.x++;
                if (this.checkCollision()) {
                    this.currentPosition.x--;
                }
                break;
            case 'down':
                this.currentPosition.y++;
                if (this.checkCollision()) {
                    this.currentPosition.y--;
                    this.lockPiece();
                    this.clearLines();
                    this.spawnPiece();
                }
                break;
        }
    }

    rotatePiece() {
        if (this.gameOver) return;

        const rotated = this.currentPiece.shape[0].map((_, index) =>
            this.currentPiece.shape.map(row => row[index]).reverse()
        );

        const originalShape = this.currentPiece.shape;
        this.currentPiece.shape = rotated;

        if (this.checkCollision()) {
            this.currentPiece.shape = originalShape;
        }
    }

    checkCollision() {
        for (let y = 0; y < this.currentPiece.shape.length; y++) {
            for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                if (this.currentPiece.shape[y][x]) {
                    const newX = this.currentPosition.x + x;
                    const newY = this.currentPosition.y + y;

                    if (
                        newX < 0 ||
                        newX >= this.width ||
                        newY >= this.height ||
                        (newY >= 0 && this.board[newY][newX] !== null)
                    ) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    lockPiece() {
        for (let y = 0; y < this.currentPiece.shape.length; y++) {
            for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                if (this.currentPiece.shape[y][x]) {
                    const boardY = this.currentPosition.y + y;
                    const boardX = this.currentPosition.x + x;

                    if (boardY >= 0) {
                        this.board[boardY][boardX] = this.currentPiece.color;
                    }
                }
            }
        }
    }

    clearLines() {
        const newBoard = this.board.filter(row => !row.every(cell => cell !== null));
        const linesCleared = this.height - newBoard.length;
        while (newBoard.length < this.height) {
            newBoard.unshift(Array(this.width).fill(null));
        }
        this.board = newBoard;
        this.updateScore(linesCleared);
    }

    updateScore(linesCleared) {
        const scoreMultipliers = [0, 40, 100, 300, 1200];
        this.score += scoreMultipliers[linesCleared] || 0;
    }

    getGameState() {
        return {
            board: this.getBoardWithCurrentPiece(),
            score: this.score,
            level: this.level,
            gameOver: this.gameOver,
            nextPiece: this.nextPiece
        };
    }

    getBoardWithCurrentPiece() {
        const boardWithCurrentPiece = this.board.map(row => [...row]);

        if (this.currentPiece && !this.gameOver) {
            for (let y = 0; y < this.currentPiece.shape.length; y++) {
                for (let x = 0; x < this.currentPiece.shape[y].length; x++) {
                    if (this.currentPiece.shape[y][x]) {
                        const boardY = this.currentPosition.y + y;
                        const boardX = this.currentPosition.x + x;

                        if (boardY >= 0 && boardY < this.height &&
                            boardX >= 0 && boardX < this.width) {
                            boardWithCurrentPiece[boardY][boardX] = this.currentPiece.color;
                        }
                    }
                }
            }
        }

        return boardWithCurrentPiece;
    }

    getCurrentInterval() {
        return this.baseInterval * Math.pow(0.9, this.level - 1);
    }

    incrementLevel(ws) {
        this.level++;
        clearInterval(this.descendInterval); // Para o intervalo atual
        this.startDescending(ws); // Reinicia o intervalo com nova velocidade
        ws.send(JSON.stringify({
            type: 'LEVEL_UP',
            level: this.level,
            gameState: this.getGameState()
        }));
    }
}