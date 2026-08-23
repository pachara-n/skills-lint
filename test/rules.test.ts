import { describe, expect, it } from "vitest";
import type { SkillFolder } from "../src/scan.js";
import { noSkillMd } from "../src/rules/no-skill-md.js";
import { descriptionRule, MAX_DESCRIPTION_LENGTH } from "../src/rules/description.js";
import { shadowing } from "../src/rules/shadowing.js";
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
});
