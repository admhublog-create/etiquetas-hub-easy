module.exports=async function handler(req,res){
  try{
    const proto=(req.headers['x-forwarded-proto']||'https').split(',')[0];
    const host=req.headers.host;
    const r=await fetch(`${proto}://${host}/api/admin-page`,{headers:{'cache-control':'no-cache'}});
    let html=await r.text();
    if(!r.ok){res.status(r.status).send(html);return}

    const FIXED=16;
    const brl=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

    // Custo médio por etiqueta/rolo: todas as etiquetas custam R$ 16,00.
    ['100x150','100x80','100x30'].forEach(type=>{
      const row4=new RegExp(`<tr><td>${type}<\\/td><td>.*?<\\/td><td>(-?\\d+)<\\/td><td>.*?<\\/td><\\/tr>`,'g');
      html=html.replace(row4,(m,stock)=>`<tr><td>${type}</td><td>${brl(FIXED)}</td><td>${stock}</td><td>${brl(Math.max(0,Number(stock)||0)*FIXED)}</td></tr>`);
      const row2=new RegExp(`<tr><td>${type}<\\/td><td>.*?<\\/td><\\/tr>`,'g');
      html=html.replace(row2,`<tr><td>${type}</td><td><b class="money">${brl(FIXED)}</b></td></tr>`);
    });

    // Mantém os cards financeiros coerentes com o custo fixo de R$ 16,00.
    const stockMatches=[...html.matchAll(/<div class="label">Estoque (100x150|100x80|100x30)<\/div><div class="value">(-?\d+)<\/div>/g)];
    const totalStock=stockMatches.reduce((s,m)=>s+Math.max(0,Number(m[2])||0),0);
    const consumoMatch=html.match(/<span>Consumo neste mês<\/span><strong>(\d+)<\/strong>/);
    const consumo=consumoMatch?Number(consumoMatch[1])||0:0;
    const estoqueValor=brl(totalStock*FIXED);
    const consumoValor=brl(consumo*FIXED);

    html=html.replace(/(<span>Valor estimado do estoque<\/span><strong>).*?(<\/strong>)/g,`$1${estoqueValor}$2`);
    html=html.replace(/(<span>Valor do estoque<\/span><strong>).*?(<\/strong>)/g,`$1${estoqueValor}$2`);
    html=html.replace(/(<span>Custo do consumo no mês<\/span><strong>).*?(<\/strong>)/g,`$1${consumoValor}$2`);
    html=html.replace(/(<span>Custo consumo mês<\/span><strong>).*?(<\/strong>)/g,`$1${consumoValor}$2`);

    // Ajusta o selo para deixar claro que o custo é padrão fixo.
    html=html.replace('Baseado nas compras cadastradas','Custo padrão atual: R$ 16,00 por rolo');

    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    res.status(200).send(html);
  }catch(err){
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.status(500).send(`<h1>Não foi possível carregar o painel</h1><p>${String(err.message||err)}</p>`);
  }
};