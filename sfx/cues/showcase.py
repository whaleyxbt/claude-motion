"""Sound design for Showcase. Every time comes from showcase.json.

    python -m sfx sfx/cues/showcase.py
"""

from sfx.synth import blip, chime, click, envelope, impact, pad, pop, riser, scratch, whoosh

TIMELINE = "showcase.json"
OUT = "public/showcase.wav"
TARGET_LUFS = -14.0

PROMPT = "make a video that surprises people"

# Everything tonal is in D major; pitch climbs with the story and resolves on the payoff.
BED_A = [146.83, 220.0, 293.66, 369.99, 554.37]
BED_B = [146.83, 220.0, 293.66, 440.0, 587.33, 739.99]
STAT_NOTES = [587.33, 739.99, 880.0, 1174.66]
CARD_NOTES = [659.25, 739.99, 880.0, 987.77]


def score(mix, tl):
    s1, s2, s3, s4, s5 = tl["s1"], tl["s2"], tl["s3"], tl["s4"], tl["s5"]
    dur = tl["duration"]
    put = mix.put

    duck, lift = s4["pullStart"], s4["impact"]
    volume = envelope([
        (0, 0.5), (1.0, 1), (duck, 1), (duck + 0.25, 0.35),
        (lift, 0.35), (lift + 0.5, 1.15), (dur - 1.0, 1.15), (dur, 0),
    ])
    mix.put_stereo(0, *pad(dur, [(0, BED_A), (lift, BED_B)], volume=volume), gain=0.03)

    # scene 1: the ask
    put(0.02, chime([1174.66, 1479.98, 1760.0], dur=1.4, tau=0.45), 0.07)
    mix.typing(s1["typeStart"], s1["typeEnd"], len(PROMPT))
    put(s1["enter"], click(1400), 0.26)
    put(s1["enter"] + 0.01, blip(587.33, dur=0.4), 0.14)
    put(s1["exit"], whoosh(0.4, 600, 3200, peak=0.4), 0.14)
    put(s1["dockStart"], whoosh(s1["dockEnd"] - s1["dockStart"], 400, 2400, peak=0.55), 0.16, 0.1)
    put(s1["dockEnd"], click(2400), 0.12)

    # scene 2: the numbers, one rising note each
    put(s2["title"], whoosh(0.35, 500, 2400, peak=0.45), 0.1)
    put(s2["title"] + 0.15, blip(146.83, dur=0.5, tau=0.15), 0.26)
    for i, t in enumerate(s2["stats"]):
        pan = -0.45 + i * 0.1
        put(t, pop(STAT_NOTES[i] * 1.6, STAT_NOTES[i] * 0.8), 0.28, pan)
        put(t + 0.01, blip(STAT_NOTES[i], dur=0.45, tau=0.12), 0.12, pan)
    put(s2["stats"][3] + 0.55, whoosh(0.4, 2600, 900, peak=0.4), 0.1, -0.3)
    put(s2["stats"][3] + 0.95, click(2200), 0.2, -0.3)
    put(s2["exit"], whoosh(0.45, 3000, 500, peak=0.45), 0.18)

    # scene 3: no editor, just prompts; four cards
    for i, line in enumerate((s3["line1"], s3["line2"])):
        put(line, whoosh(0.3, 500, 2400, peak=0.45), 0.1)
        put(line + 0.12, blip(146.83 if i == 0 else 164.81, dur=0.4, tau=0.1), 0.24)
    for i, c in enumerate(s3["cards"]):
        pan = -0.4 if i % 2 == 0 else 0.4
        put(c, pop(CARD_NOTES[i] * 1.5, CARD_NOTES[i] * 0.75), 0.22, pan)
    put(s3["cards"][2] + 0.05, scratch(0.6), 0.08, -0.3)
    put(s3["exit"], whoosh(0.45, 3000, 600, peak=0.4), 0.18)

    # scene 4: the render races to 900, then the hero pull-back and the only impact
    put(s4["enter"], click(1800), 0.18)
    put(s4["countStart"], riser(s4["impact"] - s4["countStart"], 240, 5200), 0.24)
    for k in range(10):
        f = k / 10
        put(s4["countStart"] + (s4["countEnd"] - s4["countStart"]) * (f ** 0.6), click(1600 + 120 * k, dur=0.03), 0.06 + 0.01 * k)
    put(s4["countEnd"], blip(1174.66, dur=0.4), 0.14)
    put(s4["pullStart"], whoosh(s4["impact"] - s4["pullStart"] + 0.05, 300, 4200, peak=0.85, q=0.7), 0.3)
    put(s4["impact"] - 0.01, impact(), 0.36)
    put(s4["impact"], whoosh(0.8, 5000, 300, peak=0.15, q=0.6), 0.14)

    # scene 5: the reveal lines, then the resolving chord
    for line, note in ((s5["line1"], 73.42), (s5["line2"], 82.41)):
        put(line + 0.12, blip(note, dur=0.7, tau=0.25), 0.34)
        put(line + 0.12, click(1000), 0.08)
    put(s5["sub"], pop(900, 450), 0.12)
    put(s5["handle"], chime([587.33, 880.0, 1174.66, 1479.98], dur=1.6, tau=0.6), 0.2)
