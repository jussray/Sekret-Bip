export type FamilyVisitEvidenceClass = 'OBSERVED' | 'INFERRED' | 'UNKNOWN' | 'HUMAN_REVIEW';
export type FamilyVisitProfessionalDisposition = 'supportive' | 'mixed' | 'needs_human_review' | 'insufficient_evidence';

export interface FamilyVisitEvidenceItem {
  classification: FamilyVisitEvidenceClass;
  text: string;
}

export interface ParentFamilyVisitSummary {
  childExperience: FamilyVisitEvidenceItem[];
  connectionMoments: FamilyVisitEvidenceItem[];
  nextTime: string[];
  uncertainty: string;
  limitations: string;
}

export interface ProfessionalFamilyVisitSummary {
  interactionPatterns: FamilyVisitEvidenceItem[];
  childCenteredSignals: FamilyVisitEvidenceItem[];
  humanReview: FamilyVisitEvidenceItem[];
  disposition: FamilyVisitProfessionalDisposition;
  uncertainty: string;
  limitations: string;
}

export interface FamilyVisitGeneratedSummaries {
  parent: ParentFamilyVisitSummary;
  professional: ProfessionalFamilyVisitSummary;
}

const EVIDENCE_CLASSES = new Set<FamilyVisitEvidenceClass>(['OBSERVED', 'INFERRED', 'UNKNOWN', 'HUMAN_REVIEW']);
const DISPOSITIONS = new Set<FamilyVisitProfessionalDisposition>(['supportive', 'mixed', 'needs_human_review', 'insufficient_evidence']);

// These terms would turn a reflective support summary into a clinical/legal
// conclusion or a hidden adjudication tool. Human professionals may make lawful
// decisions outside Se'kret; the model may not make those decisions for them.
const FORBIDDEN_CONCLUSION_PATTERNS = [
  /\bdiagnos(?:e|ed|es|is|tic)\b/i,
  /\bdisorder\b/i,
  /\bsymptom(?:s)?\b/i,
  /\bcustody\b/i,
  /\bterminate(?:d|s|ing)? parental rights\b/i,
  /\bremove (?:the )?child\b/i,
  /\bcourt should\b/i,
  /\bvisitation should\b/i,
  /\bunfit parent\b/i,
  /\bunsafe parent\b/i,
  /\bdangerous parent\b/i,
  /\babuse(?:d|r|s|ive)?\b/i,
  /\bneglect(?:ed|ful|s)?\b/i,
];

// The summary may discuss what an experience *might* have felt like, or what a
// participant reported through a structured reflection. It may not claim direct
// access to the child's internal state.
const DEFINITIVE_MIND_READING = [
  /\b(?:the|your) child felt\b/i,
  /\b(?:the|your) child feels\b/i,
  /\b(?:the|your) child wanted\b/i,
  /\b(?:the|your) child wants\b/i,
  /\b(?:the|your) child was afraid\b/i,
  /\b(?:the|your) child is afraid\b/i,
];

