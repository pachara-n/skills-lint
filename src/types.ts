export const RULE_IDS = [
  "no-skill-md",
  "description",
  "shadowed",
  "sprawled",
  "reserved-name",
] as const;

export type RuleId = (typeof RULE_IDS)[number];

/** error fails the run (exit 1); warning is reported but never fails it. */
export type Severity = "error" | "warning";

export interface Issue {
  rule: RuleId;
  severity: Severity;
  path: string;
  line?: number; // 1-based line in `path`, when the finding points into a file
  message: string;
}
