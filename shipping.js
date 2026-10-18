'use strict';
// Quote only: this integration never buys labels, adds balance or subscribes to a plan.
// https://docs.melhorenvio.com.br/reference/calculo-de-fretes-por-produtos
const crypto=require('node:crypto');
const QUOTE_TTL=15*60*1000;
const NOTICE='Você receberá uma mensagem em Meus pedidos quando a loja aceitar seu pedido e quando ele for enviado, com o código de rastreamento. Quando o aviso por e-mail estiver ativado, enviaremos essas atualizações também ao endereço informado na compra.';
const fail=(status,message)=>{const e=Error(message);e.status=status;throw e;};
const digest=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
function postalCode(v){if(typeof v!=='string'||!/^\d{5}-?\d{3}$/.test(v.trim()))fail(422,'Informe um CEP com 8 números.');const cep=v.replace(/\D/g,'');if(cep==='00000000')fail(422,'Confira o CEP informado.');return cep;}
function email(v){return typeof v==='string'&&v.length<=150&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v);}
function packageInfo(value,required=false){
 const p=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 if(!Object.keys(p).length&&!required)return {};
 if(!Number.isInteger(p.weight_g)||p.weight_g<1||p.weight_g>50000)fail(422,'Informe o peso real da unidade embalada, em gramas.');
 for(const k of ['width_cm','height_cm','length_cm'])if(typeof p[k]!=='number'||!Number.isFinite(p[k])||p[k]<1||p[k]>200)fail(422,'Informe as três medidas externas da embalagem, em centímetros.');
 if(!Number.isInteger(p.preparation_days)||p.preparation_days<0||p.preparation_days>90)fail(422,'Informe o prazo de preparação entre 0 e 90 dias úteis.');
 return Object.fromEntries(['weight_g','width_cm','height_cm','length_cm','preparation_days'].map(k=>[k,p[k]]));
}
function productPackage(product,required=true){let p;try{p=JSON.parse(product.package_json||'{}');}catch{fail(409,'A embalagem deste produto precisa ser conferida pela loja.');}return packageInfo(p,required);}
function quotedCents(v){if(typeof v!=='number'&&typeof v!=='string')return null;if(typeof v==='string'&&!/^\d+(?:\.\d{1,2})?$/.test(v))return null;const cents=Math.round(Number(v)*100);return Number.isSafeInteger(cents)&&cents>=0&&cents<=10000000?cents:null;}
function deliveryRange(row){const range=row.custom_delivery_range||row.delivery_range,days=row.custom_delivery_time??row.delivery_time;const min=range?.min??days,max=range?.max??days;return Number.isInteger(min)&&Number.isInteger(max)&&min>=0&&max>=min&&max<=365?{min_days:min,max_days:max}:null;}
function quotedPackages(row){return (Array.isArray(row.packages)?row.packages:[]).slice(0,10).map(p=>({width_cm:Number(p.dimensions?.width),height_cm:Number(p.dimensions?.height),length_cm:Number(p.dimensions?.length),weight_kg:Number(p.weight)})).filter(p=>Object.values(p).every(n=>Number.isFinite(n)&&n>0&&n<=1000));}
function createShipping({store,fetcher=fetch,env=process.env,decrypt,encrypt,now=Date.now}={}){
 const requests=new Map();
 async function configuration(){
  const value=await store.setting('shipping');if(value)return decrypt(value,env);
  // Keep the origin supplied during setup before credentials are connected.
  // A complete configuration saved by the administrator takes precedence.
  const origin=await store.setting('shipping_origin_postal_code');
  return {enabled:false,services:'1,2',revision:'',origin_postal_code:typeof origin==='string'&&/^\d{8}$/.test(origin)&&origin!=='00000000'?origin:''};
 }
 function ready(c){return c.enabled===true&&!!c.token&&/^\d{8}$/.test(c.origin_postal_code||'')&&email(c.contact_email);}
 async function status(){const c=await configuration();return {provider:'melhorenvio',enabled:c.enabled===true,configured:ready(c),token_saved:!!c.token,origin_postal_code:c.origin_postal_code||'',contact_email:c.contact_email||'',services:c.services||'1,2',quote_minutes:15,monthly_fee:0};}
 async function save(input){
  const previous=await configuration(),origin_postal_code=postalCode(input.origin_postal_code),contact_email=String(input.contact_email||'').trim();
  if(!email(contact_email))fail(422,'Informe o e-mail de contato técnico exigido pelo Melhor Envio.');
  const services=String(input.services||'1,2').split(',').map(x=>x.trim());if(!services.length||services.length>20||services.some(x=>!/^\d{1,3}$/.test(x)))fail(422,'Informe os códigos das modalidades de envio separados por vírgula.');
  const token=input.token?String(input.token).trim():previous.token||'';if(token&&!/^[A-Za-z0-9._~+/=-]{20,6000}$/.test(token))fail(422,'Confira o token do Melhor Envio. Cole somente o token, sem Bearer.');
  if(input.enabled===true&&!token)fail(422,'Conecte sua conta do Melhor Envio antes de ativar as cotações.');
  await store.setSetting('shipping',encrypt({enabled:input.enabled===true,origin_postal_code,contact_email,services:[...new Set(services)].join(','),token,revision:crypto.randomUUID()},env));requests.clear();return status();
 }
 function productStamp(p){return digest([p.id,p.price_cents,p.package_json,Number(p.updated_ms),Number(p.active)]);}
 function key(){if(!/^[a-f0-9]{64}$/i.test(env.STORE_SETTINGS_KEY||''))fail(503,'A conexão segura de frete ainda não foi preparada.');return Buffer.from(env.STORE_SETTINGS_KEY,'hex');}
 function sign(data){const payload=Buffer.from(JSON.stringify(data)).toString('base64url');return payload+'.'+crypto.createHmac('sha256',key()).update('shipping:'+payload).digest('base64url');}
 async function quote(product,quantity,destination,userId='',allowDraft=false){
  if(product.kind!=='physical'||(!Number(product.active)&&!allowDraft))fail(404,'Produto físico indisponível.');
  if(!Number.isInteger(quantity)||quantity<1||quantity>10)fail(422,'Informe de 1 a 10 unidades.');
  const cep=postalCode(destination),pack=productPackage(product),c=await configuration();if(!ready(c))fail(503,'A loja ainda está preparando as opções de envio. A compra de produtos físicos será liberada após essa configuração.');
  const cacheKey=digest([c.revision,productStamp(product),quantity,cep]);
  let work=requests.get(cacheKey);if(work&&work.expires<=now()){requests.delete(cacheKey);work=null;}
  if(!work){
   const promise=(async()=>{
    let r;try{r=await fetcher('https://melhorenvio.com.br/api/v2/me/shipment/calculate',{method:'POST',headers:{Authorization:'Bearer '+c.token,Accept:'application/json','Content-Type':'application/json','User-Agent':'Khar Tall ('+c.contact_email+')'},body:JSON.stringify({from:{postal_code:c.origin_postal_code},to:{postal_code:cep},products:[{id:product.id,width:pack.width_cm,height:pack.height_cm,length:pack.length_cm,weight:pack.weight_g/1000,insurance_value:Number(product.price_cents)/100,quantity}],options:{receipt:false,own_hand:false},services:c.services}),signal:AbortSignal.timeout(10000),redirect:'error'});}catch{fail(502,'Não foi possível consultar o frete agora. Tente novamente em instantes.');}
    if(r.status===401||r.status===403)fail(503,'A conexão de frete precisa ser atualizada pela loja. Nenhum pagamento foi iniciado.');
    const rows=await r.json().catch(()=>null);if(!r.ok||!Array.isArray(rows))fail(502,'A consulta de frete está indisponível. Tente novamente mais tarde.');
    const allowed=new Set(c.services.split(',')),options=[];
    for(const row of rows.slice(0,100)){
     if(!row||row.error||!allowed.has(String(row.id)))continue;
     const price_cents=quotedCents(row.custom_price??row.price),range=deliveryRange(row);if(price_cents===null||!range||typeof row.name!=='string'||!row.name.trim())continue;
     options.push({service_id:String(row.id),service_name:row.name.trim().slice(0,100),carrier:String(row.company?.name||'Transportadora').slice(0,100),price_cents,...range,preparation_days:pack.preparation_days,packages:quotedPackages(row)});
    }
    if(!options.length)fail(422,'Não há modalidade de envio disponível para este CEP, quantidade e embalagem. Consulte o atendimento da loja.');
    return options.sort((a,b)=>a.price_cents-b.price_cents);
   })();
   work={promise,expires:now()+60000};requests.set(cacheKey,work);promise.catch(()=>requests.delete(cacheKey));
   if(requests.size>500)for(const [id,entry]of requests)if(entry.expires<=now())requests.delete(id);
   if(requests.size>1000)requests.delete(requests.keys().next().value);
  }
  const options=await work.promise,issued=now(),expires_ms=issued+QUOTE_TTL;
  return {expires_ms,notice:NOTICE,options:options.map(option=>({...option,token:sign({v:1,product_id:product.id,product_stamp:productStamp(product),quantity,postal_code:cep,user_id:userId,revision:c.revision,issued_ms:issued,expires_ms,...option})}))};
 }
 async function verify(token,product,quantity,cep,userId){
  if(typeof token!=='string'||token.length>5000)fail(422,'Calcule o frete e escolha uma opção antes de pagar.');
  const [payload,signature,...extra]=token.split('.');if(extra.length||!payload||!signature||!/^[A-Za-z0-9_-]{43}$/.test(signature))fail(422,'Cotação de frete inválida. Calcule novamente.');
  const expected=crypto.createHmac('sha256',key()).update('shipping:'+payload).digest();if(!crypto.timingSafeEqual(expected,Buffer.from(signature,'base64url')))fail(422,'Cotação de frete inválida. Calcule novamente.');
  let data;try{data=JSON.parse(Buffer.from(payload,'base64url').toString());}catch{fail(422,'Cotação de frete inválida.');}
  const c=await configuration();if(!ready(c))fail(503,'As opções de envio estão temporariamente indisponíveis.');
  if(data.v!==1||data.product_id!==product.id||data.product_stamp!==productStamp(product)||data.quantity!==quantity||data.postal_code!==postalCode(cep)||(data.user_id&&data.user_id!==userId)||data.revision!==c.revision||!Number.isSafeInteger(data.expires_ms)||data.expires_ms<=now()||data.expires_ms-data.issued_ms!==QUOTE_TTL||data.issued_ms>now()+1000||!c.services.split(',').includes(data.service_id))fail(409,'O produto, o CEP, a quantidade ou a validade do frete mudou. Calcule o frete novamente.');
  return {provider:'melhorenvio',service_id:data.service_id,service_name:data.service_name,carrier:data.carrier,price_cents:data.price_cents,min_days:data.min_days,max_days:data.max_days,preparation_days:data.preparation_days,packages:data.packages,quoted_ms:data.issued_ms,origin_postal_code:c.origin_postal_code,postal_code:data.postal_code,package:productPackage(product)};
 }
 return {status,save,quote,verify};
}
module.exports={createShipping,packageInfo,productPackage,postalCode,email,NOTICE,QUOTE_TTL};
