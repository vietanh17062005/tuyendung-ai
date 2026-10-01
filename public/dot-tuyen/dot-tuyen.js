const token = localStorage.getItem("token");
let nguoiDung;

try {
  nguoiDung = JSON.parse(localStorage.getItem("nguoi_dung"));
} catch {
  nguoiDung = null;
}

if (!token || !nguoiDung) {
  window.location.href = "/login/login.html";
}

const danhSach = document.getElementById("danhSach");
const modal = document.getElementById("modal");
const form = document.getElementById("form");
const tieuDeModal = document.getElementById("tieuDeModal");
const idDotTuyen = document.getElementById("id");

const ten = document.getElementById("ten");
const moTa = document.getElementById("moTa");
const trangThai = document.getElementById("trangThai");
const ngayBatDau = document.getElementById("ngayBatDau");
const ngayKetThuc = document.getElementById("ngayKetThuc");
const pickerNgayBatDau = document.getElementById("pickerNgayBatDau");
const pickerNgayKetThuc = document.getElementById("pickerNgayKetThuc");
const btnPickerNgayBatDau = document.getElementById("btnPickerNgayBatDau");
const btnPickerNgayKetThuc = document.getElementById("btnPickerNgayKetThuc");

const btnThem = document.getElementById("btnThem");
const btnDong = document.getElementById("btnDong");
const btnHuy = document.getElementById("btnHuy");

const tongSo = document.getElementById("tongSo");
const khongCoDuLieu = document.getElementById("khongCoDuLieu");

const oTimKiem = document.getElementById("oTimKiem");
const locTrangThai = document.getElementById("locTrangThai");

const taiKhoan = document.getElementById("taiKhoan");
const menuTaiKhoan = document.getElementById("menuTaiKhoan");
const tenNguoiDung = document.getElementById("tenNguoiDung");
const vaiTro = document.getElementById("vaiTro");
const avatar = document.getElementById("avatar");
const tenMenuTaiKhoan = document.getElementById("tenMenuTaiKhoan");
const emailMenuTaiKhoan = document.getElementById("emailMenuTaiKhoan");
const menuNguoiDung = document.getElementById("menuNguoiDung");
const btnDangXuat = document.getElementById("btnDangXuat");

let tatCaDotTuyen = [];

function layHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token,
  };
}

function layTenVaiTro(vaiTro) {
  const danhSach = {
    admin: "Quản trị viên",
    manager: "Quản lý",
    hr: "Nhân sự",
    interviewer: "Người phỏng vấn",
    viewer: "Người xem",
  };

  return danhSach[vaiTro] || vaiTro;
}

tenNguoiDung.textContent = nguoiDung.ho_ten;
vaiTro.textContent = layTenVaiTro(nguoiDung.vai_tro);
avatar.textContent = nguoiDung.ho_ten.charAt(0).toUpperCase();
tenMenuTaiKhoan.textContent = nguoiDung.ho_ten;
emailMenuTaiKhoan.textContent = nguoiDung.email;

if (nguoiDung.vai_tro !== "admin") {
  menuNguoiDung.style.display = "none";
}

taiKhoan.addEventListener("click", function (event) {
  event.stopPropagation();
  menuTaiKhoan.classList.toggle("hien");
});

menuTaiKhoan.addEventListener("click", function (event) {
  event.stopPropagation();
});

document.addEventListener("click", function () {
  menuTaiKhoan.classList.remove("hien");
});

btnDangXuat.addEventListener("click", function () {
  localStorage.removeItem("token");
  localStorage.removeItem("nguoi_dung");
  window.location.href = "/login/login.html";
});

async function layDanhSach() {
  try {
    danhSach.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center;">Đang tải dữ liệu...</td>
            </tr>
        `;

    const response = await fetch("/api/dot-tuyen", {
      headers: layHeaders(),
    });

    const data = await response.json();

    if (response.status === 401) {
      dangXuat();
      return;
    }

    if (!response.ok) {
      throw new Error(data.message || "Không lấy được dữ liệu");
    }

    tatCaDotTuyen = data;
    locDanhSach();
  } catch (error) {
    console.error(error);

    danhSach.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center;color:#dc2626;">
                    ${escapeHTML(error.message)}
                </td>
            </tr>
        `;
  }
}

