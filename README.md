# D-ProKleanMate

## Local MySQL setup (XAMPP)

1. Start MySQL from the XAMPP Control Panel. Apache is not required for the Next.js app.
2. Open phpMyAdmin and import `mysql/schema.sql`. The script creates the `dprokleanmate` database and its tables.
3. Copy `.env.example` to `.env.local`, then set the database credentials and a private `AUTH_SECRET` of at least 32 characters. Set `APP_URL` to the app's public URL.
4. Start the app with `npm run dev` and open `http://localhost:3000`.

Payment slips are stored privately under `storage/payment-slips` and served through an authenticated API route. Back up this directory with the database. This local-disk storage is intended for a server with persistent disk, not ephemeral hosting such as a default Vercel deployment.

## Email and password reset

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` in `.env.local` to enable password reset emails. Without these settings, the reset endpoint reports that SMTP is not configured.

## Admin access

After registering an account, grant it admin access in phpMyAdmin or the MySQL client:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Existing Supabase data

The application no longer connects to Supabase. `supabase/schema.sql` is the old PostgreSQL schema and is not used by the app. This change does not copy existing users, bookings, or payment slips; migrate those separately before switching a live deployment.