import { isClaudeSkillsRoot } from "../roots.js";
import { isReservedSkillName, type SkillFolder } from "../scan.js";
import type { Issue } from "../types.js";

/**
 * Rule 5: Claude Code reserves `.claude/skills/synced` for skills downloaded
 * from claude.ai, any capitalization, and skips a skill the user authors
 * under that name.
 */
export function reservedName(skills: SkillFolder[]): Issue[] {
  return skills
    .filter((skill) => isReservedSkillName(skill.name) && isClaudeSkillsRoot(skill.root))
    .map((skill) => ({
      rule: "reserved-name" as const,
      path: skill.path,
      message:
        "folder name is reserved by Claude Code for skills downloaded from claude.ai — this skill is skipped",
    }));
}
