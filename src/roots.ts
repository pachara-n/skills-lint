import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

const AGENT_DIRS = [".agents", ".claude", ".codex", ".cursor", ".zcode"];

/**
 * True when `root` is a Claude Code skills folder (`.claude/skills`), project
 * level or user level. Claude Code reserves one folder name inside it, so
 * rules that know about the reserved name need to tell these roots apart.
 */
export function isClaudeSkillsRoot(root: string): boolean {
  return (
    basename(root).toLowerCase() === "skills" &&
    basename(dirname(root)).toLowerCase() === ".claude"
  );
}

/**
 * Well-known skills folders, project-level first (project skills shadow
 * user-level skills in most agents), then user-level. Only folders that
 * actually exist are returned. Deduplicated — running from the home
 * directory makes both lists identical.
 */
export function defaultRoots(cwd: string = process.cwd(), home: string = homedir()): string[] {
  const candidates = [
    ...AGENT_DIRS.map((dir) => join(cwd, dir, "skills")),
    ...AGENT_DIRS.map((dir) => join(home, dir, "skills")),
  ];
  return [...new Set(candidates.filter((path) => existsSync(path)))];
}
