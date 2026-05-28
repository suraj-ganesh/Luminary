# Stage 1: Build the TypeScript application
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copy package configuration files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy the source code
COPY src ./src

# Transpile TypeScript to JavaScript
RUN npm run build

# Stage 2: Runtime environment using the official Playwright base image
FROM mcr.microsoft.com/playwright:v1.40.0-focal

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /usr/src/app

# Copy package config files
COPY package*.json ./

# Install production-only dependencies
RUN npm ci --only=production

# Copy built code from stage 1
COPY --from=builder /usr/src/app/dist ./dist

# Expose backend port
EXPOSE 8080

# Start server
CMD ["node", "dist/index.js"]
