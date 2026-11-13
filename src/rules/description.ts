import type { SkillFolder } from "../scan.js";
import type { Issue } from "../types.js";
import { FACTS } from "../agents.js";

export const MAX_DESCRIPTION_LENGTH = FACTS["spec.descriptionMaxLength"].value;

const kind = (value: unknown): string =>
  Array.isArray(value) ? "a list" : typeof value === "object" ? "a mapping" : `a ${typeof value}`;

/** Rule 2: description missing, not text, or longer than the spec limit. */
export function descriptionRule(skills: SkillFolder[]): Issue[] {
  const issues: Issue[] = [];
  for (const skill of skills) {
    const fm = skill.frontmatter;
    // no SKILL.md or a broken block: reported by no-skill-md / frontmatter
    if (fm === null || !fm.ok) continue;

    const raw = fm.data["description"];
    const line = fm.lines["description"] ?? 1;
    if (raw === undefined || raw === null || raw === "") {
      issues.push({
        rule: "description",
        severity: "error",
        path: skill.skillMdPath,
        line: 1, // no description key to point at — point at the frontmatter block
        facts: ["spec.requiredFields"],
        message: "description is missing — the skill is silently dropped",
      });
    } else if (typeof raw !== "string") {
      issues.push({
        rule: "description",
        severity: "error",
        path: skill.skillMdPath,
        line,
        facts: ["spec.requiredFields"],
        message: `description must be text, not ${kind(raw)} — quote it if it is meant as text`,
      });
    } else if (raw.length > MAX_DESCRIPTION_LENGTH) {
      issues.push({
        rule: "description",
        severity: "error",
        path: skill.skillMdPath,
        line,
        facts: ["spec.descriptionMaxLength"],
        message: `description is ${raw.length} characters (max ${MAX_DESCRIPTION_LENGTH}) — the skill is silently dropped`,
      });
    }
  }
  return issues;
}
