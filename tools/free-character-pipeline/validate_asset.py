"""Validate the uncompressed animated GLBs produced by refine_knight.py."""
import argparse
import hashlib
import json
import struct
from pathlib import Path

import numpy as np

TYPES = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
DTYPES = {5120: 'i1', 5121: 'u1', 5122: '<i2', 5123: '<u2', 5125: '<u4', 5126: '<f4'}


def validate(path):
    data = path.read_bytes()
    magic, version, length = struct.unpack_from('<III', data)
    assert magic == 0x46546C67 and version == 2 and length == len(data)
    chunks, cursor = {}, 12
    while cursor < len(data):
        size, kind = struct.unpack_from('<II', data, cursor)
        assert size % 4 == 0 and cursor + 8 + size <= len(data)
        chunks[kind] = data[cursor + 8:cursor + 8 + size]
        cursor += 8 + size
    doc = json.loads(chunks[0x4E4F534A])
    binary = chunks[0x004E4942]

    def accessor(index):
        a = doc['accessors'][index]
        view = doc['bufferViews'][a['bufferView']]
        dtype = np.dtype(DTYPES[a['componentType']])
        cols, rows = TYPES[a['type']], a['count']
        stride = view.get('byteStride', cols * dtype.itemsize)
        offset = view.get('byteOffset', 0) + a.get('byteOffset', 0)
        last = offset + max(0, rows - 1) * stride + cols * dtype.itemsize
        assert last <= view.get('byteOffset', 0) + view['byteLength'] <= len(binary)
        values = np.ndarray((rows, cols), dtype, binary, offset, (stride, dtype.itemsize))
        assert np.isfinite(values).all()
        return values

    for index in range(len(doc['accessors'])):
        accessor(index)
    triangles, primitives, max_weight_error = 0, 0, 0
    joint_count = len(doc['skins'][0]['joints'])
    for mesh in doc['meshes']:
        for primitive in mesh['primitives']:
            attributes = primitive['attributes']
            positions = accessor(attributes['POSITION'])
            indices = accessor(primitive['indices'])
            assert indices.max() < len(positions)
            assert primitive.get('mode', 4) == 4 and len(indices) % 3 == 0
            weights = accessor(attributes['WEIGHTS_0'])
            joints = accessor(attributes['JOINTS_0'])
            assert (weights >= 0).all() and (joints < joint_count).all()
            error = float(np.abs(weights.sum(axis=1) - 1).max())
            assert error < 1e-5
            max_weight_error = max(error, max_weight_error)
            triangles += len(indices) // 3
            primitives += 1
    clips = []
    for clip in doc['animations']:
        durations = []
        for sampler in clip['samplers']:
            times = accessor(sampler['input']).flatten()
            assert len(times) and (np.diff(times) > 0).all() and times[0] >= 0
            durations.append(float(times[-1]))
        clips.append({'name': clip['name'], 'duration_seconds': max(durations)})
    assert [clip['name'] for clip in clips] == ['Idle', 'Walk', 'Attack', 'Hit', 'Death']
    assert joint_count == 75
    return {'file': path.name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
            'triangles': triangles, 'primitives': primitives, 'joints': joint_count,
            'max_weight_sum_error': max_weight_error, 'clips': clips, 'structural_checks': 'passed'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('models', nargs='+', type=Path)
    parser.add_argument('--out', type=Path)
    args = parser.parse_args()
    result = {'assets': [validate(path) for path in args.models]}
    output = json.dumps(result, ensure_ascii=False, indent=2)
    if args.out:
        args.out.write_text(output + '\n')
    print(output)
