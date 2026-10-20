const API = "/api";
const cheDoEmbed = new URLSearchParams(window.location.search).get("embed") === "1";
if (cheDoEmbed) document.body.classList.add("embed-mode");

let danhSachDotTuyen = [];
let danhSachJD = [];
let danhSachGop = [];
let dangSua = null;
let dangXoa = null;
let dangXem = false;
let dotTuyenJDId = null;
let yTuongJD = "";
let cauHoiJD = [];
let trangHienTaiDot = 1;
const dotTuyenDaChon = new Set();
let dangXoaHangLoatDot = false;
const SO_DOT_MOI_TRANG = 10;

const $ = (id) => document.getElementById(id);

function xacNhanEmailCVTrung(message) {
  const modal = $("modalEmailCVTrung");
  const content = $("noiDungEmailCVTrung");
  const ok = $("btnXacNhanEmailCVTrung");
  if (!modal || !content || !ok) return Promise.resolve(window.confirm(`${message}\n\nNhấn OK để xác nhận và xóa CV trùng.`));
  content.textContent = `${message} Nhấn OK để xác nhận xóa CV trùng.`;
  modal.classList.add("hien");
  modal.setAttribute("aria-hidden", "false");
  return new Promise((resolve) => {
    const close = () => {
      modal.classList.remove("hien");
      modal.setAttribute("aria-hidden", "true");
      ok.removeEventListener("click", accept);
      resolve(true);
    };
    const accept = () => close();
    ok.addEventListener("click", accept, { once: true });
  });
}

function layToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    ""
  );
}

function layNguoiDung() {
  try {
    return JSON.parse(
      localStorage.getItem("nguoi_dung") ||
      localStorage.getItem("nguoiDung") ||
      localStorage.getItem("user") ||
      "null"
    );
  } catch {
    return null;
  }
}

function layVaiTro() {
  const user = layNguoiDung();

  return (
    user?.vai_tro ||
    user?.vaiTro ||
    user?.role ||
    user?.ten_vai_tro ||
    ""
  )
    .toString()
    .toLowerCase();
}

function coQuyenQuanLy() {
  return ["admin", "manager"].includes(layVaiTro());
}

function coQuyenTaoJD() {
  return ["admin", "manager", "hr"].includes(layVaiTro());
}

function taoHeaders() {
  const token = layToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function api(url, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);
  let response;
  try {
    response = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
      headers: {
        ...taoHeaders(),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Máy chủ phản hồi quá lâu khi tải ${url}. Kiểm tra kết nối cơ sở dữ liệu và log máy chủ.`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.error ||
      `Lỗi máy chủ (${response.status})`
    );
  }

  return data;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function dinhDangNgay(value) {
  if (!value) return "-";

  const dateText = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    const [, year, month, day] = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

function dinhDangNgayInput(value) {
  if (!value) return "";

  return dinhDangNgay(value) === "-" ? "" : dinhDangNgay(value);
}

function ngaySangISO(value) {
  const text = String(value || "").trim();

  if (!text) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!match) return "";

  const [, day, month, year] = match;

  return `${year}-${month}-${day}`;
}

function chonDiaDiem(select, value) {
  const diaDiem = String(value || "").trim();
  if (!diaDiem) {
    select.value = "";
    return;
  }

  const tenCu = diaDiem.split(/\s*[·,|]\s*/)[0].trim();
  const chuanHoa = (ten) => ten
    .toLocaleLowerCase("vi")
    .replace(/^(thành phố|tp\.?)\s*/i, "")
    .trim();
  const options = Array.from(select.options);
  const exact = options.find((option) => option.value === diaDiem)
    || options.find((option) => chuanHoa(option.value) === chuanHoa(tenCu));
  if (exact) {
    select.value = exact.value;
  } else {
    const option = document.createElement("option");
    option.value = diaDiem;
    option.textContent = diaDiem;
    select.appendChild(option);
    select.value = diaDiem;
  }
}

function hienThiTrangThai(value) {
  const map = {
    nhap: "Đang tuyển",
    dang_tuyen: "Đang tuyển",
    tam_dung: "Đang tuyển",
    ket_thuc: "Đã đóng",
    da_dong: "Đã đóng",
    dong: "Đã đóng",
    closed: "Đã đóng",
  };

  return map[value] || value || "-";
}

function hienThiTrangThaiJD(value) {
  const map = {
    nhap: "Nháp",
    cho_duyet: "Chờ duyệt",
    da_duyet: "Đã duyệt",
    tu_choi: "Từ chối",
    huy: "Đã hủy",
  };

  return map[value] || value || "-";
}

function layClassTrangThai(value) {
  return String(value || "nhap")
    .trim()
    .replace(/\s+/g, "_");
}

function parseTieuChi(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "object") {
    return Array.isArray(value.tieu_chi)
      ? value.tieu_chi
      : [];
  }

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (Array.isArray(parsed?.tieu_chi)) {
      return parsed.tieu_chi;
    }

    return [];
  } catch {
    return [];
  }
}

async function taiDuLieu() {
  const tbody = $("danhSach");
  if (tbody) {
    tbody.innerHTML = '<tr class="dong-dang-tai"><td colspan="8"><span class="vong-tai-nho" aria-hidden="true"></span>Đang tải danh sách đợt tuyển dụng…</td></tr>';
    $("khongCoDuLieu").style.display = "none";
  }
  try {
    const [dotTuyenResponse, jdResponse] = await Promise.all([
      api(`${API}/dot-tuyen`),
      api(`${API}/jd`),
    ]);

    danhSachDotTuyen =
      dotTuyenResponse?.data ||
      dotTuyenResponse?.dot_tuyen ||
      dotTuyenResponse ||
      [];

    danhSachJD =
      jdResponse?.data ||
      jdResponse?.jd ||
      jdResponse ||
      [];

    if (!Array.isArray(danhSachDotTuyen)) {
      danhSachDotTuyen = [];
    }

    if (!Array.isArray(danhSachJD)) {
      danhSachJD = [];
    }

    const idsDotHienCo = new Set(danhSachDotTuyen.map((dot) => String(dot.id)));
    for (const id of dotTuyenDaChon) {
      if (!idsDotHienCo.has(String(id))) dotTuyenDaChon.delete(id);
    }

    danhSachGop = danhSachDotTuyen.map((dot) => {
      const jd = danhSachJD.find(
        (item) => Number(item.dot_tuyen_id) === Number(dot.id)
      );

      return {
        dot,
        jd: jd || null,
        jds: danhSachJD.filter(
          (item) => Number(item.dot_tuyen_id) === Number(dot.id)
        ),
      };
    });

    capNhatThongKeDotTuyen();
    capNhatThongBaoDotTuyen();
    hienThiDanhSach();
  } catch (error) {
    console.error(error);

    if (
      error.message.toLowerCase().includes("chua dang nhap") ||
      error.message.toLowerCase().includes("chưa đăng nhập")
    ) {
      alert("Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.");
      window.location.href = "/login/login.html";
      return;
    }

    $("danhSach").innerHTML = "";
    $("khongCoDuLieu").style.display = "block";
    $("khongCoDuLieu").textContent =
      error.message || "Không thể tải dữ liệu.";
  }
}

function capNhatThongKeDotTuyen() {
  const so = (value) => Number(value || 0).toLocaleString("vi-VN");
  const ketThuc = danhSachDotTuyen.filter((dot) => laDotDaDong(dot)).length;
  const dangTuyen = danhSachDotTuyen.length - ketThuc;
  $("thongKeDangTuyen").textContent = so(dangTuyen);
  $("thongKeKetThuc").textContent = so(ketThuc);
  $("thongKeJD").textContent = so(danhSachJD.length);
  $("demTatCa").textContent = so(danhSachDotTuyen.length);
  $("demDangTuyen").textContent = so(dangTuyen);
  $("demKetThuc").textContent = so(ketThuc);
}

function khoaDuLieuDotTuyen(loai) {
  const user = layNguoiDung();
  return `${loai}_${user?.id || user?.email || "tai-khoan"}`;
}

function layDanhSachThongBaoDot() {
  try {
    const value = JSON.parse(localStorage.getItem(khoaDuLieuDotTuyen("thong_bao_dot")) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.error("Không thể đọc thông báo đợt tuyển dụng:", error);
    return [];
  }
}

function capNhatThongBaoDotTuyen() {
  const khoaSnapshot = khoaDuLieuDotTuyen("snapshot_dot_tuyen");
  let snapshotCu = {};
  try {
    snapshotCu = JSON.parse(localStorage.getItem(khoaSnapshot) || "{}");
  } catch (error) {
    console.error("Không thể đọc trạng thái đợt tuyển dụng đã lưu:", error);
  }

  const snapshotMoi = {};
  const thongBaoMoi = [];
  danhSachDotTuyen.forEach((dot) => {
    const id = String(dot.id);
    const stamp = [
      dot.ngay_cap_nhat || dot.ngay_sua || dot.ngay_tao || "",
      dot.trang_thai || "",
      dot.ten_dot || dot.ten || "",
      dot.so_ung_vien || 0,
      dot.kenh_nhan_cv || "",
    ].join("|");
    snapshotMoi[id] = stamp;
    if (snapshotCu[id] === undefined) {
      if (Object.keys(snapshotCu).length) {
        thongBaoMoi.push({ id, noiDung: `Đợt tuyển dụng “${dot.ten_dot || dot.ten}” vừa được tạo`, thoiGian: dot.ngay_tao });
      }
    } else if (snapshotCu[id] !== stamp) {
      thongBaoMoi.push({ id, noiDung: `Đợt tuyển dụng “${dot.ten_dot || dot.ten}” vừa được cập nhật`, thoiGian: dot.ngay_cap_nhat || dot.ngay_sua });
    }
  });

  try {
    localStorage.setItem(khoaSnapshot, JSON.stringify(snapshotMoi));
    if (thongBaoMoi.length) {
      localStorage.setItem(
        khoaDuLieuDotTuyen("thong_bao_dot"),
        JSON.stringify([...thongBaoMoi, ...layDanhSachThongBaoDot()].slice(0, 30)),
      );
    }
  } catch (error) {
    console.error("Không thể lưu thông báo đợt tuyển dụng:", error);
  }
  hienThiThongBaoDot();
}

function hienThiThongBaoDot() {
  const notices = layDanhSachThongBaoDot();
  const viewedKey = khoaDuLieuDotTuyen("thong_bao_dot_da_xem");
  let viewed = [];
  try {
    viewed = JSON.parse(localStorage.getItem(viewedKey) || "[]");
    if (!Array.isArray(viewed)) viewed = [];
  } catch (error) {
    console.error("Không thể đọc trạng thái thông báo đã xem:", error);
  }
  const unread = notices.filter((notice) => !viewed.includes(`${notice.id}:${notice.thoiGian}`));
  $("soThongBaoDot").textContent = unread.length > 9 ? "9+" : String(unread.length);
  $("soThongBaoDot").hidden = unread.length === 0;
  const list = $("danhSachThongBaoDot");
  list.replaceChildren();
  if (!notices.length) {
    const empty = document.createElement("p");
    empty.className = "trang-thai-trong";
    empty.textContent = "Chưa có cập nhật đợt tuyển dụng gần đây.";
    list.appendChild(empty);
    return;
  }
  notices.slice(0, 10).forEach((notice) => {
    const item = document.createElement("article");
    const title = document.createElement("strong");
    const date = document.createElement("span");
    title.textContent = notice.noiDung;
    const parsed = notice.thoiGian ? new Date(String(notice.thoiGian).replace(" ", "T")) : null;
    date.textContent = parsed && !Number.isNaN(parsed.getTime())
      ? parsed.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })
      : "";
    item.className = "thong-bao-item";
    item.append(title, date);
    list.appendChild(item);
  });
}

function layLichSuHoiAIDot() {
  try {
    const history = JSON.parse(localStorage.getItem(khoaDuLieuDotTuyen("lich_su_chat_ai")) || "[]");
    return Array.isArray(history)
      ? history.filter((message) => ["user", "assistant"].includes(message?.role) && typeof message?.text === "string").slice(-10)
      : [];
  } catch (error) {
    console.error("Không thể khôi phục lịch sử hỏi AI:", error);
    return [];
  }
}

function luuLichSuHoiAIDot() {
  try {
    localStorage.setItem(khoaDuLieuDotTuyen("lich_su_chat_ai"), JSON.stringify(lichSuHoiAIDot));
  } catch (error) {
    console.error("Không thể lưu lịch sử hỏi AI:", error);
  }
}

let lichSuHoiAIDot = layLichSuHoiAIDot();

function hienThiTinNhanAIDot(message, role) {
  const paragraph = document.createElement("p");
  paragraph.className = `chatbot-tin-nhan-${role === "assistant" ? "ai" : "nguoi-dung"}`;
  paragraph.textContent = message;
  $("chatbotTinNhanDot").appendChild(paragraph);
  $("chatbotTinNhanDot").scrollTop = $("chatbotTinNhanDot").scrollHeight;
}

function khoiPhucLichSuHoiAIDot() {
  const container = $("chatbotTinNhanDot");
  container.replaceChildren();
  if (!lichSuHoiAIDot.length) {
    hienThiTinNhanAIDot("Xin chào! Tôi có thể hỗ trợ gì về các đợt tuyển dụng?", "assistant");
    return;
  }
  lichSuHoiAIDot.forEach((message) => hienThiTinNhanAIDot(message.text, message.role));
}

function moUploadDotTuyen(dot) {
  if (laDotDaDong(dot)) { alert("Đợt tuyển dụng đã đóng, không thể thêm hoặc cập nhật CV."); return; }
  const section = document.querySelector(".danh-sach-cv-dot");
  if (!section) return;
  const old = section.querySelector(".upload-dot-inline");
  if (old) { old.remove(); return; }
  const panel = document.createElement("section");
  panel.className = "upload-dot-inline";
  panel.innerHTML = `<div class="upload-dot-inline-header"><strong>Thêm CV vào đợt tuyển dụng</strong><button type="button" class="btn-dong-upload-inline" aria-label="Đóng">×</button></div><p class="upload-dot-inline-caption">Chọn nhiều CV hoặc một file ZIP. CV sẽ được phân tích và lưu kết quả AI tự động.</p><form class="form-upload-dot-inline"><input type="hidden" name="dot_tuyen_id" value="${escapeHTML(dot.id)}" /><input type="file" name="files" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip" required /><p class="thong-bao upload-dot-inline-message" role="status"></p><progress class="candidate-upload-progress" max="1" value="0" hidden></progress><div class="upload-dot-inline-actions"><button type="button" class="btn-huy btn-huy-upload-inline">Hủy</button><button type="submit" class="btn-luu">Tải CV lên và phân tích</button></div></form>`;
  const table = section.querySelector(".cv-dot-table-wrap");
  section.insertBefore(panel, table || null);
  panel.querySelector(".btn-dong-upload-inline").addEventListener("click", () => huyUploadCVTheoDot(panel.querySelector("form")));
  panel.querySelector(".btn-huy-upload-inline").addEventListener("click", () => huyUploadCVTheoDot(panel.querySelector("form")));
  panel.querySelector("form").addEventListener("submit", batDauUploadCVTheoDot);
  panel.querySelector('input[type="file"]').focus();
}

function dongUploadDot() {
  const form = document.querySelector("#modalUploadDot form");
  if (form?._uploadState?.active) {
    huyUploadCVTheoDot(form);
    return;
  }
  $("modalUploadDot").classList.remove("hien");
}

function batDauUploadCVTheoDot(event) {
  const form = event.currentTarget;
  const promise = guiUploadCVTheoDot(event);
  if (form._uploadState) form._uploadState.runPromise = promise;
  return promise;
}

async function huyUploadCVTheoDot(form) {
  const state = form?._uploadState;
  if (!state?.active) {
    if (form?.closest("#modalUploadDot")) $("modalUploadDot").classList.remove("hien");
    else form?.closest(".upload-dot-inline")?.remove();
    return;
  }
  if (state.cancelPromise) return state.cancelPromise;
  state.cancelRequested = true;
  state.message.className = "thong-bao hien dang-xu-ly";
  state.message.textContent = "Đang hủy và xóa các CV vừa tải lên...";
  state.cancelButton.disabled = true;
  state.cancelButton.textContent = "Đang hủy...";
  state.submitButton.disabled = true;
  state.controller.abort();
  state.cancelPromise = (async () => {
    if (state.runPromise) await state.runPromise.catch(() => {});
    const created = state.candidates || [];
    for (const candidate of created) {
      if (!candidate?.id || !candidate?.cv_id) continue;
      try {
        await api(`${API}/ung-vien/${candidate.id}/cv/${candidate.cv_id}`, { method: "DELETE" });
      } catch (error) {
        console.error("Không xóa được CV đã hủy:", candidate, error);
      }
    }
    state.active = false;
    if (form.closest("#modalUploadDot")) $("modalUploadDot").classList.remove("hien");
    else form.closest(".upload-dot-inline")?.remove();
    await taiDuLieu().catch(() => {});
    const activeItem = danhSachGop.find((item) => Number(item.dot?.id) === Number(state.dotTuyenId));
    if (activeItem) await taiCVTheoDot(activeItem.dot).catch(() => {});
  })();
  return state.cancelPromise;
}

async function guiUploadCVTheoDot(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const filesInput = form.querySelector('input[type="file"]');
  const files = Array.from(filesInput?.files || []);
  if (!files.length) return;
  const idInput = form.querySelector('[name="dot_tuyen_id"]') || $("idDotUpload");
  const message = form.querySelector(".thong-bao") || $("thongBaoUploadDot");
  const progress = form.querySelector("progress") || $("progressUploadDot");
  const button = form.querySelector('[type="submit"]') || $("btnGuiUploadDot");
  const cancelButton = form.querySelector(".btn-huy-upload-inline") || $("btnHuyUploadDot");
  const data = new FormData();
  data.append("dot_tuyen_id", idInput.value);
  files.forEach((file) => data.append("files", file));
  const state = {
    active: true,
    cancelRequested: false,
    controller: new AbortController(),
    candidates: [],
    message,
    progress,
    submitButton: button,
    cancelButton,
    dotTuyenId: Number(idInput.value),
    runPromise: null,
  };
  form._uploadState = state;
  button.disabled = true;
  button.textContent = "Đang tải...";
  cancelButton.disabled = false;
  progress.hidden = true;
  progress.value = 0;
  message.className = "thong-bao hien dang-xu-ly";
  message.textContent = "Đang tải CV lên đợt tuyển dụng... Có thể nhấn Hủy để dừng và không lưu các CV của lần tải này.";
  try {
    const response = await fetch(`${API}/cv/upload-dot-tuyen`, {
      method: "POST",
      headers: layToken() ? { Authorization: `Bearer ${layToken()}` } : {},
      body: data,
      signal: state.controller.signal,
    });
    const result = await response.json().catch(() => ({}));
    if (state.cancelRequested) return;
    if (response.status === 401) { window.location.href = "/login/login.html"; return; }
    if (!response.ok) throw new Error(result.message || `Lỗi máy chủ (${response.status})`);
    const candidates = Array.isArray(result.candidates) ? result.candidates : [];
    state.candidates = candidates;
    const failures = Array.isArray(result.errors) ? result.errors.map((item) => `${item.ten_file || "CV"}: ${item.message || "Tải CV thất bại"}`) : [];
    let successCount = 0;
    if (candidates.length) {
      progress.hidden = false;
      progress.max = candidates.length;
      button.textContent = "Đang phân tích...";
      for (let index = 0; index < candidates.length; index += 1) {
        if (state.cancelRequested) break;
        const candidate = candidates[index];
        message.textContent = `Đã tải CV. Đang phân tích và lưu ${index + 1}/${candidates.length}: ${candidate.ten_file || "CV"}...`;
        try {
          const authHeaders = { "Content-Type": "application/json", ...(layToken() ? { Authorization: `Bearer ${layToken()}` } : {}) };
          const analysisResponse = await fetch(`${API}/cv/review/${candidate.id}/analyze`, { method: "POST", headers: authHeaders, body: JSON.stringify({ cv_id: candidate.cv_id }), signal: state.controller.signal });
          const analysisResult = await analysisResponse.json().catch(() => ({}));
          if (state.cancelRequested) break;
          if (!analysisResponse.ok) {
            failures.push(`${candidate.ten_file || "CV"}: ${analysisResult.message || "Lỗi phân tích"}`);
            try { await api(`${API}/ung-vien/${candidate.id}/cv/${candidate.cv_id}`, { method: "DELETE" }); state.candidates = state.candidates.filter(item => Number(item.id) !== Number(candidate.id)); } catch {}
          } else {
            const duplicateByEmail = (analysisResult.ung_vien_trung_tiem_nang || []).find(item => item.exact && item.ly_do === "Trùng email");
            if (duplicateByEmail) {
              const duplicateMessage = `Email ${analysisResult.phan_tich?.extraction?.email || "này"} đã tồn tại trong đợt tuyển dụng bởi ${duplicateByEmail.ho_ten || `ứng viên #${duplicateByEmail.id}`}. CV trùng sẽ được xóa.`;
              // Dialog giữ nguyên trên trang; chỉ tiếp tục xóa khi người dùng bấm OK.
              await xacNhanEmailCVTrung(duplicateMessage);
              try {
                await api(`${API}/ung-vien/${candidate.id}/cv/${candidate.cv_id}`, { method: "DELETE" });
                state.candidates = state.candidates.filter(item => Number(item.id) !== Number(candidate.id));
                // Không đưa lỗi trùng vào thông báo tổng kết nữa: dialog vừa được người dùng xác nhận.
              } catch (deleteError) {
                failures.push(`${candidate.ten_file || "CV"}: Email đã tồn tại nhưng chưa xóa được CV trùng. ${deleteError.message || ""}`);
              }
            } else if (analysisResult.phan_tich && analysisResult.jd_id) {
              if (state.cancelRequested) break;
              const saveResponse = await fetch(`${API}/cv/review/${candidate.id}/confirm`, {
                method: "POST", headers: authHeaders,
                body: JSON.stringify({ cv_id: candidate.cv_id, jd_id: analysisResult.jd_id, phan_tich: analysisResult.phan_tich, diem: analysisResult.phan_tich.score?.tong, de_xuat: analysisResult.phan_tich.score?.de_xuat, ly_do: "Xác nhận tự động sau khi AI phân tích CV." }),
                signal: state.controller.signal,
              });
              const saveResult = await saveResponse.json().catch(() => ({}));
              if (state.cancelRequested) break;
              if (saveResponse.ok) successCount += 1;
              else {
                try { await api(`${API}/ung-vien/${candidate.id}/cv/${candidate.cv_id}`, { method: "DELETE" }); state.candidates = state.candidates.filter(item => Number(item.id) !== Number(candidate.id)); } catch {}
                failures.push(`${candidate.ten_file || "CV"}: ${saveResult.message || "Không lưu được kết quả AI"}; CV không được giữ lại.`);
              }
            } else {
              try { await api(`${API}/ung-vien/${candidate.id}/cv/${candidate.cv_id}`, { method: "DELETE" }); state.candidates = state.candidates.filter(item => Number(item.id) !== Number(candidate.id)); } catch {}
              failures.push(`${candidate.ten_file || "CV"}: AI chưa trả đủ dữ liệu; CV không được giữ lại.`);
            }
          }
        } catch (error) {
          if (state.cancelRequested || error.name === "AbortError") break;
          failures.push(`${candidate.ten_file || "CV"}: ${error.message || "Không kết nối được máy chủ AI"}`);
        }
        progress.value = index + 1;
      }
    }
    if (state.cancelRequested) return;
    const daXuLyNhungKhongLuu = candidates.length > 0 && successCount === 0 && failures.length === 0;
    if (daXuLyNhungKhongLuu) {
      // Tất cả CV trong lượt này đều bị bỏ do trùng email đã được xác nhận.
      // Không hiển thị thông báo xanh gây hiểu nhầm là đã phân tích/lưu thành công.
      message.className = "thong-bao";
      message.textContent = "";
    } else {
      message.className = failures.length ? "thong-bao hien" : "thong-bao hien thanh-cong";
      message.textContent = failures.length ? `Đã tải ${candidates.length} CV. Phân tích và lưu thành công ${successCount}/${candidates.length}. Có ${failures.length} lỗi: ${failures.slice(0, 3).join(" · ")}` : `${result.message || "Đã tải CV thành công."}${candidates.length ? ` Đã phân tích và lưu ${successCount}/${candidates.length} CV.` : ""}`;
    }
    await taiDuLieu();
    const activeItem = danhSachGop.find((item) => Number(item.dot?.id) === Number(idInput.value));
    if (activeItem) await taiCVTheoDot(activeItem.dot);
  } catch (error) {
    if (!state.cancelRequested && error.name !== "AbortError") {
      console.error(error);
      message.className = "thong-bao hien";
      message.textContent = error.message || "Không thể tải CV lên.";
    }
  } finally {
    state.active = false;
    button.disabled = false;
    button.textContent = "Tải CV lên và phân tích";
    cancelButton.disabled = false;
    cancelButton.textContent = "Hủy";
  }
}

async function moDialogThemNguoiPhongVanDot(selectEl) {
  const overlay = document.createElement("div");
  overlay.className = "cv-dot-modal-overlay";
  overlay.style.zIndex = "20000";
  const modal = document.createElement("section");
  modal.className = "cv-dot-modal cv-dot-modal-interview";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.innerHTML = `<div class="cv-dot-modal-header"><strong>Thêm người phỏng vấn</strong><button type="button" class="cv-dot-modal-close" data-close aria-label="Đóng">×</button></div><form class="cv-dot-interview-form"><label>Họ và tên *<input name="ho_ten" maxlength="100" required></label><label>Email đăng nhập *<input name="email" type="email" maxlength="150" required></label><label>Số điện thoại<input name="so_dien_thoai" type="tel" maxlength="30"></label><p class="cv-dot-interview-error" role="alert"></p><div class="cv-dot-modal-actions"><button type="button" class="cv-dot-cancel" data-close>Hủy</button><button type="submit" class="cv-dot-save">Tạo người phỏng vấn</button></div></form>`;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", close));
  overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
  overlay.querySelector("form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    const errorBox = form.querySelector(".cv-dot-interview-error");
    button.disabled = true; button.textContent = "Đang tạo..."; errorBox.textContent = "";
    try {
      const body = { ho_ten: String(form.elements.ho_ten.value || "").trim(), email: String(form.elements.email.value || "").trim(), mat_khau: "123456", so_dien_thoai: String(form.elements.so_dien_thoai.value || "").trim(), bo_phan: "", chuc_danh: "" };
      const result = await api(`${API}/phong-van/nguoi-phong-van`, { method: "POST", body: JSON.stringify(body) });
      const person = result.data || result;
      const option = new Option(`${person.ho_ten || person.email} — Người phỏng vấn`, String(person.id), true, true);
      // Người vừa tạo được đưa lên đầu danh sách (ngay dưới mục thêm mới) và chọn luôn.
      selectEl.insertBefore(option, selectEl.options[1] || null);
      option.selected = true;
      close();
    } catch (error) {
      errorBox.textContent = error.message || "Không thêm được người phỏng vấn.";
      button.disabled = false; button.textContent = "Tạo người phỏng vấn";
    }
  });
}

function layNgayHienTaiVietNam() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function ngayKetThucDaQua(dot) {
  const raw = dot?.ngay_ket_thuc;
  if (!raw) return false;
  const dateOnly = String(raw).slice(0, 10);
  return dateOnly < layNgayHienTaiVietNam();
}

function laDotDaDong(dot) {
  const raw = dot?.ngay_ket_thuc;
  if (raw) {
    // Ngày kết thúc vẫn còn hiệu lực trong toàn bộ ngày đó, kể cả khi DB đang giữ trạng thái cũ.
    return ngayKetThucDaQua(dot);
  }
  return ["ket_thuc", "da_dong", "dong", "closed"].includes(
    String(dot?.trang_thai || "").toLowerCase()
  );
}

function hienThiDanhSach() {
  const tuKhoa = $("oTimKiem").value.trim().toLowerCase();
  const trangThai = $("locTrangThai").value;

  const danhSachLoc = danhSachGop.filter((item) => {
    const dot = item.dot;
    const jd = item.jd;

    const text = [
      dot?.ten_dot,
      dot?.ten,
      dot?.mo_ta,
      jd?.tieu_de,
      jd?.mo_ta,
    ]
      .join(" ")
      .toLowerCase();

    const dungTuKhoa = !tuKhoa || text.includes(tuKhoa);
    const dungTrangThai =
      !trangThai ||
      (trangThai === "ket_thuc" ? laDotDaDong(dot) : trangThai === "dang_tuyen" ? !laDotDaDong(dot) : true);

    return dungTuKhoa && dungTrangThai;
  });
  danhSachLoc.sort((a, b) => {
    const ngayA = new Date(String(a.dot?.ngay_tao || "").replace(" ", "T")).getTime() || 0;
    const ngayB = new Date(String(b.dot?.ngay_tao || "").replace(" ", "T")).getTime() || 0;
    return ngayB - ngayA || Number(b.dot?.id || 0) - Number(a.dot?.id || 0);
  });

  const tbody = $("danhSach");
  tbody.innerHTML = "";
  const soTrang = Math.max(1, Math.ceil(danhSachLoc.length / SO_DOT_MOI_TRANG));
  trangHienTaiDot = Math.min(trangHienTaiDot, soTrang);
  const batDau = (trangHienTaiDot - 1) * SO_DOT_MOI_TRANG;
  const danhSachTrang = danhSachLoc.slice(batDau, batDau + SO_DOT_MOI_TRANG);
  $("tongSo").textContent = `${danhSachLoc.length.toLocaleString("vi-VN")} đợt tuyển dụng`;
  capNhatPhanTrangDot(danhSachLoc.length, soTrang, batDau);

  if (!danhSachLoc.length) {
    $("khongCoDuLieu").style.display = "block";
    capNhatNutXoaDotDaChon();
    return;
  }

  $("khongCoDuLieu").style.display = "none";

  danhSachTrang.forEach((item, index) => {
    const dot = item.dot;

    const tenDot =
      dot?.ten_dot ||
      dot?.ten ||
      "-";

    const trangThai = laDotDaDong(dot) ? "ket_thuc" : "dang_tuyen";
    const soUngVien = Number(dot?.so_ung_vien) || 0;
    const ungVienHopTieuChi = Number(dot?.so_ung_vien_hop_tieu_chi) || 0;
    const kenhNhanCV = Array.isArray(dot?.kenh_nhan_cv)
      ? dot.kenh_nhan_cv.filter(Boolean).join(", ")
      : dot?.kenh_nhan_cv || "-";

    const row = document.createElement("tr");
    row.dataset.dotId = String(dot.id);
    row.classList.add("dot-tuyen-row-clickable");
    if (dotTuyenDaChon.has(String(dot.id))) row.classList.add("dot-tuyen-row-selected");

    row.innerHTML = `
      <td class="cot-chon-dot"><input type="checkbox" class="tick-chon-dot" data-action="chon-dot" data-id="${escapeHTML(dot.id)}" aria-label="Chọn đợt tuyển dụng ${escapeHTML(tenDot)}" ${dotTuyenDaChon.has(String(dot.id)) ? "checked" : ""}></td>
      <td class="cot-stt">${batDau + index + 1}</td>
      <td>
        <div class="chien-dich-ten">
          <span class="chien-dich-thong-tin">
            <strong class="ten-dot"><button type="button" class="ten-dot-link" data-action="xem" data-id="${dot.id}">${escapeHTML(tenDot)}</button></strong>
          </span>
        </div>
      </td>

      <td><span class="so-ung-vien-dot">♙ ${escapeHTML(soUngVien.toLocaleString("vi-VN"))}</span></td>
      <td><span class="so-hop-tieu-chi">${escapeHTML(ungVienHopTieuChi.toLocaleString("vi-VN"))}</span></td>

      <td>
        <span class="badge ${layClassTrangThai(trangThai)}">
          ${escapeHTML(hienThiTrangThai(trangThai))}
        </span>
      </td>

      <td class="cot-kenh-nhan-cv"><span class="kenh-nhan-cv">${escapeHTML(kenhNhanCV)}</span></td>
      <td><span class="thoi-gian-dot">${escapeHTML(dinhDangNgay(dot?.ngay_tao))}</span></td>


    `;

    // Gắn sự kiện trực tiếp để tên đợt luôn mở được form chi tiết,
    // không phụ thuộc vào sự kiện click ủy quyền ở tbody.
    const titleButton = row.querySelector('.ten-dot-link');
    if (titleButton) {
      titleButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        // Dùng đúng bản ghi đã được render cho hàng này, tránh lỗi tìm kiếm ID
        // khi API trả ID khác kiểu dữ liệu hoặc dữ liệu vừa được cập nhật.
        try {
          moFormXem(item);
        } catch (error) {
          console.error('Không mở được thông tin đợt tuyển dụng:', dot?.id, error);
          alert('Không mở được thông tin đợt tuyển dụng này. Vui lòng tải lại trang; nếu vẫn lỗi, mở F12 > Console để xem chi tiết.');
        }
      });
    }
    row.addEventListener('click', (event) => {
      // Bấm vào phần viền/nền của ô checkbox cũng chỉ chọn hàng, không mở chi tiết JD.
      const checkboxCell = event.target.closest('td.cot-chon-dot');
      if (checkboxCell) {
        const checkbox = checkboxCell.querySelector('.tick-chon-dot');
        if (checkbox && event.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
      }
      if (event.target.closest('button, a, input, select, textarea')) return;
      try {
        moFormXem(item);
      } catch (error) {
        console.error('Không mở được thông tin đợt tuyển dụng:', dot?.id, error);
        alert('Không mở được thông tin đợt tuyển dụng này. Vui lòng tải lại trang; nếu vẫn lỗi, mở F12 > Console để xem chi tiết.');
      }
    });
    tbody.appendChild(row);
  });
  capNhatNutXoaDotDaChon();
}

