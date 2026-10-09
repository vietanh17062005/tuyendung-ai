document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "/login/login.html";
        return;
    }

    const oTimKiem = document.getElementById("oTimKiem");
    const locDotTuyen = document.getElementById("locDotTuyen");
    const locTrangThai = document.getElementById("locTrangThai");
    const danhSachCV = document.getElementById("danhSachCV");
    const tongSo = document.getElementById("tongSo");
    const thongBao = document.getElementById("thongBao");

    const tenFilePreview = document.getElementById("tenFilePreview");
    const metaCV = document.getElementById("metaCV");
    const tenUngVienPreview = document.getElementById("tenUngVienPreview");
    const emailUngVienPreview = document.getElementById("emailUngVienPreview");
    const dotTuyenPreview = document.getElementById("dotTuyenPreview");
    const cvViewer = document.getElementById("cvViewer");
    const btnTaiXuong = document.getElementById("btnTaiXuong");
    const btnThuNho = document.getElementById("btnThuNho");
    const btnPhongTo = document.getElementById("btnPhongTo");
    const btnDatLaiZoom = document.getElementById("btnDatLaiZoom");
    const mucZoom = document.getElementById("mucZoom");
    const btnThemCV = document.getElementById("btnThemCV");
    const modalThemCV = document.getElementById("modalThemCV");
    const btnDongThemCV = document.getElementById("btnDongThemCV");
    const btnHuyThemCV = document.getElementById("btnHuyThemCV");
    const formThemCV = document.getElementById("formThemCV");
    const chonUngVienUpload = document.getElementById("chonUngVienUpload");
    const fileCVUpload = document.getElementById("fileCVUpload");
    const btnLuuThemCV = document.getElementById("btnLuuThemCV");
    const thongBaoThemCV = document.getElementById("thongBaoThemCV");

    const btnHoiAI = document.getElementById("btnHoiAI");
    const modalHoiAI = document.getElementById("modalHoiAI");
    const btnDongHoiAI = document.getElementById("btnDongHoiAI");
    const btnHuyHoiAI = document.getElementById("btnHuyHoiAI");
    const btnGuiHoiAI = document.getElementById("btnGuiHoiAI");
    const cauHoiAI = document.getElementById("cauHoiAI");
    const ketQuaHoiAI = document.getElementById("ketQuaHoiAI");
    const noiDungContextAI = document.getElementById("noiDungContextAI");

    const btnThongBaoCV = document.getElementById("btnThongBaoCV");
    const modalThongBaoCV = document.getElementById("modalThongBaoCV");
    const btnDongThongBaoCV = document.getElementById("btnDongThongBaoCV");

    const modalXacNhanPhanTich = document.getElementById("modalXacNhanPhanTich");
    const btnDongXacNhanPhanTich = document.getElementById("btnDongXacNhanPhanTich");
    const btnHuyXacNhanPhanTich = document.getElementById("btnHuyXacNhanPhanTich");
    const btnLuuXacNhanPhanTich = document.getElementById("btnLuuXacNhanPhanTich");
    const noiDungXacNhanPhanTich = document.getElementById("noiDungXacNhanPhanTich");

    const modalUngVien = document.getElementById("modalUngVien");
    const btnDongUngVien = document.getElementById("btnDongUngVien");
    const btnHuyUngVien = document.getElementById("btnHuyUngVien");
    const formUngVien = document.getElementById("formUngVien");
    const tieuDeModalUngVien = document.getElementById("tieuDeModalUngVien");
    const ungVienEditId = document.getElementById("ungVienEditId");
    const ungVienHoTen = document.getElementById("ungVienHoTen");
    const ungVienEmail = document.getElementById("ungVienEmail");
    const ungVienSoDienThoai = document.getElementById("ungVienSoDienThoai");
    const ungVienDiaChi = document.getElementById("ungVienDiaChi");
    const ungVienLinkedin = document.getElementById("ungVienLinkedin");
    const ungVienGithub = document.getElementById("ungVienGithub");
    const ungVienTrangThai = document.getElementById("ungVienTrangThai");
    const ungVienNguon = document.getElementById("ungVienNguon");
    const thongBaoUngVien = document.getElementById("thongBaoUngVien");
    const btnLuuUngVien = document.getElementById("btnLuuUngVien");
    const fileCVThayThe = document.getElementById("fileCVThayThe");
    const khuVucThayCV = document.getElementById("khuVucThayCV");
    const btnPhanTich = document.getElementById("btnPhanTich");
    const phanTichAI = document.getElementById("phanTichAI");

    let danhSach = [];
    let danhSachDanhGia = [];
    let hoSoHienTai = null;
    let cvHienTai = null;
    let objectUrlHienTai = null;
    let dangPhanTich = false;
    let danhSachUngVien = [];
    let phanTichChoXacNhan = null;
    let mucZoomHienTai = 0.9;
    let ungVienDangMo = null;

    function escapeHtml(value) {
        if (value === null || value === undefined) return "";
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function dinhDangKichThuoc(bytes) {
        const size = Number(bytes || 0);
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
    }

    function dinhDangNgay(value, coGio = false) {
        if (!value) return "-";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            ...(coGio ? { hour: "2-digit", minute: "2-digit" } : {}),
        });
    }

    function hienThongBao(message, type = "error") {
        if (!thongBao) return;
        thongBao.textContent = message;
        thongBao.className = `cv-toast ${type === "success" ? "show success" : "show error"}`;
        setTimeout(function () {
            thongBao.className = "cv-toast";
            thongBao.textContent = "";
        }, 4000);
    }

    function xuLy401(response) {
        if (response.status !== 401) return false;
        localStorage.removeItem("token");
        localStorage.removeItem("nguoi_dung");
        window.location.href = "/login/login.html";
        return true;
    }

    function layTenUngVien(item) {
        return item?.ho_ten || item?.ten_ung_vien || item?.ung_vien?.ho_ten || "Ứng viên chưa xác định";
    }

    function layTenFile(item) {
        return item?.ten_file || item?.tenFile || "CV";
    }

    function layTrangThai(value) {
        const map = {
            moi: ["Mới", "moi"],
            da_phan_tich: ["Đã phân tích", "da-phan-tich"],
            da_lien_he: ["Đã liên hệ", "da-lien-he"],
            phong_van: ["Phỏng vấn", "phong-van"],
            da_tuyen: ["Đã tuyển", "da-tuyen"],
            tu_choi: ["Từ chối", "tu-choi"],
        };
        return map[value] || [String(value || "Mới").replace(/_/g, " "), "moi"];
    }

    function layDeXuat(value) {
        const map = {
            nen_phong_van: ["Nên phỏng vấn", "nen-phong-van"],
            can_nhac: ["Cân nhắc", "can-nhac"],
            chua_phu_hop: ["Chưa phù hợp", "chua-phu-hop"],
        };
        return map[value] || ["Cân nhắc", "can-nhac"];
    }

    function layPhanTich(item) {
        if (!item) return null;
        if (item.score || item.extraction) return item;
        const raw = item.phan_tich || item.du_lieu_phan_tich || item.du_lieu;
        if (!raw) return null;
        if (typeof raw === "object") return raw;
        try { return JSON.parse(raw); } catch (error) { return null; }
    }

    function layCVChinh(hoSo) {
        const list = Array.isArray(hoSo?.cv) ? hoSo.cv : [];
        return list[0] || null;
    }

    function layMauDiem(score) {
        const value = Number(score);
        if (!Number.isFinite(value)) return "empty";
        if (value >= 80) return "tot";
        if (value >= 60) return "can-nhac";
        return "thap";
    }

    function layJDChinh(hoSo) {
        const list = Array.isArray(hoSo?.jd) ? hoSo.jd : [];
        return list[0] || null;
    }

    function renderCampaignFilter() {
        if (!locDotTuyen) return;

        const current = locDotTuyen.value;
        const campaigns = [...new Map(
            danhSach
                .filter((item) => item.dot_tuyen_id && item.ten_dot_tuyen)
                .map((item) => [String(item.dot_tuyen_id), item.ten_dot_tuyen])
        ).entries()].sort((a, b) => a[1].localeCompare(b[1], "vi"));

        locDotTuyen.innerHTML = `<option value="">Tất cả đợt tuyển dụng</option>`;
        campaigns.forEach(function ([id, name]) {
            const option = document.createElement("option");
            option.value = id;
            option.textContent = name;
            locDotTuyen.appendChild(option);
        });

        if (campaigns.some(([id]) => id === current)) {
            locDotTuyen.value = current;
        }
    }

    function locDanhSach() {
        const tuKhoa = (oTimKiem?.value || "").trim().toLowerCase();
        const dotTuyenId = locDotTuyen?.value || "";
        const trangThai = locTrangThai?.value || "";

        return danhSach.filter(function (item) {
            const ten = layTenUngVien(item).toLowerCase();
            const file = layTenFile(item).toLowerCase();
            const campaign = String(item.ten_dot_tuyen || "").toLowerCase();

            const matchTuKhoa =
                !tuKhoa ||
                ten.includes(tuKhoa) ||
                file.includes(tuKhoa) ||
                campaign.includes(tuKhoa);

            const matchDotTuyen =
                !dotTuyenId ||
                String(item.dot_tuyen_id) === String(dotTuyenId);

            const matchTrangThai =
                !trangThai ||
                String(item.trang_thai || "") === trangThai;

            return matchTuKhoa && matchDotTuyen && matchTrangThai;
        });
    }

    function renderDanhSach() {
        const list = locDanhSach();
        if (tongSo) tongSo.textContent = `${list.length} CV`;
        if (!list.length) {
            danhSachCV.innerHTML = `<div class="cv-list-empty"><div class="cv-list-empty-icon">▣</div><strong>Không có CV phù hợp</strong><span>Thử thay đổi từ khóa hoặc bộ lọc.</span></div>`;
            return;
        }
        danhSachCV.innerHTML = list.map(function (item) {
            const id = item.id;
            const score = Number(item.diem_ai);
            const hasScore = Number.isFinite(score);
            const [statusText, statusClass] = layTrangThai(item.trang_thai);
            const selected = Number(cvHienTai?.id) === Number(id);
            const scoreClass = layMauDiem(score);
            return `<div class="cv-list-item-wrap">
                <button type="button" class="cv-list-item ${selected ? "active" : ""}" data-id="${escapeHtml(id)}">
                    <div class="cv-list-icon">CV</div>
                    <div class="cv-list-main">
                        <div class="cv-list-name">${escapeHtml(layTenUngVien(item))}</div>
                        <div class="cv-list-file">${escapeHtml(layTenFile(item))}</div>
                        <div class="cv-list-campaign">${escapeHtml(item.ten_dot_tuyen || "Chưa có đợt tuyển dụng")}</div>
                    </div>
                    <div class="cv-list-side">
                        ${hasScore ? `<strong class="cv-list-score ${scoreClass}">${score}%</strong>` : `<span class="cv-list-score empty">—</span>`}
                        <span class="cv-status ${statusClass}">${escapeHtml(statusText)}</span>
                    </div>
                </button>
                <button type="button" class="cv-candidate-more" data-action="more" data-candidate-id="${escapeHtml(item.ung_vien_id)}" title="Thao tác">⋯</button>
                <div class="cv-candidate-menu" data-menu-id="${escapeHtml(item.ung_vien_id)}">
                    <button type="button" data-action="view-candidate" data-candidate-id="${escapeHtml(item.ung_vien_id)}">Xem thông tin</button>
                    <button type="button" data-action="edit-candidate" data-candidate-id="${escapeHtml(item.ung_vien_id)}">Sửa</button>
                    <button type="button" class="danger" data-action="delete-candidate" data-candidate-id="${escapeHtml(item.ung_vien_id)}">Xóa ứng viên</button>
                </div>
            </div>`;
        }).join("");
    }

    async function taiDanhSach() {
        danhSachCV.innerHTML = `<div class="cv-list-loading">Đang tải danh sách CV...</div>`;

        try {
            const headers = { Authorization: `Bearer ${token}` };

            const [cvResponse, reviewResponse] = await Promise.all([
                fetch("/api/cv", { headers }),
                fetch("/api/cv/review/candidates", { headers }),
            ]);

            if (xuLy401(cvResponse) || xuLy401(reviewResponse)) return;

            const cvData = await cvResponse.json();
            const reviewData = await reviewResponse.json();

            if (!cvResponse.ok) {
                throw new Error(cvData.message || "Không tải được danh sách CV.");
            }

            if (!reviewResponse.ok) {
                throw new Error(reviewData.message || "Không tải được dữ liệu phân tích CV.");
            }

            const cvRows = Array.isArray(cvData)
                ? cvData
                : cvData.data || cvData.cv || cvData.danhSach || [];

            danhSachDanhGia = Array.isArray(reviewData)
                ? reviewData
                : reviewData.data || reviewData.danhSach || [];

            const scoreByCandidate = new Map(
                danhSachDanhGia.map((item) => [String(item.id), item])
            );

            const cvMoiNhatTheoUngVien = new Map();
            cvRows.forEach(function (cv) {
                const idUngVien = cv.ung_vien_id || cv.ungVienId || cv.ung_vien?.id;
                const cu = cvMoiNhatTheoUngVien.get(String(idUngVien));
                if (!cu || new Date(cv.ngay_tai_len || 0) >= new Date(cu.ngay_tai_len || 0)) cvMoiNhatTheoUngVien.set(String(idUngVien), cv);
            });
            danhSach = [...cvMoiNhatTheoUngVien.values()].map(function (cv) {
                const ungVienId = cv.ung_vien_id || cv.ungVienId || cv.ung_vien?.id;
                const review = scoreByCandidate.get(String(ungVienId)) || {};
                const analysis = review.phan_tich && typeof review.phan_tich === "object"
                    ? review.phan_tich
                    : null;
                const analysisCvId = analysis?.cv_id || null;
                const analysisBelongsToCv =
                    analysisCvId === null ||
                    String(analysisCvId) === String(cv.id);

                return {
                    ...cv,
                    ung_vien_id: ungVienId,
                    ho_ten: cv.ho_ten || review.ho_ten,
                    email: cv.email || review.email,
                    dot_tuyen_id: cv.dot_tuyen_id || review.dot_tuyen_id,
                    ten_dot_tuyen: cv.ten_dot_tuyen || review.ten_dot_tuyen,
                    trang_thai: cv.trang_thai || review.trang_thai || "moi",
                    diem_ai: analysisBelongsToCv ? review.diem_ai : null,
                    phan_tich: analysisBelongsToCv ? review.phan_tich : null,
                    ung_vien: review,
                };
            });

            renderCampaignFilter();
            renderDanhSach();

            if (!danhSach.length) {
                hienThiTrangThaiRong();
                return;
            }

            const selectedCvId = cvHienTai?.id;
            const selectedItem = danhSach.find((row) => Number(row.id) === Number(selectedCvId))
                || danhSach[0];

            await moHoSo(
                selectedItem.ung_vien_id,
                selectedItem.id,
            );
        } catch (error) {
            console.error("Lỗi tải kho CV:", error);
            danhSachCV.innerHTML = `
                <div class="cv-list-empty">
                    <div class="cv-list-empty-icon">!</div>
                    <strong>Không tải được danh sách CV</strong>
                    <span>${escapeHtml(error.message)}</span>
                </div>
            `;
        }
    }

    function hienThiTrangThaiRong() {
        hoSoHienTai = null;
        cvHienTai = null;
        tenFilePreview.textContent = "Chưa có CV";
        metaCV.textContent = "CV sẽ xuất hiện tại đây sau khi được thêm từ đợt tuyển dụng.";
        tenUngVienPreview.textContent = "-";
        emailUngVienPreview.textContent = "-";
        dotTuyenPreview.textContent = "-";
        btnPhanTich.disabled = true;
        phanTichAI.innerHTML = `
            <div class="cv-analysis-empty">
                <div class="cv-analysis-empty-icon">✦</div>
                <h3>Chưa có hồ sơ để phân tích</h3>
                <p>Hãy thêm CV từ trang Đợt tuyển dụng.</p>
            </div>
        `;
        cvViewer.innerHTML = `
            <div class="cv-viewer-empty">
                <div class="cv-viewer-icon">▣</div>
                <h3>Kho CV đang trống</h3>
                <p>CV được thêm trực tiếp từ từng đợt tuyển dụng.</p>
            </div>
        `;
    }

    async function moHoSo(ungVienId, cvId = null) {
        try {
            cvViewer.innerHTML = `<div class="cv-viewer-loading">Đang tải CV...</div>`;
            phanTichAI.innerHTML = `<div class="cv-analysis-loading">Đang tải dữ liệu đánh giá...</div>`;

            const response = await fetch(`/api/cv/review/${ungVienId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (xuLy401(response)) return;

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Không tải được hồ sơ CV.");
            }

            hoSoHienTai = data;

            const cvs = Array.isArray(data.cv) ? data.cv : [];
            cvHienTai = cvs.find((cv) => Number(cv.id) === Number(cvId))
                || layCVChinh(data);

            renderDanhSach();
            renderHoSo();
            await taiPreviewCV();
            renderPhanTich();
        } catch (error) {
            console.error("Lỗi tải hồ sơ CV:", error);
            hienThongBao(error.message || "Không tải được hồ sơ CV.");
        }
    }

    function renderHoSo() {
        const ungVien = hoSoHienTai?.ung_vien || {};
        const cvs = Array.isArray(hoSoHienTai?.cv) ? hoSoHienTai.cv : [];
        const selected = cvHienTai || layCVChinh(hoSoHienTai);

        tenFilePreview.textContent = layTenFile(selected);
        metaCV.textContent = selected
            ? `${selected.loai_file || "Tệp CV"} • ${dinhDangKichThuoc(selected.kich_thuoc)} • Tải lên ${dinhDangNgay(selected.ngay_tai_len, true)}`
            : "Chưa có file CV";

        tenUngVienPreview.textContent = layTenUngVien(ungVien);
        emailUngVienPreview.textContent = ungVien.email || "Chưa có email";
        dotTuyenPreview.textContent = ungVien.ten_dot_tuyen || "Chưa có đợt tuyển dụng";

        btnPhanTich.disabled = !selected || !hoSoHienTai?.jd?.length || dangPhanTich;
    }

    async function taiPreviewCV() {
        if (objectUrlHienTai) {
            URL.revokeObjectURL(objectUrlHienTai);
            objectUrlHienTai = null;
        }

        if (!cvHienTai?.id) {
            cvViewer.innerHTML = `
                <div class="cv-viewer-empty">
                    <div class="cv-viewer-icon">▣</div>
                    <h3>Không có file CV</h3>
                    <p>Hồ sơ này chưa có tệp CV.</p>
                </div>
            `;
            return;
        }

        try {
            const response = await fetch(`/api/cv/${cvHienTai.id}/tai-xuong`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (xuLy401(response)) return;

            if (!response.ok) {
                throw new Error("Không thể mở file CV.");
            }

            const blob = await response.blob();
            objectUrlHienTai = URL.createObjectURL(blob);
            const mime = cvHienTai.loai_file || blob.type || "";
            const tenFile = layTenFile(cvHienTai).toLowerCase();

            if (mime === "application/pdf" || tenFile.endsWith(".pdf")) {
                cvViewer.innerHTML = `<div class="cv-viewer-stage"><iframe class="cv-pdf-viewer" src="${objectUrlHienTai}" title="Xem CV"></iframe></div>`;
                datLaiZoom();
                setTimeout(capNhatZoom, 120);
                return;
            }

            if (mime.startsWith("image/") || /\.(jpg|jpeg|png)$/i.test(tenFile)) {
                cvViewer.innerHTML = `<div class="cv-viewer-stage"><div class="cv-image-viewer"><img src="${objectUrlHienTai}" alt="CV ứng viên" /></div></div>`;
                datLaiZoom();
                setTimeout(capNhatZoom, 80);
                return;
            }

            cvViewer.innerHTML = `
                <div class="cv-file-preview-fallback">
                    <div class="cv-file-preview-icon">DOC</div>
                    <h3>${escapeHtml(layTenFile(cvHienTai))}</h3>
                    <p>Định dạng này chưa hỗ trợ xem trực tiếp trên trình duyệt.</p>
                    <button type="button" class="cv-tool-btn primary" id="btnTaiXuongFallback">Tải xuống CV</button>
                </div>
            `;

            document.getElementById("btnTaiXuongFallback")?.addEventListener("click", taiXuongCV);
        } catch (error) {
            console.error("Lỗi xem CV:", error);
            cvViewer.innerHTML = `
                <div class="cv-file-preview-fallback">
                    <div class="cv-file-preview-icon">CV</div>
                    <h3>Không thể xem trực tiếp</h3>
                    <p>${escapeHtml(error.message)}</p>
                    <button type="button" class="cv-tool-btn primary" id="btnTaiXuongFallback">Tải xuống CV</button>
                </div>
            `;
            document.getElementById("btnTaiXuongFallback")?.addEventListener("click", taiXuongCV);
        }
    }


    function moModal(modal) {
        modal?.classList.add("show");
    }

    function dongModal(modal) {
        modal?.classList.remove("show");
    }

    function capNhatZoom() {
        const target = cvViewer?.querySelector(".cv-pdf-viewer, .cv-image-viewer img");
        const stage = cvViewer?.querySelector(".cv-viewer-stage");
        if (target) {
            target.style.transform = `scale(${mucZoomHienTai})`;
            target.style.transformOrigin = "top center";
        }
        if (stage && target) {
            const width = target.offsetWidth || stage.clientWidth;
            const height = target.offsetHeight || stage.clientHeight;
            stage.style.minWidth = `${Math.max(width * mucZoomHienTai + 30, cvViewer.clientWidth)}px`;
            stage.style.minHeight = `${Math.max(height * mucZoomHienTai + 30, cvViewer.clientHeight)}px`;
        }
        if (mucZoom) mucZoom.textContent = `${Math.round(mucZoomHienTai * 100)}%`;
    }

    function datLaiZoom() {
        mucZoomHienTai = 0.9;
        requestAnimationFrame(capNhatZoom);
    }

    function thayDoiZoom(delta) {
        mucZoomHienTai = Math.max(0.5, Math.min(1.5, Math.round((mucZoomHienTai + delta) * 10) / 10));
        capNhatZoom();
    }

    function layUngVienTuDanhSach(id) {
        const row = danhSach.find((item) => Number(item.ung_vien_id) === Number(id));
        return row?.ung_vien || row || danhSachUngVien.find((item) => Number(item.id) === Number(id)) || null;
    }

    function moModalUngVien(id, cheDoSua) {
        const item = layUngVienTuDanhSach(id);
        if (!item) { hienThongBao("Không tìm thấy thông tin ứng viên."); return; }
        ungVienDangMo = item;
        const view = !cheDoSua;
        tieuDeModalUngVien.textContent = view ? "Thông tin ứng viên" : "Sửa ứng viên";
        ungVienEditId.value = item.id || id;
        ungVienHoTen.value = item.ho_ten || "";
        ungVienEmail.value = item.email || "";
        ungVienSoDienThoai.value = item.so_dien_thoai || "";
        ungVienDiaChi.value = item.dia_chi || "";
        ungVienLinkedin.value = item.linkedin || "";
        ungVienGithub.value = item.github || "";
        ungVienTrangThai.value = item.trang_thai || "moi";
        ungVienNguon.value = item.nguon || "";
        [ungVienHoTen, ungVienEmail, ungVienSoDienThoai, ungVienDiaChi, ungVienLinkedin, ungVienGithub, ungVienTrangThai, ungVienNguon].forEach((el) => el.disabled = view);
        if (fileCVThayThe) fileCVThayThe.disabled = view;
        if (khuVucThayCV) khuVucThayCV.style.display = view ? "none" : "block";
        if (fileCVThayThe) fileCVThayThe.value = "";
        btnLuuUngVien.style.display = view ? "none" : "inline-flex";
        thongBaoUngVien.textContent = "";
        thongBaoUngVien.className = "cv-form-message";
        moModal(modalUngVien);
    }

    async function luuUngVien(event) {
        event.preventDefault();
        const id = Number(ungVienEditId.value);
        if (!id) return;
        const body = { ho_ten: ungVienHoTen.value.trim(), email: ungVienEmail.value.trim(), so_dien_thoai: ungVienSoDienThoai.value.trim(), dia_chi: ungVienDiaChi.value.trim(), linkedin: ungVienLinkedin.value.trim(), github: ungVienGithub.value.trim(), trang_thai: ungVienTrangThai.value, nguon: ungVienNguon.value.trim() };
        if (!body.ho_ten) { thongBaoUngVien.textContent = "Họ và tên là bắt buộc."; thongBaoUngVien.className = "cv-form-message error"; return; }
        const fileMoi = fileCVThayThe?.files?.[0];
        if (fileMoi && fileMoi.size > 10 * 1024 * 1024) {
            thongBaoUngVien.textContent = "File CV không được vượt quá 10 MB.";
            thongBaoUngVien.className = "cv-form-message error";
            return;
        }
        try {
            btnLuuUngVien.disabled = true;
            btnLuuUngVien.textContent = fileMoi ? "Đang lưu và thay CV..." : "Đang lưu...";
            const response = await fetch(`/api/ung-vien/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Không thể cập nhật ứng viên.");
            if (fileMoi) {
                const formData = new FormData();
                formData.append("ung_vien_id", String(id));
                formData.append("la_ban_chinh", "1");
                formData.append("file", fileMoi);
                const uploadResponse = await fetch("/api/cv/upload", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                });
                const uploadData = await uploadResponse.json();
                if (!uploadResponse.ok) throw new Error(uploadData.message || "Đã lưu thông tin ứng viên nhưng không thể thay thế CV.");
            }
            dongModal(modalUngVien);
            hienThongBao(fileMoi ? "Đã cập nhật ứng viên và thay thế CV thành công." : "Cập nhật ứng viên thành công.", "success");
            await taiDanhSach();
        } catch (error) {
            thongBaoUngVien.textContent = error.message || "Không thể cập nhật ứng viên.";
            thongBaoUngVien.className = "cv-form-message error";
        } finally {
            btnLuuUngVien.disabled = false;
            btnLuuUngVien.textContent = "Lưu thay đổi";
        }
    }

    async function xoaUngVien(id) {
        const item = layUngVienTuDanhSach(id);
        const ten = item?.ho_ten || `Ứng viên #${id}`;
        if (!window.confirm(`Bạn có chắc muốn xóa ứng viên "${ten}" không?`)) return;
        try {
            const response = await fetch(`/api/ung-vien/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Không thể xóa ứng viên.");
            hienThongBao("Xóa ứng viên thành công.", "success");
            hoSoHienTai = null;
            cvHienTai = null;
            await taiDanhSach();
        } catch (error) { hienThongBao(error.message || "Không thể xóa ứng viên."); }
    }

    async function taiDanhSachUngVienUpload() {
        try {
            const response = await fetch("/api/ung-vien", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (xuLy401(response)) return;
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Không tải được danh sách ứng viên.");
            danhSachUngVien = Array.isArray(data)
                ? data
                : data.data || data.ung_vien || data.danhSach || [];
            if (!chonUngVienUpload) return;
            chonUngVienUpload.innerHTML = '<option value="">-- Chọn ứng viên --</option>';
            danhSachUngVien.forEach(function (item) {
                const option = document.createElement("option");
                option.value = item.id;
                option.textContent = item.ho_ten || item.ten || `Ứng viên #${item.id}`;
                chonUngVienUpload.appendChild(option);
            });
        } catch (error) {
            hienThongBao(error.message || "Không tải được danh sách ứng viên.");
        }
    }

    function moModalThemCV() {
        if (!modalThemCV) return;
        thongBaoThemCV.textContent = "";
        thongBaoThemCV.className = "cv-form-message";
        formThemCV?.reset();
        moModal(modalThemCV);
        taiDanhSachUngVienUpload();
    }

    async function taiCVLen() {
        const ungVienId = chonUngVienUpload?.value;
        const file = fileCVUpload?.files?.[0];
        if (!ungVienId) {
            thongBaoThemCV.textContent = "Vui lòng chọn ứng viên.";
            thongBaoThemCV.className = "cv-form-message error";
            return;
        }
        if (!file) {
            thongBaoThemCV.textContent = "Vui lòng chọn file CV.";
            thongBaoThemCV.className = "cv-form-message error";
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            thongBaoThemCV.textContent = "File CV không được vượt quá 10 MB.";
            thongBaoThemCV.className = "cv-form-message error";
            return;
        }

        const formData = new FormData();
        formData.append("ung_vien_id", ungVienId);
        formData.append("file", file);

        try {
            btnLuuThemCV.disabled = true;
            btnLuuThemCV.textContent = "Đang tải...";
            const response = await fetch("/api/cv/upload", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            if (xuLy401(response)) return;
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Tải CV thất bại.");
            dongModal(modalThemCV);
            hienThongBao("Thêm CV thành công.", "success");
            await taiDanhSach();
        } catch (error) {
            thongBaoThemCV.textContent = error.message || "Không thể tải CV.";
            thongBaoThemCV.className = "cv-form-message error";
        } finally {
            btnLuuThemCV.disabled = false;
            btnLuuThemCV.textContent = "Tải CV lên";
        }
    }

    function moModalHoiAI() {
        if (!modalHoiAI) return;
        const ungVien = hoSoHienTai?.ung_vien || {};
        const jd = layJDChinh(hoSoHienTai);
        noiDungContextAI.textContent = cvHienTai
            ? `${layTenUngVien(ungVien)} • ${layTenFile(cvHienTai)} • ${jd?.tieu_de || "Chưa có JD"}`
            : "Chưa chọn CV";
        cauHoiAI.value = "";
        ketQuaHoiAI.innerHTML = "";
        moModal(modalHoiAI);
        setTimeout(() => cauHoiAI?.focus(), 50);
    }

    async function guiHoiAI() {
        const question = (cauHoiAI?.value || "").trim();
        if (!question) {
            ketQuaHoiAI.innerHTML = '<div class="cv-ai-answer-error">Vui lòng nhập câu hỏi.</div>';
            return;
        }
        try {
            btnGuiHoiAI.disabled = true;
            btnGuiHoiAI.textContent = "Đang hỏi...";
            ketQuaHoiAI.innerHTML = '<div class="cv-ai-answer-loading">AI đang trả lời...</div>';
            const response = await fetch("/api/cv/hoi-ai", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    cau_hoi: question,
                    ung_vien_id: hoSoHienTai?.ung_vien?.id || null,
                    cv_id: cvHienTai?.id || null,
                    jd_id: layJDChinh(hoSoHienTai)?.id || null,
                }),
            });
            if (xuLy401(response)) return;
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Không thể hỏi AI.");
            ketQuaHoiAI.innerHTML = `<div class="cv-ai-answer-content">${escapeHtml(data.tra_loi || "AI không có câu trả lời.").replace(/\n/g, "<br>")}</div>`;
        } catch (error) {
            ketQuaHoiAI.innerHTML = `<div class="cv-ai-answer-error">${escapeHtml(error.message)}</div>`;
        } finally {
            btnGuiHoiAI.disabled = false;
            btnGuiHoiAI.textContent = "Hỏi AI";
        }
    }

    function moModalXacNhanPhanTich() {
        if (!phanTichChoXacNhan || !noiDungXacNhanPhanTich) return;
        const score = phanTichChoXacNhan.score || {};
        const extraction = phanTichChoXacNhan.extraction || {};
        const tong = Number(score.tong) || 0;
        const asLines = (value) => Array.isArray(value) ? value.join("\n") : (value || "");
        noiDungXacNhanPhanTich.innerHTML = `
            <div class="cv-confirm-note">Bạn có thể chỉnh sửa thông tin trích xuất và điểm đánh giá. Dữ liệu chỉ được lưu khi bấm <strong>Xác nhận & lưu</strong>.</div>
            <h4>Thông tin ứng viên trích xuất từ CV</h4>
            <div class="cv-confirm-grid">
                <label><span>Họ tên</span><input id="xacNhanHoTen" maxlength="150" value="${escapeHtml(extraction.ho_ten || "")}"></label>
                <label><span>Email</span><input id="xacNhanEmail" type="email" maxlength="190" value="${escapeHtml(extraction.email || "")}"></label>
                <label><span>Số điện thoại</span><input id="xacNhanSoDienThoai" maxlength="30" value="${escapeHtml(extraction.so_dien_thoai || "")}"></label>
                <label><span>Số năm kinh nghiệm</span><input id="xacNhanSoNamKinhNghiem" type="number" min="0" max="60" step="0.5" value="${Number(extraction.so_nam_kinh_nghiem) || 0}"></label>
                <label class="wide"><span>Kỹ năng (mỗi dòng một kỹ năng)</span><textarea id="xacNhanKyNangText" rows="3">${escapeHtml(asLines(extraction.ky_nang))}</textarea></label>
                <label class="wide"><span>Kinh nghiệm làm việc (mỗi dòng một mục)</span><textarea id="xacNhanKinhNghiemText" rows="3">${escapeHtml(asLines(extraction.kinh_nghiem))}</textarea></label>
                <label class="wide"><span>Học vấn (mỗi dòng một mục)</span><textarea id="xacNhanHocVanText" rows="3">${escapeHtml(asLines(extraction.hoc_van))}</textarea></label>
                <label class="wide"><span>Ngôn ngữ (mỗi dòng một mục)</span><textarea id="xacNhanNgonNguText" rows="2">${escapeHtml(asLines(extraction.ngon_ngu))}</textarea></label>
                <label class="wide"><span>Chứng chỉ (mỗi dòng một mục)</span><textarea id="xacNhanChungChiText" rows="2">${escapeHtml(asLines(extraction.chung_chi))}</textarea></label>
                <label class="wide"><span>Liên kết (mỗi dòng một liên kết)</span><textarea id="xacNhanLienKetText" rows="2">${escapeHtml(asLines(extraction.lien_ket))}</textarea></label>
            </div>
            <h4>Đánh giá mức độ phù hợp với JD</h4>
            <div class="cv-confirm-grid">
                <label><span>Điểm tổng (%)</span><input id="xacNhanTong" type="number" min="0" max="100" value="${tong}"></label>
                <label><span>Kỹ năng (%)</span><input id="xacNhanKyNang" type="number" min="0" max="100" value="${Number(score.ky_nang) || 0}"></label>
                <label><span>Kinh nghiệm (%)</span><input id="xacNhanKinhNghiem" type="number" min="0" max="100" value="${Number(score.kinh_nghiem) || 0}"></label>
                <label><span>Học vấn (%)</span><input id="xacNhanHocVan" type="number" min="0" max="100" value="${Number(score.hoc_van) || 0}"></label>
                <label><span>Kỹ năng mềm (%)</span><input id="xacNhanKyNangMem" type="number" min="0" max="100" value="${Number(score.ky_nang_mem) || 0}"></label>
                <label><span>Đề xuất</span><select id="xacNhanDeXuat"><option value="nen_phong_van" ${score.de_xuat === "nen_phong_van" ? "selected" : ""}>Nên phỏng vấn</option><option value="can_nhac" ${score.de_xuat === "can_nhac" ? "selected" : ""}>Cân nhắc</option><option value="chua_phu_hop" ${score.de_xuat === "chua_phu_hop" ? "selected" : ""}>Chưa phù hợp</option></select></label>
            </div>
            <div id="xacNhanDiemLoi" class="cv-score-validation" role="alert" hidden></div>
            <label class="cv-confirm-reason"><span>Lý do sửa / xác nhận</span><textarea id="xacNhanLyDo" rows="4" placeholder="Nhập lý do nếu bạn ghi đè đánh giá AI..."></textarea></label>`;
        moModal(modalXacNhanPhanTich);
    }

    function dongModalXacNhan() {
        dongModal(modalXacNhanPhanTich);
        phanTichChoXacNhan = null;
    }

    async function xacNhanPhanTich() {
        if (!phanTichChoXacNhan || !hoSoHienTai?.ung_vien?.id || !cvHienTai?.id) return;
        const scoreFields = [
            ["xacNhanTong", "Điểm tổng"],
            ["xacNhanKyNang", "Điểm kỹ năng"],
            ["xacNhanKinhNghiem", "Điểm kinh nghiệm"],
            ["xacNhanHocVan", "Điểm học vấn"],
            ["xacNhanKyNangMem", "Điểm kỹ năng mềm"],
        ];
        const invalidScores = scoreFields.filter(([id]) => {
            const input = document.getElementById(id);
            const raw = input?.value?.trim() ?? "";
            const value = Number(raw);
            return raw === "" || !Number.isFinite(value) || value < 0 || value > 100;
        });
        const scoreError = document.getElementById("xacNhanDiemLoi");
        if (invalidScores.length) {
            const message = `${invalidScores.map(([, label]) => label).join(", ")} phải nằm trong khoảng từ 0 đến 100.`;
            if (scoreError) { scoreError.textContent = message; scoreError.hidden = false; }
            hienThongBao(message);
            const firstInvalid = document.getElementById(invalidScores[0][0]);
            firstInvalid?.focus();
            firstInvalid?.setAttribute("aria-invalid", "true");
            return;
        }
        if (scoreError) { scoreError.textContent = ""; scoreError.hidden = true; }
        scoreFields.forEach(([id]) => document.getElementById(id)?.removeAttribute("aria-invalid"));
        const getNumber = (id) => Number(document.getElementById(id).value);
        const finalScore = getNumber("xacNhanTong");
        const recommendation = document.getElementById("xacNhanDeXuat")?.value || "can_nhac";
        const reason = (document.getElementById("xacNhanLyDo")?.value || "").trim() || "Xác nhận kết quả phân tích AI.";
        const saveButton = document.getElementById("btnXacNhanPhanTichInline") || btnLuuXacNhanPhanTich;
        const finalAnalysis = JSON.parse(JSON.stringify(phanTichChoXacNhan));
        finalAnalysis.extraction = finalAnalysis.extraction || {};
        finalAnalysis.extraction.ho_ten = (document.getElementById("xacNhanHoTen")?.value || "").trim();
        finalAnalysis.extraction.email = (document.getElementById("xacNhanEmail")?.value || "").trim();
        finalAnalysis.extraction.so_dien_thoai = (document.getElementById("xacNhanSoDienThoai")?.value || "").trim();
        finalAnalysis.extraction.so_nam_kinh_nghiem = Math.max(0, Math.min(60, Number(document.getElementById("xacNhanSoNamKinhNghiem")?.value) || 0));
        const getLines = (id) => (document.getElementById(id)?.value || "").split(/\n|,/).map((item) => item.trim()).filter(Boolean);
        finalAnalysis.extraction.ky_nang = getLines("xacNhanKyNangText");
        finalAnalysis.extraction.kinh_nghiem = getLines("xacNhanKinhNghiemText");
        finalAnalysis.extraction.hoc_van = getLines("xacNhanHocVanText");
        finalAnalysis.extraction.ngon_ngu = getLines("xacNhanNgonNguText");
        finalAnalysis.extraction.chung_chi = getLines("xacNhanChungChiText");
        finalAnalysis.extraction.lien_ket = getLines("xacNhanLienKetText");
        if (!finalAnalysis.extraction.ho_ten) {
            hienThongBao("Vui lòng nhập họ tên ứng viên trước khi lưu.");
            return;
        }
        finalAnalysis.cv_id = cvHienTai.id;
        finalAnalysis.jd_id = layJDChinh(hoSoHienTai)?.id;
        finalAnalysis.score = finalAnalysis.score || {};
        finalAnalysis.score.tong = finalScore;
        finalAnalysis.score.ky_nang = getNumber("xacNhanKyNang");
        finalAnalysis.score.kinh_nghiem = getNumber("xacNhanKinhNghiem");
        finalAnalysis.score.hoc_van = getNumber("xacNhanHocVan");
        finalAnalysis.score.ky_nang_mem = getNumber("xacNhanKyNangMem");
        finalAnalysis.score.de_xuat = recommendation;
        finalAnalysis.score.tom_tat = (document.getElementById("xacNhanTomTat")?.value || "").trim();
        finalAnalysis.score.diem_manh = getLines("xacNhanDiemManh");
        finalAnalysis.score.diem_yeu = getLines("xacNhanDiemYeu");
        finalAnalysis.score.canh_bao = getLines("xacNhanCanhBao");
        finalAnalysis.ly_do_xac_nhan = reason;

        try {
            if (saveButton) {
                saveButton.disabled = true;
                saveButton.innerHTML = "<span class=\"cv-inline-spinner\"></span> Đang lưu...";
            }
            const response = await fetch(`/api/cv/review/${hoSoHienTai.ung_vien.id}/confirm`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    cv_id: cvHienTai.id,
                    jd_id: layJDChinh(hoSoHienTai)?.id,
                    phan_tich: finalAnalysis,
                    diem: finalScore,
                    de_xuat: recommendation,
                    ly_do: reason,
                }),
            });
            if (xuLy401(response)) return;
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Không lưu được kết quả phân tích.");
            dongModalXacNhan();
            hienThongBao("Đã xác nhận và lưu kết quả phân tích.", "success");
            await moHoSo(hoSoHienTai.ung_vien.id, cvHienTai.id);
        } catch (error) {
            hienThongBao(error.message || "Không thể lưu kết quả phân tích.");
        } finally {
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.innerHTML = "<span>✓</span> Xác nhận &amp; lưu";
            }
        }
    }

    function renderScoreCard(label, value) {
        const score = Math.max(0, Math.min(100, Number(value) || 0));
        return `
            <div class="cv-score-row">
                <div class="cv-score-label">
                    <span>${escapeHtml(label)}</span>
                    <strong>${score}</strong>
                </div>
                <div class="cv-score-track"><span style="width:${score}%"></span></div>
            </div>
        `;
    }

    function renderList(title, items, type = "") {
        const list = Array.isArray(items) ? items.filter(Boolean) : [];
        if (!list.length) return "";

        return `
            <section class="cv-analysis-section">
                <h3>${escapeHtml(title)}</h3>
                <ul class="cv-bullet-list ${type}">
                    ${list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
                </ul>
            </section>
        `;
    }

    function renderFormPhanTich(analysis) {
        const score = analysis.score || {};
        const extraction = analysis.extraction || {};
        const asLines = (value) => Array.isArray(value) ? value.join("\n") : (value || "");
        phanTichAI.innerHTML = `
            <section class="cv-review-editor">
                <div class="cv-review-editor-head">
                    <div class="cv-review-editor-icon">✦</div>
                    <div><span class="cv-review-kicker">AI CV REVIEW</span><h3>${hoSoHienTai?.phan_tich ? "Chỉnh sửa kết quả phân tích" : "Kiểm tra kết quả AI"}</h3><p>Kiểm tra và chỉnh sửa thông tin trước khi lưu. Chưa có thay đổi nào được lưu.</p></div>
                </div>
                <div class="cv-review-editor-section">
                    <h4><span>01</span> Thông tin ứng viên</h4>
                    <div class="cv-review-form-grid">
                        <label><span>Họ và tên *</span><input id="xacNhanHoTen" maxlength="150" value="${escapeHtml(extraction.ho_ten || "")}" placeholder="Nhập họ tên" /></label>
                        <label><span>Email</span><input id="xacNhanEmail" type="email" maxlength="190" value="${escapeHtml(extraction.email || "")}" placeholder="email@example.com" /></label>
                        <label><span>Số điện thoại</span><input id="xacNhanSoDienThoai" maxlength="30" value="${escapeHtml(extraction.so_dien_thoai || "")}" placeholder="Nhập số điện thoại" /></label>
                        <label><span>Số năm kinh nghiệm</span><input id="xacNhanSoNamKinhNghiem" type="number" min="0" max="60" step="0.5" value="${Number(extraction.so_nam_kinh_nghiem) || 0}" /></label>
                        <label class="full"><span>Kỹ năng <small>(mỗi dòng một kỹ năng)</small></span><textarea id="xacNhanKyNangText" rows="3" placeholder="JavaScript&#10;Node.js&#10;MySQL">${escapeHtml(asLines(extraction.ky_nang))}</textarea></label>
                        <label class="full"><span>Kinh nghiệm làm việc <small>(mỗi dòng một mục)</small></span><textarea id="xacNhanKinhNghiemText" rows="3" placeholder="Công ty, vị trí, thời gian và mô tả">${escapeHtml(asLines(extraction.kinh_nghiem))}</textarea></label>
                        <label class="full"><span>Học vấn <small>(mỗi dòng một mục)</small></span><textarea id="xacNhanHocVanText" rows="2">${escapeHtml(asLines(extraction.hoc_van))}</textarea></label>
                        <label><span>Ngôn ngữ</span><textarea id="xacNhanNgonNguText" rows="2">${escapeHtml(asLines(extraction.ngon_ngu))}</textarea></label>
                        <label><span>Chứng chỉ</span><textarea id="xacNhanChungChiText" rows="2">${escapeHtml(asLines(extraction.chung_chi))}</textarea></label>
                        <label class="full"><span>Liên kết cá nhân</span><textarea id="xacNhanLienKetText" rows="2" placeholder="LinkedIn, GitHub, portfolio...">${escapeHtml(asLines(extraction.lien_ket))}</textarea></label>
                    </div>
                </div>
                <div class="cv-review-editor-section">
                    <h4><span>02</span> Đánh giá mức độ phù hợp với JD</h4>
                    <div class="cv-review-score-grid">
                        <label class="cv-review-score-main"><span>Mức độ phù hợp tổng thể</span><div class="cv-review-score-input"><input id="xacNhanTong" type="number" min="0" max="100" step="1" value="${Math.max(0, Math.min(100, Number(score.tong) || 0))}" /><b>%</b></div><small>Được phép nhập đè điểm AI đề xuất (0–100%).</small></label>
                        <label><span>Kỹ năng (%)</span><input id="xacNhanKyNang" type="number" min="0" max="100" value="${Number(score.ky_nang) || 0}" /></label>
                        <label><span>Kinh nghiệm (%)</span><input id="xacNhanKinhNghiem" type="number" min="0" max="100" value="${Number(score.kinh_nghiem) || 0}" /></label>
                        <label><span>Học vấn (%)</span><input id="xacNhanHocVan" type="number" min="0" max="100" value="${Number(score.hoc_van) || 0}" /></label>
                        <label><span>Kỹ năng mềm (%)</span><input id="xacNhanKyNangMem" type="number" min="0" max="100" value="${Number(score.ky_nang_mem) || 0}" /></label>
                        <label><span>Đề xuất tuyển dụng</span><select id="xacNhanDeXuat"><option value="nen_phong_van" ${score.de_xuat === "nen_phong_van" ? "selected" : ""}>Nên phỏng vấn</option><option value="can_nhac" ${!score.de_xuat || score.de_xuat === "can_nhac" ? "selected" : ""}>Cân nhắc</option><option value="chua_phu_hop" ${score.de_xuat === "chua_phu_hop" ? "selected" : ""}>Chưa phù hợp</option></select></label>
                    </div>
                    <div id="xacNhanDiemLoi" class="cv-score-validation" role="alert" hidden></div>
                    <div class="cv-review-form-grid cv-review-details-grid">
                        <label class="full"><span>Tóm tắt đánh giá</span><textarea id="xacNhanTomTat" rows="3">${escapeHtml(score.tom_tat || "")}</textarea></label>
                        <label><span>Điểm mạnh <small>(mỗi dòng một ý)</small></span><textarea id="xacNhanDiemManh" rows="3">${escapeHtml(asLines(score.diem_manh))}</textarea></label>
                        <label><span>Điểm cần lưu ý <small>(mỗi dòng một ý)</small></span><textarea id="xacNhanDiemYeu" rows="3">${escapeHtml(asLines(score.diem_yeu))}</textarea></label>
                        <label class="full"><span>Cảnh báo / ghi chú</span><textarea id="xacNhanCanhBao" rows="2">${escapeHtml(asLines(score.canh_bao))}</textarea></label>
                        <label class="full"><span>Lý do xác nhận / chỉnh sửa</span><textarea id="xacNhanLyDo" rows="2" placeholder="Ví dụ: Điều chỉnh điểm dựa trên kinh nghiệm thực tế...">${escapeHtml(analysis.ly_do_xac_nhan || "")}</textarea></label>
                    </div>
                </div>
                <div class="cv-review-editor-footer"><span><i></i> Hãy kiểm tra thông tin trước khi lưu</span><div><button type="button" class="cv-review-cancel-btn" id="btnHuySuaPhanTich">Hủy</button><button type="button" class="cv-review-save-btn" id="btnXacNhanPhanTichInline"><span>✓</span> Xác nhận &amp; lưu</button></div></div>
            </section>`;
        document.getElementById("btnXacNhanPhanTichInline")?.addEventListener("click", xacNhanPhanTich);
        document.getElementById("btnHuySuaPhanTich")?.addEventListener("click", function () {
            phanTichChoXacNhan = null;
            renderPhanTich();
        });
    }

    function renderPhanTich() {
        if (phanTichChoXacNhan) {
            renderFormPhanTich(phanTichChoXacNhan);
            return;
        }
        const analysisRecord = hoSoHienTai?.phan_tich;
        const analysis = layPhanTich(analysisRecord);

        if (!analysis?.score) {
            phanTichAI.innerHTML = `
                <div class="cv-analysis-empty">
                    <div class="cv-analysis-empty-icon">✦</div>
                    <h3>Chưa có kết quả phân tích</h3>
                    <p>AI sẽ đối chiếu CV với JD của đợt tuyển dụng và đưa ra điểm phù hợp kèm giải thích.</p>
                    <button type="button" class="cv-analyze-btn large" id="btnPhanTichEmpty" ${btnPhanTich.disabled ? "disabled" : ""}>Phân tích CV bằng AI</button>
                </div>
            `;
            document.getElementById("btnPhanTichEmpty")?.addEventListener("click", phanTichCV);
            return;
        }

        const score = analysis.score || {};
        const extraction = analysis.extraction || {};
        const [deXuatText, deXuatClass] = layDeXuat(score.de_xuat);
        const tong = Math.max(0, Math.min(100, Number(score.tong) || 0));
        const scoreClass = layMauDiem(tong);

        phanTichAI.innerHTML = `
            <div class="cv-score-overview">
                <div class="cv-score-circle ${scoreClass}">
                    <strong>${tong}%</strong>
                    <span>Mức độ phù hợp</span>
                </div>
                <div class="cv-score-summary">
                    <div class="cv-score-summary-top"><span class="cv-score-caption">Mức độ phù hợp</span><button type="button" class="cv-edit-analysis-btn" id="btnSuaPhanTich">Sửa</button></div>
                    <strong class="cv-recommendation ${deXuatClass}">${escapeHtml(deXuatText)}</strong>
                    <p>${escapeHtml(score.tom_tat || "Chưa có tóm tắt.")}</p>
                </div>
            </div>

            <section class="cv-analysis-section">
                <div class="cv-analysis-section-title">
                    <h3>Điểm theo tiêu chí</h3>
                </div>
                ${renderScoreCard("Kỹ năng", score.ky_nang)}
                ${renderScoreCard("Kinh nghiệm", score.kinh_nghiem)}
                ${renderScoreCard("Học vấn", score.hoc_van)}
                ${renderScoreCard("Kỹ năng mềm", score.ky_nang_mem)}
            </section>

            <div class="cv-analysis-columns">
                ${score.ky_nang_khop?.length ? `
                    <section class="cv-analysis-section compact">
                        <h3>Kỹ năng phù hợp</h3>
                        <div class="cv-tag-list">${score.ky_nang_khop.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
                    </section>
                ` : ""}
                ${score.ky_nang_thieu?.length ? `
                    <section class="cv-analysis-section compact">
                        <h3>Kỹ năng còn thiếu</h3>
                        <div class="cv-tag-list missing">${score.ky_nang_thieu.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
                    </section>
                ` : ""}
            </div>

            ${renderList("Điểm mạnh", score.diem_manh, "positive")}
            ${renderList("Điểm cần lưu ý", score.diem_yeu, "negative")}
            ${renderList("Cảnh báo", score.canh_bao, "warning")}

            <section class="cv-analysis-section">
                <h3>Thông tin trích xuất từ CV</h3>
                <div class="cv-extraction-grid">
                    <div><span>Họ tên</span><strong>${escapeHtml(extraction.ho_ten || layTenUngVien(hoSoHienTai?.ung_vien))}</strong></div>
                    <div><span>Số năm kinh nghiệm</span><strong>${extraction.so_nam_kinh_nghiem ?? "-"} năm</strong></div>
                    <div class="wide"><span>Kỹ năng</span><strong>${escapeHtml((extraction.ky_nang || []).join(", ") || "Chưa xác định")}</strong></div>
                    <div class="wide"><span>Học vấn</span><strong>${escapeHtml((extraction.hoc_van || []).join(" • ") || "Chưa xác định")}</strong></div>
                </div>
            </section>
        `;
        document.getElementById("btnSuaPhanTich")?.addEventListener("click", function () {
            phanTichChoXacNhan = JSON.parse(JSON.stringify(analysis));
            phanTichChoXacNhan.cv_id = cvHienTai?.id;
            phanTichChoXacNhan.jd_id = layJDChinh(hoSoHienTai)?.id;
            renderPhanTich();
        });
    }

    async function phanTichCV() {
        if (!hoSoHienTai?.ung_vien?.id || !cvHienTai?.id) {
            hienThongBao("Chưa chọn CV để phân tích.");
            return;
        }

        const jd = layJDChinh(hoSoHienTai);

        if (!jd?.id) {
            hienThongBao("Đợt tuyển dụng chưa có JD để phân tích.");
            return;
        }

        dangPhanTich = true;
        btnPhanTich.disabled = true;
        btnPhanTich.textContent = "Đang phân tích...";
        phanTichAI.innerHTML = `
            <div class="cv-analysis-loading large">
                <div class="cv-spinner"></div>
                <strong>AI đang phân tích CV</strong>
                <span>Đang đối chiếu CV với JD và tính điểm phù hợp...</span>
            </div>
        `;

        try {
            const response = await fetch(`/api/cv/review/${hoSoHienTai.ung_vien.id}/analyze`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    cv_id: cvHienTai.id,
                    jd_id: jd.id,
                }),
            });

            if (xuLy401(response)) return;

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Phân tích CV thất bại.");
            }

            phanTichChoXacNhan = data.phan_tich;
            renderPhanTich();
            hienThongBao("AI đã phân tích xong. Kiểm tra thông tin bên dưới, chỉnh sửa nếu cần rồi bấm “Xác nhận & lưu”.", "success");
        } catch (error) {
            console.error("Lỗi phân tích CV:", error);
            hienThongBao(error.message || "Không thể phân tích CV.");
            renderPhanTich();
        } finally {
            dangPhanTich = false;
            btnPhanTich.textContent = "Phân tích AI";
            renderHoSo();
        }
    }

    async function taiXuongCV() {
        if (!cvHienTai?.id) return;

        try {
            const response = await fetch(`/api/cv/${cvHienTai.id}/tai-xuong`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (xuLy401(response)) return;

            if (!response.ok) {
                let message = "Không thể tải xuống CV.";
                try {
                    const data = await response.json();
                    message = data.message || message;
                } catch (error) { }
                throw new Error(message);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = layTenFile(cvHienTai);
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Lỗi tải CV:", error);
            hienThongBao(error.message || "Không thể tải xuống CV.");
        }
    }

    oTimKiem?.addEventListener("input", renderDanhSach);
    locDotTuyen?.addEventListener("change", renderDanhSach);
    locTrangThai?.addEventListener("change", renderDanhSach);

    danhSachCV?.addEventListener("click", async function (event) {
        const actionButton = event.target.closest("[data-action]");
        if (actionButton) {
            const action = actionButton.dataset.action;
            const candidateId = Number(actionButton.dataset.candidateId);
            if (!candidateId) return;
            if (action === "more") {
                event.stopPropagation();
                document.querySelectorAll(".cv-candidate-menu.show").forEach((menu) => menu.classList.remove("show"));
                actionButton.nextElementSibling?.classList.toggle("show");
                return;
            }
            if (action === "view-candidate") {
                document.querySelectorAll(".cv-candidate-menu.show").forEach((menu) => menu.classList.remove("show"));
                moModalUngVien(candidateId, false);
                return;
            }
            if (action === "edit-candidate") {
                document.querySelectorAll(".cv-candidate-menu.show").forEach((menu) => menu.classList.remove("show"));
                moModalUngVien(candidateId, true);
                return;
            }
            if (action === "delete-candidate") {
                document.querySelectorAll(".cv-candidate-menu.show").forEach((menu) => menu.classList.remove("show"));
                await xoaUngVien(candidateId);
                return;
            }
        }
        const item = event.target.closest(".cv-list-item");
        if (!item) return;
        const cvId = Number(item.dataset.id);
        const cvItem = danhSach.find((row) => Number(row.id) === cvId);
        if (cvItem?.ung_vien_id) await moHoSo(cvItem.ung_vien_id, cvId);
    });

    document.addEventListener("click", function (event) {
        if (!event.target.closest(".cv-list-item-wrap")) document.querySelectorAll(".cv-candidate-menu.show").forEach((menu) => menu.classList.remove("show"));
    });

    btnPhanTich?.addEventListener("click", phanTichCV);
    btnTaiXuong?.addEventListener("click", taiXuongCV);

    btnThuNho?.addEventListener("click", function () { thayDoiZoom(-0.1); });
    btnPhongTo?.addEventListener("click", function () { thayDoiZoom(0.1); });
    btnDatLaiZoom?.addEventListener("click", datLaiZoom);
    btnThemCV?.addEventListener("click", moModalThemCV);
    btnDongThemCV?.addEventListener("click", function () { dongModal(modalThemCV); });
    btnDongUngVien?.addEventListener("click", function () { dongModal(modalUngVien); });
    btnHuyUngVien?.addEventListener("click", function () { dongModal(modalUngVien); });
    formUngVien?.addEventListener("submit", luuUngVien);
    btnHuyThemCV?.addEventListener("click", function () { dongModal(modalThemCV); });
    formThemCV?.addEventListener("submit", function (event) { event.preventDefault(); taiCVLen(); });

    btnHoiAI?.addEventListener("click", moModalHoiAI);
    btnDongHoiAI?.addEventListener("click", function () { dongModal(modalHoiAI); });
    btnHuyHoiAI?.addEventListener("click", function () { dongModal(modalHoiAI); });
    btnGuiHoiAI?.addEventListener("click", guiHoiAI);

    btnThongBaoCV?.addEventListener("click", function () { moModal(modalThongBaoCV); });
    btnDongThongBaoCV?.addEventListener("click", function () { dongModal(modalThongBaoCV); });

    btnDongXacNhanPhanTich?.addEventListener("click", dongModalXacNhan);
    btnHuyXacNhanPhanTich?.addEventListener("click", dongModalXacNhan);
    btnLuuXacNhanPhanTich?.addEventListener("click", xacNhanPhanTich);

    [modalThemCV, modalHoiAI, modalThongBaoCV, modalXacNhanPhanTich, modalUngVien].forEach(function (modal) {
        modal?.addEventListener("click", function (event) {
            if (event.target === modal) dongModal(modal);
        });
    });

    window.addEventListener("beforeunload", function () {
        if (objectUrlHienTai) URL.revokeObjectURL(objectUrlHienTai);
    });

    taiDanhSach();
});