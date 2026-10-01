const token = localStorage.getItem("token");
const nguoiDungJSON = localStorage.getItem("nguoi_dung");

if (!token || !nguoiDungJSON) {
  window.location.href = "/login/login.html";
}

let nguoiDung;

try {
  nguoiDung = JSON.parse(nguoiDungJSON);
} catch (error) {
  localStorage.removeItem("token");
  localStorage.removeItem("nguoi_dung");

  window.location.href = "/login/login.html";
}

if (!nguoiDung) {
  localStorage.removeItem("token");
  localStorage.removeItem("nguoi_dung");

  window.location.href = "/login/login.html";
}

/* DOM */

const tenNguoiDung = document.getElementById("tenNguoiDung");

const vaiTro = document.getElementById("vaiTro");

const xinChao = document.getElementById("xinChao");

const moTaVaiTro = document.getElementById("moTaVaiTro");

const avatar = document.getElementById("avatar");

const menuNguoiDung = document.getElementById("menuNguoiDung");

const taiKhoan = document.getElementById("taiKhoan");

const menuTaiKhoan = document.getElementById("menuTaiKhoan");

/* Hiển thị tài khoản */

tenNguoiDung.textContent = nguoiDung.ho_ten;

avatar.textContent = nguoiDung.ho_ten.charAt(0).toUpperCase();

vaiTro.textContent = layTenVaiTro(nguoiDung.vai_tro);

xinChao.textContent = "Xin chào, " + nguoiDung.ho_ten;

moTaVaiTro.textContent = layMoTaVaiTro(nguoiDung.vai_tro);

/* Ẩn quản lý người dùng */

if (nguoiDung.vai_tro !== "admin") {
  menuNguoiDung.style.display = "none";
}

/* Dropdown tài khoản */

document.getElementById("tenMenuTaiKhoan").textContent = nguoiDung.ho_ten;

document.getElementById("emailMenuTaiKhoan").textContent = nguoiDung.email;

taiKhoan.addEventListener("click", function (event) {
  event.stopPropagation();

  menuTaiKhoan.classList.toggle("hien");
});

document.addEventListener("click", function () {
  menuTaiKhoan.classList.remove("hien");
});

menuTaiKhoan.addEventListener("click", function (event) {
  event.stopPropagation();
});

/* Vai trò */

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

function layMoTaVaiTro(vaiTro) {
  const danhSach = {
    admin: "Bạn có toàn quyền quản lý hệ thống và người dùng.",

    manager: "Bạn có quyền quản lý tuyển dụng và đưa ra quyết định tuyển dụng.",

    hr: "Bạn có quyền quản lý ứng viên, CV và quá trình tuyển dụng.",

    interviewer: "Bạn có quyền quản lý lịch phỏng vấn và đánh giá ứng viên.",

    viewer: "Bạn có quyền xem các thông tin được cấp phép.",
  };

  return danhSach[vaiTro] || "Chào mừng bạn quay trở lại hệ thống.";
}

/* Dashboard */

