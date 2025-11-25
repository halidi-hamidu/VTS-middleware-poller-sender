# GitHub Container Registry Setup Guide

## Prerequisites

You need a GitHub Personal Access Token (PAT) with the following permissions:
- `write:packages`
- `read:packages`
- `delete:packages` (optional)

## Step 1: Create GitHub Personal Access Token

1. Go to GitHub Settings: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name like "Docker Registry Access"
4. Select scopes:
   - ✅ `write:packages`
   - ✅ `read:packages`
   - ✅ `delete:packages` (optional)
5. Click "Generate token"
6. **Copy the token** - you won't see it again!

## Step 2: Login to GitHub Container Registry

```bash
# Export your token (replace YOUR_GITHUB_TOKEN with your actual token)
export GITHUB_TOKEN=YOUR_GITHUB_TOKEN

# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u halidi-hamidu --password-stdin
```

You should see: `Login Succeeded`

## Step 3: Push Docker Images

Now you can push the images:

```bash
cd "/home/halidy/Documents/clients/james_traccar/services/REAL TIME_DATA_FETCHING_AND_FORARD_NO_REDIS"

# Push poller image
docker push ghcr.io/halidi-hamidu/vts-middleware-poller:latest

# Push sender image
docker push ghcr.io/halidi-hamidu/vts-middleware-sender:latest
```

## Step 4: Make Images Public (Optional)

By default, GitHub packages are private. To make them public:

1. Go to: https://github.com/halidi-hamidu?tab=packages
2. Click on the package name
3. Click "Package settings" (on the right)
4. Scroll down to "Danger Zone"
5. Click "Change visibility" → "Public"
6. Repeat for both packages:
   - `vts-middleware-poller`
   - `vts-middleware-sender`

## Alternative: Using GitHub Actions (Recommended for CI/CD)

Create `.github/workflows/docker-publish.yml`:

```yaml
name: Build and Push Docker Images

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME_POLLER: ${{ github.repository_owner }}/vts-middleware-poller
  IMAGE_NAME_SENDER: ${{ github.repository_owner }}/vts-middleware-sender

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Poller image
        uses: docker/build-push-action@v4
        with:
          context: .
          file: ./Dockerfile.poller
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME_POLLER }}:latest

      - name: Build and push Sender image
        uses: docker/build-push-action@v4
        with:
          context: .
          file: ./Dockerfile.sender
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME_SENDER }}:latest
```

With GitHub Actions, images will be automatically built and pushed on every commit to main branch.

## Verify Images

Once pushed, you can verify the images:

```bash
# Pull the images
docker pull ghcr.io/halidi-hamidu/vts-middleware-poller:latest
docker pull ghcr.io/halidi-hamidu/vts-middleware-sender:latest

# Test run
docker compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### "denied: permission_denied"
- Make sure your PAT has the correct scopes
- Verify you're logged in: `docker login ghcr.io`

### "unauthorized: unauthenticated"
- Your token may have expired
- Re-login with a new token

### Images are private and cannot be pulled
- Go to GitHub packages settings and make them public
- Or authenticate before pulling: `docker login ghcr.io`
