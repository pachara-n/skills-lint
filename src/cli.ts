import { program } from "commander";
import { resolve } from "node:path";
import { lint } from "./lint.js";
import { defaultRoots } from "./roots.js";
import pkg from "../package.json" with { type: "json" };

program
  .name("skills-lint")
  .description("Check AI agent skills folders for SKILL.md problems")
  .version(pkg.version)
  .option("--format <format>", "output format: text or json", "text")
  .argument(
    "[paths...]",
    "skills folders to scan (default: auto-detect the usual locations)",
  )
  .action((paths: string[], options: { format: string }) => {
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
          JSON.stringify({ roots: [], skillsChecked: 0, issues: [] }, null, 2),
        );
      }
      console.error("No skills folders found in the usual locations.");
      console.error("Pass a path explicitly: skills-lint <path> [...]");
      process.exitCode = 1;
      return;
    }

    const { skills, issues } = lint(roots);

    if (options.format === "json") {
      console.log(
        JSON.stringify({ roots, skillsChecked: skills.length, issues }, null, 2),
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
        console.log("✔ No issues found");
      } else {
        console.log(`✖ Found ${issues.length} issue(s):\n`);
        for (const issue of issues) {
          console.log(`  [${issue.rule}] ${issue.path}`);
          console.log(`          ${issue.message}\n`);
        }
      }
    }
    // sprawled is advisory: reported in text and json, but only hard
    // issues fail the run (multi-root scans are a legitimate setup)
    if (issues.some((i) => i.rule !== "sprawled")) process.exitCode = 1;
  });

program.parse();
