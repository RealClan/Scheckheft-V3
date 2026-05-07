# Build Stage
FROM node:20-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Stage
FROM node:20-slim

WORKDIR /app
# better-sqlite3 needs build tools for native compilation during npm install
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# Install only production dependencies
RUN npm install --production
RUN npm install -g tsx

# Copy built assets and server file
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.ts ./server.ts

# Create data directory
RUN mkdir -p /app/data

EXPOSE 3000
ENV NODE_ENV=production
ENV DB_PATH=/app/data/subboss_service.db

# Command to start the server
CMD ["npm", "start"]
