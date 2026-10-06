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

function layHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

const tbody = document.getElementById("danhSach");
const btnThem = document.getElementById("btnThem");
const modal = document.getElementById("modal");
const form = document.getElementById("form");
const btnDong = document.getElementById("btnDong");
const btnHuy = document.getElementById("btnHuy");
const inputTimKiem = document.getElementById("oTimKiem");
const locTrangThai = document.getElementById("locTrangThai");
const tongSo = document.getElementById("tongSo");
const khongCoDuLieu = document.getElementById("khongCoDuLieu");

const inputId = document.getElementById("id");
const inputTen = document.getElementById("ten");
const inputMoTa = document.getElementById("moTa");
const inputTrangThai = document.getElementById("trangThai");
const inputNgayBatDau = document.getElementById("ngayBatDau");
const inputNgayKetThuc = document.getElementById("ngayKetThuc");

const tieuDeModal = document.getElementById("tieuDeModal");

const btnPickerNgayBatDau = document.getElementById(
  "btnPickerNgayBatDau",
);
const pickerNgayBatDau = document.getElementById("pickerNgayBatDau");

const btnPickerNgayKetThuc = document.getElementById(
  "btnPickerNgayKetThuc",
);
const pickerNgayKetThuc = document.getElementById("pickerNgayKetThuc");

const modalXacNhan = document.getElementById("modalXacNhan");
const noiDungXacNhan = document.getElementById("noiDungXacNhan");
const btnKhongXoa = document.getElementById("btnKhongXoa");
const btnXacNhanXoa = document.getElementById("btnXacNhanXoa");

const menuNguoiDung = document.getElementById("menuNguoiDung");
const tenNguoiDung = document.getElementById("tenNguoiDung");
const vaiTro = document.getElementById("vaiTro");
const avatar = document.getElementById("avatar");
const tenMenuTaiKhoan = document.getElementById("tenMenuTaiKhoan");
const emailMenuTaiKhoan = document.getElementById("emailMenuTaiKhoan");

// Các phần tử cho Account Dropdown
const taiKhoan = document.getElementById("taiKhoan");
const menuTaiKhoan = document.getElementById("menuTaiKhoan");
const btnThongTin = document.getElementById("btnThongTin");
const btnDoiMatKhau = document.getElementById("btnDoiMatKhau");
const btnDangXuat = document.getElementById("btnDangXuat");

let danhSachDotTuyen = [];
let idDangXoa = null;

function dinhDangNgay(ngay) {
  if (!ngay) return "-";

  const chuoiNgay = String(ngay).slice(0, 10);
  const parts = chuoiNgay.split("-");

  if (parts.length !== 3) return "-";

  const [nam, thang, ngayTrongThang] = parts;

  if (!nam || !thang || !ngayTrongThang) {
    return "-";
  }

  return `${ngayTrongThang}/${thang}/${nam}`;
}

function doiNgaySangISO(ngay) {
  if (!ngay) return "";

  const chuoiNgay = String(ngay).slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(chuoiNgay)) {
    return chuoiNgay;
  }

  const parts = chuoiNgay.split("/");

  if (parts.length !== 3) return "";

  const [ngayTrongThang, thang, nam] = parts;

  if (
    !/^\d{2}$/.test(ngayTrongThang) ||
    !/^\d{2}$/.test(thang) ||
    !/^\d{4}$/.test(nam)
  ) {
    return "";
  }

  return `${nam}-${thang}-${ngayTrongThang}`;
}

