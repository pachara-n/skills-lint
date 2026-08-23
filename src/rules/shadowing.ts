import type { SkillFolder } from "../scan.js";
import type { Issue } from "../types.js";

/**
 * Rule 3: the same skill name in several discovery roots — the first root
 * scanned wins and every later copy never loads (shadowing).
 */
export function shadowing(skills: SkillFolder[]): Issue[] {
  const issues: Issue[] = [];
  const firstSeen = new Map<string, SkillFolder>();

  for (const skill of skills) {
    if (!skill.hasSkillMd) continue; // nothing to shadow — the skill does not load anyway
    // agents route by the frontmatter name and fall back to the folder name
    const name = skill.frontmatter?.name || skill.name;
    const key = name.toLowerCase();

    const first = firstSeen.get(key);
    if (first) {
      issues.push({
        rule: "shadowed",
        path: skill.path,
        message: `"${name}" already exists in ${first.path} — this copy never loads (first scanned wins)`,
      });
    } else {
      firstSeen.set(key, skill);
    }
  }
  return issues;
}
