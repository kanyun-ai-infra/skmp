# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

reskill is a Git-based package manager for AI agent skills, similar to npm/Go modules. It provides declarative configuration (`skills.json`), version locking (`skills.lock`), and seamless synchronization for managing skills across projects and teams.

**Supported Agents:** Cursor, Claude Code, Codex, OpenCode, Windsurf, GitHub Copilot, and more.

## Tech Stack

- **Language:** TypeScript (ES Modules)
- **Runtime:** Node.js >= 18.0.0
- **Build Tool:** Rslib (Rspack-based library bundler)
- **Testing:** Vitest with @vitest/coverage-v8
- **CLI Framework:** Commander.js
- **Package Manager:** pnpm

## Development Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Development mode (watch)
pnpm build            # Build with Rslib
pnpm test             # Run tests in watch mode
pnpm test:run         # Run tests once
pnpm test:coverage    # Run tests with coverage
pnpm test:integration # Build and run integration tests
pnpm lint             # Lint with Biome
pnpm lint:fix         # Lint and auto-fix
pnpm typecheck        # TypeScript type checking
```

## Architecture

### System Overview

```
┌────────────────────────────────────────────────────────────────┐
│                         User Interface                         │
│                                                                │
│   CLI Commands: init, install, list, info, update, outdated    │
│                 uninstall, link, unlink                        │
└──────────────────────────────┬─────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────┐
│                        SkillManager                            │
│                    (Core Orchestrator)                         │
│                                                                │
│   - Coordinates all skill operations                           │
│   - Manages installation workflow                              │
│   - Handles multi-agent distribution                           │
└───────────────────────────────┬────────────────────────────────┘
                                │
    ┌──────────────────┼────────┼─────────┼──────────────────┐
    │                  │                  │                  │
    ▼                  ▼                  ▼                  ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   GitResolver    │   │  CacheManager    │   │    Installer     │
│                  │   │                  │   │                  │
│ - Parse refs     │   │ - Cache ops      │   │ - Symlink        │
│ - Resolve        │   │ - degit          │   │ - Copy           │
│   versions       │   │ - Storage        │   │ - Multi-         │
│ - Build URLs     │   │                  │   │   agent          │
└──────────────────┘   └──────────────────┘   └──────────────────┘
    │                  │                  │                  │
    └──────────────────┼──────────────────┼──────────────────┘
                       │                  │
    ┌──────────────────┼──────────────────┼──────────────────┐
    │                  │                  │                  │
    ▼                  ▼                  ▼                  ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  ConfigLoader    │   │   LockManager    │   │  AgentRegistry   │
