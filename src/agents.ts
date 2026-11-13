/**
 * Single source of truth for what skills-lint assumes about each agent.
 *
 * Every rule, message and doc that states how an agent loads skills must read
 * it from here. Each fact carries the place it was verified (`source`) and the
 * date (`checked`), so stale facts can be found and re-checked. Behavior that
 * is not documented is stored as UNKNOWN, never guessed.
 *
 * Re-verify before every minor release (see CONTRIBUTING.md).
 */

export const UNKNOWN = "unknown" as const;

export type AgentId = "spec" | "claude" | "codex" | "cursor" | "zcode";

export interface Fact {
  agent: AgentId;
  /** What the fact says, in one sentence. Printed by --facts and in the README. */
  summary: string;
  /** Machine-readable value rules use, or UNKNOWN when no source documents it. */
  value: unknown;
  /** Documentation URL, or repository file pinned to a commit. */
  source: string;
  /** Date the source was last read (YYYY-MM-DD). */
  checked: string;
  /** Agent version the fact applies to, when the source states one. */
  agentVersion?: string;
}

export const AGENT_NAMES: Record<AgentId, string> = {
  spec: "Agent Skills spec",
  claude: "Claude Code",
  codex: "Codex",
  cursor: "Cursor",
  zcode: "ZCode",
};

const SPEC = "https://agentskills.io/specification";
const CLAUDE = "https://code.claude.com/docs/en/skills";
const CODEX_DOCS = "https://learn.chatgpt.com/docs/build-skills";
const CODEX_COMMIT = "f752c97";
const codex = (path: string) =>
  `https://github.com/openai/codex/blob/${CODEX_COMMIT}/codex-rs/${path}`;
const CURSOR = "https://cursor.com/docs/context/skills";
const CHECKED = "2026-10-30";

