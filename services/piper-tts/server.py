import os
import re
import subprocess
import tempfile
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

app = FastAPI(title="Se'kret Bip Piper TTS")
VOICE_DIR = Path(os.environ.get("PIPER_VOICE_DIR", "/voices"))
API_TOKEN = os.environ.get("PIPER_API_TOKEN", "").strip()
ALLOW_INSECURE_LOCAL = os.environ.get("PIPER_ALLOW_INSECURE_LOCAL", "").strip().lower() in {"1", "true", "yes"}
VOICE_STEM = re.compile(r"[A-Za-z0-9_-]{1,80}\Z", re.ASCII)

class SynthesisRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    voice: str = Field(min_length=1, max_length=80)
    format: str = "wav"

def require_token(authorization: str | None) -> None:
    if not API_TOKEN:
        if ALLOW_INSECURE_LOCAL:
            return
        raise HTTPException(status_code=503, detail="Piper service authentication is not configured")
    if authorization != f"Bearer {API_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")

def resolve_model(voice: str) -> Path:
    # Do not normalize untrusted model identifiers into another installed voice.
    if not VOICE_STEM.fullmatch(voice):
        raise HTTPException(status_code=400, detail="Invalid voice identifier")

    voice_root = VOICE_DIR.resolve()
    # Select from installed files, rather than joining untrusted input to a path.
    # Refuse symlinks that resolve outside the configured voice directory.
    for model in VOICE_DIR.glob("*.onnx"):
        if model.stem != voice:
            continue
        config = model.with_name(model.name + ".json")
        if (
            model.is_file()
            and config.is_file()
            and model.resolve().is_relative_to(voice_root)
            and config.resolve().is_relative_to(voice_root)
        ):
            return model
    raise HTTPException(status_code=404, detail="Voice is not installed")

@app.get("/health")
def health() -> dict[str, object]:
    return {"ok": True, "voices": sorted(path.stem for path in VOICE_DIR.glob("*.onnx"))}

@app.post("/synthesize")
def synthesize(payload: SynthesisRequest, background_tasks: BackgroundTasks, authorization: str | None = Header(default=None)):
    require_token(authorization)
    if payload.format != "wav":
        raise HTTPException(status_code=400, detail="Piper service currently returns WAV only")
    model = resolve_model(payload.voice)
    output = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    output.close()
    try:
        subprocess.run(["piper", "--model", str(model), "--output_file", output.name], input=payload.text, text=True, check=True, timeout=45)
        background_tasks.add_task(Path(output.name).unlink, missing_ok=True)
        return FileResponse(output.name, media_type="audio/wav", filename=f"{payload.voice}.wav")
    except subprocess.TimeoutExpired as exc:
        Path(output.name).unlink(missing_ok=True)
        raise HTTPException(status_code=504, detail="Synthesis timed out") from exc
    except subprocess.CalledProcessError as exc:
        Path(output.name).unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Piper synthesis failed") from exc
