# Stage 1: Build frontend + backend
FROM node:20-alpine AS build
RUN apk add --no-cache python3 make g++
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/ shared/
COPY server/ server/

# Install all dependencies (frontend + backend workspaces)
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html ./
COPY src/ src/
COPY public/ public/
RUN npm ci

# Build shared library
RUN npm run build --workspace=shared

# Build frontend
ENV VITE_API_BASE_URL=/api/v1
RUN npm run build

# Build backend
RUN npm run build --workspace=server

# Stage 2: Production image
FROM node:20-alpine
RUN apk add --no-cache tini nginx

WORKDIR /app

# Copy built frontend to nginx html dir
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/http.d/default.conf

# Copy backend runtime files
COPY --from=build /app/package.json package.json
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/shared shared
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/server/package.json server/package.json

# Seed data
COPY public/libraries/ public/libraries/

# Entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

RUN mkdir -p /data/images /tmp/nginx-image-cache

EXPOSE 80

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/docker-entrypoint.sh"]
