# Commit Message Guidelines

These guidelines apply to human contributors and AI-generated commit messages.

Use Conventional Commits for all commit messages.

Format:

<type>(<optional scope>): <description>

[optional body]

## Subject guidelines

- Use the imperative mood (e.g., "add", "fix", "update", not "added", "fixed", "updated")
- Keep the subject under 100 characters (preferably under 72 characters)
- Do not end the subject with a period
- Do not use generic descriptions like:
  - Add X
  - Update X
  - Changes
  - Misc fixes

Allowed types:
- feat: new features
- fix: bug fixes
- chore: tooling, dependencies, configuration
- docs: documentation
- refactor: code changes without behavior changes
- test: tests
- perf: performance improvements
- build: build system or dependency changes
- ci: CI/CD configuration changes

Examples:

feat(auth): add JWT authentication

fix(api): handle expired tokens

chore(deps): update dependencies

docs(readme): improve setup instructions

## Body guidelines

- Keep the body optional for small, self-explanatory changes
- Add a body when the change requires additional context or contains multiple related changes
- Separate the subject and body with a blank line
- Prefer short bullet points over paragraph-style summaries
- Do not write the body as a single sentence or paragraph
- Use a maximum of 3-5 bullet points when a body is needed
- Each bullet should describe one specific change
- Explain what changed and why
- Do not repeat the subject in the body
- Avoid listing every modified file or transitive dependency
- Do not include generated details from package managers unless relevant

Example with body:

chore: improve monorepo development workflow

- Add concurrently for running frontend and backend together
- Add root workspace scripts for development commands
- Add Node.js 22.x engine requirement
- Update dependencies

Example without body:

fix(auth): handle expired session redirect