# Cloudflare D1 setup

DCB Expansion Radar uses one D1 database bound to the existing Worker as `RADAR_DB`.

## Database

Recommended name:

```text
dcb-expansion-radar
```

Recommended location hint for the current deployment:

```text
weur
```

Create it with Wrangler:

```bash
npx wrangler d1 create dcb-expansion-radar --location=weur
```

Cloudflare returns a database UUID. Add it to `wrangler.jsonc`:

```jsonc
{
  "d1_databases": [
    {
      "binding": "RADAR_DB",
      "database_name": "dcb-expansion-radar",
      "database_id": "<DATABASE_UUID>",
      "migrations_dir": "migrations"
    }
  ]
}
```

Do not invent or commit a placeholder UUID into the production Wrangler config. Add the real ID only after the database exists.

## Apply migrations

After the binding has the real database ID:

```bash
npx wrangler d1 migrations apply dcb-expansion-radar --remote
```

Current migrations:

```text
0001_workspace.sql
0002_source_watch.sql
```

## Verify

```bash
npx wrangler d1 execute dcb-expansion-radar --remote --command "SELECT key, value FROM app_meta;"
```

Expected schema version after both migrations:

```text
schema_version = 2
```

## Cloudflare Access

D1 workspace writes use the authenticated identity provided by Cloudflare Access.

Once D1 is connected, protect the Worker/application with Cloudflare Access. The Worker uses the authenticated Access identity available through the Workers runtime and never trusts a browser-supplied user ID.

Until Access is enabled:
- the public intelligence UI still works;
- D1 workspace reads/writes return `access_required`;
- persistent manual Source Watch checks are blocked;
- future Cron Source Watch checks can still run server-side.

## Cron

The Worker already contains a `scheduled()` handler. Do not enable the Cron trigger until the D1 database exists and migrations have been applied.

Recommended initial schedule:

```text
0 6,18 * * *
```

This checks monitored sources twice per day, at 06:00 and 18:00 UTC, using the same Worker.
