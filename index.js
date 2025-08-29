const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const config = require('./config');
const { shortenUrl } = require('./urlShortener');
const { processMessage } = require('./messageProcessor');
const { setUserApiKey, getUserApiKey, hasApiKey, updateUserStats, getTotalUsers, initializeDatabase } = require('./databaseStorage');

/**
 * Fetches user balance from Linkara.xyz API
 * @param {string} apiKey - The user's API key
 * @returns {Promise<object|null>} - The balance data or null if failed
 */
async function fetchUserBalance(apiKey) {
    try {
        const response = await axios.get(`https://linkara.xyz/api/user/balance?api=${apiKey}`, {
            timeout: config.REQUEST_TIMEOUT,
            headers: {
                'User-Agent': 'Telegram-URL-Shortener-Bot/1.0'
            }
        });
        
        console.log('Balance API response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching balance:', error.message);
        if (error.response) {
            console.error('Balance API Error Response:', error.response.data);
        }
        return null;
    }
}

// Initialize bot
const bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: true });

// Initialize database on startup
(async () => {
    try {
        await initializeDatabase();
        console.log('✅ Telegram URL Shortener Bot started with database...');
    } catch (error) {
        console.error('❌ Failed to initialize database:', error);
        process.exit(1);
    }
})();
// --- Health check server (no express needed) ---
const http = require("http");

const PORT = process.env.PORT || 8000;

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("✅ Telegram URL Shortener Bot is running");
}).listen(PORT, () => {
  console.log(`🌍 Health check server running on port ${PORT}`);
});



// Command handlers
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `
*🔗 Welcome to URL Shortener Bot!*

I help you *shorten URLs* instantly using the *Linkara.xyz API*.

✨ *Available Commands:*
• */start* – Show this welcome message  
• */api <your-api-key>* – Set your *Linkara.xyz API key*  
• */balance* – Check your *account balance*  
• */help* – Show help information  

🚀 *How to Get Started:*  
1️⃣ Get your *API key* from [Linkara.xyz](https://linkara.xyz/member/tools/api)  
2️⃣ Set it using */api command*  
3️⃣ Send me any message with URLs – I’ll *shorten them automatically* 🎯  

💡 _The bot keeps your original message structure while replacing URLs with shortened versions._
    `;

    bot.sendMessage(chatId, welcomeMessage, { parse_mode: "MarkdownV2" });
});


// Command handlers
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
📚 *Help - URL Shortener Bot*

✨ *Commands:*
• */start* – Welcome message and setup instructions  
• */api <your-api-key>* – Set your *Linkara.xyz API key*  
• */balance* – Check your *account balance*  
• */help* – Show this help message  

⚙️ *Usage:*  
1️⃣ Set your API key: \`/api your-api-key-here\`  
2️⃣ Send any message containing URLs  
3️⃣ Bot will reply with the same message but with *shortened URLs*  

🔑 Need an API key? Get it here 👉 [Linkara.xyz](https://linkara.xyz/member/tools/api)
    `;

    bot.sendMessage(chatId, helpMessage, { parse_mode: "MarkdownV2" });
});

bot.onText(/\/api (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const apiKey = match[1].trim();
    
    console.log(`API key command received from user ${userId}`);
    
    if (!apiKey) {
        bot.sendMessage(chatId, '❌ Please provide a valid API key.\nUsage: /api your-api-key');
        return;
    }
    
    try {
        // Store the API key for the user in database
        await setUserApiKey(userId, apiKey);
        const totalUsers = await getTotalUsers();
        console.log(`API key stored for user ${userId}. Total users: ${totalUsers}`);
        
        bot.sendMessage(chatId, '✅ API key set successfully! You can now send messages with URLs to shorten them.');
    } catch (error) {
        console.error('Error storing API key:', error);
        bot.sendMessage(chatId, '❌ Error storing API key. Please try again.');
    }
});

