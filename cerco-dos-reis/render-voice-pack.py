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
 "arqueiro": {"voice":"pm_alex","speed":1.12,"pitch":1.12,"character":"jovem, ágil, valente",
  "attack":["Alvo à vista!","Disparo certeiro!"],"hurt":["Preciso de cobertura!"]},
 "soldado": {"voice":"pm_alex","speed":1.00,"pitch":0.96,"character":"guerreiro firme, golpe decidido",
  "attack":["Pela linha de frente!","Minha espada não falha!"],"hurt":["Ainda estou de pé!"]},
 "colosso": {"voice":"pm_santa","speed":0.83,"pitch":0.75,"character":"enorme, cavernoso e ameaçador",
  "attack":["Vou esmagar!","O chão vai tremer!"],"hurt":["Isso não me detém!"]},
 "guardiao": {"voice":"pm_santa","speed":0.92,"pitch":0.88,"character":"ancião austero, voz de guardião",
  "attack":["Nada passa!","Protegerei o reino!"],"hurt":["Minha defesa resiste!"]},
 "batedor": {"voice":"pm_alex","speed":1.18,"pitch":1.06,"character":"veloz e sarcástico, ataque preciso",
  "attack":["Você está marcado!","Não existe fuga!"],"hurt":["Ainda posso lutar!"]},
 "rei": {"voice":"pm_santa","speed":0.88,"pitch":0.84,"character":"monarca nobre, comando firme",
  "attack":["Pelo meu reino!","O trono será defendido!"],"hurt":["Não me derrotarão!"],
  "victory":["A vitória é nossa!"]},
 "liliti": {"voice":"pf_dora","speed":0.94,"pitch":1.04,"character":"mulher poderosa, sedutora e misteriosa",
  "attack":["Sua vontade é minha.","Sinta o meu encanto."],"hurt":["Você vai se arrepender!"]}
}
manifest={"version":1,"provider":"Kokoro-82M / pt-BR (Apache-2.0) + FFmpeg","engine":"pre-generated-static-audio","characters":{}}
def render(person,scene,index,line,voice,speed,pitch):
  phones, _ = g2p(line)
  if not phones.strip(): raise RuntimeError(f"Phoneme string empty: {person}: {line}")
  audio, rate = tts.create(phones, voice, speed=speed, is_phonemes=True)
  audio = np.asarray(audio,dtype=np.float32)
  if audio.size < 500: raise RuntimeError(f"Empty audio: {person}")
  # Distinct sound design, small purposeful ambience, not a synthetic cartoon pitch-shift.
  f = f"rubberband=pitch={pitch:.2f},highpass=f={75 if person in ('rei','colosso','guardiao') else 115}"
  if person == "colosso": f += ",lowpass=f=3200,aecho=0.8:0.16:94:0.12"
  elif person == "guardiao": f += ",lowpass=f=4700,aecho=0.8:0.14:75:0.10"
  elif person == "rei": f += ",lowpass=f=5600,aecho=0.8:0.12:65:0.10"
  elif person == "liliti": f += ",lowpass=f=6800,aecho=0.8:0.16:100:0.12"
  else: f += ",lowpass=f=6500"
  f += ",alimiter=limit=0.89"
  with tempfile.TemporaryDirectory(prefix="khar-voice-") as td:
    raw=pathlib.Path(td)/"line.wav"
    sf.write(raw, audio, rate, subtype="PCM_16")
    filename=f"{person}-{scene}-{index}.ogg"
    destination=OUT/filename
    subprocess.run(["ffmpeg","-nostdin","-hide_banner","-loglevel","error","-y","-i",str(raw),"-af",f,"-ac","1","-c:a","libopus","-b:a","36k",str(destination)],check=True)
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
