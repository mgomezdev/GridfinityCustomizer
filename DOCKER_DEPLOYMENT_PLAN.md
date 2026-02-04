# Docker Deployment Plan

This document outlines the plan for containerizing the Gridfinity Customizer application.

## Overview

The Gridfinity Customizer is a React + TypeScript application built with Vite. Since it produces static assets, the deployment strategy will use a multi-stage Docker build:
1. **Build stage**: Use Node.js to build the production assets
2. **Production stage**: Use nginx to serve the static files

## Files to Create

### 1. Dockerfile

A multi-stage Dockerfile with the following structure:

**Stage 1 - Build:**
- Base image: `node:20-alpine`
- Install dependencies with `npm ci`
- Run `npm run build` to generate production assets in `/dist`

**Stage 2 - Production:**
- Base image: `nginx:alpine`
- Copy built assets from build stage to nginx html directory
- Copy custom nginx configuration
- Expose port 80
- Run nginx in foreground mode

### 2. .dockerignore

Exclude unnecessary files from the Docker build context:
- `node_modules/`
- `dist/`
- `.git/`
- `*.log`
- `.vscode/`
- `.idea/`
- `*.md` (except README if needed)
- Test files

### 3. nginx.conf

Custom nginx configuration for serving the SPA:
- Serve static files from `/usr/share/nginx/html`
- Enable gzip compression for better performance
- Configure fallback to `index.html` for client-side routing
- Set appropriate cache headers for static assets
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)

### 4. docker-compose.yml

Docker Compose file for easy local development and deployment:
- Define the web service
- Map port 80 (or configurable via environment)
- Optional: Add health check
- Optional: Volume mounts for development

## Implementation Steps

### Step 1: Create .dockerignore
Create the `.dockerignore` file to optimize build context size.

### Step 2: Create nginx configuration
Create `nginx/nginx.conf` with:
- SPA routing support (try_files with fallback to index.html)
- Gzip compression
- Static asset caching
- Security headers

### Step 3: Create Dockerfile
Implement multi-stage build:
```
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Step 4: Create docker-compose.yml
Create compose file for simplified deployment commands.

### Step 5: Update documentation
Add Docker build and run instructions to README.md.

### Step 6: Test the build
- Build the image: `docker build -t gridfinity-customizer .`
- Run the container: `docker run -p 8080:80 gridfinity-customizer`
- Verify the application works at `http://localhost:8080`

## Build Commands

```bash
# Build the Docker image
docker build -t gridfinity-customizer .

# Run the container
docker run -d -p 8080:80 --name gridfinity gridfinity-customizer

# Using docker-compose
docker-compose up -d

# Stop the container
docker-compose down
```

## Considerations

### Image Size Optimization
- Use Alpine-based images for minimal size
- Multi-stage build to exclude build dependencies from final image
- Leverage Docker layer caching by copying package*.json before source files

### Security
- Run nginx as non-root user (optional enhancement)
- Add security headers in nginx config
- Keep base images updated

### Environment Variables
- Vite embeds environment variables at build time
- For runtime configuration, consider:
  - Build-time ARGs in Dockerfile
  - Environment variable substitution script at container startup

### Future Enhancements
- Add GitHub Actions workflow for automated Docker builds
- Push to container registry (Docker Hub, GitHub Container Registry)
- Add Kubernetes manifests for orchestrated deployment
- Health check endpoint

## File Structure After Implementation

```
GridfinityCustomizer/
├── Dockerfile
├── .dockerignore
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
└── ... (existing files)
```

## Testing Checklist

- [ ] Docker image builds successfully
- [ ] Container starts without errors
- [ ] Application loads in browser
- [ ] Client-side routing works (refresh on sub-routes)
- [ ] Static assets load correctly
- [ ] Gzip compression is active
