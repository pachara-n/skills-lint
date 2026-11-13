import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { SkillFolder } from "../src/scan.js";
import { lint } from "../src/lint.js";
import { noSkillMd } from "../src/rules/no-skill-md.js";
import { descriptionRule, MAX_DESCRIPTION_LENGTH } from "../src/rules/description.js";
import { shadowing } from "../src/rules/shadowing.js";
import { reservedName } from "../src/rules/reserved-name.js";
import { sprawled } from "../src/rules/sprawled.js";
import { frontmatterRule } from "../src/rules/frontmatter.js";
import { parseFrontmatter } from "../src/parser.js";

/** Frontmatter as the parser returns it for a SKILL.md with these fields. */
const fm = (name: string, description: string) =>
  parseFrontmatter(`---\nname: ${name}\ndescription: ${JSON.stringify(description)}\n---\n`);

const skill = (over: Partial<SkillFolder>): SkillFolder => ({
  root: "r",
  path: "r/x",
  name: "x",
  skillMdPath: "r/x/SKILL.md",
  hasSkillMd: true,
  frontmatter: fm("x", "fine"),
  ...over,
});

describe("rule 1 — no-skill-md", () => {
  it("flags folders without SKILL.md", () => {
    const issues = noSkillMd([skill({ hasSkillMd: false, frontmatter: null })]);
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe("no-skill-md");
  });

  it("passes folders with SKILL.md", () => {
    expect(noSkillMd([skill({})])).toHaveLength(0);
  });
});

