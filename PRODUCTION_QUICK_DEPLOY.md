# Production Deployment - Quick Guide (No .env Required)

## Overview

This guide shows you how to deploy the VTS Middleware on production servers **without using .env files**. All configuration is embedded directly in the docker-compose files.

---

## 🎯 Deployment Architecture

```
Server 93 (93.127.139.107)          Server 69 (69.197.176.231)
┌──────────────────────┐            ┌──────────────────────┐
│  Traccar :8082       │            │                      │
│  (localhost)         │            │                      │
└──────────┬───────────┘            │                      │
           │                         │                      │
           ↓                         │                      │
┌──────────────────────┐            │                      │
│  Poller :2000        │────────────→  Sender :4000        │
│  Docker Container    │            │  Docker Container    │
└──────────────────────┘            └──────────┬───────────┘
                                               │
                                               ↓
                                    ┌─────────────────────┐
                                    │  BSMART/Latra API   │
                                    │  vts.latra.go.tz    │
                                    └─────────────────────┘
```

---

## 📋 Prerequisites

### Server 93
- ✅ Docker & Docker Compose installed
- ✅ Traccar running on localhost:8082
- ✅ Network access to Server 69 on port 4000
- ✅ Git installed (optional, for cloning repo)

### Server 69
- ✅ Docker & Docker Compose installed
- ✅ Port 4000 available
- ✅ Network access to BSMART/Latra API
- ✅ Git installed (optional, for cloning repo)

---

## 🚀 Part 1: Deploy Sender on Server 69 (Deploy First!)

### Step 1.1: Connect to Server 69
```bash
ssh user@69.197.176.231
```

### Step 1.2: Create Deployment Directory
```bash
sudo mkdir -p /opt/traccar-middleware
cd /opt/traccar-middleware
```

### Step 1.3: Get the Docker Compose File

**Option A: Clone from GitHub**
```bash
git clone https://github.com/halidi-hamidu/VTS-middleware-poller-sender.git .
```

**Option B: Download Directly**
```bash
wget https://raw.githubusercontent.com/halidi-hamidu/VTS-middleware-poller-sender/main/docker-compose.server69.sender.prod.yml
```

**Option C: Create Manually**
```bash
cat > docker-compose.server69.sender.prod.yml << 'EOF'
# Production Docker Compose for Server 69 (69.197.176.231)
# Runs ONLY Sender Service
# NO .env FILE REQUIRED

services:
  sender:
    image: ghcr.io/halidi-hamidu/vts-middleware-sender:latest
    container_name: traccar-sender-prod
    restart: unless-stopped
    network_mode: host
    
    environment:
      - NODE_ENV=production
      - PORT=4000
      - BSMART_API_URL=http://vts.latra.go.tz:8090/data-integration/integration/gps
      - BSMART_API_TOKEN=d2ViY29ycGx0ZDp3ZWJjMHJwQDIwMjU=
    
    volumes:
      - ./logs:/app/logs
    
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 128M
    
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
    
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    
    security_opt:
      - no-new-privileges:true
EOF
```

### Step 1.4: Configure Firewall
```bash
# Allow incoming connections on port 4000 from Server 93
sudo ufw allow from 93.127.139.107 to any port 4000 comment 'Traccar Poller'
sudo ufw reload
sudo ufw status
```

### Step 1.5: Create Logs Directory
```bash
mkdir -p /opt/traccar-middleware/logs
```

### Step 1.6: Deploy Sender
```bash
# Pull the latest image
docker compose -f docker-compose.server69.sender.prod.yml pull

# Start the service
docker compose -f docker-compose.server69.sender.prod.yml up -d

# Check status
docker compose -f docker-compose.server69.sender.prod.yml ps
```

### Step 1.7: Verify Sender is Running
```bash
# Check container status
docker ps | grep sender

# Check logs
docker compose -f docker-compose.server69.sender.prod.yml logs -f

# Test health endpoint (press Ctrl+C to exit logs first)
curl http://localhost:4000/health

# Expected output:
# {"status":"OK","timestamp":"...","total_devices_tracked":0}

# Test from external network (optional)
curl http://69.197.176.231:4000/health
```

