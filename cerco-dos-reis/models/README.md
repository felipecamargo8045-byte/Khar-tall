# Soldado articulado — revisão de trabalho

`soldado-refinado.glb` é a malha do provador: 60.932 triângulos, 2.832.492 bytes. `soldado-refinado-campo.glb` preserva o mesmo esqueleto e clipes com 17.059 triângulos e 1.316.560 bytes. Ambos têm 75 juntas, dez primitivas e os clipes Idle, Walk, Attack, Hit e Death.

A fábrica usa o modelo após carregar o arquivo local. Cada tropa recebe ossos e materiais próprios; a geometria permanece compartilhada. As skins atingem somente materiais com `skin_region: cloth`. Sem arquivo carregado, o modelo articulado anterior continua disponível. Não há consulta a serviço de geração durante o jogo.

A integração visual não altera mana, dano, alcance, quantidade de Soldados, compras ou propriedade de skins. O clipe Death está disponível no arquivo; o motor atual remove a unidade derrotada imediatamente. Os demais sete personagens conservam os modelos existentes.

O acabamento é uma revisão de trabalho. A capa usa animação por ossos, sem simulação física de colisão. O teste local cobre estrutura, clipes, esqueletos independentes, roupas e poses. A conferência completa no navegador e o desempenho em um Android real ainda estão pendentes. Esta revisão não declara equivalência ao acabamento de Mobile Legends.

## Fontes e direitos

- Corpo, esqueleto e animações: [Mesh2Motion](https://github.com/Mesh2Motion/mesh2motion-app), revisão `ec0669b9a2258605c8df267e225cbfa64489a628`, ativos centrais CC0. Licença em `licenses/Mesh2Motion-CC0.md`.
- Cabeça adulta e morfologia masculina: ativos centrais [MakeHuman](https://github.com/makehumancommunity/makehuman), CC0. Licença em `licenses/MakeHuman-CC0.md`. Os arquivos de entrada exatos e seus hashes ficam no pacote de refino.
- Armadura, capuz, capa, acabamento e adaptação: modelagem local do projeto, em Blender 4.5.4 LTS.
- Espada e escudo: modelagem do piloto do próprio projeto, preservada na cena editável.
- Leitor glTF e clonagem: Three.js r169, licença MIT em `../vendor/THREE-LICENSE.txt`.

Cena editável, entradas, prévias, vídeo, procedência e avaliação em `tools/free-character-pipeline/refined/soldado-refinado-pacote.zip`. O script de reconstrução é `tools/free-character-pipeline/refine_knight.py`.

## Verificação local

```bash
node cerco-dos-reis/tests/native-characters.mjs
node cerco-dos-reis/tests/presentation.mjs
node cerco-dos-reis/tests/liliti.mjs
python tools/free-character-pipeline/validate_asset.py cerco-dos-reis/models/soldado-refinado.glb cerco-dos-reis/models/soldado-refinado-campo.glb
```
