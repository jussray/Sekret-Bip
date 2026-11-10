import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from piper_runtime import with_private_wav


class PiperRuntimeCleanupTests(unittest.TestCase):
    def test_success_provides_private_wav_filename_and_retains_it_until_response_cleanup(self):
        with tempfile.TemporaryDirectory() as directory:
            factory = tempfile.NamedTemporaryFile
            called = []
            with patch('piper_runtime.tempfile.NamedTemporaryFile', side_effect=lambda **kw: factory(dir=directory, **kw)):
                output = with_private_wav(lambda filename: called.append(filename))
            try:
                self.assertEqual(called, [output])
                self.assertTrue(Path(output).is_file())
                self.assertEqual(Path(output).suffix, '.wav')
                self.assertTrue(Path(output).stat().st_mode & 0o077 == 0)
            finally:
                Path(output).unlink(missing_ok=True)

    def test_failures_remove_sensitive_temporary_output(self):
        for failure in (
            subprocess.TimeoutExpired(cmd=['piper'], timeout=45),
            subprocess.CalledProcessError(returncode=1, cmd=['piper']),
            FileNotFoundError('piper unavailable'),
            RuntimeError('unexpected process failure'),
        ):
            with self.subTest(failure=type(failure).__name__), tempfile.TemporaryDirectory() as directory:
                factory = tempfile.NamedTemporaryFile
                with patch('piper_runtime.tempfile.NamedTemporaryFile', side_effect=lambda **kw: factory(dir=directory, **kw)):
                    def failing_command(_filename):
                        raise failure
                    with self.assertRaises(type(failure)):
                        with_private_wav(failing_command)
                self.assertEqual(list(Path(directory).iterdir()), [], 'failed synthesis must not leave a WAV file')


if __name__ == '__main__':
    unittest.main()
