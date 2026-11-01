# Cerco dos Reis — continuidade da modelagem 3D sem custos

## Contexto recuperado da última sessão de Work (31/10–01/11/2026)

**Pedido vigente:** personagens **realmente modelados em 3D**, profissionais e fiéis às ilustrações originais, para substituir os modelos provisórios da arena **somente quando a fidelidade e as animações forem aprovadas**. Começar pelo **Soldado**. Não contratar recursos pagos, não inserir cartão, não ativar cobrança por GPU/serviço. Preservar todas as decisões anteriores: proporção de personagens, dois Soldados por carta, posição de torres e castelos, paleta e mecânica.

**Não recomeçar do zero:**
- TRELLIS.2 gerou uma **prévia de alta fidelidade** do Soldado em demonstração pública; o download GLB ficou bloqueado por **cota anônima** no Hugging Face. Não tentar contornar a cota com várias contas.
- TripoSR local já produziu um **GLB com textura**; serviu de base, mas **faltam detalhes da armadura**.
- **Blender** estava instalado no ambiente do Work.
- **Mesh2Motion** e um fluxo de armadura esquelética já geraram movimentos de **espera, caminhada, ataque, dano, queda e capa**; continuam pendentes deformações, rig e acabamento.
- Esta branch foi criada para a modelagem profissional. O **GLB intermediário do Work não foi localizado no GitHub** em 01/11/2026. Recuperar primeiro do diretório/artefatos da sessão Work, em vez de substituir por geração mais fraca.

## Ferramentas avaliadas (software gratuito ≠ GPU gratuita garantida)

| Prioridade | Ferramenta | Para quê | Custo e restrições reais | Oficial |
|---|---|---|---|---|
| 1 | **Blender + Rigify** | Detalhar/esculturar placas, cotas, luvas, elmo/capuz, UV, textura e corrigir pesos das juntas | Software gratuito e local; processamento no computador disponível | https://www.blender.org / https://docs.blender.org/manual/en/latest/addons/rigify/ |
| 2 | **TRELLIS.2** | Reconstrução mais fiel a partir da arte, materiais PBR | Modelo MIT; requer GPU Nvidia ≥24 GB local; demo pública pode ter cotas, sem garantia de exportação | https://github.com/microsoft/TRELLIS.2 |
| 3 | **Hugging Face Spaces ZeroGPU** | Usar demos públicas existentes quando gratuitas | Uso gratuito com quotas e filas por dia; não há garantias de disponibilidade; não comprar créditos | https://huggingface.co/docs/hub/spaces-zerogpu |
| 4 | **Hunyuan3D-2.1** | Comparação de forma/geração de texturas PBR | ~10 GB VRAM forma; ~21 GB textura; licença própria da Tencent deve ser verificada antes da distribuição comercial | https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1 |
| 5 | **InstantMesh** | Reconstrução alternativa para comparação de proporções/geometria | Apache 2.0, processamento pode precisar de GPU; demonstrador gratuito sujeito à disponibilidade | https://github.com/TencentARC/InstantMesh |
| 6 | **TripoSR** | Preservar GLB inicial e servir de fallback para geometria | Código e pesos MIT; a versão gerada já demonstrou pouca fidelidade aos detalhes, portanto NÃO publicar como arte final | https://github.com/VAST-AI-Research/TripoSR |
| 7 | **Mesh2Motion** | Vincular animações a rig humanoide e exportar GLB animado | Código MIT, animações/ativos CC0; verificar pesos e deformações na própria malha | https://mesh2motion.org/ |
| 8 | **Blender Rigify / weights** | Refinar juntas/capa após auto-rig | Gratuito; solução de defeitos de cotovelos, joelhos, ombros e túnica | https://docs.blender.org/manual/en/latest/addons/rigify/ |
| Reserva | **Stable Fast 3D** | Reconstrução alternativa onde houver acesso gratuito | Licença comunitária, uso comercial condicionado a regras específicas; não contratar API paga | https://github.com/Stability-AI/stable-fast-3d |

