require('dotenv').config({ quiet: true });

const { Sequelize } = require('sequelize');

module.exports = new Sequelize(process.env.DB_NAME || 'treinos_esportivos',
  process.env.DB_USER || 'treinos', process.env.DB_PASSWORD || '', {
    dialect: 'mysql',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    timezone: '+00:00',
    logging: false,
  });
