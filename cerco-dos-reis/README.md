# Cerco dos Reis — versão jogável na Render
Autor identificado na interface: **Victoryno**. Universo de Khar Thal / Ecos da Chama.

## Publicação
- Site de testes: https://cerco-dos-reis-teste.onrender.com/
- GitHub: branch `cerco-dos-reis-migracao-2026-10`, pasta `cerco-dos-reis`
- Deploy automático na Render quando esta branch recebe commits. O Khar Tall de tabuleiro permanece no serviço próprio.

## Interface do jogo (não é página institucional)
- Navegação integrada por cinco telas: Arena, Cartas, Loja/Forja, Clãs e Perfil.
- Arena local de treinamento (IA) com duas rotas, 3 minutos, feitiços, tropas, energia, torres, castelos e ilustrações originais recuperadas.
- Coleção de onze cartas com imagem completa, molduras de nível, ficha individual, habilidade, XP e indicação de raridade.
- Loja/Forja embutida com oito estilos cosméticos **gratuitos de visualização local** e cartas em destaque. Não há checkout ou cobrança nesta versão.
- Clãs integrado visualmente com informação precisa sobre serviço multiplayer ainda não conectado; Perfil local de treinamento, sem fingir autenticação real.
- Navegação compatível com Android e PWA instalável via navegador.

## Limites conhecidos (importantes)
Os arquivos públicos recuperados do APK de versão 1.0.0 incluíam HTML, arte e CSS da arena, mas não o motor `app.mjs` nem o código do servidor. O projeto original `chatgpt.site` respondeu HTTP 401 quando tentamos recuperar os fontes. Por isso esta versão possui **motor de treinamento reconstruído**, não é cópia integral do motor antigo. Os atributos em treino são valores provisórios e não equivalem necessariamente ao servidor original.

Contas reais, VIP autenticado, inventário real, ranking online, matchmaking, compras via InfinityPay, dados de clãs e mensagens **ainda não estão migrados**. O jogo original não foi modificado nem teve seus dados transferidos.

## Para manter e atualizar
O projeto agora está independente para mudanças no GitHub e atualização na Render. Para desenvolvimento local:
```sh
python -m http.server 8080 --directory cerco-dos-reis
```
Abra `http://localhost:8080`. Os arquivos front-end atuais são `index.html`, `game-ui.css`, `app.js`, `realm-ui.js`, `manifest.webmanifest` e `sw.js`.

Para completar a migração online, é necessária uma exportação **autorizada** do servidor original, seus endpoints e dados de usuários. Não se deve substituir progresso real por dados do treinamento.
