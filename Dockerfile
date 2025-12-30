FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Initialize database
RUN npm run init-db

# Expose port
EXPOSE 8080

# Start server
CMD ["npm", "start"]
