
require("dotenv").config({ path: ".env.local" });

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { put } = require("@vercel/blob");
const db = require("../database/db");

const THU_MUC_CV = path.resolve("uploads/cv");
const CHAY_THAT = process.argv.includes("--apply");
const BAO_CAO = path.resolve("cv-migration-report.json");

function laBlobUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === "https:" &&
            url.hostname.endsWith(".blob.vercel-storage.com");
    } catch {
        return false;
    }
}


function layDuongDanLocal(value) {
    if (!value || /^https?:\/\//i.test(value)) return null;

    const tenFile = path.basename(value);
    let file;

    // Duong dan chi co ten file
    if (value === tenFile) {
        file = path.join(THU_MUC_CV, tenFile);
    } else {
        file = path.resolve(value);
    }

    // Chi cho phep truy cap file trong uploads/cv
    const tuongDoi = path.relative(THU_MUC_CV, file);

    if (
        tuongDoi === ".." ||
        tuongDoi.startsWith(".." + path.sep) ||
        path.isAbsolute(tuongDoi)
    ) {
        return null;
    }

    return file;
}

async function main() {
    for (const ten of ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "BLOB_READ_WRITE_TOKEN"]) {
        if (!process.env[ten]) {
            throw new Error(`Thiếu biến môi trường ${ten}`);
        }
    }

    if (!fs.existsSync(THU_MUC_CV)) {
        throw new Error(`Không tìm thấy thư mục ${THU_MUC_CV}`);
    }

    const [danhSach] = await db.query(`
        SELECT id, ten_file, duong_dan, loai_file, kich_thuoc
        FROM cv
        ORDER BY id
    `);

    const baoCao = {
        che_do: CHAY_THAT ? "APPLY" : "DRY_RUN",
        bat_dau: new Date().toISOString(),
        tong_ban_ghi: danhSach.length,
        san_sang: [],
        da_co_blob: [],
        thieu_file: [],
        duong_dan_khong_hop_le: [],
        loi: [],
        thanh_cong: []
    };

    for (const cv of danhSach) {
        const duongDanCu = cv.duong_dan || "";

        if (laBlobUrl(duongDanCu)) {
            baoCao.da_co_blob.push({
                id: cv.id,
                ten_file: cv.ten_file
            });
            continue;
        }

        const file = layDuongDanLocal(duongDanCu);

        if (!file) {
            baoCao.duong_dan_khong_hop_le.push({
                id: cv.id,
                ten_file: cv.ten_file,
                duong_dan: duongDanCu
            });
            continue;
        }

        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
            baoCao.thieu_file.push({
                id: cv.id,
                ten_file: cv.ten_file,
                duong_dan: duongDanCu
            });
            continue;
        }

        const thongTin = fs.statSync(file);

        if (!CHAY_THAT) {
            baoCao.san_sang.push({
                id: cv.id,
                ten_file: cv.ten_file,
                kich_thuoc: thongTin.size
            });
            continue;
        }

        try {
            const buffer = fs.readFileSync(file);
            const duoi = path.extname(cv.ten_file || file).toLowerCase();
            const tenBlob = `cv/migrated-${cv.id}-${crypto.randomUUID()}${duoi}`;

            const blob = await put(tenBlob, buffer, {
                access: "private",
                addRandomSuffix: false,
                contentType: cv.loai_file || "application/octet-stream"
            });

            const [ketQua] = await db.query(
                `UPDATE cv
                 SET duong_dan = ?, kich_thuoc = ?
                 WHERE id = ? AND duong_dan = ?`,
                [blob.url, buffer.length, cv.id, duongDanCu]
            );

            if (ketQua.affectedRows !== 1) {
                baoCao.loi.push({
                    id: cv.id,
                    ten_file: cv.ten_file,
                    loi: "Bản ghi đã thay đổi hoặc không cập nhật được. Blob đã upload cần được kiểm tra thủ công.",
                    blob_url: blob.url
                });
                continue;
            }

            baoCao.thanh_cong.push({
                id: cv.id,
                ten_file: cv.ten_file,
                kich_thuoc: buffer.length
            });

            console.log(`Đã chuyển CV #${cv.id}: ${cv.ten_file}`);
        } catch (error) {
            baoCao.loi.push({
                id: cv.id,
                ten_file: cv.ten_file,
                loi: error.message
            });

            console.error(`Lỗi CV #${cv.id}: ${error.message}`);
        }
    }

    baoCao.ket_thuc = new Date().toISOString();
    baoCao.tong_ket = {
        san_sang: baoCao.san_sang.length,
        da_co_blob: baoCao.da_co_blob.length,
        thieu_file: baoCao.thieu_file.length,
        duong_dan_khong_hop_le: baoCao.duong_dan_khong_hop_le.length,
        thanh_cong: baoCao.thanh_cong.length,
        loi: baoCao.loi.length
    };

    fs.writeFileSync(BAO_CAO, JSON.stringify(baoCao, null, 2));

    console.log("\nTổng kết:", baoCao.tong_ket);
    console.log("Báo cáo:", BAO_CAO);
    console.log(CHAY_THAT ? "Đã kết thúc chuyển dữ liệu." : "Chạy thử, chưa upload hoặc sửa database.");
}

main()
    .catch(error => {
        console.error("Migration thất bại:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await db.end();
    });