function layTenTrangThai(trangThai) {
  const danhSach = {
    nhap: "Nháp",
    dang_tuyen: "Đang tuyển",
    tam_dung: "Tạm dừng",
    ket_thuc: "Kết thúc",
  };

  return danhSach[trangThai] || trangThai || "-";
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function taoCotThaoTac(dotTuyen) {
  if (!coQuyenQuanLy()) {
    return "";
  }

  return `
    <td class="cot-thao-tac">
      <button
        type="button"
        class="btn-sua"
        data-id="${escapeHTML(dotTuyen.id)}"
      >
        Sửa
      </button>

      <button
        type="button"
        class="btn-xoa"
        data-id="${escapeHTML(dotTuyen.id)}"
      >
        Xóa
      </button>
    </td>
  `;
}

function capNhatQuyenGiaoDien() {
  const cotThaoTac = document.getElementById("cotThaoTac");

  if (!coQuyenQuanLy()) {
    if (btnThem) {
      btnThem.style.display = "none";
    }

    if (cotThaoTac) {
      cotThaoTac.remove();
    }
  }
}

function hienThiDanhSach(danhSach) {
  if (!tbody) return;

  tbody.innerHTML = "";

  if (tongSo) {
    tongSo.textContent = `${danhSach.length} đợt tuyển dụng`;
  }

  if (khongCoDuLieu) {
    khongCoDuLieu.style.display = danhSach.length ? "none" : "block";
  }

  if (!danhSach.length) {
    return;
  }

  danhSach.forEach(function (dotTuyen, index) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${index + 1}</td>

      <td>
        <strong>${escapeHTML(dotTuyen.ten_dot || dotTuyen.ten || "-")}</strong>
      </td>

      <td>
        <div class="mo-ta">${escapeHTML(dotTuyen.mo_ta || "-")}</div>
      </td>

      <td>
        <span class="badge ${escapeHTML(dotTuyen.trang_thai)}">
          ${escapeHTML(layTenTrangThai(dotTuyen.trang_thai))}
        </span>
      </td>

      <td>
        ${escapeHTML(dotTuyen.nguoi_tao_ten || "-")}
      </td>

      <td>
        ${dinhDangNgay(dotTuyen.ngay_bat_dau)}
      </td>

      <td>
        ${dinhDangNgay(dotTuyen.ngay_ket_thuc)}
      </td>

      ${taoCotThaoTac(dotTuyen)}
    `;

    tbody.appendChild(tr);
  });
}

function locDanhSach() {
  const tuKhoa = (inputTimKiem?.value || "")
    .trim()
    .toLowerCase();

  const trangThai = locTrangThai?.value || "";

  const danhSachLoc = danhSachDotTuyen.filter(function (dotTuyen) {
    const tenDot = String(
      dotTuyen.ten_dot || dotTuyen.ten || "",
    ).toLowerCase();

    const moTa = String(dotTuyen.mo_ta || "").toLowerCase();

    const phuHopTuKhoa =
      !tuKhoa ||
      tenDot.includes(tuKhoa) ||
      moTa.includes(tuKhoa);

    const phuHopTrangThai =
      !trangThai ||
      dotTuyen.trang_thai === trangThai;

    return phuHopTuKhoa && phuHopTrangThai;
  });

  hienThiDanhSach(danhSachLoc);
}

async function layDanhSach() {
  if (!tbody) return;

  try {
    const response = await fetch("/api/dot-tuyen", {
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
        data.message || "Không thể tải danh sách đợt tuyển dụng",
      );
    }

    if (Array.isArray(data)) {
      danhSachDotTuyen = data;
    } else if (Array.isArray(data.data)) {
      danhSachDotTuyen = data.data;
    } else if (Array.isArray(data.dot_tuyen)) {
      danhSachDotTuyen = data.dot_tuyen;
    } else {
      danhSachDotTuyen = [];
    }

    locDanhSach();
  } catch (error) {
    console.error("Lỗi tải đợt tuyển dụng:", error);

    danhSachDotTuyen = [];

    if (tongSo) {
      tongSo.textContent = "0 đợt tuyển dụng";
    }

    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${coQuyenQuanLy() ? 8 : 7}" style="text-align:center;">
            Không thể tải danh sách đợt tuyển dụng
          </td>
        </tr>
      `;
    }

    if (khongCoDuLieu) {
      khongCoDuLieu.style.display = "none";
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

  if (inputTrangThai) {
    inputTrangThai.value = "nhap";
  }

  if (tieuDeModal) {
    tieuDeModal.textContent = "Thêm đợt tuyển dụng";
  }

  moModal();
}

function moModalSua(dotTuyen) {
  if (!coQuyenQuanLy()) return;

  if (!dotTuyen) return;

  if (inputId) {
    inputId.value = dotTuyen.id || "";
  }

  if (inputTen) {
    inputTen.value =
      dotTuyen.ten_dot || dotTuyen.ten || "";
  }

  if (inputMoTa) {
    inputMoTa.value = dotTuyen.mo_ta || "";
  }

  if (inputTrangThai) {
    inputTrangThai.value =
      dotTuyen.trang_thai || "nhap";
  }

  if (inputNgayBatDau) {
    inputNgayBatDau.value =
      dinhDangNgay(dotTuyen.ngay_bat_dau) === "-"
        ? ""
        : dinhDangNgay(dotTuyen.ngay_bat_dau);
  }

  if (inputNgayKetThuc) {
    inputNgayKetThuc.value =
      dinhDangNgay(dotTuyen.ngay_ket_thuc) === "-"
        ? ""
        : dinhDangNgay(dotTuyen.ngay_ket_thuc);
  }

  if (tieuDeModal) {
    tieuDeModal.textContent = "Sửa đợt tuyển dụng";
  }

  moModal();
}

function moModal() {
  if (!modal) return;

  modal.style.display = "flex";
}

function dongModal() {
  if (!modal) return;

  modal.style.display = "none";
}

function moModalXacNhan(id, ten) {
  if (!coQuyenQuanLy()) return;

  idDangXoa = id;

  if (noiDungXacNhan) {
    noiDungXacNhan.textContent =
      `Bạn có chắc chắn muốn xóa đợt tuyển dụng "${ten}" không?`;
  }

  if (modalXacNhan) {
    modalXacNhan.style.display = "flex";
  }
}

function dongModalXacNhan() {
  idDangXoa = null;

  if (modalXacNhan) {
    modalXacNhan.style.display = "none";
  }
}

async function luuDotTuyen(event) {
  event.preventDefault();

  if (!coQuyenQuanLy()) {
    return;
  }

  const id = inputId?.value?.trim();

  const tenDot = inputTen?.value?.trim() || "";
  const moTa = inputMoTa?.value?.trim() || "";
  const trangThai = inputTrangThai?.value || "nhap";

  const ngayBatDau = doiNgaySangISO(
    inputNgayBatDau?.value || "",
  );

  const ngayKetThuc = doiNgaySangISO(
    inputNgayKetThuc?.value || "",
  );

  if (!tenDot) {
    alert("Vui lòng nhập tên đợt tuyển dụng");
    inputTen?.focus();
    return;
  }

  if (!ngayBatDau || !ngayKetThuc) {
    alert("Vui lòng nhập đầy đủ ngày bắt đầu và ngày kết thúc theo dạng dd/mm/yyyy");
    return;
  }

  if (ngayKetThuc < ngayBatDau) {
    alert("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu");
    return;
  }

  const payload = {
    ten_dot: tenDot,
    mo_ta: moTa,
    trang_thai: trangThai,
    ngay_bat_dau: ngayBatDau,
    ngay_ket_thuc: ngayKetThuc,
  };

  try {
    const url = id
      ? `/api/dot-tuyen/${id}`
      : "/api/dot-tuyen";

    const method = id ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: layHeaders(),
      body: JSON.stringify(payload),
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
        data.message || "Không thể lưu đợt tuyển dụng",
      );
    }

    alert(
      id
        ? "Cập nhật đợt tuyển thành công"
        : "Thêm đợt tuyển thành công",
    );

    dongModal();

    await layDanhSach();
  } catch (error) {
    console.error("Lỗi lưu đợt tuyển:", error);
    alert(error.message || "Có lỗi xảy ra");
  }
}

