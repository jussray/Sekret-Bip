import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PRODUCTION_PROJECT_REF = 'tbsevonvegdnlyjgplmm';
export const PRODUCTION_LEDGER_OBSERVED_AT = '2026-09-13';
export const PRODUCTION_MIGRATION_VERSIONS = Object.freeze([
  '0001',
  '0002',
  '0003',
  '20260614',
  '20260618',
  '20260619',
  '20260621',
  '20260622190420',
  '20260622230350',
  '20260622230409',
  '20260625075233',
  '20260625082303',
  '20260625182758',
  '20260625182804',
  '20260625182819',
  '20260626',
  '20260626013453',
  '20260626013458',
  '20260626014141',
  '20260626020337',
  '20260626021250',
  '20260626052642',
  '20260628235058',
  '20260628235251',
  '20260628235349',
  '20260628235446',
  '20260628235604',
  '20260628235626',
  '20260628235716',
  '20260629023925',
  '20260629024020',
  '20260629024605',
  '20260629024706',
  '20260629024820',
  '20260629024928',
  '20260629024952',
  '20260629025841',
  '20260629025858',
  '20260629025905',
  '20260629025912',
  '20260629025919',
  '20260629025950',
  '20260629030942',
  '20260630000131',
  '20260630004333',
  '20260630022018',
  '20260630022227',
  '20260630022256',
  '20260701042055',
  '20260701174023',
  '20260701174034',
  '20260701174924',
  '20260701174943',
  '20260701181806',
  '20260701181814',
  '20260701212151',
  '20260701224958',
  '20260701225010',
  '20260701225025',
  '20260701225042',
  '20260701225050',
  '20260701225111',
  '20260701225119',
  '20260701225212',
  '20260701225421',
  '20260701225436',
  '20260701225448',
  '20260701225503',
  '20260701225546',
  '20260701225602',
  '20260701225619',
  '20260701225648',
  '20260701225656',
  '20260701225705',
  '20260701225717',
  '20260701225726',
  '20260701225737',
  '20260701225750',
  '20260701225758',
  '20260701225807',
  '20260701225820',
  '20260701225829',
  '20260701225844',
  '20260701225849',
  '20260701225858',
  '20260702033608',
  '20260702033621',
  '20260702033631',
  '20260703023431',
  '20260704011503',
  '20260704011512',
  '20260704011522',
  '20260704011527',
  '20260704011614',
  '20260704011636',
  '20260704011642',
  '20260704011729',
  '20260704011745',
  '20260704011750',
  '20260704011757',
  '20260704012007',
  '20260704012139',
  '20260704012200',
  '20260704012206',
  '20260704013330',
  '20260704014518',
  '20260704022723',
  '20260704062008',
  '20260704063602',
  '20260705050121',
  '20260707020629',
  '20260707020638',
  '20260707020922',
  '20260707020955',
  '20260707033837',
  '20260707034111',
  '20260710042815',
  '20260710043323',
  '20260711015933',
  '20260711020057',
  '20260711100259',
  '20260711100337',
  '20260711193717',
  '20260711193738',
  '20260712183609',
  '20260712184254',
  '20260712184711',
  '20260713011803',
  '20260713024231',
  '20260713024245',
  '20260713024253',
  '20260713052511',
  '20260713052603',
  '20260713073608',
  '20260713074443',
  '20260713154809',
  '20260713155855',
  '20260713161055',
  '20260713162809',
  '20260713230600',
  '20260714043914',
  '20260714044347',
  '20260714045356',
  '20260714050831',
  '20260714181830',
  '20260714181910',
  '20260714181942',
  '20260714182016',
  '20260714182822',
  '20260714183958',
  '20260714221745',
  '20260714222507',
  '20260715100522',
  '20260715100824',
  '20260715202149',
  '20260718035000',
  '20260718035500',
  '20260718040638',
  '20260805170500',
  '20260806024500',
  '20260808222500',
  '20260808223500',
  '20260811132500',
  '20260811132600',
  '20260811132700',
  '20260811132800',
  '20260811134000',
  '20260813222000',
  '20260814033200',
  '20260816061219',
  '20260820211200',
  '20260821071500',
  '20260822060000',
  '20260824223800',
  '20260826012500',
  '20260827060000',
  '20260827061000',
  '20260827062000',
  '20260827063000',
  '20260831233000',
  '20260901000535',
  '20260905213248',
  '20260905213434',
]);

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const DEFAULT_MIGRATIONS_ROOT = path.join(ROOT, 'supabase', 'migrations');
const VERSION_PREFIX = /^(\d{14}|\d{8}|\d{4})_/;

function versionFromFilename(filename) {
  return filename.match(VERSION_PREFIX)?.[1] ?? null;
}

export function inspectProductionMigrationCoverage({
  migrationsRoot = DEFAULT_MIGRATIONS_ROOT,
  expectedVersions = PRODUCTION_MIGRATION_VERSIONS,
} = {}) {
  const files = fs.readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort();

  const filesByVersion = new Map();
  for (const filename of files) {
    const version = versionFromFilename(filename);
    if (!version) continue;
    const current = filesByVersion.get(version) ?? [];
    current.push(filename);
    filesByVersion.set(version, current);
  }

  const missingProductionVersions = expectedVersions
    .filter((version) => !filesByVersion.has(version));

  const duplicateLocalVersions = [...filesByVersion.entries()]
    .filter(([, filenames]) => filenames.length > 1)
    .map(([version, filenames]) => ({ version, filenames }))
    .sort((left, right) => left.version.localeCompare(right.version));

  const expectedSet = new Set(expectedVersions);
  const localOnlyVersions = [...filesByVersion.keys()]
    .filter((version) => !expectedSet.has(version))
    .sort();

  return {
    schemaVersion: 1,
    projectRef: PRODUCTION_PROJECT_REF,
    productionLedgerObservedAt: PRODUCTION_LEDGER_OBSERVED_AT,
    expectedProductionCount: expectedVersions.length,
    localMigrationVersionCount: filesByVersion.size,
    missingProductionVersions,
    duplicateLocalVersions,
    localOnlyVersions,
  };
}

export function assertProductionMigrationCoverage(options = {}) {
  if (PRODUCTION_MIGRATION_VERSIONS.length !== 183) {
    throw new Error(
      `Pinned production migration ledger must contain exactly 183 versions; observed ${PRODUCTION_MIGRATION_VERSIONS.length}.`,
    );
  }

  if (new Set(PRODUCTION_MIGRATION_VERSIONS).size !== PRODUCTION_MIGRATION_VERSIONS.length) {
    throw new Error('Pinned production migration ledger contains duplicate versions.');
  }

  const receipt = inspectProductionMigrationCoverage(options);

  if (receipt.duplicateLocalVersions.length > 0) {
    const duplicates = receipt.duplicateLocalVersions
      .map((entry) => `${entry.version}: ${entry.filenames.join(', ')}`)
      .join('; ');
    throw new Error(`Duplicate local Supabase migration versions: ${duplicates}`);
  }

  if (receipt.missingProductionVersions.length > 0) {
    throw new Error(
      `Remote migration versions not found in local migrations directory: ${receipt.missingProductionVersions.join(', ')}`,
    );
  }

  return receipt;
}

function isCliInvocation() {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isCliInvocation()) {
  try {
    process.stdout.write(`${JSON.stringify(assertProductionMigrationCoverage(), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
