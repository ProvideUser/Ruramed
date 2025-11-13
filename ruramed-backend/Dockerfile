# Use official Node.js 20 LTS image
FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Install dependencies for production only
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Expose port (Cloud Run uses PORT env variable)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "server.js"]