**Google Colab gratuito:** pode disponibilizar GPU, mas a disponibilidade, duração e VRAM não são garantidas. Jamais configurar plano pago automaticamente, burlar limites ou executar um serviço Web hospedado em desacordo com os termos. Fonte: https://research.google.com/colaboratory/faq.html

## Procedimento obrigatório para o Soldado

1. **Recuperar os artefatos existentes do Work**: GLB TripoSR, imagens de referência, prévia TRELLIS.2, arquivos Blender, GLB animado e relatórios; catalogar o que realmente existe. Não afirmar que arquivos estão presentes sem verificar.
2. **Verificar referências visuais**: `cerco-dos-reis/origem-apk/assets/khar_tall_aprendiz_soldado.png`, `portrait_aprendiz_soldado.webp` e a imagem de pose neutra criada no Work. **A pose neutra não deve modificar o desenho/identidade do Soldado**.
3. **Melhorar sobre o modelo existente, não gerar personagem genérico**. Comparar silhueta, proporções, capuz/elmo, espada, escudo, luvas, detalhes metálicos, tecidos, botas e cores em pelo menos frente, perfil, costas e perspectiva de arena. Não inserir acessórios sem referência.
4. Se faltar geometria, **comparar** TRELLIS.2 / Hunyuan3D / InstantMesh em acesso 100% gratuito. Escolher a malha mais fiel, não apenas a que gere mais rápido. Se cota ou GPU impedir exportar, **não presumir sucesso**; continuar aprimorando TripoSR no Blender.
5. No **Blender**: retopologia onde necessária; modelar peças rígidas da armadura separadamente; preservar regiões móveis para deformação; bake de normal/AO; atlas UV com materiais PBR sem texturas borradas. Manter o peso razoável para renderização WebGL/Android.
6. **Rig e animações**: manter seis sequências (idle, walk, attack, hurt, death, cape); conferir sem clipping ao menos em ombro, cotovelo, quadril, joelho, capuz e capa. Importar/retocar via Mesh2Motion/Rigify; exportar GLB com skins e animações embutidas.
7. **Checagem automática**: executar `python3 cerco-dos-reis/modelos-3d/validar_glb.py /caminho/soldado-final.glb`, complementada por inspeção visual em Blender/Three.js.
8. **Aceitação**: modelo deve lembrar a carta original de imediato, conter detalhes da armadura reconhecíveis, renderizar de frente e em ângulo na arena, ter malha 3D real e movimentos sem deformações graves; personagem e castelos mantêm as proporções já aprovadas. Se a qualidade não atingir o padrão, **não substituir modelos no jogo público**.
9. Só após aprovação do Soldado, preparar o Arqueiro, Batedor, Colosso, Guardião, Rei, Liliti e Lobo (rig quadrúpede específico), respeitando suas identidades. **A carta de Soldados continua invocando duas unidades**.

## Limites de publicação e cobrança

- **Custo autorizado: R$ 0.** Nada de serviços pagos, assinaturas, instâncias cobradas, trials que cobram depois, cobrança por API/tempo de GPU ou upgrades de plano.
- A branch de trabalho é `cerco-modelos-profissionais-20261101`. **Não substituir** o projeto publicado e não modificar as cores, os preços, a batalha, a IA ou a jogabilidade.
- A loja de skins, Liliti e demais recursos permanecem exatamente como aprovados.
- Após concluir, publicar um **arquivo GLB real verificável**, comparativo de quatro vistas, vídeo das animações e relatório das licenças antes de integrar ao jogo.

## Estado verificável em 01/11/2026

A branch existe no GitHub, mas **ainda não contém o GLB do Soldado** gerado na sessão Work. Este documento consolida a investigação e define execução, não equivale a um modelo produzido nem a exportação bem-sucedida.
