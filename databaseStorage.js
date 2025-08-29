const { Client } = require('pg');

/**
 * Database-based storage for user API keys using PostgreSQL
 * This provides persistent storage that survives bot restarts
 */

let client = null;

/**
 * Initialize the database connection and create tables if needed
 */
async function initializeDatabase() {
    if (client) {
        return client;
    }
    
    try {
        client = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        await client.connect();
        console.log('✅ Connected to PostgreSQL database');
        
        // Create tables if they don't exist
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
        return client;
        
    } catch (error) {
        console.error('❌ Database initialization error:', error);
        throw error;
    }
}

/**
 * Sets the API key for a user in the database
 * @param {number} userId - Telegram user ID
 * @param {string} apiKey - User's Linkara.xyz API key
 */
async function setUserApiKey(userId, apiKey) {
    try {
        await initializeDatabase();
        
        if (!userId || !apiKey) {
            throw new Error('User ID and API key are required');
        }
        
        // Insert or update API key
        await client.query(`
            INSERT INTO user_api_keys (user_id, api_key, updated_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id) 
            DO UPDATE SET api_key = $2, updated_at = CURRENT_TIMESTAMP
        `, [userId, apiKey.trim()]);
        
        // Initialize or update user stats
        await client.query(`
            INSERT INTO user_stats (user_id, last_use)
            VALUES ($1, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id)
            DO UPDATE SET last_use = CURRENT_TIMESTAMP
        `, [userId]);
        
        console.log(`✅ API key stored in database for user ${userId}`);
        
    } catch (error) {
        console.error('❌ Error storing API key:', error);
        throw error;
    }
}

/**
 * Gets the API key for a user from the database
 * @param {number} userId - Telegram user ID
 * @returns {string|null} - User's API key or null if not set
 */
async function getUserApiKey(userId) {
    try {
        await initializeDatabase();
        
        const result = await client.query(
            'SELECT api_key FROM user_api_keys WHERE user_id = $1',
            [userId]
        );
        
        return result.rows.length > 0 ? result.rows[0].api_key : null;
        
    } catch (error) {
        console.error('❌ Error getting API key:', error);
        return null;
    }
}

/**
 * Checks if a user has an API key set in the database
 * @param {number} userId - Telegram user ID
 * @returns {boolean} - True if user has API key set
 */
async function hasApiKey(userId) {
    try {
        await initializeDatabase();
        
        const result = await client.query(
            'SELECT 1 FROM user_api_keys WHERE user_id = $1',
            [userId]
        );
        
        return result.rows.length > 0;
        
    } catch (error) {
        console.error('❌ Error checking API key:', error);
        return false;
    }
}

/**
 * Removes the API key for a user from the database
 * @param {number} userId - Telegram user ID
 * @returns {boolean} - True if key was removed, false if didn't exist
 */
async function removeUserApiKey(userId) {
    try {
        await initializeDatabase();
        
        const result = await client.query(
            'DELETE FROM user_api_keys WHERE user_id = $1',
            [userId]
        );
        
        if (result.rowCount > 0) {
            console.log(`✅ API key removed from database for user ${userId}`);
            return true;
        }
        return false;
        
    } catch (error) {
        console.error('❌ Error removing API key:', error);
        return false;
    }
}

/**
 * Updates user statistics in the database
 * @param {number} userId - Telegram user ID
 * @param {number} urlCount - Number of URLs processed
 */
async function updateUserStats(userId, urlCount = 1) {
    try {
        await initializeDatabase();
        
        await client.query(`
            INSERT INTO user_stats (user_id, total_urls_shortened, last_use)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id)
            DO UPDATE SET 
                total_urls_shortened = user_stats.total_urls_shortened + $2,
                last_use = CURRENT_TIMESTAMP
        `, [userId, urlCount]);
        
    } catch (error) {
        console.error('❌ Error updating user stats:', error);
    }
}

/**
 * Gets user statistics from the database
 * @param {number} userId - Telegram user ID
 * @returns {object|null} - User stats object or null if not found
 */
async function getUserStats(userId) {
    try {
        await initializeDatabase();
        
        const result = await client.query(
            'SELECT * FROM user_stats WHERE user_id = $1',
            [userId]
        );
        
        return result.rows.length > 0 ? result.rows[0] : null;
        
    } catch (error) {
        console.error('❌ Error getting user stats:', error);
        return null;
    }
}

/**
 * Gets the total number of registered users from the database
 * @returns {number} - Number of users with API keys
 */
async function getTotalUsers() {
    try {
        await initializeDatabase();
        
        const result = await client.query('SELECT COUNT(*) FROM user_api_keys');
        return parseInt(result.rows[0].count);
        
    } catch (error) {
        console.error('❌ Error getting total users:', error);
        return 0;
    }
}

/**
 * Gets all user IDs from the database (for admin purposes)
 * @returns {number[]} - Array of user IDs
 */
async function getAllUserIds() {
    try {
        await initializeDatabase();
        
        const result = await client.query('SELECT user_id FROM user_api_keys');
        return result.rows.map(row => row.user_id);
        
    } catch (error) {
        console.error('❌ Error getting all user IDs:', error);
        return [];
    }
}

/**
 * Closes the database connection (for cleanup)
 */
async function closeDatabase() {
    if (client) {
        await client.end();
        client = null;
        console.log('✅ Database connection closed');
    }
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