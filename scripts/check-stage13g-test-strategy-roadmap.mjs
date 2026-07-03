import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const roadmap = read('docs/EURO28-AGENT-RULES-AND-ROADMAP.md');
const register = read('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md');
const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((name) => name.endsWith('.sql')).sort();

const requiredPhrases = [
  'Route-render integration tests',
  'dead-destination audit',
  'Permission matrix pgTAP suite',
  'Invariant tests',
  'Lock-boundary suite',
  'Config-to-surface contract tests',
  'mutation testing, broad visual regression and multi-browser matrices',
];

const missing = [];
for (const phrase of requiredPhrases) {
  if (!roadmap.includes(phrase)) missing.push(`roadmap missing: ${phrase}`);
  if (!register.includes(phrase)) missing.push(`register missing: ${phrase}`);
}

if (migrations.length !== 18) {
  missing.push(`expected 18 migrations, found ${migrations.length}`);
}

if (migrations.some((name) => name.includes('019'))) {
  missing.push('Migration 019 must not exist for this roadmap-only amendment');
}

if (missing.length) {
  console.error('Stage 13G test-strategy roadmap check failed:');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Stage 13G test-strategy roadmap checks passed.');
console.log(`Active migrations: ${migrations.length}`);
console.log(`Latest migration: ${migrations.at(-1)}`);