describe("rule 2 — description", () => {
  it("flags a missing description", () => {
    const issues = descriptionRule([skill({ frontmatter: fm("x", "") })]);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("missing");
  });

  it("flags a description over 1024 characters", () => {
    const long = "a".repeat(MAX_DESCRIPTION_LENGTH + 1);
    const issues = descriptionRule([skill({ frontmatter: fm("x", long) })]);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("1025 characters");
  });

  it("flags a description that is not text", () => {
    const issues = descriptionRule([
      skill({ frontmatter: parseFrontmatter("---\nname: x\ndescription: [a, b]\n---\n") }),
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("not a list");
    expect(issues[0].line).toBe(3);
  });

  it("leaves a broken frontmatter block to the frontmatter rule", () => {
    const broken = parseFrontmatter("---\nname: x\n");
    expect(descriptionRule([skill({ frontmatter: broken })])).toHaveLength(0);
  });

  it("passes a good description", () => {
    expect(descriptionRule([skill({})])).toHaveLength(0);
  });
});

describe("rule 3 — shadowing", () => {
  const a = skill({ name: "dup", path: "root-a/dup", frontmatter: fm("dup", "a") });
  const b = skill({ name: "dup", path: "root-b/dup", frontmatter: fm("dup", "b") });

  it("flags the later copy and keeps the first", () => {
    const issues = shadowing([a, b]);
    expect(issues).toHaveLength(1);
    expect(issues[0].path).toBe("root-b/dup");
    expect(issues[0].message).toContain("root-a/dup");
  });

  it("is case-insensitive on names", () => {
    const upper = skill({ path: "root-b/DUP", frontmatter: fm("DUP", "b") });
    expect(shadowing([a, upper])).toHaveLength(1);
  });

  it("passes unique names", () => {
    expect(shadowing([a, skill({ name: "other", path: "root-b/other" })])).toHaveLength(0);
  });
});

describe("rule 4 — sprawled", () => {
  it("flags when skills live in several homes", () => {
    expect(sprawled(["~/.agents/skills", "~/.codex/skills"])).toHaveLength(1);
  });

  it("passes a single home", () => {
    expect(sprawled(["~/.agents/skills"])).toHaveLength(0);
  });

  it("counts only roots that actually contain skills — an empty root is not a home", () => {
    const tmp = mkdtempSync(join(tmpdir(), "skills-lint-sprawl-"));
    const home = join(tmp, "home");
    mkdirSync(join(home, "only-skill"), { recursive: true });
    writeFileSync(
      join(home, "only-skill", "SKILL.md"),
      '---\nname: only-skill\ndescription: A fine skill.\n---\n\n# Only\n',
    );
    mkdirSync(join(tmp, "empty"), { recursive: true });

    const { issues } = lint([home, join(tmp, "empty")]);
    expect(issues.find((i) => i.rule === "sprawled")).toBeUndefined();
  });
});

describe("rule 5 — reserved-name", () => {
  const claudeSynced = skill({
    root: join("home", ".claude", "skills"),
    path: join("home", ".claude", "skills", "synced"),
    name: "synced",
  });

  it("flags a `synced` folder with SKILL.md inside .claude/skills", () => {
    const issues = reservedName([claudeSynced]);
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe("reserved-name");
    expect(issues[0].message).toContain("reserved");
  });

  it("is case-insensitive on the folder name", () => {
    const upper = skill({ ...claudeSynced, name: "Synced", path: "home/.claude/skills/Synced" });
    expect(reservedName([upper])).toHaveLength(1);
  });

  it("passes `synced` in roots that are not Claude Code's", () => {
    const agents = skill({ ...claudeSynced, root: join("home", ".agents", "skills") });
    expect(reservedName([agents])).toHaveLength(0);
  });

  it("silently skips Claude Code's own sync folder — no SKILL.md, no issue", () => {
    const tmp = mkdtempSync(join(tmpdir(), "skills-lint-synced-"));
    const root = join(tmp, ".claude", "skills");
    mkdirSync(join(root, "synced", "acct-1", "docs"), { recursive: true });
    writeFileSync(join(root, "synced", "acct-1", "manifest.json"), "{}");
    writeFileSync(
      join(root, "synced", "acct-1", "docs", "SKILL.md"),
      '---\nname: docs\ndescription: A skill downloaded from claude.ai.\n---\n',
    );

    const report = lint([root]);
    expect(report.skills).toHaveLength(0);
    expect(report.issues).toEqual([]);
  });

  it("still errors when a skill is authored under the reserved name", () => {
    const tmp = mkdtempSync(join(tmpdir(), "skills-lint-reserved-"));
    const root = join(tmp, ".claude", "skills");
    mkdirSync(join(root, "Synced"), { recursive: true });
    writeFileSync(
      join(root, "Synced", "SKILL.md"),
      '---\nname: Synced\ndescription: A skill under a reserved name.\n---\n',
    );

    const { issues } = lint([root]);
    expect(issues.map((i) => i.rule)).toEqual(["reserved-name"]);
  });
});

describe("severity and line", () => {
  it("reports hard failures as errors", () => {
    const issues = [
      ...noSkillMd([skill({ hasSkillMd: false, frontmatter: null })]),
      ...descriptionRule([skill({ frontmatter: fm("x", "") })]),
    ];
    expect(issues.map((i) => i.severity)).toEqual(["error", "error"]);
  });

  it("reports sprawled as a warning", () => {
    expect(sprawled(["a", "b"])[0].severity).toBe("warning");
  });

  it("points a description finding at the description line", () => {
    const long = "a".repeat(MAX_DESCRIPTION_LENGTH + 1);
    const content = ["---", "name: x", "# note", `description: ${long}`, "---", ""].join("\n");
    const issues = descriptionRule([skill({ frontmatter: parseFrontmatter(content) })]);
    expect(issues[0].line).toBe(4);
  });

  it("points a missing description at line 1", () => {
    expect(descriptionRule([skill({ frontmatter: fm("x", "") })])[0].line).toBe(1);
  });

  it("leaves line unset for folder-level findings", () => {
    expect(noSkillMd([skill({ hasSkillMd: false, frontmatter: null })])[0].line).toBeUndefined();
  });
});

describe("rule — frontmatter", () => {
  const md = (...lines: string[]) => [...lines, ""].join("\n");
  const BOM = String.fromCharCode(0xfeff);
  const withContent = (content: string, root = "r") =>
    skill({ root, frontmatter: parseFrontmatter(content) });

  it("passes a valid block", () => {
    expect(frontmatterRule([skill({})])).toHaveLength(0);
  });

  it("skips folders without SKILL.md", () => {
    expect(frontmatterRule([skill({ hasSkillMd: false, frontmatter: null })])).toHaveLength(0);
  });

  it.each([
    ["missing", md("# no frontmatter"), "first line"],
    ["unterminated", md("---", "name: x"), "not closed"],
    ["not a mapping", md("---", "- a", "---"), "key: value"],
  ])("errors on a %s block", (_label, content, text) => {
    const [issue] = frontmatterRule([withContent(content)]);
    expect(issue.rule).toBe("frontmatter");
    expect(issue.severity).toBe("error");
    expect(issue.message).toContain(text);
  });

  it("errors on invalid YAML with the parser message and line", () => {
    const [issue] = frontmatterRule([withContent(md("---", "name: x", "name: y", "---"))]);
    expect(issue.severity).toBe("error");
    expect(issue.line).toBe(3);
    expect(issue.message).toContain("not valid YAML");
  });

  it("explains an unquoted colon and what each agent does", () => {
    const [issue] = frontmatterRule([
      withContent(md("---", "name: aws", "description: Build for AWS: ECS", "---")),
    ]);
    expect(issue.line).toBe(3);
    expect(issue.message).toContain("quotes");
    expect(issue.message).toContain("Claude Code");
    expect(issue.message).toContain("Codex repairs it");
    expect(issue.facts).toEqual(["claude.yamlError", "codex.unquotedColon"]);
  });

  it("makes a BOM an error in folders Codex reads", () => {
    const content = BOM + md("---", "name: x", "description: d", "---");
    for (const root of [join("p", ".agents", "skills"), join("home", ".codex", "skills")]) {
      const [issue] = frontmatterRule([withContent(content, root)]);
      expect(issue.severity, root).toBe("error");
      expect(issue.message).toContain("BOM");
    }
  });

  it("makes a BOM a warning elsewhere, and still checks the description", () => {
    const s = withContent(BOM + md("---", "name: x", "---"), join("p", ".claude", "skills"));
    expect(frontmatterRule([s]).map((i) => i.severity)).toEqual(["warning"]);
    expect(descriptionRule([s]).map((i) => i.message)).toEqual([
      expect.stringContaining("missing"),
    ]);
  });
});
