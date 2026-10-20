CREATE TABLE IF NOT EXISTS nguoi_phong_van (
  id INT NOT NULL AUTO_INCREMENT,
  nguoi_dung_id INT NOT NULL,
  so_dien_thoai VARCHAR(30) NULL,
  bo_phan VARCHAR(150) NULL,
  chuc_danh VARCHAR(150) NULL,
  ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_nguoi_phong_van_nguoi_dung (nguoi_dung_id),
  CONSTRAINT fk_nguoi_phong_van_nguoi_dung FOREIGN KEY (nguoi_dung_id) REFERENCES nguoi_dung(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
