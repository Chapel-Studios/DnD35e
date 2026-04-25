/**
 * sync-milestones.mjs
 *
 * Syncs GitHub milestones from docs/migration-plan/phases.json.
 * Creates missing milestones, updates mismatched state (open/closed),
 * and leaves unrecognized milestones untouched.
 *
 * Milestone title format: "poc.1 — Item Foundation"
 * Phases with status "complete" or "hardened" → closed milestone.
 * All others → open milestone.
 *
 * Usage:
 *   node scripts/sync-milestones.mjs [--repo=owner/repo] [--dry-run]
 *
 * Requires GITHUB_TOKEN env var with repo scope.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const DEFAULT_REPO = "Chapel-Studios/DnD35e";
const REPO = process.env.GITHUB_REPOSITORY ?? DEFAULT_REPO;
const TOKEN = process.env.GITHUB_TOKEN;

const repoArg = process.argv.find((a) => a.startsWith("--repo="));
const repo = repoArg ? repoArg.split("=")[1] : REPO;
const dryRun = process.argv.includes("--dry-run");

const CLOSED_STATUSES = new Set(["complete", "hardened"]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function milestoneTitle(phase) {
  const num = parseInt(phase.number, 10);
  return `${phase.wave}.${num} \u2014 ${phase.title}`;
}

function milestoneState(phase) {
  return CLOSED_STATUSES.has(phase.status) ? "closed" : "open";
}

async function ghFetch(urlPath, options = {}) {
  if (!TOKEN) throw new Error("GITHUB_TOKEN is required");
  const res = await fetch(`https://api.github.com/repos/${repo}${urlPath}`, {
    ...options,
    headers: {
      "User-Agent": "dnd35e-sync-milestones",
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status} on ${urlPath}: ${body}`);
  }
  return res.status === 204 ? null : res.json();
}

async function fetchAllMilestones() {
  let page = 1;
  const all = [];
  while (true) {
    const batch = await ghFetch(`/milestones?state=all&per_page=100&page=${page}`);
    all.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return all;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { phases } = JSON.parse(
    fs.readFileSync(path.join(ROOT, "docs/migration-plan/phases.json"), "utf8"),
  );

  console.log(`Syncing ${phases.length} milestones to ${repo}${dryRun ? " (dry-run)" : ""}…\n`);

  const existing = await fetchAllMilestones();
  const byTitle = new Map(existing.map((m) => [m.title, m]));

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const phase of phases) {
    const title = milestoneTitle(phase);
    const state = milestoneState(phase);
    const current = byTitle.get(title);

    if (!current) {
      console.log(`  CREATE  ${title}  [${state}]`);
      if (!dryRun) {
        await ghFetch("/milestones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, state }),
        });
      }
      created++;
    } else if (current.state !== state) {
      console.log(`  UPDATE  ${title}  ${current.state} → ${state}`);
      if (!dryRun) {
        await ghFetch(`/milestones/${current.number}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state }),
        });
      }
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\nDone. ${created} created, ${updated} updated, ${skipped} unchanged.`);
  if (dryRun) console.log("(dry-run — no changes made to GitHub)");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
