/* Progressive enhancement: every chapter remains readable without JavaScript. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const data = JSON.parse($('#guide-data').textContent);
  const storage = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Reading still works with storage blocked. */ } }
  };
  const valid = new Set(data.chapters.map(c => c.id));
  const saved = storage.get('fieldguide-read', []);
  let read = new Set(Array.isArray(saved) ? saved.filter(x => valid.has(x)) : []);
  let current = null;
  let font = Math.min(24, Math.max(16, Number(storage.get('fieldguide-font', 18)) || 18));
  const navLinks = [...document.querySelectorAll('#chapter-nav a')];
  function progress() {
    navLinks.forEach(a => a.classList.toggle('is-read', read.has(a.hash.slice(1))));
    $('#completed-count').textContent = `${read.size} / 30`;
    $('#mark-read').checked = Boolean(current && read.has(current.id));
  }
  function closeNav() {
    document.body.classList.remove('nav-open');
    $('#mobile-contents').setAttribute('aria-expanded', 'false');
  }
  function resume() {
    const last = storage.get('fieldguide-last', '');
    const chapter = data.chapters.find(c => c.id === last);
    $('#resume-link').hidden = !chapter;
    if (chapter) {
      $('#resume-link').href = `#${chapter.id}`;
      $('#resume-link').textContent = `Continue: ${chapter.num} — ${chapter.title} →`;
    }
  }
  function route(focus = true) {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)) || 'home'; } catch { id = 'home'; }
    const target = document.getElementById(id);
    const section = target?.closest('.chapter');
    current = section ? data.chapters.find(c => c.id === section.id) : null;
    document.body.dataset.view = current ? 'reader' : 'home';
    document.querySelectorAll('.chapter').forEach(c => c.classList.toggle('active', c === section));
    closeNav();
    navLinks.forEach(a => {
      if (current && a.hash === `#${current.id}`) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    if (current) {
      const i = data.chapters.indexOf(current);
      $('#current-section').textContent = current.group;
      $('#chapter-reading-time').textContent = `${current.minutes} min read · ${current.num} of 30`;
      const prev = data.chapters[i - 1], next = data.chapters[i + 1];
      $('#previous-chapter').href = prev ? `#${prev.id}` : '#contents';
      $('#previous-chapter').textContent = prev ? `← ${prev.num}. ${prev.title}` : '← Back to overview';
      $('#next-chapter').href = next ? `#${next.id}` : '#contents';
      $('#next-chapter').textContent = next ? `${next.num}. ${next.title} →` : 'Back to the handbook →';
      document.title = `${current.num}. ${current.title} — The Laptop Field Guide`;
      storage.set('fieldguide-last', current.id);
    } else document.title = 'The Laptop Field Guide — Choose well. Build more.';
    progress(); resume();
    requestAnimationFrame(() => {
      if (current) {
        const destination = target === section ? $(`#${current.id}-title`) : target;
        if (focus && destination) {
          destination.setAttribute('tabindex', '-1');
          destination.focus({preventScroll:true});
        }
        if (target === section) window.scrollTo(0, 0);
        else destination?.scrollIntoView({block:'start'});
        const active = $('#chapter-nav [aria-current=page]');
        if (active && window.innerWidth > 800) {
          const nav = $('#chapter-nav');
          const delta = active.getBoundingClientRect().top - nav.getBoundingClientRect().top;
          if (delta < 0 || delta > nav.clientHeight - 50) nav.scrollTop += delta - 80;
        }
      } else if (target && id !== 'home') target.scrollIntoView({block:'start'});
      else window.scrollTo(0,0);
      updateBar();
    });
  }
  function updateBar() {
    const section = current ? document.getElementById(current.id) : null;
    let percent = 0;
    if (section) {
      const top = section.getBoundingClientRect().top + scrollY - 105;
      const distance = section.offsetHeight - innerHeight + 160;
      percent = distance > 0 ? Math.max(0,Math.min(100,(scrollY-top)/distance*100)) : 100;
    }
    $('#reading-progress span').style.width = `${percent}%`;
  }
  function setFont() {
    document.documentElement.style.setProperty('--reader-size', `${font}px`);
    $('#font-down').disabled = font <= 16;
    $('#font-up').disabled = font >= 24;
    storage.set('fieldguide-font',font);
  }
  $('#font-down').addEventListener('click',() => {font = Math.max(16,font-1);setFont();});
  $('#font-up').addEventListener('click',() => {font = Math.min(24,font+1);setFont();});
  $('#mark-read').addEventListener('change',e => {
    if (!current) return;
    if(e.target.checked) read.add(current.id); else read.delete(current.id);
    storage.set('fieldguide-read',[...read]);progress();
  });
  $('#clear-progress').addEventListener('click',() => {
    if (!confirm('Clear the saved read chapters and resume link in this browser?')) return;
    read.clear();storage.set('fieldguide-read',[]);storage.set('fieldguide-last','');progress();resume();
  });
  $('#mobile-contents').addEventListener('click',() => {
    const opened = document.body.classList.toggle('nav-open');
    $('#mobile-contents').setAttribute('aria-expanded',String(opened));
    if(opened) ($('#chapter-nav [aria-current=page]') || navLinks[0]).focus();
  });
  document.addEventListener('click',e => {
    if(document.body.classList.contains('nav-open') && !e.target.closest('.sidebar,#mobile-contents')) closeNav();
  });
  $('#print-guide').addEventListener('click',() => window.print());
  $('#theme-toggle').addEventListener('click',() => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try {localStorage.setItem('fieldguide-theme',theme);} catch {}
    $('#theme-toggle').setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  });
  const dialog = $('#search-dialog'), input = $('#search-input'), results = $('#search-results');
  const normalize = s => s.toLocaleLowerCase().normalize('NFKC');
  const indexed = data.search.map(s => ({...s,hay:normalize(`${s.title} ${s.chapterTitle} ${s.text}`)}));
  function highlight(el,text,tokens) {
    const escaped = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
    if(!escaped.length){el.textContent=text;return;}
    const regex = new RegExp(escaped.join('|'),'gi');
    let last=0;
    for(const match of text.matchAll(regex)) {
      el.append(document.createTextNode(text.slice(last,match.index)));
      const mark=document.createElement('mark');mark.textContent=match[0];el.append(mark);
      last=match.index+match[0].length;
    }
    el.append(document.createTextNode(text.slice(last)));
  }
  function search() {
    const q=input.value.trim().slice(0,160), tokens=normalize(q).split(/\s+/).filter(Boolean).slice(0,12);
    results.replaceChildren();
    if(!tokens.length){$('#search-status').textContent='Search the full text of all 30 chapters.';return;}
    const hits=indexed.filter(s => tokens.every(t => s.hay.includes(t))).map(s => ({s,score:tokens.reduce((a,t)=>a+(normalize(s.title).includes(t)?8:0)+(normalize(s.chapterTitle).includes(t)?2:0),0)})).sort((a,b)=>b.score-a.score);
    $('#search-status').textContent=hits.length ? `${hits.length} matching sections${hits.length>40?' · showing the first 40; add a word to narrow your search':''}.` : 'No matching sections. Try a shorter term such as “RAM”, “ARM”, or “battery”.';
    for(const {s} of hits.slice(0,40)) {
      const a=document.createElement('a');a.href=`#${s.id}`;
      const small=document.createElement('small');small.textContent=`CHAPTER ${s.chapter.slice(-2)} / ${s.chapterTitle}`;
      const strong=document.createElement('strong');highlight(strong,s.title,tokens);
      const p=document.createElement('p');
      const first=tokens.map(t=>normalize(s.text).indexOf(t)).filter(n=>n>=0).sort((a,b)=>a-b)[0]??0;
      const start=Math.max(0,first-65), text=(start?'…':'')+s.text.slice(start,start+240)+(s.text.length>start+240?'…':'');
      highlight(p,text,tokens);a.append(small,strong,p);
      a.addEventListener('click',() => {dialog.close(); if(location.hash===a.hash) route();});results.append(a);
    }
  }
  function openSearch(){dialog.showModal();input.focus();search();}
  document.querySelectorAll('.search-trigger').forEach(b=>b.addEventListener('click',openSearch));
  $('#close-search').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  input.addEventListener('input',search);
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!dialog.open)openSearch();}
    if(e.key==='Escape'&&document.body.classList.contains('nav-open')){closeNav();$('#mobile-contents').focus();}
  });
  window.addEventListener('hashchange',()=>route());
  window.addEventListener('scroll',updateBar,{passive:true});
  window.addEventListener('resize',updateBar);
  document.documentElement.classList.add('js');
  setFont();route(false);
})();

