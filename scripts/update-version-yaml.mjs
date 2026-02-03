import fs from "fs";
import path from "path";

const DEFAULT_REPO = "Chapel-Studios/DnD35e";
const REPO = process.env.GITHUB_REPOSITORY || DEFAULT_REPO;
const TOKEN = process.env.GITHUB_TOKEN;

const repoArg = process.argv.find((arg) => arg.startsWith("--repo="));
const repo = repoArg ? repoArg.split("=")[1] : REPO;

const root = process.cwd();
const systemJsonPath = path.join(root, "system.json");
const versionYamlPath = path.join(root, "version.yaml");

function readSystemVersion() {
  try {
    const raw = fs.readFileSync(systemJsonPath, "utf8");
    const data = JSON.parse(raw);
    return data?.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function readCurrentMilestoneFromYaml() {
  try {
    const raw = fs.readFileSync(versionYamlPath, "utf8");
    const match = raw.match(/current_milestone:\s*"([^"]+)"/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

async function fetchAllMilestones() {
  const headers = {
    "User-Agent": "dnd35e-version-updater",
    "Accept": "application/vnd.github+json",
  };

  if (TOKEN) {
    headers.Authorization = `Bearer ${TOKEN}`;
  }

  const url = `https://api.github.com/repos/${repo}/milestones?state=all&per_page=100`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${body}`);
  }
  return res.json();
}

function toYaml({ version, currentMilestone, milestones }) {
  const lines = [];
  lines.push("# Project version metadata");
  lines.push("#");
  lines.push("# Auto-generated from GitHub milestones.");
  lines.push("# Keep VERSION in sync with system.json when preparing a release.");
  lines.push("");
  lines.push("version:");
  lines.push(`  current: \"${version}\"`);
  lines.push(`  current_milestone: \"${currentMilestone}\"`);
  lines.push("");
  lines.push("milestones:");

  for (const m of milestones) {
    lines.push(`  - id: ${m.id}`);
    lines.push(`    name: \"${m.title}\"`);
    lines.push(`    url: \"${m.html_url}\"`);
    lines.push(`    status: \"${m.state}\"`);
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

async function main() {
  const version = readSystemVersion();
  const currentMilestone = readCurrentMilestoneFromYaml();
  const milestones = await fetchAllMilestones();

  const preferredMilestone = currentMilestone
    || milestones.find((m) => m.state === "open")?.title
    || milestones[0]?.title
    || "";

  const yaml = toYaml({
    version,
    currentMilestone: preferredMilestone,
    milestones,
  });

  fs.writeFileSync(versionYamlPath, yaml, "utf8");
  console.log(`Updated version.yaml from ${repo} milestones.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
