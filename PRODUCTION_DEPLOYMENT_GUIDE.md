# Production Deployment Guide - Split Server Architecture

## Overview

This guide provides step-by-step instructions for deploying the VTS Middleware in production across two servers.

```
┌────────────────────────────────────────────────────────────────────┐
│                    PRODUCTION ARCHITECTURE                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Server 93 (93.127.139.107)          Server 69 (69.197.176.231)   │
│  ┌─────────────────────┐            ┌─────────────────────┐       │
│  │  Traccar :8082      │            │                     │       │
│  │  (Data Source)      │            │                     │       │
│  └──────────┬──────────┘            │                     │       │
│             │                        │                     │       │
│             ↓                        │                     │       │
│  ┌─────────────────────┐            │                     │       │
│  │  Poller :2000       │────HTTP────→  Sender :4000       │       │
│  │  Docker Container   │  Request   │  Docker Container   │       │
│  │  - Fetches data     │            │  - Receives data    │       │
│  │  - Forwards to 69   │            │  - Forwards to API  │       │
│  └─────────────────────┘            └──────────┬──────────┘       │
│                                                 │                   │
│                                                 ↓                   │
│                                    ┌────────────────────────┐      │
│                                    │  BSMART/Latra API      │      │
│                                    │  vts.latra.go.tz:8090  │      │
│                                    └────────────────────────┘      │
└────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Server 93 (93.127.139.107)
- [x] Docker Engine 20.10+
- [x] Docker Compose v2+
- [x] Traccar running on localhost:8082
- [x] Network access to Server 69 port 4000
- [x] Minimum 256MB RAM, 512MB recommended
- [x] Minimum 1GB disk space

### Server 69 (69.197.176.231)
- [x] Docker Engine 20.10+
- [x] Docker Compose v2+
- [x] Port 4000 available
- [x] Network access to BSMART/Latra API
- [x] Minimum 256MB RAM, 512MB recommended
- [x] Minimum 1GB disk space

---

## Part 1: Deploy Sender on Server 69 (Do This First!)

> **Important:** Deploy the Sender service BEFORE the Poller, so it's ready to receive data.

### Step 1.1: Initial Setup
```bash
# SSH into Server 69
ssh user@69.197.176.231

# Create deployment directory
sudo mkdir -p /opt/traccar-middleware
cd /opt/traccar-middleware

# Clone repository
git clone https://github.com/halidi-hamidu/VTS-middleware-poller-sender.git .

# Or download specific files if repo access is limited
wget https://raw.githubusercontent.com/halidi-hamidu/VTS-middleware-poller-sender/main/docker-compose.server69.prod.yml
wget https://raw.githubusercontent.com/halidi-hamidu/VTS-middleware-poller-sender/main/.env.server69.prod
```

### Step 1.2: Configure Environment
```bash
# Copy production environment file
cp .env.server69.prod .env

# Edit if needed (update API token if different)
nano .env
```

Verify `.env` contains:
```bash
NODE_ENV=production
BSMART_API_URL=http://vts.latra.go.tz:8090/data-integration/integration/gps
BSMART_API_TOKEN=d2ViY29ycGx0ZDp3ZWJjMHJwQDIwMjU=
```

### Step 1.3: Configure Firewall
```bash
# Allow incoming connections on port 4000 from Server 93
sudo ufw allow from 93.127.139.107 to any port 4000 comment 'Traccar Poller'

# Verify firewall rule
sudo ufw status numbered

# Reload firewall
sudo ufw reload
```

### Step 1.4: Create Log Directory
```bash
# Create logs directory with proper permissions
sudo mkdir -p /opt/traccar-middleware/logs
sudo chown -R $USER:$USER /opt/traccar-middleware/logs
sudo chmod 755 /opt/traccar-middleware/logs
```

### Step 1.5: Deploy Sender Service
```bash
# Pull the latest image
docker compose -f docker-compose.server69.prod.yml pull

# Start the service
docker compose -f docker-compose.server69.prod.yml up -d

# Verify it's running
docker compose -f docker-compose.server69.prod.yml ps
```

### Step 1.6: Verify Sender Deployment
```bash
# Check container status
docker ps | grep sender

# Check logs
docker compose -f docker-compose.server69.prod.yml logs -f

