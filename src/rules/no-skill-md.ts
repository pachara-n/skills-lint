import type { SkillFolder } from "../scan.js";
import type { Issue } from "../types.js";

/** Rule 1: a skill folder without SKILL.md never loads. */
export function noSkillMd(skills: SkillFolder[]): Issue[] {
  return skills
    .filter((skill) => !skill.hasSkillMd)
    .map((skill) => ({
      rule: "no-skill-md" as const,
      path: skill.path,
      message: "folder has no SKILL.md — this skill will never load",
    }));
}
