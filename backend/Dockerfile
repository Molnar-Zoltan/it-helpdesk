# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root monorepo configuration files to resolve workspaces
COPY package*.json ./

# Copy the shared package and the backend folder structure
COPY packages/shared ./packages/shared
COPY backend ./backend

# Install all dependencies across workspaces
RUN npm ci

# Build the shared package first — the backend build needs its compiled
# dist/ output to resolve @helpdesk/shared (package.json points main/types
# at dist/, not the raw TypeScript source)
RUN npm run build --workspace=packages/shared

# Generate the Prisma Client inside the backend workspace
RUN npm run prisma:generate --workspace=backend

# Build the NestJS backend application
RUN npm run build --workspace=backend

# Stage 2: Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package configurations for production setup
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY backend/package*.json ./backend/

# Install only production dependencies
RUN npm ci --omit=dev --workspace=backend

# Copy built files from the compilation stage
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/backend/dist ./backend/dist

# Custom Prisma output path (see backend/prisma/schema.prisma: output = "../generated/prisma")
# — the generated client lives here, NOT in node_modules/.prisma
COPY --from=builder /app/backend/generated ./backend/generated

EXPOSE 8080

ENV PORT=8080

# Run the NestJS application from the compiled dist directory
CMD ["node", "backend/dist/main.js"]