# Test health endpoint
curl http://localhost:4000/health

# Expected response:
# {"status":"OK","timestamp":"2025-11-25T...","total_devices_tracked":0}

# Test from external (from another machine or Server 93)
curl http://69.197.176.231:4000/health
```

---

## Part 2: Deploy Poller on Server 93

### Step 2.1: Initial Setup
```bash
# SSH into Server 93
ssh user@93.127.139.107

# Create deployment directory
sudo mkdir -p /opt/traccar-middleware
cd /opt/traccar-middleware

# Clone repository
git clone https://github.com/halidi-hamidu/VTS-middleware-poller-sender.git .

# Or download specific files
wget https://raw.githubusercontent.com/halidi-hamidu/VTS-middleware-poller-sender/main/docker-compose.server93.prod.yml
wget https://raw.githubusercontent.com/halidi-hamidu/VTS-middleware-poller-sender/main/.env.server93.prod
```

### Step 2.2: Verify Traccar is Running
```bash
# Test Traccar API
curl http://localhost:8082/api/server

# Should return JSON with server info
# If fails, start Traccar first
```

### Step 2.3: Configure Environment
```bash
# Copy production environment file
cp .env.server93.prod .env

# Edit if needed
nano .env
```

Verify `.env` contains:
```bash
NODE_ENV=production
TRACCAR_BASE=http://localhost:8082/api
TRACCAR_USERNAME=admin
TRACCAR_PASSWORD=admin
TUNNEL_URL=http://69.197.176.231:4000/traccar/
```

### Step 2.4: Test Connectivity to Sender
```bash
# Test connection to Sender on Server 69
curl http://69.197.176.231:4000/health

# Should return health status
# If fails, check firewall on Server 69
```

### Step 2.5: Create Persistent Data Directory
```bash
# Create directory for poller data
sudo mkdir -p /var/lib/traccar-poller
sudo chown -R $USER:$USER /var/lib/traccar-poller
sudo chmod 755 /var/lib/traccar-poller

# Create logs directory
sudo mkdir -p /opt/traccar-middleware/logs
sudo chown -R $USER:$USER /opt/traccar-middleware/logs
```

### Step 2.6: Deploy Poller Service
```bash
# Pull the latest image
docker compose -f docker-compose.server93.prod.yml pull

# Start the service
docker compose -f docker-compose.server93.prod.yml up -d

# Verify it's running
docker compose -f docker-compose.server93.prod.yml ps
```

### Step 2.7: Verify Poller Deployment
```bash
# Check container status
docker ps | grep poller

# Check logs
docker compose -f docker-compose.server93.prod.yml logs -f

# Test health endpoint
curl http://localhost:2000/health

# Expected log output:
# ✅ Devices loaded: X
# 📡 Forwarded: Event | Device: XXX | PositionId: XXX
```

---

## Part 3: Verify End-to-End Flow

### On Server 93 (Poller)
```bash
# Watch poller logs in real-time
docker compose -f docker-compose.server93.prod.yml logs -f poller

# Should see:
# ✅ Devices loaded: X
# 📡 Forwarded: [EventName] | Device: [DeviceName] | PositionId: XXXX
```

### On Server 69 (Sender)
```bash
# Watch sender logs in real-time
docker compose -f docker-compose.server69.prod.yml logs -f sender

# Should see:
# 📡 Payload received from Traccar
# 🎯 Activity IDs for event X: [ ... ]
# 🚀 Payload generated to be sent to BSMART/Latra
# ✅ Successfully sent to Latra API
```

### Check Data Flow
```bash
# On Server 69, check device counters
curl http://localhost:4000/counters

# Should show tracked devices with message counts
```

---

## Part 4: Production Monitoring

### Service Status
```bash
# Server 93
docker compose -f docker-compose.server93.prod.yml ps

# Server 69
docker compose -f docker-compose.server69.prod.yml ps
```

### Health Checks
```bash
# Server 93 - Poller
curl http://localhost:2000/health

# Server 69 - Sender
curl http://localhost:4000/health
curl http://localhost:4000/counters
```

### Log Monitoring
```bash
# Real-time logs - Server 93
docker compose -f docker-compose.server93.prod.yml logs -f --tail=100