**✅ Server 69 is ready! Sender is running.**

---

## 🚀 Part 2: Deploy Poller on Server 93

### Step 2.1: Connect to Server 93
```bash
ssh user@93.127.139.107
```

### Step 2.2: Verify Traccar is Running
```bash
# Test Traccar API
curl http://localhost:8082/api/server

# Should return JSON with server info
# If it fails, start Traccar first:
# sudo systemctl start traccar
```

### Step 2.3: Create Deployment Directory
```bash
sudo mkdir -p /opt/traccar-middleware
cd /opt/traccar-middleware
```

### Step 2.4: Create Required Directories
```bash
# Create directory for poller persistent data
sudo mkdir -p /var/lib/traccar-poller
sudo chmod 755 /var/lib/traccar-poller

# Create logs directory
mkdir -p /opt/traccar-middleware/logs
```

### Step 2.5: Get the Docker Compose File

**Option A: Clone from GitHub**
```bash
git clone https://github.com/halidi-hamidu/VTS-middleware-poller-sender.git .
```

**Option B: Download Directly**
```bash
wget https://raw.githubusercontent.com/halidi-hamidu/VTS-middleware-poller-sender/main/docker-compose.server93.poller.prod.yml
```

**Option C: Create Manually**
```bash
cat > docker-compose.server93.poller.prod.yml << 'EOF'
# Production Docker Compose for Server 93 (93.127.139.107)
# Runs ONLY Poller Service
# NO .env FILE REQUIRED

services:
  poller:
    image: ghcr.io/halidi-hamidu/vts-middleware-poller:latest
    container_name: traccar-poller-prod
    restart: unless-stopped
    network_mode: host
    
    environment:
      - NODE_ENV=production
      - PORT=2000
      - TRACCAR_BASE=http://localhost:8082/api
      - TRACCAR_USERNAME=admin
      - TRACCAR_PASSWORD=admin
      - TUNNEL_URL=http://69.197.176.231:4000/traccar/
    
    volumes:
      - poller-data:/app
      - ./logs:/app/logs
    
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 128M
    
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:2000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
    
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    
    security_opt:
      - no-new-privileges:true

volumes:
  poller-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /var/lib/traccar-poller
EOF
```

### Step 2.6: Test Connectivity to Sender
```bash
# Test connection to Sender on Server 69
curl http://69.197.176.231:4000/health

# Should return:
# {"status":"OK",...}

# If it fails, check firewall on Server 69
```

### Step 2.7: Deploy Poller
```bash
# Pull the latest image
docker compose -f docker-compose.server93.poller.prod.yml pull

# Start the service
docker compose -f docker-compose.server93.poller.prod.yml up -d

# Check status
docker compose -f docker-compose.server93.poller.prod.yml ps
```

### Step 2.8: Verify Poller is Running
```bash
# Check container status
docker ps | grep poller

# Check logs
docker compose -f docker-compose.server93.poller.prod.yml logs -f

# Should see:
# ✅ Devices loaded: X
# 📡 Forwarded: Event | Device: XXX | PositionId: XXX

# Test health endpoint (Ctrl+C to exit logs first)
curl http://localhost:2000/health
```

**✅ Server 93 is ready! Poller is running and forwarding data.**

---

## 📊 Part 3: Verify End-to-End Flow

### On Server 93 (Poller)
```bash
# Watch poller logs
docker compose -f docker-compose.server93.poller.prod.yml logs -f --tail=50

# Look for:
# ✅ Devices loaded: X
# 📡 Forwarded: [Event] | Device: [Name] | PositionId: XXX
```

### On Server 69 (Sender)
```bash
# Watch sender logs
docker compose -f docker-compose.server69.sender.prod.yml logs -f --tail=50

# Look for:
# 📡 Payload received from Traccar
# 🎯 Activity IDs for event X: [...]
# ✅ Successfully sent to Latra API
```

