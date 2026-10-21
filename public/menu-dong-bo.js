// Loading chung cho thao tác có gọi API: hiển thị ngay trên nút đang bấm.
(function() {
  if (window.__loadingNutDaKhoiTao) return;
  window.__loadingNutDaKhoiTao = true;
  const style = document.createElement('style');
  style.textContent = 'button.nut-dang-tai,input.nut-dang-tai{opacity:.82;cursor:wait!important;pointer-events:none}button.nut-dang-tai:before{content:"";display:inline-block;width:11px;height:11px;margin-right:7px;vertical-align:-1px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:nutDangTaiSpin .7s linear infinite}@keyframes nutDangTaiSpin{to{transform:rotate(360deg)}}';
  document.head.appendChild(style);
  const fetchGoc = window.fetch.bind(window);
  let nutDangXuLy = null;
  let soRequest = 0;
  let timerKhoiPhuc = null;
  let timerChoRequest = null;

  function nhanDangXuLy(nut) {
    if (!nut || nut.dataset.loadingNut === '1') return;
    if (nutDangXuLy && nutDangXuLy !== nut) khoiPhuc(nutDangXuLy);
    nutDangXuLy = nut;
    nut.dataset.loadingNut = '1';
    nut.dataset.loadingNutText = nut.tagName === 'INPUT' ? nut.value : nut.innerHTML;
    const text = String(nut.tagName === 'INPUT' ? nut.dataset.loadingNutText : nut.textContent).trim();
    let loading = 'Đang xử lý...';
    if (/soạn.*jd|jd.*soạn|soạn bản mô tả/i.test(text)) loading = 'Đang soạn JD...';
    else if (/ai đặt câu hỏi|đặt câu hỏi|tạo câu hỏi/i.test(text)) loading = 'AI đang tạo câu hỏi...';
    else if (/sửa.*ai|ai.*chỉnh/i.test(text)) loading = 'AI đang chỉnh sửa...';
    else if (/gửi.*(duyệt|câu hỏi)|gửi câu hỏi/i.test(text)) loading = 'Đang gửi...';
    else if (/lưu|cập nhật|tạo mới|thêm mới|xác nhận/i.test(text)) loading = 'Đang lưu...';
    else if (/xóa|xoá/i.test(text)) loading = 'Đang xóa...';
    else if (/phân tích|chấm điểm|đánh giá/i.test(text)) loading = 'Đang phân tích...';
    nut.disabled = true;
    nut.classList.add('nut-dang-tai');
    if (nut.tagName === 'INPUT') nut.value = loading;
    else nut.textContent = loading;
    clearTimeout(timerKhoiPhuc);
    clearTimeout(timerChoRequest);
    timerChoRequest = setTimeout(() => { if (soRequest === 0) khoiPhuc(nut); }, 400);
  }

  function khoiPhuc(nut) {
    if (!nut || nut.dataset.loadingNut !== '1') return;
    if (nut.tagName === 'INPUT') nut.value = nut.dataset.loadingNutText || '';
    else nut.innerHTML = nut.dataset.loadingNutText || '';
    nut.disabled = false;
    nut.classList.remove('nut-dang-tai');
    delete nut.dataset.loadingNut;
    delete nut.dataset.loadingNutText;
    if (nutDangXuLy === nut) nutDangXuLy = null;
  }

  document.addEventListener('click', event => {
    const nut = event.target.closest('button, input[type="button"], input[type="submit"]');
    if (!nut || nut.disabled || nut.type === 'submit') return;
    const label = String(nut.tagName === 'INPUT' ? nut.value : nut.textContent).trim();
    if (!/(lưu|cập nhật|xóa|xoá|gửi|duyệt|soạn|sửa.*ai|ai.*sửa|phân tích|chấm điểm|đánh giá|đăng nhập|đổi mật khẩu|làm mới|tải lên|upload|import|xuất|đánh dấu|xác nhận|tiếp tục|đồng bộ|quét|chạy thử|ai đặt câu hỏi|đặt câu hỏi|tạo câu hỏi)/i.test(label)) return;
    nhanDangXuLy(nut);
  }, true);

  document.addEventListener('submit', event => {
    const form = event.target;
    const nut = event.submitter || form.querySelector('button[type="submit"], button:not([type]), input[type="submit"]');
    if (nut && !nut.disabled) nhanDangXuLy(nut);
  }, true);

  window.fetch = function(...args) {
    const nut = nutDangXuLy;
    const coNut = nut && nut.dataset.loadingNut === '1';
    if (coNut) {
      soRequest++;
      clearTimeout(timerChoRequest);
      clearTimeout(timerKhoiPhuc);
    }
    return fetchGoc(...args).finally(() => {
      if (!coNut) return;
      soRequest = Math.max(0, soRequest - 1);
      clearTimeout(timerKhoiPhuc);
      timerKhoiPhuc = setTimeout(() => {
        if (soRequest === 0) khoiPhuc(nut);
      }, 350);
    });
  };
})();

