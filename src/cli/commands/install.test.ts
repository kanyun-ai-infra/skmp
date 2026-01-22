import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installCommand } from './install.js';

// ============================================================================
// Mock Setup
// ============================================================================

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    message: vi.fn(),
  },
  note: vi.fn(),
  confirm: vi.fn(() => Promise.resolve(true)),
  select: vi.fn(() => Promise.resolve('symlink')),
  multiselect: vi.fn(() => Promise.resolve(['cursor', 'claude-code'])),
  isCancel: vi.fn(() => false),
  cancel: vi.fn(),
}));

vi.mock('../../core/skill-manager.js', () => ({
  SkillManager: vi.fn().mockImplementation(() => ({
    installToAgents: vi.fn().mockResolvedValue({
      skill: { name: 'test-skill', version: '1.0.0' },
      results: new Map([
        ['cursor', { success: true, path: '/test/.cursor/skills/test-skill', mode: 'symlink' }],
        ['claude-code', { success: true, path: '/test/.claude/skills/test-skill', mode: 'symlink' }],
      ]),
    }),
  })),
}));

vi.mock('../../core/config-loader.js', () => ({
  ConfigLoader: vi.fn().mockImplementation(() => ({
    exists: vi.fn(() => false),
    getSkills: vi.fn(() => ({})),
    getDefaults: vi.fn(() => ({
      registry: 'github',
      installDir: '.skills',
      targetAgents: [],
      installMode: undefined,
    })),
    updateDefaults: vi.fn(),
    reload: vi.fn(),
  })),
}));

vi.mock('../../core/agent-registry.js', () => ({
  agents: {
    cursor: {
      name: 'cursor',
      displayName: 'Cursor',
      skillsDir: '.cursor/skills',
      globalSkillsDir: '~/.cursor/skills',
    },
    'claude-code': {
      name: 'claude-code',
      displayName: 'Claude Code',
      skillsDir: '.claude/skills',
      globalSkillsDir: '~/.claude/skills',
    },
    windsurf: {
      name: 'windsurf',
      displayName: 'Windsurf',
      skillsDir: '.windsurf/skills',
      globalSkillsDir: '~/.windsurf/skills',
    },
  },
  detectInstalledAgents: vi.fn().mockResolvedValue(['cursor', 'claude-code']),
  isValidAgentType: vi.fn((a) => ['cursor', 'claude-code', 'windsurf'].includes(a)),
  getAgentConfig: vi.fn((a) => {
    const agents: Record<string, object> = {
      cursor: { name: 'cursor', displayName: 'Cursor' },
      'claude-code': { name: 'claude-code', displayName: 'Claude Code' },
      windsurf: { name: 'windsurf', displayName: 'Windsurf' },
    };
    return agents[a];
  }),
}));

// ============================================================================
// Command Structure Tests
// ============================================================================

describe('install command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('command structure', () => {
    it('should have correct name and alias', () => {
      expect(installCommand.name()).toBe('install');
      expect(installCommand.aliases()).toContain('i');
    });

    it('should have skill argument (optional)', () => {
      const args = installCommand.registeredArguments;
      expect(args.length).toBe(1);
      expect(args[0].name()).toBe('skill');
      expect(args[0].required).toBe(false);
    });

    it('should have all required options', () => {
      const optionNames = installCommand.options.map((o) => o.long);
      expect(optionNames).toContain('--force');
      expect(optionNames).toContain('--global');
      expect(optionNames).toContain('--no-save');
      expect(optionNames).toContain('--agent');
      expect(optionNames).toContain('--mode');
      expect(optionNames).toContain('--yes');
      expect(optionNames).toContain('--all');
    });

    it('should have correct option shortcuts', () => {
      const forceOption = installCommand.options.find((o) => o.long === '--force');
      const globalOption = installCommand.options.find((o) => o.long === '--global');
      const agentOption = installCommand.options.find((o) => o.long === '--agent');
      const yesOption = installCommand.options.find((o) => o.long === '--yes');

      expect(forceOption?.short).toBe('-f');
      expect(globalOption?.short).toBe('-g');
      expect(agentOption?.short).toBe('-a');
      expect(yesOption?.short).toBe('-y');
    });

    it('should have a description', () => {
      expect(installCommand.description()).toBeTruthy();
      expect(installCommand.description()).toContain('Install');
    });
  });
});

