require('dotenv').config();

module.exports = {
    development: {
        username: process.env.PGUSER || process.env.DB_USER || 'app',
        password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.PGDATABASE || process.env.DB_NAME || 'equipment_db',
        host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
        port: Number(process.env.PGPORT || process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        logging: false,
    },
    test: {
        username: process.env.PGUSER || process.env.DB_USER || 'app',
        password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.PGDATABASE_TEST || `${process.env.PGDATABASE || process.env.DB_NAME || 'equipment_db'}_test`,
        host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
        port: Number(process.env.PGPORT || process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        logging: false,
    },
    production: {
        username: process.env.PGUSER || process.env.DB_USER || 'app',
        password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
        database: process.env.PGDATABASE || process.env.DB_NAME || 'equipment_db',
        host: process.env.PGHOST || process.env.DB_HOST || 'db',
        port: Number(process.env.PGPORT || process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        logging: false,
    },
};
