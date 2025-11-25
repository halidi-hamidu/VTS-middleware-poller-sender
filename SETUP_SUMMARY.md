# VTS Middleware Setup Summary

## ✅ What Has Been Completed

### 1. **Repository Setup**
- ✅ Created GitHub repository: `VTS-middleware-poller-sender`
- ✅ Pushed all code to: https://github.com/halidi-hamidu/VTS-middleware-poller-sender
- ✅ Added proper .gitignore for clean repository

### 2. **Docker Configuration**
- ✅ Created `Dockerfile.poller` for poller service
- ✅ Created `Dockerfile.sender` for sender service
- ✅ Created `docker-compose.yml` for local development (builds from source)
- ✅ Created `docker-compose.prod.yml` for production (uses pre-built images)

### 3. **GitHub Container Registry**
- ✅ Configured images to use GitHub Container Registry:
  - `ghcr.io/halidi-hamidu/vts-middleware-poller:latest`
  - `ghcr.io/halidi-hamidu/vts-middleware-sender:latest`
- ✅ Added GitHub Actions workflow for automated builds
- ✅ Images will be automatically built on every push to main branch

### 4. **Documentation**
- ✅ `README.md` - Main documentation
- ✅ `DEPLOYMENT.md` - Complete deployment guide
- ✅ `GITHUB_REGISTRY_SETUP.md` - GitHub Container Registry setup
- ✅ `.env.example` - Environment configuration template

## 📦 Docker Images

The Docker images have been built locally and are ready to be pushed to GitHub Container Registry.

### Current Status:
- ✅ Images built locally successfully
- ⏳ **Waiting for GitHub Actions to build and push automatically**

## 🚀 Next Steps

### GitHub Actions will automatically:
1. Build both Docker images
2. Push them to GitHub Container Registry
3. Make them available at:
   - `ghcr.io/halidi-hamidu/vts-middleware-poller:latest`
   - `ghcr.io/halidi-hamidu/vts-middleware-sender:latest`

### Check Build Status:
Visit: https://github.com/halidi-hamidu/VTS-middleware-poller-sender/actions

The workflow should start automatically after the push.

### Making Images Public (Recommended):
Once the GitHub Actions workflow completes:

1. Go to: https://github.com/halidi-hamidu?tab=packages
2. Click on each package:
   - `vts-middleware-poller`
   - `vts-middleware-sender`
3. Click "Package settings" → "Change visibility" → "Public"

This allows anyone to pull the images without authentication.

## 🎯 Using the Images in Production

### Option 1: Pull from GitHub Container Registry (Recommended)

```bash
# Clone or download docker-compose.prod.yml
cd your-server

# Create .env file (optional)
cp .env.example .env
# Edit .env with your configuration

# Pull and start services
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps
curl http://localhost:2000/health
curl http://localhost:4000/health
```

### Option 2: Build from Source

```bash
# Clone repository
git clone git@github.com:halidi-hamidu/VTS-middleware-poller-sender.git
cd VTS-middleware-poller-sender

# Build and start
docker compose up -d --build

# Check status
docker compose ps
```

## 📊 Repository Structure

```
VTS-middleware-poller-sender/
├── .github/
│   └── workflows/
│       └── docker-publish.yml    # Automated Docker builds
├── poller.js                      # Poller service source
├── sender.js                      # Sender service source
├── package.json                   # Node.js dependencies
├── Dockerfile.poller              # Poller Docker image
├── Dockerfile.sender              # Sender Docker image
├── docker-compose.yml             # Development (builds from source)
├── docker-compose.prod.yml        # Production (uses pre-built images)
├── .env.example                   # Environment configuration template
├── .gitignore                     # Git ignore rules
├── README.md                      # Main documentation
├── DEPLOYMENT.md                  # Deployment guide
└── GITHUB_REGISTRY_SETUP.md      # Registry setup guide
```

## 🔧 Key Configuration

### Environment Variables (Production)

Create a `.env` file or set in docker-compose.prod.yml:

```env
TRACCAR_BASE=http://93.127.139.107:8082/api
BSMART_API_URL=http://vts.latra.go.tz:8090/data-integration/integration/gps
BSMART_API_TOKEN=your_token_here
```

### Ports

- **Poller**: 2000 (Traccar API polling)
- **Sender**: 4000 (BSMART/Latra forwarding)

### Networking

Both services communicate via Docker bridge network: `traccar-network`

```
Traccar API → Poller (2000) → Sender (4000) → BSMART/Latra API
```

## 📝 Monitoring Commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Check health
curl http://localhost:2000/health  # Poller
curl http://localhost:4000/health  # Sender

# View device counters
curl http://localhost:4000/counters

# Container stats
docker stats traccar-poller traccar-sender
```

## 🔄 Updating Services

```bash
# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Restart with new images
docker compose -f docker-compose.prod.yml up -d

# Or in one command
docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d
```

## ✨ Benefits of This Setup

1. **Automated Builds**: GitHub Actions builds images on every commit
2. **Easy Deployment**: Just pull images and run, no build required
3. **Version Control**: All code in GitHub with proper versioning
4. **Production Ready**: Separate production config with pre-built images
5. **Documentation**: Complete guides for deployment and maintenance
6. **Health Checks**: Built-in health monitoring for both services
7. **Persistent Data**: Volume mounts for logs and state persistence

## 🆘 Troubleshooting

See `DEPLOYMENT.md` for detailed troubleshooting steps.

Quick checks:
1. GitHub Actions status: Check the Actions tab
2. Images availability: Visit packages section
3. Service health: `curl http://localhost:2000/health`
4. Logs: `docker compose -f docker-compose.prod.yml logs`

## 📚 Additional Resources

- GitHub Repository: https://github.com/halidi-hamidu/VTS-middleware-poller-sender
- GitHub Actions: https://github.com/halidi-hamidu/VTS-middleware-poller-sender/actions
- GitHub Packages: https://github.com/halidi-hamidu?tab=packages
