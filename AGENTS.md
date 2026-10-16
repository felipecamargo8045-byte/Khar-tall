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