async function layDuLieuDashboard() {
  try {
    const response = await fetch("/api/dashboard", {
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    if (response.status === 401) {
      dangXuat();

      return;
    }

    const data = await response.json();

    if (!response.ok) {
      console.error(data.message);

      return;
    }

    document.getElementById("soDotTuyen").textContent = data.so_dot_tuyen;

    document.getElementById("soUngVien").textContent = data.so_ung_vien;

    document.getElementById("soPhongVan").textContent = data.so_phong_van;

    document.getElementById("soDaTuyen").textContent = data.so_da_tuyen;
  } catch (error) {
    console.error(error);
  }
}

/* Quyền */

function hienThiQuyen() {
  const danhSachQuyen = document.getElementById("danhSachQuyen");

  const quyenTheoVaiTro = {
    admin: [
      {
        icon: "▤",
        ten: "Quản lý đợt tuyển dụng",
        moTa: "Tạo, sửa và quản lý các đợt tuyển dụng.",
      },

      {
        icon: "♙",
        ten: "Quản lý ứng viên",
        moTa: "Theo dõi và quản lý hồ sơ ứng viên.",
      },

      {
        icon: "▣",
        ten: "Quản lý CV",
        moTa: "Quản lý CV và thông tin hồ sơ ứng viên.",
      },

      {
        icon: "◷",
        ten: "Phỏng vấn",
        moTa: "Theo dõi lịch và kết quả phỏng vấn.",
      },

      {
        icon: "✓",
        ten: "Quyết định tuyển dụng",
        moTa: "Theo dõi và quản lý kết quả tuyển dụng.",
      },

      {
        icon: "♙",
        ten: "Người dùng & phân quyền",
        moTa: "Quản lý tài khoản và vai trò người dùng.",
      },
    ],

    manager: [
      {
        icon: "▤",
        ten: "Đợt tuyển dụng",
        moTa: "Quản lý các đợt tuyển dụng được phân quyền.",
      },

      {
        icon: "♙",
        ten: "Ứng viên",
        moTa: "Theo dõi và đánh giá ứng viên.",
      },

      {
        icon: "✓",
        ten: "Duyệt JD",
        moTa: "Duyệt JD và quản lý yêu cầu tuyển dụng.",
      },

      {
        icon: "◷",
        ten: "Quyết định tuyển dụng",
        moTa: "Đưa ra quyết định tuyển dụng cuối cùng.",
      },
    ],

    hr: [
      {
        icon: "▤",
        ten: "Đợt tuyển dụng",
        moTa: "Theo dõi các đợt tuyển dụng.",
      },

      {
        icon: "♙",
        ten: "Ứng viên",
        moTa: "Thêm và quản lý ứng viên.",
      },

      {
        icon: "▣",
        ten: "CV",
        moTa: "Tải lên và quản lý CV ứng viên.",
      },

      {
        icon: "◷",
        ten: "Phỏng vấn",
        moTa: "Liên hệ và sắp xếp lịch phỏng vấn.",
      },
    ],

    interviewer: [
      {
        icon: "♙",
        ten: "Ứng viên",
        moTa: "Xem thông tin ứng viên được phân công.",
      },

      {
        icon: "◷",
        ten: "Phỏng vấn",
        moTa: "Theo dõi lịch phỏng vấn.",
      },

      {
        icon: "✓",
        ten: "Đánh giá",
        moTa: "Nhập đánh giá và nhận xét ứng viên.",
      },
    ],

    viewer: [
      {
        icon: "▤",
        ten: "Xem dữ liệu",
        moTa: "Xem các thông tin được hệ thống cấp quyền.",
      },

      {
        icon: "▥",
        ten: "Báo cáo",
        moTa: "Xem các báo cáo được phép truy cập.",
      },
    ],
  };

  const danhSach = quyenTheoVaiTro[nguoiDung.vai_tro] || [];

  danhSachQuyen.innerHTML = "";

  danhSach.forEach(function (quyen) {
    const div = document.createElement("div");

    div.className = "quyen-item";

    div.innerHTML = `

                <div class="quyen-icon">
                    ${quyen.icon}
                </div>

                <strong>
                    ${quyen.ten}
                </strong>

                <p>
                    ${quyen.moTa}
                </p>

            `;

    danhSachQuyen.appendChild(div);
  });
}

/* Thông tin tài khoản */

document
  .getElementById("btnThongTin")
  .addEventListener("click", async function () {
    menuTaiKhoan.classList.remove("hien");

    await moModalThongTin();
  });

async function moModalThongTin() {
  try {
    const response = await fetch("/api/tai-khoan", {
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    if (response.status === 401) {
      dangXuat();

      return;
    }

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Không lấy được thông tin tài khoản.");

      return;
    }

    document.getElementById("taiKhoanHoTen").value = data.ho_ten;

    document.getElementById("taiKhoanEmail").value = data.email;

    document.getElementById("taiKhoanVaiTro").value = layTenVaiTro(
      data.vai_tro,
    );

    document.getElementById("modalThongTin").classList.add("hien");
  } catch (error) {
    console.error(error);

    alert("Không thể kết nối đến máy chủ.");
  }
}

/* Đóng thông tin */

document
  .getElementById("btnDongThongTin")
  .addEventListener("click", function () {
    document.getElementById("modalThongTin").classList.remove("hien");
  });

document
  .getElementById("btnHuyThongTin")
  .addEventListener("click", function () {
    document.getElementById("modalThongTin").classList.remove("hien");
  });

/* Lưu thông tin */

document
  .getElementById("formThongTin")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    const hoTen = document.getElementById("taiKhoanHoTen").value.trim();

    const email = document.getElementById("taiKhoanEmail").value.trim();

    const thongBao = document.getElementById("thongBaoThongTin");

    thongBao.className = "thong-bao";

    thongBao.textContent = "";

    try {
      const response = await fetch("/api/tai-khoan", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",

          Authorization: "Bearer " + token,
        },

        body: JSON.stringify({
          ho_ten: hoTen,

          email: email,
        }),
      });

      if (response.status === 401) {
        dangXuat();

        return;
      }

      const data = await response.json();

      if (!response.ok) {
        thongBao.textContent = data.message;

        thongBao.classList.add("hien");

        return;
      }

      nguoiDung.ho_ten = hoTen;

      nguoiDung.email = email;

      localStorage.setItem("nguoi_dung", JSON.stringify(nguoiDung));

      tenNguoiDung.textContent = hoTen;

      avatar.textContent = hoTen.charAt(0).toUpperCase();

      document.getElementById("tenMenuTaiKhoan").textContent = hoTen;

      document.getElementById("emailMenuTaiKhoan").textContent = email;

      thongBao.textContent = "Cập nhật thông tin thành công.";

      thongBao.classList.add("hien", "thanh-cong");

      setTimeout(function () {
        document.getElementById("modalThongTin").classList.remove("hien");
      }, 700);
    } catch (error) {
      console.error(error);

      thongBao.textContent = "Không thể kết nối đến máy chủ.";

      thongBao.classList.add("hien");
    }
  });

