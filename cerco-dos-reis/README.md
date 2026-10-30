# Cerco dos Reis · migração independente

Criação: **Victoryno**. Universo de *Ecos da Chama / Khar Thal*.

## Situação desta versão

**JOGÁVEL EM TREINAMENTO LOCAL, AINDA NÃO PUBLICADA NEM INTEGRADA AO BACKEND ORIGINAL.**

A ramificação `cerco-dos-reis-migracao-2026-10` evita alterar o Khar Tall de tabuleiro. Esta nova pasta não substitui o jogo já publicado em `chatgpt.site`.

## Recursos implementados

- Visual aprovado: fundo carvão/azul profundo, painéis com bordas e dourado suave.
- Coleção com 11 cartas, incluindo Liliti (arte original recuperada do APK).
- Imagem completa ao abrir carta (`object-fit: contain`) e nome fora da imagem.
- Molduras por nível: Bronze 0–19; Prata 20–39; Ouro 40–59; Mítico 60–79; Divino 80–100. A raridade Lendária é independente da moldura.
- Fichas técnicas individuais, habilidade, raridade, nível, XP e evoluções.
- Arena **local de treinamento** 3 minutos, duas rotas, tropas e magias, IA em três dificuldades, energia, torres e castelos.
- Progresso **local** de treinamento (+1 XP por uso de carta), sem autenticação. Nível 100 não é liberado nesta versão.
- Navegação responsiva, controle por mouse/toque e atalho de teclado. Abas de Loja, Clãs e Conta informam que o serviço real ainda é o original.
- Treinamento permite testar todas as cartas sem comprar.

## Recuperação original

A pasta `origem-apk/` foi recuperada do arquivo `downloads/cerco-dos-reis-1.0.0.apk` já presente no repositório e contém artes, CSS e HTML do módulo de batalha, **sem modificações**. Esses recursos não incluem o `app.mjs` original da arena nem o código de autenticação, dados dos usuários, loja, chat, clãs ou pagamentos. O site `chatgpt.site` respondeu **401** à consulta pública; não é correto afirmar que seu backend foi transferido.

## Executar

A partir da raiz do repositório:

```sh
python -m http.server 8080 --directory cerco-dos-reis
```

Abra `http://localhost:8080`.

Para hospedagem futura no Render, configure um **Static Site** com diretório de publicação `cerco-dos-reis` e sem comando de build. Antes de publicar, é necessário confirmar o workspace de destino e testar os recursos originais. Sem o backend oficial não haverá migração das contas, pagamentos ou progresso.

## Próximos passos para concluir a transferência definitiva

1. Exportar de maneira autorizada o código-fonte original e a estrutura do banco de dados do projeto Work (não estão no APK).
2. Conectar conta, VIP de Victoryno, inventário, XP, loja InfinityPay, chat, clãs e ranking sem armazenar dados pessoais no repositório público.
3. Verificar as regras oficiais e substituir os valores operacionais deste **motor de treinamento** por valores reais, com testes de regressão.
4. Fazer testes de login, partidas, compras de teste e versão Android; só então substituir a publicação original ou apontar usuários para a nova.
