# Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- Access to GitHub Container Registry (for pulling images)
- Network access to Traccar API and BSMART/Latra API

## Production Deployment

### Step 1: Clone the Repository (or download docker-compose.prod.yml)

```bash
git clone git@github.com:halidi-hamidu/VTS-middleware-poller-sender.git
cd VTS-middleware-poller-sender
```

### Step 2: Configure Environment Variables (Optional)

Create a `.env` file for custom configuration:

```bash
cp .env.example .env
# Edit .env with your production values
nano .env
```

**Available environment variables:**

- `TRACCAR_BASE`: Traccar API endpoint (default: http://69.197.176.231:8082/api)
- `BSMART_API_URL`: BSMART/Latra API endpoint
- `BSMART_API_TOKEN`: API authentication token

### Step 3: Pull Latest Images

```bash
docker compose -f docker-compose.prod.yml pull
```

### Step 4: Start Services

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Step 5: Verify Services are Running

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Check poller health
curl http://localhost:2000/health

# Check sender health
curl http://localhost:4000/health

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

## Updating to Latest Version

```bash
# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Restart services with new images
docker compose -f docker-compose.prod.yml up -d
```

## Monitoring

### View Real-time Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f poller
docker compose -f docker-compose.prod.yml logs -f sender
```

### Check Service Health

```bash
# Poller service
curl http://localhost:2000/health

# Sender service
curl http://localhost:4000/health

# Device counters
curl http://localhost:4000/counters
```

### Container Stats

```bash
docker stats traccar-poller traccar-sender
```

## Troubleshooting

### Services not starting

```bash
# Check container logs
docker compose -f docker-compose.prod.yml logs

# Check if ports are already in use
sudo netstat -tulpn | grep -E '2000|4000'
```

### Cannot pull images

Make sure you have access to GitHub Container Registry. The images are public, but you may need to authenticate:

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### Reset and restart

```bash
# Stop and remove containers
docker compose -f docker-compose.prod.yml down

# Remove volumes (WARNING: This will delete all data)
docker compose -f docker-compose.prod.yml down -v

# Start fresh
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Available Images

- **Poller**: `ghcr.io/halidi-hamidu/vts-middleware-poller:latest`
- **Sender**: `ghcr.io/halidi-hamidu/vts-middleware-sender:latest`

## Network Architecture

```
Traccar API → Poller Service (Port 2000)
                    ↓
              Sender Service (Port 4000) → BSMART/Latra API
```

Both services communicate via the `traccar-network` Docker bridge network.

## Backup and Restore

### Backup Poller Data

```bash
docker run --rm -v vts-middleware-poller-sender_poller-data:/data -v $(pwd):/backup alpine tar czf /backup/poller-data-backup.tar.gz -C /data .
```

### Restore Poller Data

```bash
docker run --rm -v vts-middleware-poller-sender_poller-data:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/poller-data-backup.tar.gz"
```

## Production Recommendations

1. **Use environment variables** for sensitive configuration
2. **Enable log rotation** to prevent disk space issues
3. **Monitor resource usage** regularly
4. **Set up alerts** for service failures
5. **Regularly update** to latest images for security patches

## Support

For issues and questions, please open an issue on GitHub:
https://github.com/halidi-hamidu/VTS-middleware-poller-sender/issues
