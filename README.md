# Khar Tall

Jogo de estratégia do universo **Ecos da Chama: O Último Victorino**, criado por Felipe Camargo.

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

`/portal` é a entrada do portal de Felipe Camargo. `/jogar` serve exatamente a mesma interface de `/`: não recria motor, contas ou banco. A raiz permanece disponível para preservar o APK 3.5.1 e os atalhos existentes. Não há iframe, proxy de login, CORS aberto ou remoção de `X-Frame-Options: DENY`. Partidas e preferências mantêm suas chaves de armazenamento na mesma origem.

Os atalhos `?abrir=ia`, `tutorial`, `regras` e `compendio` abrem as telas existentes quando não há uma partida pendente; o convite para retomar uma partida salva tem prioridade. `/loja#owned` e `/loja#orders` abrem coleção e pedidos. O cadastro/login aceita retorno somente para rotas locais autorizadas, incluindo `/portal` e `/jogar`.

O portal consulta catálogo, identidade e metadados do APK nas APIs atuais. O link do APK continua apontando para o binário original, com o mesmo hash e certificado. O portal não cria outra conta de administrador: somente `STORE_ADMIN_USERNAMES`, indicado pelo criador, autoriza a gestão. A publicação pelo Sites mantém uma entrada que encaminha à origem canônica; nenhuma credencial ou sessão é retransmitida entre domínios.
