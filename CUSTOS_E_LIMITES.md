# Khar Tall — revisão de custos

Revisão em 15/10/2026. Infraestrutura e desenvolvimento: **R$ 0**. Na loja opcional, o criador autorizou as tarifas do Mercado Pago por venda; não autorizou mensalidades, recargas, assinaturas nem conversão da hospedagem para planos pagos.

## Infraestrutura confirmada

| Componente | Situação verificada | Controle |
| --- | --- | --- |
| Servidor Render `khar-tall-online` | Instância `free`, uma instância, sem disco persistente, sem prévias automáticas | Blueprint `render.yaml` usa `plan: free`; build rejeita planos pagos, disco ou autoscaling |
| Banco Neon `khar-tall-contas` | Organização Free; assinatura `free_v3` | Produção mantida no mesmo banco, com contas e salas |
| Compute Neon de produção | Mínimo e máximo de 0,25 CU, sem crescimento automático | Suspensão por inatividade do plano Free; histórico de restauração de seis horas |
| Consumo Neon | Limites adicionais aplicados e relidos pela API | `compute_time_seconds=360000` (100 CU-h por ciclo) e `data_transfer_bytes=5000000000` (5 GB por ciclo) |
| Compute Neon de testes | `release-check-20261015` desativado (`disabled=true`) | Não pode ser reativado por uma conexão casual; dados da branch preservados |
| Render Key Value, workers e cron jobs | Nenhum encontrado no workspace | Não são necessários para o jogo |
| Mídia e IA adversária | Recursos locais/versionados; IA no navegador | Não usam geração de mídia nem API de IA paga durante uma partida |

O tier `starter` exibido para **compilação** do Render é o pipeline padrão; não é o plano pago Starter da instância web. A instância do jogo foi confirmada como `free`.

## Economia sem perda de qualidade

- Gzip dos arquivos estáticos quando reduz o tamanho: o navegador recebe exatamente os mesmos bytes após descompressão.
- ETag e respostas `304` evitam reenviar arquivos que o navegador já tem.
- Imagens e WAVs preservam seus checksums. Não há redução de resolução, taxa de amostragem ou qualidade.
- APIs privadas e eventos de partida não recebem cache público.
- Dependência do projeto: PostgreSQL (`pg`); nenhuma biblioteca ou serviço de cobrança por jogada ou anúncio foi incluído. A loja usa a API REST do Mercado Pago somente para compras e conferência de seus pagamentos.

## Conferência do painel financeiro pelo criador

**O criador informou que verificou o painel e que estava tudo correto, em 15/10/2026.** A sessão compartilhada não funcionou, portanto não houve leitura independente de cartões/faturas por este agente. O conector permite consultar recursos, mas não oferece gerenciamento de cartões, assinatura do workspace ou limite de gastos do pipeline.

Os pontos enviados ao criador para essa conferência foram:

1. Plano do workspace **Hobby, US$ 0**. O plano da instância e o do workspace são independentes.
2. Limite de gastos do **Build Pipeline em US$ 0**.
3. Ausência de forma de pagamento para impedir cobrança automática de excedentes de tráfego. Se houver cartão, a remoção deve ser feita no painel após conferir eventuais recursos e faturas.
4. Ausência de recursos pagos, assinaturas ou faturas pendentes. Esta revisão confirmou os planos dos recursos acessíveis, não a inexistência de toda cobrança histórica.

No Render, `plan: free` sozinho **não** é um bloqueio de excedentes: com forma de pagamento, tráfego e minutos adicionais podem ser cobrados. Sem forma de pagamento, o serviço/compilação pode ser suspenso ao atingir a franquia. Um alerta por e-mail não substitui esse bloqueio.

## Banco beta antigo e prazo de 30 dias

Foi localizado um Render Postgres antigo, `khar-tall-contas-beta`, no plano Free, com vencimento em **14/11/2026**. O jogo atual usa o Neon para as contas e salas, conforme a configuração de produção estabelecida antes desta revisão. Não foi contratado upgrade desse banco beta.

A documentação do Render informa que o banco gratuito expira após 30 dias e fica inacessível, seguido de exclusão após a carência; ele não é convertido automaticamente para um banco pago. O recurso antigo não foi apagado, pois o conector não permite sua exclusão e sua lista de IPs impede a consulta dos dados. Preservar dados tem prioridade sobre uma limpeza desnecessária de recurso gratuito.

