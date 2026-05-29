# Base image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package configurations
COPY package*.json tsconfig.json knexfile.ts ./

# Install dependencies (including devDependencies for compiling)
RUN npm ci

# Copy all source files
COPY src/ ./src/

# Compile TypeScript
RUN npm run build

# --- Production Environment ---
FROM node:20-alpine AS runner

WORKDIR /app

# Set env properties
ENV NODE_ENV=production
ENV PORT=3000

# Copy compiled files and node_modules from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/knexfile.ts ./

# Expose server port
EXPOSE 3000

# Start server (bootstrap script handles migrations/seeding automatically on start!)
CMD ["npm", "start"]