function capNhatNutXoaDotDaChon() {
  const deleteButton = $("btnXoaDotDaChon");
  if (!deleteButton) return;
  const count = dotTuyenDaChon.size;
  // Giữ nguyên thanh tìm kiếm; chỉ bật nút xóa khi đã chọn ít nhất một đợt.
  deleteButton.hidden = false;
  // Khi chưa chọn, vẫn cho bấm để hiện hướng dẫn thay vì khóa nút.
  deleteButton.disabled = dangXoaHangLoatDot;
  deleteButton.innerHTML = dangXoaHangLoatDot
    ? '<span class="vong-tai-nho" aria-hidden="true"></span><span>Đang xóa...</span>'
    : "Xóa đợt tuyển dụng";
  deleteButton.setAttribute("aria-label", dangXoaHangLoatDot ? "Đang xóa đợt tuyển dụng" : "Xóa đợt tuyển dụng");
}

function moModalXoaNhieuDot() {
  if (dangXoaHangLoatDot) return;
  const modal = $("modalXoaNhieuDot");
  if (dotTuyenDaChon.size === 0) {
    $("nhanXoaNhieuDot").textContent = "CHƯA CHỌN ĐỢT TUYỂN DỤNG";
    $("tieuDeXoaNhieuDot").textContent = "Vui lòng chọn đợt tuyển dụng để xóa";
    $("noiDungXoaNhieuDot").textContent = "Tick vào ô ở cột đầu tiên của một hoặc nhiều đợt tuyển dụng, sau đó nhấn nút Xóa đợt tuyển dụng.";
    $("bieuTuongXoaNhieuDot").textContent = "!";
    $("hanhDongXoaNhieuDot").innerHTML = '<button type="button" class="btn-luu" id="btnDongKetQuaXoaNhieuDot">Đã hiểu</button>';
    $("btnDongKetQuaXoaNhieuDot").addEventListener("click", () => {
      modal.classList.remove("hien");
      modal.setAttribute("aria-hidden", "true");
    }, { once: true });
    modal.classList.add("hien");
    modal.setAttribute("aria-hidden", "false");
    return;
  }
  $("nhanXoaNhieuDot").textContent = "XÁC NHẬN XÓA";
  $("tieuDeXoaNhieuDot").textContent = `Xóa ${dotTuyenDaChon.size} đợt tuyển dụng đã chọn?`;
  $("noiDungXoaNhieuDot").textContent = "Các đợt tuyển dụng đã chọn cùng những JD liên quan sẽ bị xóa. Hành động này không thể hoàn tác.";
  $("bieuTuongXoaNhieuDot").textContent = "!";
  $("hanhDongXoaNhieuDot").innerHTML = '<button type="button" class="btn-huy" id="btnHuyXoaNhieuDot">Hủy</button><button type="button" class="btn-xoa-confirm" id="btnXacNhanXoaNhieuDot">Xóa đợt tuyển dụng</button>';
  $("btnHuyXoaNhieuDot").addEventListener("click", dongModalXoaNhieuDot, { once: true });
  $("btnXacNhanXoaNhieuDot").addEventListener("click", xoaDotTuyenDaChon, { once: true });
  modal.classList.add("hien");
  modal.setAttribute("aria-hidden", "false");
}

function dongModalXoaNhieuDot() {
  if (dangXoaHangLoatDot) return;
  const modal = $("modalXoaNhieuDot");
  modal.classList.remove("hien");
  modal.setAttribute("aria-hidden", "true");
}

async function xoaDotTuyenDaChon() {
  if (dangXoaHangLoatDot || dotTuyenDaChon.size === 0) return;
  const ids = [...dotTuyenDaChon];
  dangXoaHangLoatDot = true;
  capNhatNutXoaDotDaChon();

  // Giữ form ở phía trước màn hình trong suốt quá trình xóa để chặn thao tác khác.
  $("nhanXoaNhieuDot").textContent = "ĐANG XỬ LÝ";
  $("tieuDeXoaNhieuDot").innerHTML = '<span class="vong-tai-nho" aria-hidden="true"></span> Đang xóa đợt tuyển dụng...';
  $("noiDungXoaNhieuDot").textContent = `Đang xóa ${ids.length} đợt tuyển dụng cùng các JD liên quan. Vui lòng không đóng biểu mẫu hoặc thao tác trên trang.`;
  $("bieuTuongXoaNhieuDot").textContent = "…";
  $("hanhDongXoaNhieuDot").innerHTML = '<button type="button" class="btn-xoa-confirm" disabled>Đang xóa...</button>';

  let daXoa = 0;
  const loi = [];
  try {
    // Cho người dùng nhìn thấy trạng thái loading trước khi bắt đầu gọi API.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    for (const id of ids) {
      try {
        await api(`${API}/dot-tuyen/${encodeURIComponent(id)}`, { method: "DELETE" });
        dotTuyenDaChon.delete(String(id));
        daXoa += 1;
      } catch (error) {
        loi.push(`ID ${id}: ${error.message || "Không xóa được"}`);
      }
    }
    await taiDuLieu();
    $("nhanXoaNhieuDot").textContent = loi.length ? "XÓA CHƯA HOÀN TẤT" : "HOÀN TẤT";
    $("tieuDeXoaNhieuDot").textContent = loi.length ? "Đã xử lý một phần" : "Xóa đợt tuyển dụng thành công";
    $("noiDungXoaNhieuDot").textContent = loi.length
      ? `Đã xóa ${daXoa}/${ids.length} đợt tuyển dụng. Các mục chưa xóa được: ${loi.join("; ")}`
      : `Đã xóa ${daXoa} đợt tuyển dụng cùng các JD liên quan.`;
    $("bieuTuongXoaNhieuDot").textContent = loi.length ? "!" : "✓";
    $("hanhDongXoaNhieuDot").innerHTML = '<button type="button" class="btn-luu" id="btnDongKetQuaXoaNhieuDot">Đóng</button>';
    $("btnDongKetQuaXoaNhieuDot").addEventListener("click", () => {
      $("modalXoaNhieuDot").classList.remove("hien");
      $("modalXoaNhieuDot").setAttribute("aria-hidden", "true");
    }, { once: true });
  } catch (error) {
    console.error("Lỗi khi xóa nhiều đợt tuyển dụng:", error);
    $("nhanXoaNhieuDot").textContent = "KHÔNG THỂ HOÀN TẤT";
    $("tieuDeXoaNhieuDot").textContent = "Không thể tải lại danh sách";
    $("noiDungXoaNhieuDot").textContent = error.message || "Đã xảy ra lỗi khi cập nhật danh sách sau khi xóa.";
    $("bieuTuongXoaNhieuDot").textContent = "!";
    $("hanhDongXoaNhieuDot").innerHTML = '<button type="button" class="btn-luu" id="btnDongKetQuaXoaNhieuDot">Đóng</button>';
    $("btnDongKetQuaXoaNhieuDot").addEventListener("click", () => {
      $("modalXoaNhieuDot").classList.remove("hien");
      $("modalXoaNhieuDot").setAttribute("aria-hidden", "true");
    }, { once: true });
  } finally {
    dangXoaHangLoatDot = false;
    capNhatNutXoaDotDaChon();
  }
}

function capNhatPhanTrangDot(tongSo, soTrang, batDau) {
  const container = $("cacTrangDot");
  container.replaceChildren();
  $("phanTrangDot").hidden = tongSo === 0;
  $("thongTinPhanTrangDot").textContent = tongSo
    ? `Hiển thị ${batDau + 1}–${Math.min(batDau + SO_DOT_MOI_TRANG, tongSo)} trong ${tongSo}`
    : "Không có đợt tuyển dụng";
  $("btnTrangTruocDot").disabled = trangHienTaiDot <= 1;
  $("btnTrangSauDot").disabled = trangHienTaiDot >= soTrang;

  const dauTrang = Math.max(1, Math.min(trangHienTaiDot - 2, soTrang - 4));
  const cuoiTrang = Math.min(soTrang, dauTrang + 4);
  for (let page = dauTrang; page <= cuoiTrang; page += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = String(page);
    button.className = page === trangHienTaiDot ? "active" : "";
    button.setAttribute("aria-label", `Trang ${page}`);
    button.setAttribute("aria-current", page === trangHienTaiDot ? "page" : "false");
    button.addEventListener("click", () => {
      trangHienTaiDot = page;
      hienThiDanhSach();
    });
    container.appendChild(button);
  }
}

function moModal() {
  $("modal").classList.add("hien");
}

function dongModal() {
  $("modal").classList.remove("hien");
  if ($("hanhDongChiTiet")) $("hanhDongChiTiet").hidden = true;
  dangSua = null;
  dangXem = false;

  $("form").reset();
  $("id").value = "";

  $("danhSachTieuChi").innerHTML = "";
  $("tongTrongSo").textContent = "Tổng: 0%";
  $("tongTrongSo").classList.remove("lech");

  $("thongBao").className = "thong-bao";
  $("thongBao").textContent = "";
  $("jdThongTin").hidden = true;
  $("jdThongTinNoiDung").replaceChildren();
  $("jdChinhSua").hidden = true;
  $("danhSachTieuChiSua").replaceChildren();
  $("tongTrongSoSua").textContent = "Tổng: 0%";

  moKhoaForm();
}

function moFormMoi() {
  dangSua = null;
  dangXem = false;
  $("hanhDongChiTiet").hidden = true;
  dongModal();

  $("tieuDeModal").textContent = "Thêm đợt tuyển dụng";
  $("tieuDeModal").nextElementSibling.textContent =
    "Nhập thông tin và thời gian tuyển dụng. AI sẽ hỗ trợ đề xuất tên phù hợp.";
  $("form").querySelector('[type="submit"]').textContent = "Lưu đợt tuyển dụng";
  $("trangThai").value = "dang_tuyen";
  $("id").value = "";
  $("ten").value = "";
  delete $("ten").dataset.generated;
  $("nhomTenDot").hidden = true;
  $("nhomMoTaDot").hidden = false;
  $("moTa").required = true;
  $("moTa").value = "";
  $("jdChinhSua").hidden = true;
  $("jdThongTin").hidden = true;
  moModal();
}

function moFormSua(item) {
  $("hanhDongChiTiet").hidden = true;
  dongModal();

  dangSua = item;

  $("tieuDeModal").textContent = "Chỉnh sửa đợt tuyển dụng";
  $("tieuDeModal").nextElementSibling.textContent =
    "Cập nhật thông tin chiến dịch và bản mô tả công việc.";
  $("form").querySelector('[type="submit"]').textContent = "Lưu đợt tuyển dụng";
  $("nhomTenDot").hidden = false;
  $("nhomMoTaDot").hidden = true;
  $("moTa").required = false;

  const dot = item.dot;
  $("id").value = dot.id || "";
  $("ten").value = dot.ten_dot || dot.ten || "";
  $("ten").dataset.edited = "true";
  $("moTa").value = dot.mo_ta || "";
  $("ngayBatDau").value = dinhDangNgayInput(dot.ngay_bat_dau);
  $("ngayKetThuc").value = dinhDangNgayInput(dot.ngay_ket_thuc);
  $("trangThai").value = laDotDaDong(dot) ? "ket_thuc" : "dang_tuyen";

  $("yeuCauSuaJD").value = "";
  $("thongBaoSuaJD").className = "thong-bao";
  $("thongBaoSuaJD").textContent = "";
  $("jdChinhSua").hidden = false;
  const jd = item.jd || {};
  $("jdSuaBoPhan").value = jd.bo_phan || "";
  chonDiaDiem($("jdSuaDiaDiem"), jd.dia_diem || "");
  $("jdSuaLoaiHinh").value = jd.loai_hinh || "";
  $("jdSuaMucLuong").value = jd.muc_luong || "";
  $("jdSuaKyNang").value = jd.ky_nang || "";
  $("jdSuaMoTa").value = jd.mo_ta || "";
  $("jdSuaYeuCau").value = jd.yeu_cau || "";
  $("jdSuaQuyenLoi").value = jd.quyen_loi || "";
  $("danhSachTieuChiSua").replaceChildren();
  parseTieuChi(jd.tieu_chi).forEach((criterion) => {
    themTieuChiSua(criterion.ten || "", criterion.trong_so ?? 0, criterion.mo_ta || "");
  });
  if (!parseTieuChi(jd.tieu_chi).length) themTieuChiSua();
  capNhatTongTrongSoSua();

  moModal();
}

