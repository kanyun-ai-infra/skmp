# AGENTS.md

## Cursor Cloud specific instructions

### Overview

reskill is a single-package TypeScript CLI tool (not a monorepo). No databases, Docker, or external services are needed. All dev commands are documented in `CLAUDE.md` and `package.json` scripts.

### Running commands

Standard commands per `CLAUDE.md`:

- `pnpm lint` / `pnpm lint:fix` — Biome linter
- `pnpm typecheck` — TypeScript type checking
- `pnpm test:run` — unit tests (single run)
- `pnpm test:integration` — builds first, then runs integration tests
- `pnpm build` — production build with Rslib
- `pnpm dev` — watch mode (rebuilds on file changes)
- After build: `node dist/cli/index.js <command>` to manually test the CLI

### Known environment caveats

- **publisher.test.ts failures**: In the cloud VM, git remote URLs are rewritten by the credential helper (`url.https://x-access-token:TOKEN@github.com/.insteadOf`). This causes 3 unit tests in `src/core/publisher.test.ts` to fail (they assert exact SSH/HTTPS remote URLs). These are environment-specific false failures, not code bugs.
- **Lint warnings**: The repo has pre-existing Biome lint/format warnings (indentation style). `pnpm lint` exits non-zero. This is expected and does not indicate a problem with your changes — only check that your own code does not introduce new errors.
- **install command is interactive**: When testing `install` from the CLI, always pass `--agent <name> -y` to avoid interactive prompts that block the terminal.