│                  │   │                  │   │                  │
│ - skills.        │   │ - skills.        │   │ - Agent          │
│   json           │   │   lock           │   │   types          │
│ - Read/          │   │ - Version        │   │ - Paths          │
│   Write          │   │   tracking       │   │ - Detection      │
└──────────────────┘   └──────────────────┘   └──────────────────┘
```

### Directory Structure

```
src/
├── cli/              # CLI commands (Commander.js)
│   ├── commands/     # Individual command handlers
│   └── index.ts      # CLI entry point
├── core/             # Core business logic
│   ├── skill-manager.ts    # Main orchestrator
│   ├── git-resolver.ts     # Git URL parsing and version resolution
│   ├── cache-manager.ts    # Global cache (~/.reskill-cache)
│   ├── config-loader.ts    # skills.json handling
│   ├── lock-manager.ts     # skills.lock handling
│   ├── installer.ts        # Multi-agent installation (symlink/copy)
│   ├── agent-registry.ts   # Agent type definitions and paths
│   └── skill-parser.ts     # SKILL.md parsing
├── types/            # TypeScript type definitions
└── utils/            # Shared utilities (fs, git, logger)
```

### Core Module Responsibilities

- **SkillManager**: Main orchestrator integrating all components
- **GitResolver**: Parse skill refs (`github:user/repo@v1.0.0`), resolve versions, build repo URLs
- **CacheManager**: Global cache operations using degit
- **ConfigLoader**: Read/write `skills.json`
- **LockManager**: Read/write `skills.lock` for version locking
- **Installer**: Handle multi-agent installation to paths like `.cursor/skills/`, `.claude/skills/`
- **AgentRegistry**: Define supported agents and their installation paths

### Design Principles

1. **Git as Registry** - No additional service needed, any Git repo is a skill source
2. **Declarative Config** - skills.json clearly expresses project dependencies
3. **Version Locking** - skills.lock ensures team consistency
4. **Zero Invasion** - Does not modify existing project structure
5. **Global Cache** - Avoid redundant downloads
6. **Multi-Agent Support** - One skill, deploy to multiple AI agents

## Code Conventions

### Language Requirements
- All comments, variable names, and commit messages in English
- Use `node:` prefix for Node.js built-in imports
- Import order: Node built-ins → External deps → Internal modules
- File names: kebab-case (e.g., `skill-manager.ts`)

### TypeScript Standards
- Prefer `type` over `interface` for simple type aliases
- Use explicit return types for public functions
- Avoid `any`, use `unknown` with type guards
- Use `readonly` for immutable properties

### Error Handling
- Use descriptive error messages in English
- Log errors with appropriate log levels
- Always clean up resources in error cases

### File Operations
Use utilities from `src/utils/fs.ts`: `exists`, `readJson`, `writeJson`, `remove`, `ensureDir`, `createSymlink`

### Logging
Use `logger` from `src/utils/logger.ts`: `info`, `success`, `warn`, `error`, `debug`, `package`

## Testing Requirements

### Testing Strategy
reskill uses a **two-layer testing strategy**:

| Test Type | Purpose | Coverage Target |
|-----------|---------|----------------|
| **Unit Tests** | Code logic correctness | Core: 80%+, Utils: 90%+ |
| **Integration Tests** | CLI usability guarantee | CLI: 70%+ |

### Unit Tests
- Tests use Vitest with `.test.ts` suffix alongside source files
- Use temp directories for file system tests, clean up in `afterEach`
- Mock external dependencies (fs, network)

### Integration Tests
- Integration tests verify the built CLI behavior
- Run with `pnpm test:integration` (builds first, then runs CLI commands)
- Tests execute actual CLI commands against a temporary directory
- Location: `src/cli/commands/__integration__/`

### Bug Fix Protocol (TDD)
**MUST follow this workflow for all bug fixes:**

1. **Reproduce** - Write a failing test that reproduces the bug
2. **Fix** - Implement minimal code to make the test pass
3. **Verify** - Ensure no regression in other tests

```bash
# Manual CLI verification after build
pnpm build
node dist/cli/index.js init -y
node dist/cli/index.js list
```

## Changesets

This project uses Changesets for versioning.

### When to Add a Changeset
**REQUIRED** for:
- New features (minor version bump)
- Bug fixes (patch version bump)
- Breaking changes (major version bump)

**NOT REQUIRED** for:
- Documentation-only changes
- Internal refactoring without behavior change
- Test-only changes

### Creating a Changeset

```bash
pnpm changeset        # Create changeset (interactive)
```

**Format Requirements:**
- Files should be **bilingual** (English + Chinese)
- Structure: English content first, then Chinese content, separated by `---`
- Use `pnpm run version` or `pnpm changeset version` (NOT `pnpm version`)

### Version Types
- `patch`: Bug fixes (0.1.0 → 0.1.1)
- `minor`: New features (0.1.0 → 0.2.0)
- `major`: Breaking changes (0.1.0 → 1.0.0)

## CLI Development Workflow

### Command Pattern

```typescript
import { Command } from 'commander';
import { SkillManager } from '../../core/skill-manager.js';
import { logger } from '../../utils/logger.js';

interface MyCommandOptions {
  force?: boolean;
}

export const myCommand = new Command('my-command')
  .description('Description in English')
  .argument('[arg]', 'Argument description')
  .option('-f, --force', 'Force operation')
  .action(async (arg: string | undefined, options: MyCommandOptions) => {
    const manager = new SkillManager(process.cwd());
    try {
      // Implementation
      logger.success('Operation completed');
    } catch (error) {
      logger.error(`Failed: ${(error as Error).message}`);
      process.exit(1);
    }
  });
```

### CLI Testing Requirements
When creating or modifying CLI commands:

1. **Add integration tests** in `src/cli/commands/__integration__/`
2. **Add unit tests** alongside the command file
3. **Test checklist**:
   - [ ] `--help` shows correct usage
   - [ ] Success case returns exit code 0
   - [ ] Error case returns exit code 1
   - [ ] Output messages are correct
   - [ ] Files are created/modified as expected

### Pre-commit Verification

```bash
pnpm test:run && pnpm test:integration && pnpm typecheck && pnpm lint
```

## Git Commits

Use conventional commits: `type(scope): description`
- Types: feat, fix, docs, style, refactor, test, chore