function moFormXem(item) {
  dongModal();

  dangXem = true;
  window.dotTuyenDangXem = item;
  $("hanhDongChiTiet").hidden = false;
  $("btnSuaTrongXem").hidden = !coQuyenQuanLy();
  $("btnXoaTrongXem").hidden = !coQuyenQuanLy();
  const statusButton = $("btnDoiTrangThaiDot");
  if (statusButton) {
    statusButton.hidden = !coQuyenQuanLy();
    statusButton.textContent = laDotDaDong(item.dot) ? "Đã kết thúc" : "Đang tuyển";
    statusButton.classList.toggle("da-dong", laDotDaDong(item.dot));
  }

  $("tieuDeModal").textContent = "Thông tin đợt tuyển dụng";
  $("tieuDeModal").nextElementSibling.textContent =
    "Đang tải thông tin tuyển dụng…";
  $("nhomTenDot").hidden = false;
  $("nhomMoTaDot").hidden = true;
  $("moTa").required = false;

  const dot = item.dot;
  $("id").value = dot.id || "";
  $("ten").value = dot.ten_dot || dot.ten || "";
  $("moTa").value = dot.mo_ta || "";
  $("ngayBatDau").value = dinhDangNgayInput(dot.ngay_bat_dau);
  $("ngayKetThuc").value = dinhDangNgayInput(dot.ngay_ket_thuc);
  $("trangThai").value = laDotDaDong(dot) ? "ket_thuc" : "dang_tuyen";

  hienThiThongTinJD(item);
  khoaFormXem();
  moModal();
  taiCVTheoDot(item.dot).then(() => {
    if (dangXem && window.dotTuyenDangXem === item && $("modal").classList.contains("hien")) {
      $("tieuDeModal").nextElementSibling.textContent = "Thông tin chiến dịch và bản mô tả công việc.";
    }
  }).catch(error => {
    console.error("Không tải được CV của đợt tuyển dụng:", error);
    if (dangXem && window.dotTuyenDangXem === item) {
      $("tieuDeModal").nextElementSibling.textContent = "Không thể tải đầy đủ thông tin. Vui lòng thử lại.";
    }
  });
}

async function taiCVTheoDot(dot) {
  const container = $("jdThongTinNoiDung");
  let section = container.querySelector(".danh-sach-cv-dot");
  if (!section) {
    section = document.createElement("section");
    section.className = "danh-sach-cv-dot";
    container.appendChild(section);
  }
  section.replaceChildren();
  const heading = document.createElement("div");
  heading.className = "cv-dot-heading";
  const title = document.createElement("h3");
  title.textContent = "CV đã nhận";
  const dotDaDong = laDotDaDong(dot);
  heading.appendChild(title);
  if (!dotDaDong && ["admin", "manager", "hr"].includes(layVaiTro())) {
    const addCv = document.createElement("button");
    addCv.type = "button";
    addCv.className = "btn-them-cv-dot";
    addCv.textContent = "+ Thêm CV";
    addCv.addEventListener("click", () => moUploadDotTuyen(dot));
    heading.appendChild(addCv);
  }
  section.appendChild(heading);
  const loading = document.createElement("p"); loading.textContent = "Đang tải danh sách CV..."; section.appendChild(loading);
  try {
    let result;
    try {
      result = await api(`${API}/cv/review/candidates?dot_tuyen_id=${encodeURIComponent(dot.id)}`);
    } catch (_) {
      result = await api(`${API}/ung-vien?dot_tuyen_id=${encodeURIComponent(dot.id)}`);
    }
    const candidates = (Array.isArray(result) ? result : (result.data || []))
      .sort((a, b) => (Number(b.diem_ai) || 0) - (Number(a.diem_ai) || 0));
    section.replaceChildren(); section.appendChild(heading);
    title.textContent = `CV đã nhận (${candidates.length})`;
    if (!candidates.length) {
      const empty = document.createElement("p"); empty.textContent = "Chưa nhận CV cho đợt tuyển dụng này.";
      section.appendChild(empty); return;
    }
    const rankingControls = document.createElement("div"); rankingControls.className = "cv-dot-ranking-controls";
    rankingControls.innerHTML = '<label>Lọc trạng thái<select data-filter="status"><option value="all">Tất cả trạng thái</option><option value="moi">Chưa hẹn</option><option value="scheduled">Đã hẹn</option><option value="hired">Đã tuyển</option><option value="rejected">Đã từ chối</option></select></label><label>Sắp xếp<select data-filter="sort"><option value="score-desc">Điểm: cao đến thấp</option><option value="score-asc">Điểm: thấp đến cao</option><option value="name-asc">Tên A–Z</option></select></label>';
    section.appendChild(rankingControls);
    const table = document.createElement("div"); table.className = "cv-dot-table-wrap";
    const tableEl = document.createElement("table"); tableEl.className = "cv-dot-table";
    tableEl.innerHTML = "<thead><tr><th>STT</th><th>Ứng viên</th><th>Điểm tương thích</th><th>Trạng thái</th><th>Ngày hẹn phỏng vấn</th><th>Thao tác</th></tr></thead>";
    const tbody = document.createElement("tbody");
    candidates.forEach((candidate, index) => {
      const tr = document.createElement("tr");
      const scoreForSort = [candidate.diem_ai, candidate.diem_ghi_de, candidate.phan_tich?.score?.tong, candidate.phan_tich?.score?.total, candidate.phan_tich?.diem_phu_hop, candidate.phan_tich?.diem].map(Number).find(Number.isFinite);
      const analysisForFilter = JSON.stringify(candidate.phan_tich || candidate.du_lieu_phan_tich || {});
      tr.dataset.score = Number.isFinite(scoreForSort) ? String(scoreForSort) : "-1";
      tr.dataset.name = String(candidate.ho_ten || "").toLocaleLowerCase("vi");
      tr.dataset.status = ["tu_choi", "tu-choi", "rejected"].includes(String(candidate.trang_thai || "").toLowerCase()) ? "rejected" : ["da_tuyen", "hired"].includes(String(candidate.trang_thai || "").toLowerCase()) ? "hired" : [true, 1, "1", "true"].includes(candidate.co_lich_phong_van) ? "scheduled" : "moi";
      tr.dataset.skills = analysisForFilter.toLocaleLowerCase("vi");
      tr.dataset.experience = String(Number(candidate.so_nam_kinh_nghiem ?? candidate.phan_tich?.so_nam_kinh_nghiem ?? candidate.phan_tich?.years_of_experience ?? 0) || 0);
      const stt = document.createElement("td"); stt.textContent = String(index + 1);
      const details = document.createElement("td");
      const name = document.createElement("button");
      name.type = "button";
      name.className = "cv-dot-candidate-toggle";
      name.textContent = candidate.ho_ten || "Ứng viên";
      name.setAttribute("aria-expanded", "false");
      const contact = document.createElement("small"); contact.textContent = `${candidate.so_dien_thoai || candidate.sdt || "Chưa có SĐT"} · ${candidate.email || "Chưa có email"}`;
      details.append(name, contact);
      const score = document.createElement("td");
      const scoreCandidates = [candidate.diem_ai, candidate.diem_ghi_de, candidate.phan_tich?.score?.tong, candidate.phan_tich?.score?.total, candidate.phan_tich?.diem_phu_hop, candidate.phan_tich?.diem];
      const rawScore = scoreCandidates.find(value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)));
      const scoreValue = rawScore === undefined ? NaN : Number(rawScore);
      score.textContent = Number.isFinite(scoreValue) ? `${Math.round(scoreValue * 10) / 10}/100` : "Chưa phân tích";
      const statusCell = document.createElement("td");
      const statusValue = String(candidate.trang_thai || "moi").toLowerCase();
      let statusLabel = "Chưa hẹn";
      const hasActiveAppointment = [true, 1, "1", "true"].includes(candidate.co_lich_phong_van);
      if (["tu_choi", "tu-choi", "rejected"].includes(statusValue)) statusLabel = "Đã từ chối";
      else if (["da_tuyen", "hired"].includes(statusValue)) statusLabel = "Đã tuyển";
      else if (["da_phong_van", "da_phong_van_xong", "interviewed"].includes(statusValue)) statusLabel = "Đã phỏng vấn";
      else if (hasActiveAppointment) statusLabel = "Đã hẹn";
      statusCell.textContent = statusLabel === "Chưa hẹn" ? "" : statusLabel;
      statusCell.className = `cv-dot-status-cell ${statusLabel === "Đã từ chối" ? "is-rejected" : statusLabel === "Đã tuyển" ? "is-hired" : statusLabel === "Đã hẹn" ? "is-scheduled" : statusLabel === "Đã phỏng vấn" ? "is-interviewed" : "is-unscheduled"}`;
      const appointmentCell = document.createElement("td");
      appointmentCell.className = "cv-dot-appointment-cell";
      if (["Đã hẹn", "Đã phỏng vấn"].includes(statusLabel) && candidate.thoi_gian_phong_van) {
        const rawTime = String(candidate.thoi_gian_phong_van);
        const match = rawTime.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
        if (match && /Z$/i.test(rawTime)) {
          const date = new Date(rawTime);
          const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date).reduce((out, part) => (out[part.type] = part.value, out), {});
          appointmentCell.textContent = `${parts.hour}:${parts.minute} ${parts.day}/${parts.month}/${parts.year}`;
        } else {
          appointmentCell.textContent = match
            ? `${match[4] ? `${match[4]}:${match[5]} ` : ""}${match[3]}/${match[2]}/${match[1]}`
            : rawTime;
        }
      } else {
        appointmentCell.textContent = "";
      }
      const actionsCell = document.createElement("td"); const actions = document.createElement("div"); actions.className = "cv-dot-actions";
      const interviewId = candidate.phong_van_id || candidate.id_phong_van || candidate.id_lich_phong_van || null;
      const role = layVaiTro();
      const laNguoiPhongVan = ["interviewer", "interview", "nguoi_phong_van", "nguoiphongvan", "phong_van"].includes(role);
      const duocPhanCong = [true, 1, "1", "true"].includes(candidate.duoc_phan_cong);
      if (candidate.cv_id && !laNguoiPhongVan) {
        const deleteCv = document.createElement("button"); deleteCv.type = "button"; deleteCv.className = "btn-xoa-cv"; deleteCv.textContent = "Xóa CV";
        deleteCv.addEventListener("click", async () => {
          if (!confirm(`Xóa CV của ${candidate.ho_ten || "ứng viên này"} sẽ xóa luôn hồ sơ ứng viên và dữ liệu liên quan. Bạn có chắc chắn không?`)) return;
          deleteCv.disabled = true; deleteCv.textContent = "Đang xóa…";
          try {
            await api(`${API}/ung-vien/${candidate.id}/cv/${candidate.cv_id}`, { method: "DELETE" });
            hienThongBaoCVDot("Đã xóa CV và ứng viên thành công.", true);
            await taiCVTheoDot(dot);
          } catch (error) {
            deleteCv.disabled = false; deleteCv.textContent = "Xóa CV";
            alert(error.message || "Không thể xóa CV. Có thể tài khoản chưa có quyền xóa.");
          }
        }); actions.appendChild(deleteCv);
      }
      const daTuChoi = statusLabel === "Đã từ chối";
      if (!daTuChoi && statusLabel !== "Đã tuyển") {
        if (["Đã hẹn", "Đã phỏng vấn"].includes(statusLabel)) {
          if (!laNguoiPhongVan) {
          const reschedule = document.createElement("button"); reschedule.type = "button"; reschedule.textContent = "Đổi ngày hẹn";
          reschedule.addEventListener("click", async () => {
            let resolvedId = interviewId;
            if (!resolvedId) {
              try { const schedules = await api(`${API}/phong-van`); const rows = Array.isArray(schedules) ? schedules : (schedules.data || []); const found = rows.find(item => Number(item.ung_vien_id) === Number(candidate.id) && String(item.trang_thai || "").toLowerCase() !== "huy"); resolvedId = found?.id || null; } catch (_) {}
            }
            if (resolvedId) moFormHenPhongVan(candidate, dot, resolvedId);
            else alert("Không tìm thấy lịch phỏng vấn đang hoạt động. Hãy tải lại danh sách CV.");
          });
          actions.appendChild(reschedule);
          const cancelAppointment = document.createElement("button"); cancelAppointment.type = "button"; cancelAppointment.className = "btn-xoa-cv"; cancelAppointment.textContent = "Hủy lịch";
          cancelAppointment.addEventListener("click", async () => {
            let resolvedId = interviewId;
            if (!resolvedId) {
              try { const schedules = await api(`${API}/phong-van`); const rows = Array.isArray(schedules) ? schedules : (schedules.data || []); const found = rows.find(item => Number(item.ung_vien_id) === Number(candidate.id) && String(item.trang_thai || "").toLowerCase() !== "huy"); resolvedId = found?.id || null; } catch (_) {}
            }
            if (!resolvedId) { alert("Không tìm thấy lịch phỏng vấn đang hoạt động. Hãy tải lại danh sách."); return; }
            if (!confirm(`Hủy lịch phỏng vấn của ${candidate.ho_ten || "ứng viên này"}?`)) return;
            cancelAppointment.disabled = true; cancelAppointment.textContent = "Đang hủy…";
            try {
              await api(`${API}/phong-van/${resolvedId}/trang-thai`, { method: "PATCH", body: JSON.stringify({ trang_thai: "huy" }) });
              hienThongBaoCVDot("Đã hủy lịch phỏng vấn.", true);
              await taiCVTheoDot(dot);
            } catch (error) {
              cancelAppointment.disabled = false; cancelAppointment.textContent = "Hủy lịch";
              alert(error.message || "Không thể hủy lịch phỏng vấn.");
            }
          });
          actions.appendChild(cancelAppointment);
          }
          if (!laNguoiPhongVan || duocPhanCong) {
          const evaluate = document.createElement("button");
          evaluate.type = "button";
          evaluate.className = "btn-danh-gia-cv";
          evaluate.textContent = "Đánh giá";
          evaluate.addEventListener("click", async () => {
            let resolvedId = interviewId;
            if (!resolvedId) {
              try {
                const schedules = await api(`${API}/phong-van`);
                const rows = Array.isArray(schedules) ? schedules : (schedules.data || []);
                const found = rows.find(item => Number(item.ung_vien_id) === Number(candidate.id) && String(item.trang_thai || "").toLowerCase() !== "huy");
                resolvedId = found?.id || null;
              } catch (_) {}
            }
            if (!resolvedId) { alert("Không tìm thấy lịch phỏng vấn đang hoạt động. Hãy tải lại danh sách CV."); return; }
            const dialog = document.getElementById("modalDanhGiaNhanh");
            const frame = document.getElementById("iframeDanhGiaNhanh");
            if (!dialog || !frame) { alert("Không mở được biểu mẫu đánh giá. Hãy tải lại trang."); return; }
            frame.src = `/danh-gia/danh-gia.html?phong_van_id=${encodeURIComponent(resolvedId)}&embed=1`;
            dialog.classList.add("show");
            dialog.setAttribute("aria-hidden", "false");
          });
          actions.appendChild(evaluate);
          }
        } else if (!laNguoiPhongVan) {
          const schedule = document.createElement("button"); schedule.type = "button"; schedule.textContent = "Hẹn phỏng vấn";
          schedule.addEventListener("click", () => moFormHenPhongVan(candidate, dot)); actions.appendChild(schedule);
        }
      }
      if (actions.children.length > 0) {
        const menuWrap = document.createElement("div"); menuWrap.className = "cv-more-wrap";
        const toggle = document.createElement("button"); toggle.type = "button"; toggle.className = "cv-more-toggle"; toggle.textContent = "…"; toggle.title = "Thao tác khác"; toggle.setAttribute("aria-label", "Thao tác khác"); toggle.setAttribute("aria-expanded", "false");
        const menu = document.createElement("div"); menu.className = "cv-more-menu";
        [...actions.children].forEach(button => menu.appendChild(button));
        toggle.addEventListener("click", event => {
          event.stopPropagation();
          document.querySelectorAll(".cv-more-wrap.open").forEach(el => { if (el !== menuWrap) { el.classList.remove("open"); el.querySelector(".cv-more-toggle")?.setAttribute("aria-expanded", "false"); } });
          const open = menuWrap.classList.toggle("open"); toggle.setAttribute("aria-expanded", String(open));
          if (open) {
            const rect = toggle.getBoundingClientRect();
            menu.style.position = "fixed";
            menu.style.left = Math.max(8, Math.min(rect.right - 190, window.innerWidth - 198)) + "px";
            menu.style.top = Math.max(8, Math.min(rect.bottom + 5, window.innerHeight - 260)) + "px";
          }
        });
        document.addEventListener("click", event => { if (!menuWrap.contains(event.target)) { menuWrap.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); menu.style.left = ""; menu.style.top = ""; } });
        menuWrap.append(toggle, menu); actions.appendChild(menuWrap);
      }
      actionsCell.appendChild(actions);
      tr.append(stt, details, score, statusCell, appointmentCell, actionsCell); tbody.appendChild(tr);
      const moRecap = () => {
        if (document.querySelector(".cv-dot-modal-ai-review")) return;
        const { modal } = taoModalCV("", "cv-dot-modal-ai-review");
        const content = document.createElement("div");
        content.className = "cv-dot-review-content";
        content.textContent = "Đang tải CV và kết quả phân tích...";
        modal.appendChild(content);
        hienThiChiTietUngVien(content, candidate, dot).catch(error => {
          content.textContent = error.message || "Không tải được CV và kết quả đánh giá.";
        });
      };
      details.classList.add("cv-dot-candidate-click-area");
      details.setAttribute("role", "button");
      details.setAttribute("tabindex", "0");
      details.setAttribute("aria-label", `Mở CV và đánh giá của ${candidate.ho_ten || "ứng viên"}`);
      details.addEventListener("click", moRecap);
      details.addEventListener("keydown", event => {
        if (event.target === details && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); moRecap(); }
      });
      tr.classList.add("cv-dot-row-clickable");
      tr.setAttribute("tabindex", "0");
      tr.setAttribute("aria-label", `Mở CV và đánh giá của ${candidate.ho_ten || "ứng viên"}`);
      tr.addEventListener("click", event => {
        if (event.target.closest("button, a, input, select, textarea, label, [role='button']")) return;
        moRecap();
      });
      tr.addEventListener("keydown", event => {
        if ((event.key === "Enter" || event.key === " ") && event.target === tr) { event.preventDefault(); moRecap(); }
      });
    });
    tableEl.appendChild(tbody); table.appendChild(tableEl); section.appendChild(table);
    const applyCandidateFilters = () => {
      const statusFilter = rankingControls.querySelector('[data-filter="status"]').value;
      const sortMode = rankingControls.querySelector('[data-filter="sort"]').value;
      const rows = [...tbody.querySelectorAll("tr")];
      rows.sort((a, b) => sortMode === "score-asc" ? Number(a.dataset.score) - Number(b.dataset.score) : sortMode === "name-asc" ? a.dataset.name.localeCompare(b.dataset.name, "vi") : Number(b.dataset.score) - Number(a.dataset.score));
      let visibleIndex = 0;
      rows.forEach(row => { const visible = statusFilter === "all" || row.dataset.status === statusFilter; row.hidden = !visible; if (visible) visibleIndex += 1; row.cells[0].textContent = String(visible ? visibleIndex : "—"); tbody.appendChild(row); });
    };
    rankingControls.addEventListener("input", applyCandidateFilters);
    rankingControls.addEventListener("change", applyCandidateFilters);
    applyCandidateFilters();
  } catch (error) {
    section.replaceChildren(); section.appendChild(heading);
    const message = document.createElement("p"); message.textContent = error.message || "Không tải được danh sách CV"; section.appendChild(message);
  }
}

