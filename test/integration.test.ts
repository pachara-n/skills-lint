import { spawnSync } from "node:child_process";
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
    expect(res.status).toBe(1);
    expect(res.stdout).toContain("[shadowed]");
    expect(res.stdout).toContain("root-b");
    expect(res.stdout).toContain("first scanned wins");
  });
});
