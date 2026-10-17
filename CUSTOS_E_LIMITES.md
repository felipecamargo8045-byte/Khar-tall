# Khar Tall — orçamento e limites

Atualizado em 17/10/2026 para a versão 3.8.0. A restrição do criador é **R$ 0 de novas cobranças de desenvolvimento e infraestrutura**, agora e nos próximos meses. Esta atualização reutiliza os serviços existentes, compila o Android localmente e não contrata planos, créditos, domínios, anúncios ou APIs de IA.

## Infraestrutura

| Componente | Verificação | Controle |
| --- | --- | --- |
| Render `khar-tall-online` | Instância `free`, uma instância, sem disco e sem previews; relido em 17/10 | `render.yaml` exige `plan: free`; build rejeita planos pagos, discos e autoscaling |
| Neon `khar-tall-contas` | Free (`free_v3`), confirmado na revisão de 15/10; não alterado nesta versão | Compute 0,25 CU; limites de consumo de 360.000 compute-seconds (100 CU-h) e 5 GB de transferência por ciclo |
| Branch Neon `release-check-20261015` | Compute desativado na revisão de 15/10 | Não foi reativado para esta entrega; testes atuais usam dados temporários locais |
| Mídia e oponente de IA | Artes/áudios versionados; IA executada no dispositivo | Sem geração de mídia nem API paga por jogada |
| Android/PWA | Compilação local e assinatura original | Sem cadastro pago de desenvolvedor nem SDK de anúncios |

O `buildPlan: starter` do Render é o pipeline padrão; o plano da instância web continua `free`. Os testes desta atualização não criam contas ou pedidos no banco de produção.

## Bloqueio de cobrança

O criador informou em 15/10 que verificou o painel financeiro e que estava correto. Não houve leitura independente dos cartões ou das faturas: o conector não oferece esse gerenciamento. A confirmação do plano gratuito do servidor não substitui essa conferência.

A configuração a preservar é: workspace Hobby gratuito, limite de gastos de compilação US$ 0, nenhuma forma de pagamento que permita cobrança automática de excedentes e nenhum recurso pago. Alertas por e-mail não são bloqueios. Esta atualização não adiciona meios de pagamento à hospedagem e não altera assinaturas ou limites.

Se a franquia terminar, pode haver suspensão do online. Não contratar upgrade para contornar a suspensão. Contas e dados devem ser preservados conforme as políticas dos provedores. Não há garantia de serviço ilimitado nem de manutenção eterna dos planos gratuitos.

## Loja opcional

A integração atual é o Checkout Integrado da **InfinitePay**, com a InfiniteTag `consultorcamargo`, escolhida pelo criador. São compras únicas; não há assinatura, mensalidade ou pacote contratado pelo jogo. As tarifas por venda do provedor foram autorizadas separadamente pelo criador e não são despesas de hospedagem.

As 16 skins custam R$ 2,50 cada. O criador aceitou Pix e cartão de crédito sem restrição por valor. Não anunciar débito nem aviso de valor mínimo. As compras são opcionais e não concedem vantagens. O servidor confirma pagamento e propriedade antes de liberar/equipar a skin; reembolso revoga o uso. Não foram feitas compras reais para testar esta atualização.

## Cache e disponibilidade

A versão completa é preparada no cache da PWA e no APK. Páginas e scripts já preparados abrem sem aguardar um servidor ocioso; APIs de conta, salas, pedidos e pagamento não entram nesse cache. A primeira visita e o uso online ainda dependem da rede e podem aguardar a ativação da hospedagem gratuita.

Gzip, ETag e respostas 304 reduzem tráfego preservando os bytes de artes e áudios. Não há monitor artificial para manter o servidor acordado, worker, cron ou serviço adicional. O aviso de nova versão do APK é informativo e não baixa nem instala nada sozinho.

## Recursos antigos e distribuição

O Render Postgres beta antigo vence em 14/11/2026 e não recebe upgrade. O jogo usa o Neon existente. O banco antigo não foi apagado: os dados não foram inspecionados devido à restrição de acesso; preservar dados tem prioridade.

O APK mantém a assinatura original. Para atualizar, instalar sobre a versão anterior. A instalação direta depende das permissões e regras do Android; não foi contratado cadastro pago nem publicação na Play Store. A PWA é a alternativa de instalação pelo navegador. O teste em aparelho físico e a validação com jogadores continuam pendentes, com roteiro em `VALIDACAO_MANUAL.md`.

## Documentação dos serviços consultada

- https://render.com/docs/free
- https://render.com/docs/outbound-bandwidth
- https://render.com/docs/build-pipeline
- https://neon.com/docs/introduction/plans
- https://neon.com/docs/guides/consumption-limits
- https://www.infinitepay.io/checkout
- https://www.infinitepay.io/desenvolvedores

## Frete e avisos — 17/10/2026

- API de cálculo do Melhor Envio: a documentação oficial informa integração sem taxas ou mensalidade. A cotação não compra etiquetas nem adiciona saldo. Cada frete real continua sendo pago por envio, com o valor mostrado ao comprador antes do pagamento.
- SuperFrete foi pesquisada como alternativa sem mensalidade; o código desta versão conecta Melhor Envio, inicialmente com PAC e SEDEX, conforme disponibilidade. Não há duas contas de frete contratadas.
- Avisos em Meus pedidos: usam o mesmo banco e servidor. O aceite da loja e o envio são eventos distintos, com histórico privado e rastreamento.
- E-mail Brevo: opcional e inicialmente desligado. O plano gratuito informa 300 envios/dia; a aplicação limita a 250 tentativas por dia UTC, mantém os avisos na conta e permite ao administrador tentar pendências. Não compra créditos, não contrata plano e não habilita SMS/WhatsApp. O administrador deve confirmar uma conta gratuita sem recarga automática; uso em outros sistemas compartilha a cota do provedor.
- Ainda é necessário conectar o token de frete, informar o CEP real de postagem e cadastrar peso/medidas/preparação reais antes de abrir produtos físicos. E-mail adicional exige chave e remetente verificado. Nenhum CEP ou dado de embalagem foi inventado em produção.
- Android 3.8.0 é compilado localmente com a assinatura existente. APIs privadas continuam fora do cache offline; não há nova infraestrutura.
