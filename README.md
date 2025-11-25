# VTS Middleware - Traccar Poller and Sender Services

This setup includes two services that share the same Docker network for forwarding GPS data from Traccar to BSMART/Latra API.

## Services

### 1. **Poller Service** (Port 2000)
- Polls Traccar API for position updates
- Forwards data to the Sender service
- Persists last sent positions
- Image: `ghcr.io/halidi-hamidu/vts-middleware-poller:latest`

### 2. **Sender Service** (Port 4000)
- Receives data from Poller
- Forwards to BSMART/Latra API
- Handles message sequencing and counter management
- Image: `ghcr.io/halidi-hamidu/vts-middleware-sender:latest`

## Quick Start

### Production Deployment (Using Pre-built Images)

**Recommended for production servers**

```bash
# Pull latest images from GitHub Container Registry
docker compose -f docker-compose.prod.yml pull

# Start services
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### Development (Build from Source)

```bash
# Build and start services
docker compose up -d --build

# View logs
docker compose logs -f
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f poller
docker-compose logs -f sender
```

### Stop Services
```bash
docker-compose down
```

### Restart Services
```bash
docker-compose restart
```

## Configuration

### Environment Variables

You can modify environment variables in `docker-compose.yml`:

**Poller Service:**
- `TRACCAR_BASE`: Traccar API endpoint
- `TUNNEL_URL`: Sender service URL (uses container network)

**Sender Service:**
- `PORT`: Service port (default: 4000)
- `BSMART_API_URL`: Target API endpoint
- `BSMART_API_TOKEN`: API authentication token

### Network

Both services are connected to the `traccar-network` bridge network, allowing them to communicate using container names:
- Poller → Sender: `http://sender:4000/traccar/`

## Health Checks

Both services have health checks configured:
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3
- **Start Period**: 10 seconds

Check service health:
```bash
docker-compose ps
```

## Volumes

### Poller Service:
- `./lastSentPositions.json`: Persisted state
- `./logs`: Application logs

### Sender Service:
- `./logs`: Application logs

## Monitoring

### Check Service Status
```bash
curl http://localhost:2000/health  # Poller
curl http://localhost:4000/health  # Sender
```

### View Container Stats
```bash
docker stats traccar-poller traccar-sender
```

## Troubleshooting

### View Container Logs
```bash
docker logs traccar-poller
docker logs traccar-sender
```

### Rebuild After Code Changes
```bash
docker-compose down
docker-compose up -d --build
```

### Access Container Shell
```bash
docker exec -it traccar-poller sh
docker exec -it traccar-sender sh
```

## Production Deployment

For production, update the `docker-compose.yml`:
1. Change `TRACCAR_BASE` to production URL
2. Update `BSMART_API_URL` and `BSMART_API_TOKEN`
3. Consider adding resource limits:

```yaml
services:
  poller:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```
