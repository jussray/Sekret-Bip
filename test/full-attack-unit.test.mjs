import test from 'node:test';import assert from 'node:assert/strict';import{ATTACK_UNIT_MEMBERS,runFullAttackUnit}from'../security/full-attack-unit.mjs';
function observation(overrides={}){return{verdict:'HALLWAY',technicalIdentity:{actorFingerprint:'fp',claimedCrawler:'googlebot',verifiedBot:false},receipt:'a'.repeat(64),hallway:{active:true,logicalExpansion:48123,lazyMaterialization:true,productionExposure:0,realCustomerData:false,realCredentials:false,crossSessionSharing:false},boundaries:{ownedOrAuthorizedSurfacesOnly:true,externalCompromise:false,externalExploit:false,outboundRetaliation:false},...overrides}}
test('every member executes and suspicious traffic resolves to containment',()=>{const unit=runFullAttackUnit(observation());assert.equal(unit.mode,'executed');assert.equal(unit.allMembersAccountedFor,true);assert.equal(unit.expectedCount,ATTACK_UNIT_MEMBERS.length);assert.equal(unit.executedCount,ATTACK_UNIT_MEMBERS.length);assert.ok(unit.results.every(x=>x.executed===true));assert.equal(unit.unitVerdict,'CONTAIN_ONLY');assert.equal(unit.results.find(x=>x.flow==='truthmode')?.status,'CLAIMED');assert.equal(unit.results.find(x=>x.flow==='attack-3000')?.status,'CHALLENGE')});
test('production isolation tamper forces fail-closed cascade',()=>{const unit=runFullAttackUnit(observation({hallway:{...observation().hallway,productionExposure:1}}));assert.equal(unit.unitVerdict,'REPAIR_REQUIRED');assert.equal(unit.results.find(x=>x.flow==='attack-48000')?.status,'BLOCK');assert.equal(unit.results.find(x=>x.flow==='l99')?.status,'BLOCK');assert.equal(unit.results.find(x=>x.flow==='goalfix')?.status,'REPAIR_REQUIRED');assert.equal(unit.results.find(x=>x.flow==='ultrathink')?.status,'REPAIR_REQUIRED')});

test('every check receives a bounded non-authorizing Art of War maneuver',()=>{
  const unit=runFullAttackUnit(observation());
  assert.equal(unit.artOfWar.contract,'juss/art-of-war-hallway-strategy@v1');
  assert.equal(unit.artOfWar.decisions.length,ATTACK_UNIT_MEMBERS.length);
  assert.equal(unit.artOfWar.mayContain,true);
  assert.ok(unit.artOfWar.decisions.every(step=>step.authorizing===false));
  assert.ok(unit.artOfWar.decisions.some(step=>step.maneuver==='EXPLOIT_VERIFIED_ASYMMETRY'));
});
test('unknown technical correlation cannot authorize hallway containment',()=>{
  const state=observation({technicalIdentity:{...observation().technicalIdentity,actorFingerprint:null}});
  const unit=runFullAttackUnit(state);
  assert.equal(unit.artOfWar.mayContain,false);
  assert.equal(unit.unitVerdict,'PROOF_INSUFFICIENT');
});
test('verified bot and production isolation failures override hallway recommendations',()=>{
  const trusted=runFullAttackUnit(observation({technicalIdentity:{...observation().technicalIdentity,verifiedBot:true}}));
  assert.equal(trusted.artOfWar.mayContain,false);
  assert.equal(trusted.unitVerdict,'SAFE_TO_ALLOW_POLICY');
  const unsafe=runFullAttackUnit(observation({hallway:{...observation().hallway,realCustomerData:true}}));
  assert.equal(unsafe.artOfWar.mayContain,false);
  assert.equal(unsafe.unitVerdict,'REPAIR_REQUIRED');
});
