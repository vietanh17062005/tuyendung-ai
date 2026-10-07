(function () {
  const token = localStorage.getItem("token");

  let nguoiDung = null;

  try {
    nguoiDung = JSON.parse(
      localStorage.getItem("nguoi_dung") || "null",
    );
  } catch (error) {
    nguoiDung = null;
  }

  if (!token || !nguoiDung) {
    window.location.href = "/login/login.html";
    return;
  }

  const tbody = document.getElementById("danhSach");
  const btnThem = document.getElementById("btnThem");
  const modal = document.getElementById("modal");
  const form = document.getElementById("form");
  const btnDong = document.getElementById("btnDong");
  const btnHuy = document.getElementById("btnHuy");
  const btnLuu = document.getElementById("btnLuu");

  const inputId = document.getElementById("id");
  const inputTen = document.getElementById("ten");
  const inputMoTa = document.getElementById("moTa");
  const inputTrangThai = document.getElementById("trangThai");

  const inputNgayBatDau =
    document.getElementById("ngayBatDau");

  const inputNgayKetThuc =
    document.getElementById("ngayKetThuc");

  const pickerNgayBatDau =
    document.getElementById("pickerNgayBatDau");

  const pickerNgayKetThuc =
    document.getElementById("pickerNgayKetThuc");

  const btnPickerNgayBatDau =
    document.getElementById("btnPickerNgayBatDau");

  const btnPickerNgayKetThuc =
    document.getElementById("btnPickerNgayKetThuc");

  const tieuDeModal =
    document.getElementById("tieuDeModal");

  const tieuDe =
    document.getElementById("tieuDe");

  const jdMoTa =
    document.getElementById("jdMoTa");

  const jdYeuCau =
    document.getElementById("jdYeuCau");

  const jdQuyenLoi =
    document.getElementById("jdQuyenLoi");

  const jdGhiChu =
    document.getElementById("jdGhiChu");

  const btnGoiYAI =
    document.getElementById("btnGoiYAI");

  const btnThemTieuChi =
    document.getElementById("btnThemTieuChi");

  const danhSachTieuChi =
    document.getElementById("danhSachTieuChi");

  const tongTrongSo =
    document.getElementById("tongTrongSo");

  const thongBaoTieuChi =
    document.getElementById("thongBaoTieuChi");

  const thongBao =
    document.getElementById("thongBao");

  const inputTimKiem =
    document.getElementById("oTimKiem");

  const locTrangThai =
    document.getElementById("locTrangThai");

  const tongSo =
    document.getElementById("tongSo");

  const khongCoDuLieu =
    document.getElementById("khongCoDuLieu");

  const modalXacNhan =
    document.getElementById("modalXacNhan");

  const noiDungXacNhan =
    document.getElementById("noiDungXacNhan");

  const btnKhongXoa =
    document.getElementById("btnKhongXoa");

  const btnXacNhanXoa =
    document.getElementById("btnXacNhanXoa");

  const menuNguoiDung =
    document.getElementById("menuNguoiDung");

  let danhSachDotTuyen = [];
  let danhSachJD = [];
  let idDangXoa = null;
  let dangGoiAI = false;

  function coQuyenQuanLy() {
    return ["admin", "manager"].includes(
      nguoiDung?.vai_tro,
    );
  }

  function coQuyenTaoJD() {
    return [
      "admin",
      "manager",
      "hr",
    ].includes(nguoiDung?.vai_tro);
  }

  function layHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function dinhDangNgay(ngay) {
    if (!ngay) {
      return "-";
    }

    const chuoi = String(ngay).slice(0, 10);

    const parts = chuoi.split("-");

    if (parts.length !== 3) {
      return "-";
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function doiNgaySangISO(ngay) {
    if (!ngay) {
      return "";
    }

    const value = String(ngay).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const parts = value.split("/");

    if (parts.length !== 3) {
      return "";
    }

    const [
      ngayTrongThang,
      thang,
      nam,
    ] = parts;

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

    return (
      danhSach[trangThai] ||
      trangThai ||
      "-"
    );
  }

  function layTenTrangThaiJD(trangThai) {
    const danhSach = {
      nhap: "JD nháp",
      cho_duyet: "Chờ duyệt",
      da_duyet: "Đã duyệt",
      tu_choi: "Từ chối",
      huy: "Đã hủy",
    };

    return (
      danhSach[trangThai] ||
      trangThai ||
      "-"
    );
  }

  function layJDTheoDotTuyen(id) {
    return (
      danhSachJD.find(function (item) {
        return (
          Number(item.dot_tuyen_id) ===
          Number(id)
        );
      }) || null
    );
  }

  function hienThongBao(
    noiDung,
    loai = "",
  ) {
    if (!thongBao) {
      return;
    }

    thongBao.textContent = noiDung || "";

    thongBao.className =
      noiDung
        ? `thong-bao hien ${loai}`
        : "thong-bao";
  }

  function hienThongBaoTieuChi(noiDung) {
    if (!thongBaoTieuChi) {
      return;
    }

    thongBaoTieuChi.textContent =
      noiDung || "";
  }

  function capNhatTongTrongSo() {
    if (!danhSachTieuChi) {
      return 0;
    }

    let tong = 0;

    danhSachTieuChi
      .querySelectorAll(".o-trong-so")
      .forEach(function (input) {
        let value =
          Number(input.value) || 0;

        if (value < 0) {
          value = 0;
        }

        if (value > 100) {
          value = 100;
        }

        tong += value;
      });

    if (tongTrongSo) {
      tongTrongSo.textContent =
        `Tổng: ${tong}%`;

      tongTrongSo.classList.toggle(
        "lech",
        tong > 100,
      );
    }

    hienThongBaoTieuChi(
      tong > 100
        ? "Tổng trọng số không được vượt quá 100%."
        : "",
    );

    return tong;
  }

  function taoHangTieuChi(tieuChi) {
    const hang =
      document.createElement("div");

    hang.className =
      "tieu-chi-hang";

    const oTen =
      document.createElement("input");

    oTen.type = "text";
    oTen.className = "o-ten";
    oTen.placeholder =
      "Tên tiêu chí";
    oTen.maxLength = 150;
    oTen.value =
      tieuChi?.ten || "";

    const oTrongSo =
      document.createElement("input");

    oTrongSo.type = "number";
    oTrongSo.className =
      "o-trong-so";

    oTrongSo.min = "0";
    oTrongSo.max = "100";
    oTrongSo.step = "1";
    oTrongSo.placeholder = "%";
    oTrongSo.value =
      tieuChi?.trong_so ?? "";

    oTrongSo.addEventListener(
      "input",
      capNhatTongTrongSo,
    );

    const oMoTa =
      document.createElement("textarea");

    oMoTa.className =
      "o-mo-ta";

    oMoTa.rows = 2;
    oMoTa.maxLength = 500;
    oMoTa.placeholder =
      "Mô tả cách đánh giá";

    oMoTa.value =
      tieuChi?.mo_ta || "";

    const nutXoa =
      document.createElement("button");

    nutXoa.type = "button";
    nutXoa.className =
      "btn-xoa-tieu-chi";

    nutXoa.textContent = "×";
    nutXoa.title =
      "Xóa tiêu chí";

    nutXoa.addEventListener(
      "click",
      function () {
        hang.remove();
        capNhatTongTrongSo();
      },
    );

    hang.append(
      oTen,
      oTrongSo,
      oMoTa,
      nutXoa,
    );

    return hang;
  }

  function hienThiTieuChi(
    danhSach,
  ) {
    if (!danhSachTieuChi) {
      return;
    }

    danhSachTieuChi.replaceChildren();

    (
      Array.isArray(danhSach)
        ? danhSach
        : []
    ).forEach(function (item) {
      danhSachTieuChi.appendChild(
        taoHangTieuChi(item),
      );
    });

    capNhatTongTrongSo();
  }

  function docTieuChi() {
    const ketQua = [];

    if (!danhSachTieuChi) {
      return ketQua;
    }

    danhSachTieuChi
      .querySelectorAll(".tieu-chi-hang")
      .forEach(function (hang) {
        const ten =
          hang
            .querySelector(".o-ten")
            ?.value
            .trim() || "";

        const moTa =
          hang
            .querySelector(".o-mo-ta")
            ?.value
            .trim() || "";

        const trongSo =
          Number(
            hang
              .querySelector(".o-trong-so")
              ?.value,
          ) || 0;

        if (!ten) {
          return;
        }

        ketQua.push({
          ten,
          mo_ta: moTa,
          trong_so: trongSo,
        });
      });

    return ketQua;
  }

  function datTrangThaiAI(
    dangXuLy,
  ) {
    dangGoiAI = dangXuLy;

    if (btnGoiYAI) {
      btnGoiYAI.disabled =
        dangXuLy;

      btnGoiYAI.innerHTML =
        dangXuLy
          ? "<span>✦</span> AI đang xử lý..."
          : "<span>✦</span> Gợi ý bằng AI";
    }

    if (btnLuu) {
      btnLuu.disabled =
        dangXuLy;
    }

    if (btnThemTieuChi) {
      btnThemTieuChi.disabled =
        dangXuLy;
    }
  }

  async function kiemTraPhien(
    response,
  ) {
    if (response.status !== 401) {
      return false;
    }

    localStorage.removeItem("token");
    localStorage.removeItem(
      "nguoi_dung",
    );

    window.location.href =
      "/login/login.html";

    return true;
  }

  async function layDanhSachDotTuyen() {
    const response =
      await fetch(
        "/api/dot-tuyen",
        {
          method: "GET",
          headers: layHeaders(),
        },
      );

    if (
      await kiemTraPhien(response)
    ) {
      return;
    }

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        "Không thể tải đợt tuyển dụng",
      );
    }

    danhSachDotTuyen =
      Array.isArray(data)
        ? data
        : [];
  }

  async function layDanhSachJD() {
    const response =
      await fetch(
        "/api/jd",
        {
          method: "GET",
          headers: layHeaders(),
        },
      );

    if (
      await kiemTraPhien(response)
    ) {
      return;
    }

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        "Không thể tải danh sách JD",
      );
    }

    danhSachJD =
      Array.isArray(data)
        ? data
        : [];
  }

  async function taiDuLieu() {
    try {
      await Promise.all([
        layDanhSachDotTuyen(),
        layDanhSachJD(),
      ]);

      locDanhSach();
    } catch (error) {
      console.error(
        "Lỗi tải dữ liệu:",
        error,
      );

      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align:center;padding:35px;">
              Không thể tải dữ liệu tuyển dụng
            </td>
          </tr>
        `;
      }
    }
  }

  function hienThiDanhSach(
    danhSach,
  ) {
    if (!tbody) {
      return;
    }

    tbody.innerHTML = "";

    if (tongSo) {
      tongSo.textContent =
        `${danhSach.length} đợt tuyển dụng`;
    }

    if (khongCoDuLieu) {
      khongCoDuLieu.style.display =
        danhSach.length
          ? "none"
          : "block";
    }

    danhSach.forEach(
      function (dotTuyen, index) {
        const jd =
          layJDTheoDotTuyen(
            dotTuyen.id,
          );

        const tr =
          document.createElement(
            "tr",
          );

        const actionHTML =
          coQuyenQuanLy()
            ? `
              <div class="action-group">
                <button
                  type="button"
                  class="btn-xem"
                  data-action="xem"
                  data-id="${escapeHTML(dotTuyen.id)}"
                >
                  Xem
                </button>

                <button
                  type="button"
                  class="btn-sua"
                  data-action="sua"
                  data-id="${escapeHTML(dotTuyen.id)}"
                >
                  Sửa
                </button>

                <button
                  type="button"
                  class="btn-xoa"
                  data-action="xoa"
                  data-id="${escapeHTML(dotTuyen.id)}"
                >
                  Xóa
                </button>
              </div>
            `
            : `
              <div class="action-group">
                <button
                  type="button"
                  class="btn-xem"
                  data-action="xem"
                  data-id="${escapeHTML(dotTuyen.id)}"
                >
                  Xem
                </button>
              </div>
            `;

        tr.innerHTML = `
          <td>
            ${index + 1}
          </td>

          <td>
            <div class="ten-dot">
              ${escapeHTML(
          dotTuyen.ten_dot ||
          dotTuyen.ten ||
          "-",
        )}
            </div>

            <div class="mo-ta-bang">
              ${escapeHTML(
          dotTuyen.mo_ta ||
          "Không có mô tả",
        )}
            </div>
          </td>

          <td>
            <div class="jd-ten">
              ${escapeHTML(
          jd?.tieu_de ||
          "Chưa có JD",
        )}
            </div>

            <div class="mo-ta-bang">
              ${jd
            ? `
                    <span class="badge jd-${escapeHTML(
              jd.trang_thai ||
              "nhap",
            )}">
                      ${escapeHTML(
              layTenTrangThaiJD(
                jd.trang_thai,
              ),
            )}
                    </span>
                  `
            : "Chưa tạo"
          }
            </div>
          </td>

          <td>
            <span class="badge ${escapeHTML(
            dotTuyen.trang_thai,
          )}">
              ${escapeHTML(
            layTenTrangThai(
              dotTuyen.trang_thai,
            ),
          )}
            </span>
          </td>

          <td>
            <div class="thoi-gian">
              <span>
                ${dinhDangNgay(
            dotTuyen.ngay_bat_dau,
          )}
              </span>

              <span>
                đến
                ${dinhDangNgay(
            dotTuyen.ngay_ket_thuc,
          )}
              </span>
            </div>
          </td>

          <td>
            ${escapeHTML(
            dotTuyen.nguoi_tao_ten ||
            "-",
          )}
          </td>

          <td>
            ${actionHTML}
          </td>
        `;

        tbody.appendChild(tr);
      },
    );
  }

  function locDanhSach() {
    const tuKhoa =
      (
        inputTimKiem?.value ||
        ""
      )
        .trim()
        .toLowerCase();

    const trangThai =
      locTrangThai?.value || "";

    const danhSachLoc =
      danhSachDotTuyen.filter(
        function (dotTuyen) {
          const jd =
            layJDTheoDotTuyen(
              dotTuyen.id,
            );

          const tenDot =
            String(
              dotTuyen.ten_dot ||
              dotTuyen.ten ||
              "",
            ).toLowerCase();

          const moTa =
            String(
              dotTuyen.mo_ta ||
              "",
            ).toLowerCase();

          const tenJD =
            String(
              jd?.tieu_de || "",
            ).toLowerCase();

          const phuHopTuKhoa =
            !tuKhoa ||
            tenDot.includes(
              tuKhoa,
            ) ||
            moTa.includes(
              tuKhoa,
            ) ||
            tenJD.includes(
              tuKhoa,
            );

          const phuHopTrangThai =
            !trangThai ||
            dotTuyen.trang_thai ===
            trangThai;

          return (
            phuHopTuKhoa &&
            phuHopTrangThai
          );
        },
      );

    hienThiDanhSach(
      danhSachLoc,
    );
  }

  function resetForm() {
    if (form) {
      form.reset();
    }

    if (inputId) {
      inputId.value = "";
    }

    if (inputTrangThai) {
      inputTrangThai.value =
        "nhap";
    }

    if (danhSachTieuChi) {
      danhSachTieuChi.replaceChildren();
    }

    if (tongTrongSo) {
      tongTrongSo.textContent =
        "Tổng: 0%";

      tongTrongSo.classList.remove(
        "lech",
      );
    }

    hienThongBao("");
    hienThongBaoTieuChi("");
  }

  function moModalThem() {
    if (!coQuyenQuanLy()) {
      return;
    }

    resetForm();

    if (tieuDeModal) {
      tieuDeModal.textContent =
        "Thêm đợt tuyển dụng";
    }

    modal.style.display = "flex";
  }

  async function moModalSua(
    dotTuyen,
  ) {
    if (!coQuyenQuanLy()) {
      return;
    }

    if (!dotTuyen) {
      return;
    }

    resetForm();

    if (tieuDeModal) {
      tieuDeModal.textContent =
        "Sửa đợt tuyển dụng";
    }

    inputId.value =
      dotTuyen.id || "";

    inputTen.value =
      dotTuyen.ten_dot ||
      dotTuyen.ten ||
      "";

    inputMoTa.value =
      dotTuyen.mo_ta || "";

    inputTrangThai.value =
      dotTuyen.trang_thai ||
      "nhap";

    inputNgayBatDau.value =
      dinhDangNgay(
        dotTuyen.ngay_bat_dau,
      ) === "-"
        ? ""
        : dinhDangNgay(
          dotTuyen.ngay_bat_dau,
        );

    inputNgayKetThuc.value =
      dinhDangNgay(
        dotTuyen.ngay_ket_thuc,
      ) === "-"
        ? ""
        : dinhDangNgay(
          dotTuyen.ngay_ket_thuc,
        );

    let jd =
      layJDTheoDotTuyen(
        dotTuyen.id,
      );

    if (!jd) {
      try {
        const response =
          await fetch(
            `/api/jd?dot_tuyen_id=${dotTuyen.id}`,
            {
              headers: layHeaders(),
            },
          );

        if (response.ok) {
          const data =
            await response.json();

          if (Array.isArray(data)) {
            jd =
              data.find(
                function (item) {
                  return (
                    Number(
                      item.dot_tuyen_id,
                    ) ===
                    Number(
                      dotTuyen.id,
                    )
                  );
                },
              );
          }
        }
      } catch (error) {
        console.error(
          "Lỗi lấy JD:",
          error,
        );
      }
    }

    if (jd) {
      tieuDe.value =
        jd.tieu_de || "";

      jdMoTa.value =
        jd.mo_ta || "";

      jdYeuCau.value =
        jd.yeu_cau || "";

      jdQuyenLoi.value =
        jd.quyen_loi || "";

      let tieuChi =
        jd.tieu_chi;

      if (
        typeof tieuChi ===
        "string"
      ) {
        try {
          tieuChi =
            JSON.parse(tieuChi);
        } catch (error) {
          tieuChi = [];
        }
      }

      hienThiTieuChi(
        Array.isArray(tieuChi)
          ? tieuChi
          : [],
      );
    } else {
      hienThiTieuChi([]);
    }

    modal.style.display = "flex";
  }

  function dongModal() {
    if (dangGoiAI) {
      return;
    }

    modal.style.display = "none";
  }

  async function goiYBangAI() {
    if (
      dangGoiAI ||
      !coQuyenTaoJD()
    ) {
      return;
    }

    const tenDot =
      inputTen?.value?.trim() ||
      "";

    const moTaDot =
      inputMoTa?.value?.trim() ||
      "";

    if (!tenDot) {
      hienThongBao(
        "Vui lòng nhập tên đợt tuyển dụng trước khi dùng AI.",
      );

      inputTen?.focus();

      return;
    }

    datTrangThaiAI(true);

    hienThongBao(
      "AI đang xây dựng JD và bộ tiêu chí phù hợp...",
      "dang-xu-ly",
    );

    try {
      const response =
        await fetch(
          "/api/ai/generate-jd",
          {
            method: "POST",
            headers: layHeaders(),
            body: JSON.stringify({
              ten_dot: tenDot,
              mo_ta_dot: moTaDot,
              tieu_de:
                tieuDe?.value?.trim() ||
                "",
              mo_ta:
                jdMoTa?.value?.trim() ||
                "",
              yeu_cau:
                jdYeuCau?.value?.trim() ||
                "",
              quyen_loi:
                jdQuyenLoi?.value?.trim() ||
                "",
              ghi_chu:
                jdGhiChu?.value?.trim() ||
                "",
            }),
          },
        );

      if (
        await kiemTraPhien(response)
      ) {
        return;
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Không thể sử dụng AI",
        );
      }

      const result =
        data.data || {};

      if (tieuDe) {
        tieuDe.value =
          result.tieu_de || "";
      }

      if (jdMoTa) {
        jdMoTa.value =
          result.mo_ta || "";
      }

      if (jdYeuCau) {
        jdYeuCau.value =
          result.yeu_cau || "";
      }

      if (jdQuyenLoi) {
        jdQuyenLoi.value =
          result.quyen_loi || "";
      }

      hienThiTieuChi(
        Array.isArray(
          result.tieu_chi,
        )
          ? result.tieu_chi
          : [],
      );

      hienThongBao(
        "AI đã tạo gợi ý thành công. M hãy kiểm tra và chỉnh sửa nội dung trước khi lưu.",
        "thanh-cong",
      );
    } catch (error) {
      console.error(
        "Lỗi gọi Gemini:",
        error,
      );

      hienThongBao(
        error.message ||
        "Không thể sử dụng AI.",
      );
    } finally {
      datTrangThaiAI(false);
    }
  }

  async function luuTuyenDung(
    event,
  ) {
    event.preventDefault();

    if (!coQuyenQuanLy()) {
      return;
    }

    if (dangGoiAI) {
      return;
    }

    hienThongBao("");

    const id =
      inputId?.value?.trim() ||
      "";

    const tenDot =
      inputTen?.value?.trim() ||
      "";

    const moTaDot =
      inputMoTa?.value?.trim() ||
      "";

    const trangThai =
      inputTrangThai?.value ||
      "nhap";

    const ngayBatDau =
      doiNgaySangISO(
        inputNgayBatDau?.value ||
        "",
      );

    const ngayKetThuc =
      doiNgaySangISO(
        inputNgayKetThuc?.value ||
        "",
      );

    const jdTitle =
      tieuDe?.value?.trim() ||
      "";

    const jdDescription =
      jdMoTa?.value?.trim() ||
      "";

    const jdRequirement =
      jdYeuCau?.value?.trim() ||
      "";

    const jdBenefit =
      jdQuyenLoi?.value?.trim() ||
      "";

    const tieuChi =
      docTieuChi();

    if (!tenDot) {
      hienThongBao(
        "Vui lòng nhập tên đợt tuyển dụng.",
      );

      inputTen.focus();

      return;
    }

    if (!ngayBatDau) {
      hienThongBao(
        "Vui lòng nhập ngày bắt đầu theo dạng dd/mm/yyyy.",
      );

      inputNgayBatDau.focus();

      return;
    }

    if (!ngayKetThuc) {
      hienThongBao(
        "Vui lòng nhập ngày kết thúc theo dạng dd/mm/yyyy.",
      );

      inputNgayKetThuc.focus();

      return;
    }

    if (
      ngayKetThuc <
      ngayBatDau
    ) {
      hienThongBao(
        "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.",
      );

      return;
    }

    if (!jdTitle) {
      hienThongBao(
        "Vui lòng nhập tiêu đề JD hoặc bấm Gợi ý bằng AI.",
      );

      tieuDe.focus();

      return;
    }

    if (!tieuChi.length) {
      hienThongBao(
        "Vui lòng thêm ít nhất một tiêu chí đánh giá.",
      );

      return;
    }

    const tong =
      tieuChi.reduce(
        function (
          sum,
          item,
        ) {
          return (
            sum +
            Number(
              item.trong_so,
            )
          );
        },
        0,
      );

    if (tong > 100) {
      hienThongBao(
        `Tổng trọng số đang là ${tong}%. Không được vượt quá 100%.`,
      );

      return;
    }

    const tenTieuChiRong =
      tieuChi.some(
        function (item) {
          return !item.ten;
        },
      );

    if (tenTieuChiRong) {
      hienThongBao(
        "Mỗi tiêu chí phải có tên.",
      );

      return;
    }

    btnLuu.disabled = true;

    try {
      let dotTuyenId =
        id || "";

      const payloadDotTuyen = {
        ten_dot: tenDot,
        mo_ta: moTaDot,
        trang_thai: trangThai,
        ngay_bat_dau:
          ngayBatDau,
        ngay_ket_thuc:
          ngayKetThuc,
      };

      const responseDot =
        await fetch(
          id
            ? `/api/dot-tuyen/${id}`
            : "/api/dot-tuyen",
          {
            method: id
              ? "PUT"
              : "POST",
            headers:
              layHeaders(),
            body: JSON.stringify(
              payloadDotTuyen,
            ),
          },
        );

      if (
        await kiemTraPhien(
          responseDot,
        )
      ) {
        return;
      }

      const dataDot =
        await responseDot.json();

      if (!responseDot.ok) {
        throw new Error(
          dataDot.message ||
          "Không thể lưu đợt tuyển dụng",
        );
      }

      dotTuyenId =
        dotTuyenId ||
        dataDot.id;

      if (!dotTuyenId) {
        throw new Error(
          "Không lấy được ID đợt tuyển dụng sau khi lưu.",
        );
      }

      const jdCu =
        layJDTheoDotTuyen(
          dotTuyenId,
        );

      const payloadJD = {
        dot_tuyen_id:
          Number(dotTuyenId),
        tieu_de: jdTitle,
        mo_ta:
          jdDescription,
        yeu_cau:
          jdRequirement,
        quyen_loi:
          jdBenefit,
        tieu_chi:
          tieuChi,
      };

      const responseJD =
        await fetch(
          jdCu
            ? `/api/jd/${jdCu.id}`
            : "/api/jd",
          {
            method: jdCu
              ? "PUT"
              : "POST",
            headers:
              layHeaders(),
            body: JSON.stringify(
              payloadJD,
            ),
          },
        );

      if (
        await kiemTraPhien(
          responseJD,
        )
      ) {
        return;
      }

      const dataJD =
        await responseJD.json();

      if (!responseJD.ok) {
        throw new Error(
          dataJD.message ||
          "Đợt tuyển dụng đã lưu nhưng không thể lưu JD.",
        );
      }

      modal.style.display =
        "none";

      hienThongBao("");

      await taiDuLieu();

      setTimeout(
        function () {
          alert(
            id
              ? "Cập nhật đợt tuyển dụng và JD thành công."
              : "Tạo đợt tuyển dụng và JD thành công.",
          );
        },
        50,
      );
    } catch (error) {
      console.error(
        "Lỗi lưu tuyển dụng:",
        error,
      );

      hienThongBao(
        error.message ||
        "Có lỗi xảy ra khi lưu tuyển dụng.",
      );
    } finally {
      btnLuu.disabled = false;
    }
  }

  function moModalXacNhan(
    id,
    ten,
  ) {
    idDangXoa = id;

    noiDungXacNhan.textContent =
      `Bạn có chắc chắn muốn xóa đợt tuyển dụng "${ten}" không?`;

    modalXacNhan.style.display =
      "flex";
  }

  function dongModalXacNhan() {
    idDangXoa = null;

    modalXacNhan.style.display =
      "none";
  }

  async function xoaDotTuyen() {
    if (!idDangXoa) {
      return;
    }

    try {
      const response =
        await fetch(
          `/api/dot-tuyen/${idDangXoa}`,
          {
            method: "DELETE",
            headers:
              layHeaders(),
          },
        );

      if (
        await kiemTraPhien(response)
      ) {
        return;
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Không thể xóa đợt tuyển dụng",
        );
      }

      dongModalXacNhan();

      await taiDuLieu();

      alert(
        "Xóa đợt tuyển dụng thành công.",
      );
    } catch (error) {
      console.error(
        "Lỗi xóa:",
        error,
      );

      alert(
        error.message ||
        "Không thể xóa đợt tuyển dụng.",
      );
    }
  }

  function xemTuyenDung(
    dotTuyen,
  ) {
    const jd =
      layJDTheoDotTuyen(
        dotTuyen.id,
      );

    moModalSua(dotTuyen);

    if (!coQuyenQuanLy()) {
      setTimeout(
        function () {
          const inputs =
            form.querySelectorAll(
              "input, textarea, select, button",
            );

          inputs.forEach(
            function (input) {
              input.disabled =
                true;
            },
          );
        },
        100,
      );
    }

    if (jd) {
      console.log(
        "JD:",
        jd,
      );
    }
  }

  function khoiTaoDatePicker(
    inputText,
    inputDate,
    button,
  ) {
    if (
      !inputText ||
      !inputDate ||
      !button
    ) {
      return;
    }

    button.addEventListener(
      "click",
      function () {
        if (
          typeof inputDate.showPicker ===
          "function"
        ) {
          inputDate.showPicker();
        } else {
          inputDate.click();
        }
      },
    );

    inputDate.addEventListener(
      "change",
      function () {
        if (!inputDate.value) {
          return;
        }

        const parts =
          inputDate.value.split(
            "-",
          );

        if (parts.length !== 3) {
          return;
        }

        inputText.value =
          `${parts[2]}/${parts[1]}/${parts[0]}`;
      },
    );

    inputText.addEventListener(
      "input",
      function () {
        let value =
          inputText.value.replace(
            /\D/g,
            "",
          );

        if (value.length > 8) {
          value =
            value.slice(0, 8);
        }

        if (value.length >= 5) {
          value =
            `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
        } else if (
          value.length >= 3
        ) {
          value =
            `${value.slice(0, 2)}/${value.slice(2)}`;
        }

        inputText.value =
          value;
      },
    );
  }

  if (btnThem) {
    btnThem.addEventListener(
      "click",
      moModalThem,
    );
  }

  if (btnDong) {
    btnDong.addEventListener(
      "click",
      dongModal,
    );
  }

  if (btnHuy) {
    btnHuy.addEventListener(
      "click",
      dongModal,
    );
  }

  if (form) {
    form.addEventListener(
      "submit",
      luuTuyenDung,
    );
  }

  if (btnGoiYAI) {
    btnGoiYAI.addEventListener(
      "click",
      goiYBangAI,
    );
  }

  if (btnThemTieuChi) {
    btnThemTieuChi.addEventListener(
      "click",
      function () {
        if (dangGoiAI) {
          return;
        }

        danhSachTieuChi.appendChild(
          taoHangTieuChi({
            ten: "",
            mo_ta: "",
            trong_so: "",
          }),
        );

        capNhatTongTrongSo();

        const input =
          danhSachTieuChi.lastElementChild
            ?.querySelector(
              ".o-ten",
            );

        input?.focus();
      },
    );
  }

  if (inputTimKiem) {
    inputTimKiem.addEventListener(
      "input",
      locDanhSach,
    );
  }

  if (locTrangThai) {
    locTrangThai.addEventListener(
      "change",
      locDanhSach,
    );
  }

  if (tbody) {
    tbody.addEventListener(
      "click",
      async function (event) {
        const button =
          event.target.closest(
            "button[data-action]",
          );

        if (!button) {
          return;
        }

        const id =
          Number(
            button.dataset.id,
          );

        const dotTuyen =
          danhSachDotTuyen.find(
            function (item) {
              return (
                Number(item.id) ===
                id
              );
            },
          );

        if (!dotTuyen) {
          return;
        }

        const action =
          button.dataset.action;

        if (
          action === "sua"
        ) {
          await moModalSua(
            dotTuyen,
          );

          return;
        }

        if (
          action === "xem"
        ) {
          await moModalSua(
            dotTuyen,
          );

          return;
        }

        if (
          action === "xoa"
        ) {
          moModalXacNhan(
            dotTuyen.id,
            dotTuyen.ten_dot ||
            dotTuyen.ten ||
            "đợt tuyển dụng này",
          );
        }
      },
    );
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
    modal.addEventListener(
      "click",
      function (event) {
        if (
          event.target ===
          modal
        ) {
          dongModal();
        }
      },
    );
  }

  if (modalXacNhan) {
    modalXacNhan.addEventListener(
      "click",
      function (event) {
        if (
          event.target ===
          modalXacNhan
        ) {
          dongModalXacNhan();
        }
      },
    );
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

  if (
    menuNguoiDung &&
    nguoiDung?.vai_tro !==
    "admin"
  ) {
    menuNguoiDung.style.display =
      "none";
  }

  if (!coQuyenQuanLy()) {
    if (btnThem) {
      btnThem.style.display =
        "none";
    }
  }

  taiDuLieu();
})();