# # Whisper intelligibility: how much of what we meant does a recogniser hear?
#
# `scripts/listen-whisper.mjs` renders each language's sample phrase and its Happy Birthday to WAV files, and
# writes a `manifest.json` saying what each one was meant to say. This reads that manifest, transcribes every
# file with Whisper (told the language, so it cannot guess a different one) and prints, per language, the word
# error rate against the reference text and the transcript itself.
#
# ## What the numbers are, and are not
#
# - **WER** is the edit distance between the reference words and the transcript words, over the number of
#   reference words: 0 is perfect, 1 is every word wrong, and it can pass 1 when the recogniser adds words.
# - **CER** is the same over characters. For Mandarin, which has no spaces, the "words" are characters, so
#   WER and CER agree.
# - **sure** is the probability Whisper itself gave to its words, and **no speech** the highest probability it gave
#   to there being no speech at all. Low "sure" or high "no speech" next to a confident-looking transcript is a
#   hallucination: the recogniser heard nothing it could use and filled the gap.
# - Whisper is a *language model* as much as an ear. It will write "hello world" for a muffled version of it
#   because those two words are likely, and it will make up words for silence. A low WER therefore means the
#   sound is not *worse* than a blurry recording of the phrase, and a high one means something is wrong, but
#   neither says the voice sounds natural. Short phrases of two words are especially noisy: one wrong word is
#   a WER of 0.5. Treat the table as a list of places to listen, not as a verdict.
#
# Usage: `python whisper_wer.py out/listening/manifest.json [--model small] [--json results.json]`.
import argparse
import json
import math
import re
import sys
import unicodedata


# ## Normalising before comparing
#
# Whisper adds capitals and punctuation that the reference does not care about. Case, punctuation and symbols
# are dropped, and the text is put in one Unicode form. Accents are kept (`olá` is not `ola`), except for
# Arabic's short-vowel marks, which Whisper does not write and the reference does not either.
def normalise(text, language):
    text = unicodedata.normalize("NFKC", text).lower()
    if language == "ar":
        text = "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")
        text = unicodedata.normalize("NFC", text)
    text = "".join(" " if unicodedata.category(c)[0] in "PS" else c for c in text)
    return re.sub(r"\s+", " ", text).strip()


# Words are whitespace-separated, except in Mandarin, where each character is one.
def tokens(text, language):
    text = normalise(text, language)
    return list(text.replace(" ", "")) if language == "zh" else text.split()


# ## Edit distance, with the alignment
#
# The classic dynamic programme, kept whole so the way back can be walked. The walk gives, for each
# reference token, what it became: kept, replaced by another token, or dropped; and the tokens that were added.
# The replacements are the interesting part: "mundo" heard as "mondo" says which sound was confused.
def align(ref, hyp):
    rows, cols = len(ref) + 1, len(hyp) + 1
    cost = [[0] * cols for _ in range(rows)]
    for i in range(rows):
        cost[i][0] = i
    for j in range(cols):
        cost[0][j] = j
    for i in range(1, rows):
        for j in range(1, cols):
            same = 0 if ref[i - 1] == hyp[j - 1] else 1
            cost[i][j] = min(cost[i - 1][j - 1] + same, cost[i - 1][j] + 1, cost[i][j - 1] + 1)
    swaps, i, j = [], len(ref), len(hyp)
    while i > 0 or j > 0:
        if i > 0 and j > 0 and cost[i][j] == cost[i - 1][j - 1] + (0 if ref[i - 1] == hyp[j - 1] else 1):
            if ref[i - 1] != hyp[j - 1]:
                swaps.append((ref[i - 1], hyp[j - 1]))
            i, j = i - 1, j - 1
        elif i > 0 and cost[i][j] == cost[i - 1][j] + 1:
            swaps.append((ref[i - 1], ""))
            i -= 1
        else:
            swaps.append(("", hyp[j - 1]))
            j -= 1
    return cost[len(ref)][len(hyp)], swaps[::-1]


def error_rate(ref, hyp):
    distance, swaps = align(ref, hyp)
    return distance / max(len(ref), 1), swaps


# ## Transcribing
#
# `faster-whisper` runs the same models as OpenAI's Whisper on the CPU, without needing PyTorch. Each file is
# transcribed on its own with no earlier text to lean on (`condition_on_previous_text=False`), and with the
# language given. Beam size 5 is the usual setting.
def transcribe_all(entries, model_name):
    from faster_whisper import WhisperModel

    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    for entry in entries:
        segments, info = model.transcribe(
            entry["wav"], language=entry["language"], beam_size=5, condition_on_previous_text=False
        )
        segments = list(segments)
        entry["transcript"] = " ".join(s.text.strip() for s in segments).strip()
        # Whisper's own doubt: the chance it gave its words (from the mean log-probability), and the highest
        # chance it gave to "there is no speech here". A confident "Thank you." over a silent file is the
        # recogniser making things up, and these two numbers are how it shows.
        entry["confidence"] = math.exp(sum(s.avg_logprob for s in segments) / len(segments)) if segments else 0.0
        entry["no_speech"] = max((s.no_speech_prob for s in segments), default=1.0)
        yield entry


# ## The report
def report(results):
    for language in sorted({r["language"] for r in results}):
        print(f"\n### {language}\n")
        print("| phrase | WER | CER | sure | no speech | meant | heard |")
        print("|---|---|---|---|---|---|---|")
        for r in (r for r in results if r["language"] == language):
            print(f"| {r['kind']} | {r['wer']:.2f} | {r['cer']:.2f} | {r['confidence']:.2f} | {r['no_speech']:.2f} | {r['reference']} | {r['transcript'] or '(nothing)'} |")


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0] if __doc__ else None)
    parser.add_argument("manifest")
    parser.add_argument("--model", default="small", help="tiny, base, small, medium (default: small)")
    parser.add_argument("--json", help="also write the results to this file")
    args = parser.parse_args()

    with open(args.manifest, encoding="utf-8") as f:
        entries = json.load(f)
    results = []
    for entry in transcribe_all(entries, args.model):
        lang = entry["language"]
        entry["wer"], entry["swaps"] = error_rate(tokens(entry["reference"], lang), tokens(entry["transcript"], lang))
        entry["cer"], _ = error_rate(list(normalise(entry["reference"], lang)), list(normalise(entry["transcript"], lang)))
        results.append(entry)
        print(f"{entry['id']}: WER {entry['wer']:.2f}", file=sys.stderr)
    report(results)
    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
