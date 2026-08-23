import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const AGENT_DIRS = [".agents", ".claude", ".codex", ".cursor", ".zcode"];

/**
 * Well-known skills folders, project-level first (project skills shadow
 * user-level skills in most agents), then user-level. Only folders that
 * actually exist are returned.
 */
export function defaultRoots(cwd: string = process.cwd(), home: string = homedir()): string[] {
  const candidates = [
    ...AGENT_DIRS.map((dir) => join(cwd, dir, "skills")),
    ...AGENT_DIRS.map((dir) => join(home, dir, "skills")),
  ];
  return candidates.filter((path) => existsSync(path));
}
