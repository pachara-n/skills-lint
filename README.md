# skills-lint

> Check AI agent skills folders for `SKILL.md` problems before they reach your agent.

[![CI](https://github.com/pachara-n/skills-lint/actions/workflows/ci.yml/badge.svg)](https://github.com/pachara-n/skills-lint/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/skills-lint)](https://www.npmjs.com/package/skills-lint)
[![license](https://img.shields.io/badge/license-MIT-blue)](#license)

Agents such as Claude Code, Codex CLI and Cursor discover skills by reading each folder's `SKILL.md` frontmatter at startup. A broken file does not crash anything, and what happens next depends on the agent: the skill may be skipped, load without its description, or simply never be picked. `skills-lint` checks skills folders for these problems so you can catch them locally or in CI.

```console
$ npx skills-lint test/fixtures/broken

skills-lint: scanning 1 root(s)
  - test/fixtures/broken

checked 3 skill folder(s)

✖ Found 3 issue(s):

  [no-skill-md] test/fixtures/broken/ghost-folder
          folder has no SKILL.md — this skill will never load

  [description] test/fixtures/broken/long-desc/SKILL.md
          description is 1121 characters (max 1024) — the skill is silently dropped

  [description] test/fixtures/broken/no-desc/SKILL.md
          description is missing — the skill is silently dropped
```

> **Status:** v0.2 checks folder structure and the `description` field against the [Agent Skills spec](https://agentskills.io/specification). It does not yet model how each agent loads skills, and some messages overstate the consequences — see [Known limitations](#known-limitations). Agent-aware checks are being built in the open: [roadmap issues](https://github.com/pachara-n/skills-lint/milestones).

## Why

Each agent treats a broken `SKILL.md` differently, and none of them stops you from committing one:

- **Codex** skips a skill whose `description` is empty and shows a startup warning ("Skipped loading N skill(s) due to invalid SKILL.md files").
- **Claude Code** loads a skill whose frontmatter YAML does not parse "with no fields set", and uses the first line of the body when `description` is missing ([docs](https://code.claude.com/docs/en/skills)) — so the skill may load but never be matched to a request.
- **Cursor** requires `name` and `description`; without a description "the agent is unlikely to pick the skill on its own" ([docs](https://cursor.com/docs/context/skills)).

The [Agent Skills spec](https://agentskills.io/specification) sets the common ground: `name` and `description` are required, and `description` is at most 1024 characters. Older Codex releases rejected longer descriptions ([openai/codex#13941](https://github.com/openai/codex/issues/13941)); current releases accept them, but the limit still matters for portability.

`skills-lint` runs the same checks every time, without starting an agent, so problems are caught in a pull request instead of on someone's machine.

## Usage

No install needed:

```console
npx skills-lint
```

With no arguments it looks for the usual skills folders — `.agents/`, `.claude/`, `.codex/`, `.cursor/`, `.zcode/` (each `…/skills`), in the current directory first, then your home directory — and prints exactly what it scanned. To scan specific folders instead, pass them explicitly:

```console
npx skills-lint <path> [<path> ...]
```

**Explicit paths are recommended**, especially in CI: auto-detection scans folders that belong to different agents together, which can produce false `shadowed` findings (see [Known limitations](#known-limitations)).

Machine-readable output:

```console
npx skills-lint --format json
```

The JSON report has this shape. `line` is present only when a finding points into a file (1-based):

```json
{
  "roots": ["/abs/path/.claude/skills"],
  "skillsChecked": 3,
  "issues": [
    {
      "rule": "description",
      "severity": "error",
      "path": "/abs/path/.claude/skills/pdf/SKILL.md",
      "line": 3,
      "message": "description is 1121 characters (max 1024) — the skill is silently dropped"
    }
  ],
  "summary": { "errors": 1, "warnings": 0 }
}
```

To switch a rule off, pass `--ignore <rule>` (repeatable). An unknown rule name is an error, so a typo cannot silently keep a rule on:

```console
npx skills-lint .claude/skills --ignore sprawled --ignore shadowed
```

## What it checks

Each finding has a severity. **Errors** fail the run; **warnings** are reported but never fail it.

| Rule | Severity | Finding |
| --- | --- | --- |
| `no-skill-md` | error | A folder in a skills root has no `SKILL.md` |
| `description` | error | `SKILL.md` has no frontmatter block, or it is not closed with `---` |
| `description` | error | `description` is missing, or longer than the spec limit of 1024 characters |
| `shadowed` | error | The same skill name appears in more than one scanned root; the copy in the later root is reported |
| `reserved-name` | error | A skill folder is named `synced` (any capitalization) inside `.claude/skills`; Claude Code reserves that name for skills downloaded from claude.ai and skips it |
| `sprawled` | warning | Skills are spread across several scanned roots |

Clean folders exit quietly:

```console
$ npx skills-lint .claude/skills
skills-lint: scanning 1 root(s)
  - .claude/skills

checked 6 skill folder(s)

✔ No issues found
```

## Agent behavior

<!-- facts:start (generated by npm run docs, do not edit) -->

What skills-lint assumes about each agent, generated from [`src/agents.ts`](src/agents.ts) (`npx skills-lint --facts` prints the same table). Behavior no source documents is marked unknown.

### Agent Skills spec

| Fact | Source | Checked |
| --- | --- | --- |
| A skill is a folder containing a file named exactly SKILL.md. | [agentskills.io/specification](https://agentskills.io/specification) | 2026-10-30 |
| `name` and `description` are required frontmatter fields. | [agentskills.io/specification](https://agentskills.io/specification) | 2026-10-30 |
| `description` is at most 1024 characters. | [agentskills.io/specification](https://agentskills.io/specification) | 2026-10-30 |
| `name` is 1–64 characters. | [agentskills.io/specification](https://agentskills.io/specification) | 2026-10-30 |
| `name` uses lowercase a-z, 0-9 and hyphens, with no leading, trailing or consecutive hyphens. | [agentskills.io/specification](https://agentskills.io/specification) | 2026-10-30 |
| `name` must match the parent folder name. | [agentskills.io/specification](https://agentskills.io/specification) | 2026-10-30 |
| `compatibility` is at most 500 characters. | [agentskills.io/specification](https://agentskills.io/specification) | 2026-10-30 |
| Keep the SKILL.md body under 500 lines or about 5,000 tokens. | [agentskills.io/specification](https://agentskills.io/specification) | 2026-10-30 |

### Claude Code

| Fact | Source | Checked |
| --- | --- | --- |
| Reads `.claude/skills` in the start directory and every parent up to the repository root. | [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills) | 2026-10-30 |
| Reads `~/.claude/skills`, plus an enterprise managed directory. | [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills) | 2026-10-30 |
| On a duplicate name, enterprise wins over personal and personal over project; a project-root skill and a nested skill both load. | [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills) | 2026-10-30 |
| Only `<root>/<skill-name>/SKILL.md` is documented (one level deep). | [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills) | 2026-10-30 |
| `name` defaults to the directory name. | [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills) | 2026-10-30 |
| `~/.claude/skills/synced/` holds skills downloaded from claude.ai; a skill authored under that name (any capitalization) is skipped. | [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills) | 2026-10-30 |
| `anthropic-skills` and every `anthropic-skills:*` name are reserved for synced skills. | [code.claude.com/docs/en/skills#characters-a-skill-name-cant-hold](https://code.claude.com/docs/en/skills#characters-a-skill-name-cant-hold) | 2026-10-30 |
| Names with zero-width/control, private-use or unassigned characters, bidi controls, any blank other than one plain space between words, or `<` / `>` are refused: a folder name stops the skill loading, a frontmatter name makes it uninvocable by that name. | [code.claude.com/docs/en/skills#characters-a-skill-name-cant-hold](https://code.claude.com/docs/en/skills#characters-a-skill-name-cant-hold) | 2026-10-30 |
| Frontmatter is read only when the opening `---` is the file's first line. | [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills) | 2026-10-30 |
| On a frontmatter YAML error the skill still loads with no fields set. | [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills) | 2026-10-30 |
| Without `description`, the first non-empty line of the markdown body is used. | [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills) | 2026-10-30 |
| `description` + `when_to_use` is truncated at 1,536 characters in the skill listing (configurable via `skillListingMaxDescChars`). | [code.claude.com/docs/en/skills#skill-descriptions-are-cut-short](https://code.claude.com/docs/en/skills#skill-descriptions-are-cut-short) | 2026-10-30 |
| The skill listing budget is 1% of the model's context window; on overflow, descriptions of the least-invoked skills are dropped first. | [code.claude.com/docs/en/skills#skill-descriptions-are-cut-short](https://code.claude.com/docs/en/skills#skill-descriptions-are-cut-short) | 2026-10-30 |

### Codex

| Fact | Source | Checked |
| --- | --- | --- |
| Reads `.agents/skills` from the working directory up to the repository root, and `.codex/skills` from the project config layer. | [github.com/openai/codex/blob/f752c97/codex-rs/ext/skills/src/host_roots.rs](https://github.com/openai/codex/blob/f752c97/codex-rs/ext/skills/src/host_roots.rs) (main @ f752c97) | 2026-10-30 |
| Reads `~/.agents/skills`, `$CODEX_HOME/skills` (default `~/.codex/skills`, deprecated but still read) and `/etc/codex/skills`. | [github.com/openai/codex/blob/f752c97/codex-rs/ext/skills/src/host_roots.rs](https://github.com/openai/codex/blob/f752c97/codex-rs/ext/skills/src/host_roots.rs) (main @ f752c97) | 2026-10-30 |
| Duplicate names are not merged: both copies can appear in skill selectors. | [learn.chatgpt.com/docs/build-skills](https://learn.chatgpt.com/docs/build-skills) | 2026-10-30 |
| Each root is walked recursively up to depth 6, at most 2,000 skill folders per root. | [github.com/openai/codex/blob/f752c97/codex-rs/ext/skills/src/loader/mod.rs](https://github.com/openai/codex/blob/f752c97/codex-rs/ext/skills/src/loader/mod.rs) (main @ f752c97) | 2026-10-30 |
| A `name` over 64 characters is rejected. | [github.com/openai/codex/blob/f752c97/codex-rs/skills/src/parser.rs](https://github.com/openai/codex/blob/f752c97/codex-rs/skills/src/parser.rs) (main @ f752c97) | 2026-10-30 |
| `name` falls back to the folder name; lowercase and the folder match are not enforced. | [github.com/openai/codex/blob/f752c97/codex-rs/skills/src/parser.rs](https://github.com/openai/codex/blob/f752c97/codex-rs/skills/src/parser.rs) (main @ f752c97) | 2026-10-30 |
| `description` has no length limit (the 1024 limit existed in v0.111.0 and was removed). | [github.com/openai/codex/blob/f752c97/codex-rs/skills/src/parser.rs](https://github.com/openai/codex/blob/f752c97/codex-rs/skills/src/parser.rs) (main @ f752c97) | 2026-10-30 |
| An empty `description` skips the skill, with a startup warning "Skipped loading N skill(s) due to invalid SKILL.md files." | [github.com/openai/codex/blob/f752c97/codex-rs/tui/src/app/startup_prompts.rs](https://github.com/openai/codex/blob/f752c97/codex-rs/tui/src/app/startup_prompts.rs) (main @ f752c97) | 2026-10-30 |
| A UTF-8 BOM before the opening `---` hides the frontmatter. | [github.com/openai/codex/blob/f752c97/codex-rs/skills/src/parser.rs](https://github.com/openai/codex/blob/f752c97/codex-rs/skills/src/parser.rs) (main @ f752c97) | 2026-10-30 |
| An unquoted colon inside a frontmatter value is repaired before parsing. | [github.com/openai/codex/blob/f752c97/codex-rs/skills/src/parser.rs](https://github.com/openai/codex/blob/f752c97/codex-rs/skills/src/parser.rs) (main @ f752c97) | 2026-10-30 |
| The skill listing budget is 2% of the context window in tokens, or 8,000 characters when the window is unknown; a configured budget is capped at 10,000 tokens. On overflow all descriptions are removed. | [github.com/openai/codex/blob/f752c97/codex-rs/ext/skills/src/render.rs](https://github.com/openai/codex/blob/f752c97/codex-rs/ext/skills/src/render.rs) (main @ f752c97) | 2026-10-30 |

### Cursor

| Fact | Source | Checked |
| --- | --- | --- |
| Reads `.agents/skills` and `.cursor/skills`, plus `.claude/skills` and `.codex/skills` for compatibility, in the project and under `~`. | [cursor.com/docs/context/skills](https://cursor.com/docs/context/skills) | 2026-10-30 |
| Which copy is used when two skills share a name is not documented. | [cursor.com/docs/context/skills](https://cursor.com/docs/context/skills) | 2026-10-30 |
| The skills root is walked recursively and any SKILL.md is picked up; category folders are organizational. | [cursor.com/docs/context/skills](https://cursor.com/docs/context/skills) | 2026-10-30 |
| `name` must match the parent folder name. | [cursor.com/docs/context/skills](https://cursor.com/docs/context/skills) | 2026-10-30 |
| Without `description` the agent is unlikely to pick the skill on its own, but it can still be invoked by name. | [cursor.com/docs/context/skills](https://cursor.com/docs/context/skills) | 2026-10-30 |

### ZCode

| Fact | Source | Checked |
| --- | --- | --- |
| No source found for where ZCode reads skills; `.zcode/skills` is scanned only because v0.2 did. | none found | 2026-10-30 |

<!-- facts:end -->

## Known limitations

v0.2 is deliberately small, and these are known gaps. Each one has an open issue:

- **Not agent-aware yet.** All scanned roots are treated as one namespace, in scan order. Agents don't work that way: Claude Code doesn't read `.agents/skills`, Codex doesn't read `.claude/skills`, Claude Code prefers a personal skill over a project skill, and Codex lists both copies of a duplicate name. So `shadowed` between folders of different agents is usually a false positive. → [#3](https://github.com/pachara-n/skills-lint/issues/3)
- **Messages overstate consequences.** "the skill is silently dropped" is not accurate for every agent (see [Why](#why)). → [#6](https://github.com/pachara-n/skills-lint/issues/6)
- **Symlinked skill folders are skipped**, including the common layout where skills in `~/.claude/skills` link to `~/.agents/skills`. → [#2](https://github.com/pachara-n/skills-lint/issues/2)
- **`~/.claude/skills/synced`** (skills synced from claude.ai) is skipped when it has no `SKILL.md`, and a user-authored skill under that reserved name is reported. Its downloaded contents are not counted or inspected yet. → [#4](https://github.com/pachara-n/skills-lint/issues/4)
- **Nested category folders** (`skills/tools/pdf/SKILL.md`), which Codex and Cursor support, are reported as folders without `SKILL.md`. → [#14](https://github.com/pachara-n/skills-lint/issues/14)
- **Frontmatter is read as flat `key: value` lines**, not full YAML: multi-line (`>` / `|`) descriptions are not measured correctly and invalid YAML is not detected. → [#5](https://github.com/pachara-n/skills-lint/issues/5)
- `name` and other fields are not validated yet. → [#8](https://github.com/pachara-n/skills-lint/issues/8), [#17](https://github.com/pachara-n/skills-lint/issues/17)

## CI

Exit code is `1` when at least one error is found and `0` otherwise (a run with only warnings passes). As a GitHub Action:

```yaml
- uses: pachara-n/skills-lint@v1
  with:
    paths: .claude/skills   # recommended; auto-detects when omitted
```

Or run it directly:

```yaml
- run: npx skills-lint .claude/skills
```

## Development

```console
npm install
npm test        # build + unit & integration tests (fixtures in test/fixtures)
npm run build   # bundle to dist/ via tsup
```

Contributions are welcome — read [CONTRIBUTING.md](CONTRIBUTING.md) first (claim an issue before you start). Issues labelled [`good first issue`](https://github.com/pachara-n/skills-lint/labels/good%20first%20issue) have a scoped starting point.

## License

[MIT](LICENSE)
