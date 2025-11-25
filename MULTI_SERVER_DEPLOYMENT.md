# Multi-Server Deployment Guide

This guide explains how to deploy the VTS Middleware on multiple servers with different configurations.

## Architecture

The Docker images are built once and pushed to GitHub Container Registry. Each server pulls the same images but uses different environment variables for configuration.

```
GitHub Container Registry (ghcr.io)
    ↓ (same images)
    ├── Server 1 (93.127.139.107) - Production
    └── Server 2 (69.197.176.231) - Development/Testing
```

## Deployment Steps

### Server 1: Production (93.127.139.107)

1. **Clone/Download the repository**
```bash
git clone https://github.com/halidi-hamidu/VTS-middleware-poller-sender.git
cd VTS-middleware-poller-sender
```

2. **Create `.env` file for production**
```bash
cat > .env << 'EOF'
# Production Environment Variables
NODE_ENV=production

# Port Mappings
POLLER_PORT=2000
SENDER_PORT=4000

# Poller Configuration
TRACCAR_BASE=http://93.127.139.107:8082/api
TRACCAR_USERNAME=admin
TRACCAR_PASSWORD=admin
TUNNEL_URL=http://sender:4000/traccar/

# Sender Configuration
BSMART_API_URL=http://vts.latra.go.tz:8090/data-integration/integration/gps
BSMART_API_TOKEN=d2ViY29ycGx0ZDp3ZWJjMHJwQDIwMjU=
EOF
```

3. **Deploy services**
```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

4. **Verify deployment**
```bash
curl http://localhost:2000/health
curl http://localhost:4000/health
```

---

### Server 2: Development (69.197.176.231)

1. **Clone/Download the repository**
```bash
git clone https://github.com/halidi-hamidu/VTS-middleware-poller-sender.git
cd VTS-middleware-poller-sender
```

2. **Create `.env` file for development**
```bash
cat > .env << 'EOF'
# Development Environment Variables
NODE_ENV=development

# Port Mappings
POLLER_PORT=2000
SENDER_PORT=4000

# Poller Configuration
TRACCAR_BASE=http://69.197.176.231:8082/api
TRACCAR_USERNAME=admin
TRACCAR_PASSWORD=admin
TUNNEL_URL=http://sender:4000/traccar/

# Sender Configuration
BSMART_API_URL=http://vts.latra.go.tz:8090/data-integration/integration/gps
BSMART_API_TOKEN=d2ViY29ycGx0ZDp3ZWJjMHJwQDIwMjU=
EOF
```

3. **Deploy services**
```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

4. **Verify deployment**
```bash
curl http://localhost:2000/health
curl http://localhost:4000/health
```

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example Production | Example Development |
|----------|-------------|-------------------|---------------------|
| `TRACCAR_BASE` | Traccar API endpoint | `http://93.127.139.107:8082/api` | `http://69.197.176.231:8082/api` |
| `TUNNEL_URL` | Internal sender URL | `http://sender:4000/traccar/` | `http://sender:4000/traccar/` |
| `BSMART_API_URL` | BSMART/Latra endpoint | Same for all servers | Same for all servers |
| `BSMART_API_TOKEN` | API authentication | Same for all servers | Same for all servers |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `POLLER_PORT` | Poller host port | `2000` |
| `SENDER_PORT` | Sender host port | `4000` |
| `TRACCAR_USERNAME` | Traccar username | `admin` |
| `TRACCAR_PASSWORD` | Traccar password | `admin` |

---

## Quick Server Comparison

### Server 1 (Production)
- **Traccar**: `http://93.127.139.107:8082/api`
- **Purpose**: Production environment
- **Config**: `.env` with production settings

### Server 2 (Development)
- **Traccar**: `http://69.197.176.231:8082/api`
- **Purpose**: Development/Testing environment
- **Config**: `.env` with development settings

---

## Updating Services

### Update to latest version (all servers)

```bash
# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Restart services
docker compose -f docker-compose.prod.yml up -d
```

### Change configuration (specific server)

1. Edit `.env` file
2. Restart services:
```bash
docker compose -f docker-compose.prod.yml restart
```

---

## Monitoring

### View logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f poller
docker compose -f docker-compose.prod.yml logs -f sender
```

### Check status
```bash
docker compose -f docker-compose.prod.yml ps
```

### Health checks
```bash
# Poller
curl http://localhost:2000/health

# Sender
curl http://localhost:4000/health

# Device counters
curl http://localhost:4000/counters
```

---

## Troubleshooting

### Issue: Services not connecting to Traccar
- **Check**: Verify `TRACCAR_BASE` in `.env` matches your server
- **Test**: `curl http://YOUR_TRACCAR_IP:8082/api/server`

### Issue: Poller can't reach Sender
- **Check**: `TUNNEL_URL` should be `http://sender:4000/traccar/` (use service name, not localhost)
- **Verify**: Both services are on the same Docker network

### Issue: Different behavior on different servers
- **Check**: Compare `.env` files on both servers
- **Verify**: Both servers are using the same Docker image version

---

## Best Practices

1. ✅ **Never commit `.env` files** - They contain server-specific configuration
2. ✅ **Use `.env.example` as template** - Copy and modify for each server
3. ✅ **Keep images the same** - Only change environment variables
4. ✅ **Document server differences** - Maintain a table of which server uses which config
5. ✅ **Test on development first** - Deploy to Server 2 before Server 1
6. ✅ **Monitor both servers** - Set up alerts for both environments

---

## Security Notes

- Store `.env` files securely
- Never expose API tokens in logs
- Use different credentials for production and development if possible
- Regularly rotate API tokens

---

## Quick Commands Cheat Sheet

```bash
# Deploy
docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d

# Stop
docker compose -f docker-compose.prod.yml down

# Restart
docker compose -f docker-compose.prod.yml restart

# Logs
docker compose -f docker-compose.prod.yml logs -f

# Health
curl http://localhost:2000/health && curl http://localhost:4000/health
```
