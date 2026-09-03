import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://c--102f54f5-5f8b-4f19-aa51-2244c18d2b83-prod.lovable.cloud';
const SUPABASE_KEY='sb_publishable_nAJIGfPVHTtEejRo1-TL4g_9uKzid-V';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);

const TYPES=['100x150','100x80','100x30'];
const BASE={'100x150':40,'100x80':80,'100x30':10};
const LIMITS={'100x150':{low:10,critical:5},'100x80':{low:20,critical:10},'100x30':{low:5,critical:2}};
const BOX_ROLLS=10;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmt=d=>new Date(d).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'});
const monthKey=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(new Date(d)).slice(0,7);
const monthLabel=k=>{const [y,m]=k.split('-');return new Date(Number(y),Number(m)-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'})};
const boxes=r=>{const c=Math.floor(Math.max(0,r)/10),x=Math.max(0,r)%10;return x?`${c} caixa${c===1?'':'s'} + ${x} rolo${x===1?'':'s'}`:`${c} caixa${c===1?'':'s'}`};

function header(admin=false){return `<header class="top"><div class="wrap"><div class="eyebrow">HUB • CONTROLE OPERACIONAL</div><h1>Etiquetas HUB Easy</h1><p class="subtitle">${admin?'Painel administrativo':'Retirada de etiquetas'}</p>${admin?'<div class="hero-actions"><a class="admin-link" href="/">Área dos funcionários</a></div>':''}</div></header>`}

function home(){
  $('#app').innerHTML=`${header()}<main class="home"><div class="cards">${TYPES.map(t=>`<a class="type-card" href="/retirar/${t}"><div><div class="eyebrow" style="color:#64748b">Etiqueta</div><strong>${t}</strong></div><span class="pill">Retirar</span></a>`).join('')}</div></main>`;
}

function withdraw(type){
  if(!TYPES.includes(type)){location.href='/';return}
  $('#app').innerHTML=`${header()}<main class="home"><a class="back" href="/">← Voltar</a><section class="panel" style="margin-top:16px"><h2>Retirada · Etiqueta ${type}</h2><div class="form-grid"><div class="field"><label>Nome do responsável</label><input id="name" placeholder="Digite seu nome"></div><div class="field"><label>Quantidade de rolos</label><div class="qty"><button id="minus">−</button><input id="qty" type="number" min="1" value="1" style="text-align:center;font-size:24px;font-weight:800"><button id="plus">+</button></div></div><button class="btn" id="save">Confirmar retirada</button></div></section></main>`;
  $('#minus').onclick=()=>$('#qty').value=Math.max(1,Number($('#qty').value||1)-1);
  $('#plus').onclick=()=>$('#qty').value=Math.max(1,Number($('#qty').value||1)+1);
  $('#save').onclick=async()=>{
    const responsavel=$('#name').value.trim();const rolos=Math.max(1,Number($('#qty').value||1));
    if(!responsavel)return alert('Informe o nome do responsável.');
    if(!confirm(`${responsavel} irá retirar ${rolos} rolo(s) da etiqueta ${type}. Confirmar?`))return;
    $('#save').disabled=true;
    const {error}=await supabase.from('retiradas').insert({responsavel,tamanho:type,rolos});
    $('#save').disabled=false;
    if(error)return alert('Não foi possível registrar a retirada.');
    alert('Retirada registrada com sucesso!');location.href='/';
  };
}

async function admin(){
  $('#app').innerHTML=`${header(true)}<main class="admin-shell"><div id="loading" class="panel">Carregando dados...</div></main>`;
  const [r,e,i]=await Promise.all([
    supabase.from('retiradas').select('*').order('created_at',{ascending:false}),
    supabase.from('entradas').select('*').order('created_at',{ascending:false}),
    supabase.from('inventarios').select('*').order('created_at',{ascending:false})
  ]);
  if(r.error||e.error||i.error){$('#loading').innerHTML='Não foi possível carregar o painel.';return}
  renderAdmin(r.data||[],e.data||[],i.data||[]);
}

function calc(rows,entries){const s={...BASE};entries.forEach(x=>s[x.tamanho]+=Number(x.rolos||0));rows.forEach(x=>s[x.tamanho]-=Number(x.rolos||0));return s}
function status(t,v){const l=LIMITS[t];if(v<=l.critical)return['critical','ESTOQUE CRÍTICO'];if(v<=l.low)return['low','ESTOQUE BAIXO'];return['normal','ESTOQUE NORMAL']}
function consumption(rows){const m={};rows.forEach(x=>{const k=monthKey(x.created_at);if(!m[k])m[k]={total:0,'100x150':0,'100x80':0,'100x30':0,days:new Set()};const q=Number(x.rolos||0);m[k][x.tamanho]+=q;m[k].total+=q;m[k].days.add(new Date(x.created_at).toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}))});const a=Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0]));return a.map(([k,v],idx)=>{const prev=idx?a[idx-1][1].total:null;return{k,...v,avg:v.days.size?v.total/v.days.size:0,var:prev?((v.total-prev)/prev)*100:null}}).reverse()}

