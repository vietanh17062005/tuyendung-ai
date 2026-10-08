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
    const sapXepUngVien = document.getElementById("sapXepUngVien");
    const locKyNang = document.getElementById("locKyNang");
    const locDiemAI = document.getElementById("locDiemAI");
    const locSoNamKinhNghiem = document.getElementById("locSoNamKinhNghiem");
    const phanTichNoiDung = document.getElementById("noiDungPhanTich");
    const previewCV = document.getElementById("khungPreviewCV");
    const khungChonJD = document.getElementById("khungChonJD");
    const chonJDReview = document.getElementById("chonJDReview");
    const metadataHoSo = document.getElementById("metaPhanTich");
    const nutPhanTichLai = document.getElementById("btnPhanTichLai");
    const nutTaiCVReview = document.getElementById("btnTaiCVReview");
    const nutThongBaoUngVien = document.getElementById("btnThongBaoUngVien");
    const danhSachThongBaoUngVien = document.getElementById("danhSachThongBaoUngVien");
    const keyHistory = `lich_su_chat_ai_${nguoiDung.id || nguoiDung.email}`;
    const keyNotifications = `ung_vien_da_biet_${nguoiDung.id || nguoiDung.email}`;

    let tatCaUngVien = [];
    let ungVienDangUpload = null;
    let hanhDongXacNhan = null;
    let ungVienDangXem = null;
    let hoSoDangXem = null;
    let cvDangXemId = null;
    let urlPreviewCV = null;
    let loaiHienThiUngVien = "danh_sach";
    let idsUngVienDaBiet = null;
    let lichSuChatUngVien = docLichSuChat();

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

    async function docPhanHoiJSON(response) {
        const body = await response.text();
        try {
            return JSON.parse(body);
        } catch (error) {
            if (/^\s*<!doctype html|^\s*<html/i.test(body)) {
                throw new Error(
                    "API CV trả về trang HTML thay vì dữ liệu. Hãy khởi động lại/triển khai phiên bản máy chủ mới nhất rồi tải lại trang.",
                );
            }
            throw new Error(`API CV trả dữ liệu không hợp lệ (HTTP ${response.status}).`);
        }
    }

    function dangXuat() {
        localStorage.removeItem(keyHistory);
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

            const data = await docPhanHoiJSON(response);

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

            const response = await fetch("/api/cv/review/candidates" + suffix, {
                headers: headersAuth()
            });

            const data = await docPhanHoiJSON(response);

            if (response.status === 401) {
                dangXuat();
                return;
            }

            if (!response.ok) {
                throw new Error(data.message || "Không lấy được ứng viên");
            }

            tatCaUngVien = data;

            capNhatThongBaoUngVien();
            locDanhSach();
            if (ungVienDangXem && !tatCaUngVien.some((candidate) => Number(candidate.id) === Number(ungVienDangXem))) {
                ungVienDangXem = null;
            }
            if (!ungVienDangXem && tatCaUngVien.length) {
                await moHoSoUngVien(Number(tatCaUngVien[0].id));
            }
        } catch (error) {
            console.error(error);

            hienThongBao(
                error.message || "Không lấy được danh sách ứng viên",
                "loi"
            );

            danhSachUngVien.innerHTML = '<div class="candidate-empty-state">Không tải được dữ liệu ứng viên.</div>';
        }
    }

    function locDanhSach() {
        const tuKhoa = oTimKiem.value.trim().toLocaleLowerCase("vi");
        const trangThai = locTrangThai.value;
        const skill = locKyNang.value.trim().toLocaleLowerCase("vi");
        const minimumScore = Number(locDiemAI.value) || 0;
        const minimumExperience = locSoNamKinhNghiem.value === ""
            ? null
            : Number(locSoNamKinhNghiem.value);

        const ketQua = tatCaUngVien.filter(function (ungVien) {
            const parsed = ungVien.phan_tich || {};
            const analyzedSkills = [
                ...(parsed.extraction?.ky_nang || []),
                ...(parsed.score?.ky_nang_khop || []),
            ].join(" ").toLocaleLowerCase("vi");
            const years = Number(parsed.extraction?.so_nam_kinh_nghiem);
            const noiDung = [
                ungVien.ho_ten,
                ungVien.email,
                ungVien.sdt,
                ungVien.so_dien_thoai,
                ungVien.ten_dot_tuyen
            ]
                .join(" ")
                .toLocaleLowerCase("vi");

            return (
                (!tuKhoa || noiDung.includes(tuKhoa)) &&
                (!trangThai || ungVien.trang_thai === trangThai) &&
                (!skill || analyzedSkills.includes(skill)) &&
                (!minimumScore || Number(ungVien.diem_ai || 0) >= minimumScore) &&
                (minimumExperience === null || (Number.isFinite(years) && years >= minimumExperience))
            );
        });
        const sortMode = sapXepUngVien.value;
        ketQua.sort(function (a, b) {
            if (sortMode === "diem") return Number(b.diem_ai || 0) - Number(a.diem_ai || 0);
            if (sortMode === "kinh_nghiem") {
                return Number(b.phan_tich?.extraction?.so_nam_kinh_nghiem || 0)
                    - Number(a.phan_tich?.extraction?.so_nam_kinh_nghiem || 0);
            }
            if (sortMode === "ten") return String(a.ho_ten || "").localeCompare(String(b.ho_ten || ""), "vi");
            return Number(b.id) - Number(a.id);
        });
        renderUngVien(ketQua);
    }

    function renderUngVien(danhSach) {
        tongSo.textContent = `${danhSach.length} hồ sơ CV`;

        danhSachUngVien.replaceChildren();
        renderKanbanUngVien(danhSach);
        if (loaiHienThiUngVien === "kanban") {
            return;
        }

        if (!danhSach.length) {
            danhSachUngVien.innerHTML = '<div class="candidate-empty-state">Không tìm thấy ứng viên phù hợp.</div>';
            return;
        }

        danhSach.forEach(function (ungVien, index) {
            const card = document.createElement("article");
            card.className = `candidate-review-card${String(ungVien.id) === String(ungVienDangXem) ? " selected" : ""}`;
            const score = ungVien.diem_ai == null || ungVien.diem_ai === ""
                ? NaN
                : Number(ungVien.diem_ai);
            const parsed = ungVien.phan_tich || {};
            const skills = (parsed.extraction?.ky_nang || []).slice(0, 3).join(" · ");
            const recommendations = {
                nen_phong_van: "Nên phỏng vấn",
                can_nhac: "Cân nhắc",
                chua_phu_hop: "Chưa phù hợp",
            };
            const recommendation = recommendations[parsed.score?.de_xuat] || "Chưa có gợi ý AI";
            const operations = coQuyenQuanLyUngVien
                ? `<div class="candidate-card-actions">
                    <button type="button" data-action="edit" data-id="${ungVien.id}">Sửa</button>
                    <button type="button" data-action="upload" data-id="${ungVien.id}" data-name="${escapeHTML(ungVien.ho_ten)}">Upload CV</button>
                    ${["admin", "manager"].includes(nguoiDung.vai_tro) ? `<button type="button" data-action="delete" data-id="${ungVien.id}">Xóa</button>` : ""}
                  </div>`
                : "";
            card.innerHTML = `
              <button class="candidate-card-select" type="button" data-select-candidate="${ungVien.id}">
                <span class="candidate-card-index">${String(index + 1).padStart(2, "0")}</span>
                <span class="candidate-card-main">
                  <strong>${escapeHTML(ungVien.ho_ten || "Ứng viên")}</strong>
                  <small>${escapeHTML(ungVien.ten_dot_tuyen || "-")}</small>
                  <small>${escapeHTML(skills || "Chưa trích xuất kỹ năng")}</small>
                  <span class="candidate-card-meta">
                    <span class="badge ${escapeHTML(ungVien.trang_thai || "moi")}">${escapeHTML(tenTrangThai[ungVien.trang_thai] || ungVien.trang_thai || "Mới")}</span>
                    <span>${escapeHTML(ungVien.ten_file || "Chưa có CV")}</span>
                  </span>
                  <small>AI: ${escapeHTML(recommendation)} · Phụ trách: ${escapeHTML(ungVien.nguoi_phu_trach || "Chưa phân công")}</small>
                </span>
                <span class="candidate-score-mini">${Number.isFinite(score) ? `${Math.round(score)}%` : "—"}</span>
              </button>
              ${operations}`;
            danhSachUngVien.appendChild(card);
        });
    }

    function renderKanbanUngVien(danhSach) {
        const board = document.getElementById("bangKanbanUngVien");
        const stageGroups = [
            { key: "moi", title: "Mới / đã phân tích", statuses: ["moi", "da_phan_tich"] },
            { key: "da_chon", title: "Đã chọn / liên hệ", statuses: ["da_chon", "da_lien_he"] },
            { key: "phong_van", title: "Phỏng vấn", statuses: ["da_xep_lich", "da_phong_van"] },
            { key: "ket_qua", title: "Kết quả", statuses: ["offer", "da_tuyen", "tu_choi", "talent_pool"] },
        ];
        board.replaceChildren();
        stageGroups.forEach((group) => {
            const items = danhSach.filter((candidate) => group.statuses.includes(candidate.trang_thai));
            const column = document.createElement("section");
            column.className = "candidate-kanban-column";
            column.innerHTML = `<h3>${escapeHTML(group.title)} <span>${items.length}</span></h3>`;
            items.forEach((candidate) => {
                const card = document.createElement("button");
                card.type = "button";
                card.className = "candidate-kanban-card";
                card.dataset.selectCandidate = candidate.id;
                const score = candidate.diem_ai == null || candidate.diem_ai === ""
                    ? NaN
                    : Number(candidate.diem_ai);
                card.innerHTML = `<strong>${escapeHTML(candidate.ho_ten || "Ứng viên")}</strong>
                    <span>${escapeHTML(candidate.ten_dot_tuyen || "")}</span>
                    <small>${Number.isFinite(score) ? `Điểm AI ${Math.round(score)}%` : "Chưa phân tích"}</small>`;
                column.appendChild(card);
            });
            board.appendChild(column);
        });
        const kanbanView = loaiHienThiUngVien === "kanban";
        board.hidden = !kanbanView;
        danhSachUngVien.hidden = kanbanView;
        document.querySelector(".candidate-review-list").hidden = kanbanView;
        document.querySelector(".candidate-review-preview").hidden = kanbanView;
        document.querySelector(".candidate-review-analysis").hidden = kanbanView;
    }

    function hienPhanTichChoUngVien(data) {
        const analysisRow = data.phan_tich;
        const analysisData = analysisRow?.du_lieu_phan_tich || {};
        const result = analysisData.score || {};
        const extraction = analysisData.extraction || {};
        const reviewMeta = data.ho_so_hr || {};
        const score = Number(analysisRow?.diem_phu_hop ?? analysisRow?.diem ?? result.tong);
        const overrideScore = reviewMeta.diem_ghi_de;
        const effectiveScore = overrideScore == null ? score : Number(overrideScore);
        const recommendation = reviewMeta.de_xuat_ghi_de || result.de_xuat || "can_nhac";
        const recommendationNames = {
            nen_phong_van: "Nên phỏng vấn",
            can_nhac: "Cân nhắc",
            chua_phu_hop: "Chưa phù hợp",
        };
        if (!analysisRow) {
            phanTichNoiDung.innerHTML = '<div class="candidate-empty-state">Chưa có kết quả AI. Chọn JD rồi nhấn “Phân tích CV”.</div>';
        } else {
            const metrics = [
                ["Kỹ năng", result.ky_nang],
                ["Kinh nghiệm", result.kinh_nghiem],
                ["Học vấn", result.hoc_van],
                ["Kỹ năng mềm", result.ky_nang_mem],
            ];
            const list = (items) => (Array.isArray(items) && items.length
                ? `<ul>${items.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>`
                : '<p class="candidate-no-data">Chưa có dữ liệu</p>');
            const evidence = Array.isArray(result.minh_chung) ? result.minh_chung : [];
            phanTichNoiDung.innerHTML = `
              <div class="candidate-score-summary">
                <div class="candidate-score-ring"><strong>${Number.isFinite(effectiveScore) ? Math.round(effectiveScore) : "—"}%</strong><span>${overrideScore == null ? "Điểm hiện tại" : "Điểm HR"}</span></div>
                <div><span class="candidate-recommendation">${escapeHTML(recommendationNames[recommendation] || recommendationNames.can_nhac)}</span>
                  <small>Điểm gốc AI: ${Number.isFinite(score) ? `${Math.round(score)}%` : "Chưa có"}</small>
                  ${overrideScore == null ? "" : `<small>Điểm AI: ${Math.round(score)}%</small>`}
                </div>
              </div>
              ${reviewMeta.diem_ghi_de == null ? "" : `<div class="candidate-override-note"><strong>Đánh giá của người phụ trách</strong><p>${escapeHTML(reviewMeta.ly_do_ghi_de || "")}</p><small>${escapeHTML(reviewMeta.ngay_ghi_de || "")}</small></div>`}
              <h3>Điểm thành phần</h3>
              <div class="candidate-score-metrics">${metrics.map(([name, value]) => {
                const amount = Number(value) || 0;
                return `<div><span>${name}</span><strong>${amount}%</strong><progress max="100" value="${amount}"></progress></div>`;
              }).join("")}</div>
              <h3>Tóm tắt</h3><p class="candidate-analysis-summary">${escapeHTML(result.tom_tat || analysisRow.tom_tat || "Chưa có tóm tắt.")}</p>
              <h3>Kỹ năng khớp</h3>${list(result.ky_nang_khop)}
              <h3>Kỹ năng còn thiếu</h3>${list(result.ky_nang_thieu)}
              <h3>Điểm mạnh</h3>${list(result.diem_manh)}
              <h3>Điểm cần xem xét</h3>${list(result.diem_yeu)}
              <h3>Cảnh báo</h3>${list(result.canh_bao)}
              <h3>Bằng chứng theo tiêu chí</h3>
              ${evidence.length ? `<div class="candidate-evidence-list">${evidence.map((item) => `<article><strong>${escapeHTML(item.tieu_chi)}</strong><span>${Number(item.diem) || 0}/100 · ${escapeHTML(item.ly_do)}</span><blockquote>${escapeHTML(item.trich_dan_cv || "Không có trích dẫn")}</blockquote></article>`).join("")}</div>` : '<p class="candidate-no-data">AI chưa cung cấp trích dẫn minh chứng.</p>'}
              <h3>Thông tin trích xuất</h3>
              <dl class="candidate-extracted-data">
                <div><dt>Email</dt><dd>${escapeHTML(extraction.email || data.ung_vien.email || "Chưa có")}</dd></div>
                <div><dt>Điện thoại</dt><dd>${escapeHTML(extraction.so_dien_thoai || data.ung_vien.so_dien_thoai || "Chưa có")}</dd></div>
                <div><dt>Kinh nghiệm</dt><dd>${extraction.so_nam_kinh_nghiem == null ? "Chưa rõ" : `${Number(extraction.so_nam_kinh_nghiem)} năm`}</dd></div>
                <div><dt>Kinh nghiệm làm việc</dt><dd>${list(extraction.kinh_nghiem)}</dd></div>
                <div><dt>Học vấn</dt><dd>${list(extraction.hoc_van)}</dd></div>
                <div><dt>Kỹ năng</dt><dd>${list(extraction.ky_nang)}</dd></div>
                <div><dt>Ngoại ngữ / chứng chỉ</dt><dd>${list([...(extraction.ngon_ngu || []), ...(extraction.chung_chi || [])])}</dd></div>
                <div><dt>Liên kết</dt><dd>${Array.isArray(extraction.lien_ket) && extraction.lien_ket.length ? extraction.lien_ket.map((link) => taoLienKet(link)).join("<br/>") : "Chưa có"}</dd></div>
              </dl>
              ${Array.isArray(analysisData.ung_vien_trung_tiem_nang) && analysisData.ung_vien_trung_tiem_nang.length ? `<h3>Hồ sơ có thể trùng</h3>${list(analysisData.ung_vien_trung_tiem_nang.map((item) => `${item.ho_ten} · ${item.ly_do} (${item.similarity}%)`))}` : ""}
              <p class="candidate-analysis-disclaimer">AI chỉ hỗ trợ tham khảo. Quyết định tuyển dụng thuộc về người phụ trách.</p>
            `;
        }

        const jobs = Array.isArray(data.jd) ? data.jd : [];
        khungChonJD.hidden = jobs.length < 2;
        chonJDReview.replaceChildren();
        jobs.forEach((job) => {
            const option = document.createElement("option");
            option.value = job.id;
            option.textContent = job.tieu_de || `JD #${job.id}`;
            chonJDReview.appendChild(option);
        });
        const analysisJobId = analysisRow?.jd_id;
        if (analysisJobId) chonJDReview.value = String(analysisJobId);

        const isHr = ["admin", "manager", "hr"].includes(nguoiDung.vai_tro);
        nutPhanTichLai.hidden = !isHr || !data.cv.length || !jobs.length;
        nutPhanTichLai.textContent = analysisRow ? "Phân tích lại" : "Phân tích CV";
        document.getElementById("formGhiChuReview").hidden = !isHr;
        document.getElementById("formGhiDeAI").hidden = !isHr || !analysisRow;
        document.getElementById("ghiChuNoiBo").value = reviewMeta.ghi_chu_noi_bo || "";
        document.getElementById("mucLuongMongMuon").value = reviewMeta.muc_luong_mong_muon || "";
        document.getElementById("diemGhiDe").value = overrideScore ?? score ?? "";
        document.getElementById("deXuatGhiDe").value = recommendation;
        document.getElementById("lyDoGhiDe").value = reviewMeta.ly_do_ghi_de || "";
        document.getElementById("btnXoaGhiDe").hidden = reviewMeta.diem_ghi_de == null;
        document.getElementById("metaGhiDe").textContent = reviewMeta.nguoi_ghi_de_id
            ? `Cập nhật bởi ${reviewMeta.nguoi_ghi_de || `tài khoản #${reviewMeta.nguoi_ghi_de_id}`} · ${reviewMeta.ngay_ghi_de || ""}`
            : "Đánh giá gốc AI không bị thay đổi.";
        metadataHoSo.textContent = analysisRow
            ? `Phân tích ${analysisRow.ngay_phan_tich || analysisRow.ngay_tao || ""} · AI chỉ hỗ trợ quyết định`
            : "Chưa phân tích · AI chỉ hỗ trợ quyết định";
        renderLichSuLienHe(reviewMeta.lich_su_lien_he);
    }

    async function moHoSoUngVien(id) {
        ungVienDangXem = id;
        locDanhSach();
        try {
            const response = await fetch(`/api/cv/review/${id}`, { headers: headersAuth() });
            const data = await docPhanHoiJSON(response);
            if (response.status === 401) return dangXuat();
            if (!response.ok) throw new Error(data.message || "Không tải được hồ sơ ứng viên.");
            hoSoDangXem = data;
            document.getElementById("tieuDePreview").textContent = data.ung_vien.ho_ten || "CV ứng viên";
            document.getElementById("metaPreview").textContent = [
                data.ung_vien.ten_dot_tuyen,
                tenTrangThai[data.ung_vien.trang_thai] || data.ung_vien.trang_thai,
                data.ung_vien.email,
                data.ung_vien.so_dien_thoai,
            ].filter(Boolean).join(" · ");
            document.getElementById("hanhDongLienHe").hidden = !["admin", "manager", "hr"].includes(nguoiDung.vai_tro);
            nutTaiCVReview.hidden = !data.cv.length;
            const fileSelect = document.getElementById("chonFileCVReview");
            const fileWrap = document.getElementById("khungChonFileCV");
            fileSelect.replaceChildren();
            data.cv.forEach((cv) => {
                const option = document.createElement("option");
                option.value = cv.id;
                option.textContent = `${cv.ten_file || `CV #${cv.id}`}${cv.la_ban_chinh ? " · Bản chính" : ""}`;
                fileSelect.appendChild(option);
            });
            fileWrap.hidden = data.cv.length < 2;
            const stillExists = data.cv.some((cv) => Number(cv.id) === Number(cvDangXemId));
            cvDangXemId = stillExists ? cvDangXemId : (data.cv[0]?.id ?? null);
            fileSelect.value = cvDangXemId == null ? "" : String(cvDangXemId);
            await hienThiPreviewCV();
            hienPhanTichChoUngVien(data);
        } catch (error) {
            hienThongBao(error.message, "loi");
        }
    }

    async function hienThiPreviewCV() {
        const cv = hoSoDangXem?.cv?.find((item) => Number(item.id) === Number(cvDangXemId));
        previewCV.replaceChildren();
        if (urlPreviewCV) URL.revokeObjectURL(urlPreviewCV);
        urlPreviewCV = null;
        if (!cv) {
            nutTaiCVReview.hidden = true;
            previewCV.innerHTML = '<div class="candidate-empty-state">Ứng viên chưa có CV.</div>';
            return;
        }
        nutTaiCVReview.hidden = false;
        nutTaiCVReview.textContent = `Tải ${cv.ten_file || "CV"}`;
        const loading = document.createElement("div");
        loading.className = "candidate-empty-state";
        loading.textContent = "Đang tải bản xem trước CV...";
        previewCV.appendChild(loading);
        const response = await fetch(`/api/cv/${cv.id}/tai-xuong`, { headers: headersAuth() });
        if (response.status === 401) {
            dangXuat();
            return;
        }
        if (!response.ok) {
            throw new Error("Không tải được file CV để xem trước.");
        }
        const blob = await response.blob();
        if (urlPreviewCV) URL.revokeObjectURL(urlPreviewCV);
        urlPreviewCV = URL.createObjectURL(blob);
        previewCV.replaceChildren();
        const extension = String(cv.ten_file || "").split(".").pop().toLowerCase();
        if (extension === "pdf") {
            const frame = document.createElement("iframe");
            frame.src = urlPreviewCV;
            frame.title = `CV ${hoSoDangXem.ung_vien.ho_ten}`;
            previewCV.appendChild(frame);
        } else if (["png", "jpg", "jpeg"].includes(extension)) {
            const image = document.createElement("img");
            image.src = urlPreviewCV;
            image.alt = `CV ${hoSoDangXem.ung_vien.ho_ten}`;
            previewCV.appendChild(image);
        } else {
            previewCV.innerHTML = `<div class="candidate-empty-state">${escapeHTML(cv.ten_file)}<br/>Định dạng này có thể tải xuống; phần trích xuất và phân tích vẫn hiển thị bên phải.</div>`;
        }
    }

    function renderLichSuLienHe(history) {
        const container = document.getElementById("lichSuLienHe");
        const items = Array.isArray(history) ? history : [];
        container.innerHTML = items.length
            ? `<h3>Lịch sử liên hệ</h3>${items.slice(0, 8).map((item) => `<article><strong>${escapeHTML(item.loai || "Liên hệ")}</strong><span>${escapeHTML(item.ngay_tao || "")}</span><p>${escapeHTML(item.noi_dung || "")}</p>${item.ket_qua ? `<small>${escapeHTML(item.ket_qua)}</small>` : ""}</article>`).join("")}`
            : "";
    }

    async function phanTichCVHienTai() {
        if (!ungVienDangXem || !hoSoDangXem) return;
        nutPhanTichLai.disabled = true;
        nutPhanTichLai.textContent = "Đang trích xuất & phân tích...";
        metadataHoSo.textContent = "Đang trích xuất nội dung CV và đối chiếu với JD...";
        try {
            const response = await fetch(`/api/cv/review/${ungVienDangXem}/analyze`, {
                method: "POST",
                headers: headersJson(),
                body: JSON.stringify({
                    jd_id: chonJDReview.value || hoSoDangXem.jd?.[0]?.id,
                    cv_id: cvDangXemId,
                }),
            });
            const result = await response.json();
            if (response.status === 401) return dangXuat();
            if (!response.ok) throw new Error(result.message || "Không phân tích được CV.");
            hienThongBao(result.message, "thanh-cong");
            await moHoSoUngVien(ungVienDangXem);
            await layUngVien();
        } catch (error) {
            metadataHoSo.textContent = "Phân tích thất bại";
            hienThongBao(error.message, "loi");
        } finally {
            nutPhanTichLai.disabled = false;
            if (hoSoDangXem) {
                nutPhanTichLai.textContent = hoSoDangXem.phan_tich ? "Phân tích lại" : "Phân tích CV";
            }
        }
    }

    function docLichSuChat() {
        try {
            const stored = JSON.parse(localStorage.getItem(keyHistory) || "[]");
            return Array.isArray(stored) ? stored.slice(-10) : [];
        } catch (error) {
            return [];
        }
    }

    function luuLichSuChat() {
        localStorage.setItem(keyHistory, JSON.stringify(lichSuChatUngVien.slice(-10)));
    }

    function hienTinNhanChat(text, role) {
        const paragraph = document.createElement("p");
        paragraph.className = `chatbot-tin-nhan-${role === "assistant" ? "ai" : "nguoi-dung"}`;
        paragraph.textContent = text;
        const container = document.getElementById("chatbotTinNhanUngVien");
        container.appendChild(paragraph);
        container.scrollTop = container.scrollHeight;
    }

    function khoiPhucChatUngVien() {
        const container = document.getElementById("chatbotTinNhanUngVien");
        container.replaceChildren();
        if (!lichSuChatUngVien.length) {
            hienTinNhanChat("Xin chào! Tôi có thể giúp bạn tra cứu ứng viên hoặc tư vấn tuyển dụng.", "assistant");
            return;
        }
        lichSuChatUngVien.forEach((message) => hienTinNhanChat(message.text, message.role));
    }

    function capNhatThongBaoUngVien() {
        let known;
        try {
            known = JSON.parse(localStorage.getItem(keyNotifications));
        } catch (error) {
            known = null;
        }
        const snapshot = Object.fromEntries(tatCaUngVien.map((candidate) => [
            Number(candidate.id),
            [candidate.trang_thai || "", candidate.diem_ai ?? "", candidate.ngay_cap_nhat || ""].join("|"),
        ]));
        if (!known || typeof known !== "object") {
            idsUngVienDaBiet = snapshot;
            localStorage.setItem(keyNotifications, JSON.stringify(idsUngVienDaBiet));
            return;
        }
        const knownIds = new Set(Array.isArray(known) ? known.map(Number) : Object.keys(known).map(Number));
        const fresh = tatCaUngVien.filter((candidate) => !knownIds.has(Number(candidate.id)));
        const changed = tatCaUngVien.filter((candidate) =>
            knownIds.has(Number(candidate.id))
            && !Array.isArray(known)
            && known[candidate.id] !== snapshot[candidate.id],
        );
        const badge = document.getElementById("soThongBaoUngVien");
        const count = fresh.length + changed.length;
        badge.hidden = count === 0;
        badge.textContent = count > 99 ? "99+" : String(count);
        idsUngVienDaBiet = snapshot;
        const list = danhSachThongBaoUngVien;
        const messages = [
            ...fresh.map((candidate) => ({ candidate, label: "Ứng viên mới" })),
            ...changed.map((candidate) => ({ candidate, label: "Hồ sơ vừa thay đổi" })),
        ];
        list.innerHTML = messages.length
            ? `<strong>Thông báo ứng viên</strong>${messages.slice(0, 10).map(({ candidate, label }) => `<button type="button" data-notification-candidate="${candidate.id}"><b>${escapeHTML(label)}: ${escapeHTML(candidate.ho_ten)}</b><span>${escapeHTML(candidate.ten_dot_tuyen || "")}</span></button>`).join("")}`
            : `<strong>Thông báo ứng viên</strong><p>Không có thay đổi mới kể từ lần xem trước.</p>`;
    }

    async function guiHoiAIUngVien(event) {
        event.preventDefault();
        const input = document.getElementById("noiDungHoiAIUngVien");
        const question = input.value.trim();
        const button = document.getElementById("btnGuiHoiAIUngVien");
        const errorBox = document.getElementById("loiHoiAIUngVien");
        if (!question) return;
        lichSuChatUngVien.push({ role: "user", text: question });
        lichSuChatUngVien = lichSuChatUngVien.slice(-10);
        luuLichSuChat();
        hienTinNhanChat(question, "user");
        input.value = "";
        errorBox.textContent = "";
        button.disabled = true;
        try {
            const response = await fetch("/api/ai/chat", {
                method: "POST",
                headers: headersJson(),
                body: JSON.stringify({ messages: lichSuChatUngVien }),
            });
            const text = await response.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch (error) {
                throw new Error(/^\s*<!doctype html|^\s*<html/i.test(text)
                    ? "Máy chủ chưa sẵn sàng API Hỏi AI. Hãy khởi động lại hoặc triển khai lại máy chủ."
                    : "Máy chủ trả về dữ liệu không hợp lệ khi hỏi AI.");
            }
            if (response.status === 401) return dangXuat();
            if (!response.ok) throw new Error(result.message || "Không thể gửi câu hỏi đến AI.");
            lichSuChatUngVien.push({ role: "assistant", text: result.reply });
            lichSuChatUngVien = lichSuChatUngVien.slice(-10);
            luuLichSuChat();
            hienTinNhanChat(result.reply, "assistant");
        } catch (error) {
            errorBox.textContent = error.message || "Không thể kết nối đến AI.";
        } finally {
            button.disabled = false;
            input.focus();
        }
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
                await moHoSoUngVien(ungVienDangUpload);
                if (hoSoDangXem?.jd?.length) {
                    await phanTichCVHienTai();
                }
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
        const selectButton = event.target.closest("[data-select-candidate]");
        if (selectButton) {
            moHoSoUngVien(Number(selectButton.dataset.selectCandidate));
            return;
        }
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
    sapXepUngVien.addEventListener("change", locDanhSach);
    locKyNang.addEventListener("input", locDanhSach);
    locDiemAI.addEventListener("change", locDanhSach);
    locSoNamKinhNghiem.addEventListener("input", locDanhSach);
    document.getElementById("btnXemDanhSach").addEventListener("click", function () {
        loaiHienThiUngVien = "danh_sach";
        this.classList.add("active");
        document.getElementById("btnXemKanban").classList.remove("active");
        locDanhSach();
    });
    document.getElementById("btnXemKanban").addEventListener("click", function () {
        loaiHienThiUngVien = "kanban";
        this.classList.add("active");
        document.getElementById("btnXemDanhSach").classList.remove("active");
        locDanhSach();
    });
    document.getElementById("bangKanbanUngVien").addEventListener("click", function (event) {
        const card = event.target.closest("[data-select-candidate]");
        if (card) moHoSoUngVien(Number(card.dataset.selectCandidate));
    });

    nutThongBaoUngVien.addEventListener("click", function (event) {
        event.stopPropagation();
        danhSachThongBaoUngVien.hidden = !danhSachThongBaoUngVien.hidden;
        if (!danhSachThongBaoUngVien.hidden) {
            localStorage.setItem(keyNotifications, JSON.stringify(idsUngVienDaBiet || {}));
            document.getElementById("soThongBaoUngVien").hidden = true;
        }
    });
    danhSachThongBaoUngVien.addEventListener("click", function (event) {
        const item = event.target.closest("[data-notification-candidate]");
        if (item) {
            danhSachThongBaoUngVien.hidden = true;
            moHoSoUngVien(Number(item.dataset.notificationCandidate));
        }
    });
    document.addEventListener("click", function (event) {
        if (!event.target.closest(".candidate-notification-wrap")) {
            danhSachThongBaoUngVien.hidden = true;
        }
    });

    document.getElementById("btnMoHoiAI").addEventListener("click", function () {
        document.getElementById("modalHoiAI").classList.add("show");
        khoiPhucChatUngVien();
        document.getElementById("noiDungHoiAIUngVien").focus();
    });
    document.getElementById("btnDongHoiAIUngVien").addEventListener("click", function () {
        document.getElementById("modalHoiAI").classList.remove("show");
    });
    document.getElementById("formHoiAIUngVien").addEventListener("submit", guiHoiAIUngVien);
    document.getElementById("btnPhanTichLai").addEventListener("click", phanTichCVHienTai);
    chonJDReview.addEventListener("change", function () {
        if (hoSoDangXem?.phan_tich) {
            metadataHoSo.textContent = "JD đã đổi. Chọn “Phân tích lại” để cập nhật kết quả.";
        }
    });
    nutTaiCVReview.addEventListener("click", function () {
        const cv = hoSoDangXem?.cv?.find((item) => Number(item.id) === Number(cvDangXemId));
        if (!cv) return;
        const link = document.createElement("a");
        link.href = urlPreviewCV || `/api/cv/${cv.id}/tai-xuong`;
        link.download = cv.ten_file || "CV";
        link.click();
    });
    document.getElementById("chonFileCVReview").addEventListener("change", async function () {
        cvDangXemId = this.value;
        try {
            await hienThiPreviewCV();
        } catch (error) {
            hienThongBao(error.message, "loi");
        }
    });

    document.getElementById("formGhiChuReview").addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!ungVienDangXem) return;
        try {
            const response = await fetch(`/api/cv/review/${ungVienDangXem}/notes`, {
                method: "PUT",
                headers: headersJson(),
                body: JSON.stringify({
                    ghi_chu_noi_bo: document.getElementById("ghiChuNoiBo").value,
                    muc_luong_mong_muon: document.getElementById("mucLuongMongMuon").value,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Không lưu được ghi chú.");
            hienThongBao(result.message, "thanh-cong");
            await moHoSoUngVien(ungVienDangXem);
        } catch (error) {
            hienThongBao(error.message, "loi");
        }
    });
    document.getElementById("formGhiDeAI").addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!ungVienDangXem) return;
        try {
            const response = await fetch(`/api/cv/review/${ungVienDangXem}/override`, {
                method: "PUT",
                headers: headersJson(),
                body: JSON.stringify({
                    diem: document.getElementById("diemGhiDe").value,
                    de_xuat: document.getElementById("deXuatGhiDe").value,
                    ly_do: document.getElementById("lyDoGhiDe").value,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Không lưu được đánh giá.");
            hienThongBao(result.message, "thanh-cong");
            await moHoSoUngVien(ungVienDangXem);
        } catch (error) {
            hienThongBao(error.message, "loi");
        }
    });
    document.getElementById("btnXoaGhiDe").addEventListener("click", async function () {
        if (!ungVienDangXem) return;
        try {
            const response = await fetch(`/api/cv/review/${ungVienDangXem}/override`, {
                method: "PUT",
                headers: headersJson(),
                body: JSON.stringify({ xoa_ghi_de: true }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Không thể bỏ đánh giá ghi đè.");
            hienThongBao(result.message, "thanh-cong");
            await moHoSoUngVien(ungVienDangXem);
        } catch (error) {
            hienThongBao(error.message, "loi");
        }
    });
    document.getElementById("hanhDongLienHe").addEventListener("click", async function (event) {
        const button = event.target.closest("[data-contact-kind]");
        if (!button || !ungVienDangXem) return;
        const text = window.prompt("Ghi nội dung trao đổi:");
        if (!text?.trim()) return;
        const resultText = window.prompt("Kết quả (quan tâm / không / hẹn lại...):", "") || "";
        try {
            const response = await fetch(`/api/cv/review/${ungVienDangXem}/contact`, {
                method: "POST",
                headers: headersJson(),
                body: JSON.stringify({
                    loai: button.dataset.contactKind,
                    noi_dung: text,
                    ket_qua: resultText,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Không lưu được lịch sử liên hệ.");
            hienThongBao(result.message, "thanh-cong");
            await moHoSoUngVien(ungVienDangXem);
        } catch (error) {
            hienThongBao(error.message, "loi");
        }
    });

    const menuNguoiDung = document.getElementById("menuNguoiDung");

    if (menuNguoiDung && nguoiDung.vai_tro !== "admin") {
        menuNguoiDung.style.display = "none";
    }

    layDotTuyen();
    layUngVien();
    window.setInterval(function () {
        if (!document.hidden) layUngVien();
    }, 60000);
})();