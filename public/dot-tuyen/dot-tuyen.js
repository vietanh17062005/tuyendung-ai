const API = "/api";

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
const SO_DOT_MOI_TRANG = 10;

const $ = (id) => document.getElementById(id);

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
  panel.querySelector(".btn-dong-upload-inline").addEventListener("click", () => panel.remove());
  panel.querySelector(".btn-huy-upload-inline").addEventListener("click", () => panel.remove());
  panel.querySelector("form").addEventListener("submit", guiUploadCVTheoDot);
  panel.querySelector('input[type="file"]').focus();
}

function dongUploadDot() {
  $("modalUploadDot").classList.remove("hien");
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
  const data = new FormData();
  data.append("dot_tuyen_id", idInput.value);
  files.forEach((file) => data.append("files", file));
  button.disabled = true; button.textContent = "Đang tải...";
  progress.hidden = true; progress.value = 0;
  message.className = "thong-bao hien dang-xu-ly"; message.textContent = "Đang tải CV lên đợt tuyển dụng...";
  try {
    const response = await fetch(`${API}/cv/upload-dot-tuyen`, { method: "POST", headers: layToken() ? { Authorization: `Bearer ${layToken()}` } : {}, body: data });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) { window.location.href = "/login/login.html"; return; }
    if (!response.ok) throw new Error(result.message || `Lỗi máy chủ (${response.status})`);
    const candidates = Array.isArray(result.candidates) ? result.candidates : [];
    const failures = Array.isArray(result.errors) ? result.errors.map((item) => `${item.ten_file || "CV"}: ${item.message || "Tải CV thất bại"}`) : [];
    let successCount = 0;
    if (candidates.length) {
      progress.hidden = false; progress.max = candidates.length; button.textContent = "Đang phân tích...";
      for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        message.textContent = `Đã tải CV. Đang phân tích và lưu ${index + 1}/${candidates.length}: ${candidate.ten_file || "CV"}...`;
        try {
          const authHeaders = { "Content-Type": "application/json", ...(layToken() ? { Authorization: `Bearer ${layToken()}` } : {}) };
          const analysisResponse = await fetch(`${API}/cv/review/${candidate.id}/analyze`, { method: "POST", headers: authHeaders, body: JSON.stringify({ cv_id: candidate.cv_id }) });
          const analysisResult = await analysisResponse.json().catch(() => ({}));
          if (!analysisResponse.ok) {
            failures.push(`${candidate.ten_file || "CV"}: Đã lưu CV nhưng AI chưa phân tích được (${analysisResult.message || "lỗi phân tích"}).`);
          } else {
            const duplicateByEmail = (analysisResult.ung_vien_trung_tiem_nang || []).find(item => item.exact && item.ly_do === "Trùng email");
            if (duplicateByEmail) {
              try {
                await api(`${API}/ung-vien/${candidate.id}/cv/${candidate.cv_id}`, { method: "DELETE" });
                failures.push(`${candidate.ten_file || "CV"}: Email đã tồn tại ở ứng viên ${duplicateByEmail.ho_ten || `#${duplicateByEmail.id}`}; đã bỏ qua CV trùng.`);
              } catch (deleteError) {
                failures.push(`${candidate.ten_file || "CV"}: Email đã tồn tại ở ứng viên khác, nhưng chưa tự xóa được hồ sơ trùng. ${deleteError.message || ""}`);
              }
            } else if (analysisResult.phan_tich && analysisResult.jd_id) {
              const saveResponse = await fetch(`${API}/cv/review/${candidate.id}/confirm`, {
                method: "POST", headers: authHeaders,
                body: JSON.stringify({ cv_id: candidate.cv_id, jd_id: analysisResult.jd_id, phan_tich: analysisResult.phan_tich, diem: analysisResult.phan_tich.score?.tong, de_xuat: analysisResult.phan_tich.score?.de_xuat, ly_do: "Xác nhận tự động sau khi AI phân tích CV." })
              });
              const saveResult = await saveResponse.json().catch(() => ({}));
              if (saveResponse.ok) successCount += 1;
              else failures.push(`${candidate.ten_file || "CV"}: Đã lưu CV nhưng chưa lưu được kết quả AI (${saveResult.message || "lỗi lưu kết quả"}).`);
            } else {
              failures.push(`${candidate.ten_file || "CV"}: Đã lưu CV nhưng AI chưa trả đủ dữ liệu để lưu kết quả.`);
            }
          }
        } catch (error) { failures.push(`${candidate.ten_file || "CV"}: ${error.message || "Không kết nối được máy chủ AI"}`); }
        progress.value = index + 1;
      }
    }
    message.className = failures.length ? "thong-bao hien" : "thong-bao hien thanh-cong";
    message.textContent = failures.length ? `Đã tải ${candidates.length} CV. Phân tích và lưu thành công ${successCount}/${candidates.length}. Có ${failures.length} lỗi: ${failures.slice(0, 3).join(" · ")}` : `${result.message || "Đã tải CV thành công."}${candidates.length ? ` Đã phân tích và lưu ${successCount}/${candidates.length} CV.` : ""}`;
    await taiDuLieu();
    const activeItem = danhSachGop.find((item) => Number(item.dot?.id) === Number(idInput.value));
    if (activeItem) await taiCVTheoDot(activeItem.dot);
  } catch (error) {
    console.error(error); message.className = "thong-bao hien"; message.textContent = error.message || "Không thể tải CV lên.";
  } finally { button.disabled = false; button.textContent = "Tải CV lên và phân tích"; }
}

