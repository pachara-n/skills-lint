import type { Issue } from "../types.js";

/** Advisory rule: skills split across several homes with no single source of truth. */
export function sprawled(roots: string[]): Issue[] {
  if (roots.length < 2) return [];
  return [
    {
      rule: "sprawled",
      path: roots.join(", "),
      message: `skills are spread across ${roots.length} homes — consider a single source of truth`,
    },
  ];
}
