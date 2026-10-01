const token = localStorage.getItem("token");

let nguoiDung = null;

try {
  nguoiDung = JSON.parse(localStorage.getItem("nguoi_dung") || "null");
} catch (error) {
  nguoiDung = null;
}

if (!token || !nguoiDung) {
  window.location.href = "/login/login.html";
}

const tenVaiTro = {
  admin: "Quản trị viên",
  manager: "Quản lý",
  hr: "Nhân sự",
  interviewer: "Người phỏng vấn",
  viewer: "Người xem",
};

function layTenVaiTro(vaiTro) {
  return tenVaiTro[vaiTro] || vaiTro || "-";
}

function coQuyenQuanLy() {
  return ["admin", "manager"].includes(nguoiDung?.vai_tro);
}

function coQuyenDuyet() {
  return ["admin", "manager"].includes(nguoiDung?.vai_tro);
}

function layHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

const tbody = document.getElementById("danhSachJD");
const btnThem = document.getElementById("btnThem");
const modal = document.getElementById("modal");
const form = document.getElementById("formJD");
const btnDong = document.getElementById("btnDong");
const btnHuy = document.getElementById("btnHuy");

const inputId = document.getElementById("jdId");
const inputTieuDe = document.getElementById("tieuDe");
const inputDotTuyen = document.getElementById("dotTuyenId");
const inputMoTa = document.getElementById("moTa");
const inputYeuCau = document.getElementById("yeuCau");
const inputQuyenLoi = document.getElementById("quyenLoi");
const inputTieuChi = document.getElementById("tieuChi");

const inputTimKiem = document.getElementById("oTimKiem");
const locTrangThai = document.getElementById("locTrangThai");
const locDotTuyen = document.getElementById("locDotTuyen");
const tongSo = document.getElementById("tongSo");

// Account Dropdown Elements
const taiKhoan = document.getElementById("taiKhoan");
const menuTaiKhoan = document.getElementById("menuTaiKhoan");
const btnThongTin = document.getElementById("btnThongTin");
const btnDoiMatKhau = document.getElementById("btnDoiMatKhau");
const btnDangXuat = document.getElementById("btnDangXuat");

const tenNguoiDung = document.getElementById("tenNguoiDung");
const vaiTro = document.getElementById("vaiTro");
const avatar = document.getElementById("avatar");
const tenMenuTaiKhoan = document.getElementById("tenMenuTaiKhoan");
const emailMenuTaiKhoan = document.getElementById("emailMenuTaiKhoan");
const menuNguoiDung = document.getElementById("menuNguoiDung");

let danhSachJD = [];
let danhSachDotTuyen = [];

function dotTuyenKhoaTao(trangThai) {
  return [
    "tam_dung",
    "ket_thuc",
    "da_dong",
    "dong",
    "closed"
  ].includes(
    String(trangThai || "").toLowerCase()
  );
}

function layTenTrangThai(trangThai) {
  const danhSach = {
    nhap: "Nháp",
    cho_duyet: "Chờ duyệt",
    da_duyet: "Đã duyệt",
    tu_choi: "Từ chối",
    huy: "Đã hủy",
  };

  return danhSach[trangThai] || trangThai || "-";
}

