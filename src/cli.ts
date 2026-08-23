import { program } from "commander";
import { lint } from "./lint.js";
import { defaultRoots } from "./roots.js";

program
  .name("skills-lint")
  .description("Audit AI agent skills folders for problems that fail silently")
  .version("0.1.0")
  .argument(
    "[paths...]",
    "skills folders to scan (default: auto-detect the usual locations)",
  )
  .action((paths: string[]) => {
    const explicit = paths.length > 0;
    const roots = explicit ? paths : defaultRoots();

    if (roots.length === 0) {
      console.error("No skills folders found in the usual locations.");
      console.error("Pass a path explicitly: skills-lint <path> [...]");
      process.exitCode = 1;
      return;
    }

    const { skills, issues } = lint(roots);

    console.log(
      `skills-lint: scanning ${roots.length} root(s)${explicit ? "" : " (auto-detected)"}`,
    );
    for (const root of roots) console.log(`  - ${root}`);
    console.log(`\nchecked ${skills.length} skill folder(s)\n`);

    if (issues.length === 0) {
      console.log("✔ No issues found");
      return;
    }

    console.log(`✖ Found ${issues.length} issue(s):\n`);
    for (const issue of issues) {
      console.log(`  [${issue.rule}] ${issue.path}`);
      console.log(`          ${issue.message}\n`);
    }
    process.exitCode = 1;
  });

program.parse();
