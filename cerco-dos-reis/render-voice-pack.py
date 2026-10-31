#!/usr/bin/env python3
"""Gera falas estáticas do Cerco dos Reis com Kokoro-82M (Apache-2.0),
    processamento FFmpeg e sem API paga; não precisa rodar no celular.
    Nenhum som ou modelo proprietário de terceiros é copiado.
"""
import json
import pathlib
import subprocess
import tempfile
import os
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro
from misaki.espeak import EspeakG2P

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / "voice-pack"
OUT.mkdir(exist_ok=True)
MODEL = os.environ.get("KOKORO_MODEL", "/tmp/kokoro-v1.0.int8.onnx")
VOICES = os.environ.get("KOKORO_VOICES", "/tmp/voices-v1.0.bin")
tts = Kokoro(MODEL, VOICES)
g2p = EspeakG2P(language="pt-br")

# Diferentes intérpretes sintéticos, com direção sonora (não a voz TTS do Android).
# Tom/pós-produção intencionalmente únicos de acordo com o personagem.
cast = {
 "arqueiro": {"voice":"pm_alex","speed":1.06,"pitch":1.07,"character":"arqueiro jovem, vigilante das pontes, arco certeiro",
  "attack":["As pontes não podem cair!","Pelo reino, flechas ao alto!","O trono ainda resiste!"],
  "hurt":["A muralha precisa de cobertura!"]},
 "soldado": {"voice":"pm_alex","speed":0.97,"pitch":0.98,"character":"soldado fiel, guerreiro do reino dividido",
  "attack":["Uma espada pelo nosso povo.","Não deixem o rei sozinho!","Ninguém atravessa esta ponte!"],
  "hurt":["Ainda defendo o juramento!"]},
 "colosso": {"voice":"pm_santa","speed":0.86,"pitch":0.88,"character":"colosso gigantesco, especialista em romper muralhas",
  "attack":["Minhas passadas abrem o cerco.","Pela brecha na muralha!","O castelo vai ruir!"],
  "hurt":["Pedra não se ajoelha!"]},
 "guardiao": {"voice":"pm_santa","speed":0.92,"pitch":0.96,"character":"guardião ancestral e juramentado ao trono",
  "attack":["Meu juramento vive além da guerra.","Para alcançar o rei, atravesse minha guarda!","Nem dois reinos romperão esta defesa."],
  "hurt":["Ainda guardo o trono!"]},
 "batedor": {"voice":"pm_alex","speed":1.11,"pitch":1.06,"character":"batedor veloz, marca o inimigo antes do segundo golpe",
  "attack":["Minha marca precede a sentença!","Primeira marca. Segundo golpe!","A próxima descarga será a última!"],
  "hurt":["Minha marca ainda queima!"]},
 "rei": {"voice":"pm_santa","speed":0.90,"pitch":0.94,"character":"rei de uma guerra entre irmãos, imponente e atormentado",
  "attack":["Dois irmãos. Um reino dividido.","O povo não pagará por esta guerra!","Não entregarei meu trono ao sangue!"],
  "hurt":["A coroa não vale outra vida!"],
  "victory":["Que este reino encontre a paz!"]},
 "liliti": {"voice":"pf_dora","speed":0.94,"pitch":1.00,"character":"Liliti ruiva, misteriosa, ligada aos segredos da guerra entre irmãos",
  "attack":["A história esqueceu minha voz.","Nem toda guerra nasce do ódio.","O que foi selado ainda pulsa."],
  "hurt":["Vocês não conhecem a verdade!"]}
}
manifest={"version":2,"provider":"Kokoro-82M / pt-BR (Apache-2.0) + FFmpeg 72 kbps voz limpa","engine":"pre-generated-static-audio","characters":{}}
def render(person,scene,index,line,voice,speed,pitch):
  phones, _ = g2p(line)
  if not phones.strip(): raise RuntimeError(f"Phoneme string empty: {person}: {line}")
  audio, rate = tts.create(phones, voice, speed=speed, is_phonemes=True)
  audio = np.asarray(audio,dtype=np.float32)
  if audio.size < 500: raise RuntimeError(f"Empty audio: {person}")
  # Clareza de fala é prioridade: menos distorção, sem eco, preservando
  # a inteligibilidade de consoantes e a frequência natural do narrador.
  # Pequenas mudanças de tom são usadas para distinguir o elenco sem virar
  # uma voz caricata. Deixar o campo vocal limpo para os sons de combate.
  hp = 72 if person in ('rei','colosso','guardiao') else 100
  f = (
    f"rubberband=pitch={pitch:.2f},"
    f"highpass=f={hp},"
    "equalizer=f=2800:t=q:w=1.2:g=2.4,"
    "equalizer=f=4500:t=q:w=1.4:g=1.4,"
    "lowpass=f=11800,"
    "acompressor=threshold=-22dB:ratio=2:attack=9:release=110:makeup=1.6,"
    "loudnorm=I=-17:TP=-2:LRA=8"
  )
  with tempfile.TemporaryDirectory(prefix="khar-voice-") as td:
    raw=pathlib.Path(td)/"line.wav"
    sf.write(raw, audio, rate, subtype="PCM_16")
    filename=f"{person}-{scene}-{index}.ogg"
    destination=OUT/filename
    subprocess.run(["ffmpeg","-nostdin","-hide_banner","-loglevel","error","-y","-i",str(raw),"-af",f,"-ac","1","-c:a","libopus","-b:a","72k",str(destination)],check=True)
    if destination.stat().st_size < 2000: raise RuntimeError(f"Broken clip {filename}")
    print(f"{person:9s} {scene:8s} {index}: {filename} ({destination.stat().st_size} bytes)",flush=True)
    return filename
for person,info in cast.items():
  entry={"style":info["character"],"voice":info["voice"],"clips":{},"dialogue":{}}
  for scene in ("attack","hurt","victory"):
    lines=info.get(scene,[])
    entry["dialogue"][scene]=lines
    entry["clips"][scene]=[render(person,scene,i,line,info["voice"],info["speed"],info["pitch"]) for i,line in enumerate(lines)]
  manifest["characters"][person]=entry
(ROOT/"voice-pack"/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding="utf8")
print("VOICE PACK READY: ",sum(len(v["clips"][t]) for v in manifest["characters"].values() for t in ("attack","hurt","victory")),flush=True)
