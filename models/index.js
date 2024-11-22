// models/index.js
const { Sequelize } = require('sequelize');
const config = require('../config/database');

const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: config.dialect
});

const User = require('./User')(sequelize);
const Score = require('./Score')(sequelize);
const JwtBlacklist = require('./JwtBlacklist')(sequelize);

// Define relationships
User.hasMany(Score);
Score.belongsTo(User);

module.exports = {
    sequelize,
    User,
    Score,
    JwtBlacklist
};
