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
#    ships a separate binary pair (.js + .mjs) for EVERY supported database
#    — postgresql, mysql, sqlite, sqlserver, cockroachdb — times two build
#    variants (fast/small), even though this project only ever uses one
#    provider. This is a known, currently-unresolved Prisma limitation, not
#    something schema.prisma can configure away yet (see
#    prisma/prisma#29095). The .mjs half is provably dead regardless of
#    provider: this project's generator sets moduleFormat = "cjs", and
#    Node's require() can never load a .mjs file — that's a hard runtime
#    rule, not a guess.
#
#    Which .js file is actually used is NOT a guess either — confirmed via
#    `grep -rn query_compiler backend/generated/prisma/` against a real
#    `prisma generate` output (this sandbox can't run that itself, no
#    access to binaries.prisma.sh, so this was verified locally instead):
#    backend/generated/prisma/internal/class.ts statically imports exactly
#    query_compiler_fast_bg.postgresql.js and
#    query_compiler_fast_bg.postgresql.wasm-base64.js — the "fast" build
#    (this project never sets compilerBuild = "small"), postgresql only.
#    Every other provider/variant combination is confirmed unreferenced and
#    removed below. Verified end-to-end after this change: built the image,
#    ran it against local Postgres/Redis, and confirmed a real Prisma query
#    (POST /auth/login against a seeded account) still returns a valid
#    token pair — not just that the app boots.
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
      node_modules/@prisma/client/runtime/*.mjs.map \
      node_modules/@prisma/client/runtime/query_compiler_fast_bg.mysql.js \
      node_modules/@prisma/client/runtime/query_compiler_fast_bg.mysql.wasm-base64.js \
      node_modules/@prisma/client/runtime/query_compiler_fast_bg.sqlite.js \
      node_modules/@prisma/client/runtime/query_compiler_fast_bg.sqlite.wasm-base64.js \
      node_modules/@prisma/client/runtime/query_compiler_fast_bg.sqlserver.js \
      node_modules/@prisma/client/runtime/query_compiler_fast_bg.sqlserver.wasm-base64.js \
      node_modules/@prisma/client/runtime/query_compiler_fast_bg.cockroachdb.js \
      node_modules/@prisma/client/runtime/query_compiler_fast_bg.cockroachdb.wasm-base64.js \
      node_modules/@prisma/client/runtime/query_compiler_small_bg.mysql.js \
      node_modules/@prisma/client/runtime/query_compiler_small_bg.mysql.wasm-base64.js \
      node_modules/@prisma/client/runtime/query_compiler_small_bg.sqlite.js \
      node_modules/@prisma/client/runtime/query_compiler_small_bg.sqlite.wasm-base64.js \
      node_modules/@prisma/client/runtime/query_compiler_small_bg.sqlserver.js \
      node_modules/@prisma/client/runtime/query_compiler_small_bg.sqlserver.wasm-base64.js \
      node_modules/@prisma/client/runtime/query_compiler_small_bg.cockroachdb.js \
      node_modules/@prisma/client/runtime/query_compiler_small_bg.cockroachdb.wasm-base64.js \
      node_modules/@prisma/client/runtime/query_compiler_small_bg.postgresql.js \
      node_modules/@prisma/client/runtime/query_compiler_small_bg.postgresql.wasm-base64.js

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