function dinhDangNgay(ngay) {
  if (!ngay) return "-";

  const date = new Date(ngay);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("vi-VN");
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function taoNutThaoTac(jd) {
  if (!coQuyenQuanLy()) {
    return "";
  }

  let buttons = `
    <button
      type="button"
      class="btn-sua"
      data-id="${escapeHTML(jd.id)}"
    >
      Sửa
    </button>
  `;

  if (jd.trang_thai === "nhap" && coQuyenDuyet()) {
    buttons += `
      <button
        type="button"
        class="btn-gui-duyet"
        data-id="${escapeHTML(jd.id)}"
      >
        Gửi duyệt
      </button>
    `;
  }

  if (jd.trang_thai === "cho_duyet" && coQuyenDuyet()) {
    buttons += `
      <button
        type="button"
        class="btn-duyet"
        data-id="${escapeHTML(jd.id)}"
      >
        Duyệt
      </button>

      <button
        type="button"
        class="btn-tu-choi"
        data-id="${escapeHTML(jd.id)}"
      >
        Từ chối
      </button>
    `;
  }

  if (
    ["cho_duyet", "da_duyet"].includes(jd.trang_thai) &&
    coQuyenDuyet()
  ) {
    buttons += `
      <button
        type="button"
        class="btn-huy"
        data-id="${escapeHTML(jd.id)}"
      >
        Hủy
      </button>
    `;
  }

  buttons += `
    <button
      type="button"
      class="btn-xoa"
      data-id="${escapeHTML(jd.id)}"
    >
      Xóa
    </button>
  `;

  return `
    <td class="cot-thao-tac">
      ${buttons}
    </td>
  `;
}

function capNhatCotThaoTac() {
  const cotThaoTac = document.getElementById("cotThaoTac");

  if (!cotThaoTac) return;

  if (!coQuyenQuanLy()) {
    if (btnThem) btnThem.style.display = "none";
    cotThaoTac.remove();
  }
}

function renderJD(danhSach) {
  if (!tbody) return;

  tbody.innerHTML = "";

  if (tongSo) {
    tongSo.textContent = `${danhSach.length} JD`;
  }

  if (!danhSach.length) {
    const soCot = coQuyenQuanLy() ? 7 : 6;

    tbody.innerHTML = `
      <tr>
        <td colspan="${soCot}" style="text-align: center; color: #94a3b8; padding: 40px;">
          Không tìm thấy JD nào.
        </td>
      </tr>
    `;

    return;
  }

  danhSach.forEach(function (jd, index) {
    const tr = document.createElement("tr");

    const nguoiDyet =
      jd.nguoi_duyet_ten ||
      jd.nguoi_duyet ||
      jd.manager_name ||
      jd.ten_nguoi_duyet ||
      "-";

    tr.innerHTML = `
      <td>${index + 1}</td>

      <td>
        <strong>${escapeHTML(jd.tieu_de || "-")}</strong>
      </td>

      <td>
        ${escapeHTML(jd.ten_dot_tuyen || jd.dot_tuyen_ten || "-")}
      </td>

      <td>
        <span class="badge ${escapeHTML(jd.trang_thai)}">
          ${escapeHTML(layTenTrangThai(jd.trang_thai))}
        </span>
      </td>

      <td>
        ${escapeHTML(nguoiDyet)}
      </td>

      <td>
        ${escapeHTML(dinhDangNgay(jd.ngay_tao))}
      </td>

      ${taoNutThaoTac(jd)}
    `;

    tbody.appendChild(tr);
  });
}

function locDanhSachJD() {
  const tuKhoa = (inputTimKiem?.value || "")
    .trim()
    .toLowerCase();

  const trangThai = locTrangThai?.value || "";
  const dotTuyenId = locDotTuyen?.value || "";

  const danhSachLoc = danhSachJD.filter(function (jd) {
    const phuHopTuKhoa =
      !tuKhoa ||
      String(jd.tieu_de || "")
        .toLowerCase()
        .includes(tuKhoa);

    const phuHopTrangThai =
      !trangThai ||
      jd.trang_thai === trangThai;

    const phuHopDotTuyen =
      !dotTuyenId ||
      String(jd.dot_tuyen_id) === String(dotTuyenId);

    return (
      phuHopTuKhoa &&
      phuHopTrangThai &&
      phuHopDotTuyen
    );
  });

  renderJD(danhSachLoc);
}

async function layDotTuyen() {
  try {
    const response = await fetch("/api/dot-tuyen", {
      method: "GET",
      headers: layHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Không thể tải đợt tuyển dụng"
      );
    }

    danhSachDotTuyen = Array.isArray(data)
      ? data
      : data.data || data.dot_tuyen || [];

    // Sắp xếp: Đợt đang hoạt động lên trên, tạm dừng/kết thúc xuống dưới cùng
    danhSachDotTuyen.sort(function (a, b) {
      const isInactiveA = dotTuyenKhoaTao(a.trang_thai);
      const isInactiveB = dotTuyenKhoaTao(b.trang_thai);

      if (isInactiveA === isInactiveB) return 0;
      return isInactiveA ? 1 : -1;
    });

    if (inputDotTuyen) {
      inputDotTuyen.innerHTML = `
        <option value="">-- Chọn đợt tuyển dụng --</option>
      `;

      danhSachDotTuyen.forEach(function (dotTuyen) {
        const khoa = dotTuyenKhoaTao(dotTuyen.trang_thai);
        let tenHienThi = dotTuyen.ten_dot || dotTuyen.ten || "";

        if (dotTuyen.trang_thai === "tam_dung") {
          tenHienThi += " (Tạm dừng)";
        } else if (["ket_thuc", "da_dong", "dong", "closed"].includes(dotTuyen.trang_thai)) {
          tenHienThi += " (Đã kết thúc)";
        }

        const option = document.createElement("option");
        option.value = dotTuyen.id;
        option.textContent = tenHienThi;
        option.disabled = khoa;
        if (khoa) {
          option.style.color = "#94a3b8";
          option.style.backgroundColor = "#f1f5f9";
        }

        inputDotTuyen.appendChild(option);
      });
    }

    if (locDotTuyen) {
      locDotTuyen.innerHTML = `
        <option value="">Tất cả đợt tuyển dụng</option>
      `;

      danhSachDotTuyen.forEach(function (dotTuyen) {
        locDotTuyen.innerHTML += `
          <option value="${escapeHTML(dotTuyen.id)}">
            ${escapeHTML(dotTuyen.ten_dot || dotTuyen.ten)}
          </option>
        `;
      });
    }
  } catch (error) {
    console.error(error);
  }
}

async function layDanhSachJD() {
  try {
    const response = await fetch("/api/jd", {
      method: "GET",
      headers: layHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("nguoi_dung");
        window.location.href = "/login/login.html";
        return;
      }

      throw new Error(
        data.message || "Không thể tải danh sách JD"
      );
    }

    danhSachJD = Array.isArray(data)
      ? data
      : data.data || data.jd || [];

    locDanhSachJD();
  } catch (error) {
    console.error(error);

    if (tbody) {
      const soCot = coQuyenQuanLy() ? 7 : 6;

      tbody.innerHTML = `
        <tr>
          <td colspan="${soCot}" style="text-align: center; color: #dc2626;">
            Không thể tải danh sách JD
          </td>
        </tr>
      `;
    }
  }
}

function moModalThem() {
  if (!coQuyenQuanLy()) return;

  if (form) {
    form.reset();
  }

  if (inputId) {
    inputId.value = "";
  }

  const tieuDeModal = document.getElementById("tieuDeModal");
  if (tieuDeModal) {
    tieuDeModal.textContent = "Tạo JD";
  }

  if (modal) {
    modal.style.display = "flex";
  }
}

async function suaJD(id) {
  if (!coQuyenQuanLy()) return;

  try {
    const response = await fetch(`/api/jd/${id}`, {
      method: "GET",
      headers: layHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Không thể lấy thông tin JD"
      );
    }

    const jd = data.data || data;

    if (inputId) inputId.value = jd.id;
    if (inputTieuDe) inputTieuDe.value = jd.tieu_de || "";
    if (inputDotTuyen) {
      inputDotTuyen.value = jd.dot_tuyen_id || "";
    }
    if (inputMoTa) inputMoTa.value = jd.mo_ta || "";
    if (inputYeuCau) inputYeuCau.value = jd.yeu_cau || "";
    if (inputQuyenLoi) inputQuyenLoi.value = jd.quyen_loi || "";
    if (inputTieuChi) inputTieuChi.value = jd.tieu_chi || jd.scoring_rubric || "";

    const tieuDeModal = document.getElementById("tieuDeModal");
    if (tieuDeModal) {
      tieuDeModal.textContent = "Sửa JD";
    }

    if (modal) {
      modal.style.display = "flex";
    }
  } catch (error) {
    console.error(error);
    alert(error.message || "Không thể lấy thông tin JD");
  }
}

function dongModal() {
  if (modal) {
    modal.style.display = "none";
  }
}

async function luuJD(event) {
  event.preventDefault();

  if (!coQuyenQuanLy()) return;

  const id = inputId?.value;

const payload = {
    tieu_de: inputTieuDe?.value.trim() || null,
    dot_tuyen_id: inputDotTuyen?.value ? Number(inputDotTuyen.value) : null,
    mo_ta: inputMoTa?.value.trim() || null,
    yeu_cau: inputYeuCau?.value.trim() || null,
    quyen_loi: inputQuyenLoi?.value.trim() || null,
    tieu_chi: inputTieuChi?.value.trim() || null,
  };

  if (!payload.tieu_de) {
    alert("Vui lòng nhập tiêu đề JD");
    inputTieuDe?.focus();
    return;
  }

  if (!payload.dot_tuyen_id) {
    alert("Vui lòng chọn đợt tuyển dụng");
    inputDotTuyen?.focus();
    return;
  }

  try {
    const url = id
      ? `/api/jd/${id}`
      : "/api/jd";

    const method = id ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: layHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Không thể lưu JD"
      );
    }

    alert(
      id
        ? "Cập nhật JD thành công"
        : "Thêm JD thành công"
    );

    dongModal();
    await layDanhSachJD();
  } catch (error) {
    console.error(error);
    alert(error.message || "Có lỗi xảy ra");
  }
}

