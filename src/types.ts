export type RuleId = "no-skill-md" | "description" | "shadowed" | "sprawled";

export interface Issue {
  rule: RuleId;
  path: string;
  message: string;
}
