(()=>{
  'use strict';
  const button=document.getElementById('nextButton');
  if(!button)return;

  const syncCompletedAction=()=>{
    if(button.textContent.trim()!=='Комплекс завершён')return;
    button.textContent='На главную';
    button.disabled=false;
    button.dataset.completedHome='true';
  };

  const observer=new MutationObserver(syncCompletedAction);
  observer.observe(button,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['disabled']});
  syncCompletedAction();

  button.addEventListener('click',event=>{
    if(button.dataset.completedHome!=='true')return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.href='index.html';
  },true);
})();
