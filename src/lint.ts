import { scanRoot, type SkillFolder } from "./scan.js";
import { noSkillMd } from "./rules/no-skill-md.js";
import { descriptionRule } from "./rules/description.js";
import { shadowing } from "./rules/shadowing.js";
import { sprawled } from "./rules/sprawled.js";
import type { Issue } from "./types.js";

export function lint(roots: string[]): { skills: SkillFolder[]; issues: Issue[] } {
  const skills = roots.flatMap(scanRoot);
  // only roots that actually contain ≥1 skill folder count as "homes" —
  // an empty root cannot be part of a sprawl
  const activeRoots = [...new Set(skills.map((s) => s.root))];
  const issues = [
    ...noSkillMd(skills),
    ...descriptionRule(skills),
    ...shadowing(skills),
    ...sprawled(activeRoots),
  ];
  return { skills, issues };
}
