# Produção de personagens sem contratar serviços pagos

Cerco dos Reis — pesquisa iniciada em 31/10/2026 e retomada em 01/11/2026.

O objetivo é obter personagens com a identidade das cartas, anatomia coerente, armadura detalhada, ataques articulados e capa em movimento. **Os pilotos desta pesquisa ainda não atingiram o acabamento solicitado.** Estes scripts ficam fora do runtime; não substituem os personagens publicados, não mudam preços, loja, áudio, regras, arena ou paleta azul-marinho/dourado.

Nenhum crédito foi comprado, plano contratado ou API paga utilizada. Gratuidade do software, disponibilidade de GPU e qualidade da arte são condições diferentes. Uma ferramenta ser aberta não torna gratuito alugar a GPU necessária para ela.

## O que foi testado

- A referência detalhada do Soldado foi recuperada dos arquivos já existentes. É uma imagem em pose neutra, não o modelo 3D. Armas devem ser feitas separadamente para não ocultar mãos e braços.
- Na sessão original, a demonstração oficial do TRELLIS.2 gerou vistas 3D com mais detalhe. A exportação GLB parou por limite de ZeroGPU. Não foi obtido um GLB nativo desse teste. A referência original com armas também causou fusão de espada e escudo.
- TripoSR executou localmente em CPU e exportou geometria real. O teste anterior tinha 23.284 vértices e 46.568 triângulos antes da divisão de UV. A forma ainda é irregular e perde detalhes da armadura.
- Blender produziu UV e mapas de cor, normal e rugosidade/metal em 2048 px. A projeção frontal é combinada com as cores laterais inferidas sobre uma malha completa. O normal é um relevo discreto derivado da pintura; não equivale a uma escultura detalhada.
- Foram preparadas cinco animações humanas CC0 do Mesh2Motion: espera, caminhada, ataque, dano e queda. O rig experimental tem 30 ossos, incluindo nove para a capa. Pesos e colisões precisam de revisão; a capa não tem simulação física.
- Na retomada, a revisão automática bloqueou uma tentativa por telemetria inesperada de uma dependência ONNX Runtime. O driver passou a configurar `ORT_DISABLE_TELEMETRY=1` antes de qualquer importação, seguindo a documentação oficial, junto com os modos offline do Hugging Face/Transformers. A geração usa os pesos e a referência locais.

Uma medição antiga de 12,7 s reutilizava códigos latentes e não representava uma geração completa. O driver atual registra `reused_scene_codes: false` e mede a execução inteira. Consulte os arquivos de procedência junto do piloto para os números reais da nova execução.

## Comparação das alternativas pesquisadas

Os estados de demos abaixo são os observados durante a pesquisa original, não uma garantia permanente de disponibilidade.

