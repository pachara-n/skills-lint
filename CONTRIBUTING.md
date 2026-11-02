# Contributing to skills-lint

Thanks for helping. This page is short on purpose — please read it before you start.

## 1. Claim an issue before you start

- Comment on the issue that you'd like to work on it, and wait until it is **assigned to you**. Unassigned work may be picked up by someone else.
- One person per issue. If an assigned issue has no visible progress (a draft PR or an update) for **7 days**, it becomes open again.
- Issues labelled [`good first issue`](https://github.com/pachara-n/skills-lint/labels/good%20first%20issue) have a comment with a starter scope: the files to touch and the test to add.
- For something without an issue, open one first so the approach can be agreed before you write code.

## 2. Set up

Node.js 20 or newer.

```console
npm ci
npm test        # builds dist/, then runs the unit and integration tests
npm run lint    # type check (tsc --noEmit)
```

Integration tests run the built CLI (`dist/cli.js`) against fixtures in `test/fixtures` or temporary folders, the same way a user or CI would.

## 3. Open a pull request

- **One issue per PR**, and put `Fixes #<number>` in the description.
- **A test that fails before your change and passes after it.** Say in the PR that you checked the failing half.
- `npm test` and `npm run lint` pass locally. If this is your first PR here, GitHub waits for a maintainer to approve the CI run; that is normal.
- Describe the problem, the root cause, the fix, and how you tested it. A clear description matters more than a long one.
- Commit messages: `type: subject` in lowercase imperative (`fix: resolve explicit paths before scanning`). Types: `feat`, `fix`, `docs`, `refactor`, `test`. Add a short prose body when the reason isn't obvious.
- PRs are merged with **rebase and merge**, so keep commits meaningful; a single commit is fine.

### If two PRs fix the same issue

The PR that was opened first and is correct with passing CI is merged; the other is closed as a duplicate. Claiming the issue first (section 1) avoids this.

## 4. Two project rules

**Every claim about an agent needs a source.** skills-lint's value is knowing how Claude Code, Codex, Cursor and others load skills, and those rules change between releases. Any message, rule or doc that states what an agent does must link to its source (a documentation page, or a file and commit in the agent's repository) and say when you checked it. If something is not documented, say so instead of guessing.

**The README describes only what is shipped.** If your change fixes something listed under [Known limitations](README.md#known-limitations), update or remove that entry in the same PR.

## Reporting a bug

Open an issue with the skills-lint version (`npx skills-lint --version`), your OS, the command you ran, the full output, and what you expected. A minimal folder layout that reproduces it helps most.