async function guiDuyetJD(id) {
  if (!coQuyenDuyet()) return;

  try {
    const response = await fetch(`/api/jd/${id}/gui-duyet`, {
      method: "PUT",
      headers: layHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Không thể gửi duyệt JD"
      );
    }

    alert("Đã gửi JD để duyệt");
    await layDanhSachJD();
  } catch (error) {
    console.error(error);
    alert(error.message || "Có lỗi xảy ra");
  }
}

async function duyetJD(id) {
  if (!coQuyenDuyet()) return;

  const xacNhan = confirm("Bạn có chắc muốn duyệt JD này không?");
  if (!xacNhan) return;

  try {
    const response = await fetch(`/api/jd/${id}/duyet`, {
      method: "PUT",
      headers: layHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Không thể duyệt JD"
      );
    }

    alert("Duyệt JD thành công");
    await layDanhSachJD();
  } catch (error) {
    console.error(error);
    alert(error.message || "Có lỗi xảy ra");
  }
}

async function tuChoiJD(id) {
  if (!coQuyenDuyet()) return;

  const lyDo = prompt("Nhập lý do từ chối JD:");
  if (lyDo === null) return;

  try {
    const response = await fetch(`/api/jd/${id}/tu-choi`, {
      method: "PUT",
      headers: layHeaders(),
      body: JSON.stringify({ ly_do: lyDo.trim() }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Không thể từ chối JD"
      );
    }

    alert("Đã từ chối JD");
    await layDanhSachJD();
  } catch (error) {
    console.error(error);
    alert(error.message || "Có lỗi xảy ra");
  }
}

async function huyJD(id) {
  if (!coQuyenDuyet()) return;

  const xacNhan = confirm("Bạn có chắc muốn hủy JD này không?");
  if (!xacNhan) return;

  try {
    const response = await fetch(`/api/jd/${id}/huy`, {
      method: "PUT",
      headers: layHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Không thể hủy JD"
      );
    }

    alert("Đã hủy JD");
    await layDanhSachJD();
  } catch (error) {
    console.error(error);
    alert(error.message || "Có lỗi xảy ra");
  }
}

async function xoaJD(id) {
  if (!coQuyenQuanLy()) return;

  const xacNhan = confirm("Bạn có chắc muốn xóa JD này không?");
  if (!xacNhan) return;

  try {
    const response = await fetch(`/api/jd/${id}`, {
      method: "DELETE",
      headers: layHeaders(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Không thể xóa JD"
      );
    }

    alert("Xóa JD thành công");
    await layDanhSachJD();
  } catch (error) {
    console.error(error);
    alert(error.message || "Có lỗi xảy ra");
  }
}

// Xử lý bật/tắt Account Dropdown
if (taiKhoan && menuTaiKhoan) {
  taiKhoan.addEventListener("click", function (event) {
    event.stopPropagation();
    menuTaiKhoan.classList.toggle("hien");
  });

  document.addEventListener("click", function (event) {
    if (!taiKhoan.contains(event.target)) {
      menuTaiKhoan.classList.remove("hien");
    }
  });
}

// Xử lý các nút trong menu tài khoản
if (btnDangXuat) {
  btnDangXuat.addEventListener("click", function () {
    localStorage.removeItem("token");
    localStorage.removeItem("nguoi_dung");
    window.location.href = "/login/login.html";
  });
}

if (btnThongTin) {
  btnThongTin.addEventListener("click", function () {
    alert("Chức năng thông tin tài khoản");
  });
}

if (btnDoiMatKhau) {
  btnDoiMatKhau.addEventListener("click", function () {
    alert("Chức năng đổi mật khẩu");
  });
}

if (btnThem) {
  btnThem.addEventListener("click", moModalThem);
}

if (btnDong) {
  btnDong.addEventListener("click", dongModal);
}

if (btnHuy) {
  btnHuy.addEventListener("click", dongModal);
}

if (form) {
  form.addEventListener("submit", luuJD);
}

if (inputTimKiem) {
  inputTimKiem.addEventListener("input", locDanhSachJD);
}

if (locTrangThai) {
  locTrangThai.addEventListener("change", locDanhSachJD);
}

if (locDotTuyen) {
  locDotTuyen.addEventListener("change", locDanhSachJD);
}

if (modal) {
  modal.addEventListener("click", function (event) {
    if (event.target === modal) {
      dongModal();
    }
  });
}

if (tbody) {
  tbody.addEventListener("click", function (event) {
    const btnSua = event.target.closest(".btn-sua");
    const btnGuiDuyet = event.target.closest(".btn-gui-duyet");
    const btnDuyet = event.target.closest(".btn-duyet");
    const btnTuChoi = event.target.closest(".btn-tu-choi");
    const btnHuy = event.target.closest(".btn-huy");
    const btnXoa = event.target.closest(".btn-xoa");

    if (btnSua) {
      suaJD(Number(btnSua.dataset.id));
      return;
    }

    if (btnGuiDuyet) {
      guiDuyetJD(Number(btnGuiDuyet.dataset.id));
      return;
    }

    if (btnDuyet) {
      duyetJD(Number(btnDuyet.dataset.id));
      return;
    }

    if (btnTuChoi) {
      tuChoiJD(Number(btnTuChoi.dataset.id));
      return;
    }

    if (btnHuy) {
      huyJD(Number(btnHuy.dataset.id));
      return;
    }

    if (btnXoa) {
      xoaJD(Number(btnXoa.dataset.id));
    }
  });
}

if (menuNguoiDung && nguoiDung?.vai_tro !== "admin") {
  menuNguoiDung.style.display = "none";
}

if (tenNguoiDung) {
  tenNguoiDung.textContent =
    nguoiDung?.ho_ten || nguoiDung?.ten || "Người dùng";
}

if (vaiTro) {
  vaiTro.textContent = layTenVaiTro(nguoiDung?.vai_tro);
}

if (avatar) {
  const ten = nguoiDung?.ho_ten || nguoiDung?.ten || "A";
  avatar.textContent = ten.trim().charAt(0).toUpperCase();
}

if (tenMenuTaiKhoan) {
  tenMenuTaiKhoan.textContent =
    nguoiDung?.ho_ten || nguoiDung?.ten || "Người dùng";
}

if (emailMenuTaiKhoan) {
  emailMenuTaiKhoan.textContent = nguoiDung?.email || "-";
}

capNhatCotThaoTac();

async function khoiTao() {
  await layDotTuyen();
  await layDanhSachJD();
}

khoiTao();