async function xoaDotTuyen() {
  if (!coQuyenQuanLy()) return;

  if (!idDangXoa) return;

  const id = idDangXoa;

  try {
    const response = await fetch(`/api/dot-tuyen/${id}`, {
      method: "DELETE",
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
        data.message || "Không thể xóa đợt tuyển dụng",
      );
    }

    dongModalXacNhan();

    alert("Xóa đợt tuyển dụng thành công");

    await layDanhSach();
  } catch (error) {
    console.error("Lỗi xóa đợt tuyển:", error);
    alert(error.message || "Có lỗi xảy ra");
  }
}

function khoiTaoDatePicker(
  inputText,
  inputDate,
  button,
) {
  if (!inputText || !inputDate || !button) {
    return;
  }

  button.addEventListener("click", function () {
    if (typeof inputDate.showPicker === "function") {
      inputDate.showPicker();
    } else {
      inputDate.click();
    }
  });

  inputDate.addEventListener("change", function () {
    if (!inputDate.value) return;

    const parts = inputDate.value.split("-");

    if (parts.length !== 3) return;

    inputText.value =
      `${parts[2]}/${parts[1]}/${parts[0]}`;
  });

  inputText.addEventListener("input", function () {
    let value = inputText.value.replace(/\D/g, "");

    if (value.length > 8) {
      value = value.slice(0, 8);
    }

    if (value.length >= 5) {
      value =
        `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    } else if (value.length >= 3) {
      value =
        `${value.slice(0, 2)}/${value.slice(2)}`;
    }

    inputText.value = value;
  });
}

// Xử lý sự kiện click mở/đóng Menu Tài Khoản Dropdown
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

// Xử lý các nút trong Menu Tài khoản
if (btnDangXuat) {
  btnDangXuat.addEventListener("click", function () {
    localStorage.removeItem("token");
    localStorage.removeItem("nguoi_dung");
    window.location.href = "/login/login.html";
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
  form.addEventListener("submit", luuDotTuyen);
}

if (inputTimKiem) {
  inputTimKiem.addEventListener("input", locDanhSach);
}

if (locTrangThai) {
  locTrangThai.addEventListener("change", locDanhSach);
}

if (tbody) {
  tbody.addEventListener("click", function (event) {
    const btnSua = event.target.closest(".btn-sua");
    const btnXoa = event.target.closest(".btn-xoa");

    if (btnSua) {
      const id = Number(btnSua.dataset.id);

      const dotTuyen = danhSachDotTuyen.find(function (item) {
        return Number(item.id) === id;
      });

      if (dotTuyen) {
        moModalSua(dotTuyen);
      }

      return;
    }

    if (btnXoa) {
      const id = Number(btnXoa.dataset.id);

      const dotTuyen = danhSachDotTuyen.find(function (item) {
        return Number(item.id) === id;
      });

      if (dotTuyen) {
        moModalXacNhan(
          dotTuyen.id,
          dotTuyen.ten_dot || dotTuyen.ten || "đợt tuyển dụng này",
        );
      }
    }
  });
}

if (btnKhongXoa) {
  btnKhongXoa.addEventListener(
    "click",
    dongModalXacNhan,
  );
}

if (btnXacNhanXoa) {
  btnXacNhanXoa.addEventListener(
    "click",
    xoaDotTuyen,
  );
}

if (modal) {
  modal.addEventListener("click", function (event) {
    if (event.target === modal) {
      dongModal();
    }
  });
}

if (modalXacNhan) {
  modalXacNhan.addEventListener("click", function (event) {
    if (event.target === modalXacNhan) {
      dongModalXacNhan();
    }
  });
}

khoiTaoDatePicker(
  inputNgayBatDau,
  pickerNgayBatDau,
  btnPickerNgayBatDau,
);

khoiTaoDatePicker(
  inputNgayKetThuc,
  pickerNgayKetThuc,
  btnPickerNgayKetThuc,
);

if (menuNguoiDung && nguoiDung?.vai_tro !== "admin") {
  menuNguoiDung.style.display = "none";
}

if (tenNguoiDung) {
  tenNguoiDung.textContent =
    nguoiDung?.ho_ten ||
    nguoiDung?.ten ||
    "Người dùng";
}

if (vaiTro) {
  vaiTro.textContent = layTenVaiTro(
    nguoiDung?.vai_tro,
  );
}

if (avatar) {
  const ten =
    nguoiDung?.ho_ten ||
    nguoiDung?.ten ||
    "A";

  avatar.textContent = ten
    .trim()
    .charAt(0)
    .toUpperCase();
}

if (tenMenuTaiKhoan) {
  tenMenuTaiKhoan.textContent =
    nguoiDung?.ho_ten ||
    nguoiDung?.ten ||
    "Người dùng";
}

if (emailMenuTaiKhoan) {
  emailMenuTaiKhoan.textContent =
    nguoiDung?.email ||
    "-";
}

capNhatQuyenGiaoDien();
layDanhSach();