const { sequelize } = require('../models');

async function authenticateDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Conexão com o banco de dados bem-sucedida.');
    } catch (err) {
        console.error('Erro ao conectar-se ao banco de dados:', err);
    }
}

async function syncDatabase(options = { alter: true }) {
    try {
        await sequelize.sync(options);
        console.log('Modelos sincronizados com o banco de dados.');
    } catch (err) {
        console.error('Erro ao sincronizar modelos:', err);
    }
}

module.exports = {
    authenticateDatabase,
    syncDatabase
};
