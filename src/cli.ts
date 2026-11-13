import { program } from "commander";
import { resolve } from "node:path";
import { lint } from "./lint.js";
import { defaultRoots } from "./roots.js";
import { renderFactsJson, renderFactsMarkdown, renderFactsText } from "./facts-render.js";
import { RULE_IDS, type Issue, type RuleId } from "./types.js";
import pkg from "../package.json" with { type: "json" };

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;
const location = (issue: Issue): string => (issue.line ? `${issue.path}:${issue.line}` : issue.path);

program
  .name("skills-lint")
  .description("Check AI agent skills folders for SKILL.md problems")
  .version(pkg.version)
  .option("--format <format>", "output format: text or json (markdown with --facts)", "text")
  .option("--facts", "print what skills-lint assumes about each agent, with sources, and exit")
  .option("--no-color", "disable colored output")
  .option(
    "--ignore <rule>",
    `skip a rule; repeatable (rules: ${RULE_IDS.join(", ")})`,
    (rule: string, previous: string[]) => [...previous, rule],
    [] as string[],
  )
  .argument(
    "[paths...]",
    "skills folders to scan (default: auto-detect the usual locations)",
  )
  .action((paths: string[], options: { format: string; color: boolean; ignore: string[]; facts?: boolean }) => {
    if (options.facts) {
      const render = { text: renderFactsText, json: renderFactsJson, markdown: renderFactsMarkdown }[
        options.format
      ];
      if (!render) {
        console.error(`Unknown format: ${options.format} (use "text", "json" or "markdown")`);
        process.exitCode = 1;
        return;
      }
      console.log(render());
      return;
    }

    // A misspelled rule would otherwise look like it was ignored while still
    // failing (or silently passing) the run, so reject it up front.
    const unknown = options.ignore.filter((rule) => !(RULE_IDS as readonly string[]).includes(rule));
    if (unknown.length > 0) {
      for (const rule of unknown) console.error(`Unknown rule "${rule}" in --ignore`);
      console.error(`Valid rules: ${RULE_IDS.join(", ")}`);
      process.exitCode = 1;
      return;
    }
    const ignored = new Set(options.ignore as RuleId[]);

    // Honor https://no-color.org: any non-empty value in process.env.NO_COLOR disables color
    const useColor =
      Boolean(process.stdout.isTTY) &&
      options.color !== false &&
      !("NO_COLOR" in process.env && process.env.NO_COLOR !== "");

    const style = (text: string, open: string = "", close: string = "\x1b[0m"): string =>
      useColor && open ? `${open}${text}${close}` : text;

    const explicit = paths.length > 0;
    // Resolve before deduping: `.` and the absolute path of the same folder
    // must scan once, and rules like the .claude/skills check need the real
    // basename instead of ".".
    const roots = explicit
      ? [...new Set(paths.map((path) => resolve(path)))]
      : defaultRoots();

    if (roots.length === 0) {
      if (options.format === "json") {
        console.log(
          JSON.stringify(
            { roots: [], skillsChecked: 0, issues: [], summary: { errors: 0, warnings: 0 } },
            null,
            2,
          ),
        );
      }
      console.error("No skills folders found in the usual locations.");
      console.error("Pass a path explicitly: skills-lint <path> [...]");
      process.exitCode = 1;
      return;
    }

    const result = lint(roots);
    const skills = result.skills;
    const issues = result.issues.filter((issue) => !ignored.has(issue.rule));
    const errors = issues.filter((issue) => issue.severity === "error").length;
    const summary = { errors, warnings: issues.length - errors };

    if (options.format === "json") {
      console.log(
        JSON.stringify({ roots, skillsChecked: skills.length, issues, summary }, null, 2),
      );
    } else if (options.format !== "text") {
      console.error(`Unknown format: ${options.format} (use "text" or "json")`);
      process.exitCode = 1;
      return;
    } else {
      console.log(
        `skills-lint: scanning ${roots.length} root(s)${explicit ? "" : " (auto-detected)"}`,
      );
      for (const root of roots) console.log(`  - ${root}`);
      console.log(`\nchecked ${skills.length} skill folder(s)\n`);

      if (issues.length === 0) {
        console.log(`${style("✔", "\x1b[32m")} No issues found`);
      } else {
        console.log(`Found ${issues.length} issue(s):\n`);
        for (const issue of issues) {
          const mark =
            issue.severity === "error" ? style("✖", "\x1b[31m") : style("⚠", "\x1b[33m");
          console.log(`  ${mark} [${issue.rule}] ${location(issue)}`);
          console.log(`          ${issue.message}\n`);
        }
        console.log(`${plural(summary.errors, "error")}, ${plural(summary.warnings, "warning")}`);
      }
    }
    // only errors fail the run; warnings are reported but advisory
    if (summary.errors > 0) process.exitCode = 1;
  });

program.parse();
