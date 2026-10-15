(()=>{
 const stage=document.getElementById('stage');
 let frame=0;
 function positionGuide(){
  frame=0;
  const svg=stage.querySelector('.category-guide'),text=stage.querySelector('#category-prompt'),target=stage.querySelector('.categories');
  if(!svg||!text||!target)return;
  const box=stage.getBoundingClientRect(),label=text.getBoundingClientRect(),buttons=target.getBoundingClientRect();
  if(!box.width||!box.height)return;
  const w=stage.clientWidth,h=stage.clientHeight,kx=w/box.width,ky=h/box.height;
  const sx=(label.right-box.left)*kx+8,sy=(label.top+label.height/2-box.top)*ky;
  const ex=(buttons.left+buttons.width/2-box.left)*kx,ey=(buttons.bottom-box.top)*ky+10;
  const distance=ex-sx;
  const bendX=Math.min(w-8,sx+Math.max(18,distance*.65)),bendY=sy-(sy-ey)*.3;
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  svg.querySelector('.guide-line').setAttribute('d',`M${sx} ${sy} C${bendX} ${sy} ${ex} ${bendY} ${ex} ${ey}`);
  svg.querySelector('.guide-tip').setAttribute('d',`M${ex-7} ${ey+9} L${ex} ${ey} L${ex+7} ${ey+9}`);
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(positionGuide)}
 new MutationObserver(schedule).observe(stage,{childList:true,subtree:true});
 new ResizeObserver(schedule).observe(stage);
 window.addEventListener('resize',schedule);
 document.fonts.ready.then(schedule);
 schedule();
})();
