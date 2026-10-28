// src/bipJr/safetyContract.ts
// Recovered from jussray/bip-jr@cf773ff14c677b706e600437de6c779c3e9c37f2:src/child/config/safetyContract.ts (blob 8d7cfa85).
// The Bip Jr child-product contract. Flipping any flag needs founder, legal, and child-welfare review.

export const CHILD_SAFETY_CONTRACT = Object.freeze({
  productName: 'Se’kret Bip Jr',
  ageRange: '5-12',
  adultCreatedAccountsOnly: true,
  childMayCreateAccount: false,
  publicProfiles: false,
  publicFeed: false,
  userSearch: false,
  unrestrictedDirectMessages: false,
  locationSharing: false,
  targetedAdvertising: false,
  sellChildData: false,
  rawChildEmailRequired: false,
  exactBirthdateRequired: false,
  companionMustDiscloseAI: true,
  companionMayPromiseSecrecy: false,
  companionMayEncourageExclusivity: false,
  familyContactRequiresAuthority: true,
  outgoingBridgeRequiresAdultReview: true,
  incomingBridgeRequiresAdultReview: true,
  safetyEventsAreMinimalAndAudited: true,
  circleExistsInChildProduct: false,
  studyBuddyHasNoHumanPeersInV1: true,
  studyBuddyUsesScriptedCurriculumInPrototype: true,
  productionAiCallsEnabled: false,
  studyProgressIsLocalAndMinimal: true,
  adultAssignedStudyMissions: false,
  childToChildFreeText: false,
  childToChildVoice: false,
  childToChildVideo: false,
  classmateDiscovery: false,
  classroomModeRequiresSchoolAgreement: true,
  classroomModeIsActivityOnly: true,
  schoolDataExportEnabledByDefault: false,
});

export type SafetyContract = typeof CHILD_SAFETY_CONTRACT;
