// Decode Mesh2Motion's CC0 animations for Blender's glTF importer.
import {mkdir,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
const [source,output]=process.argv.slice(2);
if (!source || !output) throw new Error('Usage: node decompress_clips.mjs INPUT_DIR OUTPUT_DIR');
await mkdir(output,{recursive:true});await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
for (const filename of (await readdir(source)).filter(name=>name.endsWith('.glb')).sort()) {
  const name=filename.slice(0,-4);
  const document=await io.read(join(source,filename));
  for (const extension of document.getRoot().listExtensionsUsed()) {
    if (extension.extensionName==='EXT_meshopt_compression') extension.dispose();
  }
  await io.write(join(output,name+'.glb'),document);
  console.log('Decoded',name);
}
