"""Safety regressions for the production Piper model path boundary."""

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException

import server


class ModelSelectionSecurityTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.override = patch.object(server, "VOICE_DIR", self.root)
        self.override.start()
        self.addCleanup(self.override.stop)

    def install(self, name="en_US-amy-medium"):
        model = self.root / f"{name}.onnx"
        model.write_bytes(b"model-placeholder")
        model.with_name(model.name + ".json").write_text("{}")
        return model

    def expect_denied(self, name, code):
        with self.assertRaises(HTTPException) as caught:
            server.resolve_model(name)
        self.assertEqual(caught.exception.status_code, code)

    def test_exact_installed_model_and_config_are_returned(self):
        model = self.install()
        self.assertEqual(server.resolve_model("en_US-amy-medium"), model)

    def test_malformed_names_are_rejected_not_silently_sanitized(self):
        self.install()
        for name in ("../en_US-amy-medium", "en_US-amy-medium/", "en_US-amy-medium\\", "en_US-amy-medium.", "en US amy medium", "é", "en_US-amy-medium\x00"):
            with self.subTest(name=name):
                self.expect_denied(name, 400)

    def test_missing_model_or_config_is_not_returned(self):
        self.expect_denied("missing", 404)
        (self.root / "no-config.onnx").write_bytes(b"placeholder")
        self.expect_denied("no-config", 404)

    def test_symlinked_model_cannot_escape_configured_root(self):
        with tempfile.TemporaryDirectory() as other:
            external = Path(other) / "external.onnx"
            external.write_bytes(b"other-model")
            (self.root / "external.onnx").symlink_to(external)
            (self.root / "external.onnx.json").write_text("{}")
            self.expect_denied("external", 404)

    def test_symlinked_config_cannot_escape_configured_root(self):
        model = self.install()
        model.with_name(model.name + ".json").unlink()
        with tempfile.TemporaryDirectory() as other:
            config = Path(other) / "secret.json"
            config.write_text("{}")
            model.with_name(model.name + ".json").symlink_to(config)
            self.expect_denied("en_US-amy-medium", 404)


if __name__ == "__main__":
    unittest.main()