function locDanhSach() {
  const tuKhoa = oTimKiem.value.trim().toLowerCase();
  const trangThaiLoc = locTrangThai.value;

  const ketQua = tatCaDotTuyen.filter(function (dotTuyen) {
    const dungTen = !tuKhoa || dotTuyen.ten.toLowerCase().includes(tuKhoa);

    const dungTrangThai = !trangThaiLoc || dotTuyen.trang_thai === trangThaiLoc;

    return dungTen && dungTrangThai;
  });

  hienThiDanhSach(ketQua);
}

oTimKiem.addEventListener("input", locDanhSach);
locTrangThai.addEventListener("change", locDanhSach);

function hienThiDanhSach(data) {
  tongSo.textContent = `${data.length} đợt tuyển dụng`;

  if (data.length === 0) {
    danhSach.innerHTML = "";
    khongCoDuLieu.style.display = "block";
    return;
  }

  khongCoDuLieu.style.display = "none";

  danhSach.innerHTML = data
    .map(function (dotTuyen, index) {
      return `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${escapeHTML(dotTuyen.ten)}</strong></td>
                <td>${escapeHTML(dotTuyen.mo_ta || "")}</td>
                <td>
                    <span class="badge ${dotTuyen.trang_thai}">
                        ${hienThiTrangThai(dotTuyen.trang_thai)}
                    </span>
                </td>
                <td>${escapeHTML(dotTuyen.nguoi_tao_ten || "—")}</td>
                <td>${dinhDangNgay(dotTuyen.ngay_bat_dau)}</td>
                <td>${dinhDangNgay(dotTuyen.ngay_ket_thuc)}</td>
                <td>
                    <button type="button" class="btn-sua" data-id="${dotTuyen.id}">
                        Sửa
                    </button>
                    <button type="button" class="btn-xoa" data-id="${dotTuyen.id}">
                        Xóa
                    </button>
                </td>
            </tr>
        `;
    })
    .join("");
}

function hienThiTrangThai(trangThai) {
  const danhSach = {
    nhap: "Nháp",
    dang_tuyen: "Đang tuyển",
    tam_dung: "Tạm dừng",
    ket_thuc: "Kết thúc",
  };

  return danhSach[trangThai] || trangThai;
}

function dinhDangNgay(ngay) {
  if (!ngay) return "—";

  const phan = String(ngay).substring(0, 10).split("-");

  if (phan.length !== 3) return ngay;

  return `${phan[2]}/${phan[1]}/${phan[0]}`;
}

