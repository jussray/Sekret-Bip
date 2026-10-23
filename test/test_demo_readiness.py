"""Regression checks for canonical demo-readiness without live provider writes."""

import os
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
import unittest


class DemoReadinessShellTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.root = Path(self.temp_dir.name)
        self.bin_dir = self.root / "bin"
        self.bin_dir.mkdir()
        self.script = Path(__file__).resolve().parent.parent / "scripts/demo-check.sh"
        self.assertTrue(self.script.is_file())
        commands = {
            "wrangler": "#!/bin/sh\nprintf 'OPENAI_API_KEY\\nSEKRET_CLIENT_TOKEN\\n'\n",
            "curl": ("#!/bin/sh\ncase \"$*\" in *workers.dev*) exit 99;; esac\n"
                     "case \"$*\" in *-w*) printf '200';; *) printf '{\"commitSha\":\"deadbeef\"}';; esac\n"),
            "npm": "#!/bin/sh\nexit 0\n",
            "jq": "#!/bin/sh\nprintf 'deadbeef\\n'\n",
            "git": "#!/bin/sh\nprintf 'deadbeef\\n'\n",
        }
        for name, script in commands.items():
            executable = self.bin_dir / name
            executable.write_text(script, encoding="utf-8")
            executable.chmod(0o755)

    def run_gate(self):
        env = dict(os.environ)
        env["PATH"] = f"{self.bin_dir}{os.pathsep}{env.get('PATH', '')}"
        return subprocess.run(["bash", str(self.script)], cwd=self.root, env=env,
                              capture_output=True, text=True, check=False)

    def test_canonical_health_only_passes(self):
        result = self.run_gate()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("DEMO READY", result.stdout)
        self.assertNotIn("workers.dev", result.stdout)
        self.assertIn("9 passed", result.stdout)

    def test_canonical_health_failure_blocks(self):
        curl = self.bin_dir / "curl"
        curl.write_text("#!/bin/sh\ncase \"$*\" in *-w*) printf '503';; *) printf '{}';; esac\n", encoding="utf-8")
        curl.chmod(0o755)
        result = self.run_gate()
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("NOT demo-ready", result.stdout)
        self.assertIn("HTTP 503", result.stdout)


if __name__ == "__main__":
    unittest.main()
