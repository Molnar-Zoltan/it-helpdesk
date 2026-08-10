# Changelog

All notable changes to this project are documented here, generated from
conventional commit history via [git-cliff](https://git-cliff.org).
## [0.8.0] - 2026-08-10

### Bug Fixes

- **tickets:** Reduce default page size from 20 to 10
- **auth:** Revoke logout's session live, not just at next refresh
- **users:** Revoke sessions live on password/email change and delete
- **auth:** Revoke old session live on refresh rotation too

### CI/CD

- **release:** Sync develop with main after every release

### Documentation

- **roadmap:** Add CI/CD pipeline as Step 8, renumber Agent dashboard and AI chat to 9/10
- **homepage:** Reflect rate limiting, Turnstile, and CI/CD as shipped
- **changelog:** Backfill 0.7.0 release history
- **readme:** Swap email notifications for unit/integration tests in roadmap

### Features

- **auth:** Add Redis-backed live session revocation service
- **auth:** Reject access tokens revoked mid-lifetime

### Refactor

- **frontend:** Centralize UI text into lib/constants/text
- Centralize non-text constants shared/duplicated across app

## [0.7.1] - 2026-08-08

### Bug Fixes

- **backend:** Fail fast on missing FRONTEND_URL instead of opening CORS wide


## [0.7.0] - 2026-08-08

### Bug Fixes

- **shared:** Remove stray WAITING_FOR_CUSTOMER from TicketStatus
- **docs:** Fix formatting in README for live demo section
- **shared:** Compile packages/shared to a consumable dist output
- **docker:** Fix production build entrypoint and lifecycle scripts
- **frontend:** Surface backend error code on ApiError
- **frontend:** Scope Button hover styles to enabled state
- **frontend:** Add cursor-pointer to password show/hide toggle
- **frontend:** Show a real message when the backend is unreachable
- **users:** Reject new password identical to current password
- **account:** Prevent reusing current password, fix misleading logout copy
- **forms:** Stop repeating password rules already shown in the checklist
- **account:** Extend toast duration for long password/email success messages
- **account:** Fix Email tab submit-button gating
- **account:** Un-hide the 'new password same as current' error
- **account:** Disable Delete account submit until a password is typed
- **account:** Clear session cookies on account deletion
- **account:** Force header to refetch on delete/logout instead of relying on cache clear
- **account:** Fix ordering bug from previous commit — clear() before refetch, not after
- **account:** Fix the actual root cause — useProfile() kept stale data across errors
- **homepage:** Replace build-methodology copy with a short project intro
- **homepage:** Reorder build plan, add Turnstile step
- **user-menu:** Adjust signed-in user display markup
- **users:** Reject email change when newEmail matches current email
- **tickets:** Wrap TicketListView in Suspense
- **tickets:** Fix sort-order button wrapping, drop repeated Sort: prefix
- **tickets:** Fix invisible Cancel link hover state
- **tickets:** Block new messages on a closed ticket
- **tickets:** Add horizontal padding to ticket row hover state
- **header:** Show spinner while profile is loading
- **backend:** Trust Cloud Run proxy hop for real client IPs
- **frontend:** Forward real client IP on login proxy call
- **frontend:** Scope login lockout to the attempted email
- **frontend:** Clear stale rate-limit message once cooldown expires
- **ci:** Add missing checkout step to the changes job

### CI/CD

- **release:** Add git-cliff config, version bump job, and AR cleanup policy
- **release:** Add deploy-backend job (Phase 3)
- **release:** Add explicit Docker Buildx setup before image build

### Documentation

- Update README to reflect auth completion
- Fill in live-demo and API-docs links in README header
- Update README deployment target from IBM Code Engine to Google Cloud Run
- Update architecture.md deployment target from IBM Code Engine to Google Cloud Run
- **readme:** Document pre-commit hooks setup
- **readme:** Refresh roadmap, seed data, and dev commands
- Document validation rules and their shared source
- Document ticket endpoints and update roadmap (Step 4.1.8)
- Fix Step 4.1.8 docs pass against actual develop state
- **readme:** Document Step 4.1.9 demo-data extraction
- Document demo-account protection guardrail
- Document Step 5.2 (API client & auth state)
- Document Step 5.3 (auth pages)
- Mark Step 5.3 done with the full auth-pages polish pass
- **readme:** Mark Step 5.4 done, update deployment status
- **tickets:** Document ticket frontend (Steps 5.5-5.7)
- **homepage:** Mark manual ticket creation done in status widget
- Document Step 6 login rate limiting
- Document ticket creation/message rate limiting
- Document Step 7 (Cloudflare Turnstile on registration)
- **readme:** Remove deployment from roadmap, already live
- **infra:** Fix cleanup policy gap - delete rule must cover Any tag state
- **infra:** Document Workload Identity Federation setup

### Features

- **db:** Add prisma schema and seed script
- **auth:** Register/login/JWT access+refresh tokens, role guards
- **users:** Add self-service account management with session-scoped revocation
- **validation:** Block emoji in names/passwords/emails, add name/email format validation
- **validation:** Strengthen password requirements
- **validation:** Layer local blocklist + HIBP soft-warn for password breach checks
- **deploy:** Add backend Dockerfile and bind server to 0.0.0.0 for Cloud Run
- **frontend:** Replace default page with backend-in-progress status screen
- **tickets:** Add POST /tickets (Step 4.1)
- **backend:** Add dev script alias for start:dev
- **tickets:** Add GET /tickets to list own tickets
- **tickets:** Add GET /tickets/:id (Step 4.1.3)
- **tickets:** Add pagination and sorting to GET /tickets
- **tickets:** Add customer-initiated ticket closing (Step 4.1.5)
- **prisma:** Add ticket close fields and Prisma workspace scripts
- **tickets:** Add POST /tickets/:id/messages (Step 4.1.6)
- **tickets:** Add GET /tickets/:id/messages
- **tickets:** Add customer-initiated ticket reopening (Step 4.1.7)
- **tickets:** Persist reopen reason on ticket reopen
- **shared:** Add isDemoUserId helper for protecting demo accounts
- **users:** Block password/email change and deletion on demo accounts
- **users:** Also block name changes on demo accounts
- **frontend:** Add design system tokens, UI primitives, and app shell (Step 5.1)
- **frontend:** Add auth cookie helpers and shared backend-fetch client
- **frontend:** Add /api/auth/{register,login,logout,refresh} route handlers
- **frontend:** Add /api/backend/[...path] proxy with transparent refresh
- **frontend:** Add browser-side apiClient and UserProfile type
- **frontend:** Add useProfile query and login/register/logout mutations
- **frontend:** Add proxy.ts for auth-only route redirects (Step 5.3)
- **frontend:** Add zod schemas for login/register forms
- **frontend:** Add /login page
- **frontend:** Add /register page with weak-password confirm flow
- **frontend:** Wire Header to real auth state (Step 5.3)
- **frontend:** Show auth-aware status banner on home page
- **frontend:** Add PasswordInput with show/hide toggle
- **frontend:** Add live password requirements checklist
- **frontend:** Tune register form validation timing per field
- **frontend:** Use PasswordInput in login form
- **frontend:** Add placeholders to register's name/email fields
- **frontend:** Disable login submit until both fields are filled
- **frontend:** Move Account/Log out into a UserMenu dropdown
- **frontend:** Add sonner for toast notifications
- **frontend:** Show a success toast on registration
- **frontend:** Show a 'Welcome back' toast on login
- **frontend:** Protect /account route (Step 5.4.1)
- **frontend:** Add Tabs UI primitive
- **frontend:** Add /account page shell with tabbed layout (Step 5.4.2)
- **account:** Add Name tab edit form (Step 5.4.3)
- **account:** Add Password tab (Step 5.4.4)
- **account:** Add Email tab (Step 5.4.5)
- **frontend:** Add Modal UI primitive
- **account:** Add Delete account tab (Step 5.4.6)
- **account:** Add demo-account protection UX (Step 5.4.7)
- **account:** Show user role in header menu and account page
- **ui:** Add Select component
- **tickets:** Add ticket creation types and validation schema
- **tickets:** Add useCreateTicket mutation hook
- **tickets:** Protect /tickets routes
- **tickets:** Add ticket creation page and form
- **tickets:** Add ticket list types and query hook
- **tickets:** Add status and priority badges
- **tickets:** Add ticket list page
- **tickets:** Invalidate ticket list on creation, link to it
- **tickets:** Add Cancel link to the new-ticket form
- **tickets:** Add close/reopen/message API layer for ticket detail
- **tickets:** Add ticket detail page
- **tickets:** Wire up ticket detail navigation
- **tickets:** Add character count to message composer
- **frontend:** Add Vercel analytics integration
- **backend:** Add Redis module and RateLimitService
- **backend:** Rate-limit POST /auth/login (5 attempts / 15 min)
- **frontend:** Surface login rate-limit lockout with live countdown
- **backend:** Anti-spam cooldowns on ticket creation and messages
- **frontend:** Surface ticket rate-limit cooldowns with live countdowns
- **backend:** Add TurnstileService for Cloudflare siteverify
- **backend:** Gate POST /auth/register behind Turnstile (Step 7.1)
- **frontend:** Add TurnstileWidget component (Step 7.2)
- **frontend:** Require Turnstile verification on register form

### Miscellaneous Tasks

- Scaffold monorepo (frontend, backend, shared package)
- Update README with npm workspaces setup
- Add database schema documentation
- **tooling:** Add pre-commit hooks with husky, lint-staged, commitlint
- Add concurrently and workspace scripts, update dependencies
- **commit:** Add AI commit metadata and enforce commitlint rules
- **package:** Add is-ci and update Node engine range
- **package:** Remove is-ci and simplify husky prepare script
- **docs:** Revise live demo information in README
- Add postinstall to build packages/shared
- **scripts:** Add dev:backend and dev:frontend to root
- **seed:** Expand seed tickets to cover all statuses and priorities
- **frontend:** Allow tracking frontend env example
- **repo:** Improve environment file ignore rules
- **frontend:** Use server-only BACKEND_API_URL instead of NEXT_PUBLIC_API_URL
- **header:** Point tickets nav link at /tickets/new for now
- **header:** Point tickets nav link back at /tickets
- **frontend:** Relocate @vercel/analytics dependency to frontend
- **backend:** Drop unused IpUsage model

### Performance

- **backend:** Strip peer-dependency and unused-provider dead weight from the production image
- **backend:** Strip unused Prisma query-compiler providers now that the exact reference is confirmed

### Refactor

- **user:** Split name into firstName and lastName
- **backend:** Centralize error/success messages and auth constants
- **backend:** Move HIBP config into common/constants
- **users:** Move AuthenticatedRequest to common/types
- **shared:** Centralize name/email/ticket length rules
- **backend:** Consume shared length constants in DTOs
- **seed:** Extract demo data into packages/shared (Step 4.1.9)
- **frontend:** Restructure components into folder-per-component
- **shared:** Centralize token TTLs in @helpdesk/shared
- **frontend:** Split cookie names out of auth-cookies.ts
- **shared:** Export granular password-strength checks
- **frontend:** Promote PasswordRequirements to components/ui
- **tickets:** Promote pagination constants to @helpdesk/shared
- **backend:** Generalize RateLimitService for non-failure-based limits

### Styling

- **frontend:** Rename brand to 'IT Helpdesk', center footer, add copyright line
- **frontend:** Make header/nav sticky on scroll
- **ui:** Add pointer cursor to Select


