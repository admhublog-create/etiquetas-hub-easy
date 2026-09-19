module.exports=async function handler(req,res){
  try{
    const proto=(req.headers['x-forwarded-proto']||'https').split(',')[0];
    const host=req.headers.host;
    const r=await fetch(`${proto}://${host}/api/admin-page`,{headers:{'cache-control':'no-cache'}});
    let html=await r.text();
    if(!r.ok){res.status(r.status).send(html);return}

    const FIXED=16;
    const INITIAL={'100x150':0,'100x80':18,'100x30':10};
    const TYPES=['100x150','100x80','100x30'];
    const brl=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
    const equivalent=n=>{const v=Math.max(0,Number(n)||0),c=Math.floor(v/10),x=v%10;return x?`${c} caixa${c===1?'':'s'} + ${x} rolo${x===1?'':'s'}`:`${c} caixa${c===1?'':'s'}`};
    const monthKey=d=>{const x=new Date(d);if(Number.isNaN(x.getTime()))return '';return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`};
    const monthName=k=>{const [y,m]=k.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase())};

    html=html.replace('<h1>Olá, Larissa! 👋</h1>','<h1>Controle de Etiquetas</h1>');

    TYPES.forEach(type=>{
      const row4=new RegExp(`<tr><td>${type}<\\/td><td>.*?<\\/td><td>(-?\\d+)<\\/td><td>.*?<\\/td><\\/tr>`,'g');
      html=html.replace(row4,(m,stock)=>`<tr><td>${type}</td><td>${brl(FIXED)}</td><td>${stock}</td><td>${brl(Math.max(0,Number(stock)||0)*FIXED)}</td></tr>`);
      const row2=new RegExp(`<tr><td>${type}<\\/td><td>.*?<\\/td><\\/tr>`,'g');
      html=html.replace(row2,`<tr><td>${type}</td><td><b class="money">${brl(FIXED)}</b></td></tr>`);
    });

    const stock={};
    [...html.matchAll(/<div class="label">Estoque (100x150|100x80|100x30)<\/div><div class="value">(-?\d+)<\/div>/g)].forEach(m=>stock[m[1]]=Number(m[2])||0);
    const totalStock=TYPES.reduce((s,t)=>s+Math.max(0,stock[t]||0),0);
    const consumoMatch=html.match(/<span>Consumo neste mês<\/span><strong>(\d+)<\/strong>/);
    const consumo=consumoMatch?Number(consumoMatch[1])||0:0;
    const estoqueValor=brl(totalStock*FIXED), consumoValor=brl(consumo*FIXED);

    html=html.replace(/(<span>Valor estimado do estoque<\/span><strong>).*?(<\/strong>)/g,`$1${estoqueValor}$2`);
    html=html.replace(/(<span>Valor do estoque<\/span><strong>).*?(<\/strong>)/g,`$1${estoqueValor}$2`);
    html=html.replace(/(<span>Custo do consumo no mês<\/span><strong>).*?(<\/strong>)/g,`$1${consumoValor}$2`);
    html=html.replace(/(<span>Custo consumo mês<\/span><strong>).*?(<\/strong>)/g,`$1${consumoValor}$2`);
    html=html.replace('Baseado nas compras cadastradas','Custo padrão atual: R$ 16,00 por rolo');

    const pre=html.match(/window\.__HUB_PRELOADED__=(\{.*?\});\(function\(\)/s);
    let data={retiradas:[],entradas:[],inventarios:[]};
    if(pre){try{data=JSON.parse(pre[1])}catch{}}
    const legacyIds=new Set(['1a9216ff-90bc-4f64-8943-d2c0ad967b52','441056d3-75db-4010-999d-05612edfffe0']);
    const isLegacy=e=>legacyIds.has(String(e.id||''))||String(e.observacao||'').toLowerCase().includes('ajuste de estoque atual');
    const rows=data.retiradas||[], entries=(data.entradas||[]).filter(e=>!isLegacy(e)), inventories=data.inventarios||[];
    const latestInventory=inventories[0]||null;
    const invRows=inventories.slice(0,12).map(x=>{
      const d=new Date(x.created_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'});
      const vals=TYPES.map(t=>{const k=t.replace('x','x');const fk='fisico_'+k, sk='sistema_'+k;const fv=Number(x[fk]??0),sv=Number(x[sk]??0);return {fv,sv,dif:fv-sv}});
      return '<tr><td>'+d+'</td><td>'+(x.tipo||'—')+'</td><td>'+vals[0].fv+'</td><td>'+vals[1].fv+'</td><td>'+vals[2].fv+'</td><td>'+(vals[0].fv+vals[1].fv+vals[2].fv)+'</td><td>'+(vals[0].dif+vals[1].dif+vals[2].dif)+'</td><td>'+(x.observacao||'—')+'</td></tr>';
    }).join('')||'<tr><td colspan="8">Nenhum inventário registrado.</td></tr>';
    const invSummary=latestInventory?TYPES.map(t=>{const fk='fisico_'+t,sk='sistema_'+t;const fv=Number(latestInventory[fk]??0),sv=Number(latestInventory[sk]??0);return '<div class="dash-kpi"><span>Inventário '+t+'</span><strong>'+fv+'</strong><small>Sistema: '+sv+' · Diferença: '+(fv-sv)+'</small></div>'}).join(''):'<div class="dash-kpi"><span>Inventário</span><strong>—</strong><small>Nenhuma contagem registrada</small></div>';
    // Após uma conferência física, o painel passa a exibir o saldo físico mais recente.
    // A diferença permanece registrada no histórico do inventário para rastreabilidade.
    if(latestInventory){TYPES.forEach(t=>{const v=Number(latestInventory['fisico_'+t]);if(Number.isFinite(v))stock[t]=v;});}


    const reportRows=TYPES.map(t=>{
      const retiradas=rows.filter(x=>x.tamanho===t).reduce((s,x)=>s+Number(x.rolos||0),0);
      const entradas=entries.filter(x=>x.tamanho===t).reduce((s,x)=>s+Number(x.rolos||0),0);
      const saldo=stock[t]??(INITIAL[t]+entradas-retiradas);
      return `<tr><td><b>${t}</b></td><td>${INITIAL[t]}</td><td>${entradas}</td><td>${retiradas}</td><td><b>${saldo}</b></td><td>${equivalent(saldo)}</td><td>${brl(FIXED)}</td><td>${brl(Math.max(0,saldo)*FIXED)}</td></tr>`;
    }).join('');
    const totalInitial=TYPES.reduce((s,t)=>s+INITIAL[t],0), totalReceived=entries.reduce((s,x)=>s+Number(x.rolos||0),0), totalUsed=rows.reduce((s,x)=>s+Number(x.rolos||0),0);

    const monthSet=new Set([...rows.map(x=>monthKey(x.created_at)),...entries.map(x=>monthKey(x.created_at))].filter(Boolean));
    const months=[...monthSet].sort().reverse();
    const monthlyRows=months.map(k=>{
      const received=entries.filter(x=>monthKey(x.created_at)===k).reduce((s,x)=>s+Number(x.rolos||0),0);
      const used=rows.filter(x=>monthKey(x.created_at)===k).reduce((s,x)=>s+Number(x.rolos||0),0);
      const byType=TYPES.map(t=>rows.filter(x=>x.tamanho===t&&monthKey(x.created_at)===k).reduce((s,x)=>s+Number(x.rolos||0),0));
      return `<tr data-month="${k}"><td><b>${monthName(k)}</b></td><td>${received}</td><td>${byType[0]}</td><td>${byType[1]}</td><td>${byType[2]}</td><td><b>${used}</b></td><td>${brl(used*FIXED)}</td></tr>`;
    }).join('')||'<tr><td colspan="7">Nenhuma movimentação mensal registrada.</td></tr>';
    const monthOptions=months.map(k=>`<option value="${k}">${monthName(k)}</option>`).join('');

    const detailed=`<div class="panel"><div class="hub-panel-head"><div><h3>Resumo do estoque</h3><p class="muted">Base completa desde o início do controle.</p></div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><label style="font-size:12px;font-weight:800;color:#806963">Competência</label><select id="reportMonth" style="padding:9px 12px;border:1px solid #e6d5cf;border-radius:10px;background:#fff"><option value="total">Total geral</option>${monthOptions}</select></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Tamanho</th><th>Inicial</th><th>Entradas</th><th>Retiradas</th><th>Saldo</th><th>Equivalência</th><th>Custo médio/rolo</th><th>Valor estimado saldo</th></tr></thead><tbody>${reportRows}</tbody></table></div></div><div class="panel" style="margin-top:14px"><h3>Indicadores gerais</h3><div class="dash-kpis"><div class="dash-kpi"><span>Estoque inicial</span><strong>${totalInitial}</strong><small>rolos no início do controle</small></div><div class="dash-kpi"><span>Rolos recebidos</span><strong>${totalReceived}</strong><small>entradas após o início</small></div><div class="dash-kpi"><span>Rolos retirados</span><strong>${totalUsed}</strong><small>consumo registrado</small></div><div class="dash-kpi"><span>Saldo atual</span><strong>${totalStock}</strong><small>rolos disponíveis</small></div></div></div><div class="panel" style="margin-top:14px"><div class="hub-panel-head"><div><h3>Inventário físico</h3><p class="muted">Última conferência física e histórico de contagens para complementar o relatório.</p></div></div><div class="dash-kpis">${invSummary}</div><div class="table-wrap" style="margin-top:12px"><table class="table"><thead><tr><th>Data</th><th>Tipo</th><th>100x150</th><th>100x80</th><th>100x30</th><th>Total físico</th><th>Diferença total</th><th>Observação</th></tr></thead><tbody>${invRows}</tbody></table></div></div><div class="panel" style="margin-top:14px"><div class="hub-panel-head"><div><h3>Movimentação por competência</h3><p class="muted">Consulte cada mês separadamente ou mantenha a visão total.</p></div></div><div class="table-wrap"><table class="table" id="monthlyReport"><thead><tr><th>Competência</th><th>Entradas</th><th>Ret. 100x150</th><th>Ret. 100x80</th><th>Ret. 100x30</th><th>Total retirado</th><th>Custo do consumo</th></tr></thead><tbody>${monthlyRows}</tbody></table></div></div><script>(function(){var s=document.getElementById('reportMonth'),t=document.getElementById('monthlyReport');if(!s||!t)return;s.addEventListener('change',function(){var v=s.value;t.querySelectorAll('tbody tr[data-month]').forEach(function(r){r.style.display=(v==='total'||r.dataset.month===v)?'':'none'})})})();<\/script>`;
    html=html.replace(/<section class="section" id="relatorios">[\s\S]*?<\/section>\s*<section class="section" id="config">/,`<section class="section" id="relatorios">${detailed}</section>\n<section class="section" id="config">`);

    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    res.status(200).send(html);
  }catch(err){
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.status(500).send(`<h1>Não foi possível carregar o painel</h1><p>${String(err.message||err)}</p>`);
  }
};