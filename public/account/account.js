(function () {
  const token = localStorage.getItem("token");
  const btnThongTin = document.getElementById("btnThongTin");
  const btnDoiMatKhau = document.getElementById("btnDoiMatKhau");

  if (!token || !btnThongTin || !btnDoiMatKhau) {
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "account-overlay";
  overlay.id = "accountOverlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
        <section class="account-dialog" role="dialog" aria-modal="true" aria-labelledby="accountTitle">
            <header class="account-dialog-header">
                <div>
                    <h2 id="accountTitle"></h2>
                    <p id="accountSubtitle"></p>
                </div>
                <button type="button" class="account-close" id="accountClose" aria-label="Đóng">&times;</button>
            </header>
            <form id="accountProfileForm" hidden>
                <label for="accountName">Họ tên</label>
                <input id="accountName" type="text" maxlength="100" required>
                <label for="accountEmail">Email</label>
                <input id="accountEmail" type="email" maxlength="150" required>
                <label for="accountRole">Vai trò</label>
                <input id="accountRole" type="text" readonly>
                <div class="account-notice" id="accountProfileNotice" role="status"></div>
                <footer class="account-actions">
                    <button type="button" class="account-secondary" data-account-close>Hủy</button>
                    <button type="submit" class="account-primary">Lưu thay đổi</button>
                </footer>
            </form>
            <form id="accountPasswordForm" hidden>
                <label for="accountCurrentPassword">Mật khẩu hiện tại</label>
                <input id="accountCurrentPassword" type="password" autocomplete="current-password" required>
                <label for="accountNewPassword">Mật khẩu mới</label>
                <input id="accountNewPassword" type="password" minlength="6" autocomplete="new-password" required>
                <label for="accountConfirmPassword">Nhập lại mật khẩu mới</label>
                <input id="accountConfirmPassword" type="password" minlength="6" autocomplete="new-password" required>
                <div class="account-notice" id="accountPasswordNotice" role="status"></div>
                <footer class="account-actions">
                    <button type="button" class="account-secondary" data-account-close>Hủy</button>
                    <button type="submit" class="account-primary">Đổi mật khẩu</button>
                </footer>
            </form>
        </section>
    `;
  document.body.appendChild(overlay);

  const roleNames = {
    admin: "Quản trị viên",
    manager: "Quản lý",
    hr: "Nhân sự",
    interviewer: "Người phỏng vấn",
    viewer: "Người xem",
  };

  function dongMenu() {
    document.getElementById("menuTaiKhoan")?.classList.remove("hien");
  }

  function hienThongBao(element, message, success) {
    element.textContent = message || "";
    element.className =
      "account-notice" + (success ? " success" : message ? " visible" : "");
  }

  function dongModal() {
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
  }

  async function moThongTin() {
    dongMenu();
    document.getElementById("accountTitle").textContent = "Thông tin tài khoản";
    document.getElementById("accountSubtitle").textContent =
      "Cập nhật thông tin cá nhân";
    const form = document.getElementById("accountProfileForm");
    form.hidden = false;
    document.getElementById("accountPasswordForm").hidden = true;
    hienThongBao(document.getElementById("accountProfileNotice"), "", false);
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");

    try {
      const response = await fetch("/api/tai-khoan", {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await response.json();
      if (response.status === 401) {
        dangXuat();
        return;
      }
      if (!response.ok) {
        throw new Error(data.message || "Không lấy được thông tin tài khoản");
      }

      document.getElementById("accountName").value = data.ho_ten || "";
      document.getElementById("accountEmail").value = data.email || "";
      document.getElementById("accountRole").value =
        roleNames[data.vai_tro] || data.vai_tro || "";
      document.getElementById("accountName").focus();
    } catch (error) {
      hienThongBao(
        document.getElementById("accountProfileNotice"),
        error.message,
        false,
      );
    }
  }

  function moDoiMatKhau() {
    dongMenu();
    document.getElementById("accountTitle").textContent = "Đổi mật khẩu";
    document.getElementById("accountSubtitle").textContent =
      "Cập nhật mật khẩu đăng nhập";
    document.getElementById("accountProfileForm").hidden = true;
    const form = document.getElementById("accountPasswordForm");
    form.reset();
    form.hidden = false;
    hienThongBao(document.getElementById("accountPasswordNotice"), "", false);
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.getElementById("accountCurrentPassword").focus();
  }

  btnThongTin.addEventListener("click", moThongTin);
  btnDoiMatKhau.addEventListener("click", moDoiMatKhau);
  document.getElementById("accountClose").addEventListener("click", dongModal);
  overlay.addEventListener("click", function (event) {
    if (
      event.target === overlay ||
      event.target.closest("[data-account-close]")
    ) {
      dongModal();
    }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") dongModal();
  });

  document
    .getElementById("accountProfileForm")
    .addEventListener("submit", async function (event) {
      event.preventDefault();
      const notice = document.getElementById("accountProfileNotice");
      const hoTen = document.getElementById("accountName").value.trim();
      const email = document.getElementById("accountEmail").value.trim();

      try {
        const response = await fetch("/api/tai-khoan", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({ ho_ten: hoTen, email }),
        });
        const data = await response.json();
        if (response.status === 401) {
          dangXuat();
          return;
        }
        if (!response.ok) {
          throw new Error(data.message || "Không cập nhật được tài khoản");
        }

        const user = JSON.parse(localStorage.getItem("nguoi_dung") || "{}");
        user.ho_ten = hoTen;
        user.email = email;
        localStorage.setItem("nguoi_dung", JSON.stringify(user));
        document.getElementById("tenNguoiDung").textContent = hoTen;
        document.getElementById("avatar").textContent = hoTen
          .charAt(0)
          .toUpperCase();
        document.getElementById("tenMenuTaiKhoan").textContent = hoTen;
        document.getElementById("emailMenuTaiKhoan").textContent = email;
        hienThongBao(notice, data.message, true);
      } catch (error) {
        hienThongBao(notice, error.message, false);
      }
    });

  document
    .getElementById("accountPasswordForm")
    .addEventListener("submit", async function (event) {
      event.preventDefault();
      const notice = document.getElementById("accountPasswordNotice");
      const current = document.getElementById("accountCurrentPassword").value;
      const next = document.getElementById("accountNewPassword").value;
      const confirm = document.getElementById("accountConfirmPassword").value;

      if (next !== confirm) {
        hienThongBao(notice, "Mật khẩu xác nhận không khớp", false);
        return;
      }

      try {
        const response = await fetch("/api/tai-khoan/mat-khau", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({ mat_khau_cu: current, mat_khau_moi: next }),
        });
        const data = await response.json();
        if (response.status === 401) {
          dangXuat();
          return;
        }
        if (!response.ok) {
          throw new Error(data.message || "Không đổi được mật khẩu");
        }

        hienThongBao(notice, data.message, true);
        document.getElementById("accountPasswordForm").reset();
      } catch (error) {
        hienThongBao(notice, error.message, false);
      }
    });

  function dangXuat() {
    localStorage.removeItem("token");
    localStorage.removeItem("nguoi_dung");
    window.location.href = "/login/login.html";
  }
})();
