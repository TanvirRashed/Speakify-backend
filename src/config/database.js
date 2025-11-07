// src/config/database.js
import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Railway URL
  ssl: { rejectUnauthorized: false },
});

let didLog = false;
pool.on('connect', () => {
  if (!didLog) {
    console.log('✅ Connected to PostgreSQL database');
    didLog = true;
  }
});

export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversions (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      input_text TEXT,
      output_text TEXT,
      audio_url TEXT,
      voice TEXT,
      speed DOUBLE PRECISION,
      file_size BIGINT,
      duration DOUBLE PRECISION,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
}



// // src/config/database.js
// import pg from 'pg';
// const { Pool } = pg;

// const pool = new Pool({
//   host: process.env.PGHOST,
//   port: process.env.PGPORT,
//   user: process.env.PGUSER,
//   password: process.env.PGPASSWORD,
//   database: process.env.PGDATABASE,
//   ssl: {
//     rejectUnauthorized: false
//   },
//   max: 20,
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 2000,
// });

// // Test connection
// pool.on('connect', () => {
//   console.log('✅ Connected to PostgreSQL database');
// });

// pool.on('error', (err) => {
//   console.error('❌ Unexpected error on idle client', err);
//   process.exit(-1);
// });

// // Create tables if they don't exist
// const initDB = async () => {
//   try {
//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS conversions (
//         id SERIAL PRIMARY KEY,
//         user_id VARCHAR(255) NOT NULL,
//         type VARCHAR(20) NOT NULL CHECK (type IN ('tts', 'asr')),
//         input_text TEXT,
//         output_text TEXT,
//         audio_url TEXT,
//         voice VARCHAR(50),
//         speed DECIMAL(3,2),
//         file_size BIGINT,
//         duration INTEGER,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       );
//     `);

//     await pool.query(`
//       CREATE INDEX IF NOT EXISTS idx_user_id ON conversions(user_id);
//     `);

//     await pool.query(`
//       CREATE INDEX IF NOT EXISTS idx_created_at ON conversions(created_at);
//     `);

//     await pool.query(`
//       CREATE INDEX IF NOT EXISTS idx_type ON conversions(type);
//     `);

//     console.log('✅ Database tables initialized');
//   } catch (error) {
//     console.error('❌ Error initializing database:', error);
//     throw error;
//   }
// };

// export { pool, initDB };