/* Đổi mật khẩu */

document.getElementById("btnDoiMatKhau").addEventListener("click", function () {
  menuTaiKhoan.classList.remove("hien");

  document.getElementById("formMatKhau").reset();

  document.getElementById("thongBaoMatKhau").className = "thong-bao";

  document.getElementById("modalMatKhau").classList.add("hien");
});

/* Đóng đổi mật khẩu */

document
  .getElementById("btnDongMatKhau")
  .addEventListener("click", function () {
    document.getElementById("modalMatKhau").classList.remove("hien");
  });

document.getElementById("btnHuyMatKhau").addEventListener("click", function () {
  document.getElementById("modalMatKhau").classList.remove("hien");
});

/* Lưu mật khẩu */

document
  .getElementById("formMatKhau")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    const matKhauCu = document.getElementById("matKhauCu").value;

    const matKhauMoi = document.getElementById("matKhauMoi").value;

    const xacNhan = document.getElementById("xacNhanMatKhau").value;

    const thongBao = document.getElementById("thongBaoMatKhau");

    thongBao.className = "thong-bao";

    thongBao.textContent = "";

    if (matKhauMoi !== xacNhan) {
      thongBao.textContent = "Mật khẩu xác nhận không khớp.";

      thongBao.classList.add("hien");

      return;
    }

    if (matKhauMoi.length < 6) {
      thongBao.textContent = "Mật khẩu mới phải có ít nhất 6 ký tự.";

      thongBao.classList.add("hien");

      return;
    }

    try {
      const response = await fetch("/api/tai-khoan/mat-khau", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",

          Authorization: "Bearer " + token,
        },

        body: JSON.stringify({
          mat_khau_cu: matKhauCu,

          mat_khau_moi: matKhauMoi,
        }),
      });

      if (response.status === 401) {
        dangXuat();

        return;
      }

      const data = await response.json();

      if (!response.ok) {
        thongBao.textContent = data.message;

        thongBao.classList.add("hien");

        return;
      }

      thongBao.textContent = "Đổi mật khẩu thành công.";

      thongBao.classList.add("hien", "thanh-cong");

      setTimeout(function () {
        document.getElementById("modalMatKhau").classList.remove("hien");
      }, 700);
    } catch (error) {
      console.error(error);

      thongBao.textContent = "Không thể kết nối đến máy chủ.";

      thongBao.classList.add("hien");
    }
  });

/* Đăng xuất */

document.getElementById("btnDangXuat").addEventListener("click", function () {
  dangXuat();
});

function dangXuat() {
  localStorage.removeItem("token");

  localStorage.removeItem("nguoi_dung");

  window.location.href = "/login/login.html";
}

/* Chạy */

hienThiQuyen();

layDuLieuDashboard();

const thaoTacTaiKhoan = new URLSearchParams(window.location.search).get(
  "account",
);
if (thaoTacTaiKhoan === "info") {
  document.getElementById("btnThongTin").click();
} else if (thaoTacTaiKhoan === "password") {
  document.getElementById("btnDoiMatKhau").click();
}
