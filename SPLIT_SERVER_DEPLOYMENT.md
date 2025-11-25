# Split Server Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│  Server 93 (93.127.139.107)              Server 69 (69.197.176.231)│
│  ┌──────────────────┐                   ┌──────────────────┐   │
│  │                  │                   │                  │   │
│  │  Traccar :8082   │                   │                  │   │
│  │                  │                   │                  │   │
│  └────────┬─────────┘                   │                  │   │
│           │                              │                  │   │
│           ↓                              │                  │   │
│  ┌──────────────────┐                   │                  │   │
│  │  Poller :2000    │───────────────────→  Sender :4000    │   │
│  │  (fetches data)  │   HTTP Request    │  (forwards data) │   │
│  └──────────────────┘                   └────────┬─────────┘   │
│                                                   │              │
│                                                   ↓              │
│                                          BSMART/Latra API       │
│                                          vts.latra.go.tz:8090   │
└─────────────────────────────────────────────────────────────────┘
```

**Data Flow:**
1. Poller (Server 93) fetches from Traccar (Server 93)
2. Poller sends to Sender (Server 69) via HTTP
3. Sender forwards to BSMART/Latra API

---

## Server 93 Deployment (93.127.139.107)

### Purpose
Runs **ONLY the Poller** service that fetches from local Traccar

### Prerequisites
- Docker and Docker Compose installed
- Traccar running on localhost:8082
- Network access to Server 69 port 4000

### Step 1: Clone Repository
```bash
git clone https://github.com/halidi-hamidu/VTS-middleware-poller-sender.git
cd VTS-middleware-poller-sender
```

### Step 2: Create Environment File
```bash
cp .env.server93 .env
```

Or create manually:
```bash
cat > .env << 'EOF'
NODE_ENV=production
POLLER_PORT=2000

# Traccar Configuration (local)
TRACCAR_BASE=http://localhost:8082/api
TRACCAR_USERNAME=admin
TRACCAR_PASSWORD=admin

# Sender URL (remote on server 69)
TUNNEL_URL=http://69.197.176.231:4000/traccar/
EOF
```

### Step 3: Deploy Poller Service
```bash
# Pull/build the image
docker compose -f docker-compose.server93.yml pull

# Start the poller
docker compose -f docker-compose.server93.yml up -d

# View logs
docker compose -f docker-compose.server93.yml logs -f
```

### Step 4: Verify Deployment
```bash
# Check poller health
curl http://localhost:2000/health

# Check poller can reach local Traccar
curl http://localhost:8082/api/server

# Check poller can reach remote sender (should get "Cannot GET")
curl http://69.197.176.231:4000/
```

---

## Server 69 Deployment (69.197.176.231)

### Purpose
Runs **ONLY the Sender** service that receives data and forwards to BSMART

### Prerequisites
- Docker and Docker Compose installed
- Port 4000 accessible from Server 93
- Network access to BSMART/Latra API

### Step 1: Clone Repository
```bash
git clone https://github.com/halidi-hamidu/VTS-middleware-poller-sender.git
cd VTS-middleware-poller-sender
```

### Step 2: Create Environment File
```bash
cp .env.server69 .env
```

Or create manually:
```bash
cat > .env << 'EOF'
NODE_ENV=production
SENDER_PORT=4000

# BSMART/Latra API Configuration
BSMART_API_URL=http://vts.latra.go.tz:8090/data-integration/integration/gps
BSMART_API_TOKEN=d2ViY29ycGx0ZDp3ZWJjMHJwQDIwMjU=
EOF
```

### Step 3: Deploy Sender Service
```bash
# Pull/build the image
docker compose -f docker-compose.server69.yml pull

# Start the sender
docker compose -f docker-compose.server69.yml up -d

# View logs
docker compose -f docker-compose.server69.yml logs -f
```

### Step 4: Verify Deployment
```bash
# Check sender health
curl http://localhost:4000/health

# Check sender is listening
curl http://localhost:4000/
```

### Step 5: Configure Firewall (IMPORTANT!)
```bash
# Allow incoming connections on port 4000 from Server 93
sudo ufw allow from 93.127.139.107 to any port 4000

