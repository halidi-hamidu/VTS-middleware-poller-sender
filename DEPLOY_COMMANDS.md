# Production Deployment - Copy & Paste Commands

## 🚀 Quick Deploy (No .env files required!)

All environment variables are embedded in the compose files.

---

## Server 69 (Sender) - Deploy First

```bash
# Connect to server
ssh user@69.197.176.231

# Create directory
sudo mkdir -p /opt/traccar-middleware && cd /opt/traccar-middleware

# Download compose file
wget https://raw.githubusercontent.com/halidi-hamidu/VTS-middleware-poller-sender/main/docker-compose.server69.sender.prod.yml

# Configure firewall
sudo ufw allow from 93.127.139.107 to any port 4000
sudo ufw reload

# Create logs directory
mkdir -p logs

# Deploy
docker compose -f docker-compose.server69.sender.prod.yml pull
docker compose -f docker-compose.server69.sender.prod.yml up -d

# Verify
docker ps | grep sender
curl http://localhost:4000/health
docker compose -f docker-compose.server69.sender.prod.yml logs -f
```

---

## Server 93 (Poller) - Deploy Second

```bash
# Connect to server
ssh user@93.127.139.107

# Create directory and logs folder
sudo mkdir -p /opt/traccar-middleware && cd /opt/traccar-middleware
mkdir -p logs

# Verify Traccar is running
curl http://localhost:8082/api/server

# Download compose file
wget https://raw.githubusercontent.com/halidi-hamidu/VTS-middleware-poller-sender/main/docker-compose.server93.poller.prod.yml

# Deploy (Docker will auto-create the volume)
docker compose -f docker-compose.server93.poller.prod.yml pull
docker compose -f docker-compose.server93.poller.prod.yml up -d

# Verify
docker ps | grep poller
curl http://localhost:2000/health
docker compose -f docker-compose.server93.poller.prod.yml logs -f
```

---

## Verify End-to-End

### Server 93 logs should show:
```
✅ Devices loaded: X
📡 Forwarded: Event | Device: XXX | PositionId: XXX
```

### Server 69 logs should show:
```
📡 Payload received from Traccar
✅ Successfully sent to Latra API
```

---

## Common Commands

### Update to Latest Version
```bash
# Server 93
cd /opt/traccar-middleware
docker compose -f docker-compose.server93.poller.prod.yml pull
docker compose -f docker-compose.server93.poller.prod.yml up -d

# Server 69
cd /opt/traccar-middleware
docker compose -f docker-compose.server69.sender.prod.yml pull
docker compose -f docker-compose.server69.sender.prod.yml up -d
```

### Restart Services
```bash
# Server 93
docker compose -f docker-compose.server93.poller.prod.yml restart

# Server 69
docker compose -f docker-compose.server69.sender.prod.yml restart
```

### Stop Services
```bash
# Server 93
docker compose -f docker-compose.server93.poller.prod.yml down

# Server 69
docker compose -f docker-compose.server69.sender.prod.yml down
```

### View Logs
```bash
# Server 93
docker compose -f docker-compose.server93.poller.prod.yml logs -f --tail=50

# Server 69
docker compose -f docker-compose.server69.sender.prod.yml logs -f --tail=50
```

---

## 🔧 Update Credentials

### Update Traccar Password (Server 93)
```bash
cd /opt/traccar-middleware
nano docker-compose.server93.poller.prod.yml
# Edit: - TRACCAR_PASSWORD=your_new_password
docker compose -f docker-compose.server93.poller.prod.yml up -d --force-recreate
```

### Update API Token (Server 69)
```bash
cd /opt/traccar-middleware
nano docker-compose.server69.sender.prod.yml
# Edit: - BSMART_API_TOKEN=your_new_token
docker compose -f docker-compose.server69.sender.prod.yml up -d --force-recreate
```

---

## 🆘 Troubleshooting

### Poller can't connect to Sender
```bash
# On Server 69
docker ps | grep sender
curl http://localhost:4000/health
sudo ufw allow from 93.127.139.107 to any port 4000

# On Server 93
curl http://69.197.176.231:4000/health
```

### Poller can't connect to Traccar
```bash
# On Server 93
systemctl status traccar
curl http://localhost:8082/api/server
# If not running: sudo systemctl start traccar
```

---

**📖 Full Documentation:** See [PRODUCTION_QUICK_DEPLOY.md](PRODUCTION_QUICK_DEPLOY.md)