async function hienThiChiTietUngVien(container, candidate, dot) {
  container.replaceChildren();
  const panel = document.createElement("div"); panel.className = "cv-dot-candidate-detail";
  const info = document.createElement("section"); info.className = "cv-dot-detail-section cv-dot-candidate-info-strip";
  const infoGrid = document.createElement("div"); infoGrid.className = "cv-dot-detail-grid"; info.appendChild(infoGrid); panel.appendChild(info);
  const addInfo = (label, value) => { if (value === null || value === undefined || String(value).trim() === "") return; const item = document.createElement("div"); item.className = "cv-dot-detail-item"; const key = document.createElement("strong"); key.textContent = label; const val = document.createElement("span"); val.textContent = String(value); item.append(key, val); infoGrid.appendChild(item); };
  const cvSection = document.createElement("section"); cvSection.className = "cv-dot-detail-section cv-dot-cv-section";
  const cvTitleRow = document.createElement("div"); cvTitleRow.className = "cv-dot-cv-title-row";
  const cvTitle = document.createElement("h4"); cvTitle.textContent = "CV ứng viên";
  const reanalyzeButton = document.createElement("button"); reanalyzeButton.type = "button"; reanalyzeButton.className = "cv-dot-reanalyze-button"; reanalyzeButton.textContent = "Phân tích lại"; reanalyzeButton.hidden = true;
  cvTitleRow.append(cvTitle, reanalyzeButton); cvSection.appendChild(cvTitleRow);
  const cvContent = document.createElement("div"); cvContent.className = "cv-dot-inline-preview"; cvContent.textContent = "Đang tải tệp CV..."; cvSection.appendChild(cvContent); panel.appendChild(cvSection);
  const analysisSection = document.createElement("section"); analysisSection.className = "cv-dot-detail-section cv-dot-ai-section";
  const analysisHeader = document.createElement("div"); analysisHeader.className = "cv-dot-analysis-header";
  const analysisTitle = document.createElement("h4"); analysisTitle.textContent = "Phân tích và đánh giá"; analysisHeader.appendChild(analysisTitle);
  const editButton = document.createElement("button"); editButton.type = "button"; editButton.className = "cv-dot-edit-ai-button"; editButton.textContent = "Sửa"; analysisSection.appendChild(analysisHeader);
  const analysisContent = document.createElement("div"); analysisContent.className = "cv-dot-ai-detail"; analysisContent.textContent = "Đang tải kết quả phân tích..."; analysisSection.appendChild(analysisContent); panel.appendChild(analysisSection);
  container.appendChild(panel);
  let detail = null;
  let detailLoadError = null;
  try { detail = await api(`${API}/cv/review/${candidate.id}`); } catch (error) { detailLoadError = error; }
  const profile = detail?.ung_vien || candidate;
  if (detailLoadError) {
    const note = document.createElement("p");
    note.className = "cv-dot-detail-error";
    note.textContent = `Không tải được toàn bộ dữ liệu chi tiết: ${detailLoadError.message || "Lỗi máy chủ"}. Đang hiển thị dữ liệu có sẵn trong danh sách.`;
    panel.prepend(note);
  }
  infoGrid.replaceChildren();
  addInfo("Họ và tên", profile.ho_ten); addInfo("Email", profile.email); addInfo("Số điện thoại", profile.so_dien_thoai || profile.sdt); addInfo("Địa chỉ", profile.dia_chi); addInfo("LinkedIn", profile.linkedin); addInfo("GitHub", profile.github); addInfo("Nguồn ứng viên", profile.nguon);
  const cvList = Array.isArray(detail?.cv) ? detail.cv : [];
  const cv = cvList[0] || null;
  const jds = Array.isArray(detail?.jd) ? detail.jd : [];
  const selectedJd = jds.find(item => Number(item.dot_tuyen_id || item.dot_tuyen?.id) === Number(dot.id)) || jds[0] || null;
  const analysisExists = Boolean(detail?.phan_tich?.id || detail?.phan_tich?.du_lieu_phan_tich || detail?.phan_tich?.du_lieu || candidate.phan_tich);
  reanalyzeButton.hidden = !cv?.id || !selectedJd?.id;
  reanalyzeButton.textContent = analysisExists ? "Phân tích lại" : "Phân tích CV";
  reanalyzeButton.addEventListener("click", async () => {
    if (!cv?.id || !selectedJd?.id) return;
    reanalyzeButton.disabled = true; reanalyzeButton.textContent = "Đang phân tích...";
    const error = document.createElement("p"); error.className = "cv-dot-detail-error"; error.textContent = "AI đang phân tích CV, vui lòng chờ..."; cvContent.replaceChildren(error);
    try {
      const analyzed = await api(`${API}/cv/review/${profile.id}/analyze`, { method: "POST", body: JSON.stringify({ cv_id: cv.id, jd_id: selectedJd.id }) });
      const analysisResult = analyzed?.phan_tich;
      const total = Number(analysisResult?.score?.tong ?? analysisResult?.score?.total ?? analysisResult?.diem_phu_hop);
      if (!analysisResult || !Number.isFinite(total)) throw new Error("AI chưa trả đủ kết quả để lưu.");
      const confirmResult = await api(`${API}/cv/review/${profile.id}/confirm`, { method: "POST", body: JSON.stringify({ cv_id: cv.id, jd_id: selectedJd.id, phan_tich: analysisResult, diem: total, de_xuat: analysisResult?.score?.de_xuat || (total < 60 ? "chua_phu_hop" : total < 80 ? "can_nhac" : "nen_phong_van"), ly_do: "Phân tích từ form CV ứng viên." }) });
      hienThongBaoCVDot(confirmResult?.message || "Đã phân tích và lưu CV thành công.", true);
      await hienThiChiTietUngVien(container, candidate, dot);
    } catch (error) {
      cvContent.textContent = error.message || "Không thể phân tích CV.";
      reanalyzeButton.disabled = false; reanalyzeButton.textContent = analysisExists ? "Phân tích lại" : "Phân tích CV";
    }
  });
  addInfo("Tệp CV", cv?.ten_file || candidate.ten_file);
  if (cv?.loai_file) addInfo("Định dạng", cv.loai_file);
  if (cv?.ngay_tai_len) addInfo("Ngày tải lên", new Date(cv.ngay_tai_len).toLocaleString("vi-VN"));
  const rawAnalysis = detail?.phan_tich?.du_lieu_phan_tich || detail?.phan_tich?.du_lieu || candidate.phan_tich?.du_lieu_phan_tich || candidate.phan_tich;
  let analysis = typeof rawAnalysis === "string" ? (() => { try { return JSON.parse(rawAnalysis); } catch { return null; } })() : rawAnalysis;
  const storedAnalysis = detail?.phan_tich || candidate.phan_tich || {};
  if (!analysis || typeof analysis !== "object") analysis = {};
  const storedFields = { tom_tat: storedAnalysis.tom_tat, diem_manh: storedAnalysis.diem_manh, diem_yeu: storedAnalysis.diem_yeu, canh_bao: storedAnalysis.canh_bao, giai_thich: storedAnalysis.giai_thich, goi_y: storedAnalysis.goi_y };
  for (const [key, value] of Object.entries(storedFields)) {
    if ((analysis[key] === undefined || analysis[key] === null || analysis[key] === "") && value !== undefined && value !== null && value !== "") {
      if (typeof value === "string" && /^[\[{]/.test(value.trim())) { try { analysis[key] = JSON.parse(value); } catch { analysis[key] = value; } }
      else analysis[key] = value;
    }
  }
  let scoreRaw = detail?.phan_tich?.diem_phu_hop ?? detail?.phan_tich?.diem ?? candidate.diem_ai ?? candidate.diem_ghi_de ?? analysis?.score?.tong ?? analysis?.score?.total;
  analysisContent.replaceChildren();
  const preferredLabels = {
    summary: "Tóm tắt", tom_tat: "Tóm tắt", summary_candidate: "Tóm tắt ứng viên", strengths: "Điểm mạnh", diem_manh: "Điểm mạnh", weaknesses: "Điểm yếu", diem_yeu: "Điểm yếu", matched_skills: "Kỹ năng phù hợp", ky_nang_phu_hop: "Kỹ năng phù hợp", missing_skills: "Kỹ năng còn thiếu", ky_nang_thieu: "Kỹ năng còn thiếu", recommendation: "Đề xuất", de_xuat: "Đề xuất", explanation: "Giải thích điểm số", ly_do: "Lý do đánh giá", flags: "Lưu ý", canh_bao: "Lưu ý", experience: "Kinh nghiệm", kinh_nghiem: "Kinh nghiệm", education: "Học vấn", hoc_van: "Học vấn", skills: "Kỹ năng", ky_nang: "Kỹ năng", certifications: "Chứng chỉ", projects: "Dự án", languages: "Ngoại ngữ", achievements: "Thành tựu", work_experience: "Kinh nghiệm làm việc", education_level: "Trình độ học vấn", contact: "Thông tin liên hệ", overall: "Đánh giá tổng quan", criteria: "Tiêu chí đánh giá", match_reason: "Mức độ phù hợp", details: "Chi tiết đánh giá"
  };
  const normalizeKey = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[_-]+/g, " ").trim();
  const extraLabels = { "chung chi": "Chứng chỉ", "hoc van": "Học vấn", "ung vien trung tiem nang": "", "can nhac": "Cân nhắc", "nen phong van": "Nên phỏng vấn", "chua phu hop": "Chưa phù hợp", "extraction": "", "score": "Điểm", "recommendation": "Đề xuất", "linkedin": "LinkedIn", "github": "GitHub", "portfolio": "Portfolio", "school": "Trường học", "major": "Ngành học", "degree": "Bằng cấp", "year": "Năm", "company": "Công ty", "position": "Chức danh", "duration": "Thời gian", "description": "Mô tả", "matched skills": "Kỹ năng khớp", "missing skills": "Kỹ năng còn thiếu", "soft skills": "Kỹ năng mềm", "gap": "Khoảng trống công việc", "job hopping": "Nhảy việc nhiều", "contact missing": "Thiếu thông tin liên hệ", "flags": "Cờ cảnh báo" };
  const labels = value => preferredLabels[value] || extraLabels[normalizeKey(value)] || String(value).replace(/[_-]+/g, " ").replace(/\b\w/g, char => char.toUpperCase());
  const hiddenKeys = new Set(["score", "tong", "total", "cv_id", "jd_id", "ung_vien_id", "ly_do_xac_nhan", "ly_do_xac_nhan_ai", "reason", "nha_cung_cap", "provider", "model", "cham_diem", "trich_xuat", "extraction", "metadata", "ung vien trung tiem nang"]);
  const displayFieldOrder = ["diem manh", "strengths", "diem yeu", "weaknesses", "chung chi", "certifications", "kinh nghiem", "experience", "work experience", "ky nang", "skills", "matched skills", "missing skills", "ngoai ngu", "languages", "so nam kinh nghiem", "years of experience", "skill scores", "cham diem ky nang", "criteria scores", "tom tat", "summary"];
  const displayRank = key => { const normalized = normalizeKey(key); const index = displayFieldOrder.indexOf(normalized); return index < 0 ? 99 : index; };
  const displaySpecs = [
    { label: "Họ tên", aliases: ["ho ten", "name", "full name", "candidate name"], fallback: profile.ho_ten },
    { label: "SĐT", aliases: ["so dien thoai", "sdt", "phone", "phone number", "mobile"], fallback: profile.so_dien_thoai || profile.sdt },
    { label: "Email", aliases: ["email", "email address"], fallback: profile.email },
    { label: "Học vấn", aliases: ["hoc van", "education", "education history"] },
    { label: "Điểm mạnh", aliases: ["diem manh", "strengths", "strength", "strength points"], fallback: storedAnalysis.diem_manh },
    { label: "Điểm yếu", aliases: ["diem yeu", "diem can cai thien", "weaknesses", "weakness", "areas to improve"], fallback: storedAnalysis.diem_yeu },
    { label: "Chứng chỉ", aliases: ["chung chi", "certifications", "certificates", "certificate"] },
    { label: "Kỹ năng", aliases: ["ky nang", "skills", "skill"] },
    { label: "Số năm kinh nghiệm", aliases: ["so nam kinh nghiem", "years of experience", "experience years", "years experience"] },
    { label: "Kỹ năng còn thiếu", aliases: ["missing skills", "ky nang thieu", "ky nang con thieu"] },
    { label: "Cờ cảnh báo", aliases: ["co canh bao", "flags", "warning flags", "warnings", "canh bao"], fallback: storedAnalysis.canh_bao },
    { label: "Tóm tắt", aliases: ["tom tat", "summary", "summary candidate", "overall summary"], fallback: storedAnalysis.tom_tat },
    { label: "Điểm thành phần", aliases: ["diem thanh phan", "component scores", "criteria scores", "skill scores"] },
    { label: "Điểm tương thích", aliases: ["compatibility score", "diem tuong thich", "match score"], fallback: scoreRaw },
    { label: "Đề xuất", aliases: ["de xuat", "recommendation"], fallback: analysis?.score?.de_xuat || storedAnalysis.de_xuat },
    { label: "Ghi chú", aliases: ["ghi chu", "ly do", "reason", "explanation", "giai thich", "ly do danh gia"], fallback: storedAnalysis.ly_do_ghi_de || storedAnalysis.ly_do || storedAnalysis.giai_thich }
  ];
  const findAnalysisValue = aliases => {
    let found;
    let objectFallback;
    const visit = obj => {
      if (found !== undefined || !obj || typeof obj !== "object") return;
      for (const [key, value] of Object.entries(obj)) {
        if (aliases.includes(normalizeKey(key)) && value !== null && value !== undefined && value !== "") {
          if (value && typeof value === "object" && !Array.isArray(value)) objectFallback ??= value;
          else { found = value; return; }
        }
        if (value && typeof value === "object") visit(value);
        if (found !== undefined) return;
      }
    };
    visit(analysis);
    return found !== undefined ? found : objectFallback;
  };
  const displayText = value => {
    const flattenObject = (object, prefix = "") => Object.entries(object).flatMap(([key, child]) => {
      const label = labels(key);
      const nextPrefix = prefix ? `${prefix} / ${label}` : label;
      if (child && typeof child === "object" && !Array.isArray(child)) return flattenObject(child, nextPrefix);
      if (Array.isArray(child)) return child.map(item => `- ${nextPrefix}: ${item && typeof item === "object" ? displayText(item) : String(item ?? "")}`);
      return [`- ${nextPrefix}: ${String(child ?? "")}`];
    }).join("\n");
    if (Array.isArray(value)) return value.map(item => item && typeof item === "object" ? displayText(item) : `- ${String(item ?? "")}`).filter(line => line && line !== "- [object Object]").join("\n");
    if (value && typeof value === "object") return flattenObject(value).split("\n").filter(line => !line.includes("[object Object]")).join("\n");
    if (typeof value === "string" && value.includes("\n")) return value.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => line.startsWith("-") ? line : `- ${line}`).join("\n");
    const normalized = normalizeKey(value);
    if (normalized === "can nhac") return "Cân nhắc";
    if (normalized === "nen phong van") return "Nên phỏng vấn";
    if (normalized === "chua phu hop") return "Chưa phù hợp";
    return String(value ?? "");
  };
  const renderAnalysisDisplay = () => {
    analysisContent.replaceChildren();
    const componentSpecs = [
      { key: "skill_score", label: "Kỹ năng", aliases: ["skill score", "skills score", "diem ky nang", "ky nang", "skill", "skills", "skill_score"] },
      { key: "experience_score", label: "Kinh nghiệm", aliases: ["experience score", "diem kinh nghiem", "kinh nghiem", "experience", "experience_score"] },
      { key: "education_score", label: "Học vấn", aliases: ["education score", "diem hoc van", "hoc van", "education", "education_score"] },
      { key: "soft_skills_score", label: "Kĩ năng mềm", aliases: ["soft skills score", "diem ky nang mem", "ky nang mem", "soft skills", "soft_skills", "soft_skills_score"] }
    ];
    for (const spec of displaySpecs) {
      let value = findAnalysisValue(spec.aliases);
      if (value === undefined || value === null || value === "") value = spec.fallback;
      if (spec.label === "Điểm thành phần") {
        const scoreRoot = analysis?.score && typeof analysis.score === "object" ? analysis.score : {};
        const componentRoot = findAnalysisValue(["component scores", "criteria scores", "skill scores", "diem thanh phan", "cham diem ky nang"]);
        const rows = componentSpecs.map(part => {
          let point = scoreRoot[part.key];
          if (point === undefined) point = Object.entries(scoreRoot).find(([key]) => part.aliases.includes(normalizeKey(key)))?.[1];
          if (point === undefined && componentRoot && typeof componentRoot === "object") point = Object.entries(componentRoot).find(([key]) => part.aliases.includes(normalizeKey(key)))?.[1];
          return { label: part.label, value: point };
        });
        const item = document.createElement("div"); item.className = "cv-dot-ai-item";
        const title = document.createElement("strong"); title.textContent = "Điểm thành phần:"; item.appendChild(title);
        const text = document.createElement("div"); text.className = "cv-dot-ai-review-text";
        text.textContent = rows.map(row => `- ${row.label}: ${row.value === undefined || row.value === null || row.value === "" ? "—" : `${displayText(row.value)}${String(row.value).includes("/") ? "" : "/100"}`}`).join("\n"); item.appendChild(text); analysisContent.appendChild(item); continue;
      }
      if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0) || (typeof value === "object" && !Array.isArray(value) && (Object.keys(value).length === 0 || !Object.values(value).some(item => item !== null && item !== undefined && item !== "" && (!Array.isArray(item) || item.length)))) ) continue;
      if (spec.label === "Học vấn") {
        const flattenedEducation = displayText(value).split("\n").map(line => line.replace(/^[-•]\s*/, "").trim()).filter(line => line && line !== "[object Object]").join(" · ").trim();
        if (!flattenedEducation) continue;
        value = flattenedEducation;
      }
      if (spec.label === "Cờ cảnh báo") {
        const warningText = Array.isArray(value) ? value.map(item => typeof item === "object" ? JSON.stringify(item) : String(item)).join(" ") : typeof value === "object" ? JSON.stringify(value) : String(value);
        if (!warningText.trim() || /một số trích dẫn|some citations|no specific flags|không có cảnh báo|không có cờ cảnh báo|không nhảy việc nhiều|không có dấu hiệu nhảy việc|no warning|no job hopping|job[_ ]hopping.{0,15}(false|no|none)/i.test(warningText)) continue;
        if (/^(false|no|none|không|không có|n\/a|null|\[\])$/i.test(warningText.trim())) continue;
      }
      const item = document.createElement("div"); item.className = "cv-dot-ai-item";
      const title = document.createElement("strong"); title.textContent = `${spec.label}:`;
      const text = document.createElement("div"); text.className = "cv-dot-ai-review-text";
      if (spec.label === "Điểm tương thích") {
        text.textContent = `${Math.round(Number(value) * 10) / 10}/100`;
      } else {
        text.textContent = displayText(value);
      }
      item.append(title, text); analysisContent.appendChild(item);
    }
    if (!analysisContent.childElementCount) { const noAnalysis = document.createElement("p"); noAnalysis.textContent = "Chưa có kết quả phân tích được lưu cho ứng viên này."; analysisContent.appendChild(noAnalysis); }
  };
  renderAnalysisDisplay();
  const editForm = document.createElement("form"); editForm.className = "cv-dot-edit-ai-form"; editForm.hidden = true;
  const editFields = [];
  const fieldAliases = [
    { key: "ho_ten", label: "Họ tên", type: "profile", aliases: ["ho ten", "name", "full name", "candidate name"] },
    { key: "so_dien_thoai", label: "SĐT", type: "profile", aliases: ["so dien thoai", "sdt", "phone", "phone number", "mobile"] },
    { key: "email", label: "Email", type: "profile", aliases: ["email", "email address"] },
    { label: "Học vấn", aliases: ["hoc van", "education", "education history"] },
    { label: "Điểm mạnh", aliases: ["diem manh", "strengths", "strength", "strength points"] },
    { label: "Điểm yếu", aliases: ["diem yeu", "diem can cai thien", "weaknesses", "weakness", "areas to improve"] },
    { label: "Chứng chỉ", aliases: ["chung chi", "certifications", "certificates", "certificate"] },
    { label: "Kỹ năng", aliases: ["ky nang", "skills", "skill"] },
    { label: "Số năm kinh nghiệm", aliases: ["so nam kinh nghiem", "years of experience", "experience years", "years experience"] },
    { label: "Kỹ năng còn thiếu", aliases: ["missing skills", "ky nang thieu", "ky nang con thieu"] },
    { label: "Cờ cảnh báo", aliases: ["co canh bao", "flags", "warning flags", "warnings", "canh bao"] },
    { label: "Tóm tắt", aliases: ["tom tat", "summary", "summary candidate", "overall summary"] },
    { label: "Điểm thành phần", aliases: ["cham diem ky nang", "skill scores", "skills score", "skill ratings", "diem ky nang", "criteria scores", "component scores", "diem thanh phan"] }
  ];
  const labelOverrides = { "chung chi": "Chứng chỉ", "hoc van": "Học vấn", "can nhac": "Cân nhắc", "nen phong van": "Nên phỏng vấn", "chua phu hop": "Chưa phù hợp", "diem manh": "Điểm mạnh", "diem yeu": "Điểm yếu", "ky nang": "Kỹ năng", "ngoai ngu": "Ngoại ngữ", "tom tat": "Tóm tắt", "so nam kinh nghiem": "Số năm kinh nghiệm", "de xuat": "Đề xuất", "ghi chu": "Ghi chú", "ly do": "Ghi chú" };
  const editHiddenKeys = new Set(["nha cung cap", "provider", "model", "metadata", "extraction", "trich xuat", "ung vien trung tiem nang", "cv id", "jd id", "ung vien id", "ly do xac nhan", "ly do xac nhan ai"]);
  const editLabels = value => labelOverrides[normalizeKey(value)] || String(value ?? "").replace(/[_-]+/g, " ").replace(/\b\w/g, char => char.toUpperCase());
  const aliasFor = key => fieldAliases.find(item => item.aliases.includes(normalizeKey(key)));
  const orderedRank = key => { const found = aliasFor(key); return found ? fieldAliases.indexOf(found) : 99; };
  const profileInputs = {};
  const profileRow = document.createElement("div"); profileRow.className = "cv-dot-edit-ai-profile-row";
  for (const field of fieldAliases.filter(item => item.type === "profile")) {
    const control = document.createElement("input"); control.type = field.key === "email" ? "email" : "text"; control.name = field.key;
    const currentValue = field.key === "ho_ten" ? profile.ho_ten : field.key === "email" ? profile.email : (profile.so_dien_thoai || profile.sdt);
    control.value = currentValue || ""; control.dataset.profileField = field.key;
    const wrap = document.createElement("label"); wrap.className = "cv-dot-edit-ai-field";
    const title = document.createElement("span"); title.textContent = `${field.label}:`; wrap.append(title, control); profileRow.appendChild(wrap); profileInputs[field.key] = control;
  }
  editForm.appendChild(profileRow);
  const candidatesToEdit = [];
  const collectEditableFields = (value, path = []) => {
    if (value === null || value === undefined || editHiddenKeys.has(normalizeKey(path[path.length - 1]))) return;
    if (typeof value === "object" && !Array.isArray(value)) {
      const entries = Object.entries(value).sort(([a], [b]) => orderedRank(a) - orderedRank(b));
      entries.forEach(([key, child]) => collectEditableFields(child, [...path, key]));
      return;
    }
    const key = normalizeKey(path[path.length - 1]);
    if (["score", "tong", "total", "de xuat", "recommendation", "ghi chu", "ly do", "reason"].includes(key)) return;
    const matched = aliasFor(path[path.length - 1]);
    const normalizedPath = path.map(normalizeKey);
    if (normalizedPath[0] === "score") return;
    const parentIsScoredSkills = normalizedPath.some(part => part.includes("skill score") || part.includes("cham diem ky nang") || part.includes("diem ky nang") || part.includes("criteria score")) || (typeof value === "number" && normalizedPath.slice(0, -1).includes("score"));
    const allowed = Boolean(matched && matched.type !== "profile") || parentIsScoredSkills;
    if (!allowed) return;
    const labelText = matched?.label || editLabels(path[path.length - 1]);
    const isNumber = parentIsScoredSkills || (typeof value === "number" && /(^| )(score|diem|tong|total)( |$)/i.test(key)) || /(^| )(score|diem so|tong diem|years|so nam|year)( |$)/i.test(key) && !["diem manh", "diem yeu", "diem can cai thien"].includes(key);
    candidatesToEdit.push({ path, value, labelText, isNumber, rank: matched ? fieldAliases.indexOf(matched) : 10 });
  };
  collectEditableFields(analysis);
  const editDefaults = [
    { key: "hoc_van", label: "Học vấn", aliases: ["hoc van", "education", "education history"] },
    { key: "diem_manh", label: "Điểm mạnh", aliases: ["diem manh", "strengths", "strength", "strength points"] },
    { key: "diem_yeu", label: "Điểm yếu", aliases: ["diem yeu", "diem can cai thien", "weaknesses", "weakness", "areas to improve"] },
    { key: "chung_chi", label: "Chứng chỉ", aliases: ["chung chi", "certifications", "certificates", "certificate"] },
    { key: "ky_nang", label: "Kỹ năng", aliases: ["ky nang", "skills", "skill"] },
    { key: "so_nam_kinh_nghiem", label: "Số năm kinh nghiệm", aliases: ["so nam kinh nghiem", "years of experience", "experience years", "years experience"] },
    { key: "ky_nang_thieu", label: "Kỹ năng còn thiếu", aliases: ["missing skills", "ky nang thieu", "ky nang con thieu"] },
    { key: "canh_bao", label: "Cờ cảnh báo", aliases: ["co canh bao", "flags", "warning flags", "warnings", "canh bao"] },
    { key: "tom_tat", label: "Tóm tắt", aliases: ["tom tat", "summary", "summary candidate", "overall summary"] }
  ];
  for (const field of editDefaults) {
    let existingValue = findAnalysisValue(field.aliases);
    if (field.label === "Cờ cảnh báo" && existingValue !== undefined) {
      const warningText = typeof existingValue === "object" ? JSON.stringify(existingValue) : String(existingValue ?? "");
      if (!warningText.trim() || /một số trích dẫn|some citations|no specific flags|không có cảnh báo|không có cờ cảnh báo|không nhảy việc nhiều|không có dấu hiệu nhảy việc|no warning|no job hopping|job[_ ]hopping.{0,15}(false|no|none)/i.test(warningText) || /^(false|no|none|không|không có|n\/a|null|\[\])$/i.test(warningText.trim())) existingValue = "";
    }
    if (existingValue === undefined || existingValue === "" || (existingValue && typeof existingValue === "object" && !Array.isArray(existingValue))) {
      const initialValue = existingValue && typeof existingValue === "object" ? displayText(existingValue) : (existingValue ?? "");
      candidatesToEdit.push({ path: [field.key], value: initialValue, labelText: field.label, isNumber: false, rank: fieldAliases.findIndex(item => item.label === field.label) });
    }
  }
  candidatesToEdit.sort((a, b) => a.rank - b.rank);
  const seenFieldNames = new Set();
  for (const field of candidatesToEdit) {
    const fieldKey = normalizeKey(field.path[field.path.length - 1]);
    if (seenFieldNames.has(fieldKey) && field.rank < 99) continue;
    seenFieldNames.add(fieldKey);
    const wrap = document.createElement("label"); wrap.className = field.isNumber ? "cv-dot-edit-ai-field cv-dot-edit-ai-score-field" : "cv-dot-edit-ai-field";
    const title = document.createElement("span"); title.textContent = `${field.labelText}:`;
    const control = document.createElement(field.isNumber ? "input" : "textarea");
    if (field.isNumber) { control.type = "number"; control.min = "0"; control.max = "100"; control.step = "0.1"; control.className = "cv-dot-edit-ai-score-input"; }
    else control.rows = Array.isArray(field.value) || String(field.value).length > 110 ? 3 : 2;
    control.value = Array.isArray(field.value) ? field.value.map(item => typeof item === "object" ? displayText(item) : String(item)).join("\n") : String(field.value ?? "");
    control.dataset.valueType = Array.isArray(field.value) ? "array" : typeof field.value; control.dataset.path = JSON.stringify(field.path);
    wrap.append(title, control); editForm.appendChild(wrap); editFields.push(control);
  }
  const scoreRootForEdit = analysis?.score && typeof analysis.score === "object" ? analysis.score : {};
  const componentRootForEdit = findAnalysisValue(["component scores", "criteria scores", "skill scores", "diem thanh phan", "cham diem ky nang"]);
  const componentEditSpecs = [
    { key: "skill_score", label: "Kỹ năng", aliases: ["skill score", "skills score", "diem ky nang", "ky nang", "skill", "skills", "skill_score"] },
    { key: "experience_score", label: "Kinh nghiệm", aliases: ["experience score", "diem kinh nghiem", "kinh nghiem", "experience", "experience_score"] },
    { key: "education_score", label: "Học vấn", aliases: ["education score", "diem hoc van", "hoc van", "education", "education_score"] },
    { key: "soft_skills_score", label: "Kĩ năng mềm", aliases: ["soft skills score", "diem ky nang mem", "ky nang mem", "soft skills", "soft_skills", "soft_skills_score"] }
  ];
  const componentEditGroup = document.createElement("div"); componentEditGroup.className = "cv-dot-edit-ai-component-group";
  const componentTitle = document.createElement("strong"); componentTitle.textContent = "Điểm thành phần:"; componentEditGroup.appendChild(componentTitle);
  for (const part of componentEditSpecs) {
    let value = scoreRootForEdit[part.key];
    if (value === undefined) value = Object.entries(scoreRootForEdit).find(([key]) => part.aliases.includes(normalizeKey(key)))?.[1];
    if (value === undefined && componentRootForEdit && typeof componentRootForEdit === "object") value = Object.entries(componentRootForEdit).find(([key]) => part.aliases.includes(normalizeKey(key)))?.[1];
    const row = document.createElement("label"); row.className = "cv-dot-edit-ai-component-row";
    const title = document.createElement("span"); title.textContent = `- ${part.label}:`;
    const control = document.createElement("input"); control.type = "number"; control.min = "0"; control.max = "100"; control.step = "0.1"; control.className = "cv-dot-edit-ai-score-input"; control.value = value === undefined || value === null ? "" : String(value).replace(/\/100$/, ""); control.placeholder = "0–100";
    control.dataset.valueType = "number"; control.dataset.path = JSON.stringify(["score", part.key]);
    row.append(title, control); componentEditGroup.appendChild(row); editFields.push(control);
  }
  editForm.appendChild(componentEditGroup);
  const scoreInput = document.createElement("input"); scoreInput.type = "number"; scoreInput.name = "diem"; scoreInput.min = "0"; scoreInput.max = "100"; scoreInput.step = "0.1"; scoreInput.required = true; scoreInput.value = Number.isFinite(Number(scoreRaw)) ? String(Number(scoreRaw)) : String(Number(analysis?.score?.tong) || 0);
  const recommendation = document.createElement("select"); recommendation.name = "de_xuat"; recommendation.innerHTML = '<option value="nen_phong_van">Nên phỏng vấn</option><option value="can_nhac">Cân nhắc</option><option value="chua_phu_hop">Chưa phù hợp</option>';
  const scoreForRecommendation = Number(scoreInput.value);
  recommendation.value = Number.isFinite(scoreForRecommendation)
    ? (scoreForRecommendation < 60 ? "chua_phu_hop" : scoreForRecommendation < 80 ? "can_nhac" : "nen_phong_van")
    : "can_nhac";
  const reasonInput = document.createElement("textarea"); reasonInput.name = "ly_do"; reasonInput.rows = 2; reasonInput.placeholder = "Nhập lý do đánh giá của người phụ trách"; reasonInput.value = storedAnalysis.ly_do_ghi_de || storedAnalysis.ly_do || storedAnalysis.giai_thich || findAnalysisValue(["ghi chu", "ly do", "reason", "explanation", "giai thich"]) || "";
  const createEditField = (label, control) => { const wrap = document.createElement("label"); wrap.className = "cv-dot-edit-ai-field"; const title = document.createElement("span"); title.textContent = `${label}:`; wrap.append(title, control); return wrap; };
  scoreInput.addEventListener("input", () => {
    const value = Number(scoreInput.value);
    if (!Number.isFinite(value)) return;
    recommendation.value = value < 60 ? "chua_phu_hop" : value < 80 ? "can_nhac" : "nen_phong_van";
  });
  const scoreRecommendationRow = document.createElement("div"); scoreRecommendationRow.className = "cv-dot-edit-ai-meta-row";
  scoreRecommendationRow.append(createEditField("Điểm tương thích", scoreInput), createEditField("Đề xuất", recommendation));
  editForm.appendChild(scoreRecommendationRow); editForm.appendChild(createEditField("Ghi chú", reasonInput));
  const editActions = document.createElement("div"); editActions.className = "cv-dot-edit-ai-actions";
  const cancelEdit = document.createElement("button"); cancelEdit.type = "button"; cancelEdit.textContent = "Hủy"; cancelEdit.className = "cv-dot-edit-cancel";
  const saveEdit = document.createElement("button"); saveEdit.type = "submit"; saveEdit.textContent = "Lưu toàn bộ nội dung"; saveEdit.className = "cv-dot-edit-save";
  editActions.append(cancelEdit, saveEdit); editForm.appendChild(editActions); analysisSection.insertBefore(editForm, analysisContent);
  editButton.addEventListener("click", () => { editForm.hidden = !editForm.hidden; analysisContent.hidden = !editForm.hidden; editButton.textContent = editForm.hidden ? "Sửa" : "Hủy sửa"; if (!editForm.hidden) editFields[0]?.focus(); });
  cancelEdit.addEventListener("click", () => { editForm.hidden = true; analysisContent.hidden = false; editButton.textContent = "Sửa"; });
  editForm.addEventListener("submit", async event => {
    event.preventDefault(); saveEdit.disabled = true; saveEdit.textContent = "Đang lưu...";
    try {
      const editedAnalysis = JSON.parse(JSON.stringify(analysis || {}));
      for (const control of editFields) {
        const path = JSON.parse(control.dataset.path);
        let target = editedAnalysis;
        for (let index = 0; index < path.length - 1; index += 1) {
          const part = path[index];
          if (target[part] === null || typeof target[part] !== "object") target[part] = typeof path[index + 1] === "number" ? [] : {};
          target = target[part];
        }
        const key = path[path.length - 1];
        let value = control.value.trim();
        if (control.dataset.valueType === "array") value = value ? value.split(/\r?\n/).map(item => item.trim()).filter(Boolean).map(item => { try { return JSON.parse(item); } catch { return item; } }) : [];
        else if (control.dataset.valueType === "number" && value !== "") value = Number(value);
        else if (control.dataset.valueType === "boolean") value = value.toLowerCase() === "true" || value.toLowerCase() === "có";
        target[key] = value;
      }
      const savedNote = reasonInput.value.trim();
      const noteAliases = new Set(["ghi chu", "ly do", "reason", "explanation", "giai thich", "ly do danh gia", "ly do ghi de"]);
      const updateExistingNotes = value => {
        if (!value || typeof value !== "object") return;
        for (const [key, child] of Object.entries(value)) {
          if (noteAliases.has(normalizeKey(key))) value[key] = savedNote;
          else if (child && typeof child === "object") updateExistingNotes(child);
        }
      };
      updateExistingNotes(editedAnalysis);
      editedAnalysis.ghi_chu = savedNote;
      editedAnalysis.score = editedAnalysis.score && typeof editedAnalysis.score === "object" ? editedAnalysis.score : {};
      editedAnalysis.score.tong = Number(scoreInput.value);
      editedAnalysis.score.de_xuat = recommendation.value;
      const profilePayload = { ho_ten: profileInputs.ho_ten.value.trim(), email: profileInputs.email.value.trim(), so_dien_thoai: profileInputs.so_dien_thoai.value.trim() };
      if (!profilePayload.ho_ten) throw new Error("Họ và tên không được để trống.");
      await api(`${API}/ung-vien/${candidate.id}`, { method: "PUT", body: JSON.stringify(profilePayload) });
      const payload = { du_lieu_phan_tich: editedAnalysis, diem: Number(scoreInput.value), de_xuat: recommendation.value, ly_do: reasonInput.value.trim() || "Đã chỉnh sửa nội dung đánh giá." };
      await api(`${API}/cv/review/${candidate.id}/override`, { method: "PUT", body: JSON.stringify(payload) });
      analysis = editedAnalysis;
      scoreRaw = Number(scoreInput.value);
      profile.ho_ten = profilePayload.ho_ten; profile.email = profilePayload.email; profile.so_dien_thoai = profilePayload.so_dien_thoai; profile.sdt = profilePayload.so_dien_thoai;
      storedAnalysis.de_xuat = recommendation.value;
      storedAnalysis.ly_do_ghi_de = reasonInput.value.trim();
      storedAnalysis.ly_do = reasonInput.value.trim();
      infoGrid.replaceChildren();
      addInfo("Họ và tên", profile.ho_ten); addInfo("Email", profile.email); addInfo("Số điện thoại", profile.so_dien_thoai); addInfo("Địa chỉ", profile.dia_chi); addInfo("LinkedIn", profile.linkedin); addInfo("GitHub", profile.github); addInfo("Nguồn ứng viên", profile.nguon); addInfo("Tệp CV", cv?.ten_file || candidate.ten_file); if (cv?.loai_file) addInfo("Định dạng", cv.loai_file); if (cv?.ngay_tai_len) addInfo("Ngày tải lên", new Date(cv.ngay_tai_len).toLocaleString("vi-VN"));
      renderAnalysisDisplay();
      editForm.hidden = true; analysisContent.hidden = false; editButton.textContent = "Sửa"; hienThongBaoCVDot("Đã lưu toàn bộ nội dung đánh giá ứng viên.", true);
    } catch (error) { alert(error.message || "Không lưu được đánh giá."); }
    finally { saveEdit.disabled = false; saveEdit.textContent = "Lưu toàn bộ nội dung"; }
  });
  cvContent.replaceChildren();
  const cvId = cv?.id || candidate.cv_id;
  if (cvId) {
    try {
      const response = await fetch(`${API}/ung-vien/${candidate.id}/cv/${cvId}`, { headers: layToken() ? { Authorization: `Bearer ${layToken()}` } : {} });
      if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.message || `Không tải được CV (${response.status})`); }
      let blob = await response.blob(); const disposition = response.headers.get("content-disposition") || "";
      const fileName = cv?.ten_file || candidate.ten_file || "";
      const isPdf = blob.type === "application/pdf" || /\.pdf(?:[";]|$)/i.test(disposition) || /\.pdf$/i.test(fileName);
      const imageExt = (fileName.match(/\.(jpe?g|png|webp|gif)$/i) || [])[1]?.toLowerCase();
      const isImage = /^image\/(jpeg|png|webp|gif)$/i.test(blob.type) || Boolean(imageExt);
      if (isPdf && blob.type !== "application/pdf") blob = new Blob([blob], { type: "application/pdf" });
      if (isImage && !/^image\//i.test(blob.type)) {
        const imageMime = imageExt === "jpg" || imageExt === "jpeg" ? "image/jpeg" : `image/${imageExt || "png"}`;
        blob = new Blob([blob], { type: imageMime });
      }
      const objectUrl = URL.createObjectURL(blob);
      if (isPdf) {
        const frame = document.createElement("div"); frame.className = "cv-dot-inline-frame cv-pdf-canvas-pages"; frame.setAttribute("aria-label", `CV PDF của ${profile.ho_ten || "ứng viên"}`);
        cvContent.appendChild(frame);
        await dungPDFBangCanvas(frame, blob);
        taoCongCuPhongToCV(cvContent, frame, "pdf");
      } else if (isImage) {
        const image = document.createElement("img"); image.className = "cv-dot-inline-image"; image.alt = `CV của ${profile.ho_ten || "ứng viên"}`; image.src = objectUrl;
        taoCongCuPhongToCV(cvContent, image, "image");
      }
      const revoke = () => URL.revokeObjectURL(objectUrl);
      const download = document.createElement("a"); download.href = objectUrl; download.download = fileName || "CV"; download.textContent = "Tải CV về máy"; download.className = "cv-dot-download-link"; cvContent.appendChild(download);
      const observer = new MutationObserver(() => { if (!cvContent.isConnected) { revoke(); observer.disconnect(); } }); observer.observe(container, { childList: true, subtree: true });
    } catch (error) { cvContent.textContent = error.message || "Không thể hiển thị tệp CV."; }
  } else cvContent.textContent = "Ứng viên chưa có tệp CV đính kèm.";
}

