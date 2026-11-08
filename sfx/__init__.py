"""Procedural sound design for motion graphics. Pure Python stdlib, 48 kHz stereo.

    python3 -m sfx sfx/cues/effort.py      render a cue sheet to WAV
    python3 -m sfx --list                  list the sound generators
"""

import sys

# Windows consoles and pipes default to cp1252, which cannot print the arrows and
# minus signs these scripts use. Any script that imports sfx gets UTF-8 output.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure") and (_stream.encoding or "").lower() != "utf-8":
        _stream.reconfigure(encoding="utf-8")

from .mix import Mix
from .synth import SR

__all__ = ["Mix", "SR"]
