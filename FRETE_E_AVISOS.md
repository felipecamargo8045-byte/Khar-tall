# Frete e avisos de pedidos físicos

Atualizado em 17/10/2026. Integração sem mensalidade, no servidor e banco existentes. Não foram cadastrados produtos físicos, geradas etiquetas ou enviadas mensagens reais durante o desenvolvimento.

## Pesquisa e escolha

| Opção | Custo fixo informado | Papel nesta versão |
| --- | --- | --- |
| Melhor Envio | API gratuita, sem taxas ou mensalidade da integração | Integrado para cotação por CEP, inicialmente PAC e SEDEX. Outras modalidades dependem da conta, região e serviços habilitados. |
| SuperFrete | Sem mensalidade ou gasto mínimo; pagamento das etiquetas | Alternativa pesquisada. Não é necessário manter duas contas para usar a integração desta versão. |
| Mensagens em Meus pedidos | Mesmo servidor e banco já utilizados | Canal sempre disponível para avisos de aceite, envio e entrega registrada. |
| Brevo Free | Até 300 e-mails por dia, conforme o provedor | E-mail adicional opcional. A aplicação limita a 250 tentativas por dia UTC; outras aplicações podem consumir a mesma cota. |

O transporte continua sendo pago por envio. O cliente confere o valor no total da compra. Não há compra automática de etiquetas, adição de saldo, contratação de plano ou geração de cobrança em teste. As condições e limites de terceiros podem mudar.

Fontes oficiais consultadas:

- [Introdução à API Melhor Envio — integração gratuita](https://docs.melhorenvio.com.br/docs/introducao-a-api)
- [Cálculo de fretes — medidas, peso, valor e retorno da cotação](https://docs.melhorenvio.com.br/reference/calculo-de-fretes-por-produtos)
- [PAC e SEDEX — códigos dos serviços](https://docs.melhorenvio.com.br/reference/inserir-logistica-reversa-no-carrinho)
- [SuperFrete — integração e custo das etiquetas](https://superfrete.com/integracao-frete)
- [Brevo — limites do plano Free](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan)
- [Brevo — envio de e-mail transacional](https://developers.brevo.com/reference/send-transac-email)

## Ativação no painel

1. Entrar com a conta administradora Victoryno em `/painel-loja`.
2. Em **Frete por CEP**, informar o CEP real de postagem e o e-mail de contato técnico exigido pela API.
3. Na própria conta Melhor Envio, gerar um token com permissão de cotação. Colá-lo no painel, confirmar a senha do jogo e ativar o cálculo. Não é necessário conceder permissão para comprar etiquetas a esta integração.
4. Antes de publicar um produto físico, cadastrar peso e medidas da unidade pronta para envio, incluindo embalagem e proteção, e o prazo de preparação real. Esses valores não foram inferidos do STL.
5. Em **Conferir uma cotação**, selecionar um produto com embalagem completa (pode estar em rascunho), informar CEP de destino e quantidade e consultar. Conferir também as condições de postagem antes de abrir as vendas físicas.
6. Se desejar e-mail adicional, conectar em **Avisos ao cliente** uma chave Brevo, um remetente já verificado e confirmar o plano gratuito sem recarga ou pacote pago. Esse passo não é necessário para os avisos na conta.

Credenciais são criptografadas com a chave de configuração existente. Não são retornadas ao navegador nem incluídas no APK ou no Git. Token ou chave em branco preserva o segredo salvo; mudanças de conexão exigem a senha do jogo. O token Melhor Envio precisa ser substituído caso expire ou seja revogado.

## Compra e envio

- O cliente informa CEP e quantidade, calcula e escolhe a modalidade. Valor e prazo de transporte vêm do provedor; a preparação é apresentada separadamente.
- A cotação é válida por 15 minutos. Produto/preço/embalagem, quantidade, CEP, conta ou configuração alterados exigem uma nova cotação.
- O servidor inclui o frete confirmado no total da InfinitePay. Valores enviados livremente pelo navegador são ignorados.
- Sem credencial, embalagem, modalidade disponível ou cotação válida, a compra física não segue para pagamento. Não há fallback para frete zero. As skins continuam com preço e entrega digital próprios.
- Após o pagamento ser aprovado, a administração seleciona **Aceitar pedido e preparar**. Isso registra a mensagem de aceite.
- Depois da postagem real, seleciona **Enviado**, informa o código de rastreamento e, opcionalmente, o link. Isso registra o aviso de envio. O sistema não confirma uma postagem por apenas gerar uma etiqueta.
- Os avisos aparecem em **Meus pedidos**, com data, situação e rastreamento. Há atualização manual e atualização periódica quando essa seção está aberta.
- Se o e-mail estiver ativado, cada evento tenta encaminhar uma mensagem. Falha ou limite de e-mail não apaga a atualização do pedido. A administração pode conferir a falha e tentar os avisos pendentes no painel.
- A confirmação de API de e-mail indica encaminhamento ao provedor, não comprovação de leitura ou recebimento na caixa de entrada. Não há monitoramento automático da transportadora; o cliente acompanha pelo código/link e a administração registra as mudanças.

O vendedor continua responsável por emitir e pagar a etiqueta correta, usar a embalagem correspondente à cotação e postar a encomenda. Em pedidos com várias unidades, conferir o acondicionamento retornado pela cotação e os volumes na emissão.

## Texto apresentado ao cliente

Com avisos na conta:

> Você receberá uma mensagem em Meus pedidos quando a loja aceitar o pedido e outra quando ele for enviado, com o código de rastreamento. Acompanhe por sua conta no site ou aplicativo.

Com e-mail adicional ativado:

> Você receberá os avisos de aceite e de envio em Meus pedidos e no e-mail informado nesta compra. O aviso de envio incluirá o código de rastreamento.

Não se promete e-mail quando a conexão está desativada. A política de privacidade informa o compartilhamento necessário à cotação, à entrega e ao envio dos avisos.

## Verificação

`tests/test_shipping.js` cobre preço e prazo personalizados, quantidade e embalagem, cotação assinada, adulteração e vencimento, mudança de CEP/conta/produto, falha sem frete grátis, credenciais privadas, restrições de aceite e envio, histórico, concorrência, e-mail opcional, limite diário e reinício. Os testes existentes de pagamentos, skins e jogo permanecem obrigatórios.

Os testes usam somente provedores simulados. A integração em produção depende das credenciais e dos dados reais fornecidos pela administração; não houve cotação autenticada real nem teste de entrega de e-mail.
