# skills-lint

> Audit your AI agent skills folders for problems that fail silently.

[![CI](https://github.com/pachara-n/skills-lint/actions/workflows/ci.yml/badge.svg)](https://github.com/pachara-n/skills-lint/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/skills-lint)](https://www.npmjs.com/package/skills-lint)
[![license](https://img.shields.io/badge/license-MIT-blue)](#license)

Your AI agent (Claude Code, Codex CLI, Cursor, ZCode, …) loads skills at startup by reading each folder's `SKILL.md` frontmatter. When a skill is broken, nothing crashes — it is **silently dropped**. The folder sits on your disk; your agent never sees it.

`skills-lint` scans your skills folders and reports every problem that would otherwise go unnoticed.

```console
$ npx skills-lint

skills-lint: scanning 2 root(s) (auto-detected)
  - ~/.agents/skills
  - ~/.codex/skills

checked 58 skill folder(s)

✖ Found 2 issue(s):

  [no-skill-md] ~/.agents/skills/pdf-tools
        folder has no SKILL.md — this skill will never load

  [shadowed] ~/.codex/skills/code-review
        "code-review" already exists in ~/.agents/skills/code-review — this copy never loads (first scanned wins)
```

## Why

At startup an agent parses each `SKILL.md`, validates the frontmatter, and injects `name` + `description` into its system prompt. Fail validation and the skill is dropped — with no error and no warning, in every major implementation:

- The [Agent Skills spec](https://agentskills.io/specification) caps `description` at **1024 characters**. Over the cap, [Codex rejects the whole skill](https://github.com/openai/codex/issues/13941) — confirmed *expected behavior* by OpenAI. Cursor runs the same validation before a skill is used.
- Community reports: ["73% of Claude skills are silently broken"](https://www.reddit.com/r/claudeskills/comments/1tnvfh1/73_of_claude_skills_are_silently_broken_is_yours/), ["35% of your context window is gone before you type"](https://www.reddit.com/r/ClaudeAI/comments/1s41rym/35_of_your_context_window_is_gone_before_you_type/), [duplicate skills shadowing on Cursor](https://forum.cursor.com/t/critical-issue-duplicate-skills-loading-causing-context-window-waste-and-confusion/150137).
- We reproduced it ourselves: a skill with a 1,918-character description and a skill with a misspelled `descrition:` field both vanished without a single warning.

## Usage

No install needed:

```console
npx skills-lint
```

With no arguments it auto-detects the usual skills folders on your machine — `.agents/`, `.claude/`, `.codex/`, `.cursor/`, `.zcode/`, project-level first, then your home directory — and prints exactly what it scanned. To scan specific roots instead, pass them explicitly:

```console
npx skills-lint <path> [<path> ...]
```

Explicit paths are the right choice in CI and for custom setups. Pass multiple roots to catch shadowing between them; sprawl across roots is reported too, but it is advisory — it never fails the run.

Machine-readable output for CI tooling:

```console
npx skills-lint --format json
```

## What it checks

| Rule | Problem | Why it matters |
| --- | --- | --- |
| `no-skill-md` | Folder has no `SKILL.md` | The skill will never load — usually a half-deleted or half-installed skill |
| `description` | `description` missing or over 1024 characters | Dropped at startup, silently (spec limit, enforced by Codex & Cursor) |
| `description` | Frontmatter block missing or unterminated (`---`) | The file is not recognized as a skill at all |
| `shadowed` | Same skill name in several scanned roots | First root wins; every later copy never loads |
| `sprawled` *(advisory)* | Skills spread across several scanned homes | No single source of truth — pruning and updates inevitably miss one. Reported in text and json output, but never fails CI |

Clean folders exit quietly:

```console
$ npx skills-lint .claude/skills
skills-lint: scanning 1 root(s)
  - .claude/skills

checked 6 skill folder(s)

✔ No issues found
```

## CI

Exit code is `0` when clean and `1` when issues are found, so it drops straight into CI. As a one-line GitHub Action:

```yaml
- uses: pachara-n/skills-lint@v1
  with:
    paths: .claude/skills   # optional — auto-detects when omitted
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

## License

[MIT](LICENSE)