const PARENT_FORBIDDEN_AUDIENCE_TERMS = [
  /\bcys\b/i,
  /\bcaseworker\b/i,
  /\bcourt worker\b/i,
  /\bprofessional review signal\b/i,
  /\breview_signal\b/i,
  /\bprofessional disposition\b/i,
];

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isSafeText(value: unknown, maxLength: number): value is string {
  if (typeof value !== 'string') return false;
  const text = value.trim();
  if (!text || text.length > maxLength) return false;
  if (/[“”"]/u.test(text)) return false; // no invented dialogue or transcript-like quoting
  if (FORBIDDEN_CONCLUSION_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (DEFINITIVE_MIND_READING.some((pattern) => pattern.test(text))) return false;
  return true;
}

function isEvidenceItem(value: unknown): value is FamilyVisitEvidenceItem {
  if (!isPlainRecord(value)) return false;
  if (!EVIDENCE_CLASSES.has(value.classification as FamilyVisitEvidenceClass)) return false;
  return isSafeText(value.text, 220);
}

function isEvidenceArray(value: unknown, maxItems = 4): value is FamilyVisitEvidenceItem[] {
  return Array.isArray(value) && value.length <= maxItems && value.every(isEvidenceItem);
}

function isShortStringArray(value: unknown, maxItems = 4): value is string[] {
  return Array.isArray(value)
    && value.length <= maxItems
    && value.every((item) => isSafeText(item, 180));
}

function objectHasOnlyKeys(record: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(record).every((key) => keys.includes(key)) && keys.every((key) => key in record);
}

export function isParentFamilyVisitSummary(value: unknown): value is ParentFamilyVisitSummary {
  if (!isPlainRecord(value)) return false;
  if (!objectHasOnlyKeys(value, ['childExperience', 'connectionMoments', 'nextTime', 'uncertainty', 'limitations'])) return false;
  if (!isEvidenceArray(value.childExperience)) return false;
  if (!isEvidenceArray(value.connectionMoments)) return false;
  if (!isShortStringArray(value.nextTime, 3)) return false;
  if (!isSafeText(value.uncertainty, 260) || !isSafeText(value.limitations, 360)) return false;

  const serialized = JSON.stringify(value);
  if (PARENT_FORBIDDEN_AUDIENCE_TERMS.some((pattern) => pattern.test(serialized))) return false;
  return true;
}

export function isProfessionalFamilyVisitSummary(value: unknown): value is ProfessionalFamilyVisitSummary {
  if (!isPlainRecord(value)) return false;
  if (!objectHasOnlyKeys(value, ['interactionPatterns', 'childCenteredSignals', 'humanReview', 'disposition', 'uncertainty', 'limitations'])) return false;
  if (!isEvidenceArray(value.interactionPatterns)) return false;
  if (!isEvidenceArray(value.childCenteredSignals)) return false;
  if (!isEvidenceArray(value.humanReview)) return false;
  if (!DISPOSITIONS.has(value.disposition as FamilyVisitProfessionalDisposition)) return false;
  if (!isSafeText(value.uncertainty, 260) || !isSafeText(value.limitations, 360)) return false;
  if ((value.humanReview as FamilyVisitEvidenceItem[]).some((item) => item.classification !== 'HUMAN_REVIEW')) return false;
  return true;
}

export function isFamilyVisitGeneratedSummaries(value: unknown): value is FamilyVisitGeneratedSummaries {
  if (!isPlainRecord(value)) return false;
  if (!objectHasOnlyKeys(value, ['parent', 'professional'])) return false;
  return isParentFamilyVisitSummary(value.parent) && isProfessionalFamilyVisitSummary(value.professional);
}

export function familyVisitSummariesPassSafety(value: FamilyVisitGeneratedSummaries): boolean {
  // Shape validation already catches the forbidden content rules. This explicit
  // entry point keeps generation code readable and gives tests a stable safety
  // contract to attack independently from JSON parsing.
  return isFamilyVisitGeneratedSummaries(value);
}

export const FAMILY_VISIT_JSON_SCHEMA = {
  name: 'bridge_family_visit_summaries',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['parent', 'professional'],
    properties: {
      parent: {
        type: 'object',
        additionalProperties: false,
        required: ['childExperience', 'connectionMoments', 'nextTime', 'uncertainty', 'limitations'],
        properties: {
          childExperience: evidenceArraySchema(4),
          connectionMoments: evidenceArraySchema(4),
          nextTime: { type: 'array', maxItems: 3, items: { type: 'string', maxLength: 180 } },
          uncertainty: { type: 'string', maxLength: 260 },
          limitations: { type: 'string', maxLength: 360 },
        },
      },
      professional: {
        type: 'object',
        additionalProperties: false,
        required: ['interactionPatterns', 'childCenteredSignals', 'humanReview', 'disposition', 'uncertainty', 'limitations'],
        properties: {
          interactionPatterns: evidenceArraySchema(4),
          childCenteredSignals: evidenceArraySchema(4),
          humanReview: evidenceArraySchema(4, ['HUMAN_REVIEW']),
          disposition: { type: 'string', enum: ['supportive', 'mixed', 'needs_human_review', 'insufficient_evidence'] },
          uncertainty: { type: 'string', maxLength: 260 },
          limitations: { type: 'string', maxLength: 360 },
        },
      },
    },
  },
} as const;

function evidenceArraySchema(maxItems: number, classifications: FamilyVisitEvidenceClass[] = ['OBSERVED', 'INFERRED', 'UNKNOWN', 'HUMAN_REVIEW']) {
  return {
    type: 'array',
    maxItems,
    items: {
      type: 'object',
      additionalProperties: false,
      required: ['classification', 'text'],
      properties: {
        classification: { type: 'string', enum: classifications },
        text: { type: 'string', maxLength: 220 },
      },
    },
  } as const;
}
