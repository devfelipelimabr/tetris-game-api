// routes/scores.js
const express = require('express');
const router = express.Router();
const { Score, User } = require('../models');
const { authenticateToken } = require('../middlewares/auth');

// Salvar score do usuário
router.post('/save', authenticateToken, async (req, res) => {
    try {
        const { score, level, gameId } = req.body;

        console.log(req.body);

        if (!score || !level || !gameId) {
            return res.status(400).json({ message: 'Score, gameId and level are required.' });
        }

        const scoreExists = await Score.findOne({ where: { gameId } });

        if (scoreExists) {
            return res.status(400).json({ error: 'This score already exists' });
        }

        const newScore = await Score.create({
            score,
            gameId,
            level,
            UserId: req.user.id
        });

        res.status(201).json({ message: 'Score saved successfully.', score: newScore });
    } catch (error) {
        res.status(500).json({ message: 'Error saving score.', error: error.message });
    }
});

// Retornar os 10 maiores scores
router.get('/top', async (req, res) => {
    try {
        const topScores = await Score.findAll({
            limit: 10,
            order: [['score', 'DESC']],
            include: { model: User, attributes: ['username'] }
        });

        res.status(200).json(topScores);
    } catch (error) {
        res.status(500).json({ message: 'Error searching for highest scores.', error: error.message });
    }
});

// Retornar os 10 maiores scores do usuário
router.get('/personal', authenticateToken, async (req, res) => {
    try {
        const userScores = await Score.findAll({
            where: { UserId: req.user.id },
            limit: 10,
            order: [['score', 'DESC']]
        });

        res.status(200).json(userScores);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user scores.', error: error.message });
    }
});

module.exports = router;
