(()=>{
  if(!location.pathname.toLowerCase().startsWith('/admin')) return;
  const COST=16;
  const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  function enhance(){
    const section=document.querySelector('#t6');
    if(!section||section.dataset.initialReportReady) return;
    const panel=section.querySelector('.panel');
    const table=panel?.querySelector('table');
    if(!panel||!table||!table.tBodies[0]) return;
    section.dataset.initialReportReady='1';
    const rows=[...table.tBodies[0].rows];
    const data=rows.map(tr=>({
      tamanho:tr.cells[0]?.textContent.trim()||'',
      inicial:Number(tr.cells[1]?.textContent.replace(/\D/g,''))||0,
      entradas:Number(tr.cells[2]?.textContent.replace(/\D/g,''))||0,
      retiradas:Number(tr.cells[3]?.textContent.replace(/\D/g,''))||0,
      saldo:Number(tr.cells[4]?.textContent.replace(/\D/g,''))||0,
      equivalencia:tr.cells[5]?.textContent.trim()||'—'
    }));
    panel.innerHTML=`<h3>Resumo do estoque</h3><p class="muted" style="margin:-6px 0 16px">Veja quanto havia no início do controle e toda a movimentação até o saldo atual.</p><div class="table-wrap"><table class="table"><thead><tr><th>Tamanho</th><th>Inicial</th><th>Entradas</th><th>Retiradas</th><th>Saldo</th><th>Equivalência</th><th>Custo médio/rolo</th><th>Valor estimado saldo</th></tr></thead><tbody>${data.map(x=>`<tr><td>${x.tamanho}</td><td><strong>${x.inicial}</strong></td><td>${x.entradas}</td><td>${x.retiradas}</td><td><strong>${x.saldo}</strong></td><td>${x.equivalencia}</td><td>${money(COST)}</td><td>${money(Math.max(0,x.saldo)*COST)}</td></tr>`).join('')}</tbody></table></div><div style="margin-top:26px"><h3>Indicadores gerais</h3><div class="cost-grid"><div class="cost-card"><span>Estoque inicial</span><strong>${data.reduce((s,x)=>s+x.inicial,0)}</strong><small class="muted">rolos no início do controle</small></div><div class="cost-card"><span>Rolos recebidos</span><strong>${data.reduce((s,x)=>s+x.entradas,0)}</strong><small class="muted">entradas registradas</small></div><div class="cost-card"><span>Rolos retirados</span><strong>${data.reduce((s,x)=>s+x.retiradas,0)}</strong><small class="muted">consumo acumulado</small></div><div class="cost-card"><span>Saldo atual</span><strong>${data.reduce((s,x)=>s+x.saldo,0)}</strong><small class="muted">rolos disponíveis</small></div></div></div>`;
  }
  document.addEventListener('click',e=>{if(e.target.closest('[data-tab="t6"]')) setTimeout(enhance,30)});
  new MutationObserver(()=>{if(document.querySelector('#t6.active')) enhance()}).observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(enhance,500);
})();