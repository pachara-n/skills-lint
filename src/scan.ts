import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter, type Frontmatter } from "./parser.js";

export interface SkillFolder {
  root: string; // discovery root the folder was found in
  path: string; // folder path
  name: string; // folder name
  skillMdPath: string;
  hasSkillMd: boolean;
  frontmatter: Frontmatter | null; // null when SKILL.md is missing or unparseable
}

/** List the skill folders inside one discovery root (dot-folders skipped). */
export function scanRoot(root: string): SkillFolder[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => {
      const path = join(root, entry.name);
      const skillMdPath = join(path, "SKILL.md");
      const hasSkillMd = existsSync(skillMdPath);
      const frontmatter = hasSkillMd
        ? parseFrontmatter(readFileSync(skillMdPath, "utf8"))
        : null;
      return { root, path, name: entry.name, skillMdPath, hasSkillMd, frontmatter };
    });
}
