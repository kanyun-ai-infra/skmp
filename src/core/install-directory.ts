/**
 * Install Directory Detection (Step 3.4)
 *
 * Automatically detects the correct installation directory based on project context.
 * Supports multiple AI coding assistants (Claude Code, Cursor, GitHub Copilot, etc.)
 */

import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { type AgentType, agents } from './agent-registry.js';

/**
 * Default skills directory when no AI tool is detected
 */
export const DEFAULT_SKILLS_DIR = '.skills';

/**
 * Agent priority order for detection
 * 当多个 agent 目录同时存在时，按此顺序选择
 */
const AGENT_PRIORITY: AgentType[] = [
  'claude-code', // .claude
  'cursor', // .cursor
  'windsurf', // .windsurf
  'github-copilot', // .github
  'codex', // .codex
  'gemini-cli', // .gemini
  'goose', // .goose
  'roo', // .roo
  'kilo', // .kilocode
  'kiro-cli', // .kiro
  'opencode', // .opencode
  'trae', // .trae
  'amp', // .agents
  'antigravity', // .agent
  'droid', // .factory
  'clawdbot', // skills
  'neovate', // .neovate
];

/**
 * Options for directory detection
 */
export interface DetectOptions {
  /** Use global installation directory */
  global?: boolean;
  /** Custom working directory (default: process.cwd()) */
  cwd?: string;
}

/**
 * Detect the installation directory based on project context
 *
 * 检测逻辑:
 * 1. 检查项目目录中是否存在 AI 工具的配置目录（如 .claude, .cursor 等）
 * 2. 按优先级选择第一个检测到的目录
 * 3. 如果没有检测到任何 AI 工具，回退到默认目录 .skills
 *
 * @param options - Detection options
 * @returns Installation directory path
 *
 * @example
 * // 项目中有 .claude 目录
 * await detectInstallDirectory() // '/path/to/project/.claude/skills'
 *
 * // 项目中有 .cursor 目录
 * await detectInstallDirectory() // '/path/to/project/.cursor/skills'
 *
 * // 没有检测到 AI 工具
 * await detectInstallDirectory() // '/path/to/project/.skills'
 *
 * // 全局安装
 * await detectInstallDirectory({ global: true }) // '~/.claude/skills'
 */
export async function detectInstallDirectory(options: DetectOptions = {}): Promise<string> {
  const { global: isGlobal = false, cwd } = options;
  const baseDir = cwd || process.cwd();

  // 全局安装：检测全局安装的 agent
  if (isGlobal) {
    for (const agentType of AGENT_PRIORITY) {
      const config = agents[agentType];
      // 检查全局配置目录是否存在
      if (await config.detectInstalled()) {
        return config.globalSkillsDir;
      }
    }
    // 默认使用 claude-code 的全局目录
    return agents['claude-code'].globalSkillsDir;
  }

  // 项目级安装：检测项目中的 agent 目录
  for (const agentType of AGENT_PRIORITY) {
    const config = agents[agentType];
    const agentDir = getAgentBaseDir(agentType, baseDir);

    if (agentDir && existsSync(agentDir)) {
      return join(baseDir, config.skillsDir);
    }
  }

  // 没有检测到任何 AI 工具，使用默认目录
  return join(baseDir, DEFAULT_SKILLS_DIR);
}

/**
 * Get the base directory for an agent (without /skills suffix)
 *
 * @param agentType - Agent type
 * @param baseDir - Base project directory
 * @returns Agent base directory path or null if not applicable
 */
function getAgentBaseDir(agentType: AgentType, baseDir: string): string | null {
  const config = agents[agentType];
  const skillsDir = config.skillsDir;

  // 从 skillsDir 中提取 agent 目录（去掉 /skills 后缀）
  // 例如: .claude/skills -> .claude
  //       .github/skills -> .github
  //       skills -> null (没有 agent 目录)
  if (skillsDir.includes('/')) {
    const agentDirName = skillsDir.split('/')[0];
    return join(baseDir, agentDirName);
  }

  // 像 clawdbot 这样直接使用 skills 目录的情况
  return null;
}

/**
 * Ensure the installation directory exists
 *
 * @param installDir - Installation directory path
 *
 * @example
 * await ensureInstallDirectory('/path/to/project/.claude/skills')
 */
export async function ensureInstallDirectory(installDir: string): Promise<void> {
  if (!existsSync(installDir)) {
    mkdirSync(installDir, { recursive: true });
  }
}

/**
 * Get skill installation path within the installation directory
 *
 * @param installDir - Base installation directory
 * @param skillName - Short skill name (without scope)
 * @returns Full path to the skill directory
 *
 * @example
 * getSkillInstallPath('/path/.claude/skills', 'planning-with-files')
 * // '/path/.claude/skills/planning-with-files'
 */
export function getSkillInstallPath(installDir: string, skillName: string): string {
  return join(installDir, skillName);
}

/**
 * Check for conflicts before installing a skill
 *
 * 检查安装目录中是否已存在同名 skill 目录。
 * 如果存在则抛出错误，提示用户如何解决。
 *
 * @param installDir - Base installation directory (e.g., '/path/.claude/skills')
 * @param skillName - Short skill name (without scope)
 * @throws Error if skill directory already exists
 *
 * @example
 * await checkConflict('/path/.claude/skills', 'planning-with-files');
 * // Throws: "Conflict: 'planning-with-files' already exists at /path/.claude/skills/planning-with-files"
 */
export async function checkConflict(installDir: string, skillName: string): Promise<void> {
  const skillPath = getSkillInstallPath(installDir, skillName);

  if (existsSync(skillPath)) {
    throw new Error(
      `Conflict: '${skillName}' already exists at ${skillPath}\n` +
        `To overwrite, remove it first:\n` +
        `  rm -rf "${skillPath}"\n` +
        `Or use --force flag to overwrite automatically.`,
    );
  }
}
