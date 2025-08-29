const { Pool } = require('pg');

/**
 * Database-based storage for user API keys using PostgreSQL
 * This provides persistent storage that survives bot restarts
 */

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Handle unexpected errors
pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
});

/**
 * Initialize the database: create tables if needed
 */
async function initializeDatabase() {
    const client = await pool.connect();
    try {
        console.log('✅ Connected to PostgreSQL database');

        await client.query(`
            CREATE TABLE IF NOT EXISTS user_api_keys (
                user_id BIGINT PRIMARY KEY,
                api_key TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS user_stats (
                user_id BIGINT PRIMARY KEY,
                total_urls_shortened INTEGER DEFAULT 0,
                first_use TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_use TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ Database tables initialized');
    } finally {
        client.release();
    }
}

/**
 * Sets the API key for a user
 */
async function setUserApiKey(userId, apiKey) {
    if (!userId || !apiKey) throw new Error('User ID and API key are required');

    await pool.query(`
        INSERT INTO user_api_keys (user_id, api_key, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id)
        DO UPDATE SET api_key = $2, updated_at = CURRENT_TIMESTAMP
    `, [userId, apiKey.trim()]);

    await pool.query(`
        INSERT INTO user_stats (user_id, last_use)
        VALUES ($1, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id)
        DO UPDATE SET last_use = CURRENT_TIMESTAMP
    `, [userId]);

    console.log(`✅ API key stored in database for user ${userId}`);
}

/**
 * Gets the API key for a user
 */
async function getUserApiKey(userId) {
    const result = await pool.query(
        'SELECT api_key FROM user_api_keys WHERE user_id = $1',
        [userId]
    );
    return result.rows.length > 0 ? result.rows[0].api_key : null;
}

/**
 * Checks if user has API key
 */
async function hasApiKey(userId) {
    const result = await pool.query(
        'SELECT 1 FROM user_api_keys WHERE user_id = $1',
        [userId]
    );
    return result.rowCount > 0;
}

/**
 * Removes a user's API key
 */
async function removeUserApiKey(userId) {
    const result = await pool.query(
        'DELETE FROM user_api_keys WHERE user_id = $1',
        [userId]
    );
    if (result.rowCount > 0) {
        console.log(`✅ API key removed from database for user ${userId}`);
        return true;
    }
    return false;
}

/**
 * Updates user statistics
 */
async function updateUserStats(userId, urlCount = 1) {
    await pool.query(`
        INSERT INTO user_stats (user_id, total_urls_shortened, last_use)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id)
        DO UPDATE SET 
            total_urls_shortened = user_stats.total_urls_shortened + $2,
            last_use = CURRENT_TIMESTAMP
    `, [userId, urlCount]);
}

/**
 * Gets user statistics
 */
async function getUserStats(userId) {
    const result = await pool.query(
        'SELECT * FROM user_stats WHERE user_id = $1',
        [userId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Gets total number of users
 */
async function getTotalUsers() {
    const result = await pool.query('SELECT COUNT(*) FROM user_api_keys');
    return parseInt(result.rows[0].count, 10);
}

/**
 * Gets all user IDs
 */
async function getAllUserIds() {
    const result = await pool.query('SELECT user_id FROM user_api_keys');
    return result.rows.map(row => row.user_id);
}

/**
 * Closes pool (cleanup on shutdown)
 */
async function closeDatabase() {
    await pool.end();
    console.log('✅ Database pool closed');
}

module.exports = {
    initializeDatabase,
    setUserApiKey,
    getUserApiKey,
    hasApiKey,
    removeUserApiKey,
    updateUserStats,
    getUserStats,
    getTotalUsers,
    getAllUserIds,
    closeDatabase
};
