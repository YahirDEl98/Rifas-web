const path = require('path');

module.exports = {
  development: {
    client: 'better-sqlite3',
    connection: {
      // Use absolute path so knex can open DB regardless of process cwd
      filename: path.join(__dirname, 'db', 'rifaplus.db')
    },
    useNullAsDefault: true,
    migrations: {
      directory: './db/migrations'
    },
    seeds: {
      directory: './db/seeds'
    }
  },

  production: {
    client: 'pg', // PostgreSQL para producción
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: './db/migrations'
    },
    seeds: {
      directory: './db/seeds'
    }
  }
};
