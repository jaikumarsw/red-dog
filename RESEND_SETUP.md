# Resend Domain Setup (for production)

## Why this is needed
`onboarding@resend.dev` only reliably delivers to the Resend account owner's / verified recipient emails.  
To send to **any** email address in production, you must verify a domain in Resend and use a `RESEND_FROM` address on that domain.

## Steps to add your domain

1. Log in to Resend.
2. Go to **Domains**.
3. Click **Add Domain**.
4. Enter your domain (e.g. `reddog.com` or `mail.reddog.com`).
5. Resend will show DNS records to add (commonly):
   - TXT record (SPF)
   - CNAME record (DKIM)
   - MX record (optional)
6. Add those records in your DNS provider (GoDaddy/Namecheap/Cloudflare/etc.).
7. Click **Verify** in the Resend dashboard.
8. After verification, update backend `.env`:

```
RESEND_FROM=noreply@yourdomain.com
```

## For testing without a domain
In **development**, Red Dog redirects *all outbound emails* to `ADMIN_EMAIL` and prefixes the subject with the original recipient:

- Example subject: `[DEV → newuser@example.com] Verify your Red Dog account`

This lets you test all email flows before domain setup is complete.

