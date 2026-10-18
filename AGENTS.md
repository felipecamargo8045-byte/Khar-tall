# Orçamento do projeto

O usuário exige **R$ 0 de novas cobranças**, agora e nos próximos meses. Isso é uma restrição do projeto Khar Tall.

- Use somente planos gratuitos sem conversão automática para planos pagos. Não compre créditos, não ative recarga automática nem contrate serviços, domínios, discos, backups, geração de mídia ou APIs pagos.
- Não transforme uma interrupção por limite gratuito em contratação paga. Preserve dados, explique o limite e procure uma alternativa gratuita.
- Não confunda `plan: free` do servidor com proteção de cobrança da conta: Render também pode cobrar excesso de tráfego e compilações se houver meio de pagamento. Verifique o painel; um alerta de gasto não é um bloqueio.
- Mantenha o Neon no plano Free, com os limites de consumo documentados em CUSTOS_E_LIMITES.md. Não ative processamento na branch de testes sem necessidade.
- A mídia do jogo é versionada e servida pelo próprio projeto. Não há API de geração de imagem, som, vídeo ou IA durante o uso do jogo. A IA adversária executa no navegador.
- Não reduza a qualidade das artes ou dos áudios para economizar tráfego. Prefira compressão sem perda, revalidação HTTP e cache. Preserve o multiplayer, as contas e as regras canônicas.
- Não prometa gratuidade ilimitada ou permanente de serviços de terceiros. Se controles de cobrança estiverem inacessíveis, registre a pendência com clareza.

Código e mídia deste projeto são preservados pelo repositório Git; não duplique o repositório na Library.

## Loja opcional (autorização de 15/10/2026)

O usuário autorizou vendas físicas e digitais. Em 16/10/2026 escolheu o Checkout Integrado da InfinitePay, com a InfiniteTag `consultorcamargo`, **sem cobrança quando não houver vendas**. São permitidas as tarifas por transação do próprio provedor; não são permitidas mensalidades, assinaturas, máquinas, antecipação contratada ou pacotes pagos. A integração usa compras avulsas, sem recorrência. Não invente taxas. A InfinitePay informa Pix sem tarifa no Checkout Integrado; cartão tem tarifas por venda conforme o plano escolhido pelo próprio usuário. Não faça compras reais para testar.

O usuário confirmou a conta de jogador **Victoryno** (`victoryno` no banco) como administradora em 16/10/2026. `STORE_ADMIN_USERNAMES=victoryno` foi aplicado no serviço existente. Não conceda administração ao primeiro cadastro, a nomes parecidos nem a contas inferidas do GitHub. A InfiniteTag de recebimento é `consultorcamargo`, confirmada pelo usuário; não inferir a conta financeira do nome no jogo. Alterações posteriores da InfiniteTag no painel exigem a senha do jogo. Nenhuma senha da InfinitePay é solicitada. `STORE_SETTINGS_KEY` e outros segredos ficam fora de APK, Git e chat.

A chave de assinatura Android e sua senha ficam fora do repositório; preserve o backup privado para permitir atualizações do mesmo aplicativo. Não contrate cadastro pago de desenvolvedor. Entregue a opção PWA como instalação sem cadastro pago e explique as condições atuais do Android quando forem relevantes.


## Skins (16/10/2026)

- As 16 skins alteram roupas, nome público do jogador e identificação do próprio time. Preço fixo: R$ 2,50 por skin, no servidor e no catálogo. Não alteram regras ou vantagens.
- O vermelho e o azul padrões pertencem aos visuais gratuitos. As opções pagas dessas famílias usam coral claro, vinho escuro, azul-gelo claro e azul-noite escuro, com tons de roupa distintos dos padrões. Preserve os IDs de skins/produtos e as compras ao ajustar nomes ou cores. Não aplique a sobreposição vermelha/azul padrão sobre roupas com skin equipada.
- Em 16/10/2026, o usuário aceitou explicitamente abrir as vendas com Pix e cartão de crédito sem restrição por valor no Checkout Integrado da InfinitePay. Pediu que não haja aviso sobre valor mínimo. Não anuncie débito, que não é documentado para este checkout.
- A venda das skins segue o controle geral de abertura da loja, com recebimento conectado, banco persistente e informações de atendimento preenchidas. Não gere cobrança para depois negar a skin por causa do meio de pagamento. Testes usam apenas respostas simuladas, sem cobrança real.
- A propriedade e a skin equipada são verificadas no servidor; reembolso revoga o uso. Preferências de skin e tabuleiro são separadas. Dados públicos do multiplayer incluem somente nome e skin verificada, sem identificadores privados.

## Frete e avisos (17/10/2026)

- O usuário autorizou pesquisar e integrar o cálculo de frete antes do catálogo físico. Não cadastre produtos físicos sem a aprovação dele.
- Cotações usam Melhor Envio, inicialmente PAC/SEDEX, com CEP real de postagem e token configurados no painel. Nunca invente CEP, peso, medidas ou prazo de preparação. Não compre etiquetas, adicione saldo ou ative pacotes automaticamente.
- O frete mostrado antes do pagamento vem de cotação assinada, vinculada ao CEP, quantidade, produto e conta, válida por 15 minutos. Falha de cotação deve impedir pagamento físico, sem fallback para frete grátis. Preserve as skins sem frete.
- Aceite da loja e postagem são eventos separados do pagamento. Registrar envio exige aceite anterior e rastreamento. Ambos geram mensagens privadas em Meus pedidos. Não prometa e-mail sem a conexão ativa.
- Brevo é opcional e deve permanecer em plano gratuito sem recarga ou contratação. Use remetente verificado e limite local de 250 tentativas/dia; falhas não apagam os avisos da conta. Nenhum SMS, WhatsApp pago, cron ou novo serviço foi contratado.
- O Android inclui a interface da loja: atualizações desta interface precisam de novo APK com a mesma assinatura e novo cache da PWA. A versão publicada no download deve corresponder ao package.json.

## Guardião — confirmação de 18/10/2026

- O ataque ao redor alcança até 2 casas a partir da posição da peça, incluindo diagonais, com bloqueio por aliados. Pode atingir no máximo 2 inimigos por ação.
- O ataque em linha continua a até 5 casas na horizontal ou vertical, parando na primeira peça. O movimento do Guardião permanece livre nas 8 direções, sem atravessar peças.
- A Cópia Real usa os mesmos alcances e limites da técnica copiada. As indicações de alcance devem ser claras no jogo local, IA, online e Android.

## Tutorial de ações especiais — 18/10/2026

- Cada ação especial deve ter explicação de condição, uso, efeito e limites, acessível pelo índice do tutorial. Preservar os seis exercícios práticos e o salvamento real.
- Consultar o tutorial ou o índice pausa somente o cronômetro local; não prometer pausa de uma sala online autoritativa.

- Em 18/10/2026, o usuário pediu que todos os personagens, incluindo o Colosso, apareçam e que cada habilidade seja mostrada individualmente. O tutorial tem índice por personagem, etapas separadas, oito cópias do Rei e artes originais abertas. Preserve o acesso pelo menu, o percurso sequencial, os links diretos e o retorno dos exercícios sem sobrescrever a partida.
