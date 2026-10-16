/* Presentation-only enhancements. Original model, chat and storage workflows stay intact. */
(function(){
  'use strict';
  var root=document.documentElement, app=document.getElementById('app'), api=window.__ENDF__;
  if(!app||!api) return;
  var mobile=root.dataset.shell==='mobile';
  var icons={
    pen:'<path d="m4 16 12-12 4 4-12 12H4v-4Z"/><path d="m13 7 4 4M4 20h16"/>',
    history:'<path d="M4 7V3M4 7h4M4 7a9 9 0 1 1-1 8"/><path d="M12 7v5l3 2"/>',
    plus:'<path d="M12 4v16M4 12h16"/>',
    focus:'<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/><path d="M8 8h8v8H8z"/>',
    settings:'<path d="M4 7h16M4 17h16"/><rect x="7" y="4" width="4" height="6"/><rect x="14" y="14" width="4" height="6"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5l1.5 1.5M5 19l1.5-1.5M17.5 6.5l1.5-1.5"/>',
    moon:'<path d="M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5Z"/>',
    copy:'<path d="M8 8h12v12H8zM16 8V4H4v12h4"/>',
    edit:'<path d="m4 16 12-12 4 4-12 12H4v-4Z"/><path d="m13 7 4 4"/>',
    regen:'<path d="M20 7V3M20 7h-4M20 7a9 9 0 1 0 1 8"/>',
    anno:'<path d="M4 3h16v14H9l-5 4V3Z"/><path d="M8 7h8M8 11h5"/>',
    arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
    model:'<path d="m12 3 9 5v8l-9 5-9-5V8l9-5ZM3 8l9 5 9-5M12 13v8"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    key:'<circle cx="8" cy="8" r="4"/><path d="m11 11 9 9m-4-4 3-3m-6 0 3-3"/>',
    person:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    skill:'<path d="m12 2 9 10-9 10-9-10 9-10ZM8 12h8M12 8v8"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>'
  };
  function svg(k){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">'+(icons[k]||icons.settings)+'</svg>';}
  function button(id,label,key,cls){var b=document.createElement('button');b.id=id;b.className=cls||'studio-tool';b.type='button';b.title=label;b.setAttribute('aria-label',label);b.innerHTML=svg(key)+'<span>'+label+'</span>';return b;}
  function click(id){var e=document.getElementById(id);if(e)e.click();}
  var rail=document.querySelector('.rail');
  if(rail&&!mobile){
    var navButtons=rail.querySelectorAll('.rail-btn');
    navButtons[0].innerHTML=svg('pen')+'<span>创作对话</span><small>01</small>';
    navButtons[1].innerHTML=svg('settings')+'<span>系统配置</span><small>04</small>';
    var history=button('studioHistory','对话档案','history','rail-btn studio-nav');
    history.innerHTML=svg('history')+'<span>对话档案</span><small>02</small>';
    history.onclick=function(){click('btnDrawer');};
    rail.insertBefore(history,navButtons[1]);
    var focusNav=button('studioFocusNav','专注阅读','focus','rail-btn studio-nav');
    focusNav.innerHTML=svg('focus')+'<span>专注阅读</span><small>03</small>';
    rail.insertBefore(focusNav,navButtons[1]);
    var fresh=button('studioNew','新建对话','plus','studio-new');
    fresh.onclick=function(){click('btnNewChat');};
    rail.insertBefore(fresh,rail.querySelector('.rail-spacer'));
    var stamp=document.createElement('div');stamp.className='studio-stamp';stamp.innerHTML='<span>LY / STUDIO</span><strong>每一个世界<br>都始于一句话。</strong><i></i><small>CREATIVE OPERATIONS<br>EST. 2026 / LOCAL ARCHIVE</small>';
    rail.insertBefore(stamp,rail.querySelector('.rail-vert'));
  }
  var top=document.querySelector('.top-right');
  var focus=button('studioFocus','专注阅读','focus','icon-btn studio-focus');
  focus.setAttribute('aria-pressed','false');top.insertBefore(focus,top.firstChild);
  function toggleFocus(){
    var on=root.classList.toggle('studio-focused');
    focus.setAttribute('aria-pressed',String(on));focus.classList.toggle('on',on);
    focus.setAttribute('aria-label',on?'退出专注阅读':'专注阅读');focus.title=on?'退出专注阅读':'专注阅读';
    var n=document.getElementById('studioFocusNav');if(n)n.classList.toggle('on',on);
  }
  focus.onclick=toggleFocus;var fn=document.getElementById('studioFocusNav');if(fn)fn.onclick=toggleFocus;
  var theme=document.getElementById('btnTheme');
  if(mobile&&theme){theme.classList.add('studio-mobile-theme');top.insertBefore(theme,focus);}
  var name=document.querySelector('.brand .cn');if(name)name.textContent='良爷工作台';
  var version=document.createElement('span');version.className='studio-version';version.textContent='beta2.0.04';version.style.cssText='font:9px var(--mono);color:var(--tx-3);margin-left:4px;white-space:nowrap';if(mobile){version.style.fontSize='8px';document.querySelector('#v-chat .sec-head').appendChild(version);}else{document.querySelector('.brand').appendChild(version);}
  var title=document.querySelector('#v-chat .sec-en');if(title)title.textContent='CREATIVE OPERATIONS / WRITING CONSOLE';
  var mark=document.querySelector('.brand .mark');if(mark)mark.innerHTML='<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M6 6h28v9H15v19H6V6Z" fill="currentColor"/><path d="m19 19 15 15M27 19l7 7M19 27l7 7" stroke="currentColor" stroke-width="3"/></svg>';
  var composer=document.querySelector('.composer');
  var meta=document.createElement('div');meta.className='studio-input-meta';meta.innerHTML='<span id="studioChars">0 字</span><span>'+(mobile?'写下灵感，或长按正文选择批注':'<kbd>ENTER</kbd> 发送 <i>/</i> <kbd>SHIFT + ENTER</kbd> 换行')+'</span>';
  composer.appendChild(meta);
  var input=document.getElementById('input');input.setAttribute('aria-label','创作指令与写作内容');
  input.addEventListener('input',function(){document.getElementById('studioChars').textContent=input.value.replace(/\s/g,'').length+' 字';});
  var readbar=document.createElement('div');readbar.className='studio-readbar';readbar.innerHTML='<div><span class="studio-live"></span><b>叙事工作区</b><small> / MANUSCRIPT</small></div><div><span id="studioWords">0 字</span><button id="studioTextDown" title="缩小正文字号" aria-label="缩小正文字号">A−</button><button id="studioTextUp" title="放大正文字号" aria-label="放大正文字号">A+</button></div>';
  var chat=document.getElementById('chat');chat.parentNode.insertBefore(readbar,chat);
  var size=mobile?16:16;
  try{size=Number(localStorage.getItem('liangye_studio_fontsize'))||size;}catch(e){}
  /* Keep the existing parallax option, but default new workstations to stable reading. */
  try{if(!localStorage.getItem('liangye_studio_initialized')){api.S.motionOn=false;var motion=document.getElementById('motionBtn');if(motion)motion.classList.remove('on');var stage=document.getElementById('stage');if(stage){stage.style.transform='';stage.style.willChange='';}api.save();localStorage.setItem('liangye_studio_initialized','1');}}catch(e){}
  size=Math.max(14,Math.min(22,size));
  function setSize(v){size=Math.max(14,Math.min(22,v));root.style.setProperty('--story-size',size+'px');document.getElementById('studioTextDown').disabled=size<=14;document.getElementById('studioTextUp').disabled=size>=22;try{localStorage.setItem('liangye_studio_fontsize',String(size));}catch(e){}}
  document.getElementById('studioTextDown').onclick=function(){setSize(size-1);};document.getElementById('studioTextUp').onclick=function(){setSize(size+1);};setSize(size);
  var seen=new Set(),frame=0;
  function enhance(){
    frame=0;
    var s=api.S, words=0;
    chat.querySelectorAll('.msg').forEach(function(m){
      var ans=m.querySelector('.ans');if(ans&&m.classList.contains('ai'))words+=ans.textContent.replace(/\s/g,'').length;
      var key=s.activeId+'/'+m.dataset.i+'/'+(m.classList.contains('ai')?'ai':'me');
      if(!seen.has(key)){seen.add(key);if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)m.animate([{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:230,easing:'cubic-bezier(.2,.8,.2,1)'});}
      m.querySelectorAll('[data-act]').forEach(function(b){if(b.dataset.styled)return;b.dataset.styled='1';b.insertAdjacentHTML('afterbegin',svg({copy:'copy',anno:'anno',regen:'regen',edit:'edit',again:'arrow'}[b.dataset.act]||'arrow'));});
    });
    document.getElementById('studioWords').textContent=words.toLocaleString('zh-CN')+' 字';
    var cv=document.getElementById('studioCtxVal');if(cv){var rc=document.getElementById('rdCtx');if(rc)cv.textContent=rc.textContent;}
    var em=chat.querySelector('.empty');if(em&&!em.dataset.styled){em.dataset.styled='1';em.querySelector('.em-t').innerHTML='让故事，<br>在此发生<span class="studio-period">.</span>';em.querySelector('.em-d').textContent='从一个人物、一场相遇，或一句尚未完成的话开始。';em.querySelector('.em-en').textContent='EVERY WORLD BEGINS WITH A WORD';em.querySelector('.em-mark').innerHTML=svg('pen');var c=em.querySelector('[data-cfg]');if(c)c.textContent='配置创作引擎';}
  }
  new MutationObserver(function(){if(!frame)frame=requestAnimationFrame(enhance);}).observe(chat,{childList:true,subtree:true,characterData:true});enhance();
  function themePaint(){if(theme){var dark=root.dataset.theme==='dark';theme.innerHTML=svg(dark?'sun':'moon');theme.title=dark?'切换日间 / 跟随系统':'切换夜间 / 跟随系统';}root.style.colorScheme=root.dataset.theme;}
  new MutationObserver(themePaint).observe(root,{attributes:true,attributeFilter:['data-theme']});themePaint();
  document.querySelectorAll('.cfg-sec .ico').forEach(function(e){var r=e.closest('.row'),k='settings';if(r){if(r.querySelector('#btnSaveKey'))k='key';else if(r.querySelector('#btnEditBase'))k='model';else if(r.id==='btnPersona')k='person';else if(r.querySelector('#btnTest'))k='check';}e.innerHTML=svg(k);e.classList.add('studio-ico');});
  var railButtons=document.querySelectorAll('.rail-btn');railButtons.forEach(function(b){if(b.dataset.go)b.setAttribute('aria-label',b.dataset.go==='v-chat'?'创作对话':'系统配置');});
  /* ---- 侧栏滑动高亮：黄色选中块平滑移动 ---- */
  var navHl=null;
  if(rail&&!mobile){
    navHl=document.createElement('i');navHl.className='nav-highlight';navHl.setAttribute('aria-hidden','true');rail.prepend(navHl);
    var moveHl=function(){
      var t=api.S.drawerOpen?document.getElementById('studioHistory'):rail.querySelector('.rail-btn.active');
      if(!t)return;
      var rr=rail.getBoundingClientRect(),tr=t.getBoundingClientRect();
      if(!tr.height)return;
      navHl.style.left=(tr.left-rr.left)+'px';
      navHl.style.width=tr.width+'px';
      navHl.style.height=tr.height+'px';
      navHl.style.transform='translateY('+(tr.top-rr.top)+'px)';
      navHl.style.opacity='1';
    };
    new MutationObserver(moveHl).observe(rail,{subtree:true,attributes:true,attributeFilter:['class']});
    var drEl=document.getElementById('drawer');
    if(drEl)new MutationObserver(moveHl).observe(drEl,{attributes:true,attributeFilter:['class']});
    window.addEventListener('resize',moveHl);
    window.addEventListener('load',moveHl);
    moveHl();setTimeout(moveHl,180);setTimeout(moveHl,700);
  }
  /* ---- 上下文用量：点击展开圆环详情 ---- */
  var ctxPops=[];
  function makeCtxPop(){
    var CIRC=2*Math.PI*50;
    var el=document.createElement('div');
    el.className='ctx-pop';
    el.setAttribute('role','dialog');
    el.setAttribute('aria-label','上下文用量详情');
    el.innerHTML='<div class="ctx-pop-head"><span>上下文用量 <em>/ CONTEXT</em></span>'+
      '<button type="button" class="ctx-pop-x" aria-label="关闭">'+svg('close')+'</button></div>'+
      '<div class="ctx-ring-wrap"><svg class="ctx-ring" viewBox="0 0 120 120" aria-hidden="true">'+
        '<circle class="ctx-ring-bg" cx="60" cy="60" r="50"></circle>'+
        '<circle class="ctx-ring-fg" cx="60" cy="60" r="50"></circle></svg>'+
        '<div class="ctx-ring-num"><b>0</b><span>%</span><small>已用</small></div></div>'+
      '<div class="ctx-rows">'+
        '<div><span>已用上下文</span><b data-k="used">0</b></div>'+
        '<div><span>剩余容量</span><b data-k="left">0</b></div>'+
        '<div><span>总会话容量</span><b data-k="limit">0</b></div>'+
        '<div><span>消息条数</span><b data-k="msgs">0</b></div></div>'+
      '<p class="ctx-note">按文本长度估算，用于把握篇幅；非模型实际计费 Token。</p>';
    var fg=el.querySelector('.ctx-ring-fg'),num=el.querySelector('.ctx-ring-num b');
    fg.style.strokeDasharray=CIRC;
    var isOpen=false,countRaf=0;
    function kfmt(n){n=Number(n)||0;return n>=1000?(n/1000).toFixed(n>=10000?0:1)+'K':String(n);}
    function countUp(target){
      if(countRaf)cancelAnimationFrame(countRaf);
      var t0=0,dur=640;
      function tick(now){
        if(!t0)t0=now;
        var p=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-p,3);
        num.textContent=String(Math.round(target*e));
        if(p<1)countRaf=requestAnimationFrame(tick);else{num.textContent=String(target);countRaf=0;}
      }
      countRaf=requestAnimationFrame(tick);
    }
    function refresh(){
      var S=api.S||{},used=Number(S.used)||0,limit=Number(S.limit)||128000,pct=limit?Math.max(0,Math.min(100,used/limit*100)):0;
      var convs=S.convs||[],c=null;
      for(var i=0;i<convs.length;i++){if(convs[i].id===S.activeId){c=convs[i];break;}}
      var q=function(k){return el.querySelector('[data-k="'+k+'"]');};
      q('used').textContent=kfmt(used);
      q('left').textContent=kfmt(Math.max(0,limit-used));
      q('limit').textContent=kfmt(limit);
      q('msgs').textContent=String(c?c.msgs.length:0);
      fg.style.stroke=pct>=85?'var(--sig-red)':(pct>=60?'var(--sig-orange)':'var(--ac)');
      fg.style.strokeDashoffset=CIRC*(1-pct/100);
      countUp(Math.round(pct));
    }
    function open(){
      if(isOpen)return;isOpen=true;
      fg.style.transition='none';fg.style.strokeDashoffset=CIRC;
      el.classList.add('show');
      requestAnimationFrame(function(){requestAnimationFrame(function(){fg.style.transition='';refresh();});});
    }
    function close(){if(!isOpen)return;isOpen=false;el.classList.remove('show');}
    el.querySelector('.ctx-pop-x').addEventListener('click',function(e){e.stopPropagation();close();});
    return {el:el,open:open,close:close,isOpen:function(){return isOpen;}};
  }
  function attachCtx(anchor,dir,host){
    if(!anchor||!anchor.offsetParent)return null;
    var p=makeCtxPop();
    p.el.classList.add(dir==='down'?'ctx-pop--down':'ctx-pop--up');
    (host||anchor).appendChild(p.el);
    anchor.classList.add('ctx-anchor');
    anchor.setAttribute('role','button');
    anchor.setAttribute('tabindex','0');
    anchor.setAttribute('aria-haspopup','dialog');
    function toggle(){
      if(p.isOpen()){p.close();return;}
      ctxPops.forEach(function(o){o.close();});
      p.open();
    }
    anchor.addEventListener('click',function(e){if(e.target.closest('.ctx-pop'))return;toggle();});
    anchor.addEventListener('keydown',function(e){
      if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}
    });
    ctxPops.push(p);
    return p;
  }
  if(!mobile)attachCtx(document.getElementById('ctxStrip'),'up');
  var cube=document.getElementById('rdCtx');
  if(cube)attachCtx(cube.closest('.res'),'down');
  if(mobile){
    var rg=readbar.children[1];
    if(rg){
      var cb=document.createElement('button');
      cb.type='button';cb.id='studioCtxBtn';cb.className='studio-ctx-btn';
      cb.innerHTML='<span>CTX</span><b id="studioCtxVal">0 / 128K</b>';
      rg.insertBefore(cb,rg.firstChild);
      attachCtx(cb,'up',document.getElementById('ctxStrip'));
    }
  }
  document.addEventListener('click',function(e){
    if(e.target.closest('.ctx-anchor')||e.target.closest('.ctx-pop'))return;
    ctxPops.forEach(function(p){p.close();});
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape')ctxPops.forEach(function(p){p.close();});
  });
  /* The original skip handler is retained; cosmetic boot now takes less than a second. */
  setTimeout(function(){var l=document.getElementById('loader');if(l&&!l.classList.contains('done'))click('skipBtn');},100);
})();
