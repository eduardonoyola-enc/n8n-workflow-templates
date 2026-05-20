# Production Error Handling Pattern for n8n

> A reusable error handling and observability pattern that makes the difference between an n8n workflow that demos well and one that survives production.

## Why This Exists

The biggest mistake I see in n8n workflows shared online: **no error handling**. Demo workflows assume everything succeeds. Production workflows assume everything will eventually fail.

This pattern wraps a "happy path" workflow with:
- Centralized error capture
- Payload sanitization (so secrets don't leak into error logs)
- Retry logic for transient failures
- Alerting to Slack/email without blocking the main flow
- Audit trail for post-mortem analysis

## The Pattern

```
Main Workflow
    │
    ▼
[Try: Main Logic]──success──▶ Continue
    │
    failure
    │
    ▼
[Error Sub-Workflow]
    │
    ├─▶ Sanitize error payload (strip tokens, PII)
    ├─▶ Classify error (transient vs permanent)
    ├─▶ If transient: schedule retry
    ├─▶ Log to error sheet/database
    ├─▶ Alert via Slack/email
    └─▶ Continue main flow (when applicable)
```

## What Goes Wrong in Production (Real Examples)

| Failure | Frequency | What I learned |
|---------|-----------|----------------|
| API rate limit (429) | Weekly | Always implement exponential backoff. Don't trust API docs about rate limits. |
| Webhook payload schema change | Monthly | Validate the shape of every incoming webhook. Schemas drift. |
| LLM timeout / 503 | Weekly | Don't depend on LLM availability for critical paths. Have a fallback. |
| Credentials expired | Rare but catastrophic | Monitor credential health proactively, not reactively. |
| Disk full on VPS | Rare | Set up disk monitoring. n8n logs eat disk space fast. |
| Memory limit hit on Code node | Monthly | Stream large datasets through nodes. Don't pull 10k rows into memory. |

## Files

- `error-handler.json` — Importable error-handling sub-workflow
- `sanitize-error-payload.js` — JS to strip secrets from error data before logging
- `slack-alert-template.json` — Slack message template with severity levels

## Severity Levels

- 🔴 **CRITICAL** — Customer-facing failure, data loss possible. Page immediately.
- 🟠 **HIGH** — Workflow is broken but no data loss. Alert during business hours.
- 🟡 **MEDIUM** — Degraded behavior. Log for review during normal cycle.
- 🟢 **LOW** — Recoverable, retry succeeded. Log only.

## What I Wish I Knew Earlier

1. **n8n's built-in error workflow setting is the most underused feature.** Set up a global error workflow once, all your workflows benefit.
2. **Log the input that caused the error, not just the error.** Without input, you can't reproduce.
3. **Strip everything that looks like a token before logging.** Use a regex pattern, never trust yourself to do it manually.
4. **Test your error handler.** It's the one code path you hope never runs, which means it's never tested when you need it.

---

*Pattern derived from running 2 production n8n workflows across multiple client environments.*
