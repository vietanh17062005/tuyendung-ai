-- AI Recruitment Hub: Feedback & kết quả phỏng vấn
-- Route routes/danhGia.js cũng tự tạo các bảng này khi khởi chạy.
ALTER TABLE phong_van
  ADD COLUMN IF NOT EXISTS vong_phong_van VARCHAR(100) NOT NULL DEFAULT 'Vòng 1';

CREATE TABLE IF NOT EXISTS tieu_chi_danh_gia (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ten VARCHAR(150) NOT NULL,
  mo_ta VARCHAR(500) NULL,
  trong_so DECIMAL(5,2) NOT NULL DEFAULT 1,
  diem_toi_da DECIMAL(5,2) NOT NULL DEFAULT 10,
  dang_dung TINYINT(1) NOT NULL DEFAULT 1,
  thu_tu INT NOT NULL DEFAULT 0,
  ngay_tao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tieu_chi_danh_gia (ten,mo_ta,trong_so,diem_toi_da,thu_tu)
SELECT 'Chuyên môn','Kiến thức và năng lực chuyên môn',40,10,1 WHERE NOT EXISTS (SELECT 1 FROM tieu_chi_danh_gia);
INSERT INTO tieu_chi_danh_gia (ten,mo_ta,trong_so,diem_toi_da,thu_tu)
SELECT 'Kỹ năng','Khả năng giải quyết vấn đề và thực hành',25,10,2 WHERE (SELECT COUNT(*) FROM tieu_chi_danh_gia)=1;
INSERT INTO tieu_chi_danh_gia (ten,mo_ta,trong_so,diem_toi_da,thu_tu)
SELECT 'Giao tiếp','Diễn đạt và trao đổi thông tin',15,10,3 WHERE (SELECT COUNT(*) FROM tieu_chi_danh_gia)=2;
INSERT INTO tieu_chi_danh_gia (ten,mo_ta,trong_so,diem_toi_da,thu_tu)
SELECT 'Thái độ','Tinh thần học hỏi và trách nhiệm',10,10,4 WHERE (SELECT COUNT(*) FROM tieu_chi_danh_gia)=3;
INSERT INTO tieu_chi_danh_gia (ten,mo_ta,trong_so,diem_toi_da,thu_tu)
SELECT 'Phù hợp văn hóa','Mức độ phù hợp với nhóm và môi trường',10,10,5 WHERE (SELECT COUNT(*) FROM tieu_chi_danh_gia)=4;

CREATE TABLE IF NOT EXISTS danh_gia_phong_van (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  phong_van_id BIGINT NOT NULL,
  nguoi_danh_gia_id BIGINT NOT NULL,
  diem_json LONGTEXT NOT NULL,
  diem_tong DECIMAL(5,2) NOT NULL DEFAULT 0,
  nhan_xet TEXT NULL,
  de_xuat ENUM('dat','can_nhac','rot','vong_tiep') NOT NULL DEFAULT 'can_nhac',
  ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ngay_cap_nhat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_danh_gia_pv_nguoi (phong_van_id, nguoi_danh_gia_id),
  KEY idx_danh_gia_pv (phong_van_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quyet_dinh_phong_van (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  phong_van_id BIGINT NOT NULL,
  ung_vien_id BIGINT NOT NULL,
  nguoi_quyet_dinh_id BIGINT NOT NULL,
  ket_qua ENUM('dat','can_nhac','rot','vong_tiep') NOT NULL,
  ghi_chu TEXT NULL,
  email_trang_thai ENUM('chua_gui','da_gui','loi') NOT NULL DEFAULT 'chua_gui',
  email_da_gui_luc DATETIME NULL,
  email_loi TEXT NULL,
  ngay_quyet_dinh DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ngay_cap_nhat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_quyet_dinh_pv (phong_van_id),
  KEY idx_quyet_dinh_ung_vien (ung_vien_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