# Real-time logs - Server 69
docker compose -f docker-compose.server69.prod.yml logs -f --tail=100

# View last 50 lines
docker compose -f docker-compose.server93.prod.yml logs --tail=50
docker compose -f docker-compose.server69.prod.yml logs --tail=50
```

### Resource Usage
```bash
# Check container resource usage
docker stats traccar-poller-prod
docker stats traccar-sender-prod
```

---

## Part 5: Maintenance Operations

### Update Services

**Server 93 (Poller):**
```bash
cd /opt/traccar-middleware
git pull
docker compose -f docker-compose.server93.prod.yml pull
docker compose -f docker-compose.server93.prod.yml up -d
docker compose -f docker-compose.server93.prod.yml logs -f
```

**Server 69 (Sender):**
```bash
cd /opt/traccar-middleware
git pull
docker compose -f docker-compose.server69.prod.yml pull
docker compose -f docker-compose.server69.prod.yml up -d
docker compose -f docker-compose.server69.prod.yml logs -f
```

### Restart Services
```bash
# Server 93
docker compose -f docker-compose.server93.prod.yml restart

# Server 69
docker compose -f docker-compose.server69.prod.yml restart
```

### Stop Services
```bash
# Server 93
docker compose -f docker-compose.server93.prod.yml down

# Server 69
docker compose -f docker-compose.server69.prod.yml down
```

### View Configuration
```bash
# Check current environment
cat .env

# Check running configuration
docker compose -f docker-compose.server93.prod.yml config
docker compose -f docker-compose.server69.prod.yml config
```

---

## Part 6: Backup and Recovery

### Backup Poller Data (Server 93)
```bash
# Backup persistent data
sudo tar -czf /tmp/poller-data-$(date +%Y%m%d).tar.gz /var/lib/traccar-poller

# Backup logs
sudo tar -czf /tmp/poller-logs-$(date +%Y%m%d).tar.gz /opt/traccar-middleware/logs
```

### Backup Sender Logs (Server 69)
```bash
# Backup logs
sudo tar -czf /tmp/sender-logs-$(date +%Y%m%d).tar.gz /opt/traccar-middleware/logs
```

### Restore Poller Data (Server 93)
```bash
# Stop service
docker compose -f docker-compose.server93.prod.yml down

# Restore data
sudo tar -xzf /tmp/poller-data-YYYYMMDD.tar.gz -C /

# Start service
docker compose -f docker-compose.server93.prod.yml up -d
```

---

## Part 7: Troubleshooting

### Issue: Poller can't connect to Sender

**Symptoms:**
```
❌ Forwarding error: connect ECONNREFUSED 69.197.176.231:4000
❌ Forwarding error: connect ETIMEDOUT 69.197.176.231:4000
```

**Solutions:**

1. **Check Sender is running on Server 69:**
   ```bash
   ssh user@69.197.176.231
   docker ps | grep sender
   curl http://localhost:4000/health
   ```

2. **Check firewall on Server 69:**
   ```bash
   sudo ufw status
   sudo ufw allow from 93.127.139.107 to any port 4000
   ```

3. **Test from Server 93:**
   ```bash
   ssh user@93.127.139.107
   curl http://69.197.176.231:4000/health
   telnet 69.197.176.231 4000
   ```

4. **Check TUNNEL_URL on Server 93:**
   ```bash
   cat .env | grep TUNNEL_URL
   # Should be: http://69.197.176.231:4000/traccar/
   ```

### Issue: Poller can't connect to Traccar

**Symptoms:**
```
❌ Error fetching positions: timeout
❌ Error fetching positions: connect ECONNREFUSED
```

**Solutions:**

1. **Check Traccar is running:**
   ```bash
   systemctl status traccar
   curl http://localhost:8082/api/server
   ```

2. **Check Traccar credentials:**
   ```bash
   cat .env | grep TRACCAR
   # Verify username and password are correct
   ```

3. **Check TRACCAR_BASE URL:**
   ```bash
   cat .env | grep TRACCAR_BASE
   # Should be: http://localhost:8082/api
   ```

### Issue: Sender can't reach BSMART API

**Symptoms:**
```
❌ Error sending to Latra: timeout of 60000ms exceeded
❌ Error sending to Latra: connect ECONNREFUSED
```

**Solutions:**

1. **Test BSMART API connectivity:**
   ```bash
   curl http://vts.latra.go.tz:8090/data-integration/integration/gps
   ```

2. **Check API token:**
   ```bash
   cat .env | grep BSMART_API_TOKEN
   ```

3. **Check outbound firewall rules:**
   ```bash
   sudo ufw status
   # Ensure outbound connections are allowed
   ```

### Issue: High Memory Usage

**Check resource usage:**
```bash
docker stats traccar-poller-prod
docker stats traccar-sender-prod
```

**Adjust resource limits in docker-compose file:**
```yaml
deploy:
  resources:
    limits:
      memory: 256M  # Reduce if needed
