import type { SkillFolder } from "../scan.js";
import type { Issue } from "../types.js";

export const MAX_DESCRIPTION_LENGTH = 1024;

/** Rule 2: description missing or longer than the spec limit gets the skill silently dropped. */
export function descriptionRule(skills: SkillFolder[]): Issue[] {
  const issues: Issue[] = [];
  for (const skill of skills) {
    if (!skill.hasSkillMd) continue; // already reported by no-skill-md

    if (skill.frontmatter === null) {
      issues.push({
        rule: "description",
        path: skill.skillMdPath,
        message: "SKILL.md has no valid frontmatter block (missing or unterminated ---)",
      });
      continue;
    }

    const { description } = skill.frontmatter;
    if (description === "") {
      issues.push({
        rule: "description",
        path: skill.skillMdPath,
        message: "description is missing — the skill is silently dropped",
      });
    } else if (description.length > MAX_DESCRIPTION_LENGTH) {
      issues.push({
        rule: "description",
        path: skill.skillMdPath,
        message: `description is ${description.length} characters (max ${MAX_DESCRIPTION_LENGTH}) — the skill is silently dropped`,
      });
    }
  }
  return issues;
}
