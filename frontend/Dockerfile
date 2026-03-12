FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src
COPY index.html ./
COPY tsconfig.json ./

# Install http-server globally
RUN npm install -g http-server

# Expose port
EXPOSE 3001

# Start HTTP server
CMD ["http-server", "-p", "3001", "-c-1", "."]
