# VTS Middleware - Production Ready# VTS Middleware - Traccar Poller and Sender Services



Production-ready Traccar to BSMART/Latra integration middleware with split-server architecture.This setup includes two services that share the same Docker network for forwarding GPS data from Traccar to BSMART/Latra API.



## 📁 Project Structure## Services



```### 1. **Poller Service** (Port 2000)

.- Polls Traccar API for position updates

├── poller.js                           # Poller service (fetches from Traccar)- Forwards data to the Sender service

├── sender.js                           # Sender service (forwards to BSMART)- Persists last sent positions

├── package.json                        # Node.js dependencies- Image: `ghcr.io/halidi-hamidu/vts-middleware-poller:latest`

├── original_poller100%.js              # Reference implementation

│### 2. **Sender Service** (Port 4000)

├── Dockerfile.poller                   # Poller Docker image- Receives data from Poller

├── Dockerfile.sender                   # Sender Docker image- Forwards to BSMART/Latra API

│- Handles message sequencing and counter management

├── docker-compose.server93.prod.yml    # Production compose for Server 93 (Poller)- Image: `ghcr.io/halidi-hamidu/vts-middleware-sender:latest`

├── docker-compose.server69.prod.yml    # Production compose for Server 69 (Sender)

│## Quick Start

├── .env.server93.prod                  # Server 93 environment variables

├── .env.server69.prod                  # Server 69 environment variables### Production Deployment (Using Pre-built Images)

├── .env.example                        # Environment template

│**Recommended for production servers**

├── PRODUCTION_DEPLOYMENT_GUIDE.md      # Complete deployment guide

└── README.md                           # This file```bash

```# Pull latest images from GitHub Container Registry

docker compose -f docker-compose.prod.yml pull

## 🏗️ Architecture

# Start services

```docker compose -f docker-compose.prod.yml up -d

Server 93 (93.127.139.107)          Server 69 (69.197.176.231)

┌──────────────────────┐            ┌──────────────────────┐# View logs

│  Traccar :8082       │            │                      │docker compose -f docker-compose.prod.yml logs -f

│  (Data Source)       │            │                      │```

└──────────┬───────────┘            │                      │

           │                         │                      │### Development (Build from Source)

           ↓                         │                      │

┌──────────────────────┐            │                      │```bash

│  Poller :2000        │────HTTP────→  Sender :4000        │# Build and start services

│  Docker Container    │  Request   │  Docker Container    │docker compose up -d --build

│  - Polls every 1s    │            │  - Receives data     │

│  - Forwards to 69    │            │  - Sends to API      │# View logs

└──────────────────────┘            └──────────┬───────────┘docker compose logs -f

                                               │```

                                               ↓

                                    ┌─────────────────────┐### View Logs

                                    │  BSMART/Latra API   │```bash

                                    │  vts.latra.go.tz    │# All services

                                    └─────────────────────┘docker-compose logs -f

```

# Specific service

## 🚀 Quick Startdocker-compose logs -f poller

docker-compose logs -f sender

### Prerequisites```

- Docker Engine 20.10+

- Docker Compose v2+### Stop Services

- Traccar installed on Server 93```bash

- Network connectivity between serversdocker-compose down

```

### Production Deployment

### Restart Services

**Step 1: Deploy Sender on Server 69 (Do This First)**```bash

```bashdocker-compose restart

# SSH into Server 69```

ssh user@69.197.176.231

## Configuration

# Clone repository

cd /opt### Environment Variables

git clone https://github.com/halidi-hamidu/VTS-middleware-poller-sender.git traccar-middleware

cd traccar-middlewareYou can modify environment variables in `docker-compose.yml`:



# Copy production environment**Poller Service:**

cp .env.server69.prod .env- `TRACCAR_BASE`: Traccar API endpoint

- `TUNNEL_URL`: Sender service URL (uses container network)

# Deploy sender

docker compose -f docker-compose.server69.prod.yml up -d**Sender Service:**

- `PORT`: Service port (default: 4000)

# Verify- `BSMART_API_URL`: Target API endpoint

curl http://localhost:4000/health- `BSMART_API_TOKEN`: API authentication token

```

### Network

**Step 2: Deploy Poller on Server 93**

```bashBoth services are connected to the `traccar-network` bridge network, allowing them to communicate using container names:

# SSH into Server 93- Poller → Sender: `http://sender:4000/traccar/`

ssh user@93.127.139.107

## Health Checks

# Clone repository

cd /optBoth services have health checks configured:

git clone https://github.com/halidi-hamidu/VTS-middleware-poller-sender.git traccar-middleware- **Interval**: 30 seconds

cd traccar-middleware- **Timeout**: 10 seconds

- **Retries**: 3

# Copy production environment- **Start Period**: 10 seconds

cp .env.server93.prod .env

Check service health:

# Deploy poller```bash

docker compose -f docker-compose.server93.prod.yml up -ddocker-compose ps

```

# Verify

curl http://localhost:2000/health## Volumes

```

### Poller Service:

## 📚 Documentation- `./lastSentPositions.json`: Persisted state

- `./logs`: Application logs

For complete deployment instructions, troubleshooting, and maintenance procedures, see:

### Sender Service:

