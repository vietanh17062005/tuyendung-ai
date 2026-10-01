-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th9 24, 2026 lúc 06:43 AM
-- Phiên bản máy phục vụ: 10.4.32-MariaDB
-- Phiên bản PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `tuyendung_ai`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `cv`
--

CREATE TABLE `cv` (
  `id` int(11) NOT NULL,
  `ung_vien_id` int(11) NOT NULL,
  `ten_file` varchar(255) NOT NULL,
  `duong_dan` varchar(500) NOT NULL,
  `loai_file` varchar(50) DEFAULT NULL,
  `kich_thuoc` bigint(20) DEFAULT NULL,
  `nguoi_tai` int(11) NOT NULL,
  `ngay_tai` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `danh_gia`
--

CREATE TABLE `danh_gia` (
  `id` int(11) NOT NULL,
  `phong_van_id` int(11) NOT NULL,
  `nguoi_danh_gia` int(11) NOT NULL,
  `diem` decimal(5,2) DEFAULT NULL,
  `diem_manh` text DEFAULT NULL,
  `diem_yeu` text DEFAULT NULL,
  `nhan_xet` text DEFAULT NULL,
  `de_xuat` varchar(50) DEFAULT NULL,
  `ngay_tao` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `dot_tuyen`
--

CREATE TABLE `dot_tuyen` (
  `id` int(11) NOT NULL,
  `ten` varchar(150) NOT NULL,
  `mo_ta` text DEFAULT NULL,
  `trang_thai` varchar(30) NOT NULL DEFAULT 'nhap',
  `nguoi_tao` int(11) NOT NULL,
  `ngay_bat_dau` date DEFAULT NULL,
  `ngay_ket_thuc` date DEFAULT NULL,
  `ngay_tao` datetime NOT NULL DEFAULT current_timestamp(),
  `ngay_sua` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `dot_tuyen`
--

INSERT INTO `dot_tuyen` (`id`, `ten`, `mo_ta`, `trang_thai`, `nguoi_tao`, `ngay_bat_dau`, `ngay_ket_thuc`, `ngay_tao`, `ngay_sua`) VALUES
(1, 'Tuyển dụng lập trình viên 2026', 'Tuyển lập trình viên cho công ty', 'dang_tuyen', 1, '2026-09-24', '2026-09-30', '2026-09-23 16:04:16', '2026-09-24 09:45:18'),
(3, 'Tuyển thực tập sinh 2026', 'Tuyển thực tập sinh AI', 'tam_dung', 1, '2026-10-01', '2026-12-31', '2026-09-24 09:21:35', '2026-09-24 11:22:30'),
(4, 'Tuyển dụng Tester', 'Kiểm thử các phần mềm', 'nhap', 1, '2026-09-30', '2027-02-02', '2026-09-24 11:21:24', '2026-09-24 11:42:10');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `jd`
--

CREATE TABLE `jd` (
  `id` int(11) NOT NULL,
  `dot_tuyen_id` int(11) NOT NULL,
  `tieu_de` varchar(200) NOT NULL,
  `mo_ta` text DEFAULT NULL,
  `yeu_cau` text DEFAULT NULL,
  `quyen_loi` text DEFAULT NULL,
  `tieu_chi` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tieu_chi`)),
  `trang_thai` varchar(30) NOT NULL DEFAULT 'nhap',
  `nguoi_duyet` int(11) DEFAULT NULL,
  `ngay_duyet` datetime DEFAULT NULL,
  `ngay_tao` datetime NOT NULL DEFAULT current_timestamp(),
  `ngay_sua` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `jd`
--

INSERT INTO `jd` (`id`, `dot_tuyen_id`, `tieu_de`, `mo_ta`, `yeu_cau`, `quyen_loi`, `tieu_chi`, `trang_thai`, `nguoi_duyet`, `ngay_duyet`, `ngay_tao`, `ngay_sua`) VALUES
(1, 1, 'Tuyển lập trình viên Backend', 'Phát triển và bảo trì các API cho hệ thống.', 'Có kiến thức Node.js, Express.js, MySQL.', 'Môi trường làm việc chuyên nghiệp, đào tạo và phát triển kỹ năng.', '{\"noi_dung\":\"Kinh nghiệm Node.js, MySQL, REST API.\"}', 'da_duyet', 1, '2026-09-23 17:24:35', '2026-09-23 17:12:41', '2026-09-23 17:24:35');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `nguoi_dung`
--

CREATE TABLE `nguoi_dung` (
  `id` int(11) NOT NULL,
  `ho_ten` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `mat_khau` varchar(255) NOT NULL,
  `vai_tro` varchar(30) NOT NULL,
  `trang_thai` varchar(20) NOT NULL DEFAULT 'hoat_dong',
  `ngay_tao` datetime NOT NULL DEFAULT current_timestamp(),
  `ngay_sua` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Đang đổ dữ liệu cho bảng `nguoi_dung`
--

INSERT INTO `nguoi_dung` (`id`, `ho_ten`, `email`, `mat_khau`, `vai_tro`, `trang_thai`, `ngay_tao`, `ngay_sua`) VALUES
(1, 'Admin', 'admin@gmail.com', '123456', 'admin', 'hoat_dong', '2026-09-23 15:45:31', '2026-09-24 11:14:09'),
(2, 'Quản lý', 'manager@gmail.com', '123456', 'manager', 'hoat_dong', '2026-09-23 15:45:31', '2026-09-24 10:16:01'),
(3, 'Nhân sự', 'hr@gmail.com', '123456', 'hr', 'hoat_dong', '2026-09-23 15:45:31', '2026-09-24 10:16:06'),
(4, 'Phỏng vấn', 'interviewer@gmail.com', '123456', 'interviewer', 'hoat_dong', '2026-09-23 15:45:31', '2026-09-24 10:16:12'),
(5, 'Người xem', 'viewer@gmail.com', '123456', 'viewer', 'hoat_dong', '2026-09-23 15:45:31', '2026-09-24 10:19:28');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `nhat_ky`
--

CREATE TABLE `nhat_ky` (
  `id` int(11) NOT NULL,
  `nguoi_dung_id` int(11) DEFAULT NULL,
  `hanh_dong` varchar(100) NOT NULL,
  `loai` varchar(50) NOT NULL,
  `du_lieu_id` int(11) DEFAULT NULL,
  `chi_tiet` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`chi_tiet`)),
  `ip` varchar(45) DEFAULT NULL,
  `ngay_tao` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `phan_tich_ai`
--

CREATE TABLE `phan_tich_ai` (
  `id` int(11) NOT NULL,
  `ung_vien_id` int(11) NOT NULL,
  `cv_id` int(11) NOT NULL,
  `jd_id` int(11) NOT NULL,
  `du_lieu` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`du_lieu`)),
  `diem` decimal(5,2) DEFAULT NULL,
  `tom_tat` text DEFAULT NULL,
  `diem_manh` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`diem_manh`)),
  `diem_yeu` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`diem_yeu`)),
  `canh_bao` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`canh_bao`)),
  `giai_thich` text DEFAULT NULL,
  `goi_y` text DEFAULT NULL,
  `model` varchar(100) DEFAULT NULL,
  `ngay_tao` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `phong_van`
--

CREATE TABLE `phong_van` (
  `id` int(11) NOT NULL,
  `ung_vien_id` int(11) NOT NULL,
  `nguoi_tao` int(11) NOT NULL,
  `nguoi_phong_van` int(11) NOT NULL,
  `bat_dau` datetime NOT NULL,
  `ket_thuc` datetime DEFAULT NULL,
  `hinh_thuc` varchar(30) NOT NULL,
  `dia_diem` varchar(255) DEFAULT NULL,
  `trang_thai` varchar(30) NOT NULL DEFAULT 'da_len_lich',
  `ghi_chu` text DEFAULT NULL,
  `ngay_tao` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `quyet_dinh`
--

CREATE TABLE `quyet_dinh` (
  `id` int(11) NOT NULL,
  `ung_vien_id` int(11) NOT NULL,
  `nguoi_quyet_dinh` int(11) NOT NULL,
  `ket_qua` varchar(30) NOT NULL,
  `ly_do` text DEFAULT NULL,
  `ngay_tao` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `thanh_vien`
--

CREATE TABLE `thanh_vien` (
  `id` int(11) NOT NULL,
  `dot_tuyen_id` int(11) NOT NULL,
  `nguoi_dung_id` int(11) NOT NULL,
  `vai_tro` varchar(30) NOT NULL,
  `ngay_them` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `thong_bao`
--

CREATE TABLE `thong_bao` (
  `id` int(11) NOT NULL,
  `nguoi_dung_id` int(11) NOT NULL,
  `tieu_de` varchar(200) NOT NULL,
  `noi_dung` text NOT NULL,
  `loai` varchar(50) DEFAULT NULL,
  `da_doc` tinyint(1) NOT NULL DEFAULT 0,
  `ngay_tao` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ung_vien`
--

CREATE TABLE `ung_vien` (
  `id` int(11) NOT NULL,
  `dot_tuyen_id` int(11) NOT NULL,
  `ho_ten` varchar(100) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `sdt` varchar(20) DEFAULT NULL,
  `nguon` varchar(50) DEFAULT NULL,
  `trang_thai` varchar(40) NOT NULL DEFAULT 'moi',
  `ghi_chu` text DEFAULT NULL,
  `ngay_tao` datetime NOT NULL DEFAULT current_timestamp(),
  `ngay_sua` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `cv`
--
ALTER TABLE `cv`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cv_ung_vien` (`ung_vien_id`),
  ADD KEY `idx_cv_nguoi_tai` (`nguoi_tai`);

--
-- Chỉ mục cho bảng `danh_gia`
--
ALTER TABLE `danh_gia`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_danh_gia` (`phong_van_id`,`nguoi_danh_gia`),
  ADD KEY `idx_danh_gia_phong_van` (`phong_van_id`),
  ADD KEY `idx_danh_gia_nguoi` (`nguoi_danh_gia`),
  ADD KEY `idx_danh_gia_diem` (`diem`);

--
-- Chỉ mục cho bảng `dot_tuyen`
--
ALTER TABLE `dot_tuyen`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_dot_tuyen_trang_thai` (`trang_thai`),
  ADD KEY `idx_dot_tuyen_nguoi_tao` (`nguoi_tao`);

--
-- Chỉ mục cho bảng `jd`
--
ALTER TABLE `jd`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_jd_dot_tuyen` (`dot_tuyen_id`),
  ADD KEY `idx_jd_trang_thai` (`trang_thai`),
  ADD KEY `idx_jd_nguoi_duyet` (`nguoi_duyet`);

--
-- Chỉ mục cho bảng `nguoi_dung`
--
ALTER TABLE `nguoi_dung`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_nguoi_dung_vai_tro` (`vai_tro`),
  ADD KEY `idx_nguoi_dung_trang_thai` (`trang_thai`);

--
-- Chỉ mục cho bảng `nhat_ky`
--
ALTER TABLE `nhat_ky`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_nhat_ky_nguoi_dung` (`nguoi_dung_id`),
  ADD KEY `idx_nhat_ky_loai` (`loai`),
  ADD KEY `idx_nhat_ky_du_lieu` (`du_lieu_id`),
  ADD KEY `idx_nhat_ky_ngay_tao` (`ngay_tao`);

--
-- Chỉ mục cho bảng `phan_tich_ai`
--
ALTER TABLE `phan_tich_ai`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ai_ung_vien` (`ung_vien_id`),
  ADD KEY `idx_ai_cv` (`cv_id`),
  ADD KEY `idx_ai_jd` (`jd_id`),
  ADD KEY `idx_ai_diem` (`diem`);

--
-- Chỉ mục cho bảng `phong_van`
--
ALTER TABLE `phong_van`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_phong_van_ung_vien` (`ung_vien_id`),
  ADD KEY `idx_phong_van_nguoi_tao` (`nguoi_tao`),
  ADD KEY `idx_phong_van_nguoi_pv` (`nguoi_phong_van`),
  ADD KEY `idx_phong_van_thoi_gian` (`bat_dau`),
  ADD KEY `idx_phong_van_trang_thai` (`trang_thai`);

--
-- Chỉ mục cho bảng `quyet_dinh`
--
ALTER TABLE `quyet_dinh`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_quyet_dinh_ung_vien` (`ung_vien_id`),
  ADD KEY `idx_quyet_dinh_nguoi` (`nguoi_quyet_dinh`),
  ADD KEY `idx_quyet_dinh_ket_qua` (`ket_qua`);

--
-- Chỉ mục cho bảng `thanh_vien`
--
ALTER TABLE `thanh_vien`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_thanh_vien` (`dot_tuyen_id`,`nguoi_dung_id`),
  ADD KEY `idx_thanh_vien_dot_tuyen` (`dot_tuyen_id`),
  ADD KEY `idx_thanh_vien_nguoi_dung` (`nguoi_dung_id`);

--
-- Chỉ mục cho bảng `thong_bao`
--
ALTER TABLE `thong_bao`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_thong_bao_nguoi_dung` (`nguoi_dung_id`),
  ADD KEY `idx_thong_bao_da_doc` (`da_doc`),
  ADD KEY `idx_thong_bao_ngay_tao` (`ngay_tao`);

--
-- Chỉ mục cho bảng `ung_vien`
--
ALTER TABLE `ung_vien`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ung_vien_dot_tuyen` (`dot_tuyen_id`),
  ADD KEY `idx_ung_vien_email` (`email`),
  ADD KEY `idx_ung_vien_trang_thai` (`trang_thai`),
  ADD KEY `idx_ung_vien_ho_ten` (`ho_ten`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `cv`
--
ALTER TABLE `cv`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT cho bảng `danh_gia`
--
ALTER TABLE `danh_gia`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `dot_tuyen`
--
ALTER TABLE `dot_tuyen`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT cho bảng `jd`
--
ALTER TABLE `jd`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT cho bảng `nguoi_dung`
--
ALTER TABLE `nguoi_dung`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT cho bảng `nhat_ky`
--
ALTER TABLE `nhat_ky`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `phan_tich_ai`
--
ALTER TABLE `phan_tich_ai`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `phong_van`
--
ALTER TABLE `phong_van`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `quyet_dinh`
--
ALTER TABLE `quyet_dinh`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `thanh_vien`
--
ALTER TABLE `thanh_vien`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `thong_bao`
--
ALTER TABLE `thong_bao`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `ung_vien`
--
ALTER TABLE `ung_vien`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Các ràng buộc cho các bảng đã đổ
--

--
-- Các ràng buộc cho bảng `cv`
--
ALTER TABLE `cv`
  ADD CONSTRAINT `fk_cv_nguoi_tai` FOREIGN KEY (`nguoi_tai`) REFERENCES `nguoi_dung` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_cv_ung_vien` FOREIGN KEY (`ung_vien_id`) REFERENCES `ung_vien` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `danh_gia`
--
ALTER TABLE `danh_gia`
  ADD CONSTRAINT `fk_danh_gia_nguoi` FOREIGN KEY (`nguoi_danh_gia`) REFERENCES `nguoi_dung` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_danh_gia_phong_van` FOREIGN KEY (`phong_van_id`) REFERENCES `phong_van` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `dot_tuyen`
--
ALTER TABLE `dot_tuyen`
  ADD CONSTRAINT `fk_dot_tuyen_nguoi_tao` FOREIGN KEY (`nguoi_tao`) REFERENCES `nguoi_dung` (`id`) ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `jd`
--
ALTER TABLE `jd`
  ADD CONSTRAINT `fk_jd_dot_tuyen` FOREIGN KEY (`dot_tuyen_id`) REFERENCES `dot_tuyen` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_jd_nguoi_duyet` FOREIGN KEY (`nguoi_duyet`) REFERENCES `nguoi_dung` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `nhat_ky`
--
ALTER TABLE `nhat_ky`
  ADD CONSTRAINT `fk_nhat_ky_nguoi_dung` FOREIGN KEY (`nguoi_dung_id`) REFERENCES `nguoi_dung` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `phan_tich_ai`
--
ALTER TABLE `phan_tich_ai`
  ADD CONSTRAINT `fk_ai_cv` FOREIGN KEY (`cv_id`) REFERENCES `cv` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ai_jd` FOREIGN KEY (`jd_id`) REFERENCES `jd` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ai_ung_vien` FOREIGN KEY (`ung_vien_id`) REFERENCES `ung_vien` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `phong_van`
--
ALTER TABLE `phong_van`
  ADD CONSTRAINT `fk_phong_van_nguoi_pv` FOREIGN KEY (`nguoi_phong_van`) REFERENCES `nguoi_dung` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_phong_van_nguoi_tao` FOREIGN KEY (`nguoi_tao`) REFERENCES `nguoi_dung` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_phong_van_ung_vien` FOREIGN KEY (`ung_vien_id`) REFERENCES `ung_vien` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `quyet_dinh`
--
ALTER TABLE `quyet_dinh`
  ADD CONSTRAINT `fk_quyet_dinh_nguoi` FOREIGN KEY (`nguoi_quyet_dinh`) REFERENCES `nguoi_dung` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_quyet_dinh_ung_vien` FOREIGN KEY (`ung_vien_id`) REFERENCES `ung_vien` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `thanh_vien`
--
ALTER TABLE `thanh_vien`
  ADD CONSTRAINT `fk_thanh_vien_dot_tuyen` FOREIGN KEY (`dot_tuyen_id`) REFERENCES `dot_tuyen` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_thanh_vien_nguoi_dung` FOREIGN KEY (`nguoi_dung_id`) REFERENCES `nguoi_dung` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `thong_bao`
--
ALTER TABLE `thong_bao`
  ADD CONSTRAINT `fk_thong_bao_nguoi_dung` FOREIGN KEY (`nguoi_dung_id`) REFERENCES `nguoi_dung` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Các ràng buộc cho bảng `ung_vien`
--
ALTER TABLE `ung_vien`
  ADD CONSTRAINT `fk_ung_vien_dot_tuyen` FOREIGN KEY (`dot_tuyen_id`) REFERENCES `dot_tuyen` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
