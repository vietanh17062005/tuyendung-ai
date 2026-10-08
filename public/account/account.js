const token = localStorage.getItem("token"); // Lấy token đăng nhập
const nguoiDungJSON = localStorage.getItem("nguoi_dung"); // Lấy thông tin người dùng

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

document.addEventListener("DOMContentLoaded", function () {
  khoiTaoTaiKhoan();
});

/* DOM */

function khoiTaoTaiKhoan() {
  const tenNguoiDung = document.getElementById("tenNguoiDung");
  const vaiTro = document.getElementById("vaiTro");
  const avatar = document.getElementById("avatar");

  const taiKhoan = document.getElementById("taiKhoan");
  const menuTaiKhoan = document.getElementById("menuTaiKhoan");

  const tenMenuTaiKhoan =
    document.getElementById("tenMenuTaiKhoan");

  const emailMenuTaiKhoan =
    document.getElementById("emailMenuTaiKhoan");

  const btnThongTin =
    document.getElementById("btnThongTin");

  const btnDoiMatKhau =
    document.getElementById("btnDoiMatKhau");

  const btnDangXuat =
    document.getElementById("btnDangXuat");

  if (!taiKhoan || !menuTaiKhoan) {
    console.warn("Không tìm thấy menu tài khoản.");
    return;
  }

  /* Hiển thị tài khoản */

  const hoTen =
    nguoiDung.ho_ten ||
    nguoiDung.ten ||
    nguoiDung.username ||
    "Người dùng";

  if (tenNguoiDung) {
    tenNguoiDung.textContent = hoTen;
  }

  if (avatar) {
    avatar.textContent = hoTen
      .charAt(0)
      .toUpperCase();
  }

  if (vaiTro) {
    vaiTro.textContent =
      layTenVaiTro(nguoiDung.vai_tro);
  }

  if (tenMenuTaiKhoan) {
    tenMenuTaiKhoan.textContent = hoTen;
  }

  if (emailMenuTaiKhoan) {
    emailMenuTaiKhoan.textContent =
      nguoiDung.email || "";
  }

  /* Dropdown tài khoản */

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

  /* Thông tin tài khoản */

  if (btnThongTin) {
    btnThongTin.addEventListener(
      "click",
      async function () {
        menuTaiKhoan.classList.remove("hien");

        await moModalThongTin();
      },
    );
  }

  /* Đổi mật khẩu */

  if (btnDoiMatKhau) {
    btnDoiMatKhau.addEventListener(
      "click",
      function () {
        menuTaiKhoan.classList.remove("hien");

        moModalMatKhau();
      },
    );
  }

  /* Đăng xuất */

  if (btnDangXuat) {
    btnDangXuat.addEventListener(
      "click",
      function () {
        dangXuat();
      },
    );
  }

  /* Khởi tạo modal */

  khoiTaoModalThongTin();
  khoiTaoModalMatKhau();
}

/* Vai trò */

function layTenVaiTro(vaiTro) {
  const danhSach = {
    admin: "Quản trị viên",
    manager: "Quản lý",
    hr: "Nhân sự",
    interviewer: "Người phỏng vấn",
    viewer: "Người xem",
  };

  return danhSach[vaiTro] || vaiTro || "Người dùng";
}

/* Modal thông tin */

function khoiTaoModalThongTin() {
  const btnDong =
    document.getElementById("btnDongThongTin");

  const btnHuy =
    document.getElementById("btnHuyThongTin");

  const form =
    document.getElementById("formThongTin");

  if (btnDong) {
    btnDong.addEventListener(
      "click",
      function () {
        dongModalThongTin();
      },
    );
  }

  if (btnHuy) {
    btnHuy.addEventListener(
      "click",
      function () {
        dongModalThongTin();
      },
    );
  }

  if (form) {
    form.addEventListener(
      "submit",
      luuThongTinTaiKhoan,
    );
  }
}

async function moModalThongTin() {
  try {
    const response = await fetch(
      "/api/tai-khoan",
      {
        headers: {
          Authorization: "Bearer " + token,
        },
      },
    );

    if (response.status === 401) {
      dangXuat();
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      alert(
        data.message ||
        "Không lấy được thông tin tài khoản.",
      );

      return;
    }

    const hoTen =
      document.getElementById("taiKhoanHoTen");

    const email =
      document.getElementById("taiKhoanEmail");

    const vaiTro =
      document.getElementById("taiKhoanVaiTro");

    if (hoTen) {
      hoTen.value = data.ho_ten || "";
    }

    if (email) {
      email.value = data.email || "";
    }

    if (vaiTro) {
      vaiTro.value =
        layTenVaiTro(data.vai_tro);
    }

    const modal =
      document.getElementById(
        "modalThongTin",
      );

    if (modal) {
      modal.classList.add("hien");
    }
  } catch (error) {
    console.error(error);

    alert(
      "Không thể kết nối đến máy chủ.",
    );
  }
}

function dongModalThongTin() {
  const modal =
    document.getElementById(
      "modalThongTin",
    );

  if (modal) {
    modal.classList.remove("hien");
  }
}

