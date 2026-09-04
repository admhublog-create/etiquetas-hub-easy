import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase=createClient('https://c--102f54f5-5f8b-4f19-aa51-2244c18d2b83-prod.lovable.cloud','sb_publishable_nAJIGfPVHTtEejRo1-TL4g_9uKzid-V');
const TYPES=['100x150','100x80','100x30'];
const BASE={'100x150':40,'100x80':80,'100x30':10};
const LIMITS={'100x150':{low:10,critical:5},'100x80':{low:20,critical:10},'100x30':{low:5,critical:2}};

function calc(rows,entries){
  const s={...BASE};
  entries.forEach(x=>{if(s[x.tamanho]!=null)s[x.tamanho]+=Number(x.rolos||0)});
  rows.forEach(x=>{if(s[x.tamanho]!=null)s[x.tamanho]-=Number(x.rolos||0)});
  return s;
}

function level(type,value){
  const l=LIMITS[type];
  if(value<=l.critical)return 'critical';
  if(value<=l.low)return 'low';
  return 'normal';
}

function card(type,value){
  const st=level(type,value);
  const title=st==='critical'?'Compra necessária':st==='low'?'Programar compra':'Estoque saudável';
  const text=st==='critical'?'Estoque crítico. Priorize a reposição deste tamanho.':st==='low'?'Estoque baixo. Já vale programar a próxima compra.':'Não há necessidade de compra neste momento.';
  const tag=st==='critical'?'CRÍTICO':st==='low'?'ATENÇÃO':'NORMAL';
  return `<div class="purchase-alert ${st}">
    <div class="purchase-alert-top"><span class="purchase-dot"></span><strong>Etiqueta ${type}</strong><span class="purchase-tag">${tag}</span></div>
    <div class="purchase-stock"><b>${value}</b> rolos em estoque</div>
    <div class="purchase-title">${title}</div>
    <div class="purchase-text">${text}</div>
  </div>`;
}

async function mountAlerts(){
  if(location.pathname.replace(/\/+$/,'')!=='/admin')return;
  const t0=document.querySelector('#t0');
  if(!t0||document.querySelector('#hubPurchaseAlerts'))return;

  const [r,e]=await Promise.all([
    supabase.from('retiradas').select('tamanho,rolos'),
    supabase.from('entradas').select('tamanho,rolos')
  ]);
  if(r.error||e.error)return;

  const stock=calc(r.data||[],e.data||[]);
  const needs=TYPES.filter(t=>level(t,stock[t])!=='normal').length;
  const old=t0.querySelector(':scope > .alert');
  if(old)old.remove();

  const box=document.createElement('div');
  box.id='hubPurchaseAlerts';
  box.className='purchase-center';
  box.innerHTML=`
    <div class="purchase-center-head">
      <div><span class="purchase-kicker">ALERTAS</span><h3>Estoque e compras</h3><p>${needs?`${needs} tamanho${needs===1?' precisa':'s precisam'} de atenção.`:'Todos os estoques estão em nível confortável.'}</p></div>
      <div class="purchase-summary">${needs?`${needs} alerta${needs===1?'':'s'}`:'Tudo certo'}</div>
    </div>
    <div class="purchase-grid">${TYPES.map(t=>card(t,stock[t])).join('')}</div>`;
  t0.prepend(box);
}

const observer=new MutationObserver(()=>mountAlerts());
observer.observe(document.documentElement,{childList:true,subtree:true});
mountAlerts();
