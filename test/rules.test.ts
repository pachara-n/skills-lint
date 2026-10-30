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

const skill = (over: Partial<SkillFolder>): SkillFolder => ({
  root: "r",
  path: "r/x",
  name: "x",
  skillMdPath: "r/x/SKILL.md",
  hasSkillMd: true,
  frontmatter: { name: "x", description: "fine" },
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
    const issues = descriptionRule([skill({ frontmatter: { name: "x", description: "" } })]);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("missing");
  });

  it("flags a description over 1024 characters", () => {
    const long = "a".repeat(MAX_DESCRIPTION_LENGTH + 1);
    const issues = descriptionRule([skill({ frontmatter: { name: "x", description: long } })]);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("1025 characters");
  });

  it("flags an unparseable frontmatter block", () => {
    const issues = descriptionRule([skill({ frontmatter: null })]);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("no valid frontmatter");
  });

  it("passes a good description", () => {
    expect(descriptionRule([skill({})])).toHaveLength(0);
  });
});

describe("rule 3 — shadowing", () => {
  const a = skill({ name: "dup", path: "root-a/dup", frontmatter: { name: "dup", description: "a" } });
  const b = skill({ name: "dup", path: "root-b/dup", frontmatter: { name: "dup", description: "b" } });

  it("flags the later copy and keeps the first", () => {
    const issues = shadowing([a, b]);
    expect(issues).toHaveLength(1);
    expect(issues[0].path).toBe("root-b/dup");
    expect(issues[0].message).toContain("root-a/dup");
  });

  it("is case-insensitive on names", () => {
    const upper = skill({ path: "root-b/DUP", frontmatter: { name: "DUP", description: "b" } });
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
