import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const supabase=createClient('https://c--102f54f5-5f8b-4f19-aa51-2244c18d2b83-prod.lovable.cloud','sb_publishable_nAJIGfPVHTtEejRo1-TL4g_9uKzid-V');
const TYPES=['100x150','100x80','100x30'];
const BASE={'100x150':0,'100x80':18,'100x30':10};
const INITIAL_PURCHASE={'100x150':60,'100x80':80,'100x30':0};
const isLegacy=e=>String(e.observacao||'').startsWith('Ajuste de estoque inicial:');
let busy=false,cache=null;
async function data(){
 if(cache&&Date.now()-cache.at<1500)return cache;
 const [r,e]=await Promise.all([supabase.from('retiradas').select('*'),supabase.from('entradas').select('*')]);
 if(r.error||e.error)return null;
 const rows=r.data||[],entries=(e.data||[]).filter(x=>!isLegacy(x));
 const out={at:Date.now(),rows,entries,stock:{},received:{},used:{}};
 TYPES.forEach(t=>{
  out.used[t]=rows.filter(x=>x.tamanho===t).reduce((s,x)=>s+Number(x.rolos||0),0);
  const normal=entries.filter(x=>x.tamanho===t).reduce((s,x)=>s+Number(x.rolos||0),0);
  out.received[t]=INITIAL_PURCHASE[t]+normal;
  out.stock[t]=BASE[t]+out.received[t]-out.used[t];
 });
 cache=out;return out;
}
function setText(el,text){if(el&&el.textContent!==String(text))el.textContent=text}
async function apply(){
 if(busy||location.pathname.replace(/\/+$/,'')!=='/admin')return;busy=true;
 try{
  const d=await data();if(!d)return;
  document.querySelectorAll('.metric').forEach(card=>{
   const label=card.querySelector('.label')?.textContent||'';
   const m=label.match(/^Estoque (100x150|100x80|100x30)$/);
   if(m){const t=m[1];setText(card.querySelector('.value'),d.stock[t]);const muted=card.querySelector('.muted');if(muted){const c=Math.floor(Math.max(0,d.stock[t])/10),x=Math.max(0,d.stock[t])%10;setText(muted,`rolos · ${x?`${c} caixa${c===1?'':'s'} + ${x} rolo${x===1?'':'s'}`:`${c} caixa${c===1?'':'s'}`}`)}}
   if(label==='Estoque total')setText(card.querySelector('.value'),TYPES.reduce((s,t)=>s+d.stock[t],0));
   if(label==='Rolos recebidos')setText(card.querySelector('.value'),TYPES.reduce((s,t)=>s+d.received[t],0));
  });
  document.querySelectorAll('h3').forEach(h=>{
   if(h.textContent.trim()!=='Resumo do estoque')return;
   const table=h.parentElement?.querySelector('table');if(!table)return;
   [...table.tBodies[0]?.rows||[]].forEach(tr=>{
    const t=tr.cells[0]?.textContent.trim();if(!TYPES.includes(t))return;
    setText(tr.cells[1],BASE[t]);setText(tr.cells[2],d.received[t]);setText(tr.cells[3],d.used[t]);setText(tr.cells[4],d.stock[t]);
    const c=Math.floor(Math.max(0,d.stock[t])/10),x=Math.max(0,d.stock[t])%10;setText(tr.cells[5],x?`${c} caixa${c===1?'':'s'} + ${x} rolo${x===1?'':'s'}`:`${c} caixa${c===1?'':'s'}`);
   });
  });
  document.querySelectorAll('.inv[data-type]').forEach(inp=>{const t=inp.dataset.type;if(TYPES.includes(t)&&document.activeElement!==inp)inp.value=Math.max(0,d.stock[t]);const muted=inp.parentElement?.querySelector('.muted');if(muted)setText(muted,`Sistema: ${d.stock[t]} rolos`)});
 }finally{busy=false}
}
const obs=new MutationObserver(()=>setTimeout(apply,40));obs.observe(document.documentElement,{childList:true,subtree:true});
setTimeout(apply,300);
