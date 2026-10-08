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
  const response = await fetch(url, {
    ...options,
    headers: {
      ...taoHeaders(),
      ...(options.headers || {}),
    },
  });

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
  select.value = exact?.value || "";
}

function hienThiTrangThai(value) {
  const map = {
    nhap: "Nháp",
    dang_tuyen: "Đang tuyển",
    tam_dung: "Tạm dừng",
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
  const nhap = danhSachDotTuyen.filter((dot) => dot?.trang_thai === "nhap").length;
  const dangTuyen = danhSachDotTuyen.filter((dot) => dot?.trang_thai === "dang_tuyen").length;
  const tamDung = danhSachDotTuyen.filter((dot) => dot?.trang_thai === "tam_dung").length;
  const ketThuc = danhSachDotTuyen.filter((dot) =>
    ["ket_thuc", "da_dong", "dong", "closed"].includes(String(dot?.trang_thai || "").toLowerCase())
  ).length;

  $("thongKeDangTuyen").textContent = so(dangTuyen);
  $("thongKeTamDung").textContent = so(tamDung);
  $("thongKeKetThuc").textContent = so(ketThuc);
  $("thongKeJD").textContent = so(danhSachJD.length);
  $("demTatCa").textContent = so(danhSachDotTuyen.length);
  $("demNhap").textContent = so(nhap);
  $("demDangTuyen").textContent = so(dangTuyen);
  $("demTamDung").textContent = so(tamDung);
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
  $("idDotUpload").value = dot.id;
  $("tenDotUpload").textContent = `${dot.ten_dot || dot.ten || "Đợt tuyển dụng"} · CV sẽ được thêm vào danh sách ứng viên.`;
  $("fileUploadDot").value = "";
  $("thongBaoUploadDot").className = "thong-bao";
  $("thongBaoUploadDot").textContent = "";
  $("modalUploadDot").classList.add("hien");
}

function dongUploadDot() {
  $("modalUploadDot").classList.remove("hien");
}

async function guiUploadCVTheoDot(event) {
  event.preventDefault();
  const files = Array.from($("fileUploadDot").files || []);
  if (!files.length) return;
  const data = new FormData();
  data.append("dot_tuyen_id", $("idDotUpload").value);
  files.forEach((file) => data.append("files", file));
  const button = $("btnGuiUploadDot");
  button.disabled = true;
  button.textContent = "Đang tải...";
  $("thongBaoUploadDot").className = "thong-bao hien dang-xu-ly";
  $("thongBaoUploadDot").textContent = "Đang tải CV lên đợt tuyển dụng...";
  try {
    const response = await fetch(`${API}/cv/upload-dot-tuyen`, {
      method: "POST",
      headers: layToken() ? { Authorization: `Bearer ${layToken()}` } : {},
      body: data,
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
      window.location.href = "/login/login.html";
      return;
    }
    if (!response.ok) throw new Error(result.message || `Lỗi máy chủ (${response.status})`);
    $("thongBaoUploadDot").className = "thong-bao hien thanh-cong";
    $("thongBaoUploadDot").textContent = result.message || "Đã tải CV thành công.";
    await taiDuLieu();
    setTimeout(dongUploadDot, 900);
  } catch (error) {
    console.error(error);
    $("thongBaoUploadDot").className = "thong-bao hien";
    $("thongBaoUploadDot").textContent = error.message || "Không thể tải CV lên.";
  } finally {
    button.disabled = false;
    button.textContent = "Tải CV lên";
  }
}

function laDotDaDong(dot) {
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
      (trangThai === "ket_thuc" ? laDotDaDong(dot) : dot?.trang_thai === trangThai);

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

    const trangThai = dot?.trang_thai || "nhap";
    const soUngVien = Number(dot?.so_ung_vien) || 0;
    const ungVienHopTieuChi = Number(dot?.so_ung_vien_hop_tieu_chi) || 0;
    const kenhNhanCV = Array.isArray(dot?.kenh_nhan_cv)
      ? dot.kenh_nhan_cv.filter(Boolean).join(", ")
      : dot?.kenh_nhan_cv || "-";

    const row = document.createElement("tr");

    row.innerHTML = `
      <td class="cot-stt">${batDau + index + 1}</td>
      <td>
        <div class="chien-dich-ten">
          <span class="chien-dich-thong-tin">
            <strong class="ten-dot">${escapeHTML(tenDot)}</strong>
            <span class="mo-ta-bang">${escapeHTML(dot?.mo_ta || "Chưa có mô tả")}</span>
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

      <td>
        <div class="menu-hanh-dong-dot">
          <button type="button" class="btn-ba-cham-dot" data-toggle-menu aria-label="Thao tác với ${escapeHTML(tenDot)}">⋯</button>
          <div class="menu-hanh-dong-noi" hidden>
            <button type="button" data-action="xem" data-id="${dot.id}">Xem</button>
            ${coQuyenQuanLy() ? `<button type="button" data-action="sua" data-id="${dot.id}">Sửa</button>` : ""}
            ${coQuyenQuanLy() ? `<button type="button" data-action="xoa" data-id="${dot.id}">Xóa</button>` : ""}
            ${coQuyenTaoJD() ? `<button type="button" data-action="tao-jd" data-id="${dot.id}">Tạo JD bằng AI</button>` : ""}
            ${["admin", "manager", "hr"].includes(layVaiTro()) ? `<button type="button" data-action="upload" data-id="${dot.id}">Tải CV lên</button>` : ""}
          </div>
        </div>
      </td>
    `;

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
  dongModal();

  $("tieuDeModal").textContent = "Thêm đợt tuyển dụng";
  $("tieuDeModal").nextElementSibling.textContent =
    "Tạo chiến dịch mới để bắt đầu quy trình tuyển dụng.";
  $("form").querySelector('[type="submit"]').textContent = "Tạo chiến dịch";
  $("trangThai").value = "nhap";

  moModal();
}

function moFormSua(item) {
  dongModal();

  dangSua = item;

  $("tieuDeModal").textContent = "Sửa đợt tuyển dụng";
  $("tieuDeModal").nextElementSibling.textContent =
    "Cập nhật thông tin chiến dịch và bản mô tả công việc.";
  $("form").querySelector('[type="submit"]').textContent = "Lưu thay đổi";

  const dot = item.dot;
  $("id").value = dot.id || "";
  $("ten").value = dot.ten_dot || dot.ten || "";
  $("moTa").value = dot.mo_ta || "";
  $("ngayBatDau").value = dinhDangNgayInput(dot.ngay_bat_dau);
  $("ngayKetThuc").value = dinhDangNgayInput(dot.ngay_ket_thuc);
  $("trangThai").value = dot.trang_thai || "nhap";

  if (item.jd) {
    $("jdChinhSua").hidden = false;
    $("jdSuaBoPhan").value = item.jd.bo_phan || "";
    chonDiaDiem($("jdSuaDiaDiem"), item.jd.dia_diem);
    $("jdSuaLoaiHinh").value = item.jd.loai_hinh || "";
    $("jdSuaMucLuong").value = item.jd.muc_luong || "";
    $("jdSuaHanNhan").value = ngaySangISO(dinhDangNgayInput(item.jd.han_nhan_ho_so));
    $("jdSuaKyNang").value = item.jd.ky_nang || "";
    $("jdSuaTieuDe").value = item.jd.tieu_de || "";
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

  $("tieuDeModal").textContent = "Xem thông tin tuyển dụng";
  $("tieuDeModal").nextElementSibling.textContent =
    "Thông tin chiến dịch và bản mô tả công việc đã tạo.";

  const dot = item.dot;
  $("id").value = dot.id || "";
  $("ten").value = dot.ten_dot || dot.ten || "";
  $("moTa").value = dot.mo_ta || "";
  $("ngayBatDau").value = dinhDangNgayInput(dot.ngay_bat_dau);
  $("ngayKetThuc").value = dinhDangNgayInput(dot.ngay_ket_thuc);
  $("trangThai").value = dot.trang_thai || "nhap";

  hienThiThongTinJD(item);
  khoaFormXem();
  moModal();
}

function themMucThongTinJD(container, label, value) {
  const section = document.createElement("div");
  section.className = "jd-thong-tin-muc";

  const title = document.createElement("strong");
  title.textContent = label;

  const content = document.createElement("p");
  content.textContent = value || "Chưa có thông tin.";

  section.append(title, content);
  container.appendChild(section);
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

    const title = document.createElement("h4");
    title.textContent = jd.tieu_de || "Bản mô tả chưa có tiêu đề";
    card.appendChild(title);

    const status = document.createElement("span");
    status.className = `jd-trang-thai ${layClassTrangThai(jd.trang_thai)}`;
    status.textContent = hienThiTrangThaiJD(jd.trang_thai);
    card.appendChild(status);

    const thongTinViTri = [
      jd.bo_phan && `Bộ phận: ${jd.bo_phan}`,
      jd.dia_diem && `Địa điểm: ${jd.dia_diem}`,
      jd.loai_hinh && `Hình thức: ${jd.loai_hinh}`,
      jd.muc_luong && `Mức lương: ${jd.muc_luong}`,
      jd.han_nhan_ho_so && `Hạn nhận hồ sơ: ${dinhDangNgay(jd.han_nhan_ho_so)}`,
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

  $("btnLuuVaTaoJD").style.display = "none";
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

  $("btnLuuVaTaoJD").style.display = "";
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
  const ten = $("ten").value.trim();

  if (!ten) {
    alert("Vui lòng nhập tên đợt tuyển dụng.");
    $("ten").focus();
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

async function luuDotTuyen() {
  if (!kiemTraForm()) {
    return false;
  }

  const dotPayload = {
    ten_dot: $("ten").value.trim(),
    ten: $("ten").value.trim(),
    mo_ta: $("moTa").value.trim(),
    trang_thai: $("trangThai").value,
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
      jdTieuDe = $("jdSuaTieuDe").value.trim();
      if (!jdTieuDe) {
        throw new Error("Vui lòng nhập tiêu đề bản mô tả.");
      }
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
            han_nhan_ho_so: $("jdSuaHanNhan").value || null,
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
      : "Lưu đợt tuyển dụng thành công.";
    await taiDuLieu();
    dongModal();
  } catch (error) {
    console.error(error);
    $("thongBao").className = "thong-bao hien";
    $("thongBao").textContent = error.message || "Không thể lưu đợt tuyển dụng.";
  } finally {
    button.disabled = false;
    button.textContent = nhanNutLuu;
  }
}

async function luuVaTaoJD() {
  if (dangXem) return;

  const button = $("btnLuuVaTaoJD");
  const moTaViTri = $("jdYTuongNhanh").value.trim();
  button.disabled = true;
  button.textContent = "Đang lưu...";

  try {
    dotTuyenJDId = await luuDotTuyen();
    if (!dotTuyenJDId) return;
    await taiDuLieu();
    if (!dangSua?.dot?.id) {
      $("ten").value = danhSachDotTuyen.find(
        (item) => Number(item.id) === Number(dotTuyenJDId)
      )?.ten_dot || $("ten").value;
    }
    dongModal();
    moWizardJD();
    if (moTaViTri) $("jdYTuong").value = moTaViTri;
  } catch (error) {
    console.error(error);
    $("thongBao").className = "thong-bao hien";
    $("thongBao").textContent = error.message || "Không thể lưu đợt tuyển dụng.";
  } finally {
    button.disabled = false;
    button.textContent = "Lưu & tạo JD bằng AI";
  }
}

function chuyenBuocJD(buoc) {
  [1, 2, 3].forEach((numero) => {
    $(`jdBuoc${numero}`).classList.toggle("hien", numero === buoc);
    $(`jdChiBao`).children[numero - 1]?.classList.toggle("dang", numero === buoc);
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
  $("jdTenDot").textContent =
    dot?.ten_dot || dot?.ten || $("ten").value.trim() || "-";
  $("jdYTuong").value = dot
    ? [dot.ten_dot || dot.ten, dot.mo_ta].filter(Boolean).join("\n")
    : "";
  $("jdTemplate").value = "";
  $("jdNgonNgu").value = "vi";
  const jd = item?.jd || item?.jds?.[0] || {};
  $("jdBoPhan").value = jd.bo_phan || "";
  chonDiaDiem($("jdDiaDiem"), jd.dia_diem);
  $("jdLoaiHinh").value = jd.loai_hinh || "";
  $("jdMucLuong").value = jd.muc_luong || "";
  $("jdHanNhan").value = jd.han_nhan_ho_so
    ? ngaySangISO(dinhDangNgayInput(jd.han_nhan_ho_so))
    : "";
  $("jdKyNang").value = jd.ky_nang || "";
  $("khungCauHoi").innerHTML = "";
  $("modalJD").classList.add("hien");
  chuyenBuocJD(1);
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
    hienThiCauHoiJD(result?.data?.cau_hoi || []);
    chuyenBuocJD(2);
  } catch (error) {
    $("thongBaoJD").className = "thong-bao hien";
    $("thongBaoJD").textContent = error.message || "Không tạo được câu hỏi làm rõ.";
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
        han_nhan_ho_so: $("jdHanNhan").value || null,
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
    alert("Đã lưu bản mô tả nháp thành công.");
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

  $("btnDong").addEventListener(
    "click",
    dongModal
  );

  $("btnHuy").addEventListener(
    "click",
    () => {
      if (dangXem) {
        dongModal();
      } else {
        dongModal();
      }
    }
  );

  $("form").addEventListener(
    "submit",
    luuTuyenDung
  );

  $("btnLuuVaTaoJD").addEventListener("click", luuVaTaoJD);
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
  $("formUploadDot").addEventListener("submit", guiUploadCVTheoDot);

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