const BASE='https://c--102f54f5-5f8b-4f19-aa51-2244c18d2b83-prod.lovable.cloud';
const KEY='sb_publishable_nAJIGfPVHTtEejRo1-TL4g_9uKzid-V';
const ALLOWED=new Set(['retiradas','entradas','inventarios']);

function headers(extra={}){
  return {
    apikey:KEY,
    Authorization:`Bearer ${KEY}`,
    'Content-Type':'application/json',
    ...extra
  };
}

module.exports=async function handler(req,res){
  try{
    const table=String(req.query.table||'');
    if(!ALLOWED.has(table)) return res.status(400).json({error:'Tabela inválida'});

    if(req.method==='GET'){
      const url=`${BASE}/rest/v1/${table}?select=*&order=created_at.desc`;
      const r=await fetch(url,{headers:headers()});
      const text=await r.text();
      if(!r.ok) return res.status(r.status).json({error:text||'Falha ao consultar dados'});
      return res.status(200).send(text);
    }

    if(req.method==='POST'){
      const r=await fetch(`${BASE}/rest/v1/${table}`,{
        method:'POST',
        headers:headers({Prefer:'return=representation'}),
        body:JSON.stringify(req.body||{})
      });
      const text=await r.text();
      if(!r.ok) return res.status(r.status).json({error:text||'Falha ao salvar'});
      return res.status(200).send(text||'[]');
    }

    if(req.method==='DELETE'){
      const id=String(req.query.id||'');
      if(!id) return res.status(400).json({error:'ID ausente'});
      const r=await fetch(`${BASE}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`,{
        method:'DELETE',
        headers:headers({Prefer:'return=representation'})
      });
      const text=await r.text();
      if(!r.ok) return res.status(r.status).json({error:text||'Falha ao excluir'});
      return res.status(200).send(text||'[]');
    }

    return res.status(405).json({error:'Método não permitido'});
  }catch(err){
    return res.status(500).json({error:String(err&&err.message||err)});
  }
}
