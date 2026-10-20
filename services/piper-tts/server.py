import os
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
    safe_voice = "".join(ch for ch in voice if ch.isalnum() or ch in {"-", "_"})
    model = VOICE_DIR / f"{safe_voice}.onnx"
    config = VOICE_DIR / f"{safe_voice}.onnx.json"
    if not model.is_file() or not config.is_file():
        raise HTTPException(status_code=404, detail=f"Voice '{safe_voice}' is not installed")
    return model

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
