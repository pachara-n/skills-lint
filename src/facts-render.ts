import { AGENT_NAMES, FACTS, type AgentId, type Fact } from "./agents.js";

const AGENT_ORDER: AgentId[] = ["spec", "claude", "codex", "cursor", "zcode"];

function byAgent(): [AgentId, [string, Fact][]][] {
  const entries = Object.entries(FACTS) as [string, Fact][];
  return AGENT_ORDER.map((agent) => [agent, entries.filter(([, f]) => f.agent === agent)]);
}

/** Link text for a source URL: the URL without its scheme. */
const sourceLabel = (source: string): string => source.replace(/^https?:\/\//, "");

const escapeCell = (text: string): string => text.replace(/\|/g, "\\|");

export function renderFactsText(): string {
  const lines: string[] = [];
  for (const [agent, facts] of byAgent()) {
    lines.push(AGENT_NAMES[agent]);
    for (const [id, f] of facts) {
      lines.push(`  ${id}`);
      lines.push(`    ${f.summary}`);
      const version = f.agentVersion ? ` (${f.agentVersion})` : "";
      lines.push(`    source: ${f.source}${version}, checked ${f.checked}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function renderFactsJson(): string {
  return JSON.stringify(FACTS, null, 2);
}

/** The README "Agent behavior" section body. Kept in sync by `npm run docs`. */
export function renderFactsMarkdown(): string {
  const out: string[] = [
    "What skills-lint assumes about each agent, generated from [`src/agents.ts`](src/agents.ts) (`npx skills-lint --facts` prints the same table). Behavior no source documents is marked unknown.",
    "",
  ];
  for (const [agent, facts] of byAgent()) {
    out.push(`### ${AGENT_NAMES[agent]}`, "", "| Fact | Source | Checked |", "| --- | --- | --- |");
    for (const [, f] of facts) {
      const link = /^https?:\/\//.test(f.source)
        ? `[${sourceLabel(f.source)}](${f.source})`
        : f.source;
      const version = f.agentVersion ? ` (${f.agentVersion})` : "";
      out.push(`| ${escapeCell(f.summary)} | ${escapeCell(link + version)} | ${f.checked} |`);
    }
    out.push("");
  }
  return out.join("\n").trimEnd();
}
