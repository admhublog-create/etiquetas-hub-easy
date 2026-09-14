const BASE='https://c--102f54f5-5f8b-4f19-aa51-2244c18d2b83-prod.lovable.cloud';
const KEY='sb_publishable_nAJIGfPVHTtEejRo1-TL4g_9uKzid-V';
const headers={apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json'};
function json(res,status,body){res.status(status).setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body));}
module.exports=async function handler(req,res){
  try{
    if(req.method==='GET'){
      const r=await fetch(`${BASE}/rest/v1/compras_historicas?select=*&order=competencia.desc,created_at.desc`,{headers});
      if(!r.ok) return json(res,r.status,{ok:false,error:await r.text()});
      return json(res,200,{ok:true,data:await r.json()});
    }
    if(req.method==='POST'){
      const b=req.body||{};
      const competencia=String(b.competencia||'').trim();
      const tamanho=String(b.tamanho||'').trim();
      const rolos=Math.max(1,Number(b.rolos)||0);
      const caixas=b.caixas==null?null:Math.max(0,Number(b.caixas)||0);
      const valor=Number(b.valor)||0;
      if(!/^\d{4}-\d{2}$/.test(competencia)) return json(res,400,{ok:false,error:'Competência inválida.'});
      if(!['100x150','100x80','100x30'].includes(tamanho)) return json(res,400,{ok:false,error:'Tamanho inválido.'});
      if(!rolos||valor<=0) return json(res,400,{ok:false,error:'Informe quantidade e valor.'});
      const payload={competencia,tamanho,rolos,caixas,valor,fornecedor:String(b.fornecedor||'').trim()||null,observacao:String(b.observacao||'').trim()||null};
      const r=await fetch(`${BASE}/rest/v1/compras_historicas`,{method:'POST',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify(payload)});
      if(!r.ok) return json(res,r.status,{ok:false,error:await r.text()});
      return json(res,201,{ok:true,data:await r.json()});
    }
    if(req.method==='DELETE'){
      const id=String((req.query&&req.query.id)||'').trim();
      if(!id) return json(res,400,{ok:false,error:'ID obrigatório.'});
      const r=await fetch(`${BASE}/rest/v1/compras_historicas?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:{...headers,Prefer:'return=representation'}});
      if(!r.ok) return json(res,r.status,{ok:false,error:await r.text()});
      return json(res,200,{ok:true,data:await r.json()});
    }
    res.setHeader('Allow','GET, POST, DELETE');return json(res,405,{ok:false,error:'Método não permitido.'});
  }catch(err){return json(res,500,{ok:false,error:String(err&&err.message||err)});}
};