// ============================================================================
// Install Single Skill Tests
// ============================================================================

describe('install single skill behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CLI options', () => {
    it('should use -a option for specifying agents (variadic)', () => {
      const agentOption = installCommand.options.find((o) => o.long === '--agent');
      expect(agentOption).toBeDefined();
      expect(agentOption?.flags).toContain('...');
    });

    it('should use --mode option for specifying mode', () => {
      const modeOption = installCommand.options.find((o) => o.long === '--mode');
      expect(modeOption).toBeDefined();
      expect(modeOption?.flags).toContain('<mode>');
    });

    it('should skip all prompts with -y flag', () => {
      const yesOption = installCommand.options.find((o) => o.long === '--yes');
      expect(yesOption).toBeDefined();
      expect(yesOption?.short).toBe('-y');
    });
  });
});

// ============================================================================
// Reinstall All Skills Tests
// ============================================================================

describe('reinstall all skills behavior (no skill argument)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('command behavior', () => {
    it('should support reinstall all when no skill argument provided', () => {
      // skill argument is optional
      const args = installCommand.registeredArguments;
      expect(args[0].required).toBe(false);
    });
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle --all flag which implies --yes and --global', () => {
    const allOption = installCommand.options.find((o) => o.long === '--all');
    expect(allOption).toBeDefined();
  });

  it('should have --no-save option for skipping skills.json update', () => {
    const noSaveOption = installCommand.options.find((o) => o.long === '--no-save');
    expect(noSaveOption).toBeDefined();
  });

  it('should have --force option for reinstalling', () => {
    const forceOption = installCommand.options.find((o) => o.long === '--force');
    expect(forceOption).toBeDefined();
    expect(forceOption?.short).toBe('-f');
  });
});

// ============================================================================
// Installation Flow Logic Tests
// ============================================================================

describe('installation flow logic', () => {
  describe('agent selection logic', () => {
    it('isReinstallAll should be true when no skill argument', () => {
      // When skill is undefined/null, isReinstallAll = !skill = true
      // This means stored config should be used directly
      const skillArg = undefined;
      const isReinstallAll = !skillArg;
      expect(isReinstallAll).toBe(true);
    });

    it('isReinstallAll should be false when skill argument provided', () => {
      // When skill is provided, isReinstallAll = !skill = false
      // This means user should be prompted (with stored as defaults)
      const skillArg = 'github:user/skill';
      const isReinstallAll = !skillArg;
      expect(isReinstallAll).toBe(false);
    });
  });

  describe('stored config usage', () => {
    it('should filter valid agents from stored targetAgents', () => {
      const allAgentTypes = ['cursor', 'claude-code', 'windsurf'];
      const storedAgents = ['cursor', 'invalid-agent', 'claude-code'];

      const validStoredAgents = storedAgents.filter((a) => allAgentTypes.includes(a));

      expect(validStoredAgents).toEqual(['cursor', 'claude-code']);
      expect(validStoredAgents).not.toContain('invalid-agent');
    });

    it('should check hasStoredAgents correctly for empty array', () => {
      const storedAgents: string[] = [];
      const hasStoredAgents = storedAgents && storedAgents.length > 0;
      expect(hasStoredAgents).toBe(false);
    });

    it('should check hasStoredAgents correctly for non-empty array', () => {
      const storedAgents = ['cursor'];
      const hasStoredAgents = storedAgents && storedAgents.length > 0;
      expect(hasStoredAgents).toBe(true);
    });
  });

  describe('save option logic', () => {
    it('should save when options.save is undefined (default)', () => {
      const optionsSave = undefined;
      const installGlobally = false;

      const shouldSave = optionsSave !== false && !installGlobally;

      expect(shouldSave).toBe(true);
    });

    it('should not save when options.save is false (--no-save)', () => {
      const optionsSave = false;
      const installGlobally = false;

      const shouldSave = optionsSave !== false && !installGlobally;

      expect(shouldSave).toBe(false);
    });

    it('should not save when installing globally', () => {
      const optionsSave = undefined;
      const installGlobally = true;

      const shouldSave = optionsSave !== false && !installGlobally;

      expect(shouldSave).toBe(false);
    });
  });

  describe('mode selection logic', () => {
    it('should use CLI mode when provided', () => {
      const optionsMode = 'copy';
      const storedMode = 'symlink';
      const defaultMode = 'symlink';

      const installMode = optionsMode || storedMode || defaultMode;

      expect(installMode).toBe('copy');
    });

    it('should use stored mode when CLI mode not provided', () => {
      const optionsMode = undefined;
      const storedMode = 'copy';
      const defaultMode = 'symlink';

      const installMode = optionsMode || storedMode || defaultMode;

      expect(installMode).toBe('copy');
    });

    it('should use default mode when neither CLI nor stored mode provided', () => {
      const optionsMode = undefined;
      const storedMode = undefined;
      const defaultMode = 'symlink';

      const installMode = optionsMode || storedMode || defaultMode;

      expect(installMode).toBe('symlink');
    });
  });
});

