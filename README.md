# Donut Bot

TypeScript Discord bot with slash commands.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Add your bot credentials to `.env`:
```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
GUILD_ID=your_guild_id  # optional
```

## Run

First time setup:
```bash
pnpm run register
```

Then start dev server with hot reload:
```bash
pnpm run dev
```

## Commands

- `/ping` - Check bot latency
- `/info` - Bot information
