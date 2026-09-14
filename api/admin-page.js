const BASE='https://c--102f54f5-5f8b-4f19-aa51-2244c18d2b83-prod.lovable.cloud';
const KEY='sb_publishable_nAJIGfPVHTtEejRo1-TL4g_9uKzid-V';

async function getTable(table){
  const r=await fetch(`${BASE}/rest/v1/${table}?select=*&order=created_at.desc`,{
    headers:{apikey:KEY,Authorization:`Bearer ${KEY}`}
  });
  if(!r.ok) throw new Error(`${table}: ${r.status}`);
  return r.json();
}

function safeJson(value){
  return JSON.stringify(value).replace(/</g,'\\u003c');
}

module.exports=async function handler(req,res){
  try{
    const [retiradas,entradas,inventarios]=await Promise.all([
      getTable('retiradas'),getTable('entradas'),getTable('inventarios')
    ]);
    const data={retiradas,entradas,inventarios};
    const html=`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="theme-color" content="#a85f52" />
<title>Etiquetas HUB Easy · Painel Administrativo</title>
<link rel="stylesheet" href="/styles.css" />
<link rel="stylesheet" href="/admin-clean.css" />
</head>
<body class="admin">
<div id="app"></div>
<script>
window.__HUB_PRELOADED__=${safeJson(data)};
(function(){
  const nativeFetch=window.fetch.bind(window);
  window.fetch=function(input,init){
    try{
      const raw=typeof input==='string'?input:(input&&input.url)||'';
      const u=new URL(raw,location.origin);
      if(u.pathname==='/api/hub-data' && (!init || !init.method || init.method==='GET')){
        const table=u.searchParams.get('table');
        if(window.__HUB_PRELOADED__ && Object.prototype.hasOwnProperty.call(window.__HUB_PRELOADED__,table)){
          return Promise.resolve(new Response(JSON.stringify(window.__HUB_PRELOADED__[table]),{status:200,headers:{'Content-Type':'application/json'}}));
        }
      }
    }catch(e){}
    return nativeFetch(input,init);
  };
})();
</script>
<script src="/visual.js"></script>
<script type="module" src="/admin-fixed.js"></script>
</body>
</html>`;
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    res.status(200).send(html);
  }catch(err){
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.status(500).send(`<h1>Não foi possível carregar o painel</h1><p>${String(err.message||err)}</p>`);
  }
};