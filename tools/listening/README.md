# Listening tools (on demand, Python)

These measure the audio the synth renders with trained models, because Claude cannot hear. They need Python
packages and downloaded model weights, so they are **not** part of the site, `npm test` or CI. The site stays
no-build and dependency-free; nothing in `lib/`, `demos/` or `fsharp/` imports anything from here.

Node does the rendering (it is the real engine) and writes WAV files; Python only reads them. The pure-JS
listening tests (pitch, formants) stay in `lib/pitchtrack.js` and `lib/formanttrack.js` and do run in CI.

## Setup

```sh
python3 -m venv tools/listening/.venv
tools/listening/.venv/bin/pip install -r tools/listening/requirements.txt
```

The first run downloads the model weights from Hugging Face into `~/.cache/huggingface` (the `small` Whisper
model is about 460 MB). `.venv/` is git-ignored.

If `pip` fails with "Could not find a suitable TLS CA certificate bundle", a `REQUESTS_CA_BUNDLE` or
`SSL_CERT_FILE` variable in your shell points at a file that is not there; unset it for the command.

## Whisper intelligibility (`whisper_wer.py`)

```sh
node scripts/listen-whisper.mjs                       # renders out/listening/*.wav and manifest.json
tools/listening/.venv/bin/python tools/listening/whisper_wer.py out/listening/manifest.json --model small
```

`scripts/listen-whisper.mjs` renders, for each of the ten languages, the sample phrase of its dictionary
spoken through `speakText`, and Happy Birthday sung. Options: `--langs en,es`, `--voice woman`, `--bpm 100`,
`--out out/listening`. The Python side transcribes each file with Whisper told the language, and prints a table
per language: word error rate (character error rate too, and for Mandarin the words *are* characters), how sure
Whisper was, how likely it thought "no speech", what we meant and what it heard. `--json results.json` keeps the
word-by-word differences (`swaps`).

### How to read it

- A WER near 0 means a recogniser understood it. It does not mean it sounds natural.
- A WER of 1 or more with a transcript like "Thank you." or "Subtitles by ..." is Whisper making something up
  from audio it could not use. Look at "sure" and "no speech" before believing the transcript.
- The sample phrases are two words long, so one wrong word is a WER of 0.5. The songs are sung and Whisper is
  not trained on singing, so they score worse than speech for reasons that are not the synth's fault.
- As a control, real TTS says "hello world" and "bonjour le monde" with WER 0. If a control fails, the tool is
  broken, not the synth. (On a Mac: `say -v Samantha --data-format=LEI16@22050 -o hello.wav "hello world"`.)

## Licences

| Piece | Licence |
|---|---|
| `faster-whisper` | MIT |
| `ctranslate2` | MIT |
| `av` (PyAV) | BSD-3-Clause (wheels bundle FFmpeg libraries under the LGPL) |
| Whisper `small` weights, as converted by `Systran/faster-whisper-small` | MIT (the OpenAI repository is MIT; the `openai/whisper-small` Hugging Face card says Apache-2.0, which is also permissive) |

Nothing from here is committed or redistributed: weights are downloaded by the user on their own machine.
