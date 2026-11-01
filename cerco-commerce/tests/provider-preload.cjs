// Somente o processo de teste carrega este arquivo; nenhum pagamento real.
const orders=new Map();
global.fetch=async(url,options)=>{
 const data=JSON.parse(options.body);
 if(url.endsWith('/links')){
  orders.set(data.order_nsu,data.items[0].price);
  return {ok:true,json:async()=>({url:'https://checkout.infinitepay.io/teste-'+data.order_nsu})};
 }
 if(url.endsWith('/payment_check')){
  const amount=orders.get(data.order_nsu);
  return {ok:true,json:async()=>({success:true,paid:data.transaction_nsu!=='pending',
   amount:data.transaction_nsu==='wrong_amount'?1:amount,paid_amount:amount,capture_method:'pix'})};
 }
 throw Error('Teste tentou acessar outro provedor');
};
