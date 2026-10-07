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

function hienThiTrangThai(value) {
  const map = {
    nhap: "Nháp",
    dang_tuyen: "Đang tuyển",
    tam_dung: "Tạm dừng",
    ket_thuc: "Kết thúc",
    da_dong: "Kết thúc",
    dong: "Kết thúc",
    closed: "Kết thúc",
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
  $("demDangTuyen").textContent = so(dangTuyen);
  $("demTamDung").textContent = so(tamDung);
  $("demKetThuc").textContent = so(ketThuc);
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
  danhSachLoc.sort((a, b) => Number(laDotDaDong(a.dot)) - Number(laDotDaDong(b.dot)));

  const tbody = $("danhSach");

  tbody.innerHTML = "";

  $("tongSo").textContent = `Hiển thị ${danhSachLoc.length} / ${danhSachDotTuyen.length} đợt tuyển dụng`;

  if (!danhSachLoc.length) {
    $("khongCoDuLieu").style.display = "block";
    return;
  }

  $("khongCoDuLieu").style.display = "none";

  danhSachLoc.forEach((item, index) => {
    const dot = item.dot;

    const tenDot =
      dot?.ten_dot ||
      dot?.ten ||
      "-";

    const ngayBatDau = dinhDangNgay(dot?.ngay_bat_dau);
    const ngayKetThuc = dinhDangNgay(dot?.ngay_ket_thuc);

    const trangThai = dot?.trang_thai || "nhap";
    const thoiGian = [ngayBatDau, ngayKetThuc].filter((ngay) => ngay !== "-").join(" – ") || "-";
    const soUngVien = Number(dot?.so_ung_vien) || 0;
    const soJD = item.jds?.length || (item.jd ? 1 : 0);

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>
        <div class="chien-dich-ten">
          <span class="chien-dich-so-thu-tu">${index + 1}</span>
          <span class="chien-dich-thong-tin">
            <strong class="ten-dot">${escapeHTML(tenDot)}</strong>
            <span class="mo-ta-bang">${escapeHTML(dot?.mo_ta || "Chưa có mô tả")}</span>
          </span>
        </div>
      </td>

      <td><span class="so-ung-vien-dot">♙ ${escapeHTML(soUngVien.toLocaleString("vi-VN"))}</span></td>

      <td>
        <span class="nhan-jd ${soJD ? "co-jd" : "chua-jd"}">${soJD ? `✦ ${soJD} bản mô tả` : "Chưa có bản mô tả"}</span>
      </td>

      <td>
        <span class="badge ${layClassTrangThai(trangThai)}">
          ${escapeHTML(hienThiTrangThai(trangThai))}
        </span>
      </td>

      <td><span class="thoi-gian-dot">${escapeHTML(thoiGian)}</span></td>

      <td>
        <div class="action-group">
          ${coQuyenTaoJD()
        ? `<button
                type="button"
                class="btn-tao-jd"
                data-action="tao-jd"
                data-id="${dot.id}"
              >
                ✦ Tạo bản mô tả
              </button>`
        : ""}
          <button
            type="button"
            class="btn-xem"
            data-action="xem"
            data-id="${dot.id}"
          >
            Xem
          </button>

          ${coQuyenQuanLy()
        ? `
                <button
                  type="button"
                  class="btn-sua"
                  data-action="sua"
                  data-id="${dot.id}"
                >
                  Sửa
                </button>

                <button
                  type="button"
                  class="btn-xoa"
                  data-action="xoa"
                  data-id="${dot.id}"
                >
                  Xóa
                </button>
              `
        : ""
      }
        </div>
      </td>
    `;

    tbody.appendChild(row);
  });
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
  if ($("thongBaoTieuChi")) $("thongBaoTieuChi").textContent = "";
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
    if ($("thongBaoTieuChi")) {
      $("thongBaoTieuChi").textContent =
        `Tổng trọng số đang vượt ${tong - 100}%. Tối đa là 100%.`;
    }
  } else {
    $("tongTrongSo").classList.remove("lech");
    if ($("thongBaoTieuChi")) $("thongBaoTieuChi").textContent = "";
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

async function goiYAI() {
  const tenDot = $("ten").value.trim();

  if (!tenDot) {
    alert(
      "Vui lòng nhập tên đợt tuyển dụng trước khi dùng AI."
    );

    $("ten").focus();

    return;
  }

  const button = $("btnGoiYAI");

  const payload = {
    ten_dot: tenDot,
    mo_ta_dot: $("moTa").value.trim(),
    tieu_de: $("tieuDe").value.trim(),
    mo_ta: $("jdMoTa").value.trim(),
    yeu_cau: $("jdYeuCau").value.trim(),
    quyen_loi: $("jdQuyenLoi").value.trim(),
    ghi_chu: $("jdGhiChu").value.trim(),
  };

  button.disabled = true;
  button.innerHTML = "<span>⏳</span> AI đang tạo...";

  $("thongBao").className =
    "thong-bao hien dang-xu-ly";

  $("thongBao").textContent =
    "AI đang phân tích thông tin và tạo gợi ý JD...";

  try {
    const result = await api(`${API}/ai/generate-jd`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const data =
      result?.data ||
      result?.result ||
      result;

    if (!data) {
      throw new Error("AI không trả về dữ liệu.");
    }

    if (data.tieu_de) {
      $("tieuDe").value = data.tieu_de;
    }

    if (data.mo_ta) {
      $("jdMoTa").value = data.mo_ta;
    }

    if (data.yeu_cau) {
      $("jdYeuCau").value = data.yeu_cau;
    }

    if (data.quyen_loi) {
      $("jdQuyenLoi").value = data.quyen_loi;
    }

    if (Array.isArray(data.tieu_chi)) {
      $("danhSachTieuChi").innerHTML = "";

      data.tieu_chi.forEach((item) => {
        themTieuChi(
          item?.ten || "",
          item?.trong_so ?? 0,
          item?.mo_ta || ""
        );
      });
    }

    capNhatTongTrongSo();

    $("thongBao").className =
      "thong-bao hien thanh-cong";

    $("thongBao").textContent =
      "AI đã tạo gợi ý. Bạn có thể chỉnh sửa toàn bộ nội dung trước khi lưu.";
  } catch (error) {
    console.error(error);

    const message = error.message || "Không thể gọi AI.";

    $("thongBao").className = "thong-bao";

    $("thongBao").textContent = message;

    alert(message);
  } finally {
    button.disabled = false;
    button.innerHTML =
      "<span>✦</span> Gợi ý bằng AI";
  }
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
  } catch (error) {
    console.error(error);
    $("thongBao").className = "thong-bao hien";
    $("thongBao").textContent = error.message || "Không thể lưu đợt tuyển dụng.";
  } finally {
    button.disabled = false;
    button.textContent = "Lưu & tạo bản mô tả";
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
  const button = event.target.closest("button[data-action]");

  if (!button) return;

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
    dotTuyenJDId = item.dot.id;
    moWizardJD(item);
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
      $("timKiemToanCuc").value = event.target.value;
      hienThiDanhSach();
    }
  );

  $("timKiemToanCuc").addEventListener("input", (event) => {
    $("oTimKiem").value = event.target.value;
    hienThiDanhSach();
  });

  $("locTrangThai").addEventListener(
    "change",
    hienThiDanhSach
  );

  document.querySelector(".tab-trang-thai").addEventListener("click", (event) => {
    const button = event.target.closest("[data-status]");
    if (!button) return;
    $("locTrangThai").value = button.dataset.status;
    document.querySelectorAll(".tab-trang-thai-nut").forEach((tab) => {
      tab.classList.toggle("active", tab === button);
      tab.setAttribute("aria-selected", tab === button ? "true" : "false");
    });
    hienThiDanhSach();
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

  await taiDuLieu();

  const thaoTac = new URLSearchParams(window.location.search).get("tao");
  if (thaoTac === "1" && coQuyenQuanLy()) {
    moFormMoi();
    window.history.replaceState(null, "", window.location.pathname);
  }
});