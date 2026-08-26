#!/usr/bin/env node
/**
 * ════════════════════════════════════════════════════════════════════════════
 * AUTOMATIC SEMVER BUMP
 * Reads the commits made since the last `v*` tag, classifies them as major /
 * minor / patch using Conventional Commits, then writes the new version to
 * package.json, commits it and tags it.
 *
 *   feat!: ...  |  BREAKING CHANGE: in body   → major
 *   feat: ...                                 → minor
 *   anything else (fix, perf, chore, refactor)→ patch
 *
 * Usage:
 *   node scripts/bump-version.mjs            # bump, commit, tag
 *   node scripts/bump-version.mjs --dry-run  # print the decision only
 * ════════════════════════════════════════════════════════════════════════════
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const DRY_RUN = process.argv.includes('--dry-run');
const PKG = new URL('../package.json', import.meta.url);

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

const tryGit = (...args) => {
  try {
    return git(...args);
  } catch {
    return null;
  }
};

// ─── Commit range ────────────────────────────────────────────────────────────

const lastTag = tryGit('describe', '--tags', '--abbrev=0', '--match', 'v*');
const range = lastTag ? `${lastTag}..HEAD` : 'HEAD';

// %B is the raw body, so `BREAKING CHANGE:` footers are visible. \x00 separates.
const raw = tryGit('log', range, '--no-merges', '--format=%B%x00') ?? '';
const commits = raw
  .split('\x00')
  .map((c) => c.trim())
  .filter(Boolean);

if (commits.length === 0) {
  console.log(`[version] No new commits since ${lastTag ?? 'the initial commit'} — nothing to bump.`);
  process.exit(0);
}

// ─── Classification ──────────────────────────────────────────────────────────

const BREAKING = /^[a-z]+(\([^)]*\))?!:/i;
const FEATURE = /^feat(\([^)]*\))?:/i;

let level = 'patch';
const reasons = [];

for (const commit of commits) {
  const subject = commit.split('\n')[0];

  if (BREAKING.test(subject) || /^BREAKING[ -]CHANGE:/m.test(commit)) {
    level = 'major';
    reasons.push(`major ← ${subject}`);
  } else if (FEATURE.test(subject) && level !== 'major') {
    level = 'minor';
    reasons.push(`minor ← ${subject}`);
  }
}

// ─── Apply ───────────────────────────────────────────────────────────────────

const pkg = JSON.parse(readFileSync(PKG, 'utf8'));
const [major, minor, patch] = pkg.version.split('.').map(Number);

const next =
  level === 'major'
    ? `${major + 1}.0.0`
    : level === 'minor'
      ? `${major}.${minor + 1}.0`
      : `${major}.${minor}.${patch + 1}`;

console.log(`[version] ${commits.length} commit(s) in ${range}`);
for (const reason of reasons) console.log(`[version]   ${reason}`);
console.log(`[version] ${pkg.version} → ${next} (${level})`);

if (DRY_RUN) process.exit(0);

pkg.version = next;
writeFileSync(PKG, `${JSON.stringify(pkg, null, 2)}\n`);

git('add', 'package.json');
git('commit', '-m', `chore(release): v${next}`);
git('tag', '-a', `v${next}`, '-m', `v${next}`);

console.log(`[version] Committed and tagged v${next}.`);