(function() {
  const path = window.location.pathname.replace(/\/$/, '');
  document.querySelectorAll('[data-menu-path]').forEach(a => {
    const target = a.getAttribute('data-menu-path');
    a.classList.toggle('active', path === target);
    if (path === target) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });

  // Tạm thời ẩn các module chưa sử dụng theo yêu cầu; không xóa phần mã nguồn.
  document.querySelectorAll('.menu-list a[data-menu-path]').forEach(link => {
    const target = link.getAttribute('data-menu-path') || '';
    if (/\/(ung-vien|cv|phong-van|danh-gia|quyet-dinh|thong-bao|nguoi-dung)\//.test(target)) link.style.display = 'none';
  });

  const user = (() => { try { return JSON.parse(localStorage.getItem('nguoi_dung') || 'null'); } catch { return null; } })();
  const role = String(user?.vai_tro || user?.role || '').toLowerCase();
  const userLink = document.querySelector('[data-menu-path="/nguoi-dung/nguoi-dung.html"]');
  if (userLink && role && !['admin', 'quan_tri', 'quan_tri_vien', 'administrator'].includes(role)) userLink.style.display = 'none';

  // Dashboard giữ nguyên cụm điều khiển gốc; các trang còn lại dùng đúng một cụm dùng chung.
  if (path.includes('/login/')) return;
  if (path === '/dashboard/dashboard.html') {
    // Dashboard đã có chuông, Hỏi AI và menu tài khoản cùng các modal xử lý riêng.
    const params = new URLSearchParams(window.location.search);
    if (params.has('account')) {
      params.delete('account');
      history.replaceState({}, '', window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash);
    }
    return;
  }

  const header = document.querySelector('.topbar, .top, header');
  if (!header) return;

  // Ẩn các nút giao diện cũ để tránh icon trùng, KHÔNG xóa DOM vì JS của từng trang
  // vẫn cần các phần tử này để gắn sự kiện và khởi tạo dữ liệu.
  header.querySelectorAll('#btnHoiAI, .nut-ai, .cv-ai-top-btn, .cv-notification-btn, [id^="btnThongBao"], .thong-bao-wrap, .nut-chuong, .tai-khoan, #taiKhoan').forEach(el => {
    el.style.setProperty('display', 'none', 'important');
    el.setAttribute('aria-hidden', 'true');
  });
  header.querySelectorAll('.cv-top-actions').forEach(el => { if (!el.children.length) el.style.display = 'none'; });
  // Giữ các phần tử tài khoản trong DOM nhưng ẩn phần hiển thị cũ.
  header.querySelectorAll('.topbar-actions .avatar, .topbar-actions .user-meta, .top-actions .avatar, .top-actions .user-meta, .header-actions .avatar, .header-actions .user-meta').forEach(el => {
    el.style.setProperty('display', 'none', 'important');
    el.setAttribute('aria-hidden', 'true');
  });
  let actions = header.querySelector('.topbar-actions, .top-actions, .actions, .header-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'shared-dashboard-actions';
    header.appendChild(actions);
  } else {
    actions.classList.add('shared-dashboard-actions');
  }

  const account = (() => { try { return JSON.parse(localStorage.getItem('nguoi_dung') || 'null') || {}; } catch { return {}; } })();
  const accountName = account.ho_ten || account.ten || account.username || account.email || 'Tài khoản';
  const accountRole = ({ admin: 'Quản trị viên', manager: 'Quản lý', hr: 'Nhân sự', interviewer: 'Người phỏng vấn', viewer: 'Người xem' })[String(account.vai_tro || account.role || '').toLowerCase()] || 'Tài khoản';

  const bellWrap = document.createElement('div');
  bellWrap.className = 'shared-bell-wrap';
  bellWrap.innerHTML = '<button type="button" class="shared-bell-btn" title="Thông báo" aria-label="Thông báo" aria-expanded="false"><span aria-hidden="true">🔔</span><span class="shared-bell-count" hidden></span></button><div class="shared-notification-panel" hidden><div class="shared-notification-heading"><strong>Thông báo</strong><span>Cập nhật ứng viên gần đây</span></div><div class="shared-notification-list"><p class="shared-notification-empty">Đang tải thông báo...</p></div></div>';
  actions.appendChild(bellWrap);
  const bell = bellWrap.querySelector('.shared-bell-btn');
  const notificationPanel = bellWrap.querySelector('.shared-notification-panel');
  let notifications = [];
  const notificationStorageKey = `thong_bao_da_xem_${account.id || account.email || 'nguoi_dung'}`;
  bell.addEventListener('click', async event => {
    event.stopPropagation();
    const opening = notificationPanel.hidden;
    notificationPanel.hidden = !opening;
    bell.setAttribute('aria-expanded', String(opening));
    if (opening) {
      await loadNotifications();
      try {
        const seen = new Set(JSON.parse(localStorage.getItem(notificationStorageKey) || '[]'));
        notifications.forEach(item => seen.add(notificationKey(item)));
        localStorage.setItem(notificationStorageKey, JSON.stringify([...seen].slice(-100)));
      } catch { }
      updateNotificationBadge();
    }
  });
  notificationPanel.addEventListener('click', event => event.stopPropagation());
  loadNotifications();

  const ai = document.createElement('button');
  ai.type = 'button'; ai.className = 'shared-ai-btn'; ai.innerHTML = '<span aria-hidden="true">✦</span><span>Hỏi AI</span>';
  ai.addEventListener('click', openAI); actions.appendChild(ai);

  const wrap = document.createElement('div');
  wrap.className = 'shared-account-wrap';
  wrap.innerHTML = '<button type="button" class="shared-account-btn" aria-label="Mở menu tài khoản" aria-expanded="false"><span class="shared-account-avatar">' + escapeHtml(accountName.trim().charAt(0).toUpperCase() || 'U') + '</span><span class="shared-account-label"><strong>' + escapeHtml(accountName) + '</strong><small>' + escapeHtml(accountRole) + '</small></span><span aria-hidden="true">▾</span></button><div class="shared-account-menu" hidden><div class="shared-account-summary"><strong>' + escapeHtml(accountName) + '</strong><small>' + escapeHtml(account.email || '') + '</small></div><button type="button" data-account-action="info">👤 Thông tin tài khoản</button><button type="button" data-account-action="password">🔑 Đổi mật khẩu</button><button type="button" class="shared-account-logout">↪ Đăng xuất</button></div>';
  actions.appendChild(wrap);
  const toggle = wrap.querySelector('.shared-account-btn');
  const menu = wrap.querySelector('.shared-account-menu');
  toggle.addEventListener('click', event => { event.stopPropagation(); const opening = menu.hidden; menu.hidden = !opening; toggle.setAttribute('aria-expanded', String(opening)); });
  menu.addEventListener('click', event => event.stopPropagation());
  document.addEventListener('click', () => { menu.hidden = true; toggle.setAttribute('aria-expanded', 'false'); notificationPanel.hidden = true; bell.setAttribute('aria-expanded', 'false'); });
  menu.querySelector('[data-account-action="info"]').addEventListener('click', () => { menu.hidden = true; moTaiKhoan('info'); });
  menu.querySelector('[data-account-action="password"]').addEventListener('click', () => { menu.hidden = true; moTaiKhoan('password'); });
  wrap.querySelector('.shared-account-logout').addEventListener('click', () => { localStorage.removeItem('token'); localStorage.removeItem('nguoi_dung'); window.location.href = '/login/login.html'; });

  if (!document.getElementById('sharedAccountModal')) createAccountModals();
  if (!document.getElementById('sharedAiOverlay')) createSharedAIModal();

  async function loadNotifications() {
    const list = bellWrap.querySelector('.shared-notification-list');
    try {
      const response = await fetch('/api/dashboard?period=all', { headers: { Authorization: 'Bearer ' + (localStorage.getItem('token') || '') } });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) { list.innerHTML = '<p class="shared-notification-empty">Phiên đăng nhập đã hết hạn.</p>'; return; }
      if (!response.ok) throw new Error(data.message || 'Không tải được thông báo.');
      notifications = Array.isArray(data.thong_bao) ? data.thong_bao : [];
      list.replaceChildren();
      if (!notifications.length) {
        const empty = document.createElement('p'); empty.className = 'shared-notification-empty'; empty.textContent = 'Chưa có cập nhật ứng viên gần đây.'; list.appendChild(empty);
      } else {
        notifications.forEach(item => {
          const row = document.createElement('article'); row.className = 'shared-notification-item';
          const title = document.createElement('strong');
          title.textContent = item.loai === 'updated' ? `${item.ho_ten || 'Ứng viên'} có hồ sơ vừa được cập nhật` : `${item.ho_ten || 'Ứng viên'} vừa được thêm`;
          const time = document.createElement('span');
          const date = new Date(String(item.thoi_gian || '').replace(' ', 'T'));
          time.textContent = Number.isNaN(date.getTime()) ? '' : date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
          row.append(title, time); list.appendChild(row);
        });
      }
      updateNotificationBadge();
    } catch (error) {
      list.innerHTML = ''; const empty = document.createElement('p'); empty.className = 'shared-notification-empty'; empty.textContent = error.message || 'Không thể tải thông báo.'; list.appendChild(empty);
    }
  }
  function notificationKey(item) { return `${item.id}:${item.loai}:${item.thoi_gian}`; }
  function updateNotificationBadge() {
    const badge = bellWrap.querySelector('.shared-bell-count');
    let seen = [];
    try { seen = JSON.parse(localStorage.getItem(notificationStorageKey) || '[]'); } catch { }
    const unseen = notifications.filter(item => !seen.includes(notificationKey(item))).length;
    badge.textContent = unseen > 9 ? '9+' : String(unseen);
    badge.hidden = unseen === 0;
  }

  function moTaiKhoan(kind) {
    const modal = document.getElementById('sharedAccountModal');
    modal.querySelectorAll('[data-account-panel]').forEach(panel => panel.hidden = panel.dataset.accountPanel !== kind);
    modal.classList.add('open');
    if (kind === 'info') loadAccountInfo();
    else { modal.querySelector('#sharedPasswordForm').reset(); setAccountMessage('password', ''); }
  }
  function dongTaiKhoan() { document.getElementById('sharedAccountModal')?.classList.remove('open'); }
  function createAccountModals() {
    const modal = document.createElement('div'); modal.id = 'sharedAccountModal'; modal.className = 'shared-account-overlay';
    modal.innerHTML = '<section class="shared-account-dialog" role="dialog" aria-modal="true"><button type="button" class="shared-modal-close" aria-label="Đóng">×</button><div data-account-panel="info"><h2>Thông tin tài khoản</h2><p>Cập nhật thông tin ngay tại trang hiện tại.</p><form id="sharedInfoForm"><label>Họ và tên<input id="sharedInfoName" required maxlength="150"></label><label>Email<input id="sharedInfoEmail" type="email" required maxlength="190"></label><label>Vai trò<input id="sharedInfoRole" readonly></label><p class="shared-account-message" id="sharedInfoMessage" role="status"></p><div class="shared-modal-actions"><button type="button" class="shared-modal-cancel">Hủy</button><button type="submit">Lưu thay đổi</button></div></form></div><div data-account-panel="password" hidden><h2>Đổi mật khẩu</h2><p>Cập nhật mật khẩu đăng nhập.</p><form id="sharedPasswordForm"><label>Mật khẩu hiện tại<input id="sharedOldPassword" type="password" required autocomplete="current-password"></label><label>Mật khẩu mới<input id="sharedNewPassword" type="password" required minlength="6" autocomplete="new-password"></label><label>Xác nhận mật khẩu mới<input id="sharedConfirmPassword" type="password" required minlength="6" autocomplete="new-password"></label><p class="shared-account-message" id="sharedPasswordMessage" role="status"></p><div class="shared-modal-actions"><button type="button" class="shared-modal-cancel">Hủy</button><button type="submit">Đổi mật khẩu</button></div></form></div></section>';
    document.body.appendChild(modal);
    modal.querySelector('.shared-modal-close').addEventListener('click', dongTaiKhoan);
    modal.querySelectorAll('.shared-modal-cancel').forEach(btn => btn.addEventListener('click', dongTaiKhoan));
    modal.addEventListener('click', e => { if (e.target === modal) dongTaiKhoan(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { dongTaiKhoan(); closeAI(); } });
    modal.querySelector('#sharedInfoForm').addEventListener('submit', saveAccountInfo);
    modal.querySelector('#sharedPasswordForm').addEventListener('submit', saveAccountPassword);
  }
  function setAccountMessage(kind, message, success = false) {
    const el = document.getElementById(kind === 'info' ? 'sharedInfoMessage' : 'sharedPasswordMessage');
    if (el) { el.textContent = message; el.classList.toggle('success', success); }
  }
  async function accountRequest(url, options = {}) {
    const token = localStorage.getItem('token');
    const response = await fetch(url, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) { localStorage.removeItem('token'); localStorage.removeItem('nguoi_dung'); window.location.href = '/login/login.html'; throw new Error('Phiên đăng nhập đã hết hạn.'); }
    if (!response.ok) throw new Error(data.message || 'Không thể thực hiện yêu cầu.');
    return data;
  }
  async function loadAccountInfo() {
    setAccountMessage('info', 'Đang tải thông tin...');
    try {
      const data = await accountRequest('/api/tai-khoan');
      document.getElementById('sharedInfoName').value = data.ho_ten || '';
      document.getElementById('sharedInfoEmail').value = data.email || '';
      document.getElementById('sharedInfoRole').value = ({ admin: 'Quản trị viên', manager: 'Quản lý', hr: 'Nhân sự', interviewer: 'Người phỏng vấn', viewer: 'Người xem' })[data.vai_tro] || data.vai_tro || '';
      setAccountMessage('info', '');
    } catch (error) { setAccountMessage('info', error.message); }
  }
  async function saveAccountInfo(event) {
    event.preventDefault(); setAccountMessage('info', 'Đang lưu...');
    try {
      const data = await accountRequest('/api/tai-khoan', { method: 'PUT', body: JSON.stringify({ ho_ten: document.getElementById('sharedInfoName').value.trim(), email: document.getElementById('sharedInfoEmail').value.trim() }) });
      const updated = { ...account, ho_ten: document.getElementById('sharedInfoName').value.trim(), email: document.getElementById('sharedInfoEmail').value.trim() };
      localStorage.setItem('nguoi_dung', JSON.stringify(updated));
      wrap.querySelector('.shared-account-label strong').textContent = updated.ho_ten;
      wrap.querySelector('.shared-account-avatar').textContent = updated.ho_ten.charAt(0).toUpperCase();
      wrap.querySelector('.shared-account-summary strong').textContent = updated.ho_ten;
      wrap.querySelector('.shared-account-summary small').textContent = updated.email;
      setAccountMessage('info', data.message || 'Cập nhật thông tin thành công.', true);
    } catch (error) { setAccountMessage('info', error.message); }
  }
  async function saveAccountPassword(event) {
    event.preventDefault();
    const oldPassword = document.getElementById('sharedOldPassword').value;
    const newPassword = document.getElementById('sharedNewPassword').value;
    const confirmPassword = document.getElementById('sharedConfirmPassword').value;
    if (newPassword !== confirmPassword) return setAccountMessage('password', 'Mật khẩu xác nhận không khớp.');
    if (newPassword.length < 6) return setAccountMessage('password', 'Mật khẩu mới phải có ít nhất 6 ký tự.');
    setAccountMessage('password', 'Đang cập nhật...');
    try {
      const data = await accountRequest('/api/tai-khoan/mat-khau', { method: 'PUT', body: JSON.stringify({ mat_khau_cu: oldPassword, mat_khau_moi: newPassword }) });
      setAccountMessage('password', data.message || 'Đổi mật khẩu thành công.', true);
      document.getElementById('sharedPasswordForm').reset();
    } catch (error) { setAccountMessage('password', error.message); }
  }

  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

  // Những trang chưa có chatbot riêng dùng chung API Hỏi AI của Dashboard.
  if (!document.getElementById('sharedAiOverlay')) createSharedAIModal();

  function createSharedAIModal() {
    const overlay = document.createElement('div');
    overlay.className = 'shared-ai-overlay';
    overlay.id = 'sharedAiOverlay';
    overlay.innerHTML = '<section class="shared-ai-card" role="dialog" aria-modal="true" aria-labelledby="sharedAiTitle">' +
      '<div class="shared-ai-head"><div><h2 id="sharedAiTitle">Trợ lý tuyển dụng AI</h2><p>Đặt câu hỏi về tuyển dụng, phỏng vấn hoặc xây dựng JD.</p></div><button class="shared-ai-close" type="button" aria-label="Đóng">×</button></div>' +
      '<div class="shared-ai-messages" id="sharedAiMessages" aria-live="polite"><p class="shared-ai-message">Xin chào! Tôi có thể hỗ trợ gì cho bạn hôm nay?</p></div>' +
      '<p class="shared-ai-error" id="sharedAiError" role="status"></p>' +
      '<form class="shared-ai-form" id="sharedAiForm"><textarea id="sharedAiInput" rows="2" maxlength="2000" placeholder="Nhập câu hỏi của bạn..." required></textarea><button type="submit">Gửi câu hỏi</button></form></section>';
    document.body.appendChild(overlay);
    overlay.querySelector('.shared-ai-close').addEventListener('click', closeAI);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeAI(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAI(); });
    overlay.querySelector('#sharedAiForm').addEventListener('submit', sendAI);
  }

  function openAI() {
    const overlay = document.getElementById('sharedAiOverlay');
    if (!overlay) return;
    overlay.classList.add('open');
    setTimeout(() => document.getElementById('sharedAiInput')?.focus(), 50);
  }
  function closeAI() { document.getElementById('sharedAiOverlay')?.classList.remove('open'); }
  function addMessage(text, who) {
    const p = document.createElement('p');
    p.className = 'shared-ai-message' + (who === 'user' ? ' user' : '');
    p.textContent = text;
    const list = document.getElementById('sharedAiMessages');
    list.appendChild(p); list.scrollTop = list.scrollHeight;
  }
  async function sendAI(event) {
    event.preventDefault();
    const input = document.getElementById('sharedAiInput');
    const button = event.currentTarget.querySelector('button[type="submit"]');
    const errorBox = document.getElementById('sharedAiError');
    const question = input.value.trim();
    if (!question) return;
    const token = localStorage.getItem('token');
    addMessage(question, 'user'); input.value = ''; errorBox.textContent = '';
    button.disabled = true; button.textContent = 'Đang hỏi...';
    try {
      const history = Array.from(document.querySelectorAll('#sharedAiMessages .shared-ai-message')).slice(-10).map(el => ({ role: el.classList.contains('user') ? 'user' : 'assistant', text: el.textContent }));
      const response = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify({ messages: history }) });
      const data = await response.json();
      if (response.status === 401) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      if (!response.ok) throw new Error(data.message || 'Không thể gửi câu hỏi đến AI.');
      addMessage(data.reply || 'AI chưa có câu trả lời.', 'assistant');
    } catch (error) { errorBox.textContent = error.message || 'Không thể kết nối đến AI.'; }
    finally { button.disabled = false; button.textContent = 'Gửi câu hỏi'; input.focus(); }
  }
})();
