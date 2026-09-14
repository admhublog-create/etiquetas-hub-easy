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
    const rows=retiradas.slice(0,8).map(x=>`<tr><td>${fmt(x.created_at)}</td><td>${esc(x.responsavel)}</td><td>${esc(x.tamanho)}</td><td>${Number(x.rolos||0)}</td></tr>`).join('');
    const html=`<!doctype html>
<html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><meta name="theme-color" content="#a85f52"/><title>Etiquetas HUB Easy · Painel Administrativo</title><link rel="stylesheet" href="/styles.css"/><link rel="stylesheet" href="/admin-clean.css"/></head>
<body class="admin">
<header class="top"><div class="wrap"><div class="eyebrow"></div><h1>Olá, Larissa! 👋</h1><p class="subtitle">Aqui é o painel administrativo das etiquetas. Acompanhe o estoque, consumo e mantenha tudo sob controle.</p><div class="hero-actions"><a class="admin-link" href="/">+ Nova retirada</a></div><div class="hub-month"><span>▣</span><strong>${month.charAt(0).toUpperCase()+month.slice(1)}</strong><span>⌄</span></div></div></header>
<main class="admin-shell" id="app"><div class="tabs"><div class="hub-brand"><div class="hub-logo">HUB</div><div class="hub-tag">BELEZA QUE CONECTA</div><div class="hub-section">CONTROLE OPERACIONAL</div></div><button class="tab active"><span class="hub-nav-icon">⌂</span><span>Resumo</span></button><button class="tab"><span class="hub-nav-icon">▣</span><span>Retiradas</span></button><button class="tab"><span class="hub-nav-icon">◫</span><span>Entrada de estoque</span></button><button class="tab"><span class="hub-nav-icon">▥</span><span>Inventário</span></button><button class="tab"><span class="hub-nav-icon">▥</span><span>Dashboard de consumo</span></button><button class="tab"><span class="hub-nav-icon">＄</span><span>Controle de custos</span></button><button class="tab"><span class="hub-nav-icon">▤</span><span>Relatórios</span></button><div class="hub-side-card"><div class="hub-side-icon">🏷</div><div><strong>Etiquetas HUB Easy</strong><small>Organização que<br>faz a diferença.</small></div></div><div class="hub-user"><div class="hub-avatar">LJ</div><div><strong>Larissa</strong><small>Administrador</small></div><span>⌄</span></div><a class="hub-exit" href="/"><span>↪</span><span>Sair</span></a></div>
<section class="section active"><div class="metrics"><div class="metric"><div class="label">Estoque 100x150</div><div class="value">${stock['100x150']}</div><div class="muted">rolos · ${boxes(stock['100x150'])}</div><span class="status normal">ESTOQUE NORMAL</span></div><div class="metric"><div class="label">Estoque 100x80</div><div class="value">${stock['100x80']}</div><div class="muted">rolos · ${boxes(stock['100x80'])}</div><span class="status normal">ESTOQUE NORMAL</span></div><div class="metric"><div class="label">Estoque 100x30</div><div class="value">${stock['100x30']}</div><div class="muted">rolos · ${boxes(stock['100x30'])}</div><span class="status normal">ESTOQUE NORMAL</span></div><div class="metric"><div class="label">Estoque total</div><div class="value">${total}</div><div class="muted">rolos disponíveis</div></div></div>
<div class="two" style="margin-top:16px"><div class="panel"><h3>Últimas retiradas</h3><div class="table-wrap"><table class="table"><thead><tr><th>Data/Hora</th><th>Responsável</th><th>Tamanho</th><th>Rolos</th></tr></thead><tbody>${rows||'<tr><td colspan="4">Nenhuma retirada registrada.</td></tr>'}</tbody></table></div></div><div class="panel"><h3>Resumo rápido</h3><div class="cost-grid" style="grid-template-columns:1fr 1fr!important"><div class="cost-card"><span>Registros de retirada</span><strong>${retiradas.length}</strong></div><div class="cost-card"><span>Entradas registradas</span><strong>${entradas.length}</strong></div></div></div></div>
<div class="hub-bottom-banner"><div class="hub-bottom-icon">🏷</div><div class="hub-bottom-copy"><strong>Etiquetas organizadas, operações mais ágeis!</strong><span>Mantenha seu estoque atualizado e garanta sempre o melhor fluxo para o time.</span></div><div class="hub-bottom-logo">HUB<small>BELEZA QUE CONECTA</small></div><div class="hub-bottom-slogan">ORGANIZAÇÃO<br>QUE IMPULSIONA<br>RESULTADOS</div></div></section></main>
<script>window.__HUB_PRELOADED__=${safeJson(data)};</script>
</body></html>`;
    res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');res.status(200).send(html);
  }catch(err){res.setHeader('Content-Type','text/html; charset=utf-8');res.status(500).send(`<h1>Não foi possível carregar o painel</h1><p>${esc(err.message||err)}</p>`)}
};