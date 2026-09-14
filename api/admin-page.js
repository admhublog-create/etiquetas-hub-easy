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
function monthKey(d){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(new Date(d)).slice(0,7)}

module.exports=async function handler(req,res){
  try{
    const [retiradas,entradas,inventarios]=await Promise.all([getTable('retiradas'),getTable('entradas'),getTable('inventarios')]);
    const data={retiradas,entradas,inventarios};
    const base={'100x150':40,'100x80':80,'100x30':10};
    const stock={...base};
    entradas.forEach(x=>{if(stock[x.tamanho]!=null)stock[x.tamanho]+=Number(x.rolos||0)});
    retiradas.forEach(x=>{if(stock[x.tamanho]!=null)stock[x.tamanho]-=Number(x.rolos||0)});
    const total=stock['100x150']+stock['100x80']+stock['100x30'];
    const now=new Date();
    const currentMonth=monthKey(now);
    const monthConsumption=retiradas.filter(x=>monthKey(x.created_at)===currentMonth).reduce((s,x)=>s+Number(x.rolos||0),0);
    const month=new Date().toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',month:'long',year:'numeric'});
    const rows=retiradas.slice(0,3).map(x=>`<tr><td>${fmt(x.created_at)}</td><td>${esc(x.responsavel)}</td><td>${esc(x.tamanho)}</td><td>${Number(x.rolos||0)}</td></tr>`).join('');
    const html=`<!doctype html>
<html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><meta name="theme-color" content="#a85f52"/><title>Etiquetas HUB Easy · Painel Administrativo</title><link rel="stylesheet" href="/styles.css"/><link rel="stylesheet" href="/admin-clean.css"/></head>
<body class="admin">
<header class="top"><div class="wrap"><h1>Olá, Larissa! 👋</h1><p class="subtitle">Aqui é o painel administrativo das etiquetas. Acompanhe o estoque, consumo e mantenha tudo sob controle.</p><div class="hero-actions"><a class="admin-link" href="/">＋ Nova retirada</a></div><div class="hub-month"><span>▣</span><strong>${month.charAt(0).toUpperCase()+month.slice(1)}</strong><span>⌄</span></div></div></header>
<main class="admin-shell" id="app"><div class="tabs"><div class="hub-brand"><div class="hub-logo">HUB</div><div class="hub-tag">BELEZA QUE CONECTA</div><div class="hub-section">CONTROLE OPERACIONAL</div></div>
<a class="tab active" href="#resumo"><span class="hub-nav-icon">⌂</span><span>Resumo</span></a><a class="tab" href="#retiradas"><span class="hub-nav-icon">▣</span><span>Retiradas</span></a><a class="tab" href="#entrada"><span class="hub-nav-icon">◫</span><span>Entrada de estoque</span></a><a class="tab" href="#inventario"><span class="hub-nav-icon">▥</span><span>Inventário</span></a><a class="tab" href="#consumo"><span class="hub-nav-icon">▥</span><span>Dashboard de consumo</span></a><a class="tab" href="#custos"><span class="hub-nav-icon">＄</span><span>Controle de custos</span></a><a class="tab" href="#compras"><span class="hub-nav-icon">▤</span><span>Compras históricas</span></a><a class="tab" href="#relatorios"><span class="hub-nav-icon">▤</span><span>Relatórios</span></a><a class="tab" href="#config"><span class="hub-nav-icon">⚙</span><span>Configurações</span></a>
<div class="hub-side-card"><div class="hub-side-icon">🏷</div><div><strong>Etiquetas HUB Easy</strong><small>Organização que<br>faz a diferença.</small></div></div><div class="hub-user"><div class="hub-avatar">LJ</div><div><strong>Larissa</strong><small>Administrador</small></div><span>⌄</span></div><a class="hub-exit" href="/"><span>↪</span><span>Sair</span></a></div>
<section class="section active" id="resumo">
<div class="metrics"><div class="metric"><div class="label">Estoque 100x150</div><div class="value">${stock['100x150']}</div><div class="muted">rolos · ${boxes(stock['100x150'])}</div><span class="status normal">Estoque normal</span></div><div class="metric"><div class="label">Estoque 100x80</div><div class="value">${stock['100x80']}</div><div class="muted">rolos · ${boxes(stock['100x80'])}</div><span class="status normal">Estoque normal</span></div><div class="metric"><div class="label">Estoque 100x30</div><div class="value">${stock['100x30']}</div><div class="muted">rolos · ${boxes(stock['100x30'])}</div><span class="status normal">Estoque normal</span></div><div class="metric"><div class="label">Estoque total</div><div class="value">${total}</div><div class="muted">rolos disponíveis</div><span class="status normal">Estoque normal</span></div></div>
<div class="cost-grid"><div class="cost-card"><span>Consumo no mês</span><strong>${monthConsumption}</strong><small>rolos retirados</small><div class="hub-trend"><b>↗ +12%</b><span>vs. mês anterior</span></div></div><div class="cost-card"><span>Compras no mês</span><strong>R$ 0,00</strong><small>valor registrado</small><div class="hub-trend neutral"><b>— 0%</b><span>vs. mês anterior</span></div></div><div class="cost-card"><span>Custo consumo mês</span><strong>R$ 0,00</strong><small>estimado pelo custo médio</small><div class="hub-trend neutral"><b>— 0%</b><span>vs. mês anterior</span></div></div><div class="cost-card"><span>Valor do estoque</span><strong>R$ 0,00</strong><small>estimado pelo custo médio</small></div></div>
<div class="two"><div class="panel"><div class="hub-panel-head"><h3>Últimas retiradas</h3><a class="hub-panel-action" href="#retiradas">Ver todas →</a></div><div class="table-wrap"><table class="table"><thead><tr><th>Data/Hora</th><th>Responsável</th><th>Tamanho</th><th>Rolos</th></tr></thead><tbody>${rows||'<tr><td colspan="4">Nenhuma retirada registrada.</td></tr>'}</tbody></table></div></div><div class="panel"><div class="hub-panel-head"><h3>Custo médio por rolo</h3><a class="hub-panel-action" href="#custos">✎ Editar custos</a></div><div class="table-wrap"><table class="table"><thead><tr><th>Etiqueta</th><th>Custo médio</th></tr></thead><tbody><tr><td>100x150</td><td>—</td></tr><tr><td>100x80</td><td>—</td></tr><tr><td>100x30</td><td>—</td></tr></tbody></table></div></div></div>
<div class="hub-bottom-banner"><div class="hub-bottom-icon">🏷</div><div class="hub-bottom-copy"><strong>Etiquetas organizadas, operações mais ágeis!</strong><span>Mantenha seu estoque atualizado e garanta sempre o melhor fluxo para o time.</span></div><div class="hub-bottom-logo">HUB<small>BELEZA QUE CONECTA</small></div><div class="hub-bottom-slogan">ORGANIZAÇÃO<br>QUE IMPULSIONA<br>RESULTADOS</div></div></section></main>
<script>window.__HUB_PRELOADED__=${safeJson(data)};</script>
</body></html>`;
    res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');res.status(200).send(html);
  }catch(err){res.setHeader('Content-Type','text/html; charset=utf-8');res.status(500).send(`<h1>Não foi possível carregar o painel</h1><p>${esc(err.message||err)}</p>`)}
};