### Check Device Counters
```bash
# On Server 69
curl http://localhost:4000/counters

# Should show device-specific message counts
```

---

## 🔧 Part 4: Common Operations

### Update Credentials

**Server 93 - Update Traccar Password:**
```bash
cd /opt/traccar-middleware
nano docker-compose.server93.poller.prod.yml

# Edit the TRACCAR_PASSWORD line:
# - TRACCAR_PASSWORD=your_new_password

# Recreate container
docker compose -f docker-compose.server93.poller.prod.yml up -d --force-recreate
```

**Server 69 - Update API Token:**
```bash
cd /opt/traccar-middleware
nano docker-compose.server69.sender.prod.yml

# Edit the BSMART_API_TOKEN line:
# - BSMART_API_TOKEN=your_new_token

# Recreate container
docker compose -f docker-compose.server69.sender.prod.yml up -d --force-recreate
```

### Update to Latest Version

**Server 93:**
```bash
cd /opt/traccar-middleware
docker compose -f docker-compose.server93.poller.prod.yml pull
docker compose -f docker-compose.server93.poller.prod.yml up -d
docker compose -f docker-compose.server93.poller.prod.yml logs -f
```

**Server 69:**
```bash
cd /opt/traccar-middleware
docker compose -f docker-compose.server69.sender.prod.yml pull
docker compose -f docker-compose.server69.sender.prod.yml up -d
docker compose -f docker-compose.server69.sender.prod.yml logs -f
```

### Restart Services

**Server 93:**
```bash
docker compose -f docker-compose.server93.poller.prod.yml restart
```

**Server 69:**
```bash
docker compose -f docker-compose.server69.sender.prod.yml restart
```

### Stop Services

**Server 93:**
```bash
docker compose -f docker-compose.server93.poller.prod.yml down
```

**Server 69:**
```bash
docker compose -f docker-compose.server69.sender.prod.yml down
```

### View Logs

**Server 93:**
```bash
# Real-time logs
docker compose -f docker-compose.server93.poller.prod.yml logs -f

# Last 100 lines
docker compose -f docker-compose.server93.poller.prod.yml logs --tail=100

# Save logs to file
docker compose -f docker-compose.server93.poller.prod.yml logs > poller-logs.txt
```

**Server 69:**
```bash
# Real-time logs
docker compose -f docker-compose.server69.sender.prod.yml logs -f

# Last 100 lines
docker compose -f docker-compose.server69.sender.prod.yml logs --tail=100

# Save logs to file
docker compose -f docker-compose.server69.sender.prod.yml logs > sender-logs.txt
```

---

## 🆘 Part 5: Troubleshooting

### Issue: Poller can't connect to Sender

**Symptoms:**
```
❌ Forwarding error: connect ECONNREFUSED 69.197.176.231:4000
❌ Forwarding error: connect ETIMEDOUT 69.197.176.231:4000
```

**Solution:**
```bash
# 1. Check sender is running on Server 69
ssh user@69.197.176.231
docker ps | grep sender
curl http://localhost:4000/health

# 2. Check firewall on Server 69
sudo ufw status
sudo ufw allow from 93.127.139.107 to any port 4000
sudo ufw reload

# 3. Test from Server 93
ssh user@93.127.139.107
curl http://69.197.176.231:4000/health
telnet 69.197.176.231 4000
```

### Issue: Poller can't connect to Traccar

**Symptoms:**
```
❌ Error fetching positions: connect ECONNREFUSED 127.0.0.1:8082
```

**Solution:**
```bash
# 1. Check Traccar is running
systemctl status traccar
curl http://localhost:8082/api/server

# 2. Start Traccar if needed
sudo systemctl start traccar

# 3. Check Traccar credentials in compose file
cd /opt/traccar-middleware
grep TRACCAR docker-compose.server93.poller.prod.yml
```

### Issue: Sender can't reach BSMART API

