# WhatsApp API Docker Image
# Uses Node.js with Puppeteer support for whatsapp-web.js

FROM node:18-slim

# Install dependencies for Puppeteer/Chrome and better-sqlite3
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    python3 \
    make \
    g++ \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create sessions and logs directories
RUN mkdir -p /app/sessions /app/logs /app/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV SESSION_PATH=/app/sessions
ENV DATA_PATH=/app/data
ENV AUTO_CONNECT=true

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the application
CMD ["node", "index.js"]