## Limites e continuidade

Planos gratuitos têm franquias, podem hibernar e podem suspender o online quando o limite é atingido. Suspender ao atingir um limite é preferível a contratar um plano pago. Não há promessa de disponibilidade ilimitada nem de manutenção eterna das condições dos provedores.

O Neon Free não é o banco de teste de 30 dias do Render. Quando sua franquia de compute ou transferência termina, o serviço pode ser suspenso até o próximo ciclo; não é necessário contratar um plano para manter o cadastro existente. Os dados permanecem sujeitos às políticas e limites do fornecedor.

A conta Fal já havia recusado geração por falta de créditos. O jogo não depende do Fal; esta revisão não compra créditos nem configura recargas. As preferências de geração e eventual recarga automática da conta Fal não estão expostas pelo conector e não foram alteradas.

## Documentação consultada

- [Render Free](https://render.com/docs/free)
- [Render: tráfego de saída](https://render.com/docs/outbound-bandwidth)
- [Render: pipeline e limite de gastos](https://render.com/docs/build-pipeline)
- [Planos Neon](https://neon.com/docs/introduction/plans)
- [Limites de consumo Neon](https://neon.com/docs/guides/consumption-limits)
- [Cobrança e mudança de planos Neon](https://neon.com/docs/introduction/manage-billing)

## Aplicativo e loja — versão 3.5.0

- APK assinado, para Android 8 ou superior, com a mídia original incluída e partidas locais/IA offline. Sem SDK de anúncios, geração paga ou serviço móvel contratado.
- PWA instalável pelo Chrome; APIs de conta e pagamento não entram no cache offline.
- O cadastro para distribuição ampla de APKs em aparelhos certificados e a publicação na Play Store podem exigir taxa de desenvolvedor. Não foi contratado esse cadastro. A opção PWA permanece disponível sem esse cadastro.
- Loja física e digital usa compras únicas do Mercado Pago Checkout Pro. Não há assinatura nem cobrança recorrente implementada. As tarifas dependem da conta, do meio e do prazo; o criador deve consultá-las no Mercado Pago.
- Vendas permanecem fechadas até o criador criar sua conta, confirmar qual usuário administrará a loja, conectar o Mercado Pago, cadastrar produtos e abrir as vendas.
- O criador poderá conectar Access Token e assinatura de Webhooks diretamente no painel da loja, após ter acesso de administrador. Segredos ficam criptografados no servidor.

Referências adicionais: [Mercado Pago Checkout Pro](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/overview), [tarifas e ausência de mensalidade do checkout](https://www.mercadopago.com.br/blog/comparando-taxas-checkout-gateways-pagamento), [distribuição Android](https://support.google.com/android-developer-console/answer/16640817?hl=en).

## Portal oficial — 15/10/2026

O portal em `/portal` reutiliza o servidor Render, o banco, as contas, o APK 3.5.1 e o Mercado Pago existentes. Não foram contratados domínio, servidor, disco, assinatura ou API adicionais. A entrada do Sites encaminha ao portal canônico para manter sessões e salvamentos na mesma origem. Nenhuma camada de autenticação paralela é provisionada. Os limites e as pendências de conferência financeira descritos acima continuam aplicáveis.

Nesta revisão, as APIs públicas confirmaram banco persistente e cadastro ativo; o catálogo está vazio e o checkout fechado. Vendas dependem de o criador indicar o usuário administrador e configurar recebimento, condições e produtos. Não foram feitas compras reais.


## Alteração autorizada em 16/10/2026 — InfinitePay

O usuário escolheu InfinitePay e confirmou a InfiniteTag `consultorcamargo`. O Checkout Integrado não exige mensalidade ou credencial bancária na aplicação. O Pix é anunciado pelo provedor com tarifa zero; cartões continuam sujeitos às taxas e ao prazo da conta do vendedor. A integração não altera o plano de recebimento da conta, contrata antecipação, cria recorrência nem abre novas vendas sozinha. O catálogo estava vazio, sem pedidos ou configuração anterior de recebimentos na consulta de produção desta alteração. O próprio administrador configura produtos, contato e condições antes de abrir vendas.

Fontes consultadas: https://www.infinitepay.io/checkout e https://www.infinitepay.io/desenvolvedores . Nenhuma compra real foi executada como teste.