| Ferramenta | Papel possível | Gratuidade e limite constatado | Uso nesta pesquisa |
| --- | --- | --- | --- |
| [TRELLIS.2](https://github.com/microsoft/TRELLIS.2) | Geometria e materiais PBR mais detalhados | Código e pesos MIT. Instalação oficial exige GPU NVIDIA de pelo menos 24 GB. A [demo oficial](https://huggingface.co/spaces/microsoft/TRELLIS.2) tem cota. | Vistas geradas; exportação bloqueada pela cota. |
| [TripoSR](https://github.com/VAST-AI-Research/TripoSR) | Base 3D local | Código e pesos MIT. Adaptador CPU deste diretório permite extração sem extensão CUDA. | Piloto local executado. Detalhe inferior ao solicitado. |
| [TRELLIS original](https://github.com/microsoft/TRELLIS) | Reconstrução 3D | Ferramenta aberta; fluxo oficial depende de aceleração. Demo com erro de configuração durante a pesquisa. | Pesquisado, sem inferência. |
| [TripoSG](https://github.com/VAST-AI-Research/TripoSG) | Geometria com maior capacidade | Fluxo oficial exige GPU; demo pública usa ZeroGPU. | Pesquisado, sem inferência. |
| [Hunyuan3D 2 / mini](https://github.com/Tencent-Hunyuan/Hunyuan3D-2) | Geração de forma e pintura | Licença própria Tencent, com restrições territoriais e condições comerciais. Não é MIT. Demo oficial usa ZeroGPU. | Código, pesos e licença pesquisados; não adotado. |
| [Hunyuan3D 2.1](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1) | Maior definição de forma e textura | Requisitos oficiais de GPU: cerca de 10 GB para forma, 21 GB para pintura, 29 GB combinados. Licença própria. | Não executado; ambiente sem GPU. |
| [Stable Fast 3D](https://github.com/Stability-AI/stable-fast-3d) | Reconstrução com UV | Licença comunitária Stability, sujeita a condições de receita e uso. Demo em ZeroGPU. | Pesquisado. |
| [SPAR3D](https://github.com/Stability-AI/stable-point-aware-3d) | Forma guiada por pontos | Licença comunitária Stability. Demo oficial com GPU própria apresentava erro de compilação. | Pesquisado, indisponível para teste. |
| [Meshy Free](https://help.meshy.ai/en/articles/15696428-what-is-included-on-the-free-plan) | Alternativa online | 100 créditos mensais; até 10 downloads/mês de Meshy 6 Lite; CC BY 4.0 com atribuição. Download de Meshy 6/7 e API não incluídos no Free. | Pesquisado; nenhuma conta criada ou geração executada. |
| [Tripo Studio](https://www.tripo3d.ai/pricing) | Alternativa online | A página de preços marca Free como não comercial, enquanto outra página oficial fala em atribuição. A divergência precisa ser resolvida para um jogo com loja. Não confundir com TripoSR aberto. | Não usado. |
| [Blender](https://www.blender.org/) | Modelagem, UV, materiais, esqueleto e animação | Software gratuito local; não exige assinatura ou exportação paga. | 4.5.4 LTS oficial usado em CPU. |
| [Mesh2Motion](https://github.com/Mesh2Motion/mesh2motion-app) | Rigs e animações | Código MIT; biblioteca principal de rigs e animações CC0. Variações de personagens podem ter licenças específicas. | Usados somente clipes humanos CC0, não os personagens de terceiros. Há rig de raposa pesquisado para o Lobo. |
| [Mixamo](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html) | Rig automático humanoide | Gratuito com Adobe ID e permitido em jogos comerciais. Não faz rig automático do Lobo. | Pesquisado; sem criação de conta. |
| [MakeHuman / MPFB](https://www.makehumancommunity.org/about/license.html) | Anatomia e topologia humana editáveis | Ativos centrais CC0. Armaduras, cabelo e roupas específicos continuam exigindo modelagem. | Pesquisado como alternativa local para refazer anatomia. |
| [rembg](https://github.com/danielgatis/rembg) e [U2NET](https://github.com/xuebinqin/U-2-Net) | Recorte local | rembg MIT e U2NET Apache-2.0. Selecionar U2NET explicitamente, não um serviço externo. | Recorte testado na sessão original; referência recuperada já tem transparência. |
| [glTF Transform](https://gltf-transform.dev/) e [meshoptimizer](https://github.com/zeux/meshoptimizer) | Preparação dos arquivos | Ferramentas MIT locais. Compressão de arquivo não reduz automaticamente o custo de desenhar a geometria. | Descompressão dos clipes para o Blender. |

As condições dos serviços podem mudar. Nenhum limite gratuito autoriza comprar créditos, ativar plano pago ou contornar cotas com clones, outras contas ou mudanças de rede.

## Caminho para chegar à arte final

1. Manter as cartas originais como referência de identidade. Preparar vistas coerentes em pose neutra, sem armas ocultando o corpo.
2. Obter uma base melhor quando houver cota legítima no TRELLIS.2 ou refazer a anatomia localmente no Blender/MPFB. O piloto TripoSR não deve virar arte final automaticamente.
3. Modelar escudo, espada, arco, coroa e ornamentos separadamente. Revisar superfícies e contornos da armadura, não apenas a iluminação.
4. Separar a capa, corrigir topologia e pesos, criar máscaras de skin que preservem pele, ouro e metal. O classificador por cor do piloto é apenas uma primeira aproximação.
5. Adaptar os clipes, corrigir contatos de mãos e pés e colisões. Comparar frente, lado, costas e ataque com a carta.
6. Só integrar os arquivos aprovados ao provador e à batalha depois de medir desempenho no celular e preservar as proporções de cada classe.

Não foi comprovada uma ferramenta gratuita que entregue automaticamente o mesmo acabamento de um personagem final de Mobile Legends. A revisão artística é necessária; aumentar polígonos ou trocar luzes não recupera os detalhes que a geração perdeu.

## Reprodução local

Python 3.12, PyTorch CPU 2.5.1, Node 24 e Blender 4.5.4 LTS foram usados. Os scripts de textura e rig são específicos do Soldado de 1,8 m, roupa vinho e orientação TripoSR; não são um gerador universal das oito classes.

```bash
python3 -m venv /tmp/cerco-cpu
/tmp/cerco-cpu/bin/pip install torch==2.5.1+cpu --index-url https://download.pytorch.org/whl/cpu
/tmp/cerco-cpu/bin/pip install -r tools/free-character-pipeline/requirements-cpu.txt
git clone https://github.com/VAST-AI-Research/TripoSR.git /tmp/cerco-triposr
git -C /tmp/cerco-triposr checkout 107cefdc244c39106fa830359024f6a2f1c78871
/tmp/cerco-cpu/bin/python tools/free-character-pipeline/download_weights.py --out /tmp/cerco-weights
/tmp/cerco-cpu/bin/python tools/free-character-pipeline/generate_triposr_cpu.py --source-checkout /tmp/cerco-triposr --weights /tmp/cerco-weights --image /CAMINHO/referencia-transparente.png --out /CAMINHO/cpu
blender --background --factory-startup --python-exit-code 1 --python tools/free-character-pipeline/texture_reference.py -- --model /CAMINHO/cpu/soldado-cpu.glb --reference /CAMINHO/referencia-transparente.png --out /CAMINHO/textured
```

O download principal tem cerca de 1,68 GB. O utilitário fixa as revisões e verifica SHA-256. Na inferência, downloads inesperados são recusados. O código oficial permanece intacto; somente a extensão de marching cubes é substituída por uma implementação CPU do scikit-image. A telemetria é desativada antes de importar qualquer dependência, conforme [a documentação oficial ONNX Runtime](https://github.com/microsoft/onnxruntime/blob/main/docs/Privacy.md).

```bash
git clone https://github.com/Mesh2Motion/mesh2motion-app.git /tmp/cerco-mesh2motion
git -C /tmp/cerco-mesh2motion checkout ec0669b9a2258605c8df267e225cbfa64489a628
npm ci --prefix tools/free-character-pipeline --no-audit --no-fund
node tools/free-character-pipeline/decompress_clips.mjs /tmp/cerco-mesh2motion/static/assets/human/animations /CAMINHO/clips
blender --background --factory-startup --python-exit-code 1 --python tools/free-character-pipeline/rig_pilot.py -- --model /CAMINHO/textured/soldado-textured.glb --animations /CAMINHO/clips --out /CAMINHO/animated
blender --background --factory-startup --python-exit-code 1 --python tools/free-character-pipeline/render_model.py -- --model /CAMINHO/animated/soldado-animated.glb --clip Idle --frame 0 --out /CAMINHO/idle.png
```

O GLB incorpora as texturas; o `.blend` guarda as imagens empacotadas. Arquivos temporários e sessões de serviços não devem ser publicados como arte aprovada. Nenhuma chave, token ou senha é necessária para executar o piloto local depois dos downloads públicos.
