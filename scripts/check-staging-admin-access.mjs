import fs from 'node:fs'

const requiredFiles = [
  'docs/STAGING-ADMIN-ACCESS.md',
  'scripts/generate-staging-admin-sql.mjs',
  'scripts/lib/stagingAdminSql.mjs',
  'scripts/__tests__/stagingAdminSql.test.js',
]

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Missing staging admin access file: ${file}`)
}

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
if (packageJson.scripts?.['admin:staging:sql'] !== 'node scripts/generate-staging-admin-sql.mjs') {
  throw new Error('admin:staging:sql is not wired correctly')
}
if (!String(packageJson.scripts?.check ?? '').includes('audit:staging-admin')) {
  throw new Error('audit:staging-admin is not included in npm run check')
}

const migration = fs.readFileSync('supabase/migrations/202607010012_euro28_admin_results_operations.sql', 'utf8')
for (const expected of [
  'grant execute on function private.euro28_set_tournament_admin(uuid, uuid, text, boolean, uuid, text) to service_role;',
  'revoke all on function private.euro28_set_tournament_admin(uuid, uuid, text, boolean, uuid, text) from public, anon, authenticated;',
  'Browser users can never grant or revoke this access.',
]) {
  if (!migration.includes(expected)) throw new Error(`Admin privilege boundary missing: ${expected}`)
}

const generator = fs.readFileSync('scripts/lib/stagingAdminSql.mjs', 'utf8')
for (const expected of [
  "EURO28_PROJECT_REF = 'gcfdwobpnanjchcnvdco'",
  "EURO28_TOURNAMENT_CODE = 'euro-2028'",
  'private.euro28_set_tournament_admin',
  'Refusing to write generated admin SQL inside the repository',
]) {
  if (!generator.includes(expected)) throw new Error(`Admin SQL generator guard missing: ${expected}`)
}

const prohibited = ['SUPABASE_SERVICE_ROLE_KEY', 'service_role_key', 'db reset --linked']
for (const file of requiredFiles) {
  const content = fs.readFileSync(file, 'utf8')
  for (const token of prohibited) {
    if (content.includes(token)) throw new Error(`Prohibited token ${token} found in ${file}`)
  }
}

console.log('Euro staging administrator access audit passed.')
console.log('Grant path: explicit SQL Editor operation against Euro staging only')
console.log('Role: owner for product-owner control-room testing')
console.log('Browser self-grant: blocked by database privileges')
console.log('Grant and revoke: append-only audited through the existing admin function')
console.log('Secrets: none stored or requested by the tooling')
