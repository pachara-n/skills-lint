import { program } from "commander";
import { lint } from "./lint.js";

program
  .name("skills-lint")
  .description("Audit AI agent skills folders for problems that fail silently")
  .version("0.1.0")
  .argument("[paths...]", "skills folders to scan (default: current directory)")
  .action((paths: string[]) => {
    const roots = paths.length > 0 ? paths : ["."];
    const { skills, issues } = lint(roots);

    console.log(
      `skills-lint: checked ${skills.length} skill folder(s) in ${roots.length} root(s)\n`,
    );

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
