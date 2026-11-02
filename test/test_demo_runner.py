"""Small tests for the demo runner; not substitutes for real Playwright proof."""

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

import demo


class DemoRunnerTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.root = Path(self.temp_dir.name)
        self.original_root = demo.ROOT
        demo.ROOT = self.root
        self.addCleanup(setattr, demo, "ROOT", self.original_root)

    def prepare_local(self, mode: str):
        for spec in demo.JOURNEYS[mode][1:]:
            file = self.root / spec
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text("test", encoding="utf-8")
        binary = self.root / "node_modules/.bin/playwright"
        binary.parent.mkdir(parents=True, exist_ok=True)
        binary.touch()

    @patch("demo.subprocess.run")
    @patch("demo.shutil.which", return_value="/usr/bin/npm")
    def test_local_uses_existing_real_journeys(self, _which, call):
        self.prepare_local("local")
        call.return_value.returncode = 0
        self.assertEqual(demo.run("local"), 0)
        command = call.call_args.args[0]
        self.assertEqual(command[:4], ["npm", "run", "test:e2e", "--"])
        self.assertIn("e2e/smoke.spec.ts", command)
        self.assertIn("e2e/auth-security-handoff.spec.ts", command)

    @patch("demo.subprocess.run")
    @patch("demo.shutil.which", return_value="/usr/bin/npm")
    def test_production_is_read_only_specs(self, _which, call):
        self.prepare_local("production")
        call.return_value.returncode = 0
        self.assertEqual(demo.run("production"), 0)
        command = call.call_args.args[0]
        self.assertIn("test:e2e:production", command)
        self.assertIn("e2e/production-audience-journeys.spec.ts", command)
        self.assertNotIn("e2e/live-onboarding-email.spec.ts", command)

    @patch("demo.subprocess.run")
    @patch("demo.shutil.which", return_value="/usr/bin/npm")
    def test_runner_propagates_failure(self, _which, call):
        self.prepare_local("local")
        call.return_value.returncode = 1
        self.assertEqual(demo.run("local"), 1)

    @patch("demo.subprocess.run")
    @patch("demo.shutil.which", return_value="/usr/bin/npm")
    def test_missing_dependencies_block_without_running(self, _which, call):
        self.prepare_local("local")
        (self.root / "node_modules/.bin/playwright").unlink()
        self.assertEqual(demo.run("local"), 2)
        call.assert_not_called()

    @patch("demo.subprocess.run")
    @patch("demo.shutil.which", return_value="/usr/bin/bash")
    def test_readiness_calls_existing_gate(self, _which, call):
        script = self.root / "scripts/demo-check.sh"
        script.parent.mkdir()
        script.write_text("#!/bin/bash\n", encoding="utf-8")
        call.return_value.returncode = 0
        self.assertEqual(demo.run("readiness"), 0)
        self.assertEqual(call.call_args.args[0], ["bash", str(script)])


if __name__ == "__main__":
    unittest.main()
