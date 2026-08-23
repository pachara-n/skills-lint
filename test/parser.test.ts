import { describe, expect, it } from "vitest";
import { parseFrontmatter } from "../src/parser.js";

const good = `---
name: teach
description: Teach the user a topic step by step.
---

# body`;

const noClose = `---
name: teach
description: Teach the user a topic step by step.

# the closing line is missing`;

const colonInside = `---
name: search
description: Search the web via http://example.com API
---

# body`;

describe("parseFrontmatter", () => {
  it("parses name and description", () => {
    expect(parseFrontmatter(good)).toEqual({
      name: "teach",
      description: "Teach the user a topic step by step.",
    });
  });

  it("returns null when the closing --- is missing", () => {
    expect(parseFrontmatter(noClose)).toBeNull();
  });

  it("keeps values that contain colons (URLs)", () => {
    expect(parseFrontmatter(colonInside)?.description).toBe(
      "Search the web via http://example.com API",
    );
  });

  it("returns null when the file does not start with ---", () => {
    expect(parseFrontmatter("# just markdown\n\nno frontmatter")).toBeNull();
  });

  it("returns empty strings for missing fields", () => {
    expect(parseFrontmatter("---\nname: x\n---\n")).toEqual({
      name: "x",
      description: "",
    });
  });

  it("strips surrounding quotes from values", () => {
    expect(parseFrontmatter('---\nname: x\ndescription: "quoted"\n---\n')).toEqual({
      name: "x",
      description: "quoted",
    });
  });
});
