const { shortenUrlWithRetry } = require('./urlShortener');

/**
 * Processes a message and shortens all URLs found in it
 * @param {string} message - The original message
 * @param {string} apiKey - The user's API key
 * @returns {Promise<string>} - The message with shortened URLs
 */
async function processMessage(message, apiKey) {
    if (!message || typeof message !== 'string') {
        return message;
    }
    
    // Enhanced URL regex to capture various URL formats
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+|ftp:\/\/[^\s<>"{}|\\^`\[\]]+|www\.[^\s<>"{}|\\^`\[\]]+)/gi;
    
    const urls = message.match(urlRegex) || [];
    
    if (urls.length === 0) {
        return message;
    }
    
    console.log(`Found ${urls.length} URLs to process`);
    
    let processedMessage = message;
    
    // Process each URL
    for (const url of urls) {
        try {
            const cleanUrl = url.trim();
            console.log(`Processing URL: ${cleanUrl}`);
            
            // Check if URL already appears to be shortened (linkara.xyz domain)
            if (cleanUrl.includes('linkara.xyz')) {
                console.log(`Skipping already shortened URL: ${cleanUrl}`);
                continue;
            }
            
            const shortenedUrl = await shortenUrlWithRetry(cleanUrl, apiKey);
            
            // Replace the URL in the message
            if (shortenedUrl !== cleanUrl) {
                // Use a more precise replacement to avoid replacing partial matches
                const escapedUrl = cleanUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const urlRegexForReplace = new RegExp(escapedUrl, 'g');
                processedMessage = processedMessage.replace(urlRegexForReplace, shortenedUrl);
                console.log(`Replaced: ${cleanUrl} -> ${shortenedUrl}`);
            } else {
                console.log(`URL shortening failed for: ${cleanUrl}`);
            }
            
        } catch (error) {
            console.error(`Error processing URL ${url}:`, error.message);
            // Continue processing other URLs even if one fails
        }
    }
    
    return processedMessage;
}

/**
 * Extracts URLs from a message
 * @param {string} message - The message to extract URLs from
 * @returns {string[]} - Array of URLs found in the message
 */
function extractUrls(message) {
    if (!message || typeof message !== 'string') {
        return [];
    }
    
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+|ftp:\/\/[^\s<>"{}|\\^`\[\]]+|www\.[^\s<>"{}|\\^`\[\]]+)/gi;
    return message.match(urlRegex) || [];
}

/**
 * Validates if a string is a valid URL
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid URL
 */
function isValidUrl(url) {
    try {
        // Add protocol if missing for validation
        let testUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('ftp://')) {
            testUrl = 'https://' + url;
        }
        
        new URL(testUrl);
        return true;
    } catch (error) {
        return false;
    }
}

module.exports = {
    processMessage,
    extractUrls,
    isValidUrl
};
