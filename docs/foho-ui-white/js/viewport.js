/* A final fit adjustment for short windows; content stays visible, never clipped. */
(()=>{
 const workspace=document.getElementById('workspace');
 let frame=0;
 function fit(){
  frame=0;
  if(/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName))return;
  workspace.style.zoom='1';
  if(document.body.dataset.page==='audit'||document.body.dataset.generating==='true')return;
  const available=window.innerHeight-(workspace.getBoundingClientRect().top+window.scrollY)-20;
  if(available<=0)return;
  for(let i=0;i<3;i++){
   const scale=Number(workspace.style.zoom)||1;
   const height=workspace.getBoundingClientRect().height;
   if(height<=available+1)break;
   workspace.style.zoom=String(Math.floor(scale*available/height*1000)/1000);
  }
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(fit)}
 new MutationObserver(schedule).observe(workspace,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden']});
 window.addEventListener('resize',schedule);
 window.addEventListener('orientationchange',schedule);
 document.fonts.ready.then(schedule);
 schedule();
})();
