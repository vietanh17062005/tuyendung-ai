const API = "/api";

let danhSachDotTuyen = [];
let danhSachJD = [];
let danhSachGop = [];
let dangSua = null;
let dangXoa = null;
let dangXem = false;

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
  const vaiTro = String(
    nguoiDung?.vai_tro || "",
  ).trim().toLowerCase();

  return ["admin", "manager"].includes(vaiTro);
}

function coQuyenTaoJD() {
  const vaiTro = String(
    nguoiDung?.vai_tro || "",
  ).trim().toLowerCase();

  return ["admin", "manager", "hr"].includes(vaiTro);
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

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("vi-VN");
}

function dinhDangNgayInput(value) {
  if (!value) return "";

  const text = String(value).slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-");
    return `${day}/${month}/${year}`;
  }

  return text;
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
      };
    });

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
      !trangThai || dot?.trang_thai === trangThai;

    return dungTuKhoa && dungTrangThai;
  });

  const tbody = $("danhSach");

  tbody.innerHTML = "";

  $("tongSo").textContent =
    `${danhSachLoc.length} đợt tuyển dụng`;

  if (!danhSachLoc.length) {
    $("khongCoDuLieu").style.display = "block";
    return;
  }

  $("khongCoDuLieu").style.display = "none";

  danhSachLoc.forEach((item, index) => {
    const dot = item.dot;
    const jd = item.jd;

    const tenDot =
      dot?.ten_dot ||
      dot?.ten ||
      "-";

    const tenJD =
      jd?.tieu_de ||
      "Chưa có JD";

    const ngayBatDau = dinhDangNgay(dot?.ngay_bat_dau);
    const ngayKetThuc = dinhDangNgay(dot?.ngay_ket_thuc);

    const nguoiTao =
      dot?.nguoi_tao_ten ||
      dot?.nguoi_tao ||
      "-";

    const trangThai = dot?.trang_thai || "nhap";

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${index + 1}</td>

      <td>
        <div class="ten-dot">
          ${escapeHTML(tenDot)}
        </div>

        ${dot?.mo_ta
        ? `<div class="mo-ta-bang">${escapeHTML(dot.mo_ta)}</div>`
        : ""
      }
      </td>

      <td>
        <div class="jd-ten">
          ${escapeHTML(tenJD)}
        </div>

        ${jd
        ? `<div class="mo-ta-bang">
                ${escapeHTML(
          jd.trang_thai
            ? hienThiTrangThaiJD(jd.trang_thai)
            : ""
        )}
              </div>`
        : ""
      }
      </td>

      <td>
        <span class="badge ${layClassTrangThai(trangThai)}">
          ${escapeHTML(hienThiTrangThai(trangThai))}
        </span>
      </td>

      <td>
        <div class="thoi-gian">
          <span>Bắt đầu: ${escapeHTML(ngayBatDau)}</span>
          <span>Kết thúc: ${escapeHTML(ngayKetThuc)}</span>
        </div>
      </td>

      <td>
        ${escapeHTML(nguoiTao)}
      </td>

      <td>
        <div class="action-group">
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
  $("thongBaoTieuChi").textContent = "";
  $("tongTrongSo").textContent = "Tổng: 0%";
  $("tongTrongSo").classList.remove("lech");

  $("thongBao").className = "thong-bao";
  $("thongBao").textContent = "";

  moKhoaForm();
}

function moFormMoi() {
  dongModal();

  $("tieuDeModal").textContent = "Thêm đợt tuyển dụng";
  $("trangThai").value = "nhap";

  moModal();
}

function moFormSua(item) {
  dongModal();

  dangSua = item;

  $("tieuDeModal").textContent = "Sửa đợt tuyển dụng";

  const dot = item.dot;
  const jd = item.jd;

  $("id").value = dot.id || "";
  $("ten").value = dot.ten_dot || dot.ten || "";
  $("moTa").value = dot.mo_ta || "";
  $("ngayBatDau").value = dinhDangNgayInput(dot.ngay_bat_dau);
  $("ngayKetThuc").value = dinhDangNgayInput(dot.ngay_ket_thuc);
  $("trangThai").value = dot.trang_thai || "nhap";

  $("tieuDe").value = jd?.tieu_de || "";
  $("jdMoTa").value = jd?.mo_ta || "";
  $("jdYeuCau").value = jd?.yeu_cau || "";
  $("jdQuyenLoi").value = jd?.quyen_loi || "";
  $("jdGhiChu").value = "";

  const tieuChi = parseTieuChi(jd?.tieu_chi);

  tieuChi.forEach((item) => {
    themTieuChi(
      item?.ten || "",
      item?.trong_so ?? 0,
      item?.mo_ta || ""
    );
  });

  capNhatTongTrongSo();

  moModal();
}

function moFormXem(item) {
  dongModal();

  dangXem = true;

  $("tieuDeModal").textContent = "Xem thông tin tuyển dụng";

  const dot = item.dot;
  const jd = item.jd;

  $("id").value = dot.id || "";
  $("ten").value = dot.ten_dot || dot.ten || "";
  $("moTa").value = dot.mo_ta || "";
  $("ngayBatDau").value = dinhDangNgayInput(dot.ngay_bat_dau);
  $("ngayKetThuc").value = dinhDangNgayInput(dot.ngay_ket_thuc);
  $("trangThai").value = dot.trang_thai || "nhap";

  $("tieuDe").value = jd?.tieu_de || "";
  $("jdMoTa").value = jd?.mo_ta || "";
  $("jdYeuCau").value = jd?.yeu_cau || "";
  $("jdQuyenLoi").value = jd?.quyen_loi || "";

  const tieuChi = parseTieuChi(jd?.tieu_chi);

  tieuChi.forEach((item) => {
    themTieuChi(
      item?.ten || "",
      item?.trong_so ?? 0,
      item?.mo_ta || ""
    );
  });

  capNhatTongTrongSo();
  khoaFormXem();
  moModal();
}

function khoaFormXem() {
  const fields = document.querySelectorAll(
    "#form input, #form textarea, #form select"
  );

  fields.forEach((field) => {
    field.disabled = true;
  });

  $("btnGoiYAI").disabled = true;
  $("btnThemTieuChi").disabled = true;
  $("btnLuu").style.display = "none";
  $("btnHuy").textContent = "Đóng";
}

function moKhoaForm() {
  const fields = document.querySelectorAll(
    "#form input, #form textarea, #form select"
  );

  fields.forEach((field) => {
    field.disabled = false;
  });

  $("btnGoiYAI").disabled = false;
  $("btnThemTieuChi").disabled = false;
  $("btnLuu").style.display = "";
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
    $("thongBaoTieuChi").textContent =
      `Tổng trọng số đang vượt ${tong - 100}%. Tối đa là 100%.`;
  } else {
    $("tongTrongSo").classList.remove("lech");
    $("thongBaoTieuChi").textContent = "";
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
  const tieuDe = $("tieuDe").value.trim();

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

  if (!tieuDe) {
    alert("Vui lòng nhập tiêu đề JD.");
    $("tieuDe").focus();
    return false;
  }

  const tong = capNhatTongTrongSo();

  if (tong > 100) {
    alert(
      `Tổng trọng số đang là ${tong}%. Tối đa chỉ được 100%.`
    );

    return false;
  }

  const tieuChi = layDanhSachTieuChi();

  const tongTieuChi = tieuChi.reduce(
    (sum, item) => sum + Number(item.trong_so || 0),
    0
  );

  if (tongTieuChi > 100) {
    alert(
      `Tổng trọng số tiêu chí đang là ${tongTieuChi}%. Tối đa chỉ được 100%.`
    );

    return false;
  }

  for (const item of tieuChi) {
    if (
      !Number.isFinite(Number(item.trong_so)) ||
      Number(item.trong_so) < 0 ||
      Number(item.trong_so) > 100
    ) {
      alert(
        `Trọng số của tiêu chí "${item.ten}" phải từ 0% đến 100%.`
      );

      return false;
    }
  }

  return true;
}

async function luuTuyenDung(event) {
  event.preventDefault();

  if (dangXem) {
    dongModal();
    return;
  }

  if (!kiemTraForm()) {
    return;
  }

  const button = $("btnLuu");

  button.disabled = true;
  button.textContent = "Đang lưu...";

  $("thongBao").className =
    "thong-bao hien dang-xu-ly";

  $("thongBao").textContent =
    "Đang lưu thông tin tuyển dụng...";

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

  const jdPayload = {
    tieu_de: $("tieuDe").value.trim(),
    mo_ta: $("jdMoTa").value.trim(),
    yeu_cau: $("jdYeuCau").value.trim(),
    quyen_loi: $("jdQuyenLoi").value.trim(),
    tieu_chi: layDanhSachTieuChi(),
    trang_thai: dangSua?.jd?.trang_thai || "nhap",
  };

  try {
    let dotId;

    if (dangSua?.dot?.id) {
      const result = await api(
        `${API}/dot-tuyen/${dangSua.dot.id}`,
        {
          method: "PUT",
          body: JSON.stringify(dotPayload),
        }
      );

      dotId =
        result?.data?.id ||
        result?.id ||
        dangSua.dot.id;
    } else {
      const result = await api(
        `${API}/dot-tuyen`,
        {
          method: "POST",
          body: JSON.stringify(dotPayload),
        }
      );

      dotId =
        result?.data?.id ||
        result?.id ||
        result?.insertId;
    }

    if (!dotId) {
      throw new Error(
        "Không lấy được ID đợt tuyển dụng sau khi lưu."
      );
    }

    if (dangSua?.jd?.id) {
      await api(`${API}/jd/${dangSua.jd.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...jdPayload,
          dot_tuyen_id: dotId,
        }),
      });
    } else {
      await api(`${API}/jd`, {
        method: "POST",
        body: JSON.stringify({
          ...jdPayload,
          dot_tuyen_id: dotId,
        }),
      });
    }

    $("thongBao").className =
      "thong-bao hien thanh-cong";

    $("thongBao").textContent =
      dangSua
        ? "Cập nhật tuyển dụng thành công."
        : "Tạo đợt tuyển dụng và JD thành công.";

    await taiDuLieu();

    setTimeout(() => {
      dongModal();
    }, 400);
  } catch (error) {
    console.error(error);

    $("thongBao").className = "thong-bao hien";
    $("thongBao").textContent =
      error.message || "Không thể lưu dữ liệu.";

    alert(
      error.message || "Không thể lưu dữ liệu."
    );
  } finally {
    button.disabled = false;
    button.textContent = "Lưu tuyển dụng";
  }
}

function moXacNhanXoa(item) {
  dangXoa = item;

  const tenDot =
    item?.dot?.ten_dot ||
    item?.dot?.ten ||
    "đợt tuyển dụng này";

  $("noiDungXacNhan").textContent =
    `Bạn có chắc chắn muốn xóa "${tenDot}" và JD liên quan không?`;

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

    alert("Xóa tuyển dụng thành công.");
  } catch (error) {
    console.error(error);

    alert(
      error.message || "Không thể xóa tuyển dụng."
    );
  } finally {
    button.disabled = false;
    button.textContent = "Xóa";
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

  $("btnGoiYAI").addEventListener(
    "click",
    goiYAI
  );

  $("btnThemTieuChi").addEventListener(
    "click",
    () => {
      themTieuChi();
    }
  );

  $("danhSach").addEventListener(
    "click",
    xuLyClickDanhSach
  );

  $("oTimKiem").addEventListener(
    "input",
    hienThiDanhSach
  );

  $("locTrangThai").addEventListener(
    "change",
    hienThiDanhSach
  );

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
});