function hienThongBaoCVDot(message, success = false) {
  const box = $("thongBao");
  if (!box) { alert(message); return; }
  box.className = success ? "thong-bao hien thanh-cong" : "thong-bao hien";
  box.textContent = message;
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function taoModalCV(title, contentClass = "") {
  const old = document.querySelector(".cv-dot-modal-overlay");
  if (old) old.remove();
  const overlay = document.createElement("div");
  overlay.className = "cv-dot-modal-overlay";
  const modal = document.createElement("section");
  modal.className = `cv-dot-modal ${contentClass}`.trim();
  const header = document.createElement("div");
  header.className = "cv-dot-modal-header";
  const heading = document.createElement("strong"); heading.textContent = title; if (!title) heading.hidden = true;
  const close = document.createElement("button"); close.type = "button"; close.className = "cv-dot-modal-close"; close.textContent = "×"; close.setAttribute("aria-label", "Đóng");
  const dong = () => { overlay.remove(); document.removeEventListener("keydown", esc); };
  const esc = (event) => { if (event.key === "Escape") dong(); };
  close.addEventListener("click", dong);
  overlay.addEventListener("click", (event) => { if (event.target === overlay) dong(); });
  header.append(heading, close); modal.appendChild(header); overlay.appendChild(modal); document.body.appendChild(overlay);
  document.addEventListener("keydown", esc);
  return { overlay, modal, dong };
}


let thuVienPDFJS = null;
async function layThuVienPDFJS() {
  if (!thuVienPDFJS) {
    thuVienPDFJS = import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs").then(pdfjs => {
      pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
      return pdfjs;
    });
  }
  return thuVienPDFJS;
}
async function dungPDFBangCanvas(container, blob) {
  const pdfjs = await layThuVienPDFJS();
  const bytes = await blob.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  container.classList.add("cv-pdf-canvas-pages");
  container._pdfDocument = pdf;
  let renderVersion = 0;
  container._renderPdfAtZoom = async (zoom) => {
    const thisRender = ++renderVersion;
    const fragment = document.createDocumentFragment();
    const width = container._pdfBaseWidth || (container._pdfBaseWidth = Math.max(320, container.parentElement?.clientWidth || 700) - 24);
    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3);
    for (let i = 1; i <= pdf.numPages; i++) {
      if (thisRender !== renderVersion) return;
      const page = await pdf.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const scale = (width / base.width) * zoom;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.className = "cv-pdf-rendered-page";
      canvas.dataset.renderZoom = String(zoom);
      canvas.width = Math.ceil(viewport.width * dpr);
      canvas.height = Math.ceil(viewport.height * dpr);
      canvas.style.width = `${Math.ceil(viewport.width)}px`;
      canvas.style.height = `${Math.ceil(viewport.height)}px`;
      fragment.appendChild(canvas);
      const ctx = canvas.getContext("2d", { alpha: false });
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      await page.render({ canvasContext: ctx, viewport }).promise;
    }
    if (thisRender === renderVersion) {
      container.replaceChildren(fragment);
      container._renderedZoom = zoom;
    }
  };
  await container._renderPdfAtZoom(1);
}

function taoCongCuPhongToCV(parent, target, kind) {
  const toolbar = document.createElement("div");
  toolbar.className = "cv-zoom-toolbar";
  const minus = document.createElement("button"); minus.type = "button"; minus.textContent = "−"; minus.title = "Thu nhỏ"; minus.setAttribute("aria-label", "Thu nhỏ CV");
  const percent = document.createElement("span"); percent.className = "cv-zoom-percent"; percent.textContent = "100%";
  const plus = document.createElement("button"); plus.type = "button"; plus.textContent = "+"; plus.title = "Phóng to"; plus.setAttribute("aria-label", "Phóng to CV");
  const reset = document.createElement("button"); reset.type = "button"; reset.className = "cv-zoom-reset"; reset.textContent = "↶"; reset.title = "Trở về 100%"; reset.setAttribute("aria-label", "Trở về kích thước 100%");
  toolbar.append(minus, percent, plus, reset);
  const viewport = document.createElement("div"); viewport.className = "cv-zoom-viewport";
  const stage = document.createElement("div"); stage.className = "cv-zoom-stage";
  const originalParent = target.parentNode;
  if (originalParent) originalParent.removeChild(target);
  stage.appendChild(target); viewport.appendChild(stage); parent.append(toolbar, viewport);
  target.classList.add("cv-zoom-target");
  if (kind === "pdf") target.style.pointerEvents = "none";
  let zoom = 1, baseWidth = 0, baseHeight = 0;
  const measure = () => {
    baseWidth = Math.max(320, viewport.clientWidth - 2);
    if (kind === "image") {
      const ratio = target.naturalWidth && target.naturalHeight ? target.naturalHeight / target.naturalWidth : 1.414;
      baseHeight = Math.max(200, baseWidth * ratio);
    } else {
      baseHeight = Math.max(450, Math.min(window.innerHeight * 0.68, 760));
    }
    if (kind !== "pdf") { target.style.width = `${baseWidth}px`; target.style.height = `${baseHeight}px`; }
    render();
  };
  let pdfZoomTimer = null;
  const render = () => {
    stage.style.width = `${baseWidth * zoom}px`; stage.style.height = `${baseHeight * zoom}px`;
    if (kind === "pdf" && typeof target._renderPdfAtZoom === "function") {
      const renderedZoom = Number(target._renderedZoom || 1);
      target.style.transformOrigin = "top left";
      target.style.transform = `scale(${zoom / renderedZoom})`;
      clearTimeout(pdfZoomTimer);
      pdfZoomTimer = setTimeout(() => {
        target._renderPdfAtZoom(zoom).then(() => {
          if (Math.abs(zoom - Number(target._renderedZoom || 1)) < 0.001) {
            target.style.transform = "none";
            stage.style.height = `${Math.max(baseHeight * zoom, target.scrollHeight)}px`;
            stage.style.width = `${Math.max(baseWidth * zoom, target.scrollWidth)}px`;
          }
        }).catch(error => console.error("Không thể dựng PDF:", error));
      }, 110);
    } else { target.style.transform = `scale(${zoom})`; }
    percent.textContent = `${Math.round(zoom * 100)}%`;
    minus.disabled = zoom <= 0.5; plus.disabled = zoom >= 3;
  };
  const setZoom = (next, resetPosition = false) => {
    zoom = Math.max(0.5, Math.min(3, Math.round(next * 10) / 10)); render();
    if (resetPosition) { viewport.scrollLeft = 0; viewport.scrollTop = 0; }
  };
  minus.addEventListener("click", () => setZoom(zoom - 0.1));
  plus.addEventListener("click", () => setZoom(zoom + 0.1));
  reset.addEventListener("click", () => setZoom(1, true));
  let dragging = false, startX = 0, startY = 0, scrollX = 0, scrollY = 0;
  viewport.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    dragging = true; startX = event.clientX; startY = event.clientY; scrollX = viewport.scrollLeft; scrollY = viewport.scrollTop;
    viewport.classList.add("is-dragging"); viewport.setPointerCapture?.(event.pointerId); event.preventDefault();
  });
  viewport.addEventListener("pointermove", event => {
    if (!dragging) return;
    viewport.scrollLeft = scrollX - (event.clientX - startX); viewport.scrollTop = scrollY - (event.clientY - startY);
  });
  const stopDrag = () => { dragging = false; viewport.classList.remove("is-dragging"); };
  viewport.addEventListener("pointerup", stopDrag); viewport.addEventListener("pointercancel", stopDrag); viewport.addEventListener("lostpointercapture", stopDrag);
  requestAnimationFrame(measure);
  if (kind === "image") target.addEventListener("load", measure, { once: true });
  if (typeof ResizeObserver !== "undefined") { const observer = new ResizeObserver(measure); observer.observe(viewport); }
  return { viewport, setZoom };
}

// Menu chuot phai tren tung dong CV: dung lai dung cac thao tac cua nut ba cham.
let menuChuotPhaiCV = null;
function dongMenuChuotPhaiCV() {
  menuChuotPhaiCV?.remove();
  menuChuotPhaiCV = null;
}
document.addEventListener("contextmenu", (event) => {
  const row = event.target.closest(".cv-dot-table tbody tr");
  const sourceMenu = row?.querySelector(".cv-more-menu");
  if (!row || !sourceMenu) return;
  event.preventDefault();
  dongMenuChuotPhaiCV();
  const sourceButtons = [...sourceMenu.querySelectorAll("button")];
  if (!sourceButtons.length) return;
  const portal = sourceMenu.cloneNode(false);
  portal.classList.add("cv-context-menu-portal");
  portal.style.cssText = "display:block!important;visibility:visible!important;opacity:1!important;position:fixed!important;left:8px;top:8px;right:auto;bottom:auto;z-index:30000;min-width:180px;max-width:min(260px,calc(100vw - 16px));max-height:calc(100vh - 16px);overflow:auto;pointer-events:auto;";
  sourceButtons.forEach((sourceButton) => {
    const button = sourceButton.cloneNode(true);
    button.style.display = "block";
    button.style.width = "100%";
    button.addEventListener("click", (clickEvent) => {
      clickEvent.preventDefault();
      clickEvent.stopPropagation();
      dongMenuChuotPhaiCV();
      sourceButton.click();
    });
    portal.appendChild(button);
  });
  document.body.appendChild(portal);
  menuChuotPhaiCV = portal;
  const rect = portal.getBoundingClientRect();
  portal.style.left = `${Math.max(8, Math.min(event.clientX, window.innerWidth - rect.width - 8))}px`;
  portal.style.top = `${Math.max(8, Math.min(event.clientY, window.innerHeight - rect.height - 8))}px`;
});
document.addEventListener("click", (event) => {
  if (menuChuotPhaiCV && !event.target.closest(".cv-context-menu-portal")) dongMenuChuotPhaiCV();
});
window.addEventListener("scroll", dongMenuChuotPhaiCV, true);
window.addEventListener("resize", dongMenuChuotPhaiCV);