export const FACTS = {
  // ── Agent Skills spec ───────────────────────────────────────────────
  "spec.skillFile": {
    agent: "spec",
    summary: "A skill is a folder containing a file named exactly SKILL.md.",
    value: "SKILL.md",
    source: SPEC,
    checked: CHECKED,
  },
  "spec.requiredFields": {
    agent: "spec",
    summary: "`name` and `description` are required frontmatter fields.",
    value: ["name", "description"],
    source: SPEC,
    checked: CHECKED,
  },
  "spec.descriptionMaxLength": {
    agent: "spec",
    summary: "`description` is at most 1024 characters.",
    value: 1024,
    source: SPEC,
    checked: CHECKED,
  },
  "spec.nameMaxLength": {
    agent: "spec",
    summary: "`name` is 1–64 characters.",
    value: 64,
    source: SPEC,
    checked: CHECKED,
  },
  "spec.nameFormat": {
    agent: "spec",
    summary:
      "`name` uses lowercase a-z, 0-9 and hyphens, with no leading, trailing or consecutive hyphens.",
    value: "^[a-z0-9]+(-[a-z0-9]+)*$",
    source: SPEC,
    checked: CHECKED,
  },
  "spec.nameMatchesFolder": {
    agent: "spec",
    summary: "`name` must match the parent folder name.",
    value: true,
    source: SPEC,
    checked: CHECKED,
  },
  "spec.compatibilityMaxLength": {
    agent: "spec",
    summary: "`compatibility` is at most 500 characters.",
    value: 500,
    source: SPEC,
    checked: CHECKED,
  },
  "spec.bodySize": {
    agent: "spec",
    summary: "Keep the SKILL.md body under 500 lines or about 5,000 tokens.",
    value: { lines: 500, tokens: 5000 },
    source: SPEC,
    checked: CHECKED,
  },

  // ── Claude Code ─────────────────────────────────────────────────────
  "claude.projectRoots": {
    agent: "claude",
    summary:
      "Reads `.claude/skills` in the start directory and every parent up to the repository root.",
    value: { dirs: [".claude/skills"], walkUpToRepoRoot: true },
    source: CLAUDE,
    checked: CHECKED,
  },
  "claude.userRoots": {
    agent: "claude",
    summary: "Reads `~/.claude/skills`, plus an enterprise managed directory.",
    value: { dirs: ["~/.claude/skills"], admin: "enterprise managed directory" },
    source: CLAUDE,
    checked: CHECKED,
  },
  "claude.precedence": {
    agent: "claude",
    summary:
      "On a duplicate name, enterprise wins over personal and personal over project; a project-root skill and a nested skill both load.",
    value: ["enterprise", "personal", "project"],
    source: CLAUDE,
    checked: CHECKED,
  },
  "claude.discoveryDepth": {
    agent: "claude",
    summary: "Only `<root>/<skill-name>/SKILL.md` is documented (one level deep).",
    value: 1,
    source: CLAUDE,
    checked: CHECKED,
  },
  "claude.nameFallback": {
    agent: "claude",
    summary: "`name` defaults to the directory name.",
    value: "folder",
    source: CLAUDE,
    checked: CHECKED,
  },
  "claude.syncedFolder": {
    agent: "claude",
    summary:
      "`~/.claude/skills/synced/` holds skills downloaded from claude.ai; a skill authored under that name (any capitalization) is skipped.",
    value: "synced",
    source: CLAUDE,
    checked: CHECKED,
  },
  "claude.reservedNames": {
    agent: "claude",
    summary: "`anthropic-skills` and every `anthropic-skills:*` name are reserved for synced skills.",
    value: ["anthropic-skills", "anthropic-skills:*"],
    source: `${CLAUDE}#characters-a-skill-name-cant-hold`,
    checked: CHECKED,
  },
  "claude.refusedNameCharacters": {
    agent: "claude",
    summary:
      "Names with zero-width/control, private-use or unassigned characters, bidi controls, any blank other than one plain space between words, or `<` / `>` are refused: a folder name stops the skill loading, a frontmatter name makes it uninvocable by that name.",
    value: ["control", "zero-width", "private-use", "unassigned", "bidi", "blank", "<", ">"],
    source: `${CLAUDE}#characters-a-skill-name-cant-hold`,
    checked: CHECKED,
  },
  "claude.frontmatterFirstLine": {
    agent: "claude",
    summary: "Frontmatter is read only when the opening `---` is the file's first line.",
    value: true,
    source: CLAUDE,
    checked: CHECKED,
  },
  "claude.yamlError": {
    agent: "claude",
    summary: "On a frontmatter YAML error the skill still loads with no fields set.",
    value: "load-without-fields",
    source: CLAUDE,
    checked: CHECKED,
  },
  "claude.missingDescription": {
    agent: "claude",
    summary: "Without `description`, the first non-empty line of the markdown body is used.",
    value: "first-body-line",
    source: CLAUDE,
    checked: CHECKED,
  },
  "claude.listingEntryMaxChars": {
    agent: "claude",
    summary:
      "`description` + `when_to_use` is truncated at 1,536 characters in the skill listing (configurable via `skillListingMaxDescChars`).",
    value: 1536,
    source: `${CLAUDE}#skill-descriptions-are-cut-short`,
    checked: CHECKED,
  },
  "claude.listingBudget": {
    agent: "claude",
    summary:
      "The skill listing budget is 1% of the model's context window; on overflow, descriptions of the least-invoked skills are dropped first.",
    value: { contextShare: 0.01, unit: "chars" },
    source: `${CLAUDE}#skill-descriptions-are-cut-short`,
    checked: CHECKED,
  },

  // ── Codex ───────────────────────────────────────────────────────────
  "codex.projectRoots": {
    agent: "codex",
    summary:
      "Reads `.agents/skills` from the working directory up to the repository root, and `.codex/skills` from the project config layer.",
    value: { dirs: [".agents/skills", ".codex/skills"], walkUpToRepoRoot: true },
    source: codex("ext/skills/src/host_roots.rs"),
    checked: CHECKED,
    agentVersion: `main @ ${CODEX_COMMIT}`,
  },
  "codex.userRoots": {
    agent: "codex",
    summary:
      "Reads `~/.agents/skills`, `$CODEX_HOME/skills` (default `~/.codex/skills`, deprecated but still read) and `/etc/codex/skills`.",
    value: {
      dirs: ["~/.agents/skills", "~/.codex/skills"],
      admin: "/etc/codex/skills",
    },
    source: codex("ext/skills/src/host_roots.rs"),
    checked: CHECKED,
    agentVersion: `main @ ${CODEX_COMMIT}`,
  },
  "codex.precedence": {
    agent: "codex",
    summary: "Duplicate names are not merged: both copies can appear in skill selectors.",
    value: "both-listed",
    source: CODEX_DOCS,
    checked: CHECKED,
  },
  "codex.discoveryDepth": {
    agent: "codex",
    summary: "Each root is walked recursively up to depth 6, at most 2,000 skill folders per root.",
    value: { maxDepth: 6, maxSkillDirs: 2000 },
    source: codex("ext/skills/src/loader/mod.rs"),
    checked: CHECKED,
    agentVersion: `main @ ${CODEX_COMMIT}`,
  },
  "codex.nameMaxLength": {
    agent: "codex",
    summary: "A `name` over 64 characters is rejected.",
    value: 64,
    source: codex("skills/src/parser.rs"),
    checked: CHECKED,
    agentVersion: `main @ ${CODEX_COMMIT}`,
  },
  "codex.nameFallback": {
    agent: "codex",
    summary: "`name` falls back to the folder name; lowercase and the folder match are not enforced.",
    value: "folder",
    source: codex("skills/src/parser.rs"),
    checked: CHECKED,
    agentVersion: `main @ ${CODEX_COMMIT}`,
  },
  "codex.descriptionMaxLength": {
    agent: "codex",
    summary:
      "`description` has no length limit (the 1024 limit existed in v0.111.0 and was removed).",
    value: null,
    source: codex("skills/src/parser.rs"),
    checked: CHECKED,
    agentVersion: `main @ ${CODEX_COMMIT}`,
  },
  "codex.missingDescription": {
    agent: "codex",
    summary:
      'An empty `description` skips the skill, with a startup warning "Skipped loading N skill(s) due to invalid SKILL.md files."',
    value: "skip-with-warning",
    source: codex("tui/src/app/startup_prompts.rs"),
    checked: CHECKED,
    agentVersion: `main @ ${CODEX_COMMIT}`,
  },
  "codex.bom": {
    agent: "codex",
    summary: "A UTF-8 BOM before the opening `---` hides the frontmatter.",
    value: "no-frontmatter",
    source: codex("skills/src/parser.rs"),
    checked: CHECKED,
    agentVersion: `main @ ${CODEX_COMMIT}`,
  },
  "codex.unquotedColon": {
    agent: "codex",
    summary: "An unquoted colon inside a frontmatter value is repaired before parsing.",
    value: "repaired",
    source: codex("skills/src/parser.rs"),
    checked: CHECKED,
    agentVersion: `main @ ${CODEX_COMMIT}`,
  },
  "codex.listingBudget": {
    agent: "codex",
    summary:
      "The skill listing budget is 2% of the context window in tokens, or 8,000 characters when the window is unknown; a configured budget is capped at 10,000 tokens. On overflow all descriptions are removed.",
    value: { contextShare: 0.02, fallbackChars: 8000, maxConfiguredTokens: 10000 },
    source: codex("ext/skills/src/render.rs"),
    checked: CHECKED,
    agentVersion: `main @ ${CODEX_COMMIT}`,
  },

  // ── Cursor ──────────────────────────────────────────────────────────
  "cursor.roots": {
    agent: "cursor",
    summary:
      "Reads `.agents/skills` and `.cursor/skills`, plus `.claude/skills` and `.codex/skills` for compatibility, in the project and under `~`.",
    value: { dirs: [".agents/skills", ".cursor/skills", ".claude/skills", ".codex/skills"] },
    source: CURSOR,
    checked: CHECKED,
  },
  "cursor.precedence": {
    agent: "cursor",
    summary: "Which copy is used when two skills share a name is not documented.",
    value: UNKNOWN,
    source: CURSOR,
    checked: CHECKED,
  },
  "cursor.discoveryDepth": {
    agent: "cursor",
    summary:
      "The skills root is walked recursively and any SKILL.md is picked up; category folders are organizational.",
    value: "recursive",
    source: CURSOR,
    checked: CHECKED,
  },
  "cursor.nameMatchesFolder": {
    agent: "cursor",
    summary: "`name` must match the parent folder name.",
    value: true,
    source: CURSOR,
    checked: CHECKED,
  },
  "cursor.missingDescription": {
    agent: "cursor",
    summary:
      "Without `description` the agent is unlikely to pick the skill on its own, but it can still be invoked by name.",
    value: "manual-only",
    source: CURSOR,
    checked: CHECKED,
  },

  // ── ZCode ───────────────────────────────────────────────────────────
  "zcode.roots": {
    agent: "zcode",
    summary:
      "No source found for where ZCode reads skills; `.zcode/skills` is scanned only because v0.2 did.",
    value: UNKNOWN,
    source: "none found",
    checked: CHECKED,
  },
} as const satisfies Record<string, Fact>;

export type FactId = keyof typeof FACTS;

export function fact(id: FactId): Fact {
  return FACTS[id];
}

/**
 * Folders under a project or home directory that auto-detection checks.
 * The union of every agent's documented roots, plus `.zcode/skills`, which
 * has no source (see `zcode.roots`) and is kept for v0.2 compatibility.
 */
export const SCAN_DIRS: readonly string[] = [
  ...new Set([
    ...FACTS["codex.projectRoots"].value.dirs,
    ...FACTS["claude.projectRoots"].value.dirs,
    ...FACTS["cursor.roots"].value.dirs,
    ".zcode/skills",
  ]),
].sort();