/* Transparent planning helpers. Inputs remain local; there is no model or price API. */
(() => {
  'use strict';
  const brief=document.querySelector('#brief-form');
  const profiles={
    student:['16 GB / 512 GB','A recent efficient CPU and integrated graphics are a sensible baseline. Prioritize keyboard, screen, battery, and support.', '04'],
    swe:['32 GB / 1 TB','A capable sustained CPU and room for IDEs, browser/calls, and services. Measure whether your particular stack needs 48–64 GB.', '08'],
    android:['32 GB / 1 TB','Use a supported Android Studio/emulator host and verify hardware virtualization. Consider active cooling for repeated builds.', '04'],
    vms:['32–64 GB / 1 TB or more','Add guest allocations to host needs. Confirm each image architecture, hypervisor, and any nested-virtualization requirement.', '06'],
    remote:['16 GB / 512 GB','Prioritize reliable networking, battery, screen, and input devices. Keep a useful offline fallback and budget for remote storage/compute.', '20'],
    ai:['Measure first; often 32 GB+','Specify model, inference/training, quantization, context, backend, and response-speed needs before buying memory or a GPU. General learning may need only 16–32 GB plus remote access.', '11']
  };
  brief.addEventListener('submit',e=>{
    e.preventDefault();
    const f=new FormData(brief), profile=profiles[f.get('workload')]||profiles.student;
    const x86=f.has('x86'),apple=f.has('apple'),cuda=f.has('cuda'),linux=f.has('linux');
    const out=document.querySelector('#brief-output');out.replaceChildren();
    function paragraph(text,strong=false){const p=document.createElement('p');if(strong){const s=document.createElement('strong');s.textContent=text;p.append(s);}else p.textContent=text;out.append(p);}
    if(apple&&(x86||cuda||linux)){
      paragraph('Resolve the platform conflict before choosing one laptop.',true);
      paragraph('Local Xcode points to a supported Mac. Your other requirement points to an x86/NVIDIA or native Linux environment. Do not assume one Apple-silicon laptop satisfies both. Confirm an approved second machine or remote path; native Linux support is chip- and feature-specific.');
    }else if(apple){paragraph('Platform direction: a supported Apple-silicon Mac.',true);}
    else if(x86||cuda){paragraph('Platform direction: a supported x86 Windows/Linux system.',true);}
    else if(linux){paragraph('Platform direction: an exact, vendor-supported Linux configuration.',true);}
    else{paragraph('Platform direction: confirm your curriculum or team before choosing.',true);paragraph('macOS, x86 Windows, and Linux can all be good fits. Treat Windows ARM as a conditional choice after validating the full stack.');}
    paragraph(`Capacity starting point: ${profile[0]}`,true);paragraph(profile[1]);
    if(cuda)paragraph('GPU gate: require a supported NVIDIA GPU with enough VRAM for the actual task. Neither an Apple GPU nor NPU TOPS satisfies a local CUDA requirement.');
    if(x86)paragraph('Architecture gate: verify the exact x86 VM image and peripheral drivers. Application emulation is not native x86 guest virtualization.');
    if(linux)paragraph('Linux gate: test suspend, audio/camera, Wi-Fi, display scaling, docking, and firmware updates on the exact configuration.');
    const a=document.createElement('a');a.href=`#chapter-${profile[2]}`;a.className='text-link';a.textContent='Read the reasoning and exceptions →';out.append(a);out.hidden=false;
  });
  const cost=document.querySelector('#cost-form');
  cost.addEventListener('submit',e=>{
    e.preventDefault();if(!cost.reportValidity())return;
    const f=new FormData(cost),n=name=>Number(f.get(name));
    const purchase=n('purchase'),extras=n('extras'),monthly=n('monthly'),resale=n('resale'),years=n('years');
    const out=document.querySelector('#cost-output');out.replaceChildren();out.hidden=false;
    if(![purchase,extras,monthly,resale,years].every(Number.isFinite)||years<1||years>15){out.textContent='Enter valid non-negative costs and 1–15 years.';return;}
    const total=purchase+extras+monthly*years*12-resale;
    if(total<0){out.textContent='Your resale estimate exceeds all planned costs. Recheck the assumptions rather than treating this purchase as guaranteed profit.';return;}
    const format=x=>x.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
    const strong=document.createElement('strong');strong.textContent=`${format(total)} total · ${format(total/(years*12))} per month`;
    const p=document.createElement('p');p.textContent=`Over ${years} years, in your chosen currency. Includes ${format(monthly*years*12)} in recurring costs and assumes ${format(resale)} resale. A planning estimate, not a quote or financing offer.`;
    out.append(strong,p);
  });
})();
