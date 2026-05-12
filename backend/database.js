const knexLib = require('knex');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

let rawUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (rawUrl) {
  rawUrl = rawUrl.replace(/^["']|["']$/g, "").trim();
}

const isPostgres = !!rawUrl;

const config = isPostgres 
  ? {
      client: 'pg',
      connection: {
        connectionString: rawUrl,
        ssl: { rejectUnauthorized: false }
      },
      pool: { min: 2, max: 10 }
    }
  : {
      client: 'sqlite3',
      connection: {
        filename: path.join(__dirname, 'mbg_distribution.db')
      },
      useNullAsDefault: true
    };

const knex = knexLib(config);

// Log connection status
if (isPostgres) {
  knex.raw('SELECT 1')
    .then(() => console.log('✅ Connected to Vercel Postgres via Knex'))
    .catch(err => console.error('❌ Postgres connection error:', err.message));
} else {
  console.log('✅ Connected to SQLite database via Knex');
}

/**
 * Bridge function to maintain compatibility with raw SQL queries.
 * Knex handles ? to $1 conversion for Postgres automatically.
 */
async function run(sql, params = []) {
  const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
  const isSettings = sql.toUpperCase().includes('INTO SETTINGS');
  
  let finalSql = sql;
  
  // Handle Postgres RETURNING for lastID compatibility
  if (isPostgres && isInsert && !isSettings && !sql.toUpperCase().includes('RETURNING')) {
    finalSql += ' RETURNING id';
  }

  const result = await knex.raw(finalSql, params);

  if (isPostgres) {
    return {
      lastID: (isInsert && !isSettings) ? (result.rows[0]?.id || null) : null,
      changes: result.rowCount
    };
  } else {
    // SQLite result structure via Knex
    return {
      lastID: (isInsert && !isSettings) ? result[0] : null,
      changes: result.length // In SQLite, knex.raw for INSERT returns [lastID]
    };
  }
}

async function get(sql, params = []) {
  const result = await knex.raw(sql, params);
  if (isPostgres) {
    return result.rows[0] || null;
  } else {
    return result[0] || null;
  }
}

async function all(sql, params = []) {
  const result = await knex.raw(sql, params);
  return isPostgres ? result.rows : result;
}

module.exports = { 
  knex, 
  db: knex, // Alias for new code
  run, 
  get, 
  all, 
  isPostgres 
};
