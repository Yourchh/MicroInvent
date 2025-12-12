const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

pool.on('connect', () => console.log('✅ Base de Datos Conectada'));
pool.on('error', (err) => console.error('❌ Error Base de Datos', err));

module.exports = pool;