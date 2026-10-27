export type PromptOsCategory = 'personas' | 'system' | 'redteam' | 'engineering' | 'release';
export type PromptOsPlatform = 'chatgpt' | 'claude' | 'codex' | 'perplexity';

export interface PromptOsEntry {
  id: string;
  title: string;
  description: string;
  category: PromptOsCategory;
  platforms: PromptOsPlatform[];
  tags: string[];
  prompt: string;
}

export const PROMPT_OS_SCOPE = "Se'kret Bip only";

export const PROMPT_OS_ENTRIES: PromptOsEntry[] = [
  { id: 'repo-audit-first', title: 'Repo Audit First', description: 'Read the actual repository state before editing.', category: 'engineering', platforms: ['chatgpt', 'claude', 'codex'], tags: ['audit', 'repo', 'typescript'], prompt: `Audit the Jussray/Bip repository before making changes. Restate the current implementation, identify drift, name the smallest safe patch, and do not edit until the evidence supports the plan.` },
  { id: 'debug-without-thrashing', title: 'Debug Without Thrashing', description: 'Root-cause analysis before shotgun fixes.', category: 'engineering', platforms: ['chatgpt', 'claude', 'codex'], tags: ['debug', 'root-cause'], prompt: `Debug this Se'kret Bip issue from evidence. Rank likely causes, identify the next discriminating check, and avoid unrelated edits or broad refactors.` },
  { id: 'pr-reviewer', title: 'PR Reviewer', description: 'Production-grade review for Bip changes.', category: 'engineering', platforms: ['chatgpt', 'claude', 'codex'], tags: ['review', 'regression', 'security'], prompt: `Review this Jussray/Bip pull request for correctness, regression risk, type safety, Expo compatibility, Supabase and Worker safety, privacy, and teen-safety impact.` },
  { id: 'break-bip-architecture', title: 'Break Bip Architecture', description: 'Adversarial systems review of Se\'kret Bip.', category: 'redteam', platforms: ['chatgpt', 'claude'], tags: ['redteam', 'architecture', 'safety'], prompt: `Red-team this Se'kret Bip architecture. Attack auth, privacy, RLS, parent-teen trust boundaries, AI prompt drift, moderation, observability, release rollback, and operational failure modes.` },
  { id: 'companion-voice-review', title: 'Companion Voice Review', description: 'Check whether a reply sounds like its assigned companion.', category: 'personas', platforms: ['chatgpt', 'claude'], tags: ['voice', 'persona', 'quality'], prompt: `Review this Se'kret Bip companion response for voice authenticity, generic AI language, therapy-script phrasing, safety, and fit with the assigned character. Return concrete rewrite guidance.` },
  { id: 'session-handoff', title: 'Bip Session Handoff', description: 'Preserve decisions and unfinished work across AI sessions.', category: 'system', platforms: ['chatgpt', 'claude', 'codex', 'perplexity'], tags: ['handoff', 'context'], prompt: `Create a Se'kret Bip session handoff with verified repository state, decisions made, work completed, work still open, blockers, affected files, and the next three actions.` },
  { id: 'release-readiness', title: 'Release Readiness', description: 'Check the full Bip release path before shipping.', category: 'release', platforms: ['chatgpt', 'claude', 'codex'], tags: ['release', 'verification', 'rollback'], prompt: `Assess Se'kret Bip release readiness. Verify onboarding, teen and parent flows, AI responses, memory, safety, RLS, storage, Expo build, Cloudflare deployment, monitoring, and rollback readiness.` },
];
