(()=>{
  const p=location.pathname.toLowerCase();
  const b=document.body;

  /*
    O backend de dados fica em um domínio externo. Em alguns navegadores a chamada
    direta pode ficar pendurada. Interceptamos apenas as rotas REST usadas pelo app
    e encaminhamos pelo proxy same-origin da Vercel.
  */
  const nativeFetch=window.fetch.bind(window);
  const DATA_HOST='c--102f54f5-5f8b-4f19-aa51-2244c18d2b83-prod.lovable.cloud';
  window.fetch=async function(input,init={}){
    try{
      const raw=typeof input==='string'?input:(input&&input.url)||'';
      const u=new URL(raw,location.origin);
      if(u.hostname!==DATA_HOST || !u.pathname.startsWith('/rest/v1/')){
        return nativeFetch(input,init);
      }

      const table=u.pathname.split('/').filter(Boolean).pop();
      const method=String(init.method || (input&&input.method) || 'GET').toUpperCase();
      let proxy=`/api/hub-data?table=${encodeURIComponent(table)}`;
      const options={method,headers:{'Content-Type':'application/json'}};

      if(method==='GET'){
        return nativeFetch(proxy,{method:'GET'});
      }

      if(method==='POST'){
        let body=init.body;
        if(body==null && input instanceof Request){
          body=await input.clone().text();
        }
        options.body=typeof body==='string'?body:JSON.stringify(body||{});
        return nativeFetch(proxy,options);
      }

      if(method==='DELETE'){
        const idFilter=u.searchParams.get('id')||'';
        const id=idFilter.startsWith('eq.')?idFilter.slice(3):idFilter;
        proxy+=`&id=${encodeURIComponent(id)}`;
        return nativeFetch(proxy,{method:'DELETE'});
      }

      return nativeFetch(input,init);
    }catch(err){
      return nativeFetch(input,init);
    }
  };

  b.classList.remove('label-100x150','label-100x80','label-100x30','admin');
  if(p.startsWith('/admin')) b.classList.add('admin');
  else if(p.includes('100x150')) b.classList.add('label-100x150');
  else if(p.includes('100x80')) b.classList.add('label-100x80');
  else if(p.includes('100x30')) b.classList.add('label-100x30');

  if(!p.startsWith('/admin')) return;

  const icons=['⌂','▣','◫','▥','▥','＄','▤','▧'];
  function decorate(){
    const top=document.querySelector('.top');
    const shell=document.querySelector('.admin-shell');
    const tabs=document.querySelector('.tabs');
    if(!top||!shell||!tabs) return;

    const h1=top.querySelector('h1');
    const sub=top.querySelector('.subtitle');
    const eye=top.querySelector('.eyebrow');
    if(h1) h1.textContent='Olá, Larissa! 👋';
    if(sub) sub.textContent='Aqui é o painel administrativo das etiquetas. Acompanhe o estoque, consumo e mantenha tudo sob controle.';
    if(eye) eye.textContent='';

    if(!top.querySelector('.hub-month')){
      const m=document.createElement('div');
      m.className='hub-month';
      const month=new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
      m.innerHTML=`<span>▣</span><strong>${month.charAt(0).toUpperCase()+month.slice(1)}</strong><span>⌄</span>`;
      top.querySelector('.wrap')?.appendChild(m);
    }

    if(!tabs.querySelector('.hub-brand')){
      const brand=document.createElement('div');
      brand.className='hub-brand';
      brand.innerHTML='<div class="hub-logo">HUB</div><div class="hub-tag">BELEZA QUE CONECTA</div><div class="hub-section">CONTROLE OPERACIONAL</div>';
      tabs.prepend(brand);
    }

    [...tabs.querySelectorAll('.tab')].forEach((btn,i)=>{
      if(btn.dataset.hubReady) return;
      btn.dataset.hubReady='1';
      const original=btn.textContent.trim();
      const map={'Consumo mensal':'Dashboard de consumo'};
      btn.innerHTML=`<span class="hub-nav-icon">${icons[i]||'•'}</span><span>${map[original]||original}</span>`;
    });

    if(!tabs.querySelector('.hub-side-card')){
      const card=document.createElement('div');
      card.className='hub-side-card';
      card.innerHTML='<div class="hub-side-icon">🏷</div><div><strong>Etiquetas HUB Easy</strong><small>Organização que<br>faz a diferença.</small></div>';
      tabs.appendChild(card);
      const user=document.createElement('div');
      user.className='hub-user';
      user.innerHTML='<div class="hub-avatar">LJ</div><div><strong>Larissa</strong><small>Administrador</small></div><span>⌄</span>';
      tabs.appendChild(user);
      const exit=document.createElement('a');
      exit.className='hub-exit';
      exit.href='/';
      exit.innerHTML='<span>↪</span><span>Sair</span>';
      tabs.appendChild(exit);
    }

    if(!shell.querySelector('.hub-bottom-banner')){
      const banner=document.createElement('div');
      banner.className='hub-bottom-banner';
      banner.innerHTML='<div class="hub-bottom-icon">🏷</div><div class="hub-bottom-copy"><strong>Etiquetas organizadas, operações mais ágeis!</strong><span>Mantenha seu estoque atualizado e garanta sempre o melhor fluxo para o time.</span></div><div class="hub-bottom-logo">HUB<small>BELEZA QUE CONECTA</small></div><div class="hub-bottom-slogan">ORGANIZAÇÃO<br>QUE IMPULSIONA<br>RESULTADOS</div>';
      shell.appendChild(banner);
    }
  }

  new MutationObserver(decorate).observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('DOMContentLoaded',decorate);
  setTimeout(decorate,300);
})();