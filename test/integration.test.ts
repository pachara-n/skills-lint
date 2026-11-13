import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// integration tests run the BUILT CLI (dist/cli.js) against real fixtures,
// exactly the way a user (or CI) would
const cli = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const fixtures = fileURLToPath(new URL("./fixtures", import.meta.url));

const run = (...args: string[]) =>
  spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });

describe("skills-lint CLI", () => {
  it("reports every rule on broken fixtures and exits 1", () => {
    const res = run(join(fixtures, "broken"));
    expect(res.status).toBe(1);
    expect(res.stdout).toContain("[no-skill-md]");
    expect(res.stdout).toContain("ghost-folder");
    expect(res.stdout).toContain("[description]");
    expect(res.stdout).toContain("missing");
    expect(res.stdout).toContain("characters");
  });

  it("passes valid fixtures with exit 0", () => {
    const res = run(join(fixtures, "valid"));
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("No issues found");
  });

  it("flags shadowed skills across two roots", () => {
    const res = run(join(fixtures, "shadow", "root-a"), join(fixtures, "shadow", "root-b"));
    // exits 1 because [shadowed] fires — sprawled alone would not (advisory)
    expect(res.status).toBe(1);
    expect(res.stdout).toContain("[shadowed]");
    expect(res.stdout).toContain("root-b");
    expect(res.stdout).toContain("first scanned wins");
    expect(res.stdout).toContain("[sprawled]");
  });

  it("reports sprawl across two healthy roots but exits 0 (advisory)", () => {
    const res = run(join(fixtures, "valid"), join(fixtures, "valid-b"));
    expect(res.stdout).toContain("[sprawled]");
    expect(res.status).toBe(0);
  });

  it("dedupes repeated root arguments", () => {
    const res = run(join(fixtures, "valid"), join(fixtures, "valid"));
    expect(res.stdout).toContain("scanning 1 root(s)");
    expect(res.status).toBe(0);
  });

  it("resolves a relative path before scanning it", () => {
    const tmp = mkdtempSync(join(tmpdir(), "skills-lint-relative-"));
    const root = join(tmp, ".claude", "skills");
    mkdirSync(join(root, "demo"), { recursive: true });
    writeFileSync(
      join(root, "demo", "SKILL.md"),
      '---\nname: demo\ndescription: A valid demo skill.\n---\n\n# Demo\n',
    );
    mkdirSync(join(root, "synced", "42"), { recursive: true });

    // `.` must resolve to the real .claude/skills root, otherwise the synced
    // folder is reported as a skill without SKILL.md.
    const res = spawnSync(process.execPath, [cli, "."], { encoding: "utf8", cwd: root });
    expect(res.stdout).toContain("scanning 1 root(s)");
    expect(res.stdout).not.toContain("[no-skill-md]");
    expect(res.status).toBe(0);
  });

  it("dedupes a relative path and its absolute form", () => {
    const tmp = mkdtempSync(join(tmpdir(), "skills-lint-dedupe-"));
    mkdirSync(join(tmp, "demo"), { recursive: true });
    writeFileSync(
      join(tmp, "demo", "SKILL.md"),
      '---\nname: demo\ndescription: A valid demo skill.\n---\n\n# Demo\n',
    );

    const res = spawnSync(process.execPath, [cli, ".", tmp], {
      encoding: "utf8",
      cwd: tmp,
    });
    expect(res.stdout).toContain("scanning 1 root(s)");
    expect(res.status).toBe(0);
  });

  it("auto-detects project-level skills folders when no path is given", () => {
    const tmp = mkdtempSync(join(tmpdir(), "skills-lint-auto-"));
    mkdirSync(join(tmp, ".claude", "skills", "demo"), { recursive: true });
    writeFileSync(
      join(tmp, ".claude", "skills", "demo", "SKILL.md"),
      '---\nname: demo\ndescription: A valid demo skill.\n---\n\n# Demo\n',
    );

    const res = spawnSync(process.execPath, [cli], { encoding: "utf8", cwd: tmp });
    // assert only machine-independent behavior: the root was auto-detected and
    // scanned (exit status depends on whatever else exists on the host)
    expect(res.stderr).toBe("");
    expect(res.stdout).toContain("auto-detected");
    expect(res.stdout).toContain(join(tmp, ".claude", "skills"));
  });

  it("outputs machine-readable json with --format json", () => {
    const res = run(join(fixtures, "broken"), "--format", "json");
    expect(res.status).toBe(1);
    const report = JSON.parse(res.stdout) as {
      skillsChecked: number;
      issues: { rule: string }[];
    };
    expect(report.skillsChecked).toBe(3);
    expect(report.issues.map((i) => i.rule)).toContain("no-skill-md");
  });

  it("emits a parseable json contract for a clean run (exit 0)", () => {
    const res = run(join(fixtures, "valid"), "--format", "json");
    expect(res.status).toBe(0);
    const report = JSON.parse(res.stdout) as {
      roots: string[];
      skillsChecked: number;
      issues: unknown[];
    };
    expect(Array.isArray(report.roots)).toBe(true);
    expect(report.roots).toContain(join(fixtures, "valid"));
    expect(report.skillsChecked).toBeGreaterThan(0);
    expect(report.issues).toEqual([]);
  });

  it("emits a parseable empty json envelope when no roots are found", () => {
    // isolate cwd AND home so auto-detect finds nothing, on any host
    const tmp = mkdtempSync(join(tmpdir(), "skills-lint-noroots-"));
    const env = { ...process.env, HOME: tmp, USERPROFILE: tmp };
    const res = spawnSync(process.execPath, [cli, "--format", "json"], {
      encoding: "utf8",
      cwd: tmp,
      env,
    });
    expect(res.status).toBe(1);
    const report = JSON.parse(res.stdout) as {
      roots: string[];
      skillsChecked: number;
      issues: unknown[];
    };
    expect(report.roots).toEqual([]);
    expect(report.skillsChecked).toBe(0);
    expect(report.issues).toEqual([]);
    expect(res.stderr).toContain("No skills folders found");
  });
  it("omits ANSI color sequences when NO_COLOR is set", () => {
    const res = spawnSync(process.execPath, [cli, join(fixtures, "broken")], {
      encoding: "utf8",
      env: { ...process.env, NO_COLOR: "1" },
    });
    expect(res.status).toBe(1);
    expect(res.stdout).toContain("Found 3 issue(s)");
    expect(res.stdout).not.toMatch(/\x1b\[/);
  });

  it("omits ANSI color sequences when --no-color flag is passed", () => {
    const res = spawnSync(process.execPath, [cli, join(fixtures, "broken"), "--no-color"], {
      encoding: "utf8",
    });
    expect(res.status).toBe(1);
    expect(res.stdout).toContain("Found 3 issue(s)");
    expect(res.stdout).not.toMatch(/\x1b\[/);
  });

  it("omits ANSI color sequences by default when output is piped (non-TTY)", () => {
    const env = { ...process.env };
    delete env.NO_COLOR;
    const res = spawnSync(process.execPath, [cli, join(fixtures, "broken")], {
      encoding: "utf8",
      env,
    });
    expect(res.status).toBe(1);
    expect(res.stdout).toContain("Found 3 issue(s)");
    expect(res.stdout).not.toMatch(/\x1b\[/);
  });

  it("exits 0 when the only findings are warnings and prints a summary", () => {
    const res = run(join(fixtures, "valid"), join(fixtures, "valid-b"), "--format", "json");
    expect(res.status).toBe(0);
    const report = JSON.parse(res.stdout) as {
      issues: { rule: string; severity: string }[];
      summary: { errors: number; warnings: number };
    };
    expect(report.issues).toEqual([expect.objectContaining({ rule: "sprawled", severity: "warning" })]);
    expect(report.summary).toEqual({ errors: 0, warnings: 1 });

    const text = run(join(fixtures, "valid"), join(fixtures, "valid-b"));
    expect(text.stdout).toContain("0 errors, 1 warning");
  });

  it("adds severity, line and a summary to json output", () => {
    const res = run(join(fixtures, "broken"), "--format", "json");
    const report = JSON.parse(res.stdout) as {
      issues: { rule: string; path: string; severity: string; line?: number }[];
      summary: { errors: number; warnings: number };
    };
    expect(report.summary).toEqual({ errors: 3, warnings: 0 });
    expect(report.issues.every((i) => i.severity === "error")).toBe(true);
    const long = report.issues.find((i) => i.path.includes("long-desc"));
    expect(long?.line).toBe(3);
    const ghost = report.issues.find((i) => i.rule === "no-skill-md");
    expect(ghost && "line" in ghost).toBe(false);
  });

  it("prints path:line in text output when the line is known", () => {
    const res = run(join(fixtures, "broken"));
    expect(res.stdout).toContain(join("long-desc", "SKILL.md") + ":3");
    expect(res.stdout).toContain("3 errors, 0 warnings");
  });

  it("--ignore removes a rule from text and json output", () => {
    const json = run(join(fixtures, "broken"), "--ignore", "description", "--format", "json");
    const report = JSON.parse(json.stdout) as {
      issues: { rule: string }[];
      summary: { errors: number };
    };
    expect(report.issues.map((i) => i.rule)).toEqual(["no-skill-md"]);
    expect(report.summary.errors).toBe(1);

    const text = run(join(fixtures, "broken"), "--ignore", "description");
    expect(text.stdout).not.toContain("[description]");
    expect(text.stdout).toContain("[no-skill-md]");
  });

  it("--ignore can be repeated and a clean result exits 0", () => {
    const res = run(join(fixtures, "broken"), "--ignore", "description", "--ignore", "no-skill-md");
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("No issues found");
  });

  it("--ignore rejects an unknown rule and lists the valid ones", () => {
    const res = run(join(fixtures, "valid"), "--ignore", "shadow");
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('Unknown rule "shadow"');
    expect(res.stderr).toContain("shadowed");
  });

  it("reports frontmatter problems with their SKILL.md line", () => {
    const root = join(mkdtempSync(join(tmpdir(), "skills-lint-yaml-")), ".agents", "skills");
    mkdirSync(join(root, "aws"), { recursive: true });
    writeFileSync(
      join(root, "aws", "SKILL.md"),
      "\uFEFF---\nname: aws\ndescription: Build for AWS: ECS\n---\n\n# AWS\n",
    );
    const res = run(root, "--format", "json");
    expect(res.status).toBe(1);
    const report = JSON.parse(res.stdout) as {
      issues: { rule: string; severity: string; line?: number; message: string }[];
    };
    expect(report.issues.map((i) => [i.rule, i.severity, i.line])).toEqual([
      ["frontmatter", "error", 1],
      ["frontmatter", "error", 3],
    ]);
    expect(report.issues[0].message).toContain("BOM");
    expect(report.issues[1].message).toContain("unquoted");

    const text = run(root, "--ignore", "frontmatter");
    expect(text.status).toBe(0);
  });
});
