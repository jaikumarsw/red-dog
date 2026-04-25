# Stripe Setup Guide

## Initial Setup

1. Create a Stripe account at https://dashboard.stripe.com
2. Switch to **TEST MODE** (toggle in dashboard top-right).
3. Go to **Developers → API keys**.
4. Copy your test secret key (starts with `sk_test_`) into `STRIPE_SECRET_KEY` in your `.env`.

## Create Products and Prices

In Stripe Dashboard → **Products → Add Product**:

### Product 1: "Red Dog Grant Intelligence — Basic"
- **Pricing**: $199.00 USD
- **Billing period**: Monthly
- **Recurring**
- Save the **Price ID** (starts with `price_`) into `STRIPE_PRICE_BASIC`.

### Product 2: "Red Dog Grant Intelligence — Premium"
- **Pricing**: $385.00 USD
- **Billing period**: Monthly
- **Recurring**
- Save the **Price ID** into `STRIPE_PRICE_PREMIUM`.

## Set Up Webhook

In Stripe Dashboard → **Developers → Webhooks → Add endpoint**:

1. **Endpoint URL**: `https://your-backend-domain.com/api/billing/webhook`
2. **Events to listen to**:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
3. Save the **webhook signing secret** (starts with `whsec_`) into `STRIPE_WEBHOOK_SECRET` in your `.env`.

## For Local Testing

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Run: `stripe listen --forward-to localhost:4000/api/billing/webhook`
3. The CLI will print a webhook signing secret — use that for `STRIPE_WEBHOOK_SECRET` locally.

## Going Live

When ready to accept real payments:
1. Switch Stripe dashboard to **LIVE mode**.
2. Re-create the same Products with the same prices.
3. Replace `.env` keys with live keys (`sk_live_`, `price_...`, `whsec_...`).
4. Update webhook endpoint to your production URL.
