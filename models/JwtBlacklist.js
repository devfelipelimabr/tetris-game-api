// models/JwtBlacklist.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('JwtBlacklist', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        token: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false
        }
    });
};
