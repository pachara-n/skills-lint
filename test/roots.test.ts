import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultRoots } from "../src/roots.js";

const makeDir = () => mkdtempSync(join(tmpdir(), "skills-lint-"));

describe("defaultRoots", () => {
  it("returns only candidate folders that exist", () => {
    const cwd = makeDir();
    const home = makeDir();
    mkdirSync(join(cwd, ".claude", "skills"), { recursive: true });
    mkdirSync(join(home, ".codex", "skills"), { recursive: true });

    const roots = defaultRoots(cwd, home);
    expect(roots).toEqual([join(cwd, ".claude", "skills"), join(home, ".codex", "skills")]);
  });

  it("puts project-level roots before user-level roots", () => {
    const cwd = makeDir();
    const home = makeDir();
    mkdirSync(join(cwd, ".agents", "skills"), { recursive: true });
    mkdirSync(join(home, ".agents", "skills"), { recursive: true });

    expect(defaultRoots(cwd, home)[0]).toBe(join(cwd, ".agents", "skills"));
  });

  it("returns an empty list when nothing exists", () => {
    expect(defaultRoots(makeDir(), makeDir())).toEqual([]);
  });
});
