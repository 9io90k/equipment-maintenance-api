require('dotenv').config();

module.exports = {
    development: {
        username: process.env.PGUSER || 'app',
        password: process.env.PGPASSWORD || '',
        database: process.env.PGDATABASE || 'equipment_db',
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT) || 5432,
        dialect: 'postgres',
        logging: false,
    },
    test: {
        username: process.env.PGUSER || 'app',
        password: process.env.PGPASSWORD || '',
        database: process.env.PGDATABASE_TEST || `${process.env.PGDATABASE || 'equipment_db'}_test`,
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT) || 5432,
        dialect: 'postgres',
        logging: false,
    },
    production: {
        username: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT) || 5432,
        dialect: 'postgres',
        logging: false,
    },
};
