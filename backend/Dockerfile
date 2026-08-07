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

# Install only production dependencies, then strip dead weight from the
# SAME layer. This must be one RUN, not two: a separate `RUN rm -rf` after
# `npm ci` would only mark those files deleted in a later layer's diff —
# the earlier layer's bytes are still stored (and billed) in the registry,
# since OCI layers are additive, not a snapshot of final state. Deleting in
# the same layer that created the files means they're never committed to a
# stored layer at all.
#
# What's being stripped and why:
#
# 1. @prisma/client declares "prisma" (the CLI) as a peerDependency, and npm
#    auto-installs peer deps regardless of --omit=dev — `--omit=peer` does
#    NOT reliably exclude it with `npm ci` (tested directly: the lockfile
#    still pins it in). The CLI itself, plus ITS OWN transitive deps, add
#    ~188MB of pure dead weight: an embedded Prisma Studio UI (react,
#    @radix-ui, @visx, elkjs, d3), a MySQL driver, a second unused Postgres
#    driver (this project already uses `pg`), and the `effect` library.
#    Verified via `npm ls --all` that none of these has any other dependent
#    in this project's real dependency graph, and via grep that
#    @prisma/client's runtime code only ever requires
#    @prisma/client-runtime-utils and Node built-ins.
#
# 2. @prisma/client's WASM query compiler (Prisma 7's Rust-free engine)
#    ships a separate ~9-10MB binary pair (.js + .mjs) for EVERY supported
#    database — postgresql, mysql, sqlite, sqlserver, cockroachdb — even
#    though this project only ever uses postgresql. This is a known,
#    currently-unresolved Prisma limitation, not something schema.prisma
#    can configure away yet (see prisma/prisma#29095). The .mjs half (36MB)
#    is provably dead regardless of provider: this project's generator sets
#    moduleFormat = "cjs", and Node's require() can never load a .mjs file —
#    that's a hard runtime rule, not a guess.
#
#    The remaining .js variants for mysql/sqlite/sqlserver/cockroachdb
#    (~35MB more) are NOT removed here — verify locally which file the real
#    generated client references first:
#      grep -r query_compiler backend/generated/prisma/*.js
#    then extend this rm -rf once confirmed. Deleting the wrong one silently
#    breaks the app at runtime, so this step is deliberately left for local
#    verification rather than guessed at here.
#
# Re-verify both lists if @prisma/client is bumped to a new major/minor.
RUN npm ci --omit=dev --workspace=backend --ignore-scripts && \
    rm -rf \
      node_modules/prisma \
      node_modules/mysql2 \
      node_modules/postgres \
      node_modules/effect \
      node_modules/@electric-sql \
      node_modules/@prisma/studio-core \
      node_modules/@prisma/dev \
      node_modules/@visx \
      node_modules/@radix-ui \
      node_modules/elkjs \
      node_modules/react \
      node_modules/react-dom \
      node_modules/d3-array \
      node_modules/d3-shape \
      node_modules/@prisma/client/runtime/*.mjs \
      node_modules/@prisma/client/runtime/*.mjs.map

# Copy built files from the compilation stage
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/backend/dist ./backend/dist

# Custom Prisma output path (see backend/prisma/schema.prisma: output = "../generated/prisma")
# — the generated client lives here, NOT in node_modules/.prisma
COPY --from=builder /app/backend/generated ./backend/generated

EXPOSE 8080

ENV PORT=8080

# Run the NestJS application from the compiled dist directory
CMD ["node", "backend/dist/src/main.js"]