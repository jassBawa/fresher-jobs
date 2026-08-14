// Turning a facts record into a markdown document.
//
// Everything here is a pure function of the facts — no clock, no env, no disk,
// no model. `createdAt` is passed in rather than read from `new Date()` so the
// output is reproducible and testable.
//
// A template restating a JSON field cannot hallucinate a batch year; a model
// can. So the table, the eligibility block, the lists and every frontmatter key
// are rendered here, and the model is left with four short prose fields
// (docs/decisions.md D12).

export const list = (arr) =>
  arr
    .filter(Boolean)
    .map((x) => `- ${x}`)
    .join("\n");

/** Batch years, filtered to things that actually look like years, sorted. */
export const yr = (a = []) => a.filter((y) => /^20\d\d$/.test(String(y))).sort();

export function quickFacts(f) {
  const rows = [
    ["Company", f.company],
    ["Role", f.role],
    ["Qualification", f.qualifications?.join(", ")],
    ["Batch", yr(f.batchYears).join(", ")],
    ["Experience", f.experienceRequired],
    ["Location", f.locations?.join(", ")],
    ["Salary", f.salary],
    ["Job type", f.jobType],
    ["Last date", f.lastDateToApply],
  ].filter(([, v]) => v && String(v).trim());

  return ["| | |", "|---|---|", ...rows.map(([k, v]) => `| **${k}** | ${v} |`)].join("\n");
}

export function renderBody(f, prose) {
  const out = [];

  out.push(quickFacts(f), "");

  const who = [];
  if (yr(f.batchYears).length) who.push(`**Batch:** ${yr(f.batchYears).join(", ")} graduates`);
  if (f.qualifications?.length) who.push(`**Qualification:** ${f.qualifications.join(", ")}`);
  if (f.experienceRequired) who.push(`**Experience:** ${f.experienceRequired}`);
  if (who.length) out.push("## Who Can Apply", "", who.join("  \n"), "");

  if (prose.about) out.push("## About the Role", "", prose.about, "");

  const need = [...(f.skills || []), ...(f.requirements || [])];
  if (need.length) out.push("## What You Need", "", list(need), "");

  if (f.responsibilities?.length) out.push("## What You'll Do", "", list(f.responsibilities), "");

  const apply = [];
  if (f.applyUrl) apply.push(`Applications are submitted on ${f.company}'s official careers page.`, "");
  if (f.lastDateToApply) apply.push(`**Last date to apply:** ${f.lastDateToApply}`, "");
  if (f.applyUrl) apply.push(`[Apply for ${f.role} at ${f.company}](${f.applyUrl})`, "");
  if (apply.length) out.push("## How to Apply", "", ...apply);

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Deterministic copy, used with --no-llm or when the model call fails. */
export function fallbackProse(f) {
  const batch = yr(f.batchYears);
  const where = f.locations?.length ? ` in ${f.locations.join(", ")}` : "";
  const who = batch.length ? `${batch.join(", ")} batch` : "eligible candidates";
  return {
    title: `${f.company} ${f.role} ${batch.at(-1) || ""}`.trim().slice(0, 65),
    meta: `${f.company} is hiring for ${f.role}${where}. Open to ${who}.`.slice(0, 155),
    summary: `${f.company} is hiring for the role of ${f.role}${where}. The opening is open to ${who}.`,
    about: "",
  };
}

export const yaml = (v) => {
  if (v == null) return "";
  if (Array.isArray(v)) return `[${v.map((x) => JSON.stringify(String(x))).join(", ")}]`;
  return JSON.stringify(String(v));
};

/**
 * The complete draft document: frontmatter, summary, rendered body.
 *
 * The `.filter()` applies to frontmatter only — a conditional line collapses to
 * "" and is dropped. The body's blank lines are structural (markdown needs
 * them) and must survive.
 */
export function buildDraft({
	facts,
	prose,
	slug,
	usedLLM,
	createdAt,
	postedAt = null,
	status = "draft",
}) {
  const frontmatter = [
    `title: ${yaml(prose.title)}`,
    `description: ${yaml(prose.meta)}`,
    `slug: ${yaml(slug)}`,
    `status: ${status}`,
    `company: ${yaml(facts.company)}`,
    `role: ${yaml(facts.role)}`,
    facts.jobType ? `jobType: ${yaml(facts.jobType)}` : "",
    yr(facts.batchYears).length ? `batchYears: ${yaml(yr(facts.batchYears))}` : "",
    facts.locations?.length ? `locations: ${yaml(facts.locations)}` : "",
    facts.salary ? `salary: ${yaml(facts.salary)}` : "",
    facts.lastDateToApply ? `lastDateToApply: ${yaml(facts.lastDateToApply)}` : "",
    facts.applyByDate ? `applyByDate: ${yaml(facts.applyByDate)}` : "",
    facts.applyUrl ? `applyUrl: ${yaml(facts.applyUrl)}` : "",
    facts.skills?.length ? `skills: ${yaml(facts.skills)}` : "",
    `generatedBy: ${yaml(usedLLM ? "llm+template" : "template")}`,
    `createdAt: ${yaml(createdAt)}`,
    // When the employer announced it, not when we drafted it. Both the
    // freshness horizon and JSON-LD datePosted key off this.
    postedAt ? `postedAt: ${yaml(postedAt)}` : "",
    // The facts records called this discoveredVia; the database column is
    // source_ref. Accept either so the export and the old path agree.
    facts.sourceRef ?? facts.discoveredVia
      ? `sourceRef: ${yaml(facts.sourceRef ?? facts.discoveredVia)}`
      : "",
  ].filter((l) => l !== "");

  return (
    ["---", ...frontmatter, "---"].join("\n") +
    "\n\n" +
    prose.summary +
    "\n\n" +
    renderBody(facts, prose) +
    "\n"
  );
}
