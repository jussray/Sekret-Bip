import path from 'node:path';
import {
  buildSkipObservation,
  emitSkipObservation,
  writeSkipReport,
} from './control-room-test-skips.mjs';

export default class ControlRoomPlaywrightSkipReporter {
  constructor() {
    this.observations = [];
  }

  onTestEnd(test, result) {
    if (result.status !== 'skipped') return;
    const annotationReason = (test.annotations || [])
      .filter((annotation) => annotation.type === 'skip')
      .map((annotation) => annotation.description)
      .filter(Boolean)
      .join('; ');
    const titlePath = typeof test.titlePath === 'function' ? test.titlePath() : [test.title];
    const observation = buildSkipObservation({
      runner: 'playwright',
      command: process.env.CONTROL_ROOM_TEST_COMMAND || 'playwright test',
      testId: titlePath.filter(Boolean).join(' > '),
      testFile: test.location?.file ? path.relative(process.cwd(), test.location.file) : null,
      reason: annotationReason || 'Playwright marked this test skipped.',
      surface: process.env.GITHUB_ACTIONS === 'true' ? 'github_actions' : 'local',
    });
    this.observations.push(observation);
    emitSkipObservation(observation);
  }

  onEnd() {
    writeSkipReport(this.observations, {
      filename: 'playwright-test-skips-latest.json',
      source: 'playwright',
    });
    console.log('CONTROL_ROOM_PLAYWRIGHT_SKIP_REPORT_WRITTEN');
  }
}
