# Euro 2028 staging database backup and restore

## Purpose

Create a fresh logical backup of the linked Euro staging database **before every future hosted migration**. The backup is an additional project-owned recovery layer; it does not replace Supabase platform backups.

The backup command uses `pg_dump` through the Supabase CLI, which applies Supabase's supported exclusions for managed schemas. The output is written outside the Git repository, permission-restricted, checksummed and labelled with the current Git commit and migration count.

## What the backup contains

Each timestamped backup directory contains:

- `roles.sql` — custom database roles;
- `schema.sql` — application-owned schema;
- `data.sql` — application-owned table data using `COPY`;
- `migration-history-schema.sql` — `supabase_migrations` schema;
- `migration-history-data.sql` — applied migration history;
- `backup-metadata.json` — source project, Git commit, migration count and file metadata;
- `SHA256SUMS.txt` — integrity checks for the dump files and metadata.

## Important scope limitation

This is a logical application database backup. Supabase CLI deliberately excludes Supabase-managed schemas such as **Auth**, **Storage** and extension-managed internals. It therefore does not contain:

- Auth identities or provider configuration;
- Storage objects;
- project secrets or environment variables;
- Netlify configuration;
- files outside PostgreSQL.

Those remain covered by Supabase platform facilities and separate project configuration. Never describe this logical dump as a complete Supabase-project clone.

## Preconditions

- Work from `~/Desktop/euro28predictor`.
- Branch must be `euro28-development`.
- The linked project must be `gcfdwobpnanjchcnvdco`.
- Docker Desktop must be running because Supabase CLI runs `pg_dump` in a container.
- The Supabase CLI session must be authenticated.
- If the CLI asks for the database password, enter it only in the local Terminal prompt. Never paste it into chat, documentation, source control or a command-line argument saved in shell history.

Backups default to:

```text
~/Euro28Backups/euro28-staging/
```

Set `EURO28_BACKUP_ROOT` or pass `--output-root` to use another private location. The script refuses to write inside the Git repository.

## Preview the backup plan

```bash
cd ~/Desktop/euro28predictor
npm run db:backup -- --plan --label pre-migration-015
```

The plan verifies the branch, linked project, Docker and CLI before showing the intended destination. It writes no dump files.

## Create a backup

```bash
cd ~/Desktop/euro28predictor
npm run db:backup -- --label pre-migration-015
```

Use a label tied to the operation, such as `pre-migration-015`, `before-admin-change` or `manual-checkpoint`.

A successful run ends with:

```text
Euro staging backup completed successfully.
Checksum verification: passed
```

Record the printed backup directory in the migration completion notes. Do not commit the backup directory.

## Verify an existing backup

```bash
cd ~/Desktop/euro28predictor
npm run db:backup:verify -- "$HOME/Euro28Backups/euro28-staging/<backup-directory>"
```

Verification checks the Euro staging source ref, required files, non-empty contents and SHA-256 checksums.

## Fixed migration sequence from now on

For every future hosted migration:

1. install the migration package;
2. run local checks;
3. run the local Supabase reset and database tests;
4. verify the linked Euro staging ref;
5. create and verify a fresh labelled backup;
6. dry-run the single remote migration;
7. push that migration only;
8. verify hosted storage and linked tests;
9. update completion docs;
10. commit, push and confirm a clean tree.

A backup from an earlier stage is not a substitute for a fresh pre-migration backup.

## Restore rehearsal policy

**Never restore directly over Euro staging as the first test.** Every restore procedure must first be rehearsed against a disposable destination project or an isolated local database.

A restore is an explicit operational action, not part of a normal migration. It requires:

- a named destination project;
- confirmation that the destination is not the WC26 project;
- explicit product-owner authorisation;
- a verified backup checksum;
- a written reason and recovery objective;
- post-restore row-count and application checks.

## Restore rehearsal to a disposable Supabase project

Use Supabase's current official backup/restore guidance at the time of the rehearsal. The outline below is intentionally destination-guarded and requires a connection string entered locally without saving it to the repository.

1. Create a disposable Supabase project.
2. Enable any non-default extensions used by Euro staging.
3. Copy the destination **session pooler** connection string from the Supabase Connect panel, or use the direct connection if the network supports IPv6.
4. Verify the backup:

```bash
cd ~/Desktop/euro28predictor
npm run db:backup:verify -- "/private/path/to/the/backup"
```

5. In Terminal, move to the backup directory and read the destination URL without echoing it:

```bash
cd "/private/path/to/the/backup"
read -s "DEST_DB_URL?Disposable destination database URL: "
echo
```

6. Before running any restore, inspect the destination project ref in `DEST_DB_URL`. Stop if it contains either the Euro staging ref or any WC26 reference.
7. Restore roles, schema and data in one transaction using `psql`:

```bash
psql \
  --no-psqlrc \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file roles.sql \
  --file schema.sql \
  --command 'SET session_replication_role = replica' \
  --file data.sql \
  --dbname "$DEST_DB_URL"
```

8. Restore migration history only after reviewing the destination's existing `supabase_migrations` state:

```bash
psql \
  --no-psqlrc \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file migration-history-schema.sql \
  --file migration-history-data.sql \
  --dbname "$DEST_DB_URL"
```

9. Clear the secret from the shell:

```bash
unset DEST_DB_URL
```

10. Compare critical table counts, run the Euro database tests against the disposable destination, and document any restore warnings.
11. Delete the disposable project after the rehearsal unless it has an explicitly approved ongoing purpose.

The PostgreSQL client used for restore must be compatible with the dump and target server. `pg_dump` cannot dump a server newer than its own major version, and plain-text restores should use `psql --no-psqlrc` to avoid local configuration interference.

## Actual recovery

An actual restore into Euro staging or a replacement production project is deliberately not automated here. Use the Stage 19 runbook, a freshly verified backup, current Supabase documentation and explicit product-owner approval. Manual results remain authoritative, and no restore should proceed without first preserving the current damaged state for investigation.
