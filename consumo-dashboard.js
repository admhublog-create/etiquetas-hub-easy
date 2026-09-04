import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const supabase=createClient('https://c--102f54f5-5f8b-4f19-aa51-2244c18d2b83-prod.lovable.cloud','sb_publishable_nAJIGfPVHTtEejRo1-TL4g_9uKzid-V');
const TYPES=['100x150','100x80','100x30'];
const monthKey=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(new Date(d)).slice(0,7);
const monthLabel=k=>{const [y,m]=k.split('-');return new Date(+y,+m-1,1).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}).replace('.','')};
const dayKey=d=>new Date(d).toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
function group(rows){
 const months={}; const days={}; const byType={'100x150':0,'100x80':0,'100x30':0};
 rows.forEach(r=>{const q=Number(r.rolos||0),m=monthKey(r.created_at),d=dayKey(r.created_at);months[m]=(months[m]||0)+q;days[d]=(days[d]||0)+q;if(byType[r.tamanho]!=null)byType[r.tamanho]+=q});
 return {months:Object.entries(months).sort((a,b)=>a[0].localeCompare(b[0])).slice(-6),days:Object.entries(days).sort((a,b)=>a[0].localeCompare(b[0])).slice(-14),byType};
}
function bars(items,labelFn){const max=Math.max(1,...items.map(x=>x[1]));return `<div class="cons-bars">${items.map(([k,v])=>`<div class="cons-bar-row"><span>${labelFn(k)}</span><div class="cons-track"><i style="width:${Math.max(3,(v/max)*100)}%"></i></div><b>${v}</b></div>`).join('')}</div>`}
async function build(){
 const {data,error}=await supabase.from('retiradas').select('tamanho,rolos,created_at').order('created_at',{ascending:true});
 if(error)return;
 const rows=data||[],g=group(rows),now=monthKey(new Date()),thisMonth=rows.filter(r=>monthKey(r.created_at)===now),monthTotal=thisMonth.reduce((s,r)=>s+Number(r.rolos||0),0),activeDays=new Set(thisMonth.map(r=>dayKey(r.created_at))).size,avg=activeDays?monthTotal/activeDays:0;
 const top=TYPES.map(t=>[t,g.byType[t]]).sort((a,b)=>b[1]-a[1])[0];
 const tab=document.querySelector('[data-tab="t4"]'); const sec=document.querySelector('#t4'); if(!tab||!sec)return;
 tab.textContent='Dashboard de consumo';
 sec.innerHTML=`<div class="cons-dash">
   <div class="cons-kpis">
    <div class="cons-kpi"><span>Consumo no mês</span><strong>${monthTotal}</strong><small>rolos</small></div>
    <div class="cons-kpi"><span>Média por dia ativo</span><strong>${avg.toFixed(1)}</strong><small>rolos</small></div>
    <div class="cons-kpi"><span>Mais utilizada</span><strong>${top?.[0]||'—'}</strong><small>${top?.[1]||0} rolos</small></div>
    <div class="cons-kpi"><span>Dias com retirada</span><strong>${activeDays}</strong><small>no mês atual</small></div>
   </div>
   <div class="cons-grid">
    <div class="cons-box"><h3>Consumo por tamanho</h3>${bars(TYPES.map(t=>[t,g.byType[t]]),k=>k)}</div>
    <div class="cons-box"><h3>Últimos 6 meses</h3>${g.months.length?bars(g.months,monthLabel):'<p class="muted">Sem dados.</p>'}</div>
   </div>
   <div class="cons-box cons-wide"><h3>Últimos 14 dias</h3>${g.days.length?bars(g.days,k=>new Date(k+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})):'<p class="muted">Sem dados.</p>'}</div>
 </div>`;
}
const obs=new MutationObserver(()=>{if(document.querySelector('#t4')&&document.querySelector('[data-tab="t4"]')){obs.disconnect();build()}});obs.observe(document.documentElement,{childList:true,subtree:true});
setTimeout(build,1200);