function renderAdmin(rows,entries,inventories){
  const s=calc(rows,entries),total=TYPES.reduce((a,t)=>a+s[t],0),cons=consumption(rows);
  const alerts=TYPES.filter(t=>status(t,s[t])[0]!=='normal');
  $('.admin-shell').innerHTML=`
  <div class="tabs">${['Resumo','Retiradas','Entrada de estoque','Inventário','Consumo mensal','Relatórios'].map((x,i)=>`<button class="tab ${i===0?'active':''}" data-tab="t${i}">${x}</button>`).join('')}</div>
  <section class="section active" id="t0">
    ${alerts.length?`<div class="alert"><strong>Atenção ao estoque</strong><div class="muted" style="margin-top:6px">${alerts.map(t=>`Etiqueta ${t}: ${s[t]} rolos restantes (${status(t,s[t])[1]}).`).join('<br>')}</div></div>`:''}
    <div class="metrics">${TYPES.map(t=>{const st=status(t,s[t]);return`<div class="metric"><div class="label">Etiqueta ${t}</div><div class="value">${s[t]}</div><div class="muted">rolos · ${boxes(s[t])}</div><span class="status ${st[0]}">${st[1]}</span></div>`}).join('')}<div class="metric"><div class="label">Total em estoque</div><div class="value">${total}</div><div class="muted">rolos · ${boxes(total)}</div></div></div>
    <div class="panel" style="margin-top:16px"><h3>Últimas retiradas</h3>${table(['Data/Hora','Responsável','Tamanho','Rolos'],rows.slice(0,10).map(x=>[fmt(x.created_at),esc(x.responsavel),x.tamanho,x.rolos]))}</div>
  </section>
  <section class="section" id="t1"><div class="panel"><h3>Histórico de retiradas</h3>${table(['Data/Hora','Responsável','Tamanho','Rolos','Ação'],rows.map(x=>[fmt(x.created_at),esc(x.responsavel),x.tamanho,x.rolos,`<button class="btn danger del" data-table="retiradas" data-id="${x.id}">Excluir</button>`]))}</div></section>
  <section class="section" id="t2"><div class="two"><div class="panel"><h3>Registrar entrada</h3><div class="form-grid"><div class="field"><label>Tamanho</label><select id="entryType">${TYPES.map(t=>`<option>${t}</option>`).join('')}</select></div><div class="field"><label>Unidade</label><select id="entryUnit"><option value="boxes">Caixas</option><option value="rolls">Rolos</option></select></div><div class="field"><label>Quantidade</label><input id="entryQty" type="number" min="1" value="1"></div><div class="field"><label>Observação</label><textarea id="entryObs"></textarea></div><div class="muted" id="entryPreview">Será somado: 10 rolos</div><button class="btn" id="entrySave">Registrar entrada</button></div></div><div class="panel"><h3>Histórico de entradas</h3>${table(['Data/Hora','Tamanho','Rolos','Observação','Ação'],entries.map(x=>[fmt(x.created_at),x.tamanho,x.rolos,esc(x.observacao||'—'),`<button class="btn danger del" data-table="entradas" data-id="${x.id}">Excluir</button>`]))}</div></div></section>
  <section class="section" id="t3"><div class="two"><div class="panel"><h3>Novo inventário</h3><div class="form-grid"><div class="field"><label>Tipo</label><select id="invType"><option value="quinzenal">Quinzenal</option><option value="mensal">Mensal</option></select></div>${TYPES.map(t=>`<div class="field"><label>Contagem física ${t} (rolos)</label><input class="inv" data-type="${t}" type="number" min="0" value="0"><div class="muted">Sistema: ${s[t]} rolos</div></div>`).join('')}<div class="field"><label>Observação</label><textarea id="invObs"></textarea></div><button class="btn" id="invSave">Salvar inventário</button></div></div><div class="panel"><h3>Histórico de inventários</h3>${inventories.length?inventories.map(x=>invCard(x)).join(''):'<div class="muted">Nenhum inventário registrado.</div>'}</div></div></section>
  <section class="section" id="t4"><div class="panel"><h3>Consumo mensal</h3>${table(['Mês','100x150','100x80','100x30','Total','Média/dia com retirada','Variação'],cons.map(x=>[monthLabel(x.k),x['100x150'],x['100x80'],x['100x30'],x.total,x.avg.toFixed(1),x.var==null?'—':`${x.var>0?'+':''}${x.var.toFixed(1)}%`]))}</div></section>
  <section class="section" id="t5"><div class="panel"><h3>Resumo do estoque</h3>${table(['Tamanho','Inicial','Entradas','Retiradas','Saldo','Equivalência'],TYPES.map(t=>[t,BASE[t],entries.filter(x=>x.tamanho===t).reduce((a,x)=>a+Number(x.rolos||0),0),rows.filter(x=>x.tamanho===t).reduce((a,x)=>a+Number(x.rolos||0),0),s[t],boxes(s[t])]))}</div><div class="panel" style="margin-top:16px"><h3>Consumo geral</h3><div class="three"><div class="metric"><div class="label">Rolos retirados</div><div class="value">${rows.reduce((a,x)=>a+Number(x.rolos||0),0)}</div></div><div class="metric"><div class="label">Registros de retirada</div><div class="value">${rows.length}</div></div><div class="metric"><div class="label">Rolos que entraram</div><div class="value">${entries.reduce((a,x)=>a+Number(x.rolos||0),0)}</div></div></div></div></section>`;
  bindAdmin(s);
}

