# Skill Sync Checker

A utility skill that detects content drift between skill files and their source documents. If your skills are derived from project documentation (like `README.md`), this skill helps keep them in sync.

**Optimized for Cursor** with globs-based auto-activation. Other agents load this skill into every conversation — see [Agent Compatibility](#agent-compatibility) for recommendations.

## How It Works

Skills derived from other documents include **source markers** — HTML comments that link back to the original file:

```markdown
<!-- source: README.md -->
<!-- synced: 2026-02-12 -->

---
name: my-skill
description: ...
---

# My Skill
...
```

When triggered, the agent reads these markers, compares the skill content against the source document, and reports any differences.

## Usage

### Manual Check

Ask the agent directly:

```
"Check if the reskill-usage skill is up to date"
"Check all skills for sync status"
```

The agent will scan for source markers, compare content, and report differences.

### Automatic Reminders (Cursor Only)

In Cursor, this skill is automatically activated when you edit `README.md`. The agent will check if any skill depends on the file you're editing and remind you if syncing may be needed.

This works through Cursor's **globs** mechanism in the rule file (`.cursor/rules/skill-sync-checker.mdc`):

```yaml
---
description: "Detects content drift between skill files and their source documents..."
globs: "README.md"
alwaysApply: false
---
```

## Customizing Globs

The default globs only matches `README.md`. If your skills derive from other documents, you should expand the globs to cover those files.

**Why customize?** The agent can only remind you about sync when it's injected into context. If your skill sources from `docs/cli-spec.md` but globs doesn't include it, editing that file won't trigger any reminder.

### How to Customize

Edit `.cursor/rules/skill-sync-checker.mdc` and update the `globs` field:

```yaml
# Single additional source
globs: "README.md, docs/cli-spec.md"

# All docs in a directory
globs: "README.md, docs/**/*.md"

# Multiple specific files
globs: "README.md, docs/cli-spec.md, API.md"
```

### Tips

- Only add files that are actually used as `<!-- source: ... -->` targets in your skills
- Avoid overly broad patterns — each match injects the full skill into the agent's context, consuming tokens
- The globs field uses comma-separated glob patterns

## Adding Source Markers to Your Skills

To make a skill trackable by this checker, add source markers at the top of the `SKILL.md` file:

```markdown
<!-- source: README.md -->
<!-- synced: 2026-02-12 -->

---
name: my-skill
description: ...
---
```

| Marker                    | Required | Description                                          |
| ------------------------- | -------- | ---------------------------------------------------- |
| `<!-- source: <path> -->` | Yes      | Relative path to the source file (from project root) |
| `<!-- synced: <date> -->` | No       | ISO date of last sync (YYYY-MM-DD)                   |

A skill can have **multiple sources**:

```markdown
<!-- source: README.md -->
<!-- source: docs/cli-spec.md -->
<!-- synced: 2026-02-12 -->
```

## What Gets Compared

The agent focuses on **structural and factual differences**, not formatting:

**Checked:**
- Commands, options, or features present in source but missing from skill
- Items in the skill that no longer exist in the source
- Changed default values, paths, or configuration
- New sections in the source that should be reflected

**Ignored:**
- Minor wording differences (skills may rephrase for agent consumption)
- Formatting differences (tables vs lists, heading levels)
- Content the skill intentionally omits
- Section ordering

## Agent Compatibility

| Agent                        | Auto-trigger                                            | Token cost            |
| ---------------------------- | ------------------------------------------------------- | --------------------- |
| **Cursor**                   | Yes — only activates when you edit files matching globs | Low (on-demand)       |
| **Claude Code, Codex, etc.** | No — loads into every conversation                      | High (always present) |

> **Recommendation for non-Cursor agents:** This skill's full content (~250 lines) loads into every conversation when installed, consuming tokens even when not relevant. If you use Claude Code, Codex, or other agents that load all skills unconditionally, consider:
>
> - Installing this skill **to Cursor only** (`--agent cursor`)
> - On other agents, skip installation and use **manual sync checks** when needed

## Limitations

- This is a **convention-based** skill — it guides the agent through a comparison process, not an automated diffing tool
- The agent uses judgment to determine what constitutes a "significant" difference
- Files without `<!-- source: ... -->` markers are simply skipped
- Auto-trigger only works in Cursor (other agents load skills unconditionally without globs-based activation)
