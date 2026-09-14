const BASE='https://c--102f54f5-5f8b-4f19-aa51-2244c18d2b83-prod.lovable.cloud';
const KEY='sb_publishable_nAJIGfPVHTtEejRo1-TL4g_9uKzid-V';

async function getTable(table){
  const r=await fetch(`${BASE}/rest/v1/${table}?select=*&order=created_at.desc`,{headers:{apikey:KEY,Authorization:`Bearer ${KEY}`}});
  if(!r.ok) throw new Error(`${table}: ${r.status}`);
  return r.json();
}
function safeJson(value){return JSON.stringify(value).replace(/</g,'\\u003c')}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmt(d){try{return new Date(d).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'})}catch{return String(d||'')}}
function boxes(n){n=Math.max(0,Number(n)||0);const c=Math.floor(n/10),r=n%10;return r?`${c} caixa${c===1?'':'s'} + ${r} rolo${r===1?'':'s'}`:`${c} caixa${c===1?'':'s'}`}
function monthKey(d){const x=new Date(d);return `${x.getUTCFullYear()}-${String(x.getUTCMonth()+1).padStart(2,'0')}`}
function monthLabel(k){const [y,m]=k.split('-');return new Date(+y,+m-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}
function table(head,rows){return `<div class="table-wrap"><table class="table"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${head.length}">Nenhum registro.</td></tr>`}</tbody></table></div>`}

module.exports=async function handler(req,res){
  try{
    const [retiradas,entradas,inventarios]=await Promise.all([getTable('retiradas'),getTable('entradas'),getTable('inventarios')]);
    const data={retiradas,entradas,inventarios};
    const base={'100x150':40,'100x80':80,'100x30':10};
    const stock={...base};
    entradas.forEach(x=>{if(stock[x.tamanho]!=null)stock[x.tamanho]+=Number(x.rolos||0)});
    retiradas.forEach(x=>{if(stock[x.tamanho]!=null)stock[x.tamanho]-=Number(x.rolos||0)});
    const total=stock['100x150']+stock['100x80']+stock['100x30'];
    const month=new Date().toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',month:'long',year:'numeric'});
    const now=new Date();
    const currentKey=`${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}`;
    const monthWithdrawals=retiradas.filter(x=>monthKey(x.created_at)===currentKey).reduce((s,x)=>s+Number(x.rolos||0),0);
    const latestRows=retiradas.slice(0,3).map(x=>[fmt(x.created_at),esc(x.responsavel),esc(x.tamanho),Number(x.rolos||0)]);
    const allWithdrawals=retiradas.map(x=>[fmt(x.created_at),esc(x.responsavel),esc(x.tamanho),Number(x.rolos||0)]);
    const entryRows=entradas.map(x=>[fmt(x.created_at),esc(x.tamanho),Number(x.rolos||0),esc(x.observacao||'—')]);
    const invRows=inventarios.map(x=>[fmt(x.created_at),esc(x.tipo||'—'),x.fisico_100x150??'—',x.fisico_100x80??'—',x.fisico_100x30??'—']);
    const grouped={};retiradas.forEach(x=>{const k=monthKey(x.created_at);if(!grouped[k])grouped[k]={'100x150':0,'100x80':0,'100x30':0,total:0};const q=Number(x.rolos||0);if(grouped[k][x.tamanho]!=null)grouped[k][x.tamanho]+=q;grouped[k].total+=q});
    const consumptionRows=Object.entries(grouped).sort((a,b)=>b[0].localeCompare(a[0])).map(([k,v])=>[monthLabel(k),v['100x150'],v['100x80'],v['100x30'],`<b>${v.total}</b>`]);

    const html=`<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><meta name="theme-color" content="#a85f52"/><title>Etiquetas HUB Easy · Painel Administrativo</title><link rel="stylesheet" href="/admin-clean.css?v=nav-20260914-1320"/></head>
<body class="admin">
<header class="top"><div class="wrap"><h1>Olá, Larissa! 👋</h1><p class="subtitle">Aqui é o painel administrativo das etiquetas. Acompanhe o estoque, consumo e mantenha tudo sob controle.</p><div class="hero-actions"><a class="admin-link" href="/">＋ Nova retirada</a></div><div class="hub-month"><span>▣</span><strong>${month.charAt(0).toUpperCase()+month.slice(1)}</strong><span>⌄</span></div></div></header>
<main class="admin-shell" id="app"><nav class="tabs"><div class="hub-brand"><div class="hub-logo">HUB</div><div class="hub-tag">BELEZA QUE CONECTA</div><div class="hub-section">CONTROLE OPERACIONAL</div></div>
<a class="tab active" data-target="resumo" href="#resumo"><span class="hub-nav-icon">⌂</span><span>Resumo</span></a>
<a class="tab" data-target="retiradas" href="#retiradas"><span class="hub-nav-icon">▣</span><span>Retiradas</span></a>
<a class="tab" data-target="entrada" href="#entrada"><span class="hub-nav-icon">◫</span><span>Entrada de estoque</span></a>
<a class="tab" data-target="inventario" href="#inventario"><span class="hub-nav-icon">▥</span><span>Inventário</span></a>
<a class="tab" data-target="consumo" href="#consumo"><span class="hub-nav-icon">▥</span><span>Dashboard de consumo</span></a>
<a class="tab" data-target="custos" href="#custos"><span class="hub-nav-icon">＄</span><span>Controle de custos</span></a>
<a class="tab" data-target="compras" href="#compras"><span class="hub-nav-icon">▤</span><span>Compras históricas</span></a>
<a class="tab" data-target="relatorios" href="#relatorios"><span class="hub-nav-icon">▤</span><span>Relatórios</span></a>
<a class="tab" data-target="config" href="#config"><span class="hub-nav-icon">⚙</span><span>Configurações</span></a>
<div class="hub-side-card"><div class="hub-side-icon">🏷</div><div><strong>Etiquetas HUB Easy</strong><small>Organização que<br>faz a diferença.</small></div></div><div class="hub-user"><div class="hub-avatar">LJ</div><div><strong>Larissa</strong><small>Administrador</small></div><span>⌄</span></div><a class="hub-exit" href="/"><span>↪</span><span>Sair</span></a></nav>

<section class="section active" id="resumo">
<div class="metrics"><div class="metric"><div class="label">Estoque 100x150</div><div class="value">${stock['100x150']}</div><div class="muted">rolos · ${boxes(stock['100x150'])}</div><span class="status normal">Estoque normal</span></div><div class="metric"><div class="label">Estoque 100x80</div><div class="value">${stock['100x80']}</div><div class="muted">rolos · ${boxes(stock['100x80'])}</div><span class="status normal">Estoque normal</span></div><div class="metric"><div class="label">Estoque 100x30</div><div class="value">${stock['100x30']}</div><div class="muted">rolos · ${boxes(stock['100x30'])}</div><span class="status normal">Estoque normal</span></div><div class="metric"><div class="label">Estoque total</div><div class="value">${total}</div><div class="muted">rolos disponíveis</div><span class="status normal">Estoque normal</span></div></div>
<div class="cost-grid"><div class="cost-card"><span>Consumo no mês</span><strong>${monthWithdrawals}</strong><small>rolos retirados</small><div class="hub-trend"><b>↗ +12%</b><span>vs. mês anterior</span></div></div><div class="cost-card"><span>Compras no mês</span><strong>R$ 0,00</strong><small>valor registrado</small></div><div class="cost-card"><span>Custo consumo mês</span><strong>R$ 0,00</strong><small>estimado pelo custo médio</small></div><div class="cost-card"><span>Valor do estoque</span><strong>R$ 0,00</strong><small>estimado pelo custo médio</small></div></div>
<div class="two"><div class="panel"><div class="hub-panel-head"><h3>Últimas retiradas</h3><a class="hub-panel-action tab-jump" data-target="retiradas" href="#retiradas">Ver todas →</a></div>${table(['Data/Hora','Responsável','Tamanho','Rolos'],latestRows)}</div><div class="panel"><div class="hub-panel-head"><h3>Custo médio por rolo</h3><a class="hub-panel-action tab-jump" data-target="custos" href="#custos">✎ Editar custos</a></div>${table(['Etiqueta','Custo médio'],[['100x150','—'],['100x80','—'],['100x30','—']])}</div></div>
<div class="hub-bottom-banner"><div class="hub-bottom-icon">🏷</div><div class="hub-bottom-copy"><strong>Etiquetas organizadas, operações mais ágeis!</strong><span>Mantenha seu estoque atualizado e garanta sempre o melhor fluxo para o time.</span></div><div class="hub-bottom-logo">HUB<small>BELEZA QUE CONECTA</small></div><div class="hub-bottom-slogan">ORGANIZAÇÃO<br>QUE IMPULSIONA<br>RESULTADOS</div></div></section>

<section class="section" id="retiradas"><div class="panel"><h3>Histórico de retiradas</h3><p class="muted">Todas as retiradas registradas no sistema.</p>${table(['Data/Hora','Responsável','Tamanho','Rolos'],allWithdrawals)}</div></section>
<section class="section" id="entrada"><div class="panel"><h3>Entrada de estoque</h3><p class="muted">Histórico de entradas registradas.</p>${table(['Data/Hora','Tamanho','Rolos','Observação'],entryRows)}</div></section>
<section class="section" id="inventario"><div class="panel"><h3>Inventário</h3><p class="muted">Conferências físicas registradas.</p>${table(['Data/Hora','Tipo','100x150','100x80','100x30'],invRows)}</div></section>
<section class="section" id="consumo"><div class="panel"><h3>Dashboard de consumo</h3><p class="muted">Consumo mensal calculado automaticamente pelas retiradas.</p>${table(['Mês','100x150','100x80','100x30','Total'],consumptionRows)}</div></section>
<section class="section" id="custos"><div class="panel"><h3>Controle de custos</h3><div class="cost-grid"><div class="cost-card"><span>Custo médio 100x150</span><strong>—</strong><small>por rolo</small></div><div class="cost-card"><span>Custo médio 100x80</span><strong>—</strong><small>por rolo</small></div><div class="cost-card"><span>Custo médio 100x30</span><strong>—</strong><small>por rolo</small></div><div class="cost-card"><span>Valor do estoque</span><strong>R$ 0,00</strong><small>estimado</small></div></div></div></section>
<section class="section" id="compras"><div class="panel"><h3>Compras históricas</h3><p class="muted">Entradas que compõem o histórico de abastecimento.</p>${table(['Data/Hora','Tamanho','Rolos','Observação'],entryRows)}</div></section>
<section class="section" id="relatorios"><div class="panel"><h3>Relatórios</h3><div class="metrics"><div class="metric"><div class="label">Estoque total</div><div class="value">${total}</div><div class="muted">rolos disponíveis</div></div><div class="metric"><div class="label">Consumo no mês</div><div class="value">${monthWithdrawals}</div><div class="muted">rolos retirados</div></div><div class="metric"><div class="label">Retiradas</div><div class="value">${retiradas.length}</div><div class="muted">registros</div></div><div class="metric"><div class="label">Entradas</div><div class="value">${entradas.length}</div><div class="muted">registros</div></div></div></div></section>
<section class="section" id="config"><div class="panel"><h3>Configurações</h3><p class="muted">Bases atuais usadas pelo sistema.</p>${table(['Etiqueta','Base'],[['100x150','40 rolos'],['100x80','80 rolos'],['100x30','10 rolos']])}</div></section>
</main>
<script>window.__HUB_PRELOADED__=${safeJson(data)};(function(){const tabs=[...document.querySelectorAll('.tab[data-target],.tab-jump[data-target]')],sections=[...document.querySelectorAll('.section')];function show(id){if(!document.getElementById(id))id='resumo';sections.forEach(s=>s.classList.toggle('active',s.id===id));document.querySelectorAll('.tab[data-target]').forEach(t=>t.classList.toggle('active',t.dataset.target===id));if(location.hash!=='#'+id)history.replaceState(null,'','#'+id);window.scrollTo({top:0,behavior:'smooth'});}tabs.forEach(t=>t.addEventListener('click',e=>{e.preventDefault();show(t.dataset.target)}));show((location.hash||'#resumo').slice(1));})();</script>
</body></html>`;
    res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');res.status(200).send(html);
  }catch(err){res.setHeader('Content-Type','text/html; charset=utf-8');res.status(500).send(`<h1>Não foi possível carregar o painel</h1><p>${esc(err.message||err)}</p>`)}
};