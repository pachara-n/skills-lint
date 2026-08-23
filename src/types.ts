export type RuleId = "no-skill-md" | "description" | "shadowed";

export interface Issue {
  rule: RuleId;
  path: string;
  message: string;
}
