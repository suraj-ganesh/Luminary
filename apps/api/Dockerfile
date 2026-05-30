# Stage 1: Build the TypeScript application in a monorepo context
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy root monorepo package files
COPY package*.json ./
COPY turbo.json ./

# Copy internal workspaces needed for compiling the API
COPY packages/typescript-config ./packages/typescript-config
COPY packages/eslint-config ./packages/eslint-config

# Copy the API workspace files
COPY apps/api/package*.json ./apps/api/
COPY apps/api/tsconfig.json ./apps/api/

# Install all monorepo dependencies
RUN npm ci

# Copy API source code
COPY apps/api/src ./apps/api/src

# Transpile TypeScript to JavaScript using Turborepo
RUN npx turbo run build --filter=api

# Stage 2: Runtime environment using the official Playwright base image
FROM mcr.microsoft.com/playwright:v1.40.0-focal

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /usr/src/app

# Copy package configuration files for production install
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install production-only dependencies for the API workspace
RUN npm ci --omit=dev --workspace=api

# Copy built code from stage 1
COPY --from=builder /usr/src/app/apps/api/dist ./apps/api/dist

# Expose backend port
EXPOSE 8080

# Start server
CMD ["node", "apps/api/dist/index.js"]