async function moCVCoXacThuc(url) {
  const { modal } = taoModalCV("Xem CV", "cv-dot-modal-preview");
  const status = document.createElement("p"); status.className = "cv-preview-status"; status.textContent = "Đang tải CV...";
  const frame = document.createElement("iframe"); frame.title = "Xem trước CV"; frame.className = "cv-preview-frame"; frame.hidden = true;
  modal.append(status, frame);
  try {
    const response = await fetch(url, { headers: layToken() ? { Authorization: `Bearer ${layToken()}` } : {} });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || `Không mở được CV (${response.status})`);
    }
    let blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
    const nameMatch = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
    const fileName = decodeURIComponent((nameMatch?.[1] || "").replace(/^"|"$/g, ""));
    const pdfByName = blob.type === "application/pdf" || /\.pdf(?:[";]|$)/i.test(disposition) || /\.pdf$/i.test(fileName);
    const imageExt = (fileName.match(/\.(jpe?g|png|webp|gif)$/i) || [])[1]?.toLowerCase();
    const isImage = /^image\/(jpeg|png|webp|gif)$/i.test(blob.type) || Boolean(imageExt);
    if (pdfByName && blob.type !== "application/pdf") blob = new Blob([blob], { type: "application/pdf" });
    if (isImage && !/^image\//i.test(blob.type)) blob = new Blob([blob], { type: imageExt === "jpg" || imageExt === "jpeg" ? "image/jpeg" : `image/${imageExt || "png"}` });
    const objectUrl = URL.createObjectURL(blob);
    if (isImage) {
      frame.remove();
      const image = document.createElement("img"); image.className = "cv-preview-image"; image.alt = "Ảnh CV"; image.src = objectUrl;
      taoCongCuPhongToCV(modal, image, "image");
    } else if (pdfByName) {
      frame.remove();
      const pdfCanvas = document.createElement("div"); pdfCanvas.className = "cv-pdf-canvas-pages";
      modal.appendChild(pdfCanvas);
      await dungPDFBangCanvas(pdfCanvas, blob);
      taoCongCuPhongToCV(modal, pdfCanvas, "pdf");
      pdfCanvas.dataset.objectUrl = objectUrl;
    } else {
      frame.remove();
    }
    modal.querySelector(".cv-dot-modal-close").addEventListener("click", () => URL.revokeObjectURL(objectUrl), { once: true });
    status.textContent = pdfByName ? "Bản xem trước PDF" : isImage ? "Bản xem trước ảnh CV" : "Định dạng này không xem trực tiếp được trong trình duyệt.";
    if (!pdfByName && !isImage) {
      const download = document.createElement("a"); download.href = objectUrl; download.download = fileName || "CV"; download.textContent = "Tải CV về máy"; download.className = "cv-preview-download"; status.append(" ", download);
    }
  } catch (error) { status.textContent = error.message || "Không mở được CV."; }
}

function moFormSuaUngVien(candidate, dot) {
  const { modal, dong } = taoModalCV("Sửa thông tin ứng viên", "cv-dot-modal-edit-candidate");
  const form = document.createElement("form"); form.className = "cv-dot-interview-form";
  form.innerHTML = `
    <p class="cv-dot-modal-subtitle"></p>
    <label>Họ và tên <b>*</b><input name="ho_ten" maxlength="150" required></label>
    <label>Email<input name="email" type="email" maxlength="150"></label>
    <label>Số điện thoại<input name="so_dien_thoai" maxlength="30"></label>
    <label>Địa chỉ<input name="dia_chi" maxlength="255"></label>
    <label>LinkedIn<input name="linkedin" type="url" maxlength="255"></label>
    <label>GitHub<input name="github" type="url" maxlength="255"></label>
    <label>Nguồn ứng viên<input name="nguon" maxlength="100"></label>
    <p class="cv-dot-interview-error" role="alert"></p>
    <div class="cv-dot-modal-actions"><button type="button" class="cv-dot-cancel">Hủy</button><button type="submit" class="cv-dot-save">Lưu thay đổi</button></div>`;
  form.querySelector(".cv-dot-modal-subtitle").textContent = `${candidate.ho_ten || "Ứng viên"} · ${dot.ten_dot || dot.ten || "Đợt tuyển dụng"}`;
  for (const field of ["ho_ten", "email", "so_dien_thoai", "dia_chi", "linkedin", "github", "nguon"]) form.elements[field].value = candidate[field] || (field === "so_dien_thoai" ? candidate.sdt : "") || "";
  modal.appendChild(form); form.querySelector(".cv-dot-cancel").addEventListener("click", dong);
  form.addEventListener("submit", async event => {
    event.preventDefault(); const save = form.querySelector(".cv-dot-save"), errorBox = form.querySelector(".cv-dot-interview-error");
    save.disabled = true; save.textContent = "Đang lưu…"; errorBox.textContent = "";
    try {
      const body = Object.fromEntries(["ho_ten", "email", "so_dien_thoai", "dia_chi", "linkedin", "github", "nguon"].map(key => [key, form.elements[key].value.trim()]));
      body.trang_thai = candidate.trang_thai || "moi";
      await api(`${API}/ung-vien/${candidate.id}`, { method: "PUT", body: JSON.stringify(body) });
      dong(); hienThongBaoCVDot("Đã cập nhật thông tin ứng viên.", true); await taiCVTheoDot(dot);
    } catch (error) { errorBox.textContent = error.message || "Không cập nhật được ứng viên."; save.disabled = false; save.textContent = "Lưu thay đổi"; }
  });
}

async function moFormHenPhongVan(candidate, dot, interviewId = null) {
  const dangSuaLich = Boolean(interviewId);
  const { modal, dong } = taoModalCV(dangSuaLich ? "Đổi ngày hẹn phỏng vấn" : "Hẹn phỏng vấn", "cv-dot-modal-interview");
  const form = document.createElement("form"); form.className = "cv-dot-interview-form";
  form.innerHTML = `
    <p class="cv-dot-modal-subtitle"></p>
    <label><span class="cv-dot-label-title">Thời gian phỏng vấn <b>*</b></span><div class="cv-dot-datetime-fields"><input name="ngay_phong_van" type="date" aria-label="Ngày phỏng vấn" required><input name="gio_phong_van" type="time" aria-label="Giờ phỏng vấn" required></div><small>Chọn ngày trên lịch và chọn giờ phỏng vấn.</small></label>
    <label><span class="cv-dot-label-title">Vòng phỏng vấn <b>*</b></span><select name="vong_phong_van" required><option value="Sơ loại">Sơ loại</option><option value="Chuyên môn">Chuyên môn</option><option value="Vòng cuối">Vòng cuối</option><option value="Khác">Khác</option></select></label>
    <label><span class="cv-dot-label-title">Người phỏng vấn <b>*</b></span><select name="nguoi_phong_van_ids" multiple size="4" required><option value="">Đang tải danh sách...</option></select><small>Giữ Ctrl (Windows) hoặc Command (Mac) để chọn nhiều người.</small></label>
    <label><span class="cv-dot-label-title">Hình thức <b>*</b></span><select name="hinh_thuc" required><option value="online">Trực tuyến (Online)</option><option value="offline">Trực tiếp (Offline)</option></select></label>
    <label>Địa điểm / Link phỏng vấn<input name="dia_diem" maxlength="500" placeholder="Ví dụ: Google Meet hoặc Phòng phỏng vấn 02"></label>
    <label>Ghi chú<textarea name="ghi_chu" rows="3" maxlength="5000" placeholder="Nội dung cần chuẩn bị..."></textarea></label>
    <p class="cv-dot-interview-error" role="alert"></p>
    <div class="cv-dot-modal-actions"><button type="button" class="cv-dot-cancel">Đóng</button><button type="submit" class="cv-dot-save">${dangSuaLich ? "Lưu thay đổi lịch" : "Lưu lịch phỏng vấn"}</button></div>`;
  form.querySelector(".cv-dot-modal-subtitle").textContent = `${candidate.ho_ten || "Ứng viên"} · ${dot.ten_dot || dot.ten || dot.ten_dot_tuyen || "Đợt tuyển dụng"}`;
  modal.appendChild(form);
  form.querySelector(".cv-dot-cancel").addEventListener("click", dong);
  const dateInput = form.elements.ngay_phong_van;
  const timeInput = form.elements.gio_phong_van;
  const now = new Date(Date.now() + 60 * 60 * 1000); now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  if (dangSuaLich) {
    // Khi đổi lịch, chờ tải lịch hiện tại để không hiện nhầm ngày giờ mặc định.
    dateInput.value = "";
    timeInput.value = "";
    dateInput.disabled = true;
    timeInput.disabled = true;
  } else {
    dateInput.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    timeInput.value = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  }
  const interviewerSelect = form.elements.nguoi_phong_van_ids;
  try {
    const result = await api(`${API}/phong-van/nguoi-phong-van`);
    const people = (Array.isArray(result) ? result : (result.data || result.danhSach || [])).slice().sort((a, b) =>
      String(a.ho_ten || a.ten || a.email || "").localeCompare(String(b.ho_ten || b.ten || b.email || ""), "vi", { sensitivity: "base" })
    );
    interviewerSelect.replaceChildren();
    const addOption = new Option("+ Thêm người phỏng vấn...", "__them_moi__");
    interviewerSelect.add(addOption);
    people.forEach(person => {
      const option = document.createElement("option"); option.value = String(person.id);
      option.textContent = `${person.ho_ten || person.ten || person.email || `Tài khoản #${person.id}`} — ${person.vai_tro || person.role || "Người phỏng vấn"}`;
      interviewerSelect.appendChild(option);
    });
    interviewerSelect.onchange = async function () {
      if (![...this.selectedOptions].some(option => option.value === "__them_moi__")) return;
      [...this.options].forEach(option => { if (option.value === "__them_moi__") option.selected = false; });
      await moDialogThemNguoiPhongVanDot(interviewerSelect);
    };
    if (!people.length) interviewerSelect.insertAdjacentHTML("beforeend", '<option value="" disabled>Chưa có người phỏng vấn khả dụng</option>');
  } catch (error) {
    interviewerSelect.innerHTML = '<option value="">Không tải được danh sách</option>';
    form.querySelector(".cv-dot-interview-error").textContent = error.message || "Không tải được người phỏng vấn.";
  }
  if (dangSuaLich) {
    try {
      const response = await api(`${API}/phong-van/${interviewId}`);
      const lich = response?.data || response?.lich || response;
      const rawDate = String(lich.thoi_gian || lich.thoi_gian_phong_van || lich.bat_dau || lich.ngay_phong_van || "").trim();
      let dateMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
      // Dữ liệu có múi giờ phải hiển thị cùng múi giờ Việt Nam như cột Ngày hẹn PV.
      if (dateMatch && /(?:Z|[+-]\d{2}:?\d{2})$/i.test(rawDate)) {
        const dateObj = new Date(rawDate);
        if (!Number.isNaN(dateObj.getTime())) {
          const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(dateObj).reduce((out, part) => (out[part.type] = part.value, out), {});
          dateMatch = [rawDate, parts.year, parts.month, parts.day, parts.hour, parts.minute];
        }
      }
      if (dateMatch) {
        dateInput.value = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
        timeInput.value = `${dateMatch[4]}:${dateMatch[5]}`;
        dateInput.disabled = false;
        timeInput.disabled = false;
      } else {
        throw new Error("Không đọc được ngày giờ của lịch hiện tại. Hãy tải lại lịch trước khi đổi hẹn.");
      }
      form.elements.vong_phong_van.value = lich.vong_phong_van || "Sơ loại";
      form.elements.hinh_thuc.value = lich.hinh_thuc || "online";
      form.elements.dia_diem.value = lich.dia_diem || "";
      form.elements.ghi_chu.value = lich.ghi_chu || "";
      const selectedIds = String(lich.nguoi_phong_van_ids || lich.nguoi_phong_van_id || "").split(",").map(value => value.trim());
      [...interviewerSelect.options].forEach(option => { option.selected = selectedIds.includes(option.value); });
    } catch (error) {
      form.querySelector(".cv-dot-interview-error").textContent = error.message || "Không tải được lịch hiện tại.";
    }
  }
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const errorBox = form.querySelector(".cv-dot-interview-error");
    const save = form.querySelector(".cv-dot-save");
    const interviewerIds = [...interviewerSelect.selectedOptions].map(option => Number(option.value)).filter(Boolean);
    const matchDate = dateInput.value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!matchDate || !timeInput.value) { errorBox.textContent = "Vui lòng chọn ngày trên lịch và chọn giờ phỏng vấn."; return; }
    const [, yyyy, mm, dd] = matchDate;
    const day = Number(dd), month = Number(mm), year = Number(yyyy);
    const parsedDate = new Date(year, month - 1, day);
    if (parsedDate.getFullYear() !== year || parsedDate.getMonth() !== month - 1 || parsedDate.getDate() !== day) { errorBox.textContent = "Ngày phỏng vấn không hợp lệ."; return; }
    const startTime = `${yyyy}-${mm}-${dd}T${timeInput.value}`;
    if (!interviewerIds.length) { errorBox.textContent = "Vui lòng chọn ít nhất một người phỏng vấn."; return; }
    if (new Date(startTime).getTime() < Date.now() - 60000) { errorBox.textContent = "Thời gian phỏng vấn không được nằm trong quá khứ."; return; }
    save.disabled = true; save.textContent = "Đang lưu..."; errorBox.textContent = "";
    try {
      const payload = { gui_email: false, ung_vien_id: Number(candidate.id), dot_tuyen_id: Number(dot.id), nguoi_phong_van_ids: interviewerIds, thoi_gian: startTime, vong_phong_van: form.elements.vong_phong_van.value, hinh_thuc: form.elements.hinh_thuc.value, dia_diem: form.elements.dia_diem.value.trim() || null, ghi_chu: form.elements.ghi_chu.value.trim() || null };
      const result = dangSuaLich
        ? await api(`${API}/phong-van/${interviewId}`, { method: "PUT", body: JSON.stringify(payload) })
        : await api(`${API}/phong-van`, { method: "POST", body: JSON.stringify(payload) });
      dong();
      hienThongBaoCVDot(result.message || (dangSuaLich ? "Đã đổi lịch phỏng vấn." : "Đã lưu lịch phỏng vấn."), true);
      await taiCVTheoDot(dot);
    } catch (error) { errorBox.textContent = error.message || "Không thể lưu lịch phỏng vấn."; save.disabled = false; save.textContent = dangSuaLich ? "Lưu thay đổi lịch" : "Lưu lịch phỏng vấn"; }
  });
}

function themMucThongTinJD(container, tieuDe, noiDung) {
  if (noiDung === null || noiDung === undefined) return;
  const giaTri = String(noiDung).trim();
  if (!giaTri) return;

  const muc = document.createElement("section");
  muc.className = "jd-thong-tin-muc";

  const tieuDeEl = document.createElement("strong");
  tieuDeEl.textContent = tieuDe;
  muc.appendChild(tieuDeEl);

  const noiDungEl = document.createElement("p");
  noiDungEl.textContent = giaTri;
  noiDungEl.style.whiteSpace = "pre-line";
  muc.appendChild(noiDungEl);
  container.appendChild(muc);
}

function hienThiThongTinJD(item) {
  const container = $("jdThongTinNoiDung");
  container.replaceChildren();
  const jds = Array.isArray(item.jds) ? item.jds : (item.jd ? [item.jd] : []);
  $("jdThongTin").hidden = false;

  if (!jds.length) {
    const empty = document.createElement("p");
    empty.className = "jd-chua-co";
    empty.textContent = "Đợt tuyển dụng này chưa có bản mô tả. Dùng nút “Tạo bản mô tả” trong danh sách để bắt đầu.";
    container.appendChild(empty);
    return;
  }

  jds.forEach((jd) => {
    const card = document.createElement("article");
    card.className = "jd-thong-tin-card";
    if (jd.tieu_de) {
      const title = document.createElement("strong");
      title.textContent = jd.tieu_de || `JD #${jd.id}`;
      title.style.display = "block";
      title.style.marginBottom = "12px";
      card.appendChild(title);
    }

    const thongTinViTri = [
      jd.bo_phan && `Bộ phận: ${jd.bo_phan}`,
      jd.dia_diem && `Địa điểm: ${jd.dia_diem}`,
      jd.loai_hinh && `Hình thức: ${jd.loai_hinh}`,
      jd.muc_luong && `Mức lương: ${jd.muc_luong}`,
      jd.ky_nang && `Kỹ năng: ${jd.ky_nang}`,
    ].filter(Boolean).join("\n");
    if (thongTinViTri) themMucThongTinJD(card, "Thông tin vị trí", thongTinViTri);
    themMucThongTinJD(card, "Giới thiệu & mô tả công việc", jd.mo_ta);
    themMucThongTinJD(card, "Yêu cầu", jd.yeu_cau);
    themMucThongTinJD(card, "Quyền lợi", jd.quyen_loi);
    container.appendChild(card);
  });
}

function khoaFormXem() {
  const fields = document.querySelectorAll(
    "#form input, #form textarea, #form select"
  );

  fields.forEach((field) => {
    field.disabled = true;
  });

  $("form").querySelector('[type="submit"]').style.display = "none";
  $("btnHuy").textContent = "Đóng";
}

function moKhoaForm() {
  const fields = document.querySelectorAll(
    "#form input, #form textarea, #form select"
  );

  fields.forEach((field) => {
    field.disabled = false;
  });

  $("form").querySelector('[type="submit"]').style.display = "";
  $("btnHuy").textContent = "Hủy";
}

function themTieuChi(ten = "", trongSo = "", moTa = "") {
  const row = document.createElement("div");

  row.className = "tieu-chi-hang";

  row.innerHTML = `
    <input
      type="text"
      class="o-ten-tieu-chi"
      placeholder="Ví dụ: Kỹ năng Java"
      value="${escapeHTML(ten)}"
    />

    <input
      type="number"
      class="o-trong-so"
      min="0"
      max="100"
      step="1"
      placeholder="%"
      value="${trongSo}"
    />

    <textarea
      class="o-mo-ta-tieu-chi"
      rows="1"
      placeholder="Mô tả cách đánh giá tiêu chí..."
    >${escapeHTML(moTa)}</textarea>

    <button
      type="button"
      class="btn-xoa-tieu-chi"
      title="Xóa tiêu chí"
    >
      ×
    </button>
  `;

  $("danhSachTieuChi").appendChild(row);

  const inputTrongSo = row.querySelector(".o-trong-so");

  inputTrongSo.addEventListener("input", capNhatTongTrongSo);

  row
    .querySelector(".btn-xoa-tieu-chi")
    .addEventListener("click", () => {
      row.remove();
      capNhatTongTrongSo();
    });

  capNhatTongTrongSo();
}

function themTieuChiSua(ten = "", trongSo = "", moTa = "") {
  const row = document.createElement("div");
  row.className = "tieu-chi-hang tieu-chi-sua";
  row.innerHTML = `
    <input type="text" class="o-ten-tieu-chi" placeholder="Tên tiêu chí" value="${escapeHTML(ten)}" />
    <label class="trong-so-control">
      <input type="number" class="o-trong-so" min="0" max="100" step="1" placeholder="0" value="${escapeHTML(trongSo)}" />
      <span>%</span>
    </label>
    <textarea class="o-mo-ta-tieu-chi" rows="2" placeholder="Mô tả cách đánh giá">${escapeHTML(moTa)}</textarea>
    <button type="button" class="btn-xoa-tieu-chi" title="Xóa tiêu chí" aria-label="Xóa tiêu chí">×</button>
  `;

  $("danhSachTieuChiSua").appendChild(row);
  row.querySelector(".o-trong-so").addEventListener("input", capNhatTongTrongSoSua);
  row.querySelector(".btn-xoa-tieu-chi").addEventListener("click", () => {
    row.remove();
    capNhatTongTrongSoSua();
  });
  capNhatTongTrongSoSua();
}

function layDanhSachTieuChiSua() {
  return Array.from($("danhSachTieuChiSua").querySelectorAll(".tieu-chi-hang"))
    .map((row) => ({
      ten: row.querySelector(".o-ten-tieu-chi").value.trim(),
      trong_so: Number(row.querySelector(".o-trong-so").value || 0),
      mo_ta: row.querySelector(".o-mo-ta-tieu-chi").value.trim(),
    }))
    .filter((item) => item.ten);
}

function capNhatTongTrongSoSua() {
  const total = layDanhSachTieuChiSua().reduce(
    (sum, item) => sum + item.trong_so,
    0
  );
  const label = $("tongTrongSoSua");
  label.textContent = `Tổng trọng số: ${total}%`;
  label.classList.toggle("lech", total !== 100);
  return total;
}

function capNhatTongTrongSo() {
  const rows = document.querySelectorAll(".tieu-chi-hang");

  let tong = 0;

  rows.forEach((row) => {
    const value = Number(
      row.querySelector(".o-trong-so")?.value || 0
    );

    if (Number.isFinite(value) && value > 0) {
      tong += value;
    }
  });

  $("tongTrongSo").textContent = `Tổng: ${tong}%`;

  if (tong > 100) {
    $("tongTrongSo").classList.add("lech");
  } else {
    $("tongTrongSo").classList.remove("lech");
  }

  return tong;
}

function layDanhSachTieuChi() {
  const rows = document.querySelectorAll(".tieu-chi-hang");

  return Array.from(rows)
    .map((row) => ({
      ten: row.querySelector(".o-ten-tieu-chi")?.value.trim() || "",
      trong_so: Number(
        row.querySelector(".o-trong-so")?.value || 0
      ),
      mo_ta:
        row.querySelector(".o-mo-ta-tieu-chi")?.value.trim() || "",
    }))
    .filter((item) => item.ten);
}

function kiemTraForm() {
  if (!dangSua?.dot?.id && !$("moTa").value.trim()) {
    alert("Vui lòng nhập mô tả đợt tuyển dụng.");
    $("moTa").focus();
    return false;
  }

  if (!$("ngayBatDau").value.trim()) {
    alert("Vui lòng nhập ngày bắt đầu.");
    $("ngayBatDau").focus();
    return false;
  }

  if (!$("ngayKetThuc").value.trim()) {
    alert("Vui lòng nhập ngày kết thúc.");
    $("ngayKetThuc").focus();
    return false;
  }

  const ngayBatDau = ngaySangISO(
    $("ngayBatDau").value
  );

  const ngayKetThuc = ngaySangISO(
    $("ngayKetThuc").value
  );

  if (!ngayBatDau) {
    alert(
      "Ngày bắt đầu không đúng định dạng. Vui lòng nhập dd/mm/yyyy."
    );

    $("ngayBatDau").focus();

    return false;
  }

  if (!ngayKetThuc) {
    alert(
      "Ngày kết thúc không đúng định dạng. Vui lòng nhập dd/mm/yyyy."
    );

    $("ngayKetThuc").focus();

    return false;
  }

  if (ngayKetThuc < ngayBatDau) {
    alert(
      "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu."
    );

    $("ngayKetThuc").focus();

    return false;
  }

  return true;
}

function taoTenDotTuMoTa(moTa) {
  let text = String(moTa || "").trim().replace(/\s+/g, " ");
  if (!text) return "";
  text = text.replace(/^(?:tôi\s+muốn\s+)?(?:tuyển\s+dụng|tuyển|cần\s+tuyển|tìm\s+kiếm|đang\s+tìm)\s+/i, "");
  text = text.replace(/^(?:vị trí|nhân sự cho vị trí)\s+/i, "");
  text = text.replace(/^(?:vị trí\s+)?/i, "");
  const first = text.split(/[.!?\n;]/)[0].trim();
  const normalized = first.replace(/^(?:là|một)\s+/i, "").replace(/[,.]+$/, "");
  const short = normalized.length > 65 ? normalized.slice(0, 62).trimEnd() + "…" : normalized;
  const title = short ? short.charAt(0).toLocaleUpperCase("vi-VN") + short.slice(1) : "Vị trí mới";
  return /^tuyển dụng\b/i.test(title) ? title : `Tuyển dụng ${title}`;
}

async function luuDotTuyen() {
  if (!kiemTraForm()) {
    return false;
  }

  const tenTuMoTa = dangSua?.dot?.id ? ($("ten").value.trim() || dangSua.dot.ten_dot || dangSua.dot.ten || "") : taoTenDotTuMoTa($("moTa").value);
  $("ten").value = tenTuMoTa;
  const dotPayload = {
    ten_dot: tenTuMoTa,
    ten: tenTuMoTa,
    mo_ta: $("moTa").value.trim(),
    trang_thai: dangSua?.dot?.id ? $("trangThai").value : "dang_tuyen",
    ngay_bat_dau: ngaySangISO(
      $("ngayBatDau").value
    ),
    ngay_ket_thuc: ngaySangISO(
      $("ngayKetThuc").value
    ),
  };

  if (dangSua?.dot?.id) {
    await api(`${API}/dot-tuyen/${dangSua.dot.id}`, {
      method: "PUT",
      body: JSON.stringify(dotPayload),
    });
    return dangSua.dot.id;
  }

  const result = await api(`${API}/dot-tuyen`, {
    method: "POST",
    body: JSON.stringify(dotPayload),
  });
  const dotId = result?.data?.id || result?.id || result?.insertId;

  if (!dotId) {
    throw new Error("Không lấy được ID đợt tuyển dụng sau khi lưu.");
  }

  return dotId;
}