async function luuThongTinTaiKhoan(event) {
  event.preventDefault();

  const hoTen =
    document
      .getElementById("taiKhoanHoTen")
      .value.trim();

  const email =
    document
      .getElementById("taiKhoanEmail")
      .value.trim();

  const thongBao =
    document.getElementById(
      "thongBaoThongTin",
    );

  if (thongBao) {
    thongBao.className = "thong-bao";
    thongBao.textContent = "";
  }

  try {
    const response = await fetch(
      "/api/tai-khoan",
      {
        method: "PUT",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            "Bearer " + token,
        },

        body: JSON.stringify({
          ho_ten: hoTen,
          email: email,
        }),
      },
    );

    if (response.status === 401) {
      dangXuat();
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      if (thongBao) {
        thongBao.textContent =
          data.message ||
          "Không thể cập nhật thông tin.";

        thongBao.classList.add("hien");
      }

      return;
    }

    nguoiDung.ho_ten = hoTen;
    nguoiDung.email = email;

    localStorage.setItem(
      "nguoi_dung",
      JSON.stringify(nguoiDung),
    );

    capNhatTaiKhoanTrenGiaoDien();

    if (thongBao) {
      thongBao.textContent =
        "Cập nhật thông tin thành công.";

      thongBao.classList.add(
        "hien",
        "thanh-cong",
      );
    }

    setTimeout(function () {
      dongModalThongTin();
    }, 700);
  } catch (error) {
    console.error(error);

    if (thongBao) {
      thongBao.textContent =
        "Không thể kết nối đến máy chủ.";

      thongBao.classList.add("hien");
    }
  }
}

/* Cập nhật tài khoản */

function capNhatTaiKhoanTrenGiaoDien() {
  const hoTen =
    nguoiDung.ho_ten ||
    nguoiDung.ten ||
    nguoiDung.username ||
    "Người dùng";

  const tenNguoiDung =
    document.getElementById(
      "tenNguoiDung",
    );

  const avatar =
    document.getElementById("avatar");

  const tenMenuTaiKhoan =
    document.getElementById(
      "tenMenuTaiKhoan",
    );

  const emailMenuTaiKhoan =
    document.getElementById(
      "emailMenuTaiKhoan",
    );

  if (tenNguoiDung) {
    tenNguoiDung.textContent = hoTen;
  }

  if (avatar) {
    avatar.textContent =
      hoTen.charAt(0).toUpperCase();
  }

  if (tenMenuTaiKhoan) {
    tenMenuTaiKhoan.textContent =
      hoTen;
  }

  if (emailMenuTaiKhoan) {
    emailMenuTaiKhoan.textContent =
      nguoiDung.email || "";
  }
}

/* Modal đổi mật khẩu */

function khoiTaoModalMatKhau() {
  const btnDong =
    document.getElementById(
      "btnDongMatKhau",
    );

  const btnHuy =
    document.getElementById(
      "btnHuyMatKhau",
    );

  const form =
    document.getElementById(
      "formMatKhau",
    );

  if (btnDong) {
    btnDong.addEventListener(
      "click",
      function () {
        dongModalMatKhau();
      },
    );
  }

  if (btnHuy) {
    btnHuy.addEventListener(
      "click",
      function () {
        dongModalMatKhau();
      },
    );
  }

  if (form) {
    form.addEventListener(
      "submit",
      doiMatKhau,
    );
  }
}

function moModalMatKhau() {
  const form =
    document.getElementById(
      "formMatKhau",
    );

  const thongBao =
    document.getElementById(
      "thongBaoMatKhau",
    );

  if (form) {
    form.reset();
  }

  if (thongBao) {
    thongBao.className = "thong-bao";
    thongBao.textContent = "";
  }

  const modal =
    document.getElementById(
      "modalMatKhau",
    );

  if (modal) {
    modal.classList.add("hien");
  }
}

function dongModalMatKhau() {
  const modal =
    document.getElementById(
      "modalMatKhau",
    );

  if (modal) {
    modal.classList.remove("hien");
  }
}

async function doiMatKhau(event) {
  event.preventDefault();

  const matKhauCu =
    document.getElementById(
      "matKhauCu",
    ).value;

  const matKhauMoi =
    document.getElementById(
      "matKhauMoi",
    ).value;

  const xacNhan =
    document.getElementById(
      "xacNhanMatKhau",
    ).value;

  const thongBao =
    document.getElementById(
      "thongBaoMatKhau",
    );

  if (thongBao) {
    thongBao.className = "thong-bao";
    thongBao.textContent = "";
  }

  if (matKhauMoi !== xacNhan) {
    if (thongBao) {
      thongBao.textContent =
        "Mật khẩu xác nhận không khớp.";

      thongBao.classList.add("hien");
    }

    return;
  }

  if (matKhauMoi.length < 6) {
    if (thongBao) {
      thongBao.textContent =
        "Mật khẩu mới phải có ít nhất 6 ký tự.";

      thongBao.classList.add("hien");
    }

    return;
  }

  try {
    const response = await fetch(
      "/api/tai-khoan/mat-khau",
      {
        method: "PUT",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            "Bearer " + token,
        },

        body: JSON.stringify({
          mat_khau_cu: matKhauCu,
          mat_khau_moi: matKhauMoi,
        }),
      },
    );

    if (response.status === 401) {
      dangXuat();
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      if (thongBao) {
        thongBao.textContent =
          data.message ||
          "Không thể đổi mật khẩu.";

        thongBao.classList.add("hien");
      }

      return;
    }

    if (thongBao) {
      thongBao.textContent =
        "Đổi mật khẩu thành công.";

      thongBao.classList.add(
        "hien",
        "thanh-cong",
      );
    }

    setTimeout(function () {
      dongModalMatKhau();
    }, 700);
  } catch (error) {
    console.error(error);

    if (thongBao) {
      thongBao.textContent =
        "Không thể kết nối đến máy chủ.";

      thongBao.classList.add("hien");
    }
  }
}

/* Đăng xuất */

function dangXuat() {
  localStorage.removeItem(`lich_su_chat_ai_${nguoiDung?.id || nguoiDung?.email}`);
  localStorage.removeItem("token");
  localStorage.removeItem("nguoi_dung");

  window.location.href =
    "/login/login.html";
}