bot.onText(/\/balance/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    console.log(`Balance command received from user ${userId}`);
    
    // Check if user has set API key
    if (!(await hasApiKey(userId))) {
        bot.sendMessage(chatId, '❌ Please set your API key first using /api command.\nExample: /api your-api-key');
        return;
    }
    
    try {
        const apiKey = await getUserApiKey(userId);
        const balanceData = await fetchUserBalance(apiKey);
        
        if (balanceData) {
            const message = `💰 Account Overview\n\n👤 Username: ${balanceData.username}\n💵 Currency: ${balanceData.currency}`;
            
            // Calculate CPM values
            const todayCPM = balanceData.today.views > 0 ? (balanceData.today.earnings / balanceData.today.views * 1000).toFixed(3) : '0.000';
            const monthCPM = balanceData.this_month.views > 0 ? (balanceData.this_month.earnings / balanceData.this_month.views * 1000).toFixed(3) : '0.000';
            
            const keyboard = {
                inline_keyboard: [
                    [
                        { text: `📈 Today: ${balanceData.today.views} views`, callback_data: `today_${userId}` },
                        { text: `💰 Today: $${balanceData.today.earnings}`, callback_data: `today_earnings_${userId}` }
                    ],
                    [
                        { text: `📊 Today CPM: $${todayCPM}`, callback_data: `today_cpm_${userId}` }
                    ],
                    [
                        { text: `📅 Month: ${balanceData.this_month.views} views`, callback_data: `month_${userId}` },
                        { text: `💵 Month: $${balanceData.this_month.earnings}`, callback_data: `month_earnings_${userId}` }
                    ],
                    [
                        { text: `📈 Month CPM: $${monthCPM}`, callback_data: `month_cpm_${userId}` }
                    ],
                    [
                        { text: `💰 Balance Details`, callback_data: `balance_${userId}` }
                    ]
                ]
            };
            
            console.log('Sending message with inline keyboard:', JSON.stringify(keyboard, null, 2));
            
            const options = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: `📈 Today: ${balanceData.today.views} views`, callback_data: `today_${userId}` },
                            { text: `💰 Today: $${balanceData.today.earnings}`, callback_data: `today_earnings_${userId}` }
                        ],
                        [
                            { text: `📊 Today CPM: $${todayCPM}`, callback_data: `today_cpm_${userId}` }
                        ],
                        [
                            { text: `📅 Month: ${balanceData.this_month.views} views`, callback_data: `month_${userId}` },
                            { text: `💵 Month: $${balanceData.this_month.earnings}`, callback_data: `month_earnings_${userId}` }
                        ],
                        [
                            { text: `📈 Month CPM: $${monthCPM}`, callback_data: `month_cpm_${userId}` }
                        ],
                        [
                            { text: `💰 Balance Details`, callback_data: `balance_${userId}` }
                        ]
                    ]
                }
            };
            
            bot.sendMessage(chatId, message, options);
        } else {
            bot.sendMessage(chatId, '❌ Unable to fetch balance. Please check your API key.');
        }
    } catch (error) {
        console.error('Error fetching balance:', error);
        bot.sendMessage(chatId, '❌ Error fetching balance. Please try again or check your API key.');
    }
});

