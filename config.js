require('dotenv').config();

const config = {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    LINKARA_API_BASE_URL: 'https://linkara.xyz/api',
    REQUEST_TIMEOUT: 10000, // 10 seconds
    MAX_RETRIES: 3
};

// Validate required environment variables
if (!config.TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN environment variable is required');
    process.exit(1);
}

module.exports = config;
