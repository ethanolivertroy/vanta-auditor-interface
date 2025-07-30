# Multi-stage build for efficient image size
# Stage 1: Build the Vanta SDK
FROM node:18-alpine AS sdk-builder
WORKDIR /sdk
COPY vanta-auditor-api-sdk-typescript/package*.json ./
RUN npm ci
COPY vanta-auditor-api-sdk-typescript/ ./
RUN npm run build

# Stage 2: Build the client
FROM node:18-alpine AS client-builder
WORKDIR /client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 3: Production image
FROM node:18-alpine
WORKDIR /app

# Install production dependencies
COPY package*.json ./
COPY --from=sdk-builder /sdk ./vanta-auditor-api-sdk-typescript
RUN npm ci --only=production

# Copy server files
COPY server/ ./server/

# Copy built client files
COPY --from=client-builder /client/dist ./client/dist

# Copy other necessary files
COPY .env* ./
COPY start.sh ./
RUN chmod +x start.sh

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start the application
CMD ["node", "server/index.js"]