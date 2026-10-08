(function () {
    const token = localStorage.getItem("token");
    let nguoiDung;

    try {
        nguoiDung = JSON.parse(localStorage.getItem("nguoi_dung") || "null");
    } catch (error) {
        nguoiDung = null;
    }

    if (!token || !nguoiDung) {
        window.location.href = "/login/login.html";
        return;
    }

    const danhSachUngVien = document.getElementById("danhSachUngVien");
    const trangThaiUngVien = document.getElementById("trangThai");
    const dotTuyenId = document.getElementById("dotTuyenId");
    const locDotTuyen = document.getElementById("locDotTuyen");
    const locTrangThai = document.getElementById("locTrangThai");
    const oTimKiem = document.getElementById("oTimKiem");
    const modal = document.getElementById("modal");
    const modalCV = document.getElementById("modalCV");
    const modalChiTiet = document.getElementById("modalChiTiet");
    const modalXacNhan = document.getElementById("modalXacNhan");
    const thongBao = document.getElementById("thongBao");
    const tongSo = document.getElementById("tongSo");

    let tatCaUngVien = [];
    let ungVienDangUpload = null;
    let hanhDongXacNhan = null;

    const tenTrangThai = {
        moi: "Mới",
        da_phan_tich: "Đã phân tích",
        da_chon: "Đã chọn",
        da_lien_he: "Đã liên hệ",
        da_xep_lich: "Đã xếp lịch",
        da_phong_van: "Đã phỏng vấn",
        offer: "Offer",
        da_tuyen: "Đã tuyển",
        tu_choi: "Từ chối",
        talent_pool: "Talent pool"
    };

    const tenNguon = {
        website: "Website",
        email: "Email",
        gioi_thieu: "Giới thiệu",
        linkedin: "LinkedIn",
        khac: "Khác"
    };

    const coQuyenQuanLyUngVien = ["admin", "manager", "hr"].includes(
        nguoiDung.vai_tro
    );
    if (!["admin", "manager"].includes(nguoiDung.vai_tro)) {
        ["offer", "da_tuyen"].forEach((trangThai) => {
            const option = trangThaiUngVien.querySelector(`option[value="${trangThai}"]`);
            if (option) option.disabled = true;
        });
    }

    function dotTuyenKhoaTaoUngVien(trangThai) {
        return ["tam_dung", "ket_thuc", "da_dong", "dong", "closed"].includes(
            String(trangThai || "").toLowerCase()
        );
    }

    function headersJson() {
        return {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
        };
    }

    function headersAuth() {
        return { Authorization: "Bearer " + token };
    }

    function dangXuat() {
        localStorage.removeItem("token");
        localStorage.removeItem("nguoi_dung");
        window.location.href = "/login/login.html";
    }

    function escapeHTML(text) {
        return String(text ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function hienThongBao(noiDung, loai) {
        thongBao.replaceChildren();

        const alert = document.createElement("div");

        alert.className = "thong-bao hien " + loai;
        alert.textContent = noiDung;

        thongBao.appendChild(alert);

        window.setTimeout(function () {
            alert.remove();
        }, 4000);
    }

    async function layDotTuyen() {
        try {
            const response = await fetch("/api/dot-tuyen", {
                headers: headersAuth()
            });

            const data = await response.json();

            if (response.status === 401) {
                dangXuat();
                return;
            }

            if (!response.ok) {
                throw new Error(data.message || "Không lấy được đợt tuyển dụng");
            }

            const danhSachDotTuyen = Array.isArray(data)
                ? data
                : data.data || data.dot_tuyen || [];

            danhSachDotTuyen.sort(function (a, b) {
                const khoaA = dotTuyenKhoaTaoUngVien(a.trang_thai);
                const khoaB = dotTuyenKhoaTaoUngVien(b.trang_thai);

                if (khoaA === khoaB) return 0;
                return khoaA ? 1 : -1;
            });

            dotTuyenId.innerHTML =
                '<option value="">-- Chọn đợt tuyển dụng --</option>';
            locDotTuyen.innerHTML =
                '<option value="">Tất cả đợt tuyển dụng</option>';

            danhSachDotTuyen.forEach(function (dotTuyen) {
                const khoa = dotTuyenKhoaTaoUngVien(dotTuyen.trang_thai);

                let tenHienThi = dotTuyen.ten_dot || dotTuyen.ten || "";

                if (dotTuyen.trang_thai === "tam_dung") {
                    tenHienThi += " (Tạm dừng)";
                } else if (khoa) {
                    tenHienThi += " (Đã kết thúc)";
                }

                const optionForm = document.createElement("option");

                optionForm.value = dotTuyen.id;
                optionForm.textContent = tenHienThi;
                optionForm.dataset.khoaTaoUngVien = khoa;
                optionForm.disabled = khoa;

                if (khoa) {
                    optionForm.style.color = "#94a3b8";
                    optionForm.style.backgroundColor = "#f1f5f9";
                }

                dotTuyenId.appendChild(optionForm);

                const optionFilter = document.createElement("option");

                optionFilter.value = dotTuyen.id;
                optionFilter.textContent = tenHienThi;

                locDotTuyen.appendChild(optionFilter);
            });
        } catch (error) {
            hienThongBao(error.message, "loi");
        }
    }

    async function layUngVien() {
        try {
            const params = new URLSearchParams();

            if (locDotTuyen.value) {
                params.set("dot_tuyen_id", locDotTuyen.value);
            }

            const suffix = params.toString() ? "?" + params.toString() : "";

            const response = await fetch("/api/ung-vien" + suffix, {
                headers: headersAuth()
            });

            const data = await response.json();

            if (response.status === 401) {
                dangXuat();
                return;
            }

            if (!response.ok) {
                throw new Error(data.message || "Không lấy được ứng viên");
            }

            tatCaUngVien = data;

            locDanhSach();
        } catch (error) {
            console.error(error);

            hienThongBao(
                error.message || "Không lấy được danh sách ứng viên",
                "loi"
            );

            danhSachUngVien.innerHTML = `
        <tr>
          <td colspan="${coQuyenQuanLyUngVien ? 7 : 6}" class="table-empty">
            Không tải được dữ liệu
          </td>
        </tr>
      `;
        }
    }

    function locDanhSach() {
        const tuKhoa = oTimKiem.value.trim().toLocaleLowerCase("vi");
        const trangThai = locTrangThai.value;

        const ketQua = tatCaUngVien.filter(function (ungVien) {
            const noiDung = [
                ungVien.ho_ten,
                ungVien.email,
                ungVien.sdt,
                ungVien.ten_dot_tuyen
            ]
                .join(" ")
                .toLocaleLowerCase("vi");

            return (
                (!tuKhoa || noiDung.includes(tuKhoa)) &&
                (!trangThai || ungVien.trang_thai === trangThai)
            );
        });

        renderUngVien(ketQua);
    }

    function renderUngVien(danhSach) {
        tongSo.textContent = `${danhSach.length} ứng viên`;

        danhSachUngVien.replaceChildren();

        if (danhSach.length === 0) {
            danhSachUngVien.innerHTML = `
        <tr>
          <td colspan="${coQuyenQuanLyUngVien ? 7 : 6}" class="table-empty">
            Không tìm thấy ứng viên
          </td>
        </tr>
      `;

            return;
        }

        danhSach.forEach(function (ungVien, index) {
            const tr = document.createElement("tr");

            const ten = escapeHTML(ungVien.ho_ten);

            const nguon = tenNguon[ungVien.nguon] || ungVien.nguon || "";

            const chiTietLienHe = [];

            if (ungVien.email) {
                chiTietLienHe.push(`<span>${escapeHTML(ungVien.email)}</span>`);
            }

            if (ungVien.sdt) {
                chiTietLienHe.push(`<span>${escapeHTML(ungVien.sdt)}</span>`);
            }

            const lienHe = chiTietLienHe.length
                ? `<div class="candidate-contact">${chiTietLienHe.join("")}</div>`
                : "-";

            const cv = ungVien.cv_id
                ? `
          <button
            class="btn-cv"
            data-action="detail"
            data-id="${ungVien.id}"
          >
            ${escapeHTML(ungVien.ten_file || "Xem CV")}
          </button>
        `
                : `<span class="muted">Chưa có CV</span>`;

            const nutSua = coQuyenQuanLyUngVien
                ? `
          <button
            class="btn-sua"
            data-action="edit"
            data-id="${ungVien.id}"
          >
            Sửa
          </button>

          <button
            class="btn-upload"
            data-action="upload"
            data-id="${ungVien.id}"
            data-name="${escapeHTML(ungVien.ho_ten)}"
          >
            Upload CV
          </button>
        `
                : "";

            const nutXoa = ["admin", "manager"].includes(nguoiDung.vai_tro)
                ? `
          <button
            class="btn-xoa"
            data-action="delete"
            data-id="${ungVien.id}"
          >
            Xóa
          </button>
        `
                : "";

            tr.innerHTML = `
        <td class="candidate-id">${index + 1}</td>

        <td>
          <strong>${ten}</strong>
          <span class="candidate-source">${escapeHTML(nguon)}</span>
        </td>

        <td>${lienHe}</td>

        <td class="candidate-campaign">
          ${escapeHTML(ungVien.ten_dot_tuyen || "-")}
        </td>

        <td>${cv}</td>

        <td>
          <span class="badge ${escapeHTML(ungVien.trang_thai)}">
            ${tenTrangThai[ungVien.trang_thai] ||
                escapeHTML(ungVien.trang_thai)
                }
          </span>
        </td>

        ${coQuyenQuanLyUngVien
                    ? `
          <td class="action">
            ${nutSua}

            <button
              class="btn-xem"
              data-action="detail"
              data-id="${ungVien.id}"
            >
              Chi tiết
            </button>

            ${nutXoa}
          </td>
        `
                    : ""
                }
      `;

            danhSachUngVien.appendChild(tr);
        });
    }

    function moForm(ungVien) {
        document.getElementById("formUngVien").reset();

        const dotTuyenHienTai = ungVien ? String(ungVien.dot_tuyen_id) : "";

        Array.from(dotTuyenId.options).forEach(function (option) {
            option.disabled =
                option.dataset.khoaTaoUngVien === "true" &&
                option.value !== dotTuyenHienTai;
        });

        document.getElementById("ungVienId").value = ungVien ? ungVien.id : "";

        document.getElementById("tieuDeModal").textContent = ungVien
            ? "Sửa ứng viên"
            : "Thêm ứng viên";

        dotTuyenId.value = ungVien ? ungVien.dot_tuyen_id : "";

        document.getElementById("hoTen").value = ungVien?.ho_ten || "";
        document.getElementById("email").value = ungVien?.email || "";
        document.getElementById("sdt").value = ungVien?.sdt || "";
        document.getElementById("diaChi").value = ungVien?.dia_chi || "";
        document.getElementById("linkedin").value = ungVien?.linkedin || "";
        document.getElementById("github").value = ungVien?.github || "";
        document.getElementById("nguon").value = ungVien?.nguon || "";
        document.getElementById("trangThai").value = ungVien?.trang_thai || "moi";

        document.getElementById("nhomTrangThai").hidden = !ungVien;

        modal.classList.add("show");
    }

    function dongModal() {
        modal.classList.remove("show");
    }

    document.getElementById("btnThem").addEventListener("click", function () {
        moForm(null);
    });

    document.getElementById("btnThem").hidden = !coQuyenQuanLyUngVien;

    if (!coQuyenQuanLyUngVien) {
        document.getElementById("cotThaoTac")?.remove();
    }

    document.getElementById("btnDong").addEventListener("click", dongModal);

    document.getElementById("btnHuy").addEventListener("click", dongModal);

    document
        .getElementById("formUngVien")
        .addEventListener("submit", async function (event) {
            event.preventDefault();

            const id = document.getElementById("ungVienId").value;

            const duLieu = {
                dot_tuyen_id: Number(dotTuyenId.value),
                ho_ten: document.getElementById("hoTen").value.trim(),
                email: document.getElementById("email").value.trim(),
                sdt: document.getElementById("sdt").value.trim(),
                dia_chi: document.getElementById("diaChi").value.trim(),
                linkedin: document.getElementById("linkedin").value.trim(),
                github: document.getElementById("github").value.trim(),
                nguon: document.getElementById("nguon").value,
                trang_thai: document.getElementById("trangThai").value
            };

            try {
                const response = await fetch(
                    id ? "/api/ung-vien/" + id : "/api/ung-vien",
                    {
                        method: id ? "PUT" : "POST",
                        headers: headersJson(),
                        body: JSON.stringify(duLieu)
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Không lưu được ứng viên");
                }

                dongModal();

                hienThongBao(data.message, "thanh-cong");

                await layUngVien();
            } catch (error) {
                hienThongBao(
                    error.message || "Không kết nối được máy chủ",
                    "loi"
                );
            }
        });

    async function suaUngVien(id) {
        try {
            const response = await fetch("/api/ung-vien/" + id, {
                headers: headersAuth()
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Không lấy được ứng viên");
            }

            moForm(data.ung_vien);
        } catch (error) {
            hienThongBao(error.message, "loi");
        }
    }

    function moUploadCV(id, hoTen) {
        ungVienDangUpload = id;

        document.getElementById("formCV").reset();

        document.getElementById("nguonTaiCV").dispatchEvent(new Event("change"));

        document.getElementById("tenUngVienCV").textContent =
            "Ứng viên: " + hoTen;

        modalCV.classList.add("show");
    }

    function dongModalCV() {
        modalCV.classList.remove("show");

        ungVienDangUpload = null;
    }

    document.getElementById("btnDongCV").addEventListener("click", dongModalCV);

    document.getElementById("btnHuyCV").addEventListener("click", dongModalCV);

    document
        .getElementById("nguonTaiCV")
        .addEventListener("change", function () {
            const dungURL = this.value === "url";

            document.getElementById("khungFileCV").hidden = dungURL;
            document.getElementById("khungUrlCV").hidden = !dungURL;
            document.getElementById("fileCV").required = !dungURL;
            document.getElementById("urlCV").required = dungURL;
        });

    document
        .getElementById("formCV")
        .addEventListener("submit", async function (event) {
            event.preventDefault();

            if (!ungVienDangUpload) {
                return;
            }

            const dungURL = document.getElementById("nguonTaiCV").value === "url";

            let body;

            const headers = { Authorization: "Bearer " + token };

            let endpoint = `/api/ung-vien/${ungVienDangUpload}/cv`;

            if (dungURL) {
                const url = document.getElementById("urlCV").value.trim();

                if (!url) {
                    hienThongBao("Vui lòng nhập URL CV", "loi");
                    return;
                }

                endpoint += "-url";

                headers["Content-Type"] = "application/json";

                body = JSON.stringify({ url });
            } else {
                const file = document.getElementById("fileCV").files[0];

                if (!file) {
                    hienThongBao("Vui lòng chọn CV", "loi");
                    return;
                }

                const formData = new FormData();

                formData.append("cv", file);

                body = formData;
            }

            try {
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers,
                    body
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Không tải được CV lên");
                }

                dongModalCV();

                hienThongBao(data.message, "thanh-cong");

                await layUngVien();
            } catch (error) {
                hienThongBao(error.message || "Upload CV thất bại", "loi");
            }
        });

    function taoLienKet(value) {
        if (!value) {
            return "Chưa có";
        }

        try {
            const url = new URL(value);

            if (!["http:", "https:"].includes(url.protocol)) {
                return "Chưa có";
            }

            return `
        <a
          href="${escapeHTML(url.href)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${escapeHTML(value)}
        </a>
      `;
        } catch (error) {
            return escapeHTML(value);
        }
    }

    async function xemUngVien(id) {
        try {
            const response = await fetch("/api/ung-vien/" + id, {
                headers: headersAuth()
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Không lấy được thông tin ứng viên"
                );
            }

            const ungVien = data.ung_vien;

            document.getElementById("tieuDeChiTiet").textContent = ungVien.ho_ten;

            document.getElementById("metaChiTiet").textContent = [
                ungVien.ten_dot_tuyen,
                tenTrangThai[ungVien.trang_thai] || ungVien.trang_thai
            ]
                .filter(Boolean)
                .join(" · ");

            const thongTin = [
                ["Email", escapeHTML(ungVien.email || "Chưa có")],
                ["Điện thoại", escapeHTML(ungVien.sdt || "Chưa có")],
                ["Địa chỉ", escapeHTML(ungVien.dia_chi || "Chưa có")],
                [
                    "Nguồn",
                    escapeHTML(tenNguon[ungVien.nguon] || ungVien.nguon || "Chưa có")
                ],
                ["LinkedIn", taoLienKet(ungVien.linkedin)],
                ["GitHub", taoLienKet(ungVien.github)]
            ];

            const cvHTML = data.cv.length
                ? data.cv
                    .map(function (cv) {
                        const size = cv.kich_thuoc
                            ? `${(cv.kich_thuoc / 1024 / 1024).toFixed(2)} MB`
                            : "";

                        const nutXoa = ["admin", "manager", "hr"].includes(
                            nguoiDung.vai_tro
                        )
                            ? `
                  <button
                    type="button"
                    class="btn-xoa-cv"
                    data-delete-cv="${cv.id}"
                    data-candidate="${ungVien.id}"
                    data-name="${escapeHTML(cv.ten_file)}"
                  >
                    Xóa CV
                  </button>
                `
                            : "";

                        return `
                <div class="cv-item">
                  <div>
                    <strong>${escapeHTML(cv.ten_file)}</strong>

                    <span>
                      ${size}
                      ${cv.la_ban_chinh ? " · CV chính" : ""}
                    </span>
                  </div>

                  <div class="cv-actions">
                    <button
                      type="button"
                      class="btn-cv"
                      data-download="${cv.id}"
                      data-candidate="${ungVien.id}"
                    >
                      Tải xuống
                    </button>

                    ${nutXoa}
                  </div>
                </div>
              `;
                    })
                    .join("")
                : `<p class="muted">Chưa có CV được tải lên.</p>`;

            document.getElementById("noiDungChiTiet").innerHTML = `
        <dl class="candidate-details">
          ${thongTin
                    .map(function (item) {
                        return `
                <div>
                  <dt>${item[0]}</dt>
                  <dd>${item[1]}</dd>
                </div>
              `;
                    })
                    .join("")}
        </dl>

        <section class="candidate-cv-list">
          <h3>CV đã tải lên</h3>

          ${cvHTML}
        </section>
      `;

            modalChiTiet.classList.add("show");
        } catch (error) {
            hienThongBao(error.message, "loi");
        }
    }

    async function taiCV(ungVienId, cvId) {
        try {
            const response = await fetch(
                `/api/ung-vien/${ungVienId}/cv/${cvId}`,
                { headers: headersAuth() }
            );

            if (!response.ok) {
                const data = await response.json();

                throw new Error(data.message || "Không tải được CV");
            }

            const blob = await response.blob();

            const disposition = response.headers.get("Content-Disposition") || "";

            const tenFile =
                disposition.match(/filename="?([^";]+)"?/i)?.[1] || "cv";

            const href = URL.createObjectURL(blob);

            const link = document.createElement("a");

            link.href = href;
            link.download = tenFile;

            link.click();

            URL.revokeObjectURL(href);
        } catch (error) {
            hienThongBao(error.message, "loi");
        }
    }

    function moXacNhanXoaCV(ungVienId, cvId, tenFile) {
        document.getElementById("tieuDeXacNhan").textContent = "Xóa CV";

        document.getElementById("noiDungXacNhan").textContent =
            `Bạn có chắc muốn xóa CV "${tenFile}" không?`;

        hanhDongXacNhan = function () {
            return xoaCV(ungVienId, cvId);
        };

        modalXacNhan.classList.add("show");
    }

    async function xoaCV(ungVienId, cvId) {
        try {
            const response = await fetch(
                `/api/ung-vien/${ungVienId}/cv/${cvId}`,
                {
                    method: "DELETE",
                    headers: headersAuth()
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Không xóa được CV");
            }

            modalChiTiet.classList.remove("show");

            hienThongBao(data.message || "Xóa CV thành công", "thanh-cong");

            await layUngVien();
        } catch (error) {
            hienThongBao(error.message || "Không xóa được CV", "loi");
        }
    }

    function moXacNhanXoa(id) {
        document.getElementById("tieuDeXacNhan").textContent = "Xóa ứng viên";

        document.getElementById("noiDungXacNhan").textContent =
            "Hồ sơ và các CV đã tải lên của ứng viên này sẽ bị xóa. Tiếp tục?";

        hanhDongXacNhan = function () {
            return xoaUngVien(id);
        };

        modalXacNhan.classList.add("show");
    }

    async function xoaUngVien(id) {
        try {
            const response = await fetch("/api/ung-vien/" + id, {
                method: "DELETE",
                headers: headersAuth()
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Không xóa được ứng viên");
            }

            hienThongBao(data.message, "thanh-cong");

            await layUngVien();
        } catch (error) {
            hienThongBao(error.message, "loi");
        }
    }

    document
        .getElementById("btnXacNhan")
        .addEventListener("click", async function () {
            const action = hanhDongXacNhan;

            modalXacNhan.classList.remove("show");

            hanhDongXacNhan = null;

            if (action) {
                await action();
            }
        });

    document
        .getElementById("btnHuyXacNhan")
        .addEventListener("click", function () {
            modalXacNhan.classList.remove("show");

            hanhDongXacNhan = null;
        });

    document
        .getElementById("btnDongChiTiet")
        .addEventListener("click", function () {
            modalChiTiet.classList.remove("show");
        });

    danhSachUngVien.addEventListener("click", function (event) {
        const button = event.target.closest("button[data-action]");

        if (!button) {
            return;
        }

        const id = Number(button.dataset.id);

        if (button.dataset.action === "edit") {
            suaUngVien(id);
        } else if (button.dataset.action === "upload") {
            moUploadCV(id, button.dataset.name);
        } else if (button.dataset.action === "detail") {
            xemUngVien(id);
        } else if (button.dataset.action === "delete") {
            moXacNhanXoa(id);
        }
    });

    document
        .getElementById("noiDungChiTiet")
        .addEventListener("click", function (event) {
            const downloadButton = event.target.closest("button[data-download]");

            if (downloadButton) {
                taiCV(
                    downloadButton.dataset.candidate,
                    downloadButton.dataset.download
                );

                return;
            }

            const deleteButton = event.target.closest("button[data-delete-cv]");

            if (deleteButton) {
                moXacNhanXoaCV(
                    deleteButton.dataset.candidate,
                    deleteButton.dataset.deleteCv,
                    deleteButton.dataset.name || "CV"
                );
            }
        });

    locDotTuyen.addEventListener("change", layUngVien);

    locTrangThai.addEventListener("change", locDanhSach);

    oTimKiem.addEventListener("input", locDanhSach);

    const menuNguoiDung = document.getElementById("menuNguoiDung");

    if (menuNguoiDung && nguoiDung.vai_tro !== "admin") {
        menuNguoiDung.style.display = "none";
    }

    layDotTuyen();
    layUngVien();
})();