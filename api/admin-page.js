const BASE='https://c--102f54f5-5f8b-4f19-aa51-2244c18d2b83-prod.lovable.cloud';
const KEY='sb_publishable_nAJIGfPVHTtEejRo1-TL4g_9uKzid-V';
const TYPES=['100x150','100x80','100x30'];

async function getTable(table,order='created_at.desc'){
  const r=await fetch(`${BASE}/rest/v1/${table}?select=*&order=${order}`,{headers:{apikey:KEY,Authorization:`Bearer ${KEY}`}});
  if(!r.ok) throw new Error(`${table}: ${r.status}`);
  return r.json();
}
function safeJson(value){return JSON.stringify(value).replace(/</g,'\\u003c')}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmt(d){try{return new Date(d).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'})}catch{return String(d||'')}}
function brl(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function boxes(n){n=Math.max(0,Number(n)||0);const c=Math.floor(n/10),r=n%10;return r?`${c} caixa${c===1?'':'s'} + ${r} rolo${r===1?'':'s'}`:`${c} caixa${c===1?'':'s'}`}
function monthKey(d){const x=new Date(d);return `${x.getUTCFullYear()}-${String(x.getUTCMonth()+1).padStart(2,'0')}`}
function monthLabel(k){const [y,m]=String(k).split('-');const s=new Date(+y,+m-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});return s.charAt(0).toUpperCase()+s.slice(1)}
function table(head,rows,empty='Nenhum registro.'){
  return `<div class="table-wrap"><table class="table"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${head.length}">${empty}</td></tr>`}</tbody></table></div>`
}
function pct(v){return v==null?'—':`${v>0?'+':''}${v.toFixed(1)}%`}

module.exports=async function handler(req,res){
  try{
    const [retiradas,entradas,inventarios,compras]=await Promise.all([
      getTable('retiradas'),getTable('entradas'),getTable('inventarios'),getTable('compras_historicas','competencia.desc,created_at.desc')
    ]);
    const data={retiradas,entradas,inventarios,compras};
    const base={'100x150':40,'100x80':80,'100x30':10};
    const stock={...base};
    entradas.forEach(x=>{if(stock[x.tamanho]!=null)stock[x.tamanho]+=Number(x.rolos||0)});
    retiradas.forEach(x=>{if(stock[x.tamanho]!=null)stock[x.tamanho]-=Number(x.rolos||0)});
    const total=TYPES.reduce((s,t)=>s+stock[t],0);
    const now=new Date();
    const currentKey=`${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}`;
    const prevDate=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-1,1));
    const prevKey=`${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth()+1).padStart(2,'0')}`;
    const month=monthLabel(currentKey);

    const avgCost={};
    TYPES.forEach(t=>{
      const a=compras.filter(x=>x.tamanho===t&&Number(x.valor)>0&&Number(x.rolos)>0);
      const val=a.reduce((s,x)=>s+Number(x.valor||0),0), rolls=a.reduce((s,x)=>s+Number(x.rolos||0),0);
      avgCost[t]=rolls?val/rolls:0;
    });
    const totalInvested=compras.reduce((s,x)=>s+Number(x.valor||0),0);
    const purchaseMonth=compras.filter(x=>x.competencia===currentKey).reduce((s,x)=>s+Number(x.valor||0),0);
    const estimatedStock=TYPES.reduce((s,t)=>s+Math.max(0,stock[t])*avgCost[t],0);

    const consByMonth={};
    retiradas.forEach(x=>{
      const k=monthKey(x.created_at);if(!consByMonth[k])consByMonth[k]={'100x150':0,'100x80':0,'100x30':0,total:0,days:new Set(),people:{}};
      const q=Number(x.rolos||0);if(consByMonth[k][x.tamanho]!=null)consByMonth[k][x.tamanho]+=q;consByMonth[k].total+=q;
      consByMonth[k].days.add(new Date(x.created_at).toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}));
      const p=String(x.responsavel||'Não informado');consByMonth[k].people[p]=(consByMonth[k].people[p]||0)+q;
    });
    const cur=consByMonth[currentKey]||{'100x150':0,'100x80':0,'100x30':0,total:0,days:new Set(),people:{}};
    const prev=consByMonth[prevKey]||{total:0};
    const variation=prev.total?((cur.total-prev.total)/prev.total)*100:null;
    const avgDay=cur.days.size?cur.total/cur.days.size:0;
    const topType=TYPES.slice().sort((a,b)=>cur[b]-cur[a])[0];
    const topPerson=Object.entries(cur.people).sort((a,b)=>b[1]-a[1])[0];
    const currentConsumptionCost=TYPES.reduce((s,t)=>s+cur[t]*avgCost[t],0);

    const latestRows=retiradas.slice(0,5).map(x=>[fmt(x.created_at),esc(x.responsavel),esc(x.tamanho),Number(x.rolos||0)]);
    const allWithdrawals=retiradas.map(x=>[fmt(x.created_at),esc(x.responsavel),esc(x.tamanho),Number(x.rolos||0)]);
    const entryRows=entradas.map(x=>[fmt(x.created_at),esc(x.tamanho),Number(x.rolos||0),esc(x.observacao||'—')]);
    const invRows=inventarios.map(x=>[fmt(x.created_at),esc(x.tipo||'—'),x.fisico_100x150??'—',x.fisico_100x80??'—',x.fisico_100x30??'—']);
    const monthly=Object.entries(consByMonth).sort((a,b)=>b[0].localeCompare(a[0])).map(([k,v])=>{
      const cost=TYPES.reduce((s,t)=>s+v[t]*avgCost[t],0);
      return [monthLabel(k),v['100x150'],v['100x80'],v['100x30'],`<b>${v.total}</b>`,v.days.size?(v.total/v.days.size).toFixed(1):'0,0',brl(cost)];
    });
    const maxMonth=Math.max(1,...Object.values(consByMonth).map(v=>v.total));
    const monthBars=Object.entries(consByMonth).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,6).map(([k,v])=>`<div class="dash-bar-row"><span>${monthLabel(k)}</span><div class="dash-track"><i style="width:${Math.max(3,(v.total/maxMonth)*100)}%"></i></div><b>${v.total}</b></div>`).join('')||'<div class="muted">Sem consumo registrado.</div>';

    const costRows=TYPES.map(t=>[t,avgCost[t]?brl(avgCost[t]):'—',stock[t],avgCost[t]?brl(Math.max(0,stock[t])*avgCost[t]):'—']);
    const historicalRows=compras.map(x=>[
      monthLabel(x.competencia),esc(x.tamanho),x.caixas==null?'—':Number(x.caixas),Number(x.rolos||0),brl(x.valor||0),esc(x.fornecedor||'—'),esc(x.observacao||'—'),`<button class="mini-danger hist-delete" data-id="${esc(x.id)}">Excluir</button>`
    ]);

    const html=`<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><meta name="theme-color" content="#a85f52"/><title>Etiquetas HUB Easy · Painel Administrativo</title><link rel="stylesheet" href="/admin-clean.css?v=costdash-20260914-1345"/></head>
<body class="admin">
<header class="top"><div class="wrap"><h1>Olá, Larissa! 👋</h1><p class="subtitle">Painel administrativo das etiquetas · estoque, consumo e custos em um só lugar.</p><div class="hero-actions"><a class="admin-link" href="/">＋ Nova retirada</a></div><div class="hub-month"><span>▣</span><strong>${month}</strong><span>⌄</span></div></div></header>
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
<div class="cost-grid"><div class="cost-card"><span>Consumo no mês</span><strong>${cur.total}</strong><small>rolos retirados</small><div class="hub-trend ${variation!=null&&variation<=0?'good':'neutral'}"><b>${pct(variation)}</b><span>vs. mês anterior</span></div></div><div class="cost-card"><span>Compras no mês</span><strong>${brl(purchaseMonth)}</strong><small>histórico financeiro</small></div><div class="cost-card"><span>Custo consumo mês</span><strong>${brl(currentConsumptionCost)}</strong><small>estimado pelo custo médio</small></div><div class="cost-card"><span>Valor do estoque</span><strong>${brl(estimatedStock)}</strong><small>estimado pelo custo médio</small></div></div>
<div class="two"><div class="panel"><div class="hub-panel-head"><h3>Últimas retiradas</h3><a class="hub-panel-action tab-jump" data-target="retiradas" href="#retiradas">Ver todas →</a></div>${table(['Data/Hora','Responsável','Tamanho','Rolos'],latestRows)}</div><div class="panel"><div class="hub-panel-head"><h3>Custo médio por rolo</h3><a class="hub-panel-action tab-jump" data-target="custos" href="#custos">Gerenciar custos →</a></div>${table(['Etiqueta','Custo médio'],TYPES.map(t=>[t,avgCost[t]?`<b class="money">${brl(avgCost[t])}</b>`:'—']))}</div></div>
<div class="hub-bottom-banner"><div class="hub-bottom-icon">🏷</div><div class="hub-bottom-copy"><strong>Etiquetas organizadas, operações mais ágeis!</strong><span>Controle de estoque e custos sem misturar compras antigas ao saldo atual.</span></div><div class="hub-bottom-logo">HUB<small>BELEZA QUE CONECTA</small></div><div class="hub-bottom-slogan">ORGANIZAÇÃO<br>QUE IMPULSIONA<br>RESULTADOS</div></div></section>

<section class="section" id="retiradas"><div class="panel"><h3>Histórico de retiradas</h3><p class="muted">Todas as retiradas registradas no sistema.</p>${table(['Data/Hora','Responsável','Tamanho','Rolos'],allWithdrawals)}</div></section>
<section class="section" id="entrada"><div class="panel"><h3>Entrada de estoque</h3><div class="info-strip"><b>Entrada de estoque altera o saldo atual.</b><span>Para compras antigas usadas somente no controle financeiro, use Controle de custos.</span></div>${table(['Data/Hora','Tamanho','Rolos','Observação'],entryRows)}</div></section>
<section class="section" id="inventario"><div class="page-title"><div><span class="page-kicker">CONFERÊNCIA FÍSICA</span><h2>Inventário</h2><p>Registre a contagem física das etiquetas e compare automaticamente com o saldo do sistema.</p></div></div><div class="two"><div class="panel"><h3>Criar novo inventário</h3><form id="invForm" class="cost-form"><div class="field"><label>Tipo de inventário</label><select id="invType"><option value="mensal">Mensal</option><option value="quinzenal">Quinzenal</option><option value="manual">Manual</option></select></div>${TYPES.map(t=>`<div class="field"><label>Contagem física ${t} (rolos)</label><input class="inv-count" data-type="${t}" type="number" min="0" value="${Math.max(0,stock[t])}" required><div class="muted">Saldo no sistema: ${stock[t]} rolos</div></div>`).join('')}<div class="field"><label>Observação</label><textarea id="invObs" placeholder="Opcional"></textarea></div><button class="primary-action full" type="submit" id="invSave">＋ Registrar inventário</button><div id="invMsg" class="form-msg"></div></form></div><div class="panel"><h3>Histórico de inventários</h3><p class="muted">Conferências físicas já registradas.</p>${table(['Data/Hora','Tipo','100x150','100x80','100x30'],invRows)}</div></div></section>

<section class="section" id="consumo">
<div class="page-title"><div><span class="page-kicker">ANÁLISE OPERACIONAL</span><h2>Dashboard de consumo</h2><p>Acompanhe ritmo de uso, variação mensal e quais etiquetas mais saem.</p></div></div>
<div class="dash-kpis"><div class="dash-kpi"><span>Consumo neste mês</span><strong>${cur.total}</strong><small>rolos retirados</small></div><div class="dash-kpi"><span>Média por dia ativo</span><strong>${avgDay.toFixed(1).replace('.',',')}</strong><small>rolos/dia</small></div><div class="dash-kpi"><span>Etiqueta mais usada</span><strong>${topType}</strong><small>${cur[topType]} rolos no mês</small></div><div class="dash-kpi"><span>Maior retirada por responsável</span><strong>${topPerson?esc(topPerson[0]):'—'}</strong><small>${topPerson?topPerson[1]+' rolos':'Sem dados'}</small></div></div>
<div class="dash-grid"><div class="panel"><h3>Evolução mensal</h3><div class="dash-bars">${monthBars}</div></div><div class="panel"><h3>Distribuição do mês</h3>${TYPES.map(t=>{const p=cur.total?(cur[t]/cur.total)*100:0;return `<div class="type-progress"><div><b>${t}</b><span>${cur[t]} rolos · ${p.toFixed(0)}%</span></div><div class="dash-track"><i style="width:${Math.max(cur[t]?4:0,p)}%"></i></div></div>`}).join('')}</div></div>
<div class="panel" style="margin-top:14px"><h3>Consumo por mês</h3>${table(['Mês','100x150','100x80','100x30','Total','Média/dia','Custo estimado'],monthly)}</div></section>

<section class="section" id="custos">
<div class="page-title cost-title"><div><span class="page-kicker">FINANCEIRO</span><h2>Controle de custos</h2><p>Cadastre compras atuais ou antigas para formar histórico de custo. <b>Compras históricas não alteram o estoque.</b></p></div><button class="primary-action" id="focusPurchase">＋ Incluir compra passada</button></div>
<div class="dash-kpis cost-kpis"><div class="dash-kpi"><span>Total investido no histórico</span><strong>${brl(totalInvested)}</strong><small>${compras.length} lançamento${compras.length===1?'':'s'}</small></div><div class="dash-kpi"><span>Compras em ${month}</span><strong>${brl(purchaseMonth)}</strong><small>somente financeiro</small></div><div class="dash-kpi"><span>Custo do consumo no mês</span><strong>${brl(currentConsumptionCost)}</strong><small>estimativa por custo médio</small></div><div class="dash-kpi"><span>Valor estimado do estoque</span><strong>${brl(estimatedStock)}</strong><small>não altera o saldo físico</small></div></div>
<div class="cost-layout"><div class="panel"><div class="hub-panel-head"><h3>Custo médio por etiqueta</h3><span class="safe-badge">Baseado nas compras cadastradas</span></div>${table(['Etiqueta','Custo médio/rolo','Estoque atual','Valor estimado saldo'],costRows)}</div><div class="panel purchase-form-panel" id="purchaseForm"><h3>Registrar compra passada</h3><p class="muted">Use para notas/compras de meses anteriores. Esse lançamento entra nos indicadores de custo, mas <b>não soma rolos ao estoque.</b></p><form id="histForm" class="cost-form"><div class="field"><label>Competência</label><input id="hMonth" type="month" value="${currentKey}" required></div><div class="field"><label>Tamanho</label><select id="hType"><option>100x150</option><option>100x80</option><option>100x30</option></select></div><div class="form-row"><div class="field"><label>Unidade</label><select id="hUnit"><option value="boxes">Caixas</option><option value="rolls">Rolos</option></select></div><div class="field"><label>Quantidade</label><input id="hQty" type="number" min="1" value="1" required></div></div><div class="field"><label>Valor total da compra</label><input id="hValue" inputmode="decimal" placeholder="Ex.: 850,00" required></div><div class="field"><label>Fornecedor</label><input id="hSupplier" placeholder="Opcional"></div><div class="field"><label>Observação</label><textarea id="hObs" placeholder="Ex.: NF de julho / compra antes do início do sistema"></textarea></div><div class="no-stock-note">✓ Este lançamento é financeiro e não altera o estoque.</div><button class="primary-action full" type="submit" id="hSave">Salvar compra histórica</button><div id="formMsg" class="form-msg"></div></form></div></div>
<div class="panel" style="margin-top:14px"><div class="hub-panel-head"><h3>Compras cadastradas</h3><a class="hub-panel-action tab-jump" data-target="compras" href="#compras">Ver histórico completo →</a></div>${table(['Mês','Tamanho','Caixas','Rolos','Valor','Fornecedor'],compras.slice(0,6).map(x=>[monthLabel(x.competencia),esc(x.tamanho),x.caixas==null?'—':x.caixas,x.rolos,brl(x.valor||0),esc(x.fornecedor||'—')]),'Nenhuma compra de custo cadastrada.')}</div></section>

<section class="section" id="compras"><div class="page-title"><div><span class="page-kicker">HISTÓRICO FINANCEIRO</span><h2>Compras históricas</h2><p>Arquivo de compras para análise de custos. Esses registros <b>não alteram o estoque.</b></p></div><a class="primary-action tab-jump" data-target="custos" href="#custos">＋ Nova compra passada</a></div><div class="panel">${table(['Mês','Tamanho','Caixas','Rolos','Valor','Fornecedor','Observação','Ação'],historicalRows,'Nenhuma compra histórica cadastrada.')}</div></section>

<section class="section" id="relatorios"><div class="panel"><h3>Relatórios</h3><div class="dash-kpis"><div class="dash-kpi"><span>Estoque total</span><strong>${total}</strong><small>rolos disponíveis</small></div><div class="dash-kpi"><span>Consumo no mês</span><strong>${cur.total}</strong><small>rolos retirados</small></div><div class="dash-kpi"><span>Investimento histórico</span><strong>${brl(totalInvested)}</strong><small>compras cadastradas</small></div><div class="dash-kpi"><span>Valor estimado estoque</span><strong>${brl(estimatedStock)}</strong><small>pelo custo médio</small></div></div></div></section>
<section class="section" id="config"><div class="panel"><h3>Configurações</h3><p class="muted">Bases atuais usadas pelo sistema.</p>${table(['Etiqueta','Base'],[['100x150','40 rolos'],['100x80','80 rolos'],['100x30','10 rolos']])}</div></section>
</main>
<script>window.__HUB_PRELOADED__=${safeJson(data)};(function(){
 const tabs=[...document.querySelectorAll('.tab[data-target],.tab-jump[data-target]')],sections=[...document.querySelectorAll('.section')];
 function show(id){if(!document.getElementById(id))id='resumo';sections.forEach(function(s){s.classList.toggle('active',s.id===id)});document.querySelectorAll('.tab[data-target]').forEach(function(t){t.classList.toggle('active',t.dataset.target===id)});if(location.hash!=='#'+id)history.replaceState(null,'','#'+id);window.scrollTo({top:0,behavior:'smooth'});}
 tabs.forEach(function(t){t.addEventListener('click',function(e){e.preventDefault();show(t.dataset.target)})});show((location.hash||'#resumo').slice(1));
 var focus=document.getElementById('focusPurchase');if(focus)focus.addEventListener('click',function(){document.getElementById('purchaseForm').scrollIntoView({behavior:'smooth',block:'start'});document.getElementById('hMonth').focus()});
 function money(v){return Number(String(v||'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,''))||0}
 var invForm=document.getElementById('invForm');if(invForm)invForm.addEventListener('submit',async function(e){e.preventDefault();var btn=document.getElementById('invSave'),msg=document.getElementById('invMsg'),vals={};document.querySelectorAll('.inv-count').forEach(function(i){vals[i.dataset.type]=Math.max(0,Number(i.value||0))});btn.disabled=true;btn.textContent='Salvando...';msg.textContent='';try{var payload={tipo:document.getElementById('invType').value,fisico_100x150:vals['100x150'],fisico_100x80:vals['100x80'],fisico_100x30:vals['100x30'],sistema_100x150:${stock['100x150']},sistema_100x80:${stock['100x80']},sistema_100x30:${stock['100x30']},observacao:document.getElementById('invObs').value.trim()||null};var r=await fetch('${BASE}/rest/v1/inventarios',{method:'POST',headers:{apikey:'${KEY}',Authorization:'Bearer ${KEY}','Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(payload)});if(!r.ok)throw new Error('Não foi possível salvar o inventário.');msg.className='form-msg success';msg.textContent='Inventário registrado com sucesso.';setTimeout(function(){location.href='/admin#inventario';location.reload()},600)}catch(err){msg.className='form-msg error';msg.textContent=err.message||'Não foi possível salvar.'}finally{btn.disabled=false;btn.textContent='＋ Registrar inventário'}});
 var form=document.getElementById('histForm');if(form)form.addEventListener('submit',async function(e){e.preventDefault();var btn=document.getElementById('hSave'),msg=document.getElementById('formMsg');btn.disabled=true;btn.textContent='Salvando...';msg.textContent='';try{var q=Math.max(1,Number(document.getElementById('hQty').value||1)),isBox=document.getElementById('hUnit').value==='boxes';var payload={competencia:document.getElementById('hMonth').value,tamanho:document.getElementById('hType').value,caixas:isBox?q:null,rolos:isBox?q*10:q,valor:money(document.getElementById('hValue').value),fornecedor:document.getElementById('hSupplier').value.trim(),observacao:document.getElementById('hObs').value.trim()};var r=await fetch('/api/historical-purchases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),j=await r.json();if(!r.ok||!j.ok)throw new Error(j.error||'Não foi possível salvar.');msg.className='form-msg success';msg.textContent='Compra histórica salva. O estoque não foi alterado.';setTimeout(function(){location.href='/admin#custos'},700)}catch(err){msg.className='form-msg error';msg.textContent=err.message||'Não foi possível salvar.'}finally{btn.disabled=false;btn.textContent='Salvar compra histórica'}});
 document.querySelectorAll('.hist-delete').forEach(function(b){b.addEventListener('click',async function(){if(!confirm('Excluir esta compra histórica? Isso não altera o estoque.'))return;var r=await fetch('/api/historical-purchases?id='+encodeURIComponent(b.dataset.id),{method:'DELETE'});var j=await r.json();if(!r.ok||!j.ok)return alert('Não foi possível excluir.');location.reload()})});
})();</script>
</body></html>`;
    res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');res.status(200).send(html);
  }catch(err){res.setHeader('Content-Type','text/html; charset=utf-8');res.status(500).send(`<h1>Não foi possível carregar o painel</h1><p>${esc(err.message||err)}</p>`)}
};