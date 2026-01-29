# Moltbot Coolify Command Cheatsheet

## Quick Reference

All commands are run from your Coolify server SSH session.

### Container Management

```bash
# View container logs
sudo docker logs --tail 100 $(sudo docker ps -q --filter name=moltbot)

# Follow logs in real-time
sudo docker logs -f $(sudo docker ps -q --filter name=moltbot)

# Restart container (apply config changes)
sudo docker restart $(sudo docker ps -q --filter name=moltbot)

# Get container shell
sudo docker exec -it $(sudo docker ps -q --filter name=moltbot) /bin/sh
```

### Device Pairing (Control UI Access)

```bash
# List pending and paired devices
sudo docker exec $(sudo docker ps -q --filter name=moltbot) node dist/index.js devices list

# Approve a pending device (use requestId from list)
sudo docker exec $(sudo docker ps -q --filter name=moltbot) node dist/index.js devices approve <requestId>

# Reject a pending device
sudo docker exec $(sudo docker ps -q --filter name=moltbot) node dist/index.js devices reject <requestId>
```

### Telegram Pairing

```bash
# List pending Telegram pairing requests
sudo docker exec $(sudo docker ps -q --filter name=moltbot) node dist/index.js pairing list telegram

# Approve a Telegram user (use code from bot message)
sudo docker exec $(sudo docker ps -q --filter name=moltbot) node dist/index.js pairing approve telegram <CODE>
```

### Configuration

```bash
# View current config
sudo docker exec $(sudo docker ps -q --filter name=moltbot) cat /home/node/.moltbot/moltbot.json

# Edit config interactively
sudo docker exec -it $(sudo docker ps -q --filter name=moltbot) node dist/index.js config edit

# Run doctor to fix config issues
sudo docker exec $(sudo docker ps -q --filter name=moltbot) node dist/index.js doctor --fix
```

### Gateway Status

```bash
# Check gateway status
sudo docker exec $(sudo docker ps -q --filter name=moltbot) node dist/index.js gateway status

# Check health endpoint
curl http://localhost:18889/health
```

### Troubleshooting

```bash
# Fix permissions if you get EACCES errors
sudo docker exec $(sudo docker ps -q --filter name=moltbot) chown -R node:node /home/node/.moltbot /home/node/.clawdbot

# Fix Telegram credentials permissions (if pairing keeps failing)
sudo docker exec $(sudo docker ps -q --filter name=moltbot) chown -R node:node /home/node/.clawdbot/credentials/

# Check what's in the config directory
sudo docker exec $(sudo docker ps -q --filter name=moltbot) ls -la /home/node/.moltbot/

# Check what's in the legacy directory
sudo docker exec $(sudo docker ps -q --filter name=moltbot) ls -la /home/node/.clawdbot/

# Check credentials directory permissions
sudo docker exec $(sudo docker ps -q --filter name=moltbot) ls -la /home/node/.clawdbot/credentials/
```

## Shell Alias (Optional)

Add this to your server's `~/.bashrc` for shorter commands:

```bash
echo 'moltbot() { sudo docker exec -it $(sudo docker ps -q --filter name=moltbot) node dist/index.js "$@"; }' >> ~/.bashrc
source ~/.bashrc
```

Then you can use:
```bash
moltbot devices list
moltbot pairing approve telegram <CODE>
moltbot config edit
moltbot doctor --fix
```

## Inside Coolify Terminal

When using Coolify's built-in terminal (which drops you inside the container), use:

```bash
moltbot devices list
moltbot pairing approve telegram <CODE>
moltbot config edit
```

Or the full command:
```bash
node dist/index.js devices list
node dist/index.js pairing approve telegram <CODE>
```

## Common Issues

### "pairing required" errors
1. Refresh your browser at https://moltbot.sololink.cloud
2. Run `devices list` to see pending requests
3. Approve the pending request with `devices approve <requestId>`

### "token_mismatch" errors
- Clear browser local storage for moltbot.sololink.cloud
- Or open in incognito window

### Telegram not responding / pairing keeps failing
1. Send a message to the bot to get a pairing code
2. Approve with `pairing approve telegram <CODE>`
3. If it keeps asking for pairing, check credentials permissions:
   ```bash
   sudo docker exec $(sudo docker ps -q --filter name=moltbot) ls -la /home/node/.clawdbot/credentials/
   ```
4. If any files are owned by `root`, fix permissions:
   ```bash
   sudo docker exec $(sudo docker ps -q --filter name=moltbot) chown -R node:node /home/node/.clawdbot/credentials/
   ```

### Config changes not taking effect
- Restart the container: `sudo docker restart $(sudo docker ps -q --filter name=moltbot)`

## Environment Variables (set in Coolify UI)

| Variable | Required | Description |
|----------|----------|-------------|
| `GATEWAY_TOKEN` | Yes | Secure random token for gateway auth |
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot token from @BotFather |
| `ELEVENLABS_API_KEY` | No | ElevenLabs API key for voice |
| `BRAVE_API_KEY` | No | Brave Search API key |
