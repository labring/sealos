# Acquisition billing fact publisher

Implements the trusted billing producer required by labring/sealox#584. Existing payment handlers and financial writes are unchanged.

## Contract and ownership

The global `Payment` table is the authoritative committed settlement fact. `PaymentOrder` and browser return pages are not proof of payment. The optional publisher captures `PAID`, positive-value payments with a real account UUID and a supported payment method. Legacy domestic records have an empty payment type; these are recognized as top-ups. `SUBSCRIPTION` records map to `subscribe_success`. Balance payments are accepted only as subscription consumption; gifts, admin/referral subscription grants, manual corporate adjustments without an externally verified online payment, free plans, failed/pending payments and unsupported methods do not generate successful revenue events.

Payment amount excludes the gift field and converts existing microcurrency units to major currency units (`amount / 1_000_000`). A subscription and the earlier account top-up are distinct conversion actions, not additive revenue to be summed indiscriminately. The verified payer is `subject_id` / `paying_account_id`; Workspace is taken from the persisted workspace subscription relation, never guessed from any member's browser.

```text
committed Payment → source ledger / durable delivery row → central collector
                                      ↑ retry same event_id + transaction_id
```

A persistent activation record seeds only the IDs already committed in PAID state when this integration starts, marking them historical and not scheduled. Existing PENDING rows are not seeded; their later PAID transition is a new eligible fact. No historical payment events are sent. Newly committed rows remain discoverable even when their original order creation timestamp precedes activation; this matters for domestic controller settlements. Initial seeding is a one-time indexed INSERT SELECT per realm/region and requires sizing before enabling on a large existing ledger. Capture uses bounded batches and a region-scoped indexed anti-join, with no timestamp cursor that could lose late commits. The source ledger grows with observed payments and should be included in capacity planning. Do not delete historical/ignored/delivered ledger rows while their Payment rows still exist: removing the source marker makes an old payment discoverable again. Financial-row and source-ledger retention must be coordinated.

`occurred_at` is the first observation time of the committed payment. The old `Payment.created_at` can be the order creation time, so it must not be advertised as the settlement time. This observation time and the serialized event stay immutable across retries. The stable event ID hashes realm, event name and the real order/trade ID. Multiple replicas share source and delivery locks; the receiver must durably deduplicate IDs because an acknowledgement can be lost after acceptance.

The capture/delivery worker runs once per minute, bounded to 100 captured records and five delivery attempts per sweep. Delivery uses three-second HTTP timeouts, no redirects, exponential backoff up to one hour, and ten automatic attempts. Exhausted or ignored rows remain queryable; an operator must inspect and explicitly reset delivery state to replay. No background request runs within a payment transaction. Failures log only a category and never payloads, raw tokens or the configured URL.

## Configuration

The feature is disabled when URL and secret are both absent. Configure together:

- `ACQUISITION_ANALYTICS_URL`: exact HTTPS collector URL ending `/api/analytics/lifecycle`.
- `ACQUISITION_INGEST_SECRET`: server-only shared secret, sourced from an existing Kubernetes Secret.
- `ACQUISITION_REALM`: `china` or `global`, fixed by deployment, never by the caller.
- Existing `PAYMENT_CURRENCY`: major currency code; existing service default is USD.

Helm exposes `acquisitionAnalytics.url`, `.realm` and `.existingSecret`. The configured Secret key is `ACQUISITION_INGEST_SECRET`. Never put its value in Git or the native App. Partial/invalid runtime configuration is observable and disables this optional integration without breaking payment APIs. The central collector checks acquisition and consent before analytics emission; an accepted HTTP response means the fact is durable, not that Google or an advertising platform matched the conversion.

Local tests use a temporary PostgreSQL container and a loopback HTTP receiver. Run `go test -race ./acquisition` from `service/account`; it also verifies two replicas sharing delivery row locks. Run `go test -timeout 60s ./api ./router ./helper` for the neighboring API packages. No test calls real payment systems or Google. The production database is Cockroach-compatible PostgreSQL; run database compatibility and real end-to-end acceptance before rollout.
