const TetrisGame = require("./TetrisGame");

module.exports = class TetrisTimeAttackGame extends TetrisGame {
    constructor() {
        super();
        this.timeLimit = 3 * 60 * 1000; // minutos
        this.remainingTime = this.timeLimit;
        this.timeAttackTimer = null;
        this.targetScore = 5000; // Pontuação alvo para vencer
    }

    startGame(ws) {
        super.startGame(ws);
        this.remainingTime = this.timeLimit;
        this.startTimeAttackTimer(ws);
    }

    startTimeAttackTimer(ws) {
        if (this.timeAttackTimer) {
            clearInterval(this.timeAttackTimer);
        }

        this.timeAttackTimer = setInterval(() => {
            this.remainingTime -= 1000;

            // Verifica condições de fim de jogo
            if (this.remainingTime <= 0 || this.gameOver) {
                clearInterval(this.timeAttackTimer);
                clearInterval(this.descendInterval);

                const gameResult = this.score >= this.targetScore ? 'WIN' : 'LOSE';

                ws.send(JSON.stringify({
                    type: 'TIME_ATTACK_END',
                    result: gameResult,
                    score: this.score,
                    targetScore: this.targetScore,
                    gameState: this.getGameState()
                }));

                this.gameOver = true;
                return;
            }

            // Envia atualização de tempo a cada segundo
            ws.send(JSON.stringify({
                type: 'TIME_ATTACK_UPDATE',
                remainingTime: this.remainingTime,
                targetScore: this.targetScore,
                gameState: this.getGameState()
            }));
        }, 1000);
    }

    updateScore(linesCleared) {
        // Mantém o sistema de pontuação original
        super.updateScore(linesCleared);

        // Adiciona pontuação extra por linhas consecutivas
        const consecutiveMultipliers = [0, 50, 150, 300, 500];
        this.score += consecutiveMultipliers[linesCleared] || 0;
    }

    // Sobrescreve o método getGameState para incluir informações de tempo
    getGameState() {
        const baseState = super.getGameState();
        return {
            ...baseState,
            remainingTime: this.remainingTime,
            targetScore: this.targetScore
        };
    }
}