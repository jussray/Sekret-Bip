"""Keep private Piper WAV files only after successful synthesis."""

import tempfile
from pathlib import Path
from typing import Callable


def with_private_wav(run_command: Callable[[str], None]) -> str:
    """Reserve a private WAV and remove it for every synthesis failure."""
    output = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
    output.close()
    try:
        run_command(output.name)
    except BaseException:
        Path(output.name).unlink(missing_ok=True)
        raise
    return output.name
