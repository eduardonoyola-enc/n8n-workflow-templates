# Inventory & Sales Sync

> Bidirectional sync between point-of-sale data and Google Sheets for retail operations. Originally built for boutique retailers; the pattern works for any operation needing real-time inventory visibility.

## The Problem

Small retailers often have inventory data scattered across:
- A POS system that's hard for staff to query
- Manual spreadsheets the owner maintains
- WhatsApp updates between staff at different locations

Result: stockouts, double-sells, and an owner who can't trust any single source.

## The Solution

A scheduled n8n workflow that:
- Pulls latest sales/inventory data from the POS API every 15 minutes
- Normalizes the data structure
- Updates a shared Google Sheet with the latest stock levels
- Flags low-inventory items with conditional formatting
- Sends WhatsApp alerts when critical items hit reorder thresholds

## Architecture

```
[Schedule Trigger every 15 min]
        │
        ▼
[Fetch POS data via REST API]
        │
        ▼
[Normalize & dedupe in Code node]
        │
        ▼
[Diff against current sheet state]
        │
        ▼
[Batch update Google Sheets]
        │
        ▼
[Filter low-stock items]
        │
        ▼
[Send WhatsApp alerts (if any)]
```

## Why Batch Updates Matter

Google Sheets API rate-limits per-row writes. For a catalog of 500+ SKUs, naive per-row updates will exhaust your quota in minutes. This workflow:

1. Reads the current sheet state once
2. Diffs against the new POS data
3. Sends a single batch update with only the changed rows

This drops API calls from 500+ per cycle to 1-3.

## Files

- `workflow.json` — Importable workflow
- `normalization.js` — Code node logic for data normalization

---

*Real implementation includes additional reporting layers (daily summaries, slow-moving inventory alerts, top-seller analytics) not shown here.*
