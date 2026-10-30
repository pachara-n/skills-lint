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

## What it checks

| Rule | Finding |
| --- | --- |
| `no-skill-md` | A folder in a skills root has no `SKILL.md` |
| `description` | `SKILL.md` has no frontmatter block, or it is not closed with `---` |
| `description` | `description` is missing, or longer than the spec limit of 1024 characters |
| `shadowed` | The same skill name appears in more than one scanned root; the copy in the later root is reported |
| `sprawled` *(advisory)* | Skills are spread across several scanned roots. Reported, but never fails the run |

Clean folders exit quietly:

```console
$ npx skills-lint .claude/skills
skills-lint: scanning 1 root(s)
  - .claude/skills

checked 6 skill folder(s)

✔ No issues found
```

## Known limitations

v0.2 is deliberately small, and these are known gaps. Each one has an open issue:

- **Not agent-aware yet.** All scanned roots are treated as one namespace, in scan order. Agents don't work that way: Claude Code doesn't read `.agents/skills`, Codex doesn't read `.claude/skills`, Claude Code prefers a personal skill over a project skill, and Codex lists both copies of a duplicate name. So `shadowed` between folders of different agents is usually a false positive. → [#3](https://github.com/pachara-n/skills-lint/issues/3)
- **Messages overstate consequences.** "the skill is silently dropped" is not accurate for every agent (see [Why](#why)). → [#6](https://github.com/pachara-n/skills-lint/issues/6)
- **Symlinked skill folders are skipped**, including the common layout where skills in `~/.claude/skills` link to `~/.agents/skills`. → [#2](https://github.com/pachara-n/skills-lint/issues/2)
- **`~/.claude/skills/synced`** (skills synced from claude.ai) is reported as a folder without `SKILL.md`. → [#4](https://github.com/pachara-n/skills-lint/issues/4)
- **Nested category folders** (`skills/tools/pdf/SKILL.md`), which Codex and Cursor support, are reported as folders without `SKILL.md`. → [#14](https://github.com/pachara-n/skills-lint/issues/14)
- **Frontmatter is read as flat `key: value` lines**, not full YAML: multi-line (`>` / `|`) descriptions are not measured correctly and invalid YAML is not detected. → [#5](https://github.com/pachara-n/skills-lint/issues/5)
- `name` and other fields are not validated yet. → [#8](https://github.com/pachara-n/skills-lint/issues/8), [#17](https://github.com/pachara-n/skills-lint/issues/17)

## CI

Exit code is `0` when clean (or when the only findings are advisory `sprawled`) and `1` when issues are found. As a GitHub Action:

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

Contributions are welcome — issues labelled [`good first issue`](https://github.com/pachara-n/skills-lint/labels/good%20first%20issue) have a scoped starting point.

## License

[MIT](LICENSE)
