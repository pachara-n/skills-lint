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
});
