# Appointment Booking AI Assistant

> AI conversational assistant that handles inquiries and books appointments end-to-end via WhatsApp. Built originally for a dental clinic; the pattern works for any service business with calendar-based scheduling.

## The Problem

Service businesses lose appointments because:
- Inquiries arrive after hours when no one is available to book
- Phone tag between staff and customers creates 24-48 hour booking delays
- Manual calendar entry leads to double-bookings
- Customers want WhatsApp, but the business is stuck on phone calls

## The Solution

An AI agent that:
- Answers common questions about services, pricing, and policies
- Checks real-time availability against the business calendar
- Books appointments directly with confirmation messages
- Handles cancellations and rescheduling
- Escalates anything outside its scope to a human

## Architecture

```
WhatsApp → Webhook → AI Agent (with tools) → Calendar API
                          │
                          ├─ Tool: check_availability
                          ├─ Tool: book_appointment
                          ├─ Tool: cancel_appointment
                          └─ Tool: get_service_info
                          
        → CRM (patient record update)
        → Confirmation message back to WhatsApp
```

## Key Design Decisions

### Tool-based agent over pure prompt

The AI doesn't try to figure out scheduling from a calendar dump — it calls explicit tools (`check_availability`, `book_appointment`) that return structured data. This is more reliable than asking the LLM to parse calendar entries.

### Two-stage confirmation

Before any booking is committed, the agent reads back the appointment details and explicitly asks for confirmation. This catches 90%+ of misunderstandings before they become double-bookings.

### Idempotency on booking writes

The calendar write uses a deterministic idempotency key (`patient_id + timeslot`) to prevent duplicate bookings if the workflow retries due to network issues.

## Files

- `workflow.json` — Importable n8n workflow
- `system-prompt.md` — Agent instructions and tool definitions
- `tool-definitions.json` — Schemas for the agent's available tools

---

*In production, this pattern handles dozens of bookings daily with <1% manual intervention.*