// Handle inline keyboard button clicks
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;
    
    console.log(`Callback query received: ${data} from user ${userId}`);
    
    // Check if user has set API key
    if (!(await hasApiKey(userId))) {
        bot.answerCallbackQuery(callbackQuery.id, { text: 'Please set your API key first using /api command' });
        return;
    }
    
    try {
        const apiKey = await getUserApiKey(userId);
        const balanceData = await fetchUserBalance(apiKey);
        
        if (!balanceData) {
            bot.answerCallbackQuery(callbackQuery.id, { text: 'Error fetching balance data' });
            return;
        }
        
        let responseText = '';
        
        if (data.startsWith('today_')) {
            if (data.includes('earnings')) {
                responseText = `📈 Today's Performance:\n\n💰 Earnings: $${balanceData.today.earnings}\n📊 Views: ${balanceData.today.views}\n📈 Average per view: $${balanceData.today.views > 0 ? (balanceData.today.earnings / balanceData.today.views).toFixed(6) : '0.000000'}`;
            } else if (data.includes('cpm')) {
                const cpm = balanceData.today.views > 0 ? (balanceData.today.earnings / balanceData.today.views * 1000).toFixed(3) : '0.000';
                responseText = `📊 Today's CPM Analysis:\n\n💵 CPM: $${cpm}\n📈 Views: ${balanceData.today.views}\n💰 Earnings: $${balanceData.today.earnings}\n\nCPM = Cost Per Mille (per 1000 views)`;
            } else {
                responseText = `📈 Today's Views:\n\n👁️ Total Views: ${balanceData.today.views}\n💰 Earnings: $${balanceData.today.earnings}\n📊 Revenue per view: $${balanceData.today.views > 0 ? (balanceData.today.earnings / balanceData.today.views).toFixed(6) : '0.000000'}`;
            }
        } else if (data.startsWith('month_')) {
            if (data.includes('earnings')) {
                responseText = `📅 This Month's Performance:\n\n💰 Total Earnings: $${balanceData.this_month.earnings}\n📊 Total Views: ${balanceData.this_month.views}\n📈 Average per view: $${balanceData.this_month.views > 0 ? (balanceData.this_month.earnings / balanceData.this_month.views).toFixed(6) : '0.000000'}`;
            } else if (data.includes('cpm')) {
                const cpm = balanceData.this_month.views > 0 ? (balanceData.this_month.earnings / balanceData.this_month.views * 1000).toFixed(3) : '0.000';
                responseText = `📊 This Month's CPM Analysis:\n\n💵 CPM: $${cpm}\n📈 Total Views: ${balanceData.this_month.views}\n💰 Total Earnings: $${balanceData.this_month.earnings}\n\nCPM = Cost Per Mille (per 1000 views)`;
            } else {
                responseText = `📅 This Month's Views:\n\n👁️ Total Views: ${balanceData.this_month.views}\n💰 Earnings: $${balanceData.this_month.earnings}\n📊 Revenue per view: $${balanceData.this_month.views > 0 ? (balanceData.this_month.earnings / balanceData.this_month.views).toFixed(6) : '0.000000'}`;
            }
        } else if (data.startsWith('balance_')) {
            responseText = `💰 Balance Details:\n\n📊 Publisher Earnings: $${balanceData.balances.publisher_earnings}\n🤝 Referral Earnings: $${balanceData.balances.referral_earnings}\n📢 Advertiser Balance: $${balanceData.balances.advertiser_balance}\n💳 Wallet Money: $${balanceData.balances.wallet_money}\n\n💵 Total Available: $${(balanceData.balances.publisher_earnings + balanceData.balances.referral_earnings + balanceData.balances.advertiser_balance + balanceData.balances.wallet_money).toFixed(3)}`;
        }
        
        // Send the detailed response
        bot.sendMessage(chatId, responseText);
        bot.answerCallbackQuery(callbackQuery.id);
        
    } catch (error) {
        console.error('Error handling callback query:', error);
        bot.answerCallbackQuery(callbackQuery.id, { text: 'Error processing request' });
    }
});

// Message handler for URL shortening
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const messageText = msg.text;
    
    // Skip if it's a command
    if (messageText && messageText.startsWith('/')) {
        return;
    }
    
    // Check if user has set API key
    const userHasKey = await hasApiKey(userId);
    console.log(`Checking API key for user ${userId}. Has key: ${userHasKey}`);
    if (!userHasKey) {
        bot.sendMessage(chatId, '❌ Please set your API key first using /api command.\nExample: /api your-api-key');
        return;
    }
    
    // Check if message contains URLs
    const urlRegex = /(https?:\/\/[^\s]+|ftp:\/\/[^\s]+|www\.[^\s]+)/gi;
    if (!messageText || !urlRegex.test(messageText)) {
        return; // No URLs found, ignore the message
    }
    
    try {
        const apiKey = await getUserApiKey(userId);
        const processedMessage = await processMessage(messageText, apiKey);
        
        if (processedMessage !== messageText) {
            bot.sendMessage(chatId, processedMessage);
        } else {
            bot.sendMessage(chatId, '❌ No URLs could be shortened. Please check your message and API key.');
        }
    } catch (error) {
        console.error('Error processing message:', error);
        bot.sendMessage(chatId, '❌ Error processing URLs. Please try again or check your API key.');
    }
});

// Error handling
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

bot.on('error', (error) => {
    console.error('Bot error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down bot...');
    bot.stopPolling();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Shutting down bot...');
    bot.stopPolling();
    process.exit(0);
});
