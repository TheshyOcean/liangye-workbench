/* ============================================================================
   TWS · 视图层
   书稿（项目/卷/章 + 正文 + 版本）/ 设定库 / 伏笔与时间线
   + 统计条 + AI 采纳按钮 + 导航入口 + 通用弹层
   ========================================================================== */
(function () {
  'use strict';
  var T = window.TWS = window.TWS || {};
  var D = T.data;
  var $ = function (id) { return document.getElementById(id); };
  var esc = D.esc;

  var ui = {
    kind: 'character',      // 设定库当前分类
    tab: 'thread',          // 伏笔页当前 tab
    chapterId: null,        // 当前编辑的章节
    saveTimer: null,
    mounted: false
  };

  /* ============================================================
     通用：toast 与 modal
     ============================================================ */
  function toast(msg) {
    var el = document.createElement('div');
    el.className = 'tws-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('on'); });
    setTimeout(function () {
      el.classList.remove('on');
      setTimeout(function () { el.remove(); }, 300);
    }, 2000);
  }

  var modalStack = [];
  function modal(title, bodyHtml, opts) {
    opts = opts || {};
    var wrap = document.createElement('div');
    wrap.className = 'tws-modal-wrap';
    wrap.innerHTML =
      '<div class="tws-modal">' +
        '<div class="tws-modal-h"><span class="sq"></span><b>' + esc(title) + '</b>' +
          '<button class="tws-x" data-close>✕</button></div>' +
        '<div class="tws-modal-b">' + bodyHtml + '</div>' +
        (opts.footer === false ? '' :
          '<div class="tws-modal-f">' +
            '<button class="tws-btn ghost" data-close>取消</button>' +
            '<button class="tws-btn primary" data-ok>' + esc(opts.okText || '确定') + '</button>' +
          '</div>') +
      '</div>';
    document.body.appendChild(wrap);
    modalStack.push(wrap);
    requestAnimationFrame(function () { wrap.classList.add('on'); });

    function close() {
      wrap.classList.remove('on');
      modalStack = modalStack.filter(function (w) { return w !== wrap; });
      setTimeout(function () { wrap.remove(); }, 260);
    }
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target.hasAttribute('data-close')) close();
      if (e.target.hasAttribute('data-ok')) {
        if (opts.onOk && opts.onOk(wrap) === false) return;
        close();
      }
    });
    var first = wrap.querySelector('input,textarea');
    if (first) setTimeout(function () { first.focus(); }, 120);
    return { el: wrap, close: close };
  }

  function confirmBox(text, onYes) {
    modal('确认', '<p class="tws-p">' + esc(text) + '</p>', { okText: '确定', onOk: onYes });
  }

  /* ============================================================
     视图骨架
     ============================================================ */
  var BOOK_HTML =
    '<section class="view" id="v-book">' +
      '<div class="sec-head">' +
        '<span class="sec-no">04</span>' +
        '<span class="sec-meta"><span class="sec-en">// Manuscript</span><span class="sec-cn">书稿</span></span>' +
        '<span class="sec-right">' +
          '<span class="chip tws-goal-chip" id="twsGoalChip">今日 0 字</span>' +
          '<button class="mini-btn" id="twsBtnExport">导出</button>' +
          '<button class="mini-btn" id="twsBtnNewCh">新建章节</button>' +
        '</span>' +
      '</div>' +
      '<div class="tws-book">' +
        '<aside class="tws-tree" id="twsTree"></aside>' +
        '<div class="tws-editor" id="twsEditor"></div>' +
      '</div>' +
    '</section>';

  var LORE_HTML =
    '<section class="view" id="v-lore">' +
      '<div class="sec-head">' +
        '<span class="sec-no">05</span>' +
        '<span class="sec-meta"><span class="sec-en">// Lore</span><span class="sec-cn">设定库</span></span>' +
        '<span class="sec-right"><button class="mini-btn" id="twsBtnNewCard">新建卡片</button></span>' +
      '</div>' +
      '<div class="tws-tabs" id="twsLoreTabs"></div>' +
      '<div class="tws-lore-hint" id="twsLoreHint"></div>' +
      '<div class="tws-cards" id="twsCards"></div>' +
    '</section>';

  var THREADS_HTML =
    '<section class="view" id="v-threads">' +
      '<div class="sec-head">' +
        '<span class="sec-no">06</span>' +
        '<span class="sec-meta"><span class="sec-en">// Threads</span><span class="sec-cn">伏笔与时间线</span></span>' +
        '<span class="sec-right"><button class="mini-btn" id="twsBtnNewThread">记一条</button></span>' +
      '</div>' +
      '<div class="tws-tabs" id="twsThreadTabs"></div>' +
      '<div class="tws-thread-list" id="twsThreadList"></div>' +
    '</section>';

  /* ============================================================
     书稿：项目树
     ============================================================ */
  function renderTree() {
    updateChapterChip();
    var box = $('twsTree');
    if (!box) return;
    var pid = D.D.activeProject;
    var p = pid && D.getProject(pid);

    if (!p) {
      box.innerHTML =
        '<div class="tws-empty">' +
          '<b>还没有作品</b>' +
          '<p>先建一本，之后按「卷 → 章」组织内容。</p>' +
          '<button class="tws-btn primary" id="twsCreateProj">新建作品</button>' +
        '</div>';
      var b = $('twsCreateProj');
      if (b) b.addEventListener('click', promptNewProject);
      renderEditor();
      return;
    }

    var vols = D.listVolumes(p.id);
    var html =
      '<div class="tws-proj">' +
        '<div class="tws-proj-h">' +
          '<div class="tws-proj-n">《' + esc(p.name) + '》</div>' +
          '<div class="tws-proj-s">' + vols.length + ' 卷 · ' +
            D.projectChapterCount(p.id) + ' 章 · ' + D.fmtNum(D.projectWords(p.id)) + ' 字</div>' +
          '<div class="tws-proj-a">' +
            '<button data-pact="addvol" title="新建卷">＋卷</button>' +
            '<button data-pact="editproj" title="作品设置">⋯</button>' +
          '</div>' +
        '</div>';

    vols.forEach(function (v) {
      var chs = D.listChapters(v.id);
      var w = chs.reduce(function (s, c) { return s + (c.words || 0); }, 0);
      html +=
        '<div class="tws-vol">' +
          '<div class="tws-vol-h" data-vol="' + v.id + '">' +
            '<span class="tws-caret">▾</span>' +
            '<span class="tws-vol-n">' + esc(v.title) + '</span>' +
            '<span class="tws-vol-s">' + chs.length + ' 章 · ' + D.fmtNum(w) + '</span>' +
            '<button data-vact="addch" data-vid="' + v.id + '" title="新建章节">＋</button>' +
            '<button data-vact="delvol" data-vid="' + v.id + '" title="删除卷">✕</button>' +
          '</div>' +
          '<div class="tws-chs">';
      chs.forEach(function (c) {
        html +=
          '<div class="tws-ch' + (c.id === ui.chapterId ? ' on' : '') + '" data-ch="' + c.id + '">' +
            '<span class="tws-ch-n">' + esc(c.title) + '</span>' +
            '<span class="tws-st st-' + c.status + '">' + T.exporters.statusName(c.status) + '</span>' +
            '<span class="tws-ch-w">' + (c.words || 0) + '</span>' +
          '</div>';
      });
      if (!chs.length) html += '<div class="tws-ch-empty">这一卷还没有章节</div>';
      html += '</div></div>';
    });

    if (!vols.length) {
      html += '<div class="tws-empty small"><p>还没有卷。</p>' +
        '<button class="tws-btn primary" data-pact="addvol">新建第一卷</button></div>';
    }
    html += '</div>';
    box.innerHTML = html;

    box.addEventListener('click', onTreeClick);
    renderEditor();
  }

  function onTreeClick(e) {
    var t = e.target;
    var ch = t.closest('[data-ch]');
    if (ch) { openChapter(ch.getAttribute('data-ch')); return; }

    var vact = t.closest('[data-vact]');
    if (vact) {
      e.stopPropagation();
      var vid = vact.getAttribute('data-vid');
      var act = vact.getAttribute('data-vact');
      if (act === 'addch') promptNewChapter(vid);
      if (act === 'delvol') {
        var v = D.D.volumes.filter(function (x) { return x.id === vid; })[0];
        confirmBox('删除「' + (v ? v.title : '') + '」及其中所有章节？此操作不可撤销。', function () {
          D.removeVolume(vid);
          if (ui.chapterId && !D.getChapter(ui.chapterId)) ui.chapterId = null;
          renderTree(); toast('已删除');
        });
      }
      return;
    }

    var pact = t.closest('[data-pact]');
    if (pact) {
      var a = pact.getAttribute('data-pact');
      if (a === 'addvol') promptNewVolume();
      if (a === 'editproj') promptEditProject();
    }
  }

  function promptNewProject() {
    modal('新建作品',
      '<label class="tws-l">作品名</label><input class="tws-i" id="mName" placeholder="例如：长夜将明">' +
      '<label class="tws-l">题材（可选）</label><input class="tws-i" id="mGenre" placeholder="玄幻 / 都市 / 悬疑…">',
      {
        onOk: function (w) {
          var n = w.querySelector('#mName').value.trim();
          if (!n) { toast('请填作品名'); return false; }
          var p = D.addProject(n, w.querySelector('#mGenre').value.trim());
          D.addVolume(p.id, '第一卷');
          var v = D.listVolumes(p.id)[0];
          var c = D.addChapter(v.id, '第一章');
          ui.chapterId = c.id;
          renderTree(); toast('已创建');
        }
      });
  }

  function promptEditProject() {
    var p = D.getProject(D.D.activeProject);
    if (!p) return;
    modal('作品设置',
      '<label class="tws-l">作品名</label><input class="tws-i" id="mName" value="' + esc(p.name) + '">' +
      '<label class="tws-l">题材</label><input class="tws-i" id="mGenre" value="' + esc(p.genre || '') + '">',
      {
        okText: '保存',
        onOk: function (w) {
          D.updateProject(p.id, {
            name: w.querySelector('#mName').value.trim() || p.name,
            genre: w.querySelector('#mGenre').value.trim()
          });
          renderTree(); toast('已保存');
        }
      });
  }

  function promptNewVolume() {
    var pid = D.D.activeProject; if (!pid) return;
    modal('新建卷',
      '<label class="tws-l">卷名</label><input class="tws-i" id="mVol" placeholder="第二卷">',
      {
        onOk: function (w) {
          var n = w.querySelector('#mVol').value.trim();
          if (!n) { toast('请填卷名'); return false; }
          D.addVolume(pid, n);
          renderTree(); toast('已创建');
        }
      });
  }

  function promptNewChapter(vid) {
    var pid = D.D.activeProject; if (!pid) return;
    var vols = D.listVolumes(pid);
    if (!vols.length) { promptNewVolume(); return; }
    vid = vid || (vols[0] && vols[0].id);
    modal('新建章节',
      '<label class="tws-l">章节标题</label><input class="tws-i" id="mCh" placeholder="第一章 雪夜">' +
      '<label class="tws-l">所属卷</label><select class="tws-i" id="mVol">' +
        vols.map(function (v) { return '<option value="' + v.id + '"' + (v.id === vid ? ' selected' : '') + '>' + esc(v.title) + '</option>'; }).join('') +
      '</select>',
      {
        onOk: function (w) {
          var n = w.querySelector('#mCh').value.trim();
          if (!n) { toast('请填章节标题'); return false; }
          var c = D.addChapter(w.querySelector('#mVol').value, n);
          ui.chapterId = c.id;
          renderTree(); toast('已创建');
        }
      });
  }

  /* ============================================================
     书稿：编辑器
     ============================================================ */
  function openChapter(id) {
    flushSave();
    ui.chapterId = id;
    D.D.activeChapter = id;
    var c = D.getChapter(id);
    if (c) {
      try {
        var api = window.__ENDF__;
        if (!c.convId && api && api.newConv) {
          var nc = api.newConv();
          if (nc) { c.convId = nc.id; nc.title = c.title; api.save && api.save(); }
        }
        if (c.convId && api && api.S) {
          api.S.activeId = c.convId;
          api.save && api.save();
          api.renderChat && api.renderChat();
          api.renderDrawer && api.renderDrawer();
        }
      } catch (e) {}
    }
    D.save();
    renderTree();
    updateChapterChip();
  }

  function renderEditor() {
    var box = $('twsEditor');
    if (!box) return;
    var c = ui.chapterId && D.getChapter(ui.chapterId);
    if (!c) {
      box.innerHTML = '<div class="tws-empty"><b>选一章开始写</b><p>左侧点章节，或新建一章。</p></div>';
      return;
    }
    box.innerHTML =
      '<div class="tws-ch-head">' +
        '<input class="tws-ch-title" id="twsChTitle" value="' + esc(c.title) + '" spellcheck="false">' +
        '<div class="tws-ch-row">' +
          '<span class="tws-st st-' + c.status + '" id="twsStatus">' + T.exporters.statusName(c.status) + '</span>' +
          '<span class="tws-words" id="twsWords">' + (c.words || 0) + ' 字</span>' +
          '<span class="tws-upd">' + D.timeAgo(c.updated) + '</span>' +
          '<span class="tws-spacer"></span>' +
          '<button class="tws-btn sm" id="twsBtnHist">历史</button>' +
          '<button class="tws-btn sm" id="twsBtnCheck">检查</button>' +
          '<button class="tws-btn sm ghost" id="twsBtnDelCh">删除</button>' +
        '</div>' +
      '</div>' +
      '<textarea class="tws-content" id="twsContent" spellcheck="false" placeholder="从这里开始写……"></textarea>';

    var ta = $('twsContent');
    ta.value = c.content || '';
    autosize(ta);

    ta.addEventListener('input', function () {
      autosize(ta);
      clearTimeout(ui.saveTimer);
      ui.saveTimer = setTimeout(flushSave, 900);
    });
    ta.addEventListener('blur', flushSave);

    $('twsChTitle').addEventListener('change', function () {
      var c2 = D.getChapter(ui.chapterId);
      if (c2 && this.value.trim()) { D.updateChapter(c2.id, { title: this.value.trim() }); renderTree(); }
    });

    $('twsStatus').addEventListener('click', function () { cycleStatus(); });
    $('twsBtnHist').addEventListener('click', openHistory);
    $('twsBtnCheck').addEventListener('click', openCheck);
    $('twsBtnDelCh').addEventListener('click', function () {
      confirmBox('删除「' + c.title + '」？正文与版本记录都会删除。', function () {
        D.removeChapter(c.id); ui.chapterId = null; renderTree(); toast('已删除');
      });
    });
  }

  function autosize(ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.max(280, ta.scrollHeight) + 'px';
  }

  function flushSave() {
    clearTimeout(ui.saveTimer); ui.saveTimer = null;
    var ta = $('twsContent');
    if (!ta || !ui.chapterId) return;
    var c = D.getChapter(ui.chapterId);
    if (!c || c.content === ta.value) return;
    D.saveChapterContent(ui.chapterId, ta.value, '编辑前');
    var w = $('twsWords');
    if (w) w.textContent = (c.words || 0) + ' 字';
    renderGoalChip();
  }

  var STATUS_CYCLE = ['draft', 'revising', 'final'];
  function cycleStatus() {
    var c = D.getChapter(ui.chapterId); if (!c) return;
    var i = STATUS_CYCLE.indexOf(c.status);
    var next = STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
    if (next === 'final') {
      // 定稿前提示检查
      modal('标记为定稿',
        '<p class="tws-p">定稿前建议跑一次检查。要现在检查吗？</p>',
        {
          okText: '先检查', onOk: function () { setStatus(c.id, 'final'); openCheck(); },
          footer: true
        });
      return;
    }
    setStatus(c.id, next);
  }
  function setStatus(id, st) {
    D.updateChapter(id, { status: st });
    D.snapshot(id, st === 'final' ? '定稿' : '状态变更', D.getChapter(id).content);
    var el = $('twsStatus');
    if (el) { el.textContent = T.exporters.statusName(st); el.className = 'tws-st st-' + st; }
    renderTree();
    toast('已标记为' + T.exporters.statusName(st));
  }

  /* ---------- 版本历史 ---------- */
  function openHistory() {
    flushSave();
    var c = D.getChapter(ui.chapterId); if (!c) return;
    var list = D.listVersions(c.id);
    var html = '<div class="tws-vers">';
    html += '<div class="tws-ver on"><div class="tws-ver-t">当前</div>' +
      '<div class="tws-ver-m">' + (c.words || 0) + ' 字</div></div>';
    if (!list.length) {
      html += '<p class="tws-p" style="margin-top:12px">还没有历史版本。每次编辑、AI 改写、定稿都会自动留档。</p>';
    }
    list.forEach(function (v) {
      html += '<div class="tws-ver" data-ver="' + v.id + '">' +
        '<div class="tws-ver-t">' + esc(v.label) + '</div>' +
        '<div class="tws-ver-m">' + D.countWords(v.content) + ' 字 · ' + D.timeAgo(v.created) + '</div>' +
        '</div>';
    });
    html += '</div>';

    var m = modal('历史 · ' + c.title, html, { footer: false });
    m.el.addEventListener('click', function (e) {
      var v = e.target.closest('[data-ver]');
      if (!v) return;
      var vid = v.getAttribute('data-ver');
      showDiff(c.id, vid, m);
    });
  }

  function showDiff(chapterId, verId, parentModal) {
    var c = D.getChapter(chapterId);
    var v = (D.D.versions[chapterId] || []).filter(function (x) { return x.id === verId; })[0];
    if (!c || !v) return;
    var a = String(v.content || '').split(/\n+/).filter(function (x) { return x.trim(); });
    var b = String(c.content || '').split(/\n+/).filter(function (x) { return x.trim(); });
    var max = Math.max(a.length, b.length);
    var rows = '';
    for (var i = 0; i < max; i++) {
      var left = a[i] || '', right = b[i] || '';
      var changed = left !== right;
      rows += '<tr class="' + (changed ? 'chg' : '') + '">' +
        '<td>' + esc(left) + '</td><td>' + esc(right) + '</td></tr>';
    }
    parentModal.close();
    var m = modal('对比 · ' + v.label,
      '<div class="tws-diff"><table>' +
        '<thead><tr><th>' + esc(v.label) + '</th><th>当前</th></tr></thead>' +
        '<tbody>' + rows + '</tbody></table></div>',
      { okText: '回滚到这一版' });
    m.el.querySelector('[data-ok]').addEventListener('click', function () {
      D.rollback(chapterId, verId);
      renderTree(); renderEditor(); toast('已回滚');
    });
  }

  /* ---------- 一致性检查 ---------- */
  function openCheck() {
    flushSave();
    var c = D.getChapter(ui.chapterId); if (!c) return;
    var m = modal('定稿前检查 · ' + c.title,
      '<div class="tws-checking"><div class="tws-spin"></div><p>正在检查…</p>' +
      '<p class="tws-p">本地规则瞬时完成，语义检查需要几秒</p></div>',
      { footer: false });

    T.checker.run(D.D.activeProject, c.id).then(function (res) {
      var issues = res.issues || [];
      var html = '';
      if (!issues.length) {
        html += '<div class="tws-ok-big">✓ 没有发现明显问题</div>';
      } else {
        html += '<div class="tws-issue-h">⚠ ' + issues.length + ' 处需要注意</div>';
        issues.forEach(function (it, i) {
          html += '<div class="tws-issue">' +
            '<div class="tws-issue-t">' + esc(it.title) + '</div>' +
            (it.quote ? '<div class="tws-issue-q">「' + esc(it.quote) + '」</div>' : '') +
            '<div class="tws-issue-r">' + esc(it.reason) + '</div>' +
            '</div>';
        });
      }
      if (res.noKey) {
        html += '<p class="tws-p" style="margin-top:14px">⚠ 未配置 API Key，只跑了本地规则检查（名字 / 顺序）。配置后可检查人设与时间线。</p>';
      }
      m.el.querySelector('.tws-modal-b').innerHTML = html;
      m.el.querySelector('.tws-modal-f') && (m.el.querySelector('.tws-modal-f').innerHTML =
        '<button class="tws-btn ghost" data-close>关闭</button>' +
        '<button class="tws-btn primary" data-ok>仍然定稿</button>');
      var ok = m.el.querySelector('[data-ok]');
      if (ok) ok.addEventListener('click', function () { setStatus(c.id, 'final'); m.close(); });
    }).catch(function (e) {
      m.el.querySelector('.tws-modal-b').innerHTML =
        '<p class="tws-p">检查失败：' + esc(e.message) + '</p>';
    });
  }

  /* ============================================================
     设定库
     ============================================================ */
  function renderLore() {
    var pid = D.D.activeProject;
    var tabs = $('twsLoreTabs');
    var box = $('twsCards');
    if (!tabs || !box) return;

    if (!pid) {
      tabs.innerHTML = '';
      box.innerHTML = '<div class="tws-empty"><b>先建一部作品</b><p>设定卡片挂在作品下面。</p></div>';
      return;
    }

    tabs.innerHTML = Object.keys(D.CARD_KINDS).map(function (k) {
      var n = D.listCards(pid, k).length;
      return '<span class="chip' + (ui.kind === k ? ' on' : '') + '" data-kind="' + k + '">' +
        D.CARD_KINDS[k] + (n ? ' ' + n : '') + '</span>';
    }).join('');

    var list = D.listCards(pid, ui.kind);
    if (!list.length) {
      box.innerHTML = '<div class="tws-empty small"><b>还没有' + D.CARD_KINDS[ui.kind] + '卡片</b>' +
        '<p>把人物性格、外貌、关系记成卡片，续写时可以带上。</p>' +
        '<button class="tws-btn primary" data-newcard>新建一张</button></div>';
      return;
    }

    updateLoreHint();
    box.innerHTML = list.map(function (c) {
      var attrs = c.attrs || {};
      var brief = c.body || Object.keys(attrs).map(function (k) { return attrs[k]; }).filter(Boolean).join(' · ');
      return '<div class="tws-card' + (c.on ? ' on' : '') + '" data-card="' + c.id + '">' +
        '<div class="tws-card-h">' +
          '<b>' + esc(c.name) + '</b>' +
          '<span class="tws-sw' + (c.on ? ' on' : '') + '" data-on="' + c.id + '" title="写这一章时带上这条设定"></span>' +
        '</div>' +
        (c.aliases && c.aliases.length ? '<div class="tws-card-al">' + esc(c.aliases.join('、')) + '</div>' : '') +
        '<div class="tws-card-b">' + esc(brief || '（未填写描述）') + '</div>' +
      '</div>';
    }).join('');
  }

  function updateLoreHint() {
    var el = $('twsLoreHint');
    if (!el) return;
    var n = D.onCards().length;
    el.innerHTML = n
      ? '已带上 <b>' + n + '</b> 条设定 · 续写时会自动写进提示词'
      : '卡片右上角的开关 = 写这一章时带上它。勾选后 AI 会自动带着设定写，不容易写崩人设。';
    el.classList.toggle('has', n > 0);
  }

  function promptCard(card) {
    var pid = D.D.activeProject; if (!pid) { toast('先建一部作品'); return; }
    var c = card || {};
    var isNew = !card;
    var body =
      '<label class="tws-l">名称</label><input class="tws-i" id="cName" value="' + esc(c.name || '') + '" placeholder="沈砚">' +
      '<label class="tws-l">分类</label><select class="tws-i" id="cKind">' +
        Object.keys(D.CARD_KINDS).map(function (k) {
          return '<option value="' + k + '"' + ((c.kind || ui.kind) === k ? ' selected' : '') + '>' + D.CARD_KINDS[k] + '</option>';
        }).join('') + '</select>' +
      '<label class="tws-l">别名（逗号分隔）</label><input class="tws-i" id="cAlias" value="' + esc((c.aliases || []).join(',')) + '" placeholder="阿砚, 沈七">' +
      '<label class="tws-l">描述</label><textarea class="tws-i tws-ta" id="cBody" placeholder="性格、外貌、关系、来历…">' + esc(c.body || '') + '</textarea>' +
      '<label class="tws-chk"><input type="checkbox" id="cPin"' + (c.pinned ? ' checked' : '') + '> 常驻（每次续写默认带上）</label>';

    modal(isNew ? '新建卡片' : '编辑卡片', body, {
      okText: isNew ? '创建' : '保存',
      onOk: function (w) {
        var name = w.querySelector('#cName').value.trim();
        if (!name) { toast('请填名称'); return false; }
        var patch = {
          name: name,
          kind: w.querySelector('#cKind').value,
          body: w.querySelector('#cBody').value.trim(),
          aliases: w.querySelector('#cAlias').value.split(/[,，\s]+/).map(function (s) { return s.trim(); }).filter(Boolean),
          pinned: w.querySelector('#cPin').checked ? 1 : 0
        };
        if (isNew) D.addCard(pid, patch.kind, patch.name, patch.body, {}, patch.aliases);
        if (isNew) {
          var last = D.D.cards[D.D.cards.length - 1];
          if (last) D.updateCard(last.id, { pinned: patch.pinned });
        } else {
          D.updateCard(c.id, patch);
        }
        ui.kind = patch.kind;
        renderLore(); toast(isNew ? '已创建' : '已保存');
      }
    });
  }

  /* ============================================================
     伏笔与时间线
     ============================================================ */
  function renderThreads() {
    var pid = D.D.activeProject;
    var tabs = $('twsThreadTabs');
    var box = $('twsThreadList');
    if (!tabs || !box) return;

    tabs.innerHTML =
      '<span class="chip' + (ui.tab === 'thread' ? ' on' : '') + '" data-tab="thread">伏笔</span>' +
      '<span class="chip' + (ui.tab === 'timeline' ? ' on' : '') + '" data-tab="timeline">时间线</span>';

    if (!pid) {
      box.innerHTML = '<div class="tws-empty"><b>先建一部作品</b></div>';
      return;
    }

    if (ui.tab === 'thread') {
      var list = D.listThreads(pid);
      if (!list.length) {
        box.innerHTML = '<div class="tws-empty small"><b>还没有伏笔</b><p>记下埋了什么、准备在哪回收。</p></div>';
        return;
      }
      box.innerHTML = list.map(function (t) {
        var pc = t.plantChapter && D.getChapter(t.plantChapter);
        var oc = t.payoffChapter && D.getChapter(t.payoffChapter);
        var st = t.status === 'done' ? 'done' : (t.status === 'dropped' ? 'dropped' : 'open');
        return '<div class="tws-thread" data-thread="' + t.id + '">' +
          '<span class="tws-dot ' + st + '"></span>' +
          '<div class="tws-thread-m">' +
            '<b>' + esc(t.name) + '</b>' +
            (t.note ? '<span class="tws-thread-n">' + esc(t.note) + '</span>' : '') +
          '</div>' +
          '<div class="tws-thread-c">埋 ' + (pc ? esc(pc.title) : '—') +
            ' · 收 ' + (oc ? esc(oc.title) : '—') + '</div>' +
          '<span class="tws-tag ' + st + '">' + (st === 'done' ? '已回收' : st === 'dropped' ? '已废弃' : '未回收') + '</span>' +
        '</div>';
      }).join('');
    } else {
      var evs = D.listEvents(pid);
      if (!evs.length) {
        box.innerHTML = '<div class="tws-empty small"><b>还没有时间线事件</b><p>记下「什么时候、谁、发生了什么」。</p></div>';
        return;
      }
      var cur = null, html = '';
      evs.forEach(function (e) {
        var ch = e.chapterId && D.getChapter(e.chapterId);
        var grp = ch ? ch.title : '全书背景';
        if (grp !== cur) {
          if (cur !== null) html += '</div>';
          html += '<div class="tws-tl-g"><div class="tws-tl-gh">' + esc(grp) + '</div>';
          cur = grp;
        }
        html += '<div class="tws-tl" data-event="' + e.id + '">' +
          '<span class="tws-tl-w">' + esc(e.whenLabel || '—') + '</span>' +
          '<span class="tws-tl-t">' + esc(e.what) + '</span>' +
          (e.who ? '<span class="tws-tl-h">' + esc(e.who) + '</span>' : '') +
          '</div>';
      });
      if (cur !== null) html += '</div>';
      box.innerHTML = html;
    }
  }

  function promptThread() {
    var pid = D.D.activeProject; if (!pid) { toast('先建一部作品'); return; }
    var chs = allChapters(pid);
    modal('记一条伏笔',
      '<label class="tws-l">埋了什么</label><input class="tws-i" id="tName" placeholder="断剑的来历">' +
      '<label class="tws-l">备注（可选）</label><input class="tws-i" id="tNote" placeholder="准备在第三卷揭晓">' +
      '<label class="tws-l">埋在哪一章</label><select class="tws-i" id="tPlant">' +
        '<option value="">（暂不指定）</option>' +
        chs.map(function (c) { return '<option value="' + c.id + '"' + (c.id === ui.chapterId ? ' selected' : '') + '>' + esc(c.title) + '</option>'; }).join('') +
      '</select>',
      {
        onOk: function (w) {
          var n = w.querySelector('#tName').value.trim();
          if (!n) { toast('请填内容'); return false; }
          D.addThread(pid, n, w.querySelector('#tNote').value.trim(), w.querySelector('#tPlant').value);
          renderThreads(); toast('已记录');
        }
      });
  }

  function promptEvent() {
    var pid = D.D.activeProject; if (!pid) { toast('先建一部作品'); return; }
    var chs = allChapters(pid);
    modal('记一条时间线事件',
      '<label class="tws-l">什么时候</label><input class="tws-i" id="eWhen" placeholder="三年前 / 第 3 天">' +
      '<label class="tws-l">发生了什么</label><input class="tws-i" id="eWhat" placeholder="沈砚师父被杀">' +
      '<label class="tws-l">涉及谁</label><input class="tws-i" id="eWho" placeholder="沈砚、老张">' +
      '<label class="tws-l">发生在哪一章</label><select class="tws-i" id="eCh">' +
        '<option value="">（全书背景）</option>' +
        chs.map(function (c) { return '<option value="' + c.id + '">' + esc(c.title) + '</option>'; }).join('') +
      '</select>',
      {
        onOk: function (w) {
          var what = w.querySelector('#eWhat').value.trim();
          if (!what) { toast('请填事件内容'); return false; }
          D.addEvent(pid, w.querySelector('#eCh').value, w.querySelector('#eWhen').value.trim(),
            w.querySelector('#eWho').value.trim(), what);
          renderThreads(); toast('已记录');
        }
      });
  }

  function allChapters(pid) {
    var out = [];
    D.listVolumes(pid).forEach(function (v) {
      D.listChapters(v.id).forEach(function (c) { out.push(c); });
    });
    return out;
  }

  /* ============================================================
     导出
     ============================================================ */
  function openExport() {
    var pid = D.D.activeProject;
    if (!pid) { toast('先建一部作品'); return; }
    modal('导出',
      '<label class="tws-chk"><input type="checkbox" id="xTitles" checked> 章节标题</label>' +
      '<label class="tws-chk"><input type="checkbox" id="xVol" checked> 卷标题</label>' +
      '<label class="tws-chk"><input type="checkbox" id="xMeta"> 章节状态与字数</label>' +
      '<p class="tws-p" style="margin-top:12px">导出整本：Word 会按卷分段，正文首行缩进两字。</p>',
      {
        okText: '导出 .docx',
        onOk: function (w) {
          var p = D.getProject(pid);
          var blob = T.exporters.docx(pid, {
            titles: w.querySelector('#xTitles').checked,
            volumeTitles: w.querySelector('#xVol').checked,
            meta: w.querySelector('#xMeta').checked
          });
          if (!blob) { toast('导出失败'); return false; }
          T.exporters.download(blob, (p ? p.name : 'book') + '.docx');
          toast('已导出');
        }
      });
  }

  function exportTxt() {
    var pid = D.D.activeProject;
    if (!pid) { toast('先建一部作品'); return; }
    var p = D.getProject(pid);
    var txt = D.buildText(pid);
    // UTF-8 BOM，避免记事本乱码
    var blob = new Blob(['\uFEFF' + txt], { type: 'text/plain;charset=utf-8' });
    T.exporters.download(blob, (p ? p.name : 'book') + '.txt');
    toast('已导出 .txt');
  }

  /* ============================================================
     统计条
     ============================================================ */
  function renderGoalChip() {
    var el = $('twsGoalChip');
    if (!el) return;
    var today = D.todayWords(), goal = D.D.goal || 0;
    el.textContent = goal > 0
      ? '今日 ' + today + ' / ' + goal + ' 字'
      : '今日 ' + today + ' 字';
  }

  function openStats() {
    var l7 = D.last7();
    var max = Math.max.apply(null, l7.map(function (x) { return x.words; }).concat([1]));
    var bars = l7.map(function (x) {
      var h = Math.round(x.words / max * 100);
      return '<div class="tws-bar"><i style="height:' + h + '%"></i>' +
        '<span>' + x.label + '</span><em>' + (x.words || '') + '</em></div>';
    }).join('');

    modal('写作进度',
      '<div class="tws-stat-row">' +
        '<div class="tws-stat"><b>' + D.todayWords() + '</b><span>今日字数</span></div>' +
        '<div class="tws-stat"><b>' + D.weekWords() + '</b><span>本周字数</span></div>' +
        '<div class="tws-stat"><b>' + D.streak() + '</b><span>连续天数</span></div>' +
      '</div>' +
      '<div class="tws-bars">' + bars + '</div>' +
      '<label class="tws-l" style="margin-top:16px">每日目标（字）</label>' +
      '<input class="tws-i" id="sGoal" type="number" min="0" step="100" value="' + (D.D.goal || 0) + '">',
      {
        okText: '保存目标',
        onOk: function (w) {
          D.setGoal(w.querySelector('#sGoal').value);
          renderGoalChip(); toast('已保存');
        }
      });
  }

  /* ============================================================
     模板选择器（对话视图）
     ============================================================ */
  function openTemplate() {
    var cards = T.templates.LIST.map(function (t) {
      return '<div class="tws-tpl" data-tpl="' + t.id + '">' +
        '<b>' + t.name + '</b><span>' + t.hint + '</span></div>';
    }).join('');
    var m = modal('选一个开头', '<div class="tws-tpls">' + cards + '</div>', { footer: false });
    m.el.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tpl]');
      if (!t) return;
      m.close();
      openTemplateForm(t.getAttribute('data-tpl'));
    });
  }

  function openTemplateForm(tplId) {
    var tpl = T.templates.LIST.filter(function (t) { return t.id === tplId; })[0];
    if (!tpl) return;
    var body = tpl.fields.map(function (f) {
      return '<label class="tws-l">' + esc(f.label) + '</label>' +
        '<input class="tws-i" data-f="' + f.k + '" placeholder="' + esc(f.ph || '') + '">';
    }).join('');
    body += '<label class="tws-l">风格</label><div class="tws-chips" id="tplStyles">' +
      Object.keys(T.templates.STYLES).map(function (k) {
        return '<span class="chip' + (k === tpl.style ? ' on' : '') + '" data-style="' + k + '">' +
          T.templates.STYLES[k].name + '</span>';
      }).join('') + '</div>';

    var curStyle = tpl.style;
    var m = modal(tpl.name, body, {
      okText: '生成',
      onOk: function (w) {
        var vals = {};
        w.querySelectorAll('[data-f]').forEach(function (i) { vals[i.getAttribute('data-f')] = i.value; });
        var prompt = T.templates.build(tpl.id, vals, curStyle);
        sendToChat(prompt);
      }
    });
    m.el.querySelector('#tplStyles').addEventListener('click', function (e) {
      var c = e.target.closest('[data-style]');
      if (!c) return;
      curStyle = c.getAttribute('data-style');
      this.querySelectorAll('.chip').forEach(function (x) { x.classList.toggle('on', x === c); });
    });
  }

  /* 把提示词发进对话 */
  function sendToChat(text) {
    if (!text) return;
    if (window.showView) window.showView('v-chat');
    setTimeout(function () {
      var ta = document.getElementById('input');
      if (!ta) { toast('找不到输入框'); return; }
      ta.value = text;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.focus();
      // 触发发送：优先点按钮
      var send = document.getElementById('btnSend') || document.querySelector('[data-act="send"]');
      if (send) send.click();
      else {
        ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }
      toast('已填入，按需修改后发送');
    }, 380);
  }

  /* ============================================================
     AI 采纳按钮（注入到对话消息）
     ============================================================ */
  function curConv() {
    var S = window.__ENDF__ && window.__ENDF__.S;
    if (!S) return null;
    return (S.convs || []).filter(function (c) { return c.id === S.activeId; })[0] || null;
  }

  function adoptText(text) {
    var pid = D.D.activeProject;
    if (!pid) { promptNewProject(); return; }
    if (!ui.chapterId || !D.getChapter(ui.chapterId)) {
      var chs = allChapters(pid);
      if (!chs.length) { toast('先建一章再采纳'); return; }
      ui.chapterId = chs[0].id;
    }
    var c = D.getChapter(ui.chapterId);
    var add = String(text || '').trim();
    if (!add) return;

    confirmBox('把这段追加到「' + c.title + '」的正文末尾？', function () {
      D.saveChapterContent(c.id, (c.content ? c.content + '\n\n' : '') + add, 'AI 采纳前');
      renderTree(); renderEditor(); renderGoalChip();
      toast('已采纳到「' + c.title + '」');
    });
  }

  /* ---------- 对话快照（防止「重生成」把旧内容吃掉） ---------- */
  function snapConv(label) {
    var conv = curConv();
    if (!conv || !conv.msgs) return;
    conv.history = conv.history || [];
    conv.history.push({
      ts: Date.now(),
      label: label || '快照',
      msgs: JSON.parse(JSON.stringify(conv.msgs))
    });
    if (conv.history.length > 8) conv.history.shift();
    try { window.__ENDF__ && window.__ENDF__.save && window.__ENDF__.save(); } catch (e) {}
  }

  function openConvHistory() {
    var conv = curConv();
    if (!conv) { toast('先打开一个对话'); return; }
    var list = conv.history || [];
    var html = '<div>';
    html += '<div class="tws-snap"><div class="tws-snap-t">当前对话</div>' +
      '<div class="tws-snap-m">' + (conv.msgs || []).length + ' 条</div></div>';
    if (!list.length) {
      html += '<p class="tws-p" style="margin-top:12px">还没有快照。点「重生成」或「编辑」之前会自动存一份。</p>';
    }
    list.slice().reverse().forEach(function (h) {
      var real = list.indexOf(h);
      html += '<div class="tws-snap" data-snap="' + real + '">' +
        '<div class="tws-snap-t">' + esc(h.label) + '</div>' +
        '<div class="tws-snap-m">' + h.msgs.length + ' 条 · ' + D.timeAgo(h.ts) + '</div>' +
        '</div>';
    });
    html += '</div>';
    var m = modal('对话历史', html, { footer: false });
    m.el.addEventListener('click', function (e) {
      var el = e.target.closest('[data-snap]');
      if (!el) return;
      var h = list[+el.getAttribute('data-snap')];
      if (!h) return;
      confirmBox('恢复到「' + h.label + '」（' + h.msgs.length + ' 条）？当前对话会先存一份快照。', function () {
        snapConv('恢复前');
        conv.msgs = JSON.parse(JSON.stringify(h.msgs));
        try {
          window.__ENDF__.save();
          window.__ENDF__.renderChat();
          window.__ENDF__.renderDrawer && window.__ENDF__.renderDrawer();
        } catch (err) {}
        m.close();
        toast('已恢复');
      });
    });
  }

  function injectAdoptButtons() {
    var chat = document.getElementById('chat');
    if (!chat) return;
    chat.querySelectorAll('.msg.ai').forEach(function (el) {
      var act = el.querySelector('.msg-act');
      if (!act) return;
      var i = el.getAttribute('data-i');

      if (!act.querySelector('.tws-adopt')) {
        var btn = document.createElement('button');
        btn.className = 'tws-adopt';
        btn.textContent = '采纳到本章';
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var conv = curConv();
          var m = conv && conv.msgs && conv.msgs[+i];
          adoptText(m ? m.c : (el.querySelector('.ans') || {}).textContent);
        });
        act.insertBefore(btn, act.firstChild);
      }

      if (!act.querySelector('.tws-hist')) {
        var hb = document.createElement('button');
        hb.className = 'tws-hist';
        hb.textContent = '历史版本';
        hb.addEventListener('click', function (e) {
          e.stopPropagation();
          openConvHistory();
        });
        var adoptEl = act.querySelector('.tws-adopt');
        act.insertBefore(hb, adoptEl ? adoptEl.nextSibling : act.firstChild);
      }
    });
  }

  function watchChat() {
    var chat = document.getElementById('chat');
    if (!chat) return;
    injectAdoptButtons();
    var mo = new MutationObserver(function () { injectAdoptButtons(); });
    mo.observe(chat, { childList: true, subtree: true });
  }

  /* ============================================================
     导航入口
     ============================================================ */
  function railBtn(id, label, num, svgPath) {
    var b = document.createElement('button');
    b.className = 'rail-btn';
    b.id = id;
    b.title = label;
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">' + svgPath + '</svg>' +
      '<span>' + label + '</span><small>' + num + '</small>';
    return b;   /* 点击由调用方绑定，避免重复触发 */
  }

  function addNav() {
    var rail = document.querySelector('.rail');
    if (!rail || document.getElementById('railBook')) return;

    var defs = [
      ['railBook', '书稿', '04', '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v18H6.5A2.5 2.5 0 0 0 4 23z"/><path d="M8 7h7M8 11h7"/>', 'v-book'],
      ['railLore', '设定库', '05', '<path d="M4 6h16M4 12h16M4 18h10"/><circle cx="19" cy="18" r="2"/>', 'v-lore'],
      ['railThreads', '伏笔', '06', '<circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="18" r="2.2"/><path d="M6 8.2V18h9.8"/>', 'v-threads']
    ];

    var cfg = rail.querySelector('.rail-btn[data-go="v-cfg"]');
    defs.forEach(function (d) {
      var b = railBtn(d[0], d[1], d[2], d[3]);
      b.dataset.go = d[4];
      b.onclick = function () { window.showView(d[4]); };
      if (cfg && cfg.parentNode === rail) rail.insertBefore(b, cfg);
      else rail.appendChild(b);
    });

    // 协作室入口：保留但提示未上线
    var soon = railBtn('railSoon', '协作室', '07',
      '<path d="M21 11.5a8 8 0 0 1-8 8H7l-4 3v-11a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z"/>');
    soon.onclick = function () { toast('此功能暂未上线敬请期待'); };
    soon.dataset.go = '__soon';
    if (cfg && cfg.parentNode === rail) rail.insertBefore(soon, cfg);
    else rail.appendChild(soon);
  }

  /* 移动端：功能菜单里的入口由 mobile.html 处理，这里只补 toast 用的全局函数 */
  window.TWS_soon = function () { toast('此功能暂未上线敬请期待'); };
  T.lorePrompt = function () { return D.lorePrompt(); };
  T.snapConv = snapConv;

  /* ============================================================
     挂载
     ============================================================ */
  function mount() {
    if (ui.mounted) return;
    var stage = document.querySelector('.stage');
    if (!stage) return;

    D.load();

    // 插入三个视图（放在 stage 末尾）
    stage.insertAdjacentHTML('beforeend', BOOK_HTML + LORE_HTML + THREADS_HTML);
    ui.mounted = true;

    // 默认选中第一章
    var pid = D.D.activeProject;
    if (pid) {
      var chs = allChapters(pid);
      ui.chapterId = D.D.activeChapter && D.getChapter(D.D.activeChapter) ? D.D.activeChapter : (chs[0] && chs[0].id);
    }

    // 顶部按钮
    $('twsBtnNewCh').addEventListener('click', function () {
      var pid2 = D.D.activeProject;
      if (!pid2) { promptNewProject(); return; }
      var vols = D.listVolumes(pid2);
      promptNewChapter(vols[0] && vols[0].id);
    });
    $('twsBtnExport').addEventListener('click', function () {
      // 长按/右键走 txt，点击走 docx 面板
      openExport();
    });
    $('twsBtnExport').addEventListener('contextmenu', function (e) { e.preventDefault(); exportTxt(); });
    $('twsGoalChip').addEventListener('click', openStats);

    $('twsBtnNewCard').addEventListener('click', function () { promptCard(null); });
    $('twsBtnNewThread').addEventListener('click', function () {
      if (ui.tab === 'thread') promptThread(); else promptEvent();
    });

    // Tab 与卡片点击（委托）
    document.getElementById('twsLoreTabs').addEventListener('click', function (e) {
      var c = e.target.closest('[data-kind]');
      if (!c) return;
      ui.kind = c.getAttribute('data-kind');
      renderLore();
    });
    document.getElementById('twsThreadTabs').addEventListener('click', function (e) {
      var c = e.target.closest('[data-tab]');
      if (!c) return;
      ui.tab = c.getAttribute('data-tab');
      renderThreads();
    });
    document.getElementById('twsCards').addEventListener('click', function (e) {
      var sw = e.target.closest('[data-on]');
      if (sw) {
        e.stopPropagation();
        var v = D.toggleCard(sw.getAttribute('data-on'));
        sw.classList.toggle('on', !!v);
        var cd = sw.closest('.tws-card'); if (cd) cd.classList.toggle('on', !!v);
        updateLoreHint();
        toast(v ? '已带上，会写进提示词' : '已取消带上');
        return;
      }
      var card = e.target.closest('[data-card]');
      if (card) {
        var c = D.D.cards.filter(function (x) { return x.id === card.getAttribute('data-card'); })[0];
        if (c) promptCard(c);
        return;
      }
      if (e.target.closest('[data-newcard]')) promptCard(null);
    });
    document.getElementById('twsThreadList').addEventListener('click', function (e) {
      var t = e.target.closest('[data-thread]');
      if (!t) return;
      var th = D.D.threads.filter(function (x) { return x.id === t.getAttribute('data-thread'); })[0];
      if (!th) return;
      var chs = allChapters(D.D.activeProject);
      modal('伏笔 · ' + th.name,
        (th.note ? '<p class="tws-p">' + esc(th.note) + '</p>' : '') +
        '<label class="tws-l">埋在哪一章</label><select class="tws-i" id="tPlant">' +
          '<option value="">（未指定）</option>' +
          chs.map(function (c) { return '<option value="' + c.id + '"' + (c.id === th.plantChapter ? ' selected' : '') + '>' + esc(c.title) + '</option>'; }).join('') +
        '</select>' +
        '<label class="tws-l">在哪一章回收</label><select class="tws-i" id="tPayoff">' +
          '<option value="">（未回收）</option>' +
          chs.map(function (c) { return '<option value="' + c.id + '"' + (c.id === th.payoffChapter ? ' selected' : '') + '>' + esc(c.title) + '</option>'; }).join('') +
        '</select>' +
        '<label class="tws-chk"><input type="checkbox" id="tDropped"' + (th.status === 'dropped' ? ' checked' : '') + '> 标记为已废弃</label>',
        {
          okText: '保存',
          onOk: function (w) {
            var pay = w.querySelector('#tPayoff').value;
            D.updateThread(th.id, {
              plantChapter: w.querySelector('#tPlant').value,
              payoffChapter: pay,
              status: w.querySelector('#tDropped').checked ? 'dropped' : (pay ? 'done' : 'open')
            });
            renderThreads(); toast('已保存');
          }
        });
      var del = document.createElement('button');
      del.className = 'tws-btn ghost';
      del.textContent = '删除这条';
      del.style.marginTop = '12px';
      del.addEventListener('click', function () {
        D.removeThread(th.id); renderThreads(); toast('已删除');
        document.querySelectorAll('.tws-modal-wrap').forEach(function (w) { w.remove(); });
      });
      document.querySelector('.tws-modal-b').appendChild(del);
    });

    // 模板入口：挂在输入框上方（对话视图）
    addTemplateEntry();
    addChapterChip();
    watchChat();
    addNav();

    // 首次渲染
    renderTree(); renderLore(); renderThreads(); renderGoalChip();

    // 切到新视图时重渲染（数据可能已变）
    var origShow = window.showView;
    window.showView = function (id) {
      origShow(id);
      if (id === 'v-book') { renderTree(); renderGoalChip(); }
      if (id === 'v-lore') renderLore();
      if (id === 'v-threads') renderThreads();
    };
  }


  /* ---------- 对话视图头部的章节切换器 ---------- */
  function updateChapterChip() {
    var el = document.getElementById('twsChapterChip');
    if (!el) return;
    var c = ui.chapterId && D.getChapter(ui.chapterId);
    el.textContent = c ? c.title : '未选择章节';
    el.classList.toggle('on', !!c);
  }

  function openChapterPicker() {
    var pid = D.D.activeProject;
    if (!pid) { toast('先建一部作品'); return; }
    var chs = allChapters(pid);
    if (!chs.length) { toast('还没有章节'); return; }
    var html = '<div>';
    chs.forEach(function (c) {
      html += '<div class="tws-snap' + (c.id === ui.chapterId ? ' on' : '') + '" data-pick="' + c.id + '">' +
        '<div class="tws-snap-t">' + esc(c.title) + '</div>' +
        '<div class="tws-snap-m">' + T.exporters.statusName(c.status) + ' · ' + (c.words || 0) + ' 字</div>' +
        '</div>';
    });
    html += '</div>';
    var m = modal('切换到哪一章', html, { footer: false });
    m.el.addEventListener('click', function (e) {
      var el = e.target.closest('[data-pick]');
      if (!el) return;
      var id = el.getAttribute('data-pick');
      openChapter(id);
      updateChapterChip();
      m.close();
      var c = D.getChapter(id);
      toast('已切到「' + (c ? c.title : '') + '」');
    });
  }

  function addChapterChip() {
    var right = document.querySelector('#v-chat .sec-right');
    if (!right || document.getElementById('twsChapterChip')) return;
    var chip = document.createElement('span');
    chip.className = 'chip tws-ch-chip';
    chip.id = 'twsChapterChip';
    chip.title = '当前章节 · 点击切换';
    chip.addEventListener('click', openChapterPicker);
    right.insertBefore(chip, right.firstChild);
    updateChapterChip();
  }

  function addTemplateEntry() {
    var ctx = document.getElementById('ctx') || document.querySelector('.composer-meta') || document.querySelector('.composer');
    if (!ctx || document.getElementById('twsBtnTpl')) return;
    var btn = document.createElement('button');
    btn.id = 'twsBtnTpl';
    btn.className = 'tws-tpl-btn';
    btn.type = 'button';
    btn.textContent = '模板';
    btn.title = '用模板开写';
    btn.addEventListener('click', openTemplate);
    ctx.appendChild(btn);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
