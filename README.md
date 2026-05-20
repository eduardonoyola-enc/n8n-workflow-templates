# n8n-workflow-templates
Production-tested n8n workflow patterns
# n8n Workflow Templates

> Production-tested n8n workflow patterns for AI chatbots, CRM integrations, and business automation. All workflows have been deployed in real client environments — sanitized and anonymized for sharing.

[![n8n](https://img.shields.io/badge/n8n-self--hosted-EA4B71?style=flat&logo=n8n)](https://n8n.io)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Production](https://img.shields.io/badge/status-production--tested-success)](#)

## About

This repository contains battle-tested n8n workflow patterns I've built while developing automation solutions for clients across food service, retail, healthcare, and private security industries. Each workflow has been deployed in production and refined through real-world edge cases.

These are not toy examples — they include error handling, data sanitization, contextual memory management, and the kind of defensive programming that separates a demo from a production system.

## Workflows

### 🤖 [WhatsApp AI Lead Qualifier](./workflows/whatsapp-ai-lead-qualifier)
Mass-recruitment chatbot that pre-qualifies candidates via WhatsApp using an AI Agent (LLM), integrated with a CRM and Google Sheets. Handles multi-stage pipeline progression with status tracking.

**Stack:** n8n · WhatsApp Business API · OpenAI/Claude · Kommo CRM · Google Sheets API

### 📅 [Appointment Booking AI Assistant](./workflows/appointment-booking-assistant)
Conversational AI that handles patient/customer inquiries and books appointments end-to-end via WhatsApp. Manages conversation context, availability checks, and confirmation flows.

**Stack:** n8n · WhatsApp Business API · OpenAI/Claude · Google Calendar API

### 📊 [Inventory & Sales Sync](./workflows/inventory-sales-sync)
Bidirectional sync between point-of-sale data and Google Sheets for boutique retail operations. Handles stock updates, sales reporting, and low-inventory alerts.

**Stack:** n8n · Google Sheets API · Webhooks

### 🛡️ [Production Error Handling Pattern](./workflows/error-handling-pattern)
Reusable error handling and retry pattern for n8n workflows. Captures failures, sanitizes payloads for logging, and routes to alerting channels without breaking the main flow.

**Stack:** n8n · Slack/Email · Code Node (JavaScript)

## Why This Repository Exists

I've spent the last year building n8n workflows that run businesses — not demos that run on stage. The patterns here represent solutions to real problems:

- **Unicode sanitization** because emojis with Variation Selector FE0F break Kommo's URL processing
- **Memory anchoring** to webhook element IDs because Simple Memory contamination across parallel runs causes crossed-conversation bugs
- **Status maps with real IDs** because hardcoded placeholder IDs are silent failures waiting to happen
- **JavaScript hierarchy builders** because n8n's Set node can't always express the data structure your downstream API needs

If any of this sounds familiar, you'll find this repo useful.

## How to Use

1. Pick a workflow folder
2. Read the README — it explains the problem, architecture, and gotchas
3. Import the `workflow.json` into your n8n instance
4. Replace credential references with your own
5. Test against a non-production environment first

## Contributing

Found a bug? Have an improvement? Open an issue or PR. I'd rather have someone tell me my code is wrong than ship broken automations to a client.

## About Me

I'm Eduardo Noyola, founder of [ENC System Apps](https://encsystemapps.com) (link coming soon). I build AI-powered automations and custom business systems for SMBs.

- 💼 [LinkedIn](https://www.linkedin.com/in/eduardo-noyola-contreras-1b629a151/)
- 📧 eduardo.noyola@encsystemapps.com

---

*All workflows are sanitized of client data. Real implementations include additional security, compliance, and observability layers not shown here.*
