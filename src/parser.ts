export interface Frontmatter {
  name: string;
  description: string;
  /** 1-based file line of each key found in the block. */
  lines?: Record<string, number>;
}

/**
 * Parse the frontmatter block: the lines between the two `---` lines at the
 * top of a SKILL.md. Returns null when the block is missing or unterminated.
 * Only flat `key: value` pairs are supported — the agent skills spec allows
 * nothing more, so a full YAML parser is not needed.
 */
export function parseFrontmatter(content: string): Frontmatter | null {
  const lines = content.split("\n");
  if (lines[0]?.trim() !== "---") return null;

  const end = lines.findIndex((line, i) => i > 0 && line.trim() === "---");
  if (end === -1) return null;

  const fields: Record<string, string> = {};
  const keyLines: Record<string, number> = {};
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    const colon = line.indexOf(":"); // first colon only — values may contain URLs
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line
      .slice(colon + 1)
      .trim()
      .replace(/^"(.*)"$/, "$1");
    if (key !== "") {
      fields[key] = value;
      keyLines[key] = i + 1; // lines[0] is the opening --- on line 1
    }
  }

  return {
    name: fields["name"] ?? "",
    description: fields["description"] ?? "",
    lines: keyLines,
  };
}
