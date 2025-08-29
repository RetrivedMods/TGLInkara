/**
 * In-memory storage for user API keys
 * This is a simple implementation for demonstration purposes
 * In production, consider using a persistent database
 */

// Map to store user API keys: userId -> apiKey
const userApiKeys = new Map();

// Map to store user statistics (optional)
const userStats = new Map();

/**
 * Sets the API key for a user
 * @param {number} userId - Telegram user ID
 * @param {string} apiKey - User's Linkara.xyz API key
 */
function setUserApiKey(userId, apiKey) {
    if (!userId || !apiKey) {
        throw new Error('User ID and API key are required');
    }
    
    userApiKeys.set(userId, apiKey.trim());
    
    // Initialize user stats if not exists
    if (!userStats.has(userId)) {
        userStats.set(userId, {
            totalUrlsShortened: 0,
            firstUse: new Date(),
            lastUse: new Date()
        });
    }
    
    console.log(`API key set for user ${userId}`);
}

/**
 * Gets the API key for a user
 * @param {number} userId - Telegram user ID
 * @returns {string|null} - User's API key or null if not set
 */
function getUserApiKey(userId) {
    return userApiKeys.get(userId) || null;
}

/**
 * Checks if a user has an API key set
 * @param {number} userId - Telegram user ID
 * @returns {boolean} - True if user has API key set
 */
function hasApiKey(userId) {
    return userApiKeys.has(userId);
}

/**
 * Removes the API key for a user
 * @param {number} userId - Telegram user ID
 * @returns {boolean} - True if key was removed, false if didn't exist
 */
function removeUserApiKey(userId) {
    const removed = userApiKeys.delete(userId);
    if (removed) {
        console.log(`API key removed for user ${userId}`);
    }
    return removed;
}

/**
 * Updates user statistics
 * @param {number} userId - Telegram user ID
 * @param {number} urlCount - Number of URLs processed
 */
function updateUserStats(userId, urlCount = 1) {
    if (userStats.has(userId)) {
        const stats = userStats.get(userId);
        stats.totalUrlsShortened += urlCount;
        stats.lastUse = new Date();
        userStats.set(userId, stats);
    }
}

/**
 * Gets user statistics
 * @param {number} userId - Telegram user ID
 * @returns {object|null} - User stats object or null if not found
 */
function getUserStats(userId) {
    return userStats.get(userId) || null;
}

/**
 * Gets the total number of registered users
 * @returns {number} - Number of users with API keys
 */
function getTotalUsers() {
    return userApiKeys.size;
}

/**
 * Clears all user data (for maintenance purposes)
 */
function clearAllUserData() {
    userApiKeys.clear();
    userStats.clear();
    console.log('All user data cleared');
}

/**
 * Gets all user IDs (for admin purposes)
 * @returns {number[]} - Array of user IDs
 */
function getAllUserIds() {
    return Array.from(userApiKeys.keys());
}

module.exports = {
    setUserApiKey,
    getUserApiKey,
    hasApiKey,
    removeUserApiKey,
    updateUserStats,
    getUserStats,
    getTotalUsers,
    clearAllUserData,
    getAllUserIds
};
