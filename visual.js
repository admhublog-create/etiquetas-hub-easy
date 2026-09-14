(()=>{
  const p=location.pathname.toLowerCase();
  const b=document.body;
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