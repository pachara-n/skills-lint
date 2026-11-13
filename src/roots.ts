import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { FACTS, SCAN_DIRS } from "./agents.js";

const [CLAUDE_DIR, CLAUDE_SKILLS] = FACTS["claude.projectRoots"].value.dirs[0].split("/");

/**
 * True when `root` is a Claude Code skills folder (`.claude/skills`), project
 * level or user level. Claude Code reserves one folder name inside it, so
 * rules that know about the reserved name need to tell these roots apart.
 */
export function isClaudeSkillsRoot(root: string): boolean {
  return (
    basename(root).toLowerCase() === CLAUDE_SKILLS &&
    basename(dirname(root)).toLowerCase() === CLAUDE_DIR
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
    ...SCAN_DIRS.map((dir) => join(cwd, ...dir.split("/"))),
    ...SCAN_DIRS.map((dir) => join(home, ...dir.split("/"))),
  ];
  return [...new Set(candidates.filter((path) => existsSync(path)))];
}
