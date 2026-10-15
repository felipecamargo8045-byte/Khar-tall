# Khar Tall — multiplayer online (beta)

Jogo de estratégia do universo **Ecos da Chama: O Último Victorino**.

Esta versão preserva o motor de regras, as ilustrações, os efeitos sonoros e as salas online para dois jogadores.

## Hospedagem gratuita

O repositório inclui o pacote original do projeto em `bundle/chunk-XX.bin` para contornar limites de envio de arquivos. Durante o build, `unpack.js` recompõe o arquivo ZIP e extrai `server.js`, `engine.js`, interface e `assets/`. Execute o build: `node unpack.js && node --check server.js && node --check engine.js && node --check online.js`; inicie: `node server.js`. Requer Node 22.13+.

**Plano Render Free:** as salas podem desaparecer quando a instância reiniciar ou entrar em repouso. Cadastro público desativado. Compartilhe o link `/online` com outro jogador. O serviço está em beta, não é uma plataforma de contas autenticadas.

Não faça commit de `data/`, `.env`, arquivos SQLite ou cookies de jogadores.