async function suaJDVoiAI() {
  const request = $("yeuCauSuaJD").value.trim();
  if (!request) {
    $("thongBaoSuaJD").className = "thong-bao hien";
    $("thongBaoSuaJD").textContent = "Hãy nhập nội dung bạn muốn AI chỉnh sửa.";
    $("yeuCauSuaJD").focus();
    return;
  }
  const button = $("btnSuaJDVoiAI");
  button.disabled = true;
  button.textContent = "AI đang chỉnh sửa...";
  $("thongBaoSuaJD").className = "thong-bao hien dang-xu-ly";
  $("thongBaoSuaJD").textContent = "AI đang chỉnh phần được yêu cầu và giữ nguyên các phần còn lại...";
  try {
    const current = {
      tieu_de: dangSua?.jd?.tieu_de || "",
      bo_phan: $("jdSuaBoPhan").value.trim(),
      dia_diem: $("jdSuaDiaDiem").value,
      loai_hinh: $("jdSuaLoaiHinh").value,
      muc_luong: $("jdSuaMucLuong").value.trim(),
      ky_nang: $("jdSuaKyNang").value.trim(),
      mo_ta: $("jdSuaMoTa").value.trim(),
      yeu_cau: $("jdSuaYeuCau").value.trim(),
      quyen_loi: $("jdSuaQuyenLoi").value.trim(),
      tieu_chi: layDanhSachTieuChiSua(),
    };
    const prompt = `YÊU CẦU CHỈNH SỬA CỦA NGƯỜI DÙNG:\n${request}\n\nJD HIỆN TẠI (dùng làm bản gốc):\n${JSON.stringify(current, null, 2)}\n\nChỉ thay đổi nội dung liên quan trực tiếp đến yêu cầu. Giữ nguyên những phần không được nhắc tới, đặc biệt địa điểm, hình thức làm việc, lương, kỹ năng và các tiêu chí không liên quan.`;
    const result = await api(`${API}/jd/ai/soan`, {
      method: "POST",
      body: JSON.stringify({
        dot_tuyen_id: dangSua?.dot?.id || dotTuyenJDId,
        y_tuong: prompt,
        hoi_dap: [{ ma: "__sua_jd", noi_dung: "Yêu cầu chỉnh sửa JD", tra_loi: request }],
        ngon_ngu: "vi",
      }),
    });
    const jd = result?.data || {};
    if (jd.bo_phan) $("jdSuaBoPhan").value = jd.bo_phan;
    if (jd.dia_diem) chonDiaDiem($("jdSuaDiaDiem"), jd.dia_diem);
    if (jd.loai_hinh) $("jdSuaLoaiHinh").value = jd.loai_hinh;
    if (jd.muc_luong) $("jdSuaMucLuong").value = jd.muc_luong;
    if (jd.ky_nang) $("jdSuaKyNang").value = jd.ky_nang;
    const moTaMoi = [jd.gioi_thieu, jd.mo_ta_cong_viec].filter(Boolean).join("\n\n");
    if (moTaMoi) $("jdSuaMoTa").value = moTaMoi;
    const yeuCauMoi = [
      jd.yeu_cau_bat_buoc && `Bắt buộc:\n${jd.yeu_cau_bat_buoc}`,
      jd.yeu_cau_uu_tien && `Ưu tiên:\n${jd.yeu_cau_uu_tien}`,
    ].filter(Boolean).join("\n\n");
    if (yeuCauMoi) $("jdSuaYeuCau").value = yeuCauMoi;
    if (jd.quyen_loi) $("jdSuaQuyenLoi").value = jd.quyen_loi;
    if (Array.isArray(jd.tieu_chi) && jd.tieu_chi.length) {
      $("danhSachTieuChiSua").replaceChildren();
      jd.tieu_chi.forEach((item) => themTieuChiSua(item.ten || "", item.trong_so ?? 0, item.mo_ta || ""));
      capNhatTongTrongSoSua();
    }
    $("thongBaoSuaJD").className = "thong-bao hien thanh-cong";
    $("thongBaoSuaJD").textContent = "AI đã cập nhật nội dung. Kiểm tra lại rồi bấm “Lưu đợt tuyển dụng” để lưu.";
  } catch (error) {
    $("thongBaoSuaJD").className = "thong-bao hien";
    $("thongBaoSuaJD").textContent = error.message || "AI chưa chỉnh sửa được JD.";
  } finally {
    button.disabled = false;
    button.textContent = "Sửa JD với AI";
  }
}

async function luuTuyenDung(event) {
  event.preventDefault();

  if (dangXem) {
    dongModal();
    return;
  }


  const button = $("form").querySelector('[type="submit"]');
  const nhanNutLuu = button.textContent;
  button.disabled = true;
  button.textContent = "Đang lưu...";
  $("thongBao").className = "thong-bao hien dang-xu-ly";
  $("thongBao").textContent = "Đang lưu đợt tuyển dụng...";

  try {
    let rubric = null;
    const jdFields = () => ({
      dot_tuyen_id: Number(dangSua?.dot?.id || dotTuyenJDId),
      bo_phan: $("jdSuaBoPhan").value.trim(),
      dia_diem: $("jdSuaDiaDiem").value.trim(),
      loai_hinh: $("jdSuaLoaiHinh").value,
      muc_luong: $("jdSuaMucLuong").value.trim(),
      ky_nang: $("jdSuaKyNang").value.trim(),
      tieu_de: dangSua?.jd?.tieu_de || $("ten").value.trim() || dangSua?.dot?.ten_dot || dangSua?.dot?.ten || "Vị trí tuyển dụng",
      mo_ta: $("jdSuaMoTa").value.trim(),
      yeu_cau: $("jdSuaYeuCau").value.trim(),
      quyen_loi: $("jdSuaQuyenLoi").value.trim(),
      tieu_chi: layDanhSachTieuChiSua(),
    });
    const coNoiDungJD = () => ["jdSuaBoPhan", "jdSuaDiaDiem", "jdSuaLoaiHinh", "jdSuaMucLuong", "jdSuaKyNang", "jdSuaMoTa", "jdSuaYeuCau", "jdSuaQuyenLoi"].some(id => $(id).value.trim());
    if (dangSua?.jd?.id) {
      rubric = layDanhSachTieuChiSua();
      if (!rubric.length || capNhatTongTrongSoSua() !== 100) {
        throw new Error("Bộ tiêu chí cần có ít nhất một mục và tổng trọng số bằng 100%.");
      }
    }

    const dotId = await luuDotTuyen();
    if (!dotId) return;
    if (dangSua?.jd?.id || (dangSua?.dot?.id && coNoiDungJD())) {
      try {
        const payload = jdFields();
        payload.dot_tuyen_id = Number(dotId);
        if (dangSua?.jd?.id) {
          await api(`${API}/jd/${dangSua.jd.id}`, { method: "PUT", body: JSON.stringify(payload) });
        } else {
          await api(`${API}/jd`, { method: "POST", body: JSON.stringify(payload) });
        }
      } catch (error) {
        throw new Error(`Đợt tuyển dụng đã lưu nhưng bản mô tả chưa cập nhật được: ${error.message}`);
      }
    }
    $("thongBao").className = "thong-bao hien thanh-cong";
    $("thongBao").textContent = (dangSua?.jd?.id || (dangSua?.dot?.id && coNoiDungJD()))
      ? "Đã cập nhật đợt tuyển dụng và bản mô tả."
      : "Đã lưu đợt tuyển dụng. Đang chuyển sang bước làm rõ thông tin với AI...";
    const wasEditingExisting = Boolean(dangSua?.dot?.id);
    await taiDuLieu();
    if (!wasEditingExisting) {
      dotTuyenJDId = dotId;
      const dotMoi = danhSachGop.find((item) => Number(item.dot?.id) === Number(dotId));
      dongModal();
      moWizardJD(dotMoi || { dot: { id: dotId, ten_dot: $("ten").value.trim(), mo_ta: $("moTa").value } });
    } else {
      const refreshed = danhSachGop.find((item) => Number(item.dot?.id) === Number(dotId)) || window.dotTuyenDangXem;
      if (refreshed) moFormXem(refreshed);
      else dongModal();
    }
  } catch (error) {
    console.error(error);
    $("thongBao").className = "thong-bao hien";
    $("thongBao").textContent = error.message || "Không thể lưu đợt tuyển dụng.";
  } finally {
    button.disabled = false;
    button.textContent = nhanNutLuu;
  }
}



function chuyenBuocJD(buoc) {
  [1, 2, 3].forEach((numero) => {
    const panel = $(`jdBuoc${numero}`);
    if (panel) panel.classList.toggle("hien", numero === buoc);
    if (panel) panel.hidden = numero === 1;
    const stepIndex = numero - 2;
    if (stepIndex >= 0) $("jdChiBao").children[stepIndex]?.classList.toggle("dang", numero === buoc);
  });
  $("thongBaoJD").className = "thong-bao";
  $("thongBaoJD").textContent = "";
}

function moWizardJD(item = null) {
  yTuongJD = "";
  cauHoiJD = [];
  const dot = item?.dot || danhSachDotTuyen.find(
    (entry) => Number(entry.id) === Number(dotTuyenJDId)
  );
  if (dot?.id) dotTuyenJDId = dot.id;
  $("jdTenDot").value = dot?.ten_dot || dot?.ten || $("ten").value.trim() || "";
  $("jdTenDot").dataset.savedValue = $("jdTenDot").value;
  // Mô tả đã nhập ở bước tạo đợt được đưa thẳng sang bước làm rõ, không hỏi nhập ý tưởng lần nữa.
  yTuongJD = String(dot?.mo_ta || $("moTa").value || dot?.ten_dot || dot?.ten || "").trim();
  $("jdYTuong").value = yTuongJD;
  $("jdTemplate").value = "";
  $("jdNgonNgu").value = "vi";
  const jd = item?.jd || item?.jds?.[0] || {};
  $("jdBoPhan").value = jd.bo_phan || "";
  chonDiaDiem($("jdDiaDiem"), jd.dia_diem);
  $("jdLoaiHinh").value = jd.loai_hinh || "";
  $("jdMucLuong").value = jd.muc_luong || "";
  $("jdKyNang").value = jd.ky_nang || "";
  $("khungCauHoi").innerHTML = "";
  $("modalJD").classList.add("hien");
  chuyenBuocJD(2);
  if (yTuongJD) taoCauHoiJD().catch((error) => console.error("Không tạo được câu hỏi làm rõ:", error));
}

function dongWizardJD() {
  $("modalJD").classList.remove("hien");
}

function thuThapTraLoiJD() {
  return Array.from($("khungCauHoi").querySelectorAll("[data-cau-hoi]")).map((el) => {
    const cauHoi = cauHoiJD.find((item) => item.id === el.dataset.cauHoi);
    const inputs = Array.from(el.querySelectorAll("input, textarea"));
    const daChon = inputs.filter((input) => input.type === "checkbox" || input.type === "radio")
      .filter((input) => input.checked)
      .map((input) => input.value);
    const text = inputs.find((input) => input.type === "text" || input.tagName === "TEXTAREA")?.value.trim();

    return {
      ...cauHoi,
      tra_loi: daChon.length ? daChon.join(", ") : (text || ""),
    };
  });
}

function hienThiCauHoiJD(cauHoi) {
  cauHoiJD = cauHoi;
  $("khungCauHoi").innerHTML = "";
  const groups = new Map();
  cauHoi.forEach((question) => {
    const group = question.nhom || "Thông tin bổ sung";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(question);
  });

  let questionNumber = 0;
  groups.forEach((questions, groupName) => {
    const group = document.createElement("section");
    group.className = "nhom-cau-hoi";
    group.innerHTML = `
      <div class="nhom-cau-hoi-tieu-de">
        <span class="nhom-cau-hoi-icon">✦</span>
        <h3>${escapeHTML(groupName)}</h3>
        <span class="nhom-cau-hoi-so">${questions.length} câu</span>
      </div>
    `;

    questions.forEach((question) => {
      const number = ++questionNumber;
      const card = document.createElement("article");
      card.className = "cau-hoi-card";
      card.dataset.cauHoi = question.id;
      const choices = Array.isArray(question.lua_chon) ? question.lua_chon : [];
      const type = question.loai === "chon_nhieu" ? "checkbox" : "radio";

      card.innerHTML = `
        <div class="cau-hoi-noi-dung">
          <span class="cau-hoi-so">${number}</span>
          <p>${escapeHTML(question.noi_dung)}</p>
          <span class="cau-hoi-loai">${question.loai === "chon_nhieu" ? "Chọn nhiều" : question.loai === "nhap" ? "Tự nhập" : "Chọn một"}</span>
        </div>
        ${question.loai === "nhap"
          ? `<textarea class="cau-hoi-tu-nhap" rows="2" placeholder="Nhập câu trả lời của bạn"></textarea>`
          : `<div class="lua-chon">
              ${choices.map((choice) => `
                <label class="lua-chon-item">
                  <input type="${type}" name="jd-cau-${number}" value="${escapeHTML(choice)}">
                  <span>${escapeHTML(choice)}</span>
                </label>
              `).join("")}
            </div>
            <input class="cau-hoi-tu-nhap" type="text" placeholder="Hoặc nhập câu trả lời khác">`}
      `;
      group.appendChild(card);
    });
    $("khungCauHoi").appendChild(group);
  });
}

async function goiAIHoiCau() {
  const yTuong = $("jdYTuong").value.trim();
  if (!yTuong) {
    $("jdYTuong").focus();
    $("thongBaoJD").className = "thong-bao hien";
    $("thongBaoJD").textContent = "Vui lòng nhập ý tưởng vị trí cần tuyển.";
    return;
  }

  yTuongJD = yTuong;
  await taoCauHoiJD();
}

function taoCauHoiMacDinh() {
  return [
    { id: "mac_dinh_dia_diem", nhom: "Thông tin công việc", noi_dung: "Địa điểm làm việc cụ thể ở đâu?", loai: "nhap", lua_chon: [] },
    { id: "mac_dinh_hinh_thuc", nhom: "Thông tin công việc", noi_dung: "Hình thức làm việc nào phù hợp?", loai: "chon_mot", lua_chon: ["Toàn thời gian", "Bán thời gian", "Thực tập", "Làm từ xa", "Linh hoạt"] },
    { id: "mac_dinh_lich", nhom: "Thông tin công việc", noi_dung: "Lịch làm việc hoặc ca làm mong muốn?", loai: "nhap", lua_chon: [] },
    { id: "mac_dinh_luong", nhom: "Điều kiện tuyển dụng", noi_dung: "Mức lương hoặc khoảng lương dự kiến?", loai: "nhap", lua_chon: [] },
    { id: "mac_dinh_kinh_nghiem", nhom: "Yêu cầu ứng viên", noi_dung: "Yêu cầu kinh nghiệm và kỹ năng bắt buộc là gì?", loai: "nhap", lua_chon: [] },
  ];
}

async function taoCauHoiJD() {
  const button = $("btnJDHoiAI");
  button.disabled = true;
  $("thongBaoJD").className = "thong-bao hien dang-xu-ly";
  $("thongBaoJD").textContent = "AI đang tạo câu hỏi làm rõ...";

  try {
    const result = await api(`${API}/jd/ai/cau-hoi`, {
      method: "POST",
      body: JSON.stringify({
        y_tuong: yTuongJD,
        dot_tuyen_id: dotTuyenJDId,
        template: $("jdTemplate").value || null,
      }),
    });
    const questions = result?.data?.cau_hoi;
    if (Array.isArray(questions) && questions.length) {
      hienThiCauHoiJD(questions);
      chuyenBuocJD(2);
    } else {
      hienThiCauHoiJD(taoCauHoiMacDinh());
      chuyenBuocJD(2);
      $("thongBaoJD").className = "thong-bao hien";
      $("thongBaoJD").textContent = "AI chưa trả về câu hỏi. Bạn có thể trả lời các câu hỏi gợi ý bên dưới.";
    }
  } catch (error) {
    hienThiCauHoiJD(taoCauHoiMacDinh());
    chuyenBuocJD(2);
    $("thongBaoJD").className = "thong-bao hien";
    $("thongBaoJD").textContent = `Chưa kết nối được AI để tạo câu hỏi (${error.message || "lỗi kết nối"}). Đang hiển thị câu hỏi gợi ý để bạn tiếp tục.`;
  } finally {
    button.disabled = false;
  }
}

function chuanBiJDDeNhapTay(yTuong) {
  const firstLine = yTuong
    .split(/[\n.!?]/)
    .map((line) => line.trim())
    .find(Boolean);

  $("jdTieuDe").value = firstLine?.slice(0, 200) || "";
  $("jdGioiThieu").value = "";
  $("jdMoTaCV").value = yTuong;
  $("jdYeuCauBB").value = "";
  $("jdYeuCauUT").value = "";
  $("jdQuyenLoi").value = "";
  $("danhSachTieuChi").innerHTML = "";
  themTieuChi("Kỹ năng liên quan đến vị trí", 50, "Mức độ đáp ứng kỹ năng trong mô tả tuyển dụng");
  themTieuChi("Kinh nghiệm liên quan", 30, "Mức độ phù hợp của kinh nghiệm với công việc");
  themTieuChi("Năng lực và phối hợp", 20, "Năng lực giải quyết vấn đề và phối hợp công việc");
}

async function soanJDTheoWizard(boQuaCauHoi = false) {
  if (!yTuongJD.trim()) {
    yTuongJD = $("jdYTuong").value.trim();
  }
  if (!yTuongJD) {
    chuyenBuocJD(1);
    $("jdYTuong").focus();
    return;
  }

  const button = boQuaCauHoi ? $("btnJDBoQua") : $("btnJDSoan");
  button.disabled = true;
  $("thongBaoJD").className = "thong-bao hien dang-xu-ly";
  $("thongBaoJD").textContent = boQuaCauHoi
    ? "Đang soạn bản mô tả, có thể nhập tay nếu AI chưa phản hồi..."
    : "AI đang soạn bản mô tả và bộ tiêu chí...";

  try {
    const hoiDap = boQuaCauHoi ? [] : thuThapTraLoiJD();
    const result = await api(`${API}/jd/ai/soan`, {
      method: "POST",
      body: JSON.stringify({
        y_tuong: yTuongJD,
        hoi_dap: hoiDap,
        ngon_ngu: $("jdNgonNgu").value,
        dot_tuyen_id: dotTuyenJDId,
      }),
    });
    const jd = result?.data || {};
    $("jdTieuDe").value = jd.tieu_de || "";
    $("jdGioiThieu").value = jd.gioi_thieu || "";
    $("jdMoTaCV").value = jd.mo_ta_cong_viec || "";
    $("jdYeuCauBB").value = jd.yeu_cau_bat_buoc || "";
    $("jdYeuCauUT").value = jd.yeu_cau_uu_tien || "";
    $("jdQuyenLoi").value = jd.quyen_loi || "";
    if (jd.dia_diem) chonDiaDiem($("jdDiaDiem"), jd.dia_diem);
    if (jd.loai_hinh) $("jdLoaiHinh").value = jd.loai_hinh;
    if (jd.muc_luong) $("jdMucLuong").value = jd.muc_luong;
    if (jd.ky_nang) $("jdKyNang").value = jd.ky_nang;
    if (jd.bo_phan) $("jdBoPhan").value = jd.bo_phan;
    $("danhSachTieuChi").innerHTML = "";
    (jd.tieu_chi || []).forEach((item) => themTieuChi(item.ten, item.trong_so, item.mo_ta));
    chuyenBuocJD(3);
  } catch (error) {
    if (boQuaCauHoi) {
      chuanBiJDDeNhapTay(yTuongJD);
      chuyenBuocJD(3);
      $("thongBaoJD").className = "thong-bao hien";
      $("thongBaoJD").textContent =
        `AI chưa soạn được JD (${error.message || "lỗi kết nối"}). Bạn có thể tiếp tục nhập và chỉnh sửa nội dung bên dưới.`;
    } else {
      $("thongBaoJD").className = "thong-bao hien";
      $("thongBaoJD").textContent = error.message || "Không soạn được bản mô tả.";
    }
  } finally {
    button.disabled = false;
  }
}

function chonMauJD() {
  const templates = {
    backend: "Tuyển backend developer phụ trách thiết kế, phát triển và duy trì API, dịch vụ backend và tích hợp dữ liệu.",
    frontend: "Tuyển frontend developer xây dựng giao diện web, tối ưu trải nghiệm người dùng và phối hợp với backend.",
    fullstack: "Tuyển fullstack developer phát triển cả giao diện frontend và dịch vụ backend cho sản phẩm web.",
    qa: "Tuyển QA Engineer kiểm thử chức năng, xây dựng test case và cải thiện chất lượng phần mềm.",
    data: "Tuyển Data Analyst phân tích dữ liệu, xây dựng báo cáo và cung cấp thông tin hỗ trợ quyết định.",
  };
  const templateId = $("jdTemplate").value;
  if (templateId && templates[templateId]) {
    $("jdYTuong").value = templates[templateId];
  }
}

async function luuJDWizard() {
  const tieuDe = $("jdTieuDe").value.trim();
  if (!dotTuyenJDId || !tieuDe) {
    $("thongBaoJD").className = "thong-bao hien";
    $("thongBaoJD").textContent = "Vui lòng nhập tiêu đề bản mô tả.";
    return;
  }

  const tieuChi = layDanhSachTieuChi();
  const tong = tieuChi.reduce((sum, item) => sum + item.trong_so, 0);
  if (tong !== 100) {
    $("thongBaoJD").className = "thong-bao hien";
    $("thongBaoJD").textContent = `Tổng trọng số bộ tiêu chí phải bằng 100% (hiện tại ${tong}%).`;
    return;
  }

  const button = $("btnJDLuu");
  button.disabled = true;
  try {
    const result = await api(`${API}/jd`, {
      method: "POST",
      body: JSON.stringify({
        dot_tuyen_id: dotTuyenJDId,
        tieu_de: tieuDe,
        bo_phan: $("jdBoPhan").value.trim(),
        dia_diem: $("jdDiaDiem").value.trim(),
        loai_hinh: $("jdLoaiHinh").value,
        muc_luong: $("jdMucLuong").value.trim(),
        ky_nang: $("jdKyNang").value.trim(),
        mo_ta: [$("jdGioiThieu").value.trim(), $("jdMoTaCV").value.trim()].filter(Boolean).join("\n\n"),
        yeu_cau: [
          $("jdYeuCauBB").value.trim() && `Bắt buộc:\n${$("jdYeuCauBB").value.trim()}`,
          $("jdYeuCauUT").value.trim() && `Ưu tiên:\n${$("jdYeuCauUT").value.trim()}`,
        ].filter(Boolean).join("\n\n"),
        quyen_loi: $("jdQuyenLoi").value.trim(),
        tieu_chi: tieuChi,
      }),
    });
    const jdId = result?.data?.id || result?.id;
    if (!jdId) throw new Error("Đã lưu bản mô tả nhưng máy chủ không trả về mã nhận diện.");

    await api(`${API}/jd/ai/luu`, {
      method: "POST",
      body: JSON.stringify({
        jd_id: jdId,
        y_tuong: yTuongJD,
        hoi_dap: thuThapTraLoiJD(),
      }),
    });
    await taiDuLieu();
    dongWizardJD();
    alert("Đã lưu nội dung JD thành công.");
  } catch (error) {
    $("thongBaoJD").className = "thong-bao hien";
    $("thongBaoJD").textContent = error.message || "Không lưu được bản mô tả.";
  } finally {
    button.disabled = false;
  }
}

