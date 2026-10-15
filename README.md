# Khar Tall

Jogo de estratégia do universo **Ecos da Chama: O Último Victorino**, criado por Felipe Camargo.

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