**[PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md)**- `./logs`: Application logs



This comprehensive guide includes:## Monitoring

- ✅ Step-by-step deployment instructions

- ✅ Firewall configuration### Check Service Status

- ✅ Health checks and monitoring```bash

- ✅ Troubleshooting common issuescurl http://localhost:2000/health  # Poller

- ✅ Backup and recovery procedurescurl http://localhost:4000/health  # Sender

- ✅ Security recommendations```

- ✅ Quick reference commands

### View Container Stats

## 🔧 Key Features```bash

docker stats traccar-poller traccar-sender

### Production Ready```

- ✅ Resource limits (CPU & Memory)

- ✅ Automatic log rotation (10MB, 3 files)## Troubleshooting

- ✅ Health checks with auto-restart

- ✅ Security hardening (no-new-privileges)### View Container Logs

- ✅ Host networking for optimal performance```bash

docker logs traccar-poller

### Event Detectiondocker logs traccar-sender

The poller detects and forwards the following events:```

- **Overspeed** (Event code 255)

- **Harsh Acceleration**### Rebuild After Code Changes

- **Harsh Braking**```bash

- **Harsh Cornering**docker-compose down

- **Movement Events**docker-compose up -d --build

- **All position updates**```



### Data Flow### Access Container Shell

1. **Poller** polls Traccar API every 1 second```bash

2. Filters new positions (ignores duplicates)docker exec -it traccar-poller sh

3. Forwards to **Sender** via HTTPdocker exec -it traccar-sender sh

4. **Sender** transforms data to BSMART format```

5. Forwards to BSMART/Latra API with authentication

## Production Deployment

## 📊 Monitoring

For production, update the `docker-compose.yml`:

### Health Endpoints1. Change `TRACCAR_BASE` to production URL

2. Update `BSMART_API_URL` and `BSMART_API_TOKEN`

**Poller (Server 93)**3. Consider adding resource limits:

```bash

curl http://localhost:2000/health```yaml

# Returns: {"status":"OK","service":"poller","timestamp":"..."}services:

```  poller:

    deploy:

**Sender (Server 69)**      resources:

```bash        limits:

curl http://localhost:4000/health          cpus: '0.5'

# Returns: {"status":"OK","timestamp":"...","total_devices_tracked":X}          memory: 512M

        reservations:

curl http://localhost:4000/counters          cpus: '0.25'

# Returns device-specific message counters          memory: 256M

``````


### View Logs
```bash
# Server 93 - Poller logs
docker compose -f docker-compose.server93.prod.yml logs -f

# Server 69 - Sender logs
docker compose -f docker-compose.server69.prod.yml logs -f
```

### Resource Usage
```bash
# Check container stats
docker stats traccar-poller-prod
docker stats traccar-sender-prod
```

## 🛠️ Maintenance

### Update Services
```bash
# Pull latest images
docker compose -f docker-compose.serverXX.prod.yml pull

# Restart with new images
docker compose -f docker-compose.serverXX.prod.yml up -d

# View logs
docker compose -f docker-compose.serverXX.prod.yml logs -f
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

## 🔐 Environment Variables

### Server 93 (Poller)
```bash
NODE_ENV=production
TRACCAR_BASE=http://localhost:8082/api
TRACCAR_USERNAME=admin
TRACCAR_PASSWORD=admin
TUNNEL_URL=http://69.197.176.231:4000/traccar/
```

### Server 69 (Sender)
```bash
NODE_ENV=production
BSMART_API_URL=http://vts.latra.go.tz:8090/data-integration/integration/gps
BSMART_API_TOKEN=d2ViY29ycGx0ZDp3ZWJjMHJwQDIwMjU=
```

## 📦 Docker Images

Images are automatically built and published via GitHub Actions:

- **Poller**: `ghcr.io/halidi-hamidu/vts-middleware-poller:latest`
- **Sender**: `ghcr.io/halidi-hamidu/vts-middleware-sender:latest`

## 🆘 Troubleshooting

### Poller can't connect to Sender
```bash
# Test connectivity from Server 93
curl http://69.197.176.231:4000/health

# Check firewall on Server 69
sudo ufw allow from 93.127.139.107 to any port 4000
```

### Poller can't connect to Traccar
```bash
# Test Traccar on Server 93
curl http://localhost:8082/api/server

# Check Traccar service
systemctl status traccar
```

### High resource usage
```bash
# Check container stats
docker stats

# Adjust resource limits in docker-compose files if needed
```

For more troubleshooting scenarios, see **[PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md)**.

## 📝 License

This project is proprietary software for VTS/BSMART/Latra integration.

## 👥 Support

For deployment issues or questions:
- Check **[PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md)** first
- Review logs: `docker compose logs -f`
- Verify connectivity: `curl http://SERVER:PORT/health`
- Check GitHub repository: https://github.com/halidi-hamidu/VTS-middleware-poller-sender

---

**Quick Reference:**
- 📖 Full deployment guide: [PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md)
- 🐳 Poller compose: `docker-compose.server93.prod.yml`
- 🐳 Sender compose: `docker-compose.server69.prod.yml`
- 🔑 Poller env: `.env.server93.prod`
- 🔑 Sender env: `.env.server69.prod`