function layNgayChoInput(ngay) {
  if (!ngay) return "";

  const match = String(ngay)
    .substring(0, 10)
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function chuyenNgaySangISO(ngay) {
  const match = String(ngay || "")
    .trim()
    .match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  const parsed = new Date(iso + "T00:00:00Z");
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === iso
    ? iso
    : null;
}

function dongBoPickerNgay(picker, input, button) {
  button.addEventListener("click", function () {
    picker.value = chuyenNgaySangISO(input.value) || picker.value;
    if (typeof picker.showPicker === "function") {
      try {
        picker.showPicker();
        return;
      } catch (error) {
        // Fall back to click for browsers that reject showPicker.
      }
    }
    picker.click();
  });

  picker.addEventListener("change", function () {
    input.value = layNgayChoInput(picker.value);
  });

  input.addEventListener("input", function () {
    picker.value = chuyenNgaySangISO(input.value) || "";
  });
}

dongBoPickerNgay(pickerNgayBatDau, ngayBatDau, btnPickerNgayBatDau);
dongBoPickerNgay(pickerNgayKetThuc, ngayKetThuc, btnPickerNgayKetThuc);

function moModal() {
  modal.style.display = "flex";
  modal.style.visibility = "visible";
  modal.style.opacity = "1";
}

function dongModal() {
  modal.style.display = "none";
  modal.style.visibility = "hidden";
  modal.style.opacity = "0";
  form.reset();
  idDotTuyen.value = "";
  tieuDeModal.textContent = "Thêm đợt tuyển dụng";
}

btnThem.addEventListener("click", function () {
  form.reset();
  idDotTuyen.value = "";
  tieuDeModal.textContent = "Thêm đợt tuyển dụng";
  moModal();
});

btnDong.addEventListener("click", dongModal);
btnHuy.addEventListener("click", dongModal);

window.addEventListener("click", function (event) {
  if (event.target === modal) {
    dongModal();
  }
});

danhSach.addEventListener("click", function (event) {
  const btnSua = event.target.closest(".btn-sua");
  const btnXoa = event.target.closest(".btn-xoa");

  if (btnSua) {
    suaDotTuyen(btnSua.dataset.id);
    return;
  }

  if (btnXoa) {
    xoaDotTuyen(btnXoa.dataset.id);
  }
});

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  if (!ten.value.trim()) {
    alert("Vui lòng nhập tên đợt tuyển dụng");
    return;
  }

  const ngayBatDauISO = chuyenNgaySangISO(ngayBatDau.value);
  const ngayKetThucISO = chuyenNgaySangISO(ngayKetThuc.value);

  if (!ngayBatDauISO || !ngayKetThucISO) {
    alert("Nhập ngày bắt đầu và ngày kết thúc theo dạng dd/mm/yyyy");
    return;
  }

  if (ngayKetThucISO < ngayBatDauISO) {
    alert("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu");
    return;
  }

  const id = idDotTuyen.value;

  const duLieu = {
    ten: ten.value.trim(),
    mo_ta: moTa.value.trim(),
    trang_thai: trangThai.value,
    ngay_bat_dau: ngayBatDauISO,
    ngay_ket_thuc: ngayKetThucISO,
  };

  try {
    const response = await fetch(
      id ? `/api/dot-tuyen/${id}` : "/api/dot-tuyen",
      {
        method: id ? "PUT" : "POST",
        headers: layHeaders(),
        body: JSON.stringify(duLieu),
      },
    );

    const data = await response.json();

    if (response.status === 401) {
      dangXuat();
      return;
    }

    if (!response.ok) {
      throw new Error(data.message || "Có lỗi xảy ra");
    }

    alert(data.message);
    dongModal();
    layDanhSach();
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
});

async function suaDotTuyen(id) {
  try {
    const response = await fetch(`/api/dot-tuyen/${id}`, {
      headers: layHeaders(),
    });

    const data = await response.json();

    if (response.status === 401) {
      dangXuat();
      return;
    }

    if (!response.ok) {
      throw new Error(
        data.message || "Không lấy được thông tin đợt tuyển dụng",
      );
    }

    idDotTuyen.value = data.id;
    ten.value = data.ten || "";
    moTa.value = data.mo_ta || "";
    trangThai.value = data.trang_thai || "nhap";
    ngayBatDau.value = layNgayChoInput(data.ngay_bat_dau);
    ngayKetThuc.value = layNgayChoInput(data.ngay_ket_thuc);
    pickerNgayBatDau.value = chuyenNgaySangISO(ngayBatDau.value) || "";
    pickerNgayKetThuc.value = chuyenNgaySangISO(ngayKetThuc.value) || "";

    tieuDeModal.textContent = "Sửa đợt tuyển dụng";
    moModal();
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

async function xoaDotTuyen(id) {
  if (!confirm("Bạn có chắc muốn xóa đợt tuyển dụng này không?")) {
    return;
  }

  try {
    const response = await fetch(`/api/dot-tuyen/${id}`, {
      method: "DELETE",
      headers: layHeaders(),
    });

    const data = await response.json();

    if (response.status === 401) {
      dangXuat();
      return;
    }

    if (!response.ok) {
      throw new Error(data.message || "Không xóa được đợt tuyển dụng");
    }

    alert(data.message);
    layDanhSach();
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

function dangXuat() {
  localStorage.removeItem("token");
  localStorage.removeItem("nguoi_dung");
  window.location.href = "/login/login.html";
}

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

layDanhSach();
