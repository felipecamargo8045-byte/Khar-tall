# Khar Tall

Jogo de estratégia do universo **Ecos da Chama: O Último Victorino**, criado por Victoryno.

- [Portal oficial](https://khar-tall-online.onrender.com/portal): início, modos de jogo, guia, aplicativo, loja e conta.
- [Jogar online](https://khar-tall-online.onrender.com/online): salas privadas para duas pessoas.
- [Jogo local e IA](https://khar-tall-online.onrender.com/): dois jogadores no mesmo dispositivo ou adversário controlado pelo jogo.
- [Minha conta](https://khar-tall-online.onrender.com/conta): cadastro opcional, login, recuperação por código e exclusão.

## Desenvolvimento

Node.js 22.13 ou superior.

```sh
npm ci
npm test
npm start
```

Abra `http://127.0.0.1:8765`. Sem credenciais, as partidas locais de desenvolvimento usam SQLite. Em produção, `ACCOUNTS_DATABASE_URL` aponta para o PostgreSQL externo já usado pelas contas. As salas também usam esse banco e sobrevivem a reinícios do servidor. Nenhum dado pessoal nem segredo deve ser commitado.

## Publicação

O serviço Render existente acompanha a branch `main`. Seu comando de build `node deploy-restore.js` instala o lockfile e valida as fontes versionadas. As fontes nunca são substituídas durante a compilação. Artes e áudios são extraídos separadamente de um pacote imutável com checksum; o extrator aceita somente recursos de mídia. Inicialização: `node server.js`.

Variáveis: `HOST=0.0.0.0`, `NODE_ENV=production`, `TRUST_PROXY=true`, `ACCOUNTS_DATABASE_URL` como segredo e `ENABLE_ACCOUNT_REGISTRATION=true`. O código mantém a hospedagem gratuita e não exige disco persistente do Render. Configure `/api/health` como health check.

O orçamento do projeto é **R$ 0**. [CUSTOS_E_LIMITES.md](CUSTOS_E_LIMITES.md) registra os planos verificados, os limites de consumo aplicados e a conferência de cobrança informada pelo criador no painel do Render. Plano Free da instância não bloqueia sozinho cobranças por excedentes quando há cartão cadastrado. Os arquivos estáticos usam compressão sem perda e ETag para reduzir tráfego, mantendo os mesmos recursos e a mesma qualidade.

`migrations/001_online_rooms.sql` cria de forma aditiva a tabela de salas. Não altera nem substitui contas existentes. O servidor aplica essa migração ao iniciar, depois de preparar a autenticação. Os testes de migração e integração devem usar uma branch separada do banco. Para testar as contas: `ACCOUNTS_DATABASE_URL=... node tests/test_auth_e2e.js`.

## Comportamento

Cada turno e preparação dura 60 segundos. O relógio é validado pelo servidor e continua durante ausências. O servidor mantém a regra autoritativa e envia apenas as armadilhas de cada jogador. Solicitações concorrentes usam revisão de estado e atualizações transacionais. Reabrir o convite reconecta o mesmo navegador; quem entrou com conta pode retomar a sala por outro dispositivo.

Contas são opcionais. A recuperação exige o código apresentado no cadastro. Salas são retidas por 30 dias; a exclusão de conta encerra suas sessões e desvincula suas salas. O modo convidado conserva acesso por cookie durante 14 dias. A instância gratuita pode hibernar; a primeira abertura pode demorar enquanto ela desperta.

O rito de início foi removido. Todos os Lobos usam a mesma gravação real de uivo. O motor de combate não foi modificado nesta revisão de publicação.

## Verificação

`npm test` valida regras canônicas, multiplayer, sigilo de armadilhas, autorização, revisões concorrentes, persistência e reinício. Com `ACCOUNTS_DATABASE_URL` de uma branch de testes, também valida cadastro, login, recuperação, exclusão e retomada da sala por conta. `npm run build` verifica a sintaxe, os arquivos e todos os recursos referenciados.

## Áudio revisado

Os 14 WAVs que não receberam substituição são preservados byte por byte. `audio.js` fornece o mesmo carregamento, volume relativo e agendamento nos modos local/IA e online. Todos os Lobos, dos dois lados, usam um único trecho de uivo real no ataque e na morte por combate; a cópia do Rei usa o mesmo arquivo. Rosnado, mordida e o antigo uivo sintetizado deixaram a lista de sons ativos. Uma ação que inclui ataque de Lobo e queda de outro Lobo toca apenas um uivo.

O uivo vem de **Wolf howls**, do U.S. Fish and Wildlife Service, disponível no [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Wolf_howls.ogg) como domínio público (PD-USGov-FWS). O trecho de 20,05 a 23,65 segundos mantém o tom e a velocidade originais, com corte, filtro leve, volume e fades. `audio-assets/manifest.json` registra origem, tratamento e checksum; o WAV em Base64 é restaurado e verificado no build, sem depender do site externo em produção.

Na versão 3.4.3, o impacto da espada usa uma batida curta e nítida entre lâminas, o ataque em linha do Guardião usa ventania com eco discreto e a queda do Guardião original usa uma trombeta militar de aviso. Esses três sons são compartilhados entre jogo local/IA e online, incluindo habilidades copiadas.

Fontes dos novos efeitos:

- **Espadas:** [20 Sword Sound Effects (Attacks and Clashes)](https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes), de [StarNinjas](https://opengameart.org/users/starninjas), arquivo `sword_clash.2.ogg`, CC0 1.0. Corte e amortecimento da cauda metálica.
- **Ventania:** [Short wind sound](https://opengameart.org/content/short-wind-sound), de remaxim, CC0 1.0. Corte, leve alteração de velocidade e eco curto sem tons eletrônicos.
- **Trombeta de aviso:** [Attention](https://commons.wikimedia.org/wiki/File:Attention.mp3), do U.S. Army, domínio público (PD-USGov-Military). Toque real de aviso, com silêncio inicial e final removidos.

O manifesto registra origem, licença, processamento e checksum de cada recurso substituído. Os efeitos aguardam o carregamento do arquivo real; não há imitação sintetizada de ataques durante o primeiro carregamento. Desligar o som interrompe também efeitos agendados. Um limitador controla a soma de efeitos simultâneos. Armadilhas anulam o som do ataque bloqueado e as pisadas da Investida correspondem à distância efetivamente percorrida. Vitória, perda do Rei e perda do Guardião seguem prioridade musical para evitar motivos conflitantes.

## Aplicativo Android e loja (3.5.1)

- [Instalar](https://khar-tall-online.onrender.com/instalar) — APK e PWA.
- [Loja](https://khar-tall-online.onrender.com/loja) — catálogo físico/digital, pedidos e coleção por conta.
- [Painel da loja](https://khar-tall-online.onrender.com/painel-loja) — exclusivo da conta administradora explicitamente confirmada.

O APK usa uma WebView restrita à origem HTTPS do jogo; páginas, artes e sons são empacotados. APIs e sessões permanecem na origem atual, sem CORS aberto ou segredos no aplicativo. Checkout externo abre no navegador; App Links de retorno usam o certificado em `assetlinks.json`. Apenas a permissão INTERNET é solicitada. `scripts/build-android.py` produz e verifica assinaturas v2/v3 e compara os bytes de todos os recursos empacotados. A chave privada de assinatura não é versionada.

Sem emulador ou aparelho Android neste ambiente: a compilação, assinatura e integridade foram verificadas, mas a instalação e reprodução de áudio no aparelho precisam de conferência real.

Para reconstruir: fornecer `--tools` com Android SDK platform 36, build-tools 36.0.0 e Eclipse ECJ 3.38.0; fornecer `--signing-dir` com a chave privada preservada; executar `python scripts/build-android.py --tools CAMINHO --signing-dir CAMINHO_PRIVADO --output downloads/khar-tall-3.5.1.apk`. Dependências de compilação são gratuitas e vêm dos distribuidores oficiais. Não gere uma nova chave para uma atualização.

A loja usa o PostgreSQL existente em produção e SQLite apenas no desenvolvimento. A criação das tabelas é aditiva, em `store-db.js`. Configurar `STORE_ADMIN_USERNAMES` somente com o usuário confirmado pelo criador; `STORE_SETTINGS_KEY` é um segredo aleatório de 32 bytes representado por 64 dígitos hexadecimais. Com o painel autorizado, o próprio criador conecta o Mercado Pago e sua assinatura de Webhooks. Nunca enviar credenciais no chat. `PUBLIC_BASE_URL` mantém os retornos na URL canônica.

Compras são avulsas. O servidor calcula valores; notificações exigem HMAC válido e leitura autenticada do pagamento. Valor, moeda, conta recebedora, modo de teste/produção e referência do pedido são conferidos antes da liberação. Repetições não duplicam a entrega; reembolso/chargeback retiram o acesso digital. Visuais alteram somente a aparência. Vendas físicas guardam dados de entrega em pedidos privados. Nenhum cartão é armazenado. Produtos e condições comerciais ainda precisam ser cadastrados pelo proprietário; o catálogo inicial está vazio.

`tests/test_store.js` usa um provedor simulado e verifica autorização, CSRF, criptografia, preço, frete, assinatura, divergências, reenvio, reembolso, entrega e reinício sem fazer transações reais.

### Atualização 3.5.1

Toques discretos na escolha de modo, dificuldade, botões e peças; colocação de armadilhas com retorno sonoro. A preparação mostra o aviso breve “Coloque suas armadilhas” e uma confirmação destacada com contagem, fixa acima da navegação no celular. A tela de privacidade continua ocultando as armadilhas na troca de jogador; no online, somente o jogador que está preparando vê o aviso e a confirmação. Os novos sons respeitam a preferência de áudio.

## Portal oficial

`/portal` é a entrada do portal de Victoryno. `/jogar` serve exatamente a mesma interface de `/`: não recria motor, contas ou banco. A raiz permanece disponível para preservar o APK 3.5.1 e os atalhos existentes. Não há iframe, proxy de login, CORS aberto ou remoção de `X-Frame-Options: DENY`. Partidas e preferências mantêm suas chaves de armazenamento na mesma origem.

Os atalhos `?abrir=ia`, `tutorial`, `regras` e `compendio` abrem as telas existentes quando não há uma partida pendente; o convite para retomar uma partida salva tem prioridade. `/loja#owned` e `/loja#orders` abrem coleção e pedidos. O cadastro/login aceita retorno somente para rotas locais autorizadas, incluindo `/portal` e `/jogar`.

O portal consulta catálogo, identidade e metadados do APK nas APIs atuais. O link do APK continua apontando para o binário original, com o mesmo hash e certificado. O portal não cria outra conta de administrador: somente `STORE_ADMIN_USERNAMES`, indicado pelo criador, autoriza a gestão. A publicação pelo Sites mantém uma entrada que encaminha à origem canônica; nenhuma credencial ou sessão é retransmitida entre domínios.

### Atualização 3.5.2

Créditos públicos: Victoryno. O ataque em linha do Guardião alcança até 5 casas na horizontal ou vertical, para na primeira peça e só atinge o primeiro inimigo. A Cópia Real desse ataque obedece ao mesmo limite. O movimento do Guardião e seu ataque em área mantêm as regras anteriores. Jogo local, IA, servidor online e APK usam o mesmo motor atualizado; a assinatura Android original é preservada. O tutorial usa a arte oficial da peça e o texto atualizado, em lugar da ficha antiga que descrevia alcance até a borda.

### Atualização 3.5.3 — privacidade das armadilhas

A visão das armadilhas é independente do exército que joga. Contra o computador, a interface mostra apenas as armadilhas dos Rubros (jogador humano), inclusive quando os Azuis começam, durante a jogada e animações da IA e ao retomar uma partida. No modo local, nenhuma armadilha aparece durante a troca de jogador; o novo lado só é revelado depois de confirmar que recebeu o aparelho. O contador também respeita a visão do jogador. Armadilhas ativadas continuam produzindo os efeitos previstos. No online, o servidor continua enviando somente as armadilhas da conta/lado autorizado. O APK 3.5.3 inclui a mesma correção, preservando assinatura, dados locais, artes e áudios.

`tests/test_trap_visibility.js` executa a interface real com DOM simulado, testa a preparação, sorteio, cada reconstrução do tabuleiro, animações, passagem de turno e retomada. O teste reproduziu a falha anterior e passa com a correção.


### Atualização 3.5.4 — InfinitePay

O Checkout Integrado InfinitePay substitui o Mercado Pago nas novas compras quando `STORE_PAYMENT_PROVIDER=infinitepay`. Configure `INFINITEPAY_HANDLE` com a InfiniteTag confirmada do vendedor e mantenha `STORE_SETTINGS_KEY` como segredo hexadecimal de 32 bytes. A conta administradora confirmada é `victoryno`; o recebimento confirmado é `consultorcamargo`. A tag é uma identificação pública, não uma credencial bancária.

O servidor calcula preços e entrega em centavos e cria o link oficial com referência exclusiva do pedido. Notificações usam um token por pedido derivado do segredo do servidor. Tanto a notificação quanto o retorno do comprador precisam passar pela API `payment_check`, que recebe a conta original, pedido, transação e fatura. Valores, forma de pagamento, referências e unicidade da transação são verificados antes de liberar o item. O provedor de cada pedido fica identificado em `merchant_id` (`infinitepay:<handle>`); não houve mudança de esquema ou migração destrutiva. Pedidos antigos do Mercado Pago mantêm sua reconciliação com as configurações anteriores.

A documentação pública consultada em 16/10/2026 descreve confirmação de aprovação, sem contrato documentado de eventos de estorno/chargeback. Por isso reembolsos financeiros são feitos pelo criador no aplicativo InfinitePay; depois, o painel permite registrar o reembolso/contestação com nova autenticação e revoga o acesso digital. Um aviso antigo não reativa um pedido cancelado. A loja continua exigindo produtos, contato, condições e abertura explícita pelo administrador para iniciar vendas. Não há mensalidade da integração, assinaturas ou chamadas reais de pagamento nos testes.

Os testes `tests/test_infinitepay.js` cobrem valores adulterados, notificações falsas, consultas independentes, repetições e concorrência, transação usada em dois pedidos, isolamento por conta, atualização da InfiniteTag sem redirecionar pedidos antigos, entrega digital, reembolsos, reinício e URLs permitidas. O Android 3.5.4 mantém a assinatura original e inclui o mesmo fluxo de loja.

Documentação oficial: https://www.infinitepay.io/checkout-documentacao

## Android 3.6.1

Inclui as variações coral, vinho, azul-gelo e azul-noite, mantendo os IDs das compras. O instalador assinado está preservado em partes Base64 em `android-releases/3.6.1`. `node scripts/restore-android.js` recompõe os bytes e confere tamanho e SHA-256 antes dos testes e da publicação. A chave privada de assinatura permanece fora do repositório.

## Versão atual — 3.10.0

- `learning.js` define 58 exercícios jogáveis com o mesmo motor: movimentos dos sete personagens, todos os tipos de ataques, resgates, reações, cópias do Rei, campos e vitória. Exercícios não substituem o salvamento; o retorno restaura a partida anterior.
- Local e IA oferecem treino sem tempo ou preparação/turnos de 60 segundos. O ritmo é salvo com a partida. O online continua autoritativo e com 60 segundos.
- O cronômetro local pausa em segundo plano; a IA é interrompida e retomada com a página. A condição de vitória e a perseguição de três turnos ficam acima do tabuleiro nos dois modos de interface.
- O contador informa peças presentes (16 iniciais, até 20 por invocação). O Guardião original mantém borda dourada e símbolo independente das skins.
- O menu prioriza aprender/jogar e reúne prévias de som nas configurações. O tutorial abre no índice dos sete personagens e separa cada habilidade. As artes dos personagens aparecem abertas. O portal exibe a posição inicial a partir do motor e identifica InfinitePay consistentemente.
- O APK 3.10.0 preserva assinatura, conta e arquivos de mídia; o aviso de atualização é opcional, sem instalação automática. O cache completo da PWA abre o jogo preparado sem esperar o servidor e exclui APIs privadas.
- Desenvolvimento e infraestrutura desta entrega: R$ 0 de novas contratações. As tarifas por venda da loja continuam conforme autorização do criador. Limites e pendências: `CUSTOS_E_LIMITES.md`.
- Verificação: `node scripts/check.js` e `ACCOUNTS_DATABASE_URL= DATABASE_URL= node tests/run.js`. O teste em celular físico, usabilidade com novos jogadores e equilíbrio real não são comprovados por essa suíte; roteiro em `VALIDACAO_MANUAL.md`.

## Atualização 3.10.0 — tutorial jogável completo

O modo **Aprender jogando** reúne 58 exercícios e começa cada cenário com as peças posicionadas. O movimento de cada um dos sete personagens destaca todos os destinos legais: basta escolher um, sem percorrer todas as casas. Os ataques e especiais têm exercícios separados, repetindo o personagem quando necessário. Um contorno tracejado mostra o alcance da técnica; as cores fortes indicam opções reais na posição, calculadas pelo motor.

O percurso inclui espada com e sem avanço, flechas a uma e duas casas, evoluções, marcação, execução, execução contra Rei, combinação do Batedor, salto e mordida do Lobo, repouso, armadilhas, resgates comuns e de emergência pelos dois aliados, Investida, Esmagamento, interrupções, Investida defensiva, dois ataques do Guardião, explosão do Rei e dez exercícios de técnicas copiadas. Reação Real oferece prática de movimento, contra-ataque, magia durante paralisia e interposição. Os campos ensinam cura, sacrifício do Guardião original, as duas invocações, seis escolhas de transformação, reunião e recusa do poder. Evolução e ativação adicional no destino usam os fluxos reais.

O tabuleiro permanece visível após a ação, permitindo ver animação e resultado. Os controles permitem repetir, voltar, avançar e escolher pelo índice de personagens. `/jogar?abrir=aprender&licao=colossus-smash` abre a sequência de Investida e Esmagamento. Os cenários e salvamentos são isolados; sair restaura a partida anterior. Não foram alteradas regras do motor, contas, loja ou serviços. Os seis temas práticos originais e o tutorial de referência permanecem. Os testes executam todos os 58 exercícios pela interface, verificam efeitos reais, escolhas, índices, links, limites, salvamentos e cronômetros. APK/PWA 3.10.0 usam a assinatura original e a infraestrutura existente.

## Atualização 3.9.1 — habilidades de cada personagem

O tutorial abre com acesso direto aos sete personagens, inclusive o Colosso, e mostra 39 explicações individuais de movimento, ataques e poderes. Cada personagem tem seu próprio índice e navegação sequencial. O Rei apresenta separadamente as oito técnicas copiáveis, além de movimento, explosão, vidas, Cópia Real, Reação Real, impedimentos e resgate. As artes originais aparecem abertas; os esquemas temáticos gerais continuam opcionais.

O percurso completo tem 60 etapas e preserva as 21 explicações anteriores. Os seis exercícios práticos continuam disponíveis; ao terminá-los, há um acesso ao tutorial de todos os personagens. O link `/jogar?abrir=tutorial&personagem=colossus` abre diretamente o Colosso sem substituir a partida salva. Os testes conferem cada personagem e habilidade por índice e em sequência, a visibilidade da arte, os links, o relógio local e os salvamentos. APK 3.9.1 e cache PWA sincronizados, com o certificado original e a infraestrutura existente.

## Atualização 3.9.0 — Guardião e ações especiais

A regra atual do ataque ao redor do Guardião é alcance de até 2 casas, inclusive diagonais, e no máximo 2 alvos por ação. A cópia do Rei, seleção local/online, IA e validação do servidor seguem os mesmos limites. O ataque em reta mantém 5 casas e o movimento da unidade permanece livre. O índice do tutorial reúne 21 explicações de ações especiais com condições, uso e limites, além das dez páginas básicas. Os seis exercícios práticos continuam disponíveis.

O tutorial explica armadilhas, campos e recarga, evolução, Cura Real por sacrifício, invocação, transformação, reunião, Investida, Esmagamento, Investida defensiva, salto do Lobo, Resgate Real, marcação, execução, segundo ataque, dois ataques do Guardião, Cópia Real, Reação Real, avanço após ataque e encerramento do turno. O índice permite acesso direto e pausa o cronômetro local sem alterar o salvamento. `tests/test_tutorial.js` exercita a navegação e preservação da partida; `tests/test_guardian_area.js` cobre 2/3 casas, dois alvos, IA, cópia, seleção e servidor.

APK 3.9.0 e cache PWA sincronizados com certificado original, mantendo a infraestrutura existente.

## Atualização 3.8.3 — seleção do ataque ao redor

A seleção local mantém o alvo inicial marcado, tal como no online. Os três alvos destacados correspondem aos atingidos; duplicatas, um quarto alvo ou uma casa fora do raio não ampliam o golpe. Os testes exercitam cliques na interface real para o Guardião e para a cópia do Rei, além da validação do servidor. O raio continua em 3 casas e a reta em 5; APK e PWA sincronizados em 3.8.3.

## Atualização 3.8.2 — Guardião

O ataque ao redor mantém o alcance de até 3 casas a partir da peça, incluindo diagonais e bloqueios por aliados. As telas local, online, tutorial, compêndio e cópia do Rei agora explicitam esse alcance. O ataque em reta continua com 5 casas e para na primeira peça; o movimento permanece livre.

O motor também limita a seleção a três inimigos incluindo o alvo inicial, mesmo quando uma lista enviada manualmente omite esse alvo, inclui duplicatas ou inimigos fora do raio. `tests/test_guardian_area.js` verifica os limites 3/4 nas oito direções, cópia do Rei, bloqueios e requisições online; os testes da reta 5/6 continuam obrigatórios. APK 3.8.2 e cache PWA atualizados, com certificado original e sem nova infraestrutura.

## Atualização 3.8.1 — 18/10/2026

A conexão de consulta do Melhor Envio foi ativada no serviço existente, com origem no CEP 13402-770 e token restrito a `shipping-calculate`. Nenhum segredo é incluído no código ou no aplicativo. O portal, a instalação, o cache da PWA e o APK estão sincronizados na versão 3.8.1, mantendo o certificado de assinatura original.

A loja esclarece que o frete entra no total antes do pagamento e separa pagamento aprovado, aceite e postagem. Os avisos ficam em Meus pedidos; e-mail adicional permanece desativado. Não há produtos físicos publicados: peso, embalagem e preparação reais precisam ser aprovados e conferidos antes de vender. Nenhuma etiqueta, cobrança ou nova infraestrutura foi criada.

## Frete e avisos dos pedidos físicos — 17/10/2026

A integração de cotações pelo Melhor Envio substitui o frete fixo. Há seleção de modalidade por CEP, preço e prazo no checkout, com preparação separada do transporte. O servidor confere uma cotação assinada, válida por 15 minutos e vinculada ao produto, quantidade, CEP e conta. Sem cotação válida, nenhum pagamento físico é criado. Produtos digitais continuam independentes do frete.

O painel registra o aceite e o envio, exige rastreamento para enviar e mantém mensagens privadas em Meus pedidos. O e-mail transacional Brevo é opcional, com credencial criptografada, confirmação de plano gratuito, limite local de 250 tentativas/dia e reenvio de pendências pelo administrador. Nenhuma etiqueta ou saldo é comprado automaticamente.

Configuração, limites e fontes: [FRETE_E_AVISOS.md](FRETE_E_AVISOS.md). `tests/test_shipping.js` cobre cotações adulteradas/vencidas, falhas do provedor, regras de aceite/envio, avisos privados, concorrência, limite de e-mail e persistência, sem transação ou mensagem real.