function ngayKetThucDaQua(dot) {
  const raw = dot?.ngay_ket_thuc;
  if (!raw) return false;
  const dateOnly = String(raw).slice(0, 10);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return dateOnly < today;
}

function laDotDaDong(dot) {
  return ngayKetThucDaQua(dot) || ["ket_thuc", "da_dong", "dong", "closed"].includes(
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

    row.innerHTML = `
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

      <td><span class="kenh-nhan-cv">${escapeHTML(kenhNhanCV)}</span></td>
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
    "Nhập mô tả và thời gian tuyển dụng. AI sẽ gợi ý tên trước khi lưu.";
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

  $("tieuDeModal").textContent = "Sửa đợt tuyển dụng";
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

  if (item.jd) {
    $("yeuCauSuaJD").value = "";
    $("thongBaoSuaJD").className = "thong-bao";
    $("thongBaoSuaJD").textContent = "";
    $("jdChinhSua").hidden = false;
    $("jdSuaBoPhan").value = item.jd.bo_phan || "";
    chonDiaDiem($("jdSuaDiaDiem"), item.jd.dia_diem);
    $("jdSuaLoaiHinh").value = item.jd.loai_hinh || "";
    $("jdSuaMucLuong").value = item.jd.muc_luong || "";
    $("jdSuaKyNang").value = item.jd.ky_nang || "";
    $("jdSuaMoTa").value = item.jd.mo_ta || "";
    $("jdSuaYeuCau").value = item.jd.yeu_cau || "";
    $("jdSuaQuyenLoi").value = item.jd.quyen_loi || "";
    $("danhSachTieuChiSua").replaceChildren();
    parseTieuChi(item.jd.tieu_chi).forEach((criterion) => {
      themTieuChiSua(
        criterion.ten || "",
        criterion.trong_so ?? 0,
        criterion.mo_ta || ""
      );
    });
    capNhatTongTrongSoSua();
  }

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
    "Thông tin chiến dịch và bản mô tả công việc.";
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
  taiCVTheoDot(item.dot).catch(error => console.error("Không tải được CV của đợt tuyển dụng:", error));
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
    const table = document.createElement("div"); table.className = "cv-dot-table-wrap";
    const tableEl = document.createElement("table"); tableEl.className = "cv-dot-table";
    tableEl.innerHTML = "<thead><tr><th>STT</th><th>Ứng viên</th><th>Điểm tương thích</th><th>Trạng thái</th><th>Ngày hẹn PV</th><th>Thao tác</th></tr></thead>";
    const tbody = document.createElement("tbody");
    candidates.forEach((candidate, index) => {
      const tr = document.createElement("tr");
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
      else if (hasActiveAppointment) statusLabel = "Đã hẹn";
      statusCell.textContent = statusLabel === "Chưa hẹn" ? "" : statusLabel;
      statusCell.className = `cv-dot-status-cell ${statusLabel === "Đã từ chối" ? "is-rejected" : statusLabel === "Đã tuyển" ? "is-hired" : statusLabel === "Đã hẹn" ? "is-scheduled" : "is-unscheduled"}`;
      const appointmentCell = document.createElement("td");
      appointmentCell.className = "cv-dot-appointment-cell";
      if (statusLabel === "Đã hẹn" && candidate.thoi_gian_phong_van) {
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
      if (candidate.cv_id) {
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
        if (statusLabel === "Đã hẹn") {
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
        } else {
          const schedule = document.createElement("button"); schedule.type = "button"; schedule.textContent = "Hẹn phỏng vấn";
          schedule.addEventListener("click", () => moFormHenPhongVan(candidate, dot)); actions.appendChild(schedule);
        }
      }
      actionsCell.appendChild(actions);
      tr.append(stt, details, score, statusCell, appointmentCell, actionsCell); tbody.appendChild(tr);
      name.addEventListener("click", () => {
        const existing = tr.nextElementSibling;
        if (existing?.classList.contains("cv-dot-expanded-row")) {
          existing.remove(); name.setAttribute("aria-expanded", "false"); name.classList.remove("is-open"); return;
        }
        tbody.querySelectorAll(".cv-dot-expanded-row").forEach(row => row.remove());
        tbody.querySelectorAll(".cv-dot-candidate-toggle").forEach(button => { button.setAttribute("aria-expanded", "false"); button.classList.remove("is-open"); });
        const detailRow = document.createElement("tr"); detailRow.className = "cv-dot-expanded-row";
        const detailCell = document.createElement("td"); detailCell.colSpan = 6; detailCell.className = "cv-dot-expanded-cell";
        detailCell.textContent = "Đang tải thông tin CV và đánh giá AI...";
        detailRow.appendChild(detailCell); tr.after(detailRow);
        name.setAttribute("aria-expanded", "true"); name.classList.add("is-open");
        hienThiChiTietUngVien(detailCell, candidate, dot).catch(error => { detailCell.textContent = error.message || "Không tải được thông tin CV và đánh giá AI."; });
      });
    });
    tableEl.appendChild(tbody); table.appendChild(tableEl); section.appendChild(table);
  } catch (error) {
    section.replaceChildren(); section.appendChild(heading);
    const message = document.createElement("p"); message.textContent = error.message || "Không tải được danh sách CV"; section.appendChild(message);
  }
}

async function hienThiChiTietUngVien(container, candidate, dot) {
  container.replaceChildren();
  const panel = document.createElement("div"); panel.className = "cv-dot-candidate-detail";
  const info = document.createElement("section"); info.className = "cv-dot-detail-section";
  const infoTitle = document.createElement("h4"); infoTitle.textContent = "Thông tin ứng viên / CV"; info.appendChild(infoTitle);
  const infoGrid = document.createElement("div"); infoGrid.className = "cv-dot-detail-grid";
  const addInfo = (label, value) => { if (value === null || value === undefined || String(value).trim() === "") return; const item = document.createElement("div"); item.className = "cv-dot-detail-item"; const key = document.createElement("strong"); key.textContent = label; const val = document.createElement("span"); val.textContent = String(value); item.append(key, val); infoGrid.appendChild(item); };
  addInfo("Họ và tên", candidate.ho_ten); addInfo("Email", candidate.email); addInfo("Số điện thoại", candidate.so_dien_thoai || candidate.sdt); addInfo("Địa chỉ", candidate.dia_chi); addInfo("LinkedIn", candidate.linkedin); addInfo("GitHub", candidate.github); addInfo("Nguồn ứng viên", candidate.nguon); addInfo("Tệp CV", candidate.ten_file);
  info.appendChild(infoGrid); panel.appendChild(info);
  const analysisSection = document.createElement("section"); analysisSection.className = "cv-dot-detail-section";
  const analysisTitle = document.createElement("h4"); analysisTitle.textContent = "Phân tích và đánh giá của AI"; analysisSection.appendChild(analysisTitle);
  const analysisContent = document.createElement("div"); analysisContent.className = "cv-dot-ai-detail"; analysisContent.textContent = "Đang tải kết quả phân tích..."; analysisSection.appendChild(analysisContent); panel.appendChild(analysisSection);
  const cvSection = document.createElement("section"); cvSection.className = "cv-dot-detail-section";
  const cvTitle = document.createElement("h4"); cvTitle.textContent = "Nội dung CV"; cvSection.appendChild(cvTitle);
  const cvContent = document.createElement("div"); cvContent.className = "cv-dot-inline-preview"; cvContent.textContent = "Đang tải tệp CV..."; cvSection.appendChild(cvContent); panel.appendChild(cvSection);
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
  const scoreRaw = detail?.phan_tich?.diem_phu_hop ?? detail?.phan_tich?.diem ?? candidate.diem_ai ?? candidate.diem_ghi_de ?? analysis?.score?.tong ?? analysis?.score?.total;
  analysisContent.replaceChildren();
  if (scoreRaw !== null && scoreRaw !== undefined && scoreRaw !== "" && Number.isFinite(Number(scoreRaw))) { const scoreBadge = document.createElement("div"); scoreBadge.className = "cv-dot-ai-score"; scoreBadge.textContent = `Điểm tương thích: ${Math.round(Number(scoreRaw) * 10) / 10}/100`; analysisContent.appendChild(scoreBadge); }
  const preferredLabels = {
    summary: "Tóm tắt", tom_tat: "Tóm tắt", summary_candidate: "Tóm tắt ứng viên", strengths: "Điểm mạnh", diem_manh: "Điểm mạnh", weaknesses: "Điểm cần cải thiện", diem_yeu: "Điểm cần cải thiện", matched_skills: "Kỹ năng phù hợp", ky_nang_phu_hop: "Kỹ năng phù hợp", missing_skills: "Kỹ năng còn thiếu", ky_nang_thieu: "Kỹ năng còn thiếu", recommendation: "Đề xuất của AI", de_xuat: "Đề xuất của AI", explanation: "Giải thích điểm số", ly_do: "Lý do đánh giá", flags: "Lưu ý", canh_bao: "Lưu ý", experience: "Kinh nghiệm", kinh_nghiem: "Kinh nghiệm", education: "Học vấn", hoc_van: "Học vấn", skills: "Kỹ năng", ky_nang: "Kỹ năng"
  };
  const labels = value => preferredLabels[value] || String(value).replace(/[_-]+/g, " ").replace(/\b\w/g, char => char.toUpperCase());
  const appendValue = (parent, key, value, depth = 0) => {
    if (value === null || value === undefined || value === "" || key === "score" || key === "tong" || key === "total") return;
    if (typeof value === "object") {
      if (depth >= 2) { const item = document.createElement("p"); item.textContent = `${labels(key)}: ${Array.isArray(value) ? value.map(x => typeof x === "object" ? JSON.stringify(x) : String(x)).join(", ") : JSON.stringify(value)}`; parent.appendChild(item); return; }
      const group = document.createElement("div"); group.className = "cv-dot-ai-group"; const heading = document.createElement("strong"); heading.textContent = labels(key); group.appendChild(heading);
      const entries = Array.isArray(value) ? value.map((entry, index) => [String(index + 1), entry]) : Object.entries(value);
      entries.forEach(([childKey, childValue]) => appendValue(group, childKey, childValue, depth + 1)); if (group.childElementCount > 1) parent.appendChild(group); return;
    }
    const item = document.createElement("div"); item.className = "cv-dot-ai-item"; const keyEl = document.createElement("strong"); keyEl.textContent = `${labels(key)}: `; const valueEl = document.createElement("span"); valueEl.textContent = String(value); item.append(keyEl, valueEl); parent.appendChild(item);
  };
  if (analysis && typeof analysis === "object") {
    const entries = Array.isArray(analysis) ? analysis.map((entry, index) => [String(index + 1), entry]) : Object.entries(analysis);
    entries.forEach(([key, value]) => appendValue(analysisContent, key, value));
  }
  if (!analysisContent.childElementCount) { const noAnalysis = document.createElement("p"); noAnalysis.textContent = "Chưa có kết quả phân tích AI được lưu cho ứng viên này."; analysisContent.appendChild(noAnalysis); }
  cvContent.replaceChildren();
  const cvId = cv?.id || candidate.cv_id;
  if (cvId) {
    try {
      const response = await fetch(`${API}/ung-vien/${candidate.id}/cv/${cvId}`, { headers: layToken() ? { Authorization: `Bearer ${layToken()}` } : {} });
      if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.message || `Không tải được CV (${response.status})`); }
      let blob = await response.blob(); const disposition = response.headers.get("content-disposition") || "";
      const fileName = cv?.ten_file || candidate.ten_file || "";
      const isPdf = blob.type === "application/pdf" || /\.pdf(?:[";]|$)/i.test(disposition) || /\.pdf$/i.test(fileName);
      if (isPdf && blob.type !== "application/pdf") blob = new Blob([blob], { type: "application/pdf" });
      if (isPdf) {
        const objectUrl = URL.createObjectURL(blob); const frame = document.createElement("iframe"); frame.className = "cv-dot-inline-frame"; frame.title = `CV của ${profile.ho_ten || "ứng viên"}`; frame.src = objectUrl; cvContent.appendChild(frame);
        const revoke = () => URL.revokeObjectURL(objectUrl); frame.addEventListener("load", () => { frame.dataset.loaded = "true"; });
        const download = document.createElement("a"); download.href = objectUrl; download.download = cv?.ten_file || candidate.ten_file || "CV.pdf"; download.textContent = "Tải CV về máy"; download.className = "cv-dot-download-link"; cvContent.appendChild(download);
        const observer = new MutationObserver(() => { if (!frame.isConnected) { revoke(); observer.disconnect(); } }); observer.observe(container, { childList: true, subtree: true });
      } else {
        const objectUrl = URL.createObjectURL(blob); const download = document.createElement("a"); download.href = objectUrl; download.download = cv?.ten_file || candidate.ten_file || "CV"; download.textContent = `Tải CV xuống (${cv?.ten_file || candidate.ten_file || "tệp CV"})`; download.className = "cv-dot-download-link"; cvContent.appendChild(download);
      }
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
  const heading = document.createElement("strong"); heading.textContent = title;
  const close = document.createElement("button"); close.type = "button"; close.className = "cv-dot-modal-close"; close.textContent = "×"; close.setAttribute("aria-label", "Đóng");
  const dong = () => { overlay.remove(); document.removeEventListener("keydown", esc); };
  const esc = (event) => { if (event.key === "Escape") dong(); };
  close.addEventListener("click", dong);
  overlay.addEventListener("click", (event) => { if (event.target === overlay) dong(); });
  header.append(heading, close); modal.appendChild(header); overlay.appendChild(modal); document.body.appendChild(overlay);
  document.addEventListener("keydown", esc);
  return { overlay, modal, dong };
}

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
    const pdfByName = /\.pdf(?:[";]|$)/i.test(disposition);
    if (pdfByName && blob.type !== "application/pdf") blob = new Blob([blob], { type: "application/pdf" });
    const objectUrl = URL.createObjectURL(blob);
    frame.src = objectUrl; frame.hidden = false; frame.dataset.objectUrl = objectUrl;
    modal.querySelector(".cv-dot-modal-close").addEventListener("click", () => URL.revokeObjectURL(objectUrl), { once: true });
    status.textContent = blob.type === "application/pdf" ? "Bản xem trước PDF" : "Định dạng này có thể không xem trực tiếp được trong trình duyệt.";
    if (blob.type !== "application/pdf") {
      const download = document.createElement("a"); download.href = objectUrl; download.download = "CV"; download.textContent = "Tải CV về máy"; download.className = "cv-preview-download"; status.append(" ", download);
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
    <label>Người phỏng vấn <span>*</span><select name="nguoi_phong_van_ids" multiple size="4" required><option value="">Đang tải danh sách...</option></select><small>Giữ Ctrl (Windows) hoặc Command (Mac) để chọn nhiều người.</small></label>
    <label>Hình thức <span>*</span><select name="hinh_thuc"><option value="online">Trực tuyến (Online)</option><option value="offline">Trực tiếp (Offline)</option></select></label>
    <label>Địa điểm / Link họp<input name="dia_diem" maxlength="500" placeholder="Ví dụ: Google Meet hoặc Phòng họp 02"></label>
    <label>Ghi chú<textarea name="ghi_chu" rows="3" maxlength="5000" placeholder="Nội dung cần chuẩn bị..."></textarea></label>
    <p class="cv-dot-interview-error" role="alert"></p>
    <div class="cv-dot-modal-actions"><button type="button" class="cv-dot-cancel">Đóng</button><button type="submit" class="cv-dot-save">${dangSuaLich ? "Lưu thay đổi lịch" : "Lưu lịch phỏng vấn"}</button></div>`;
  form.querySelector(".cv-dot-modal-subtitle").textContent = `${candidate.ho_ten || "Ứng viên"} · ${dot.ten_dot || dot.ten || dot.ten_dot_tuyen || "Đợt tuyển dụng"}`;
  modal.appendChild(form);
  form.querySelector(".cv-dot-cancel").addEventListener("click", dong);
  const dateInput = form.elements.ngay_phong_van;
  const timeInput = form.elements.gio_phong_van;
  const now = new Date(Date.now() + 60 * 60 * 1000); now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  dateInput.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  timeInput.value = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  const interviewerSelect = form.elements.nguoi_phong_van_ids;
  try {
    const result = await api(`${API}/phong-van/nguoi-phong-van`);
    const people = Array.isArray(result) ? result : (result.data || result.danhSach || []);
    interviewerSelect.replaceChildren();
    people.forEach(person => {
      const option = document.createElement("option"); option.value = String(person.id);
      option.textContent = `${person.ho_ten || person.ten || person.email || `Tài khoản #${person.id}`} — ${person.vai_tro || person.role || "Người phỏng vấn"}`;
      interviewerSelect.appendChild(option);
    });
    if (!people.length) interviewerSelect.innerHTML = '<option value="">Chưa có người phỏng vấn khả dụng</option>';
  } catch (error) {
    interviewerSelect.innerHTML = '<option value="">Không tải được danh sách</option>';
    form.querySelector(".cv-dot-interview-error").textContent = error.message || "Không tải được người phỏng vấn.";
  }
  if (dangSuaLich) {
    try {
      const lich = await api(`${API}/phong-van/${interviewId}`);
      const rawDate = String(lich.thoi_gian || lich.thoi_gian_phong_van || lich.bat_dau || "");
      const dateMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
      if (dateMatch) {
        dateInput.value = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
        timeInput.value = `${dateMatch[4]}:${dateMatch[5]}`;
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

  const jdHienTai = item.jd || item.jds?.[0] || null;
  const jds = jdHienTai ? [jdHienTai] : [];
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

    const criteria = Array.isArray(jd.tieu_chi) ? jd.tieu_chi : parseTieuChi(jd.tieu_chi);
    if (criteria.length) {
      const rubric = document.createElement("div");
      rubric.className = "jd-thong-tin-muc";

      const rubricTitle = document.createElement("strong");
      rubricTitle.textContent = "Bộ tiêu chí chấm điểm";
      rubric.appendChild(rubricTitle);

      const list = document.createElement("ul");
      criteria.forEach((criterion) => {
        const entry = document.createElement("li");
        const description = criterion.mo_ta ? ` — ${criterion.mo_ta}` : "";
        entry.textContent = `${criterion.ten || "Tiêu chí"} (${Number(criterion.trong_so) || 0}%)${description}`;
        list.appendChild(entry);
      });
      rubric.appendChild(list);
      card.appendChild(rubric);
    }

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
    let jdTieuDe = "";
    if (dangSua?.jd?.id) {
      jdTieuDe = dangSua.jd.tieu_de || "";
      rubric = layDanhSachTieuChiSua();
      if (!rubric.length || capNhatTongTrongSoSua() !== 100) {
        throw new Error("Bộ tiêu chí cần có ít nhất một mục và tổng trọng số bằng 100%.");
      }
    }

    const dotId = await luuDotTuyen();
    if (!dotId) return;
    if (dangSua?.jd?.id) {
      try {
        await api(`${API}/jd/${dangSua.jd.id}`, {
          method: "PUT",
          body: JSON.stringify({
            dot_tuyen_id: dotId,
            bo_phan: $("jdSuaBoPhan").value.trim(),
            dia_diem: $("jdSuaDiaDiem").value.trim(),
            loai_hinh: $("jdSuaLoaiHinh").value,
            muc_luong: $("jdSuaMucLuong").value.trim(),
            ky_nang: $("jdSuaKyNang").value.trim(),
            tieu_de: jdTieuDe,
            mo_ta: $("jdSuaMoTa").value.trim(),
            yeu_cau: $("jdSuaYeuCau").value.trim(),
            quyen_loi: $("jdSuaQuyenLoi").value.trim(),
            tieu_chi: rubric,
          }),
        });
      } catch (error) {
        throw new Error(`Đợt tuyển dụng đã lưu nhưng bản mô tả chưa cập nhật được: ${error.message}`);
      }
    }
    $("thongBao").className = "thong-bao hien thanh-cong";
    $("thongBao").textContent = dangSua?.jd?.id
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

function ganSuKien() {
  $("btnThem").addEventListener(
    "click",
    moFormMoi
  );

  $("btnDong").addEventListener("click", dongModal);
  $("btnSuaTrongXem").addEventListener("click", () => {
    const item = window.dotTuyenDangXem;
    if (!item) return;
    dangSua = item;
    dangXem = false;
    moKhoaForm();
    $("tieuDeModal").textContent = "Sửa đợt tuyển dụng";
    $("tieuDeModal").nextElementSibling.textContent = "Chỉnh sửa thông tin ngay trong cửa sổ này.";
    $("form").querySelector('[type="submit"]').textContent = "Lưu đợt tuyển dụng";
    $("hanhDongChiTiet").hidden = true;
    $("jdThongTin").hidden = true;
    $("jdChinhSua").hidden = !item.jd;
    if (item.jd) {
      const jd = item.jd;
      $("jdSuaBoPhan").value = jd.bo_phan || "";
      chonDiaDiem($("jdSuaDiaDiem"), jd.dia_diem);
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
      capNhatTongTrongSoSua();
    }
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
      }
    }
  );

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
  ganSuKien();

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

  await taiDuLieu();
  window.setInterval(taiDuLieu, 60_000);

  const thaoTac = new URLSearchParams(window.location.search).get("tao");
  if (thaoTac === "1" && coQuyenQuanLy()) {
    moFormMoi();
    window.history.replaceState(null, "", window.location.pathname);
  }
});