# Overview

This is a Telegram bot that integrates with the Linkara.xyz URL shortening service. The bot processes messages from users, automatically detects URLs within those messages, and replaces them with shortened versions while preserving the original message structure. Users must provide their own Linkara.xyz API key to use the service.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Bot Framework
- **Node.js Telegram Bot**: Built using the `node-telegram-bot-api` library for handling Telegram bot interactions
- **Polling-based**: Uses polling to receive messages from Telegram (as opposed to webhooks)
- **Command-driven**: Supports slash commands (`/start`, `/help`, `/api`, `/balance`) for user interaction

## Message Processing Pipeline
- **URL Detection**: Uses regex patterns to identify various URL formats (HTTP/HTTPS/FTP and www domains)
- **Sequential Processing**: URLs are processed one by one to avoid rate limiting and ensure reliability
- **Smart Replacement**: URLs are replaced in-place within the original message structure
- **Skip Logic**: Already shortened Linkara.xyz URLs are automatically skipped to prevent double-processing

## Error Handling & Reliability
- **Retry Mechanism**: Implements retry logic for failed API requests with configurable max retries
- **Timeout Protection**: HTTP requests have configurable timeouts to prevent hanging
- **Input Validation**: Validates environment variables and user inputs before processing
- **Graceful Degradation**: Failed URL shortening attempts preserve the original URL in the message

## Data Storage
- **PostgreSQL Database**: Uses Replit's built-in PostgreSQL database for persistent storage of user API keys and statistics
- **Permanent Storage**: Data persists across bot restarts and deployments
- **User Isolation**: Each user's API key is stored separately and securely associated with their Telegram user ID
- **Database Tables**: 
  - `user_api_keys`: Stores user ID, API key, and timestamps
  - `user_stats`: Tracks URL shortening statistics and usage patterns

## Configuration Management
- **Environment Variables**: Critical settings like bot token are loaded from environment variables
- **Centralized Config**: All configuration values are managed through a single config file
- **Validation**: Required environment variables are validated at startup

# External Dependencies

## Primary Services
- **Telegram Bot API**: Core platform for bot functionality and message handling
- **Linkara.xyz API**: Third-party URL shortening service that requires user API keys

## Node.js Libraries
- **node-telegram-bot-api**: Telegram bot framework for Node.js
- **axios**: HTTP client for making API requests to Linkara.xyz
- **dotenv**: Environment variable management for configuration

## API Integration Details
- **Linkara.xyz API**: RESTful API using GET requests with query parameters
- **API Key Authentication**: Each user must provide their own API key for URL shortening and balance checking
- **Rate Limiting Consideration**: Sequential processing and retry logic to handle potential rate limits
- **Response Format**: Expects JSON responses with success/error status indicators
- **Balance API**: Supports fetching user account balance, earnings, and statistics via `/api/user/balance` endpoint