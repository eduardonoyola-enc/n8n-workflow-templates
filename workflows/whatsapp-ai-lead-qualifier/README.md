# WhatsApp AI Lead Qualifier

> Production workflow for mass lead qualification via WhatsApp using an AI Agent, with multi-stage CRM pipeline progression and Google Sheets logging.

## The Problem

A B2B client needed to qualify hundreds of leads weekly through WhatsApp without scaling their human team. Manual qualification was creating an 8+ hour response delay, leads were going cold, and qualified candidates were lost in the noise.

Requirements:
- Inbound WhatsApp messages routed to an AI agent for natural conversation
- Pre-qualification across 5+ stages (interest, contact info, location, documentation)
- Status synchronization with the client's CRM in real time
- Audit trail in Google Sheets for compliance and analytics
- Production-grade error handling — failures should never silently drop a lead

## The Architecture

```
┌─────────────────┐
│  WhatsApp Inbox │  (Inbound message via webhook)
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│  Webhook Trigger    │  ← Entry point with element-ID memory anchor
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Load System Prompt │  ← From Google Doc (versioned, editable)
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  AI Agent (LLM)     │  ← OpenAI GPT-4o or Anthropic Claude
│  + Simple Memory    │      Memory key: webhook element ID (prevents
│                     │      contamination across parallel conversations)
└────────┬────────────┘
         │
         ▼
┌─────────────────────────┐
│  JS Code Node           │  ← Sanitize Unicode, build CRM payload,
│  (Sanitization &        │     determine pipeline stage from response
│   Hierarchy Builder)    │
└────────┬────────────────┘
         │
         ├─────────────────────┐
         ▼                     ▼
┌─────────────────┐   ┌──────────────────┐
│   CRM API       │   │  Google Sheets   │
│   (Status +     │   │  (Audit log)     │
│   Custom fields)│   │                  │
└─────────────────┘   └──────────────────┘
```

## Pipeline Stages

The CRM pipeline progresses through these stages:

1. **New Lead** — Initial WhatsApp message received
2. **Interested** — Confirmed interest in offering
3. **Contact Info Collected** — Phone, email captured
4. **Location Validated** — Within service zone
5. **Documentation Complete** — All required docs received
6. **Qualified / Disqualified** — Routed to human or to waitlist

Each stage transition requires specific data — the AI Agent's job is to extract that data conversationally, not interrogate the lead.

## Key Lessons Learned (a.k.a. Things That Bit Me)

### 1. Memory contamination across parallel conversations

**The bug:** Two leads texting at the same time would occasionally receive responses meant for each other.

**The cause:** n8n's Simple Memory was using a default session key, so parallel webhook executions shared context.

**The fix:** Anchor the memory key to the webhook's element ID per execution. Each conversation gets its own isolated memory.

```javascript
// In Simple Memory node config:
sessionId: $('Webhook').first().json.body.contact_id
// or in self-hosted setups:
sessionId: $execution.id + "-" + $('Webhook').first().json.body.from
```

### 2. Unicode breaks downstream APIs

**The bug:** Messages with certain emojis (✉️ ⭐ 🗺️ ☀️ ✏️) were truncated when sent to the CRM.

**The cause:** Unicode Variation Selector FE0F (`\uFE0F`) was interpreted as a control character by the CRM's text parser, cutting off everything after it.

**The fix:** Strip `\uFE0F` in the sanitization JS node before dispatching to the CRM.

```javascript
const sanitize = (text) =>
  text.replace(/\uFE0F/g, '')
      .replace(/[\u200B-\u200D]/g, ''); // Zero-width spaces too
```

### 3. URLs get rewritten silently

**The bug:** `https://` links in CRM messages were being replaced with shortened URLs that broke message length limits.

**The cause:** The CRM was running its own link tracking, replacing every `https://` with a tracker URL.

**The fix:** Use `www.` prefix instead of `https://` for links sent through the CRM dispatch layer.

### 4. Hardcoded placeholder IDs are silent failures

**The bug:** Status updates appeared to succeed but the CRM never moved leads forward.

**The cause:** The `statusMap` object had placeholder IDs like `"INTERESTED": "12345"` that were never replaced with real pipeline IDs.

**The fix:** Document a `statusMap.real.json` checklist that must pass before deployment. Treat ID hardcoding as security-critical.

### 5. Case-sensitive field mismatches

CRM custom fields are case-sensitive — `contactPhone` is not `ContactPhone`. The JS hierarchy builder normalizes all field names before dispatch.

## Files

- [`workflow.json`](./workflow.json) — Importable n8n workflow (sanitized)
- [`system-prompt-template.md`](./system-prompt-template.md) — Master AI Agent prompt template
- [`code-node-sanitizer.js`](./code-node-sanitizer.js) — JavaScript sanitization & hierarchy builder
- [`pipeline-stages.json`](./pipeline-stages.json) — Example pipeline configuration

## Setup

1. Import `workflow.json` into your n8n instance
2. Create credentials for: WhatsApp Business API, your CRM, Google Sheets, your LLM provider
3. Replace `<YOUR_PIPELINE_ID>` placeholders in `pipeline-stages.json` with your actual CRM IDs
4. Update the system prompt in the Google Doc referenced by node "Load System Prompt"
5. Test with one phone number against a staging CRM before going live

## What I'd Do Differently Next Time

- Use **a vector store for conversation history** instead of Simple Memory when conversations span days
- Move the sanitization logic to a **shared sub-workflow** so it can be reused across multiple chatbots
- Add **OpenTelemetry tracing** to track conversation latency end-to-end
- Implement **idempotency keys** on CRM writes to prevent duplicate records on retries

---

*This workflow has been running in production since 2025, processing hundreds of leads per week with <2% manual intervention needed.*
