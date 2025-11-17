# YallaBets VIP Bot

Telegram bot with subscription system using Telegram Stars.

## Features
- Telegram Stars payment integration
- Auto add/remove users from VIP channel
- Bilingual support (Arabic/English)
- Subscription management
- SQLite database

## Deployment on Render.com

1. Push this code to GitHub
2. Go to https://render.com
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Render will auto-detect the configuration
6. Add environment variable: BOT_TOKEN
7. Click "Create Web Service"

## Environment Variables

- `BOT_TOKEN`: Your Telegram bot token (required)
- `VIP_CHANNEL_ID`: VIP channel ID (default: -1003495823265)
- `FREE_CHANNEL`: Free channel username (default: @yallabets)
- `SUBSCRIPTION_PRICE`: Price in Stars (default: 20)
- `SUBSCRIPTION_DAYS`: Subscription duration (default: 30)

## Commands

- `/start` - Start the bot
- `/subscribe` - Subscribe to VIP
- `/status` - Check subscription status
- `/cancel` - Cancel subscription
- `/help` - Show help
