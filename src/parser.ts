import { isMap, isScalar, LineCounter, parseDocument } from "yaml";

const BOM = "﻿";

export type FrontmatterFailure =
  | "missing" // the file does not start with ---
  | "unterminated" // no closing ---
  | "not-mapping" // valid YAML, but not key: value pairs (a list, a string)
  | "yaml"; // the block is not valid YAML

export interface FrontmatterError {
  ok: false;
  reason: FrontmatterFailure;
  /** Parser message, for reason "yaml". */
  message?: string;
  /** 1-based line in SKILL.md the problem points at. */
  line: number;
  /** The YAML error is a value with an unquoted `: ` in it (`description: AWS: ECS`). */
  unquotedColon?: boolean;
  /** A UTF-8 BOM came before the opening ---. */
  bom: boolean;
}

export interface Frontmatter {
  ok: true;
  /** Every top-level key, parsed as YAML (nested maps stay nested). */
  data: Record<string, unknown>;
  /** `name` when it is a string, else "" (missing or another type). */
  name: string;
  /** `description` when it is a string, else "". See `data` for the raw value. */
  description: string;
  /** 1-based file line of each top-level key. */
  lines: Record<string, number>;
  /** Markdown after the closing ---, and the file line it starts on. */
  body: string;
  bodyLine: number;
  /** A UTF-8 BOM came before the opening ---. */
  bom: boolean;
}

export type ParseResult = Frontmatter | FrontmatterError;

/** A value line whose unquoted scalar contains `: ` — invalid YAML, a common mistake. */
const UNQUOTED_COLON = /^\s*[^\s:#][^:#]*:\s+[^\s'"|>[{&*!][^#]*:(\s|$)/;

/**
 * Parse the frontmatter block of a SKILL.md: YAML between a `---` on the
 * first line and the next `---` line. A leading BOM is stripped and reported,
 * so the rest of the file can still be checked.
 */
export function parseFrontmatter(content: string): ParseResult {
  const bom = content.startsWith(BOM);
  const text = bom ? content.slice(BOM.length) : content;
  const lines = text.split(/\r?\n/);

  if (lines[0]?.trim() !== "---") return { ok: false, reason: "missing", line: 1, bom };
  const end = lines.findIndex((line, i) => i > 0 && line.trim() === "---");
  if (end === -1) return { ok: false, reason: "unterminated", line: 1, bom };

  const yamlText = lines.slice(1, end).join("\n");
  const lineCounter = new LineCounter();
  const doc = parseDocument(yamlText, { lineCounter, prettyErrors: false });
  // block line N is file line N + 1 (the opening --- is file line 1)
  const fileLine = (offset: number) => lineCounter.linePos(offset).line + 1;

  const [error] = doc.errors;
  if (error) {
    const line = fileLine(error.pos[0]);
    return {
      ok: false,
      reason: "yaml",
      message: error.message.split("\n")[0],
      line,
      unquotedColon:
        error.code === "BLOCK_AS_IMPLICIT_KEY" && UNQUOTED_COLON.test(lines[line - 1] ?? ""),
      bom,
    };
  }

  const fields: Record<string, number> = {};
  if (doc.contents !== null && !isMap(doc.contents)) {
    return { ok: false, reason: "not-mapping", line: 2, bom };
  }
  for (const pair of isMap(doc.contents) ? doc.contents.items : []) {
    if (isScalar(pair.key) && pair.key.range) {
      fields[String(pair.key.value)] = fileLine(pair.key.range[0]);
    }
  }

  // an empty block (`---` then `---`) is an empty mapping
  const data = (doc.toJS() ?? {}) as Record<string, unknown>;
  const str = (value: unknown) => (typeof value === "string" ? value : "");

  return {
    ok: true,
    data,
    name: str(data["name"]),
    description: str(data["description"]),
    lines: fields,
    body: lines.slice(end + 1).join("\n"),
    bodyLine: end + 2,
    bom,
  };
}
