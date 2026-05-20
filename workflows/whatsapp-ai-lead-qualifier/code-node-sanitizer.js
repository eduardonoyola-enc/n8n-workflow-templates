/**
 * n8n Code Node: Sanitizer & Hierarchy Builder
 *
 * Lives in the AI Agent → CRM dispatch path.
 * Takes raw AI response + conversation context, returns a clean CRM payload.
 *
 * Solves three real production problems:
 * 1. Unicode characters (especially FE0F variation selectors) breaking downstream APIs
 * 2. URLs being rewritten by CRM link trackers
 * 3. Inconsistent field naming causing silent CRM update failures
 *
 * Tested against: Kommo CRM, but pattern applies to HubSpot, Pipedrive, Zoho.
 */

// ============================================================================
// INPUTS — n8n exposes these from upstream nodes
// ============================================================================
const aiResponse = $input.first().json.output || '';
const webhookData = $('Webhook').first().json.body;
const conversationStage = $('AI Agent').first().json.detected_stage || 'NEW_LEAD';

// ============================================================================
// CONFIG — Real pipeline IDs MUST replace these placeholders before deploy
// ============================================================================
const STATUS_MAP = {
  NEW_LEAD:              parseInt(process.env.CRM_STATUS_NEW_LEAD),
  INTERESTED:            parseInt(process.env.CRM_STATUS_INTERESTED),
  CONTACT_COLLECTED:     parseInt(process.env.CRM_STATUS_CONTACT),
  LOCATION_VALIDATED:    parseInt(process.env.CRM_STATUS_LOCATION),
  DOCS_COMPLETE:         parseInt(process.env.CRM_STATUS_DOCS_COMPLETE),
  DOCS_PENDING:          parseInt(process.env.CRM_STATUS_DOCS_PENDING),
  WAITLIST:              parseInt(process.env.CRM_STATUS_WAITLIST),
  DISQUALIFIED:          parseInt(process.env.CRM_STATUS_DISQUALIFIED),
};

// Custom field IDs — case-sensitive, must match CRM schema exactly
const FIELD_MAP = {
  contactPhone:    parseInt(process.env.CRM_FIELD_PHONE),
  contactEmail:    parseInt(process.env.CRM_FIELD_EMAIL),
  serviceZone:     parseInt(process.env.CRM_FIELD_ZONE),
  documentation:   parseInt(process.env.CRM_FIELD_DOCS),
  conversationLog: parseInt(process.env.CRM_FIELD_CONV_LOG),
};

// ============================================================================
// SANITIZATION — Defensive cleanup before anything touches downstream APIs
// ============================================================================

/**
 * Strip Unicode variation selectors that break CRM text parsers.
 * The FE0F selector after certain emojis (✉️ ⭐ 🗺️) causes message truncation
 * in Kommo and several other CRMs.
 */
const stripUnicodeArtifacts = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\uFE0F/g, '')           // Variation Selector-16
    .replace(/[\u200B-\u200D]/g, '')  // Zero-width spaces
    .replace(/\uFEFF/g, '');          // BOM
};

/**
 * CRM link trackers rewrite https:// URLs and often break message length limits.
 * Using www. prefix bypasses most tracker patterns.
 */
const normalizeUrls = (text) => {
  if (!text) return '';
  return text.replace(/https?:\/\/(www\.)?/gi, 'www.');
};

/**
 * Normalize whitespace without destroying intentional line breaks.
 */
const normalizeWhitespace = (text) => {
  if (!text) return '';
  return text
    .replace(/[ \t]+/g, ' ')      // Collapse horizontal whitespace
    .replace(/\n{3,}/g, '\n\n')   // Max 2 consecutive newlines
    .trim();
};

const sanitize = (text) =>
  normalizeWhitespace(normalizeUrls(stripUnicodeArtifacts(text)));

// ============================================================================
// FIELD EXTRACTION — Pull structured data from the AI's free-form response
// ============================================================================

/**
 * The AI Agent emits structured data in JSON code blocks within its response.
 * This extracts the JSON without breaking on malformed output.
 */
const extractStructuredData = (text) => {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) return {};

  try {
    return JSON.parse(jsonMatch[1]);
  } catch (err) {
    // Don't throw — log and continue with empty extraction.
    // A bad JSON block should never stop the conversation flow.
    console.warn('Failed to parse AI structured output:', err.message);
    return {};
  }
};

const extracted = extractStructuredData(aiResponse);

// ============================================================================
// HIERARCHY BUILDER — Construct the CRM-shaped payload
// ============================================================================

const buildCrmPayload = () => {
  const customFields = [];

  // Only include fields where the AI actually extracted a value.
  // Sending null or empty string would overwrite existing data — never do this.
  if (extracted.phone) {
    customFields.push({
      field_id: FIELD_MAP.contactPhone,
      values: [{ value: sanitize(extracted.phone) }],
    });
  }

  if (extracted.email) {
    customFields.push({
      field_id: FIELD_MAP.contactEmail,
      values: [{ value: sanitize(extracted.email) }],
    });
  }

  if (extracted.zone) {
    customFields.push({
      field_id: FIELD_MAP.serviceZone,
      values: [{ value: sanitize(extracted.zone) }],
    });
  }

  if (extracted.documentation_status) {
    customFields.push({
      field_id: FIELD_MAP.documentation,
      values: [{ value: sanitize(extracted.documentation_status) }],
    });
  }

  // Always append the latest message to the conversation log.
  // Note: appending requires reading current value first — see workflow.json
  // for the merge logic at the dispatch node.
  customFields.push({
    field_id: FIELD_MAP.conversationLog,
    values: [{ value: sanitize(aiResponse) }],
  });

  return {
    id: webhookData.lead_id,
    status_id: STATUS_MAP[conversationStage],  // integer, NOT string
    custom_fields_values: customFields,
    updated_at: Math.floor(Date.now() / 1000),
  };
};

// ============================================================================
// VALIDATION — Fail fast on missing required IDs (silent failures are worse)
// ============================================================================

const validatePayload = (payload) => {
  const errors = [];

  if (!payload.id) errors.push('Missing lead_id from webhook');
  if (!payload.status_id || isNaN(payload.status_id)) {
    errors.push(`Invalid status_id for stage "${conversationStage}" — check STATUS_MAP env vars`);
  }
  if (payload.custom_fields_values.some(f => !f.field_id || isNaN(f.field_id))) {
    errors.push('One or more field_id values are missing or non-numeric — check FIELD_MAP env vars');
  }

  return errors;
};

// ============================================================================
// OUTPUT
// ============================================================================

const crmPayload = buildCrmPayload();
const validationErrors = validatePayload(crmPayload);

if (validationErrors.length > 0) {
  // Throw to trigger the workflow's error handler — better a loud failure
  // than a silent one that loses the lead.
  throw new Error(`Payload validation failed: ${validationErrors.join('; ')}`);
}

return [{
  json: {
    crm_payload: crmPayload,
    sanitized_response: sanitize(aiResponse),
    extracted_data: extracted,
    stage: conversationStage,
    debug: {
      original_response_length: aiResponse.length,
      sanitized_response_length: sanitize(aiResponse).length,
      fields_extracted: Object.keys(extracted),
    },
  },
}];