**Symptoms:**
```
❌ Error sending to Latra: timeout of 60000ms exceeded
```

**Solution:**
```bash
# Test API connectivity from Server 69
curl -X POST http://vts.latra.go.tz:8090/data-integration/integration/gps \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic d2ViY29ycGx0ZDp3ZWJjMHJwQDIwMjU=" \
  -d '{"test": true}'

# Check outbound firewall rules
sudo ufw status
```

### Issue: Container keeps restarting

**Check logs:**
```bash
# Server 93
docker compose -f docker-compose.server93.poller.prod.yml logs --tail=100

# Server 69
docker compose -f docker-compose.server69.sender.prod.yml logs --tail=100
```

**Common causes:**
- Missing `/var/lib/traccar-poller` directory on Server 93
- Incorrect credentials
- Network connectivity issues

---

## 📝 Part 6: Configuration Reference

### Server 93 - Poller Configuration

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Node environment |
| `PORT` | `2000` | Poller listen port |
| `TRACCAR_BASE` | `http://localhost:8082/api` | Traccar API URL |
| `TRACCAR_USERNAME` | `admin` | Traccar username |
| `TRACCAR_PASSWORD` | `admin` | Traccar password |
| `TUNNEL_URL` | `http://69.197.176.231:4000/traccar/` | Sender endpoint |

### Server 69 - Sender Configuration

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Node environment |
| `PORT` | `4000` | Sender listen port |
| `BSMART_API_URL` | `http://vts.latra.go.tz:8090/...` | BSMART API endpoint |
| `BSMART_API_TOKEN` | `d2ViY29ycGx0ZDp3ZWJjMHJwQDIwMjU=` | API auth token (Base64) |

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Docker installed on both servers
- [ ] Traccar running on Server 93
- [ ] Network connectivity verified between servers
- [ ] Firewall configured on Server 69

### Server 69 (Sender) - Deploy First
- [ ] Created `/opt/traccar-middleware` directory
- [ ] Created `docker-compose.server69.sender.prod.yml`
- [ ] Opened port 4000 in firewall
- [ ] Created logs directory
- [ ] Pulled Docker image
- [ ] Started sender service
- [ ] Verified health check passes

### Server 93 (Poller) - Deploy Second
- [ ] Created `/opt/traccar-middleware` directory
- [ ] Created `/var/lib/traccar-poller` directory
- [ ] Created `docker-compose.server93.poller.prod.yml`
- [ ] Verified Traccar connectivity
- [ ] Created logs directory
- [ ] Pulled Docker image
- [ ] Started poller service
- [ ] Verified health check passes

### Post-Deployment
- [ ] End-to-end data flow verified
- [ ] Both services logging correctly
- [ ] Resource usage within limits
- [ ] Monitoring configured

---

## 🎉 Success Indicators

When everything is working correctly, you should see:

**Server 93 Logs:**
```
✅ Devices loaded: 25
📡 Forwarded: Overspeed | Device: Vehicle-ABC | PositionId: 12345
📡 Forwarded: Movement | Device: Vehicle-XYZ | PositionId: 12346
```

**Server 69 Logs:**
```
📡 Payload received from Traccar
🎯 Activity IDs for event 255: [ 54 ]
🚀 Payload generated to be sent to BSMART/Latra
✅ Successfully sent to Latra API
```

**Health Checks:**
```bash
# Server 93
curl http://localhost:2000/health
# {"status":"OK","service":"poller","timestamp":"..."}

# Server 69
curl http://localhost:4000/health
# {"status":"OK","timestamp":"...","total_devices_tracked":25}
```

---

## 📞 Support

- **Logs:** Check logs first with `docker compose logs -f`
- **Health:** Verify with `curl http://localhost:PORT/health`
- **Network:** Test connectivity with `curl` and `telnet`
- **GitHub:** https://github.com/halidi-hamidu/VTS-middleware-poller-sender

---

**That's it! Your production deployment is complete. No .env files needed!** 🚀
