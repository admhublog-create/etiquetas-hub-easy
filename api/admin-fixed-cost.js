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

    // Restaura no Relatório a visão antiga: inicial, entradas, retiradas, saldo e equivalência.
    const pre=html.match(/window\.__HUB_PRELOADED__=(\{.*?\});\(function\(\)/s);
    let data={retiradas:[],entradas:[]};
    if(pre){try{data=JSON.parse(pre[1])}catch{}}
    const legacyIds=new Set(['1a9216ff-90bc-4f64-8943-d2c0ad967b52','441056d3-75db-4010-999d-05612edfffe0']);
    const isLegacy=e=>legacyIds.has(String(e.id||''))||String(e.observacao||'').toLowerCase().includes('ajuste de estoque atual');
    const rows=data.retiradas||[], entries=(data.entradas||[]).filter(e=>!isLegacy(e));
    const reportRows=TYPES.map(t=>{
      const retiradas=rows.filter(x=>x.tamanho===t).reduce((s,x)=>s+Number(x.rolos||0),0);
      const entradas=entries.filter(x=>x.tamanho===t).reduce((s,x)=>s+Number(x.rolos||0),0);
      const saldo=stock[t]??(INITIAL[t]+entradas-retiradas);
      return `<tr><td><b>${t}</b></td><td>${INITIAL[t]}</td><td>${entradas}</td><td>${retiradas}</td><td><b>${saldo}</b></td><td>${equivalent(saldo)}</td><td>${brl(FIXED)}</td><td>${brl(Math.max(0,saldo)*FIXED)}</td></tr>`;
    }).join('');
    const totalInitial=TYPES.reduce((s,t)=>s+INITIAL[t],0);
    const totalReceived=entries.reduce((s,x)=>s+Number(x.rolos||0),0);
    const totalUsed=rows.reduce((s,x)=>s+Number(x.rolos||0),0);
    const detailed=`<div class="panel"><h3>Resumo do estoque</h3><p class="muted">Base completa desde o início do controle.</p><div class="table-wrap"><table class="table"><thead><tr><th>Tamanho</th><th>Inicial</th><th>Entradas</th><th>Retiradas</th><th>Saldo</th><th>Equivalência</th><th>Custo médio/rolo</th><th>Valor estimado saldo</th></tr></thead><tbody>${reportRows}</tbody></table></div></div><div class="panel" style="margin-top:14px"><h3>Indicadores gerais</h3><div class="dash-kpis"><div class="dash-kpi"><span>Estoque inicial</span><strong>${totalInitial}</strong><small>rolos no início do controle</small></div><div class="dash-kpi"><span>Rolos recebidos</span><strong>${totalReceived}</strong><small>entradas após o início</small></div><div class="dash-kpi"><span>Rolos retirados</span><strong>${totalUsed}</strong><small>consumo registrado</small></div><div class="dash-kpi"><span>Saldo atual</span><strong>${totalStock}</strong><small>rolos disponíveis</small></div></div></div>`;
    html=html.replace(/<section class="section" id="relatorios">[\s\S]*?<\/section>\s*<section class="section" id="config">/,`<section class="section" id="relatorios">${detailed}</section>\n<section class="section" id="config">`);

    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    res.status(200).send(html);
  }catch(err){
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.status(500).send(`<h1>Não foi possível carregar o painel</h1><p>${String(err.message||err)}</p>`);
  }
};