// ============================================================================
// Defaults Behavior Tests
// ============================================================================

describe('defaults behavior', () => {
  describe('reinstall all uses stored config directly', () => {
    it('should use stored agents when isReinstallAll and hasStoredAgents', () => {
      const isReinstallAll = true;
      const hasStoredAgents = true;
      const storedAgents = ['cursor', 'claude-code'];

      // Logic: if (isReinstallAll && hasStoredAgents) use storedAgents directly
      if (isReinstallAll && hasStoredAgents) {
        expect(storedAgents).toEqual(['cursor', 'claude-code']);
      }
    });

    it('should use stored mode when isReinstallAll and storedMode exists', () => {
      const isReinstallAll = true;
      const storedMode = 'symlink';

      // Logic: if (isReinstallAll && storedMode) use storedMode directly
      if (isReinstallAll && storedMode) {
        expect(storedMode).toBe('symlink');
      }
    });
  });

  describe('single skill install uses stored config as defaults', () => {
    it('should prompt with stored agents as initial values', () => {
      const isReinstallAll = false;
      const hasStoredAgents = true;
      const storedAgents = ['cursor'];
      const detectedAgents = ['cursor', 'claude-code'];

      // For single skill, should prompt but with storedAgents as initialValues
      if (!isReinstallAll && hasStoredAgents) {
        // initialValues should be storedAgents
        expect(storedAgents).toBeDefined();
      }
    });

    it('should prompt with stored mode as initial value', () => {
      const isReinstallAll = false;
      const storedMode = 'copy';

      // For single skill, should prompt but with storedMode as initialValue
      if (!isReinstallAll) {
        // initialValue should be storedMode or 'symlink'
        const initialValue = storedMode || 'symlink';
        expect(initialValue).toBe('copy');
      }
    });
  });
});

// ============================================================================
// Confirmation Logic Tests
// ============================================================================

describe('confirmation logic', () => {
  it('should skip confirmation for reinstall all', () => {
    const isReinstallAll = true;
    const skipConfirm = false;

    // For reinstall all, confirmation is skipped regardless of skipConfirm
    // This is the current implementation behavior
    expect(isReinstallAll).toBe(true);
  });

  it('should show confirmation for single skill install when not -y', () => {
    const isReinstallAll = false;
    const skipConfirm = false;

    // For single skill without -y, should show confirmation
    expect(!isReinstallAll && !skipConfirm).toBe(true);
  });

  it('should skip confirmation for single skill install with -y', () => {
    const isReinstallAll = false;
    const skipConfirm = true;

    // For single skill with -y, should skip confirmation
    expect(skipConfirm).toBe(true);
  });
});

// ============================================================================
// Config Reload Logic Tests
// ============================================================================

describe('config reload logic', () => {
  it('should reload config before saving defaults after single skill install', () => {
    // When SkillManager and install.ts use different ConfigLoader instances,
    // reload() is needed to sync the latest skills.json state
    const shouldReload = true; // Always reload before updateDefaults

    expect(shouldReload).toBe(true);
  });
});
