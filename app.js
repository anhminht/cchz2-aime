// CeceHanzi v2 — online-first vanilla JS client.
// Data sources:
//   - /data/hanzi.json          static (built by Aime update-app flow)
//   - /api/progress             D1 (learning state, last-open)
//   - /api/vault                D1 (word vault CRUD)
//   - /api/ai                   AI proxy (server-side key)
//   - /vault-images/:id         R2 presigned through Worker (auth by Cloudflare Access)
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const state = {
    tab: 'home',
    DATA: [],
    VAULT: [],
    progress: { currentSession: '', cardIndex: 0, lastOpen: null },
    loading: true
  };

  const COMP_COLORS = ['#C81E64', '#1D4ED8', '#B93A0A', '#137A38', '#6D28D9'];
  const COMP_BG = ['rgba(200,30,100,0.09)', 'rgba(29,78,216,0.09)', 'rgba(185,58,10,0.09)', 'rgba(19,122,56,0.09)', 'rgba(109,40,217,0.09)'];

  // ---------- Boot ----------
  async function boot() {
    try {
      const [hanziRes, vaultRes, progRes] = await Promise.all([
        fetch('/data/hanzi.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : []),
        fetch('/api/vault', { cache: 'no-cache' }).then(r => r.ok ? r.json() : { items: [] }).then(j => j.items || []),
        fetch('/api/progress', { cache: 'no-cache' }).then(r => r.ok ? r.json() : {}).then(j => ({
          currentSession: j.currentSession || '',
          cardIndex: +(j.cardIndex || 0),
          lastOpen: j.lastOpen || null
        })).catch(() => ({ currentSession: '', cardIndex: 0, lastOpen: null }))
      ]);
      state.DATA = hanziRes;
      state.VAULT = vaultRes;
      state.progress = progRes;
      // Record last-open time for greeting logic
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lastOpen: Date.now() })
      }).catch(() => {});
    } catch (e) {
      console.warn('[cchz] boot failed, showing empty shell', e);
    } finally {
      state.loading = false;
      render();
    }
  }

  // ---------- Helpers ----------
  function getLatestSession() {
    if (state.progress.currentSession) return state.progress.currentSession;
    let latest = '';
    state.DATA.forEach(d => { if (d.session && d.session > latest) latest = d.session; });
    return latest;
  }

  function getProgressSummary() {
    const sid = getLatestSession();
    if (!sid) return { session: '', done: 0, total: state.DATA.length, char: '?' };
    const cards = state.DATA.filter(d => d.session === sid);
    return { session: sid, done: state.progress.cardIndex || 0, total: cards.length || 10, char: cards[0] ? cards[0].hanzi : '?' };
  }

  function getVaultRecent(n = 3) { return state.VAULT.slice(-n).reverse(); }

  function getGreeting() {
    const now = new Date();
    const h = now.getHours();
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dateLabel = `${dayNames[now.getDay()]}, ${now.getDate()} tháng ${now.getMonth() + 1}`;

    let pinyin, hanzi, cece;
    if (h >= 5 && h < 11) { pinyin = 'zǎo shàng hǎo'; hanzi = '早上好'; cece = 'Cece ！'; }
    else if (h >= 11 && h < 14) { pinyin = 'zhōng wǔ hǎo'; hanzi = '中午好'; cece = 'Cece ！'; }
    else if (h >= 14 && h < 18) { pinyin = 'xià wǔ hǎo'; hanzi = '下午好'; cece = 'Cece ！'; }
    else if (h >= 18 && h < 22) { pinyin = 'wǎn shàng hǎo'; hanzi = '晚上好'; cece = 'Cece ！'; }
    else { pinyin = 'hái méi shuì ma'; hanzi = '还没睡吗'; cece = 'Cece ？'; }

    // Welcome-back if last open > 3 days ago
    if (state.progress.lastOpen) {
      const days = Math.floor((now.getTime() - state.progress.lastOpen) / 86400000);
      if (days >= 7) { pinyin = 'hǎo jiǔ bú jiàn'; hanzi = '好久不见'; cece = 'Cece ！'; }
      else if (days >= 2) { pinyin = 'huān yíng huí lái'; hanzi = '欢迎回来'; cece = 'Cece ！'; }
    }

    return { dateLabel, pinyin, hanzi, ceceLine: cece };
  }

  // ---------- Renders ----------
  function renderHome() {
    if (state.loading) {
      return `<div class="safe-top-pad px-5"><div class="eyebrow">Đang tải…</div></div>`;
    }
    const g = getGreeting();
    const prog = getProgressSummary();
    const recent = getVaultRecent(3);
    const totalVault = state.VAULT.length;
    const totalChars = state.DATA.length;
    return `
    <div class="safe-top-pad px-5">
      <div class="flex items-start justify-between">
        <div class="logo-mark">
          <span class="badge han">字</span>
          <span class="wordmark"><span class="ce">CECE</span> <span class="hz">HANZI</span></span>
        </div>
        <div class="text-right">
          <div class="eyebrow" style="opacity:.8">${esc(g.dateLabel)}</div>
        </div>
      </div>

      <div class="mt-8">
        <div class="label-num">${esc(g.pinyin)}</div>
        <div class="hero-han">
          ${esc(g.hanzi)}，<br/>
          <span class="name">${esc(g.ceceLine.replace(/[！？]/g, ''))}</span>${g.ceceLine.includes('？') ? '？' : '！'}
        </div>
      </div>

      <section class="mt-8">
        <div class="eyebrow">Học</div>
        <button class="soft-card mt-3 w-full text-left flex items-center gap-3" data-go="learn" style="background: rgba(255,255,255,0.98); color:#1B1650;">
          <div style="width:52px;height:52px;border-radius:18px;background:#F3EEFF;display:flex;align-items:center;justify-content:center;color:#6353E0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <div class="flex-1">
            <div style="font-weight:500; font-size:18px;">Học tiếp</div>
            <div style="font-weight:300; font-size:14px; color:#57517F; margin-top:2px;">Thẻ ${esc(prog.char)} · ${prog.done}/${prog.total} · đợt ${esc(prog.session || '—')}</div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>

        <button class="soft-card mt-3 w-full text-left flex items-center gap-3" data-go="radical" style="background:transparent;">
          <div style="width:52px;height:52px;border-radius:18px;background:rgba(255,255,255,0.14);display:flex;align-items:center;justify-content:center;color:#fff;">
            <span class="han" style="font-size:26px;font-weight:500;">木</span>
          </div>
          <div class="flex-1">
            <div style="font-weight:500; font-size:18px;">Xem bộ thủ</div>
            <div style="font-weight:300; font-size:14px; opacity:.8; margin-top:2px;">${totalChars} thẻ đã học</div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>
      </section>

      <section class="mt-8">
        <div class="flex items-center justify-between">
          <div class="eyebrow">Kho từ</div>
        </div>
        <div class="soft-card mt-3" style="padding:0; overflow:hidden;">
          <button class="w-full text-left flex items-center gap-3 p-5" data-go="vault-add" style="border-bottom:1px solid rgba(255,255,255,0.15);">
            <div style="width:52px;height:52px;border-radius:18px;background:rgba(255,255,255,0.14);display:flex;align-items:center;justify-content:center;color:#fff;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M9 4.1c-2.3.2-4 2-4 4.2-.6.4-1 1-1.3 1.8C2.6 10.8 2 12 2 13.3c0 1.8 1 3.2 2.5 3.9.4 1.9 2 3.3 4 3.3 1.2 0 2.2-.5 2.9-1.3l.1-.2V5.7l-.2-.2c-.6-.7-1.4-1.2-2.3-1.4zm6.1 0c-.9.2-1.7.7-2.4 1.4l-.2.2v13.3l.2.2c.7.8 1.7 1.3 2.8 1.3 2 0 3.7-1.4 4-3.3 1.5-.7 2.5-2.1 2.5-3.9 0-1.3-.6-2.5-1.7-3.2-.3-.8-.8-1.5-1.4-1.9 0-2.2-1.8-4-4-4.1z"/></svg>
            </div>
            <div class="flex-1">
              <div style="font-weight:500; font-size:18px;">Thêm từ vào kho</div>
              <div style="font-weight:300; font-size:14px; opacity:.8; margin-top:2px;">Ảnh chụp hoặc chữ vừa gặp</div>
            </div>
            <div style="width:42px;height:42px;border-radius:999px;background:#fff;color:#1B1650;display:flex;align-items:center;justify-content:center;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>
            </div>
          </button>
          <div class="p-5">
            <div class="flex items-center justify-between">
              <div style="font-weight:500; font-size:15px; letter-spacing:.02em; text-transform:uppercase;">Mới thêm</div>
              <button class="flex items-center gap-1 text-sm" data-go="vault" style="opacity:.85;">
                Xem ${totalVault} từ
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
            <div class="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
              ${recent.length
                ? recent.map(w => `
                  <button class="pill" style="background:rgba(255,255,255,0.14); font-size:16px; height:42px; padding:0 16px;">
                    <span class="han" style="font-weight:500;">${esc(w.hanzi || '?')}</span>
                  </button>`).join('')
                : `<div style="opacity:.7; font-size:14px;">Chưa có từ nào trong kho.</div>`
              }
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
  }

  function renderLearnPlaceholder() {
    return `<div class="safe-top-pad px-5"><div class="eyebrow">Thẻ học</div><div class="hero-han mt-3">Coming<br/>soon.</div><p style="opacity:.8; margin-top:14px; font-weight:300;">Pha 2 sẽ restyle Card/Grid + Pinyin + filter + tiến độ lưu D1.</p></div>`;
  }
  function renderRadicalPlaceholder() {
    return `<div class="safe-top-pad px-5"><div class="eyebrow">Bộ thủ</div><div class="hero-han mt-3">117 bộ<br/>Khang Hy.</div></div>`;
  }
  function renderVaultPlaceholder() {
    return `<div class="safe-top-pad px-5"><div class="eyebrow">Kho từ</div><div class="hero-han mt-3">${state.VAULT.length} từ<br/>trong kho.</div></div>`;
  }

  function render() {
    const host = $('#view-host');
    let html = '';
    switch (state.tab) {
      case 'home': html = renderHome(); break;
      case 'learn': html = renderLearnPlaceholder(); break;
      case 'radical': html = renderRadicalPlaceholder(); break;
      case 'vault': html = renderVaultPlaceholder(); break;
    }
    host.innerHTML = html;
    $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === state.tab));
    $$('[data-go]', host).forEach(el => el.addEventListener('click', () => {
      state.tab = el.dataset.go === 'vault-add' ? 'vault' : el.dataset.go;
      render();
    }));
  }

  $$('.tab-btn').forEach(b => b.addEventListener('click', () => {
    state.tab = b.dataset.tab;
    render();
  }));

  boot();
  window.__CCHZ = { state };
})();