```

### Issue: Container keeps restarting

**Check logs:**
```bash
docker compose -f docker-compose.server93.prod.yml logs --tail=100
docker compose -f docker-compose.server69.prod.yml logs --tail=100
```

**Common causes:**
- Missing environment variables
- Network connectivity issues
- Resource constraints
- Permission issues with volumes

---

## Part 8: Security Recommendations

### 1. Use Strong Passwords
```bash
# Update Traccar credentials
nano .env
# Change TRACCAR_USERNAME and TRACCAR_PASSWORD
```

### 2. Restrict Firewall Rules
```bash
# On Server 69, only allow from Server 93
sudo ufw delete allow 4000
sudo ufw allow from 93.127.139.107 to any port 4000
```

### 3. Enable HTTPS (Optional)
Use nginx reverse proxy for SSL/TLS:
```bash
# Install nginx
sudo apt install nginx

# Configure reverse proxy
sudo nano /etc/nginx/sites-available/traccar-sender
```

### 4. Regular Updates
```bash
# Update Docker images weekly
docker compose -f docker-compose.server93.prod.yml pull
docker compose -f docker-compose.server69.prod.yml pull
```

### 5. Monitor Logs
```bash
# Set up log rotation
sudo nano /etc/logrotate.d/traccar-middleware
```

---

## Part 9: Quick Reference

### Server 93 Commands
```bash
# Deploy
docker compose -f docker-compose.server93.prod.yml up -d

# Stop
docker compose -f docker-compose.server93.prod.yml down

# Logs
docker compose -f docker-compose.server93.prod.yml logs -f

# Restart
docker compose -f docker-compose.server93.prod.yml restart

# Health
curl http://localhost:2000/health

# Update
git pull && docker compose -f docker-compose.server93.prod.yml pull && docker compose -f docker-compose.server93.prod.yml up -d
```

### Server 69 Commands
```bash
# Deploy
docker compose -f docker-compose.server69.prod.yml up -d

# Stop
docker compose -f docker-compose.server69.prod.yml down

# Logs
docker compose -f docker-compose.server69.prod.yml logs -f

# Restart
docker compose -f docker-compose.server69.prod.yml restart

# Health
curl http://localhost:4000/health

# Counters
curl http://localhost:4000/counters

# Update
git pull && docker compose -f docker-compose.server69.prod.yml pull && docker compose -f docker-compose.server69.prod.yml up -d
```

---

## Support

For issues and questions:
- GitHub: https://github.com/halidi-hamidu/VTS-middleware-poller-sender
- Check logs first: `docker compose -f docker-compose.serverXX.prod.yml logs`
- Verify connectivity: `curl http://SERVER:PORT/health`

---

## Deployment Checklist

### Pre-Deployment
- [ ] Docker and Docker Compose installed on both servers
- [ ] Traccar running on Server 93
- [ ] Network connectivity verified between servers
- [ ] Firewall rules configured on Server 69

### Server 69 (Sender) - Deploy First
- [ ] Repository cloned
- [ ] .env file configured
- [ ] Firewall port 4000 opened
- [ ] Logs directory created
- [ ] Service deployed
- [ ] Health check passing

### Server 93 (Poller) - Deploy Second
- [ ] Repository cloned
- [ ] .env file configured
- [ ] Traccar connectivity verified
- [ ] Data directory created
- [ ] Logs directory created
- [ ] Service deployed
- [ ] Health check passing

### Post-Deployment
- [ ] End-to-end data flow verified
- [ ] Both services logging correctly
- [ ] Resource usage within limits
- [ ] Backup procedures documented
- [ ] Monitoring configured