# Or allow from anywhere (less secure)
sudo ufw allow 4000/tcp
```

---

## Testing the Complete Flow

### On Server 93 (Poller)
```bash
# Check poller logs - should show fetching and forwarding
docker compose -f docker-compose.server93.yml logs -f poller

# Expected output:
# ✅ Devices loaded: X
# 📡 Forwarded: Event | Device: XXX | PositionId: XXX
```

### On Server 69 (Sender)
```bash
# Check sender logs - should show receiving and forwarding
docker compose -f docker-compose.server69.yml logs -f sender

# Expected output:
# 📡 Payload received from Traccar
# 🚀 Payload generated to be sent to BSMART/Latra
# ✅ Successfully sent to Latra
```

---

## Troubleshooting

### Issue: Poller can't connect to Sender (Server 69)

**Symptoms:**
```
❌ Forwarding error: connect ECONNREFUSED 69.197.176.231:4000
```

**Solutions:**
1. Check sender is running on Server 69:
   ```bash
   curl http://69.197.176.231:4000/health
   ```

2. Check firewall on Server 69:
   ```bash
   sudo ufw status
   sudo ufw allow 4000/tcp
   ```

3. Verify TUNNEL_URL on Server 93:
   ```bash
   # Should be: http://69.197.176.231:4000/traccar/
   cat .env | grep TUNNEL_URL
   ```

### Issue: Poller can't connect to Traccar (Server 93)

**Symptoms:**
```
❌ Error fetching positions: timeout
```

**Solutions:**
1. Check Traccar is running:
   ```bash
   curl http://localhost:8082/api/server
   ```

2. Verify TRACCAR_BASE in .env:
   ```bash
   cat .env | grep TRACCAR_BASE
   ```

3. Check Traccar credentials:
   ```bash
   # Default: admin/admin
   cat .env | grep TRACCAR
   ```

---

## Monitoring Commands

### Server 93 (Poller)
```bash
# View logs
docker compose -f docker-compose.server93.yml logs -f

# Check status
docker compose -f docker-compose.server93.yml ps

# Health check
curl http://localhost:2000/health

# Restart
docker compose -f docker-compose.server93.yml restart

# Stop
docker compose -f docker-compose.server93.yml down
```

### Server 69 (Sender)
```bash
# View logs
docker compose -f docker-compose.server69.yml logs -f

# Check status
docker compose -f docker-compose.server69.yml ps

# Health check
curl http://localhost:4000/health

# Device counters
curl http://localhost:4000/counters

# Restart
docker compose -f docker-compose.server69.yml restart

# Stop
docker compose -f docker-compose.server69.yml down
```

---

## Updating Services

### Update Poller (Server 93)
```bash
cd VTS-middleware-poller-sender
git pull
docker compose -f docker-compose.server93.yml pull
docker compose -f docker-compose.server93.yml up -d
```

### Update Sender (Server 69)
```bash
cd VTS-middleware-poller-sender
git pull
docker compose -f docker-compose.server69.yml pull
docker compose -f docker-compose.server69.yml up -d
```

---

## Network Requirements

### Server 93 → Server 69
- **Port**: 4000
- **Protocol**: HTTP
- **Direction**: Outbound from Server 93, Inbound to Server 69
- **Firewall**: Must be open on Server 69

### Server 69 → BSMART/Latra
- **Host**: vts.latra.go.tz
- **Port**: 8090
- **Protocol**: HTTP
- **Direction**: Outbound from Server 69

---

## Security Considerations

1. **Firewall on Server 69**: Only allow port 4000 from Server 93 IP
2. **HTTPS**: Consider using HTTPS with reverse proxy (nginx) for production
3. **API Tokens**: Rotate BSMART_API_TOKEN regularly
4. **Credentials**: Use strong passwords for Traccar

---

## Quick Commands Summary

**Server 93 (Poller Only):**
```bash
# Deploy
docker compose -f docker-compose.server93.yml up -d

# Logs
docker compose -f docker-compose.server93.yml logs -f

# Health
curl http://localhost:2000/health
```

**Server 69 (Sender Only):**
```bash
# Deploy
docker compose -f docker-compose.server69.yml up -d

# Logs
docker compose -f docker-compose.server69.yml logs -f

# Health
curl http://localhost:4000/health
```
