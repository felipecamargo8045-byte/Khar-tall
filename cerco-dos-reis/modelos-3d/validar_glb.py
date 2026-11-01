#!/usr/bin/env python3
"""Inspeção sem dependências de GLB; saída JSON para revisão do Soldado.
Uso: python3 validar_glb.py soldado-final.glb
Não substitui inspeção visual e não declara qualidade automática.
"""
import json
import struct
import sys
from pathlib import Path

def examine(path):
    data = Path(path).read_bytes()
    if len(data) < 20 or data[:4] != b'glTF':
        raise ValueError('Arquivo não é um GLB válido (glTF binário).')
    magic, version, length = struct.unpack_from('<4sII', data)
    if version != 2 or length != len(data):
        raise ValueError('Cabeçalho GLB inconsistente ou arquivo incompleto.')
    offset = 12
    chunks = []
    while offset + 8 <= len(data):
        size, kind = struct.unpack_from('<I4s', data, offset)
        offset += 8
        if offset + size > len(data):
            raise ValueError('Chunk além do tamanho do arquivo.')
        chunks.append((kind, data[offset:offset + size]))
        offset += size
    if offset != len(data) or not chunks or chunks[0][0] != b'JSON':
        raise ValueError('Chunks GLB inválidos.')
    gltf = json.loads(chunks[0][1].decode('utf-8').rstrip(' \x00'))
    meshes = gltf.get('meshes', [])
    materials = gltf.get('materials', [])
    textures = gltf.get('textures', [])
    images = gltf.get('images', [])
    skins = gltf.get('skins', [])
    nodes = gltf.get('nodes', [])
    animations = gltf.get('animations', [])
    primitives = [p for m in meshes for p in m.get('primitives', [])]
    armature_joint_count = max((len(s.get('joints', [])) for s in skins), default=0)
    animation_names = [a.get('name') or '(sem nome)' for a in animations]
    extensions = gltf.get('extensionsUsed', [])
    report = {
        'file': str(path),
        'file_bytes': len(data),
        'gltf_version': gltf.get('asset', {}).get('version'),
        'meshes': len(meshes),
        'primitives': len(primitives),
        'nodes': len(nodes),
        'materials': len(materials),
        'textures': len(textures),
        'images': len(images),
        'skin_rigs': len(skins),
        'max_joints_in_skin': armature_joint_count,
        'animations': animation_names,
        'extensions_used': extensions,
        'presence_checks': {
            'real_mesh': bool(primitives),
            'textured_or_pbr_material': bool(materials) and bool(textures or images or any(
                m.get('pbrMetallicRoughness', {}).get('baseColorFactor') for m in materials)),
            'skeleton': bool(skins) and armature_joint_count >= 8,
            'animations_present': bool(animations),
            'multiple_motion_clips': len(animations) >= 5,
        },
        'visual_review_required': [
            'Fidelidade à arte de Soldado (armadura, capa/capuz, espada e escudo).',
            'Vistas frontal, lateral, traseira e perspectiva de arena.',
            'Sem clipping de capa, ombro, cotovelo, joelho e punhos.',
            'Silhueta e escala aprovadas na arena; dois soldados por carta.',
            'Revisão comercial da licença de cada modelo, textura e animação.',
        ],
    }
    return report

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Uso: python3 validar_glb.py arquivo.glb', file=sys.stderr)
        raise SystemExit(2)
    try:
        result = examine(sys.argv[1])
    except (OSError, ValueError, json.JSONDecodeError, struct.error) as error:
        print(json.dumps({'ok': False, 'error': str(error)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(1)
    print(json.dumps({'ok': True, **result}, indent=2, ensure_ascii=False))
    if not all(result['presence_checks'].values()):
        raise SystemExit(3)