function table(head,rows){if(!rows.length)return'<div class="muted">Nenhum registro.</div>';return`<div class="table-wrap"><table class="table"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
function invCard(x){return`<div style="padding:12px 0;border-bottom:1px solid #e5e7eb"><strong>Inventário ${esc(x.tipo)}</strong><div class="muted">${fmt(x.created_at)}</div><div class="muted" style="margin-top:6px">100x150: físico ${x.fisico_100x150} / sistema ${x.sistema_100x150} · diferença ${x.fisico_100x150-x.sistema_100x150}<br>100x80: físico ${x.fisico_100x80} / sistema ${x.sistema_100x80} · diferença ${x.fisico_100x80-x.sistema_100x80}<br>100x30: físico ${x.fisico_100x30} / sistema ${x.sistema_100x30} · diferença ${x.fisico_100x30-x.sistema_100x30}</div>${x.observacao?`<div class="muted">Obs.: ${esc(x.observacao)}</div>`:''}<button class="btn danger del" style="margin-top:8px" data-table="inventarios" data-id="${x.id}">Excluir</button></div>`}

function bindAdmin(stock){
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.section').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#'+b.dataset.tab).classList.add('active')});
  document.querySelectorAll('.del').forEach(b=>b.onclick=async()=>{if(!confirm('Excluir este registro?'))return;const {error}=await supabase.from(b.dataset.table).delete().eq('id',b.dataset.id);if(error)return alert('Não foi possível excluir.');admin()});
  const preview=()=>{if(!$('#entryQty'))return;const q=Math.max(1,Number($('#entryQty').value||1));$('#entryPreview').textContent=`Será somado: ${$('#entryUnit').value==='boxes'?q*10:q} rolos`};
  if($('#entryQty')){$('#entryQty').oninput=preview;$('#entryUnit').onchange=preview;$('#entrySave').onclick=async()=>{const q=Math.max(1,Number($('#entryQty').value||1)),boxesQty=$('#entryUnit').value==='boxes'?q:null,rolos=boxesQty?q*10:q;const {error}=await supabase.from('entradas').insert({tamanho:$('#entryType').value,rolos,caixas:boxesQty,observacao:$('#entryObs').value.trim()||null});if(error)return alert('Não foi possível registrar a entrada.');alert('Entrada registrada.');admin()}};
  if($('#invSave'))$('#invSave').onclick=async()=>{const f={};document.querySelectorAll('.inv').forEach(i=>f[i.dataset.type]=Math.max(0,Number(i.value||0)));const payload={tipo:$('#invType').value,fisico_100x150:f['100x150'],fisico_100x80:f['100x80'],fisico_100x30:f['100x30'],sistema_100x150:stock['100x150'],sistema_100x80:stock['100x80'],sistema_100x30:stock['100x30'],observacao:$('#invObs').value.trim()||null};const {error}=await supabase.from('inventarios').insert(payload);if(error)return alert('Não foi possível salvar o inventário.');alert('Inventário salvo. O estoque não foi alterado.');admin()};
}

const path=location.pathname.replace(/\/+$/,'')||'/';
if(path==='/')home();else if(path==='/admin')admin();else if(path.startsWith('/retirar/'))withdraw(decodeURIComponent(path.split('/')[2]||''));else home();