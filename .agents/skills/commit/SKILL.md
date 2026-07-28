# Commit Skill

Create and commit Conventional Commit messages for this repository.

## Workflow

1. Review the current working tree.
2. Check staged changes, unstaged changes, and untracked files to understand the full change scope.
3. Identify the main purpose of the changes.
4. Select the most appropriate commit type and optional scope.
5. Generate a concise Conventional Commit message.
6. Show the complete proposed commit message to the user.
7. Ask the user to confirm the commit message before creating the commit.
8. Only after confirmation, stage all changes and create the commit.

## Commit confirmation

After generating the commit message:

- Display the full commit message, including the optional body.
- Ask the user:

  Commit these changes? (yes/confirm)

- Accept only:
  - `yes`
  - `confirm`

- Do not run any git commands that create a commit before confirmation.
- Do not modify the proposed commit message after confirmation.

## Commit execution

After the user confirms:

1. Stage all changes:

   git add .

2. Create the commit using the approved message:

   git commit -m "<approved commit message>"

3. Preserve the exact approved commit message.

## Rules

- Always use Conventional Commits format:

  <type>(<optional scope>): <description>

- Use imperative mood in the subject:
  - add feature
  - fix bug
  - update config

- Keep the subject under 100 characters (preferably under 72 characters).
- Do not end the subject with a period.
- Avoid generic messages:
  - Add X
  - Update X
  - Changes
  - Misc fixes

## Allowed types

- feat: new features
- fix: bug fixes
- chore: tooling, dependencies, configuration
- docs: documentation
- refactor: code changes without behavior changes
- test: tests
- perf: performance improvements
- build: build system changes
- ci: CI/CD configuration changes

## Body

- Omit the body for small, self-explanatory changes.
- Add a body when additional context is useful or when multiple related changes are included.
- Separate the subject and body with a blank line.
- Use 2-5 bullet points for the body.
- Explain what changed and why.
- Do not write paragraph summaries.
- Do not list every changed file or dependency.
- Do not include generated details from package managers unless relevant.

## Examples

Small change:

fix(auth): handle expired session redirect

Larger change:

chore: improve monorepo development workflow

- Add concurrently for running frontend and backend together
- Add root workspace scripts
- Add Node.js 22.x engine requirement