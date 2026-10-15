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

O rito de início foi removido. O uivo individual original do Lobo foi preservado. O motor de combate não foi modificado nesta revisão de publicação.

## Verificação

`npm test` valida regras canônicas, multiplayer, sigilo de armadilhas, autorização, revisões concorrentes, persistência e reinício. Com `ACCOUNTS_DATABASE_URL` de uma branch de testes, também valida cadastro, login, recuperação, exclusão e retomada da sala por conta. `npm run build` verifica a sintaxe, os arquivos e todos os recursos referenciados.

## Áudio revisado

Os 20 WAVs da primeira edição de áudio aprovada (V2.11) são preservados byte por byte. `audio.js` fornece o mesmo carregamento, volume relativo e agendamento nos modos local/IA e online. O ataque do Lobo usa o rosnado original e a mordida original com intervalo de 310 ms; a cópia do Rei usa a mesma sequência. O uivo solo continua exclusivo da morte por combate.

Os efeitos aguardam o carregamento do arquivo real; não há imitação sintetizada de ataques durante o primeiro carregamento. Desligar o som interrompe também efeitos agendados. Um limitador controla a soma de efeitos simultâneos. Armadilhas anulam o som de mordida e as pisadas da Investida correspondem à distância efetivamente percorrida. Vitória, perda do Rei e perda do Guardião seguem prioridade musical para evitar motivos conflitantes.
