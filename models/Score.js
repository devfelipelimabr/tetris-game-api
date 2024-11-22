// models/Score.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('Score', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        score: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        level: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        gameId: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
    });
};