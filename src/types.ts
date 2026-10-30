export type RuleId = "no-skill-md" | "description" | "shadowed" | "sprawled" | "reserved-name";

export interface Issue {
  rule: RuleId;
  path: string;
  message: string;
}