function moXacNhanXoa(item) {
  dangXoa = item;

  const tenDot =
    item?.dot?.ten_dot ||
    item?.dot?.ten ||
    "đợt tuyển dụng này";

  $("noiDungXacNhan").textContent =
    `Bạn có chắc chắn muốn xóa "${tenDot}" cùng các bản mô tả công việc liên quan không? Hành động này không thể hoàn tác.`;

  $("modalXacNhan").classList.add("hien");
}

function dongXacNhanXoa() {
  $("modalXacNhan").classList.remove("hien");
  dangXoa = null;
}

async function xacNhanXoa() {
  if (!dangXoa?.dot?.id) {
    return;
  }

  const button = $("btnXacNhanXoa");

  button.disabled = true;
  button.textContent = "Đang xóa...";

  try {
    if (dangXoa.jd?.id) {
      await api(`${API}/jd/${dangXoa.jd.id}`, {
        method: "DELETE",
      });
    }

    await api(
      `${API}/dot-tuyen/${dangXoa.dot.id}`,
      {
        method: "DELETE",
      }
    );

    dongXacNhanXoa();

    await taiDuLieu();

    alert("Đã xóa chiến dịch tuyển dụng thành công.");
  } catch (error) {
    console.error(error);

    alert(
      error.message || "Không thể xóa chiến dịch tuyển dụng."
    );
  } finally {
    button.disabled = false;
    button.textContent = "Xóa chiến dịch";
  }
}

function xuLyClickDanhSach(event) {
  // Bất kỳ thao tác nào trong ô checkbox (kể cả vùng đệm/viền xung quanh)
  // chỉ dùng để chọn hoặc bỏ chọn đợt tuyển dụng, tuyệt đối không mở form chi tiết.
  if (event.target.closest("td.cot-chon-dot")) return;

  const rowClick = event.target.closest("tr[data-dot-id]");
  const isControl = event.target.closest("button[data-action], a, input, select, textarea, [data-toggle-menu]");
  if (rowClick && !isControl) {
    const rowItem = danhSachGop.find((entry) => Number(entry.dot.id) === Number(rowClick.dataset.dotId));
    if (rowItem) { moFormXem(rowItem); return; }
  }
  const toggle = event.target.closest("[data-toggle-menu]");
  if (toggle) {
    const menu = toggle.nextElementSibling;
    document.querySelectorAll(".menu-hanh-dong-noi").forEach((item) => {
      if (item !== menu) item.hidden = true;
    });
    const opening = menu.hidden;
    menu.hidden = !opening;
    if (opening) {
      const buttonRect = toggle.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const left = Math.max(
        8,
        Math.min(buttonRect.right - menuRect.width, window.innerWidth - menuRect.width - 8),
      );
      const top = Math.max(8, buttonRect.top - menuRect.height - 5);
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
    }
    return;
  }

  const button = event.target.closest("button[data-action]");

  if (!button) return;
  document.querySelectorAll(".menu-hanh-dong-noi").forEach((menu) => {
    menu.hidden = true;
  });

  const id = Number(button.dataset.id);
  const action = button.dataset.action;

  const item = danhSachGop.find(
    (row) => Number(row.dot.id) === id
  );

  if (!item) {
    alert("Không tìm thấy dữ liệu tuyển dụng.");
    return;
  }

  if (action === "xem") {
    moFormXem(item);
    return;
  }

  if (action === "tao-jd") {
    if (!coQuyenTaoJD()) return;
    dotTuyenJDId = item.dot.id;
    moWizardJD(item);
    return;
  }

  if (action === "upload") {
    if (!["admin", "manager", "hr"].includes(layVaiTro())) return;
    moUploadDotTuyen(item.dot);
    return;
  }

  if (action === "sua") {
    if (!coQuyenQuanLy()) {
      alert("Bạn không có quyền chỉnh sửa.");
      return;
    }

    moFormSua(item);
    return;
  }

  if (action === "xoa") {
    if (!coQuyenQuanLy()) {
      alert("Bạn không có quyền xóa.");
      return;
    }

    moXacNhanXoa(item);
  }
}

function ganDatePicker(inputId, pickerId, buttonId) {
  const input = $(inputId);
  const picker = $(pickerId);
  const button = $(buttonId);

  if (!input || !picker || !button) return;

  button.addEventListener("click", () => {
    const iso = ngaySangISO(input.value);

    if (iso) {
      picker.value = iso;
    }

    if (typeof picker.showPicker === "function") {
      picker.showPicker();
    } else {
      picker.click();
    }
  });

  picker.addEventListener("change", () => {
    input.value = dinhDangNgayInput(picker.value);
    if (inputId === "ngayBatDau") capNhatNgayKetThucTuNgayBatDau();
  });
  input.addEventListener("change", () => {
    if (inputId === "ngayBatDau") capNhatNgayKetThucTuNgayBatDau();
  });

  input.addEventListener("input", () => {
    let value = input.value.replace(/\D/g, "");

    if (value.length > 8) {
      value = value.slice(0, 8);
    }

    if (value.length >= 5) {
      value =
        value.slice(0, 2) +
        "/" +
        value.slice(2, 4) +
        "/" +
        value.slice(4);
    } else if (value.length >= 3) {
      value =
        value.slice(0, 2) +
        "/" +
        value.slice(2);
    }

    input.value = value;
  });
}

function sapXepTinhThanhAZ() {
  const collator = new Intl.Collator("vi", { sensitivity: "base" });
  [$("jdDiaDiem"), $("jdSuaDiaDiem")].filter(Boolean).forEach((select) => {
    const placeholder = Array.from(select.options).find((option) => !option.value);
    const options = Array.from(select.options).filter((option) => option.value);
    options.sort((a, b) => collator.compare(a.textContent.trim(), b.textContent.trim()));
    select.replaceChildren(...(placeholder ? [placeholder] : []), ...options);
  });
}

function chuyenNgayISO(iso, soNgay) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) return "";
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + soNgay);
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
}

function capNhatNgayKetThucTuNgayBatDau() {
  const ngayBatDau = ngaySangISO($("ngayBatDau")?.value);
  if (!ngayBatDau) return;
  // Tính cả ngày bắt đầu là ngày thứ nhất: 01/10 -> 30/10.
  const ngayKetThuc = chuyenNgayISO(ngayBatDau, 29);
  if (ngayKetThuc) $("ngayKetThuc").value = ngayKetThuc;
}

function ganSuKien() {
  $("btnThem").addEventListener(
    "click",
    moFormMoi
  );

  $("btnDong").addEventListener("click", () => {
    dongModal();
    if (cheDoEmbed && window.parent !== window) {
      window.parent.postMessage({ type: "tuyendung-ai-close-create-campaign" }, window.location.origin);
    }
  });
  $("btnSuaTrongXem").addEventListener("click", () => {
    const item = window.dotTuyenDangXem;
    if (!item) return;
    dangSua = item;
    dangXem = false;
    moKhoaForm();
    $("tieuDeModal").textContent = "Chỉnh sửa đợt tuyển dụng";
    $("tieuDeModal").nextElementSibling.textContent = "Chỉnh sửa thông tin ngay trong cửa sổ này.";
    $("form").querySelector('[type="submit"]').textContent = "Lưu đợt tuyển dụng";
    $("hanhDongChiTiet").hidden = true;
    $("jdThongTin").hidden = true;
    $("jdChinhSua").hidden = false;
    const jd = item.jd || {};
    $("jdSuaBoPhan").value = jd.bo_phan || "";
    chonDiaDiem($("jdSuaDiaDiem"), jd.dia_diem || "");
    $("jdSuaLoaiHinh").value = jd.loai_hinh || "";
    $("jdSuaMucLuong").value = jd.muc_luong || "";
    $("jdSuaKyNang").value = jd.ky_nang || "";
    $("jdSuaMoTa").value = jd.mo_ta || "";
    $("jdSuaYeuCau").value = jd.yeu_cau || "";
    $("jdSuaQuyenLoi").value = jd.quyen_loi || "";
    $("danhSachTieuChiSua").replaceChildren();
    parseTieuChi(jd.tieu_chi).forEach((criterion) => {
      themTieuChiSua(criterion.ten || "", criterion.trong_so ?? 0, criterion.mo_ta || "");
    });
    if (!parseTieuChi(jd.tieu_chi).length) themTieuChiSua();
    capNhatTongTrongSoSua();
    $("thongBaoSuaJD").className = "thong-bao";
    $("thongBaoSuaJD").textContent = "";
    $("thongBao").className = "thong-bao";
    $("thongBao").textContent = "";
    $("yeuCauSuaJD").value = "";
  });
  $("btnDoiTrangThaiDot").addEventListener("click", async () => {
    const item = window.dotTuyenDangXem;
    if (!item?.dot?.id) return;
    const button = $("btnDoiTrangThaiDot");
    const dangDong = laDotDaDong(item.dot);
    if (dangDong && ngayKetThucDaQua(item.dot)) {
      alert("Ngày kết thúc đã qua. Hãy sửa ngày kết thúc thành hôm nay hoặc ngày tương lai trước khi mở lại đợt tuyển dụng.");
      return;
    }
    const nextStatus = dangDong ? "dang_tuyen" : "ket_thuc";
    button.disabled = true;
    try {
      await api(`${API}/dot-tuyen/${item.dot.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ten_dot: item.dot.ten_dot || item.dot.ten,
          ten: item.dot.ten_dot || item.dot.ten,
          mo_ta: item.dot.mo_ta || "",
          trang_thai: nextStatus,
          force_trang_thai: true,
          ngay_bat_dau: ngaySangISO(dinhDangNgayInput(item.dot.ngay_bat_dau)),
          ngay_ket_thuc: ngaySangISO(dinhDangNgayInput(item.dot.ngay_ket_thuc)),
        }),
      });
      await taiDuLieu();
      const refreshed = danhSachGop.find((entry) => Number(entry.dot.id) === Number(item.dot.id));
      if (refreshed) moFormXem(refreshed);
    } catch (error) {
      alert(error.message || "Không cập nhật được trạng thái đợt tuyển dụng.");
    } finally {
      button.disabled = false;
    }
  });

  $("btnXoaTrongXem").addEventListener("click", () => {
    const item = window.dotTuyenDangXem;
    if (!item) return;
    dongModal();
    moXacNhanXoa(item);
  });

  $("btnHuy").addEventListener("click", () => {
    if (!dangXem && window.dotTuyenDangXem && dangSua?.dot?.id) {
      moFormXem(window.dotTuyenDangXem);
      return;
    }
    dongModal();
  });

  $("form").addEventListener(
    "submit",
    luuTuyenDung
  );
  $("moTa").addEventListener("input", () => {
    if (!$('ten').dataset.edited) $('ten').value = taoTenDotTuMoTa($("moTa").value);
  });
  $("ten").addEventListener("input", () => { $("ten").dataset.edited = "true"; });

  $("jdTenDot").addEventListener("change", async () => {
    const input = $("jdTenDot");
    const tenMoi = input.value.trim();
    const dot = danhSachDotTuyen.find((entry) => Number(entry.id) === Number(dotTuyenJDId));
    if (!dot || !tenMoi || tenMoi === input.dataset.savedValue) return;
    try {
      await api(`${API}/dot-tuyen/${dot.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ten_dot: tenMoi,
          ten: tenMoi,
          mo_ta: dot.mo_ta || "",
          trang_thai: dot.trang_thai || "dang_tuyen",
          ngay_bat_dau: ngaySangISO(dinhDangNgayInput(dot.ngay_bat_dau)),
          ngay_ket_thuc: ngaySangISO(dinhDangNgayInput(dot.ngay_ket_thuc)),
        }),
      });
      input.dataset.savedValue = tenMoi;
      await taiDuLieu();
      $("jdTenDot").value = tenMoi;
    } catch (error) {
      alert(error.message || "Không lưu được tên đợt tuyển dụng.");
      input.value = input.dataset.savedValue || dot.ten_dot || dot.ten || "";
    }
  });

  $("btnDongJD").addEventListener("click", dongWizardJD);
  $("btnJDHuy").addEventListener("click", dongWizardJD);
  $("btnJDHoiAI").addEventListener("click", goiAIHoiCau);
  $("btnJDBoQua").addEventListener("click", () => soanJDTheoWizard(true));
  $("btnJDQuayLai1").addEventListener("click", () => chuyenBuocJD(1));
  $("btnJDSoan").addEventListener("click", soanJDTheoWizard);
  $("btnJDQuayLai2").addEventListener("click", () => chuyenBuocJD(2));
  $("btnJDSoanLai").addEventListener("click", soanJDTheoWizard);
  $("btnJDLuu").addEventListener("click", luuJDWizard);
  $("jdTemplate").addEventListener("change", chonMauJD);
  $("btnThemTieuChi").addEventListener("click", () => themTieuChi());
  $("btnThemTieuChiSua").addEventListener("click", () => themTieuChiSua());
  $("btnSuaJDVoiAI").addEventListener("click", suaJDVoiAI);
  $("btnChonDotTaoJD").addEventListener("click", () => {
    if (!danhSachDotTuyen.length) {
      moFormMoi();
      return;
    }

    const select = $("dotTuyenJDChon");
    select.replaceChildren();
    danhSachDotTuyen.forEach((dot) => {
      const option = document.createElement("option");
      option.value = dot.id;
      option.textContent = `${dot.ten_dot || dot.ten || "Đợt tuyển dụng"} · ${hienThiTrangThai(dot.trang_thai)}`;
      select.appendChild(option);
    });
    $("modalChonJD").classList.add("hien");
  });

  const dongModalChonJD = () => $("modalChonJD").classList.remove("hien");
  $("btnDongChonJD").addEventListener("click", dongModalChonJD);
  $("btnHuyChonJD").addEventListener("click", dongModalChonJD);
  $("btnTiepTucJD").addEventListener("click", () => {
    const dot = danhSachDotTuyen.find((item) => Number(item.id) === Number($("dotTuyenJDChon").value));
    if (!dot) return;
    dotTuyenJDId = dot.id;
    dongModalChonJD();
    moWizardJD({ dot });
  });

  $("danhSach").addEventListener("change", (event) => {
    const checkbox = event.target.closest(".tick-chon-dot[data-action=\"chon-dot\"]");
    if (!checkbox) return;
    const id = String(checkbox.dataset.id || "");
    if (!id) return;
    if (checkbox.checked) dotTuyenDaChon.add(id);
    else dotTuyenDaChon.delete(id);
    const row = checkbox.closest("tr[data-dot-id]");
    if (row) row.classList.toggle("dot-tuyen-row-selected", checkbox.checked);
    capNhatNutXoaDotDaChon();
  });

  $("btnXoaDotDaChon").addEventListener("click", moModalXoaNhieuDot);

  $("danhSach").addEventListener(
    "click",
    xuLyClickDanhSach
  );

  $("oTimKiem").addEventListener(
    "input",
    (event) => {
      trangHienTaiDot = 1;
      $("timKiemToanCuc").value = event.target.value;
      hienThiDanhSach();
    }
  );

  $("timKiemToanCuc").addEventListener("input", (event) => {
    trangHienTaiDot = 1;
    $("oTimKiem").value = event.target.value;
    hienThiDanhSach();
  });

  $("locTrangThai").addEventListener(
    "change",
    () => {
      trangHienTaiDot = 1;
      hienThiDanhSach();
    }
  );

  document.querySelector(".tab-trang-thai").addEventListener("click", (event) => {
    const button = event.target.closest("[data-status]");
    if (!button) return;
    $("locTrangThai").value = button.dataset.status;
    trangHienTaiDot = 1;
    document.querySelectorAll(".tab-trang-thai-nut").forEach((tab) => {
      tab.classList.toggle("active", tab === button);
      tab.setAttribute("aria-selected", tab === button ? "true" : "false");
    });
    hienThiDanhSach();
  });

  $("btnTrangTruocDot").addEventListener("click", () => {
    if (trangHienTaiDot > 1) {
      trangHienTaiDot -= 1;
      hienThiDanhSach();
    }
  });
  $("btnTrangSauDot").addEventListener("click", () => {
    trangHienTaiDot += 1;
    hienThiDanhSach();
  });

  $("btnHoiAI").addEventListener("click", () => {
    khoiPhucLichSuHoiAIDot();
    $("modalHoiAI").classList.add("hien");
    $("noiDungHoiAIDot").focus();
  });
  $("btnDongHoiAIDot").addEventListener("click", () => $("modalHoiAI").classList.remove("hien"));
  $("modalHoiAI").addEventListener("click", (event) => {
    if (event.target === $("modalHoiAI")) $("modalHoiAI").classList.remove("hien");
  });
  $("formHoiAIDot").addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = $("noiDungHoiAIDot");
    const question = input.value.trim();
    if (!question) return;

    lichSuHoiAIDot.push({ role: "user", text: question });
    lichSuHoiAIDot = lichSuHoiAIDot.slice(-10);
    luuLichSuHoiAIDot();
    hienThiTinNhanAIDot(question, "user");
    input.value = "";
    $("loiHoiAIDot").textContent = "";
    $("btnGuiHoiAIDot").disabled = true;
    try {
      const response = await fetch(`${API}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(layToken() ? { Authorization: `Bearer ${layToken()}` } : {}),
        },
        body: JSON.stringify({ messages: lichSuHoiAIDot }),
      });
      const raw = await response.text();
      let result;
      try {
        result = JSON.parse(raw);
      } catch {
        throw new Error(/^\s*<!doctype html|^\s*<html/i.test(raw)
          ? "Máy chủ chưa có API Hỏi AI. Hãy khởi động lại hoặc triển khai phiên bản mới."
          : "Máy chủ trả về dữ liệu không hợp lệ khi hỏi AI.");
      }
      if (response.status === 401) {
        window.location.href = "/login/login.html";
        return;
      }
      if (!response.ok) throw new Error(result.message || "Không thể gửi câu hỏi đến AI.");
      lichSuHoiAIDot.push({ role: "assistant", text: result.reply });
      lichSuHoiAIDot = lichSuHoiAIDot.slice(-10);
      luuLichSuHoiAIDot();
      hienThiTinNhanAIDot(result.reply, "assistant");
    } catch (error) {
      console.error(error);
      $("loiHoiAIDot").textContent = error.message || "Không thể kết nối đến AI.";
    } finally {
      $("btnGuiHoiAIDot").disabled = false;
      input.focus();
    }
  });

  $("btnThongBaoDot").addEventListener("click", () => {
    const panel = $("bangThongBaoDot");
    const opening = panel.hidden;
    panel.hidden = !opening;
    $("btnThongBaoDot").setAttribute("aria-expanded", String(opening));
    if (opening) {
      const unread = layDanhSachThongBaoDot().map((notice) => `${notice.id}:${notice.thoiGian}`);
      localStorage.setItem(khoaDuLieuDotTuyen("thong_bao_dot_da_xem"), JSON.stringify(unread));
      hienThiThongBaoDot();
    }
  });

  $("btnDongUploadDot").addEventListener("click", dongUploadDot);
  $("btnHuyUploadDot").addEventListener("click", dongUploadDot);
  $("formUploadDot").addEventListener("submit", batDauUploadCVTheoDot);
  $("modalUploadDot").addEventListener("click", (event) => {
    if (event.target === $("modalUploadDot")) dongUploadDot();
  });

  $("btnKhongXoa").addEventListener(
    "click",
    dongXacNhanXoa
  );

  $("btnXacNhanXoa").addEventListener(
    "click",
    xacNhanXoa
  );

  $("modal").addEventListener(
    "click",
    (event) => {
      if (event.target === $("modal")) {
        dongModal();
        if (cheDoEmbed && window.parent !== window) {
          window.parent.postMessage({ type: "tuyendung-ai-close-create-campaign" }, window.location.origin);
        }
      }
    }
  );

  $("modalXoaNhieuDot").addEventListener("click", (event) => {
    if (event.target === $("modalXoaNhieuDot")) dongModalXoaNhieuDot();
  });

  $("modalXacNhan").addEventListener(
    "click",
    (event) => {
      if (event.target === $("modalXacNhan")) {
        dongXacNhanXoa();
      }
    }
  );

  $("modalJD").addEventListener("click", (event) => {
    if (event.target === $("modalJD")) dongWizardJD();
  });
  $("modalChonJD").addEventListener("click", (event) => {
    if (event.target === $("modalChonJD")) $("modalChonJD").classList.remove("hien");
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".menu-hanh-dong-dot")) {
      document.querySelectorAll(".menu-hanh-dong-noi").forEach((menu) => {
        menu.hidden = true;
      });
    }
    if (!event.target.closest(".thong-bao-wrap")) {
      $("bangThongBaoDot").hidden = true;
      $("btnThongBaoDot").setAttribute("aria-expanded", "false");
    }
  });

  ganDatePicker(
    "ngayBatDau",
    "pickerNgayBatDau",
    "btnPickerNgayBatDau"
  );

  ganDatePicker(
    "ngayKetThuc",
    "pickerNgayKetThuc",
    "btnPickerNgayKetThuc"
  );
}

document.addEventListener("DOMContentLoaded", async () => {
  sapXepTinhThanhAZ();
  ganSuKien();

  const modalDanhGiaNhanh = $("modalDanhGiaNhanh");
  const iframeDanhGiaNhanh = $("iframeDanhGiaNhanh");
  const dongModalDanhGiaNhanh = () => {
    modalDanhGiaNhanh.classList.remove("show");
    modalDanhGiaNhanh.setAttribute("aria-hidden", "true");
    iframeDanhGiaNhanh.src = "about:blank";
  };
  $("btnDongDanhGiaNhanh")?.addEventListener("click", dongModalDanhGiaNhanh);
  modalDanhGiaNhanh.addEventListener("click", event => {
    if (event.target === modalDanhGiaNhanh) dongModalDanhGiaNhanh();
  });
  window.addEventListener("message", async event => {
    if (event.origin !== window.location.origin || !["tuyendung-ai-close-evaluation", "tuyendung-ai-feedback-saved"].includes(event.data?.type)) return;
    if (event.data?.type === "tuyendung-ai-feedback-saved") {
      try {
        await api(`/api/danh-gia/mark-interviewed/${encodeURIComponent(event.data.phong_van_id)}`, { method: "POST", body: JSON.stringify({}) });
      } catch (error) {
        console.error("Không cập nhật được trạng thái ứng viên sau khi lưu đánh giá:", error);
      }
      await taiDuLieu();
      alert(`Lưu đánh giá ứng viên ${event.data.ten_ung_vien || "ứng viên"} thành công.`);
      return;
    }
    dongModalDanhGiaNhanh();
    await taiDuLieu();
  });

  if (!layToken()) {
    alert("Vui lòng đăng nhập.");
    window.location.href = "/login/login.html";
    return;
  }

  if (!coQuyenQuanLy()) {
    $("btnThem").style.display = "none";
  }
  if (!coQuyenTaoJD()) {
    $("btnChonDotTaoJD").style.display = "none";
  }

  // Chỉ tải danh sách khi mở trang hoặc sau thao tác thay đổi dữ liệu.
  // Không tự gọi lại /api/dot-tuyen và /api/jd mỗi phút.
  await taiDuLieu();

  const thaoTac = new URLSearchParams(window.location.search).get("tao");
  if (thaoTac === "1" && coQuyenQuanLy()) {
    moFormMoi();
    window.history.replaceState(null, "", window.location.pathname);
    if (cheDoEmbed && window.parent !== window) {
      requestAnimationFrame(() => window.parent.postMessage({ type: "tuyendung-ai-campaign-form-ready" }, window.location.origin));
    }
  }
});

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin || !cheDoEmbed) return;
  if (event.data?.type === "tuyendung-ai-open-create-campaign") moFormMoi();
});