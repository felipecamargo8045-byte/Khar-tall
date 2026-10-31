// Um único mapa para o combate, os disparos e os modelos da arena.
// Coordenadas em unidades do tabuleiro lógico de 420 × 560.
(()=>{
 const point=(x,y)=>Object.freeze({x,y});
 const positions=Object.freeze({
  enemy:Object.freeze([point(110,112),point(310,112),point(210,-64)]),
  ally:Object.freeze([point(110,448),point(310,448),point(210,624)])
 });
 globalThis.CercoArenaLayout=Object.freeze({
  width:420,height:560,scale:40,positions,
  // As faixas atrás das bases também fazem parte do campo jogável.
  bounds:Object.freeze({minY:-104,maxY:664}),
  defenseRange:Object.freeze({tower:124,castle:100}),
  // A escala dos personagens e das estruturas é preservada ao recuar as bases.
  structureScale:Object.freeze({tower:.74,castle:.78})
 });
})();
