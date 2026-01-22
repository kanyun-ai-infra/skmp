---
"reskill": minor
---

Add shell tab completion support for bash, zsh, and fish.

New features:
- `reskill completion install` - Install shell completion interactively
- `reskill completion uninstall` - Remove shell completion
- Subcommand completion: `reskill <Tab>` shows all available commands
- Skill name completion for `info`, `uninstall`, `update` commands
- Linked skill completion for `unlink` command
- Option completion for `install -<Tab>` (shows -f, -g, -a, --force, etc.)
- Agent name completion for `install -a <Tab>`
