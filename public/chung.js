(function() {
  const token = localStorage.getItem('token');
  let user = null; try { user = JSON.parse(localStorage.getItem('nguoi_dung') || 'null') } catch { }
  if (!token || !user) { location.href = '/login/login.html'; return }
  window.appUser = user; window.appToken = token;
  window.api = async function(url, options = {}) {
    const response = await fetch(url, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), Authorization: 'Bearer ' + token, ...(options.headers || {}) } });
    if (response.status === 401) { localStorage.removeItem('token'); localStorage.removeItem('nguoi_dung'); location.href = '/login/login.html'; throw new Error('Phiên đăng nhập đã hết hạn') }
    const text = await response.text(); let data = {}; try { data = text ? JSON.parse(text) : {} } catch { throw new Error('Máy chủ trả về dữ liệu không hợp lệ') }
    if (!response.ok) throw new Error(data.message || 'Yêu cầu không thành công'); return data;
  };
  window.rowsFrom = function(data) { if (Array.isArray(data)) return data; for (const key of ['data', 'items', 'rows', 'results', 'phong_van', 'danh_gia', 'quyet_dinh', 'thong_bao']) if (Array.isArray(data?.[key])) return data[key]; return [] };
  window.escapeHtml = function(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) };
  window.dateText = function(value) { if (!value) return '—'; const d = new Date(String(value).replace(' ', 'T')); return Number.isNaN(d.getTime()) ? escapeHtml(value) : d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) };
  window.showNotice = function(message, type = 'error') { const el = document.getElementById('notice'); if (!el) return; el.className = 'notice ' + type; el.textContent = message; el.hidden = false };
  window.hideNotice = function() { const el = document.getElementById('notice'); if (el) el.hidden = true };
  window.logout = function() { localStorage.removeItem('token'); localStorage.removeItem('nguoi_dung'); location.href = '/login/login.html' };
})();
