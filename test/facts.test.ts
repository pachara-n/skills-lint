import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FACTS, SCAN_DIRS, UNKNOWN, type Fact } from "../src/agents.js";
import { renderFactsMarkdown } from "../src/facts-render.js";
import { lint } from "../src/lint.js";

const cli = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const fixtures = fileURLToPath(new URL("./fixtures", import.meta.url));
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const entries = Object.entries(FACTS) as [string, Fact][];

describe("facts table", () => {
  it("gives every fact a source and an ISO check date", () => {
    for (const [id, f] of entries) {
      expect(id.startsWith(`${f.agent}.`), id).toBe(true);
      expect(f.summary.length, id).toBeGreaterThan(0);
      expect(f.source.length, id).toBeGreaterThan(0);
      expect(f.checked, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("links every documented fact to a URL; only unknown facts may lack one", () => {
    for (const [id, f] of entries) {
      if (f.value === UNKNOWN) continue;
      expect(f.source, id).toMatch(/^https:\/\//);
    }
  });

  it("pins repository sources to a commit", () => {
    for (const [id, f] of entries.filter(([, f]) => f.source.includes("github.com"))) {
      expect(f.source, id).toMatch(/\/blob\/[0-9a-f]{7,40}\//);
    }
  });

  it("keeps the auto-detected folders of v0.2", () => {
    expect(SCAN_DIRS).toEqual([
      ".agents/skills",
      ".claude/skills",
      ".codex/skills",
      ".cursor/skills",
      ".zcode/skills",
    ]);
  });
});

describe("findings reference facts", () => {
  it("every fact id on a finding exists in the table", () => {
    const { issues } = lint([`${fixtures}/broken`, `${fixtures}/valid`]);
    const referenced = issues.flatMap((i) => i.facts ?? []);
    expect(referenced.length).toBeGreaterThan(0);
    for (const id of referenced) expect(Object.keys(FACTS)).toContain(id);
  });
});

describe("generated docs", () => {
  it("README Agent behavior section matches the table (run npm run docs)", () => {
    const start = readme.indexOf("<!-- facts:start");
    const end = readme.indexOf("<!-- facts:end -->");
    expect(start).toBeGreaterThan(-1);
    const block = readme.slice(readme.indexOf("\n", start) + 1, end).trim();
    expect(block).toBe(renderFactsMarkdown());
  });

  it("--facts prints every fact with its source", () => {
    const res = spawnSync(process.execPath, [cli, "--facts"], { encoding: "utf8" });
    expect(res.status).toBe(0);
    for (const [id, f] of entries) {
      expect(res.stdout).toContain(id);
      expect(res.stdout).toContain(f.source);
    }
  });

  it("--facts --format json round-trips the table", () => {
    const res = spawnSync(process.execPath, [cli, "--facts", "--format", "json"], {
      encoding: "utf8",
    });
    expect(JSON.parse(res.stdout)).toEqual(JSON.parse(JSON.stringify(FACTS)));
  });

  it("--facts --format markdown matches the README block", () => {
    const res = spawnSync(process.execPath, [cli, "--facts", "--format", "markdown"], {
      encoding: "utf8",
    });
    expect(res.stdout.trim()).toBe(renderFactsMarkdown());
  });

  it("--facts rejects an unknown format", () => {
    const res = spawnSync(process.execPath, [cli, "--facts", "--format", "xml"], {
      encoding: "utf8",
    });
    expect(res.status).toBe(1);
    expect(res.stderr).toContain("Unknown format");
  });
});
