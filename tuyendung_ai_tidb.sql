DROP DATABASE IF EXISTS tuyendung_ai;

CREATE DATABASE tuyendung_ai
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE tuyendung_ai;

SET NAMES utf8mb4;

CREATE TABLE nguoi_dung (
    id INT NOT NULL AUTO_INCREMENT,
    ho_ten VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    mat_khau VARCHAR(255) NOT NULL,
    vai_tro VARCHAR(30) NOT NULL,
    trang_thai VARCHAR(20) NOT NULL DEFAULT 'hoat_dong',
    ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_sua DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

PRIMARY KEY (id),
    UNIQUE KEY email (email),
    KEY idx_nguoi_dung_vai_tro (vai_tro),
    KEY idx_nguoi_dung_trang_thai (trang_thai)
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
AUTO_ID_CACHE=1;

INSERT INTO nguoi_dung
(id, ho_ten, email, mat_khau, vai_tro, trang_thai, ngay_tao, ngay_sua)
VALUES
(1, 'Admin', 'admin@gmail.com', '123456', 'admin', 'hoat_dong',
 '2026-09-23 15:45:31', '2026-09-24 11:14:09'),
(2, 'Quản lý', 'manager@gmail.com', '123456', 'manager', 'hoat_dong',
 '2026-09-23 15:45:31', '2026-09-24 10:16:01'),
(3, 'Nhân sự', 'hr@gmail.com', '123456', 'hr', 'hoat_dong',
 '2026-09-23 15:45:31', '2026-09-24 10:16:06'),
(4, 'Phỏng vấn', 'interviewer@gmail.com', '123456', 'interviewer', 'hoat_dong',
 '2026-09-23 15:45:31', '2026-09-24 10:16:12'),
(5, 'Người xem', 'viewer@gmail.com', '123456', 'viewer', 'hoat_dong',
 '2026-09-23 15:45:31', '2026-09-24 10:19:28');

CREATE TABLE dot_tuyen (
    id INT NOT NULL AUTO_INCREMENT,
    ten VARCHAR(150) NOT NULL,
    mo_ta TEXT DEFAULT NULL,
    trang_thai VARCHAR(30) NOT NULL DEFAULT 'nhap',
    nguoi_tao INT NOT NULL,
    ngay_bat_dau DATE DEFAULT NULL,
    ngay_ket_thuc DATE DEFAULT NULL,
    ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_sua DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

PRIMARY KEY (id),
    KEY idx_dot_tuyen_trang_thai (trang_thai),
    KEY idx_dot_tuyen_nguoi_tao (nguoi_tao),

CONSTRAINT fk_dot_tuyen_nguoi_tao
        FOREIGN KEY (nguoi_tao)
        REFERENCES nguoi_dung (id)
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
AUTO_ID_CACHE=1;

INSERT INTO dot_tuyen
(id, ten, mo_ta, trang_thai, nguoi_tao, ngay_bat_dau, ngay_ket_thuc, ngay_tao, ngay_sua)
VALUES
(1, 'Tuyển dụng lập trình viên 2026',
 'Tuyển lập trình viên cho công ty',
 'dang_tuyen',
 1,
 '2026-09-24',
 '2026-09-30',
 '2026-09-23 16:04:16',
 '2026-09-24 09:45:18'),
(2, 'Tuyển thực tập sinh 2026',
 'Tuyển thực tập sinh AI',
 'tam_dung',
 1,
 '2026-10-01',
 '2026-12-31',
 '2026-09-24 09:21:35',
 '2026-09-24 11:22:30'),
(3, 'Tuyển dụng Tester',
 'Kiểm thử các phần mềm',
 'nhap',
 1,
 '2026-09-30',
 '2027-02-02',
 '2026-09-24 11:21:24',
 '2026-09-24 11:42:10');

CREATE TABLE jd (
    id INT NOT NULL AUTO_INCREMENT,
    dot_tuyen_id INT NOT NULL,
    tieu_de VARCHAR(200) NOT NULL,
    mo_ta TEXT DEFAULT NULL,
    yeu_cau TEXT DEFAULT NULL,
    quyen_loi TEXT DEFAULT NULL,
    bo_phan VARCHAR(100) DEFAULT NULL,
    dia_diem VARCHAR(200) DEFAULT NULL,
    loai_hinh VARCHAR(50) DEFAULT NULL,
    muc_luong VARCHAR(150) DEFAULT NULL,
    han_nhan_ho_so DATE DEFAULT NULL,
    ky_nang TEXT DEFAULT NULL,
    tieu_chi JSON DEFAULT NULL,
    trang_thai VARCHAR(30) NOT NULL DEFAULT 'nhap',
    nguoi_duyet INT DEFAULT NULL,
    ngay_duyet DATETIME DEFAULT NULL,
    ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_sua DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

PRIMARY KEY (id),
    KEY idx_jd_dot_tuyen (dot_tuyen_id),
    KEY idx_jd_trang_thai (trang_thai),
    KEY idx_jd_nguoi_duyet (nguoi_duyet),

CONSTRAINT fk_jd_dot_tuyen
        FOREIGN KEY (dot_tuyen_id)
        REFERENCES dot_tuyen (id)
        ON DELETE CASCADE,

CONSTRAINT fk_jd_nguoi_duyet
        FOREIGN KEY (nguoi_duyet)
        REFERENCES nguoi_dung (id)
        ON DELETE SET NULL
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
AUTO_ID_CACHE=1;

INSERT INTO jd
(id, dot_tuyen_id, tieu_de, mo_ta, yeu_cau, quyen_loi,
 tieu_chi, trang_thai, nguoi_duyet, ngay_duyet, ngay_tao, ngay_sua)
VALUES
(
    1,
    1,
    'Tuyển lập trình viên Backend',
    'Phát triển và bảo trì các API cho hệ thống.',
    'Có kiến thức Node.js, Express.js, MySQL.',
    'Môi trường làm việc chuyên nghiệp, đào tạo và phát triển kỹ năng.',
    '{"noi_dung":"Kinh nghiệm Node.js, MySQL, REST API."}',
    'da_duyet',
    1,
    '2026-09-23 17:24:35',
    '2026-09-23 17:12:41',
    '2026-09-23 17:24:35'
);

CREATE TABLE ung_vien (
    id INT NOT NULL AUTO_INCREMENT,
    dot_tuyen_id INT NOT NULL,
    ho_ten VARCHAR(100) NOT NULL,
    email VARCHAR(150) DEFAULT NULL,
    sdt VARCHAR(20) DEFAULT NULL,
    nguon VARCHAR(50) DEFAULT NULL,
    trang_thai VARCHAR(40) NOT NULL DEFAULT 'moi',
    ghi_chu TEXT DEFAULT NULL,
    ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_sua DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_ung_vien_dot_tuyen (dot_tuyen_id),
    KEY idx_ung_vien_email (email),
    KEY idx_ung_vien_trang_thai (trang_thai),
    KEY idx_ung_vien_ho_ten (ho_ten),

CONSTRAINT fk_ung_vien_dot_tuyen
        FOREIGN KEY (dot_tuyen_id)
        REFERENCES dot_tuyen (id)
        ON DELETE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
AUTO_ID_CACHE=1;

CREATE TABLE cv (
    id INT NOT NULL AUTO_INCREMENT,
    ung_vien_id INT NOT NULL,
    ten_file VARCHAR(255) NOT NULL,
    duong_dan VARCHAR(500) NOT NULL,
    loai_file VARCHAR(50) DEFAULT NULL,
    kich_thuoc BIGINT DEFAULT NULL,
    nguoi_tai INT NOT NULL,
    ngay_tai DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

PRIMARY KEY (id),
    KEY idx_cv_ung_vien (ung_vien_id),
    KEY idx_cv_nguoi_tai (nguoi_tai),

CONSTRAINT fk_cv_nguoi_tai
        FOREIGN KEY (nguoi_tai)
        REFERENCES nguoi_dung (id),

CONSTRAINT fk_cv_ung_vien
        FOREIGN KEY (ung_vien_id)
        REFERENCES ung_vien (id)
        ON DELETE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
AUTO_ID_CACHE=1;

CREATE TABLE phan_tich_ai (
    id INT NOT NULL AUTO_INCREMENT,
    ung_vien_id INT NOT NULL,
    cv_id INT NOT NULL,
    jd_id INT NOT NULL,
    du_lieu JSON DEFAULT NULL,
    diem DECIMAL(5,2) DEFAULT NULL,
    tom_tat TEXT DEFAULT NULL,
    diem_manh JSON DEFAULT NULL,
    diem_yeu JSON DEFAULT NULL,
    canh_bao JSON DEFAULT NULL,
    giai_thich TEXT DEFAULT NULL,
    goi_y TEXT DEFAULT NULL,
    model VARCHAR(100) DEFAULT NULL,
    ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

PRIMARY KEY (id),
    KEY idx_ai_ung_vien (ung_vien_id),
    KEY idx_ai_cv (cv_id),
    KEY idx_ai_jd (jd_id),
    KEY idx_ai_diem (diem),

CONSTRAINT fk_ai_cv
        FOREIGN KEY (cv_id)
        REFERENCES cv (id)
        ON DELETE CASCADE,

CONSTRAINT fk_ai_jd
        FOREIGN KEY (jd_id)
        REFERENCES jd (id)
        ON DELETE CASCADE,

CONSTRAINT fk_ai_ung_vien
        FOREIGN KEY (ung_vien_id)
        REFERENCES ung_vien (id)
        ON DELETE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
AUTO_ID_CACHE=1;

CREATE TABLE phong_van (
    id INT NOT NULL AUTO_INCREMENT,
    ung_vien_id INT NOT NULL,
    nguoi_tao INT NOT NULL,
    nguoi_phong_van INT NOT NULL,
    bat_dau DATETIME NOT NULL,
    ket_thuc DATETIME DEFAULT NULL,
    hinh_thuc VARCHAR(30) NOT NULL,
    dia_diem VARCHAR(255) DEFAULT NULL,
    trang_thai VARCHAR(30) NOT NULL DEFAULT 'da_len_lich',
    ghi_chu TEXT DEFAULT NULL,
    ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

PRIMARY KEY (id),
    KEY idx_phong_van_ung_vien (ung_vien_id),
    KEY idx_phong_van_nguoi_tao (nguoi_tao),
    KEY idx_phong_van_nguoi_pv (nguoi_phong_van),
    KEY idx_phong_van_thoi_gian (bat_dau),
    KEY idx_phong_van_trang_thai (trang_thai),

CONSTRAINT fk_phong_van_nguoi_pv
        FOREIGN KEY (nguoi_phong_van)
        REFERENCES nguoi_dung (id),

CONSTRAINT fk_phong_van_nguoi_tao
        FOREIGN KEY (nguoi_tao)
        REFERENCES nguoi_dung (id),

CONSTRAINT fk_phong_van_ung_vien
        FOREIGN KEY (ung_vien_id)
        REFERENCES ung_vien (id)
        ON DELETE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
AUTO_ID_CACHE=1;

CREATE TABLE danh_gia (
    id INT NOT NULL AUTO_INCREMENT,
    phong_van_id INT NOT NULL,
    nguoi_danh_gia INT NOT NULL,
    diem DECIMAL(5,2) DEFAULT NULL,
    diem_manh TEXT DEFAULT NULL,
    diem_yeu TEXT DEFAULT NULL,
    nhan_xet TEXT DEFAULT NULL,
    de_xuat VARCHAR(50) DEFAULT NULL,
    ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

PRIMARY KEY (id),
    UNIQUE KEY uq_danh_gia (phong_van_id, nguoi_danh_gia),
    KEY idx_danh_gia_phong_van (phong_van_id),
    KEY idx_danh_gia_nguoi (nguoi_danh_gia),
    KEY idx_danh_gia_diem (diem),

CONSTRAINT fk_danh_gia_nguoi
        FOREIGN KEY (nguoi_danh_gia)
        REFERENCES nguoi_dung (id),

CONSTRAINT fk_danh_gia_phong_van
        FOREIGN KEY (phong_van_id)
        REFERENCES phong_van (id)
        ON DELETE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
AUTO_ID_CACHE=1;

CREATE TABLE quyet_dinh (
    id INT NOT NULL AUTO_INCREMENT,
    ung_vien_id INT NOT NULL,
    nguoi_quyet_dinh INT NOT NULL,
    ket_qua VARCHAR(30) NOT NULL,
    ly_do TEXT DEFAULT NULL,
    ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

PRIMARY KEY (id),
    KEY idx_quyet_dinh_ung_vien (ung_vien_id),
    KEY idx_quyet_dinh_nguoi (nguoi_quyet_dinh),
    KEY idx_quyet_dinh_ket_qua (ket_qua),

CONSTRAINT fk_quyet_dinh_nguoi
        FOREIGN KEY (nguoi_quyet_dinh)
        REFERENCES nguoi_dung (id),

CONSTRAINT fk_quyet_dinh_ung_vien
        FOREIGN KEY (ung_vien_id)
        REFERENCES ung_vien (id)
        ON DELETE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
AUTO_ID_CACHE=1;

CREATE TABLE thanh_vien (
    id INT NOT NULL AUTO_INCREMENT,
    dot_tuyen_id INT NOT NULL,
    nguoi_dung_id INT NOT NULL,
    vai_tro VARCHAR(30) NOT NULL,
    ngay_them DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

PRIMARY KEY (id),
    UNIQUE KEY uq_thanh_vien (dot_tuyen_id, nguoi_dung_id),
    KEY idx_thanh_vien_dot_tuyen (dot_tuyen_id),
    KEY idx_thanh_vien_nguoi_dung (nguoi_dung_id),

CONSTRAINT fk_thanh_vien_dot_tuyen
        FOREIGN KEY (dot_tuyen_id)
        REFERENCES dot_tuyen (id)
        ON DELETE CASCADE,

CONSTRAINT fk_thanh_vien_nguoi_dung
        FOREIGN KEY (nguoi_dung_id)
        REFERENCES nguoi_dung (id)
        ON DELETE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
AUTO_ID_CACHE=1;

CREATE TABLE thong_bao (
    id INT NOT NULL AUTO_INCREMENT,
    nguoi_dung_id INT NOT NULL,
    tieu_de VARCHAR(200) NOT NULL,
    noi_dung TEXT NOT NULL,
    loai VARCHAR(50) DEFAULT NULL,
    da_doc TINYINT(1) NOT NULL DEFAULT 0,
    ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

PRIMARY KEY (id),
    KEY idx_thong_bao_nguoi_dung (nguoi_dung_id),
    KEY idx_thong_bao_da_doc (da_doc),
    KEY idx_thong_bao_ngay_tao (ngay_tao),

CONSTRAINT fk_thong_bao_nguoi_dung
        FOREIGN KEY (nguoi_dung_id)
        REFERENCES nguoi_dung (id)
        ON DELETE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
AUTO_ID_CACHE=1;

CREATE TABLE nhat_ky (
    id INT NOT NULL AUTO_INCREMENT,
    nguoi_dung_id INT DEFAULT NULL,
    hanh_dong VARCHAR(100) NOT NULL,
    loai VARCHAR(50) NOT NULL,
    du_lieu_id INT DEFAULT NULL,
    chi_tiet JSON DEFAULT NULL,
    ip VARCHAR(45) DEFAULT NULL,
    ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

PRIMARY KEY (id),
    KEY idx_nhat_ky_nguoi_dung (nguoi_dung_id),
    KEY idx_nhat_ky_loai (loai),
    KEY idx_nhat_ky_du_lieu (du_lieu_id),
    KEY idx_nhat_ky_ngay_tao (ngay_tao),

CONSTRAINT fk_nhat_ky_nguoi_dung
        FOREIGN KEY (nguoi_dung_id)
        REFERENCES nguoi_dung (id)
        ON DELETE SET NULL
)
ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
AUTO_ID_CACHE=1;

SELECT
    TABLE_NAME,
    CREATE_OPTIONS
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'tuyendung_ai'
ORDER BY TABLE_NAME;