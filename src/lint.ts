import { scanRoot, type SkillFolder } from "./scan.js";
import { noSkillMd } from "./rules/no-skill-md.js";
import { descriptionRule } from "./rules/description.js";
import { shadowing } from "./rules/shadowing.js";
import type { Issue } from "./types.js";

export function lint(roots: string[]): { skills: SkillFolder[]; issues: Issue[] } {
  const skills = roots.flatMap(scanRoot);
  const issues = [...noSkillMd(skills), ...descriptionRule(skills), ...shadowing(skills)];
  return { skills, issues };
}
