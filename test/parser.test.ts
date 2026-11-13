import { describe, expect, it } from "vitest";
import { parseFrontmatter, type Frontmatter, type FrontmatterError } from "../src/parser.js";

const ok = (content: string): Frontmatter => {
  const result = parseFrontmatter(content);
  if (!result.ok) throw new Error(`expected ok, got ${result.reason}: ${result.message ?? ""}`);
  return result;
};
const fail = (content: string): FrontmatterError => {
  const result = parseFrontmatter(content);
  if (result.ok) throw new Error("expected a parse failure");
  return result;
};

const good = `---
name: teach
description: Teach the user a topic step by step.
---

# body`;

describe("parseFrontmatter — basics", () => {
  it("parses name, description, key lines and the body", () => {
    const fm = ok(good);
    expect(fm.name).toBe("teach");
    expect(fm.description).toBe("Teach the user a topic step by step.");
    expect(fm.lines).toEqual({ name: 2, description: 3 });
    expect(fm.body).toBe("\n# body");
    expect(fm.bodyLine).toBe(5);
    expect(fm.bom).toBe(false);
  });

  it("fails as unterminated when the closing --- is missing", () => {
    expect(fail("---\nname: teach\ndescription: x\n\n# body").reason).toBe("unterminated");
  });

  it("fails as missing when the file does not start with ---", () => {
    expect(fail("# just markdown\n\nno frontmatter").reason).toBe("missing");
  });

  it("keeps values that contain a URL", () => {
    const fm = ok("---\nname: s\ndescription: Search via http://example.com API\n---\n");
    expect(fm.description).toBe("Search via http://example.com API");
  });

  it("returns empty strings for missing fields", () => {
    const fm = ok("---\nname: x\n---\n");
    expect(fm.description).toBe("");
    expect(fm.data).toEqual({ name: "x" });
  });

  it("treats an empty block as an empty mapping", () => {
    expect(ok("---\n---\n").data).toEqual({});
  });

  it("records the 1-based file line of each key, skipping comments and blanks", () => {
    expect(ok("---\n# comment\nname: x\n\ndescription: d\n---\n").lines).toEqual({
      name: 3,
      description: 5,
    });
  });
});

// One test per row of the table in issue #5
describe("parseFrontmatter — real YAML", () => {
  it("measures a folded (>) description in full", () => {
    const long = "word ".repeat(400).trim(); // 1,999 characters
    const folded = long.match(/.{1,80}(\s|$)/g)!.map((part) => `  ${part.trim()}`).join("\n");
    const fm = ok(`---\nname: x\ndescription: >\n${folded}\n---\n`);
    expect(fm.description.length).toBeGreaterThan(1024);
    expect(fm.lines["description"]).toBe(3);
  });

  it("strips single quotes", () => {
    expect(ok("---\nname: x\ndescription: 'quoted'\n---\n").description).toBe("quoted");
  });

  it("strips double quotes", () => {
    expect(ok('---\nname: x\ndescription: "quoted"\n---\n').description).toBe("quoted");
  });

  it("keeps a nested metadata.description inside metadata", () => {
    const fm = ok("---\nname: x\ndescription: top\nmetadata:\n  description: nested\n---\n");
    expect(fm.description).toBe("top");
    expect(fm.data["metadata"]).toEqual({ description: "nested" });
  });

  it("does not let a nested key stand in for a missing description", () => {
    const fm = ok("---\nname: x\nmetadata:\n  description: nested\n---\n");
    expect(fm.description).toBe("");
    expect(fm.data["description"]).toBeUndefined();
  });

  it("rejects duplicate keys with the line of the duplicate", () => {
    const err = fail("---\nname: x\ndescription: a\ndescription: b\n---\n");
    expect(err.reason).toBe("yaml");
    expect(err.line).toBe(4);
    expect(err.unquotedColon).toBe(false);
  });

  it("rejects badly indented keys", () => {
    const err = fail("---\nname: x\n  description: y\n---\n");
    expect(err.reason).toBe("yaml");
    expect(err.unquotedColon).toBe(false);
  });

  it("keeps a list description as a list, not a string", () => {
    const fm = ok("---\nname: x\ndescription: [a, b]\n---\n");
    expect(fm.description).toBe("");
    expect(fm.data["description"]).toEqual(["a", "b"]);
  });

  it("rejects a block that is not a mapping", () => {
    expect(fail("---\n- a\n- b\n---\n").reason).toBe("not-mapping");
  });
});

describe("parseFrontmatter — loader quirks", () => {
  it("flags an unquoted colon in a value, with its file line", () => {
    const err = fail("---\nname: aws\ndescription: Build for AWS: ECS and Lambda\n---\n");
    expect(err.reason).toBe("yaml");
    expect(err.unquotedColon).toBe(true);
    expect(err.line).toBe(3);
  });

  it("accepts the same value when quoted", () => {
    expect(ok('---\nname: aws\ndescription: "Build for AWS: ECS"\n---\n').description).toBe(
      "Build for AWS: ECS",
    );
  });

  it("strips a UTF-8 BOM, reports it, and still parses", () => {
    const fm = ok(`﻿${good}`);
    expect(fm.bom).toBe(true);
    expect(fm.name).toBe("teach");
  });

  it("reports a BOM even when the block is broken", () => {
    expect(fail("﻿---\nname: x\n").bom).toBe(true);
  });

  it("parses CRLF line endings with the same lines", () => {
    const fm = ok(good.replace(/\n/g, "\r\n"));
    expect(fm.description).toBe("Teach the user a topic step by step.");
    expect(fm.lines).toEqual({ name: 2, description: 3 });
  });
});
