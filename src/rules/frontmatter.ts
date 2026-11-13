import type { FrontmatterFailure } from "../parser.js";
import { isCodexSkillsRoot } from "../roots.js";
import type { SkillFolder } from "../scan.js";
import type { Issue } from "../types.js";

const FAILURE_MESSAGES: Record<Exclude<FrontmatterFailure, "yaml">, string> = {
  missing: "SKILL.md does not start with a --- frontmatter block on its first line",
  unterminated: "frontmatter block is not closed with ---",
  "not-mapping": "frontmatter must be key: value pairs, not a list or a single value",
};

/**
 * Rule: the frontmatter block exists, is closed, is valid YAML and is a
 * mapping; and no BOM hides it from agents that read the first line literally.
 */
export function frontmatterRule(skills: SkillFolder[]): Issue[] {
  const issues: Issue[] = [];
  for (const skill of skills) {
    const fm = skill.frontmatter;
    if (fm === null) continue; // no SKILL.md, reported by no-skill-md

    if (fm.bom) {
      const codex = isCodexSkillsRoot(skill.root);
      issues.push({
        rule: "frontmatter",
        severity: codex ? "error" : "warning",
        path: skill.skillMdPath,
        line: 1,
        facts: ["codex.bom"],
        message: `file starts with a byte order mark (BOM) before --- — Codex does not see the frontmatter${codex ? "" : " if it reads this folder"}; save the file as UTF-8 without BOM`,
      });
    }

    if (fm.ok) continue;
    if (fm.reason === "yaml") {
      issues.push({
        rule: "frontmatter",
        severity: "error",
        path: skill.skillMdPath,
        line: fm.line,
        facts: fm.unquotedColon
          ? ["claude.yamlError", "codex.unquotedColon"]
          : ["claude.yamlError"],
        message: fm.unquotedColon
          ? "a value contains an unquoted \": \" — wrap the value in quotes. Claude Code loads this skill with no fields set (so no description); Codex repairs it"
          : `frontmatter is not valid YAML: ${fm.message} — Claude Code loads this skill with no fields set`,
      });
    } else {
      issues.push({
        rule: "frontmatter",
        severity: "error",
        path: skill.skillMdPath,
        line: fm.line,
        facts: ["spec.requiredFields", "claude.frontmatterFirstLine"],
        message: FAILURE_MESSAGES[fm.reason],
      });
    }
  }
  return issues;
}
