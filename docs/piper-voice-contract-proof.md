# Piper contract proof checklist

Branch: `fix/piper-canonical-voice-contract`

Implementation evidence:

- Worker default voice stems now match the models baked into the Piper image.
- Canonical names are Suhana, Sy, Cloud, and Night.
- The mobile client remains isolated from Piper credentials and URLs.
- Contract tests lock the Worker-to-container mapping.

Pending hosted/manual evidence:

- exact-head test execution
- container build
- authenticated synthesis smoke test
- live Worker-to-Piper integration
- production deployment approval

This document records repository evidence only. It does not authorize deployment or claim production verification.
