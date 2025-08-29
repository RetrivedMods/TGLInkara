const axios = require('axios');
const config = require('./config');

/**
 * Shortens a URL using the Linkara.xyz API
 * @param {string} url - The URL to shorten
 * @param {string} apiKey - The user's API key
 * @param {string} alias - Optional custom alias
 * @returns {Promise<string>} - The shortened URL
 */
async function shortenUrl(url, apiKey, alias = '') {
    try {
        // Ensure URL has protocol
        let processedUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('ftp://')) {
            processedUrl = 'https://' + url;
        }
        
        // Build API request URL
        const params = new URLSearchParams({
            api: apiKey,
            url: processedUrl
        });
        
        if (alias) {
            params.append('alias', alias);
        }
        
        const apiUrl = `${config.LINKARA_API_BASE_URL}?${params.toString()}`;
        
        console.log(`Shortening URL: ${processedUrl}`);
        
        const response = await axios.get(apiUrl, {
            timeout: config.REQUEST_TIMEOUT,
            headers: {
                'User-Agent': 'Telegram-URL-Shortener-Bot/1.0'
            }
        });
        
        const data = response.data;
        
        if (data.status === 'success' && data.shortenedUrl) {
            console.log(`Successfully shortened: ${processedUrl} -> ${data.shortenedUrl}`);
            return data.shortenedUrl;
        } else {
            console.error('API returned unsuccessful status:', data);
            throw new Error(`API Error: ${data.message || 'Unknown error'}`);
        }
        
    } catch (error) {
        console.error('Error shortening URL:', error.message);
        
        if (error.response) {
            console.error('API Response:', error.response.data);
            throw new Error(`API Error: ${error.response.status} - ${error.response.statusText}`);
        } else if (error.request) {
            throw new Error('Network error: Unable to reach URL shortening service');
        } else {
            throw new Error(`Error: ${error.message}`);
        }
    }
}

/**
 * Attempts to shorten URL with retries
 * @param {string} url - The URL to shorten
 * @param {string} apiKey - The user's API key
 * @param {string} alias - Optional custom alias
 * @param {number} retries - Number of retries remaining
 * @returns {Promise<string>} - The shortened URL or original URL if failed
 */
async function shortenUrlWithRetry(url, apiKey, alias = '', retries = config.MAX_RETRIES) {
    try {
        return await shortenUrl(url, apiKey, alias);
    } catch (error) {
        if (retries > 0) {
            console.log(`Retrying URL shortening. Retries left: ${retries - 1}`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            return await shortenUrlWithRetry(url, apiKey, alias, retries - 1);
        } else {
            console.error(`Failed to shorten URL after ${config.MAX_RETRIES} attempts:`, url);
            return url; // Return original URL if all retries failed
        }
    }
}

module.exports = {
    shortenUrl,
    shortenUrlWithRetry
};
