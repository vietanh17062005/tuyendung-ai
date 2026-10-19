const express = require('express');
const nodemailer = require('nodemailer');
const db = require('../database/db');
const { kiemTraDangNhap } = require('../middleware/auth');
const router = express.Router();

const ROLES = {
  interviewer: ['interviewer', 'interview', 'nguoi_phong_van', 'nguoiphongvan', 'phong_van'],
  manager: ['admin', 'administrator', 'manager', 'quan_ly', 'leader', 'team_leader'],
  hr: ['hr', 'recruiter', 'nhan_su', 'nhan_su_tuyen_dung'],
};
const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\s-]+/g, '_').trim();
const role = req => norm(req.nguoiDung?.vai_tro || req.nguoiDung?.role);
const hasRole = (req, key) => ROLES[key].includes(role(req));
const canManage = req => hasRole(req, 'manager');
const canHr = req => hasRole(req, 'hr') || hasRole(req, 'manager');
const userId = req => Number(req.nguoiDung?.id || req.nguoiDung?.nguoi_dung_id || 0);
let schemaPromise;

async function ensureSchema() {
  if (!schemaPromise) schemaPromise = (async () => {
    const [pvColumns] = await db.query('SHOW COLUMNS FROM phong_van');
    const pvNames = new Set(pvColumns.map(c => c.Field));
    if (!pvNames.has('vong_phong_van')) await db.query("ALTER TABLE phong_van ADD COLUMN vong_phong_van VARCHAR(100) NOT NULL DEFAULT 'Vòng 1'");
    await db.query(`CREATE TABLE IF NOT EXISTS phong_van_nguoi_tham_gia (
      phong_van_id BIGINT NOT NULL, nguoi_dung_id BIGINT NOT NULL, ngay_tao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (phong_van_id, nguoi_dung_id), KEY idx_pv_tham_gia_nguoi_dung (nguoi_dung_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await db.query(`CREATE TABLE IF NOT EXISTS tieu_chi_danh_gia (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      ten VARCHAR(150) NOT NULL,
      mo_ta VARCHAR(500) NULL,
      trong_so DECIMAL(5,2) NOT NULL DEFAULT 1,
      diem_toi_da DECIMAL(5,2) NOT NULL DEFAULT 10,
      dang_dung TINYINT(1) NOT NULL DEFAULT 1,
      thu_tu INT NOT NULL DEFAULT 0,
      ngay_tao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await db.query(`CREATE TABLE IF NOT EXISTS danh_gia_phong_van (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await db.query(`CREATE TABLE IF NOT EXISTS quyet_dinh_phong_van (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    // Add the campaign column and its index in separate statements.
    // Some MySQL/MariaDB-compatible servers fail when ADD COLUMN and ADD KEY
    // referencing that new column are combined in one ALTER TABLE statement.
    const [criterionColumns] = await db.query('SHOW COLUMNS FROM tieu_chi_danh_gia');
    if (!criterionColumns.some(c => c.Field === 'dot_tuyen_id')) {
      await db.query('ALTER TABLE tieu_chi_danh_gia ADD COLUMN dot_tuyen_id INT NULL');
    }
    const [criterionIndexes] = await db.query('SHOW INDEX FROM tieu_chi_danh_gia');
    if (!criterionIndexes.some(i => i.Key_name === 'idx_tieu_chi_dot_tuyen')) {
      await db.query('ALTER TABLE tieu_chi_danh_gia ADD INDEX idx_tieu_chi_dot_tuyen (dot_tuyen_id)');
    }
    const [legacy] = await db.query("SELECT COUNT(*) AS n FROM tieu_chi_danh_gia WHERE dot_tuyen_id IS NULL AND ten='Chuyên môn' AND dang_dung=1");
    if (Number(legacy[0]?.n)) await db.query('UPDATE tieu_chi_danh_gia SET dang_dung=0 WHERE dot_tuyen_id IS NULL');
    const [rows] = await db.query('SELECT COUNT(*) AS n FROM tieu_chi_danh_gia WHERE dot_tuyen_id IS NULL AND dang_dung=1');
    if (!Number(rows[0]?.n)) {
      await db.query(`INSERT INTO tieu_chi_danh_gia (dot_tuyen_id,ten,mo_ta,trong_so,diem_toi_da,thu_tu) VALUES
        (NULL,'Kỹ năng giao tiếp','Diễn đạt rõ ràng, lắng nghe và trao đổi thông tin',25,10,1),
        (NULL,'Thái độ và tinh thần cầu tiến','Tinh thần học hỏi, tiếp nhận góp ý',25,10,2),
        (NULL,'Khả năng làm việc nhóm','Phối hợp và chia sẻ thông tin với đồng đội',20,10,3),
        (NULL,'Tính cẩn thận, trách nhiệm','Chủ động và có trách nhiệm với công việc',30,10,4)`);
    }
  })().catch(e => { schemaPromise = null; throw e; });
  return schemaPromise;
}
async function layLich(id) {
  const [uvColumns] = await db.query('SHOW COLUMNS FROM ung_vien');
  const uvNames = new Set(uvColumns.map(c => c.Field));
  const [dtColumns] = await db.query('SHOW COLUMNS FROM dot_tuyen');
  const dtNames = new Set(dtColumns.map(c => c.Field));
  const campaignName = dtNames.has('ten') ? 'ten' : (dtNames.has('ten_dot') ? 'ten_dot' : null);
  const campaignJoin = uvNames.has('dot_tuyen_id') && campaignName
    ? `LEFT JOIN dot_tuyen dt ON dt.id=uv.dot_tuyen_id`
    : '';
  const campaignExpr = campaignJoin ? `dt.${campaignName} AS ten_dot_tuyen` : `NULL AS ten_dot_tuyen`;
  const [rows] = await db.query(`SELECT pv.id, pv.ung_vien_id, pv.vong_phong_van,
    uv.ho_ten AS ten_ung_vien, uv.email AS email_ung_vien,
    ${campaignExpr}
    FROM phong_van pv
    JOIN ung_vien uv ON uv.id=pv.ung_vien_id
    ${campaignJoin}
    WHERE pv.id=? LIMIT 1`, [id]);
  return rows[0] || null;
}
async function duocPhanCong(req, id) {
  if (canManage(req) || canHr(req)) return true;
  if (!hasRole(req, 'interviewer')) return false;
  const uid = userId(req);
  const [many] = await db.query('SELECT 1 FROM phong_van_nguoi_tham_gia WHERE phong_van_id=? AND nguoi_dung_id=? LIMIT 1', [id, uid]);
  if (many.length) return true;
  const [cols] = await db.query('SHOW COLUMNS FROM phong_van');
  const names = new Set(cols.map(c => c.Field));
  const col = ['nguoi_phong_van_id','nguoi_phong_van','interviewer_id'].find(x => names.has(x));
  if (!col) return false;
  const [rows] = await db.query(`SELECT id FROM phong_van WHERE id=? AND ${col}=? LIMIT 1`, [id, uid]);
  return rows.length > 0;
}
function safeText(v, max=5000) { return String(v ?? '').trim().slice(0,max); }
function escapeHtml(v) { return String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])); }
function taoEmailDeXuat(lich, suggestion) {
  const templates = {
    dat:{subject:'Thông báo kết quả tuyển dụng',label:'Đạt vòng phỏng vấn',body:'Chúng tôi vui mừng thông báo bạn đã đạt yêu cầu ở vòng phỏng vấn này. Bộ phận Tuyển dụng sẽ liên hệ để trao đổi về các bước tiếp theo.'},
    rot:{subject:'Thông báo kết quả tuyển dụng',label:'Chưa phù hợp ở vòng này',body:'Sau khi xem xét hồ sơ và kết quả phỏng vấn, rất tiếc chúng tôi chưa thể tiếp tục quy trình tuyển dụng với bạn ở thời điểm này. Chúng tôi trân trọng sự quan tâm của bạn và hy vọng sẽ có cơ hội hợp tác trong tương lai.'},
    can_nhac:{subject:'Thông báo cập nhật kết quả tuyển dụng',label:'Đang được cân nhắc',body:'Hồ sơ và kết quả phỏng vấn của bạn hiện đang được bộ phận Tuyển dụng xem xét thêm. Chúng tôi sẽ chủ động liên hệ với bạn ngay khi có cập nhật tiếp theo.'},
    vong_tiep:{subject:'Thông báo kết quả tuyển dụng',label:'Được đề xuất vào vòng tiếp theo',body:'Chúng tôi vui mừng thông báo bạn được đề xuất tiếp tục quy trình tuyển dụng ở vòng tiếp theo. Bộ phận Tuyển dụng sẽ liên hệ để trao đổi thời gian và thông tin chi tiết.'}
  };
  const tpl=templates[suggestion]; if(!tpl) return null;
  const campaign=safeText(lich.ten_dot_tuyen||'Đợt tuyển dụng',200), round=safeText(lich.vong_phong_van||'Vòng phỏng vấn',100), candidate=safeText(lich.ten_ung_vien||'Ứng viên',150);
  const body=`Chào ${candidate},\n\nCảm ơn bạn đã quan tâm và ứng tuyển trong đợt tuyển dụng ${campaign}, đồng thời dành thời gian tham gia ${round}.\n\nKết quả hiện tại của bạn: ${tpl.label}.\n\n${tpl.body}\n\nChúng tôi chân thành cảm ơn sự quan tâm, thời gian và nỗ lực bạn đã dành cho quy trình tuyển dụng. Chúc bạn luôn thành công trong công việc và những cơ hội sắp tới.\n\nTrân trọng,\nBộ phận Tuyển dụng`;
  return {subject:`${tpl.subject} – ${campaign}`, body, label:tpl.label};
}

router.use(kiemTraDangNhap);

router.get('/dot-tuyen', async (req,res) => {
  try {
    await ensureSchema();
    // Hỗ trợ cả hai phiên bản schema: ten và ten_dot.
    const [columns] = await db.query('SHOW COLUMNS FROM dot_tuyen');
    const names = new Set(columns.map(c => c.Field));
    const nameColumn = names.has('ten') ? 'ten' : (names.has('ten_dot') ? 'ten_dot' : null);
    if (!nameColumn || !names.has('id')) {
      throw new Error('Bảng dot_tuyen thiếu cột id hoặc ten/ten_dot.');
    }
    const statusExpr = names.has('trang_thai') ? 'trang_thai' : "'nhap'";
    const orderExpr = names.has('ngay_tao') ? 'ngay_tao DESC, id DESC' : 'id DESC';
    const [rows] = await db.query(`SELECT id, ${nameColumn} AS ten, ${statusExpr} AS trang_thai FROM dot_tuyen ORDER BY ${orderExpr}`);
    res.json(rows);
  } catch(e) {
    console.error('[GET /api/danh-gia/dot-tuyen]', e);
    res.status(500).json({message:'Không tải được danh sách đợt tuyển dụng. Kiểm tra cấu trúc bảng dot_tuyen trong cơ sở dữ liệu.'});
  }
});

router.get('/tieu-chi', async (req,res) => {
  try {
    await ensureSchema();
    const dotTuyenId = Number(req.query.dot_tuyen_id);
    if (!Number.isInteger(dotTuyenId) || dotTuyenId < 1) return res.status(400).json({message:'Vui lòng chọn đợt tuyển dụng để xem bộ tiêu chí.'});
    let [rows] = await db.query('SELECT id,ten,mo_ta,trong_so,diem_toi_da,dang_dung FROM tieu_chi_danh_gia WHERE dot_tuyen_id=? ORDER BY thu_tu,id', [dotTuyenId]);
    if (!rows.length) {
      const [template] = await db.query('SELECT ten,mo_ta,trong_so,diem_toi_da,thu_tu FROM tieu_chi_danh_gia WHERE dot_tuyen_id IS NULL AND dang_dung=1 ORDER BY thu_tu,id');
      if (template.length) {
        for (const c of template) await db.query('INSERT INTO tieu_chi_danh_gia (dot_tuyen_id,ten,mo_ta,trong_so,diem_toi_da,thu_tu,dang_dung) VALUES (?,?,?,?,?,?,1)', [dotTuyenId,c.ten,c.mo_ta,c.trong_so,c.diem_toi_da,c.thu_tu]);
      }
      [rows] = await db.query('SELECT id,ten,mo_ta,trong_so,diem_toi_da,dang_dung FROM tieu_chi_danh_gia WHERE dot_tuyen_id=? ORDER BY thu_tu,id', [dotTuyenId]);
    }
    res.json(rows);
  } catch(e) { console.error(e); res.status(500).json({message:'Không tải được tiêu chí đánh giá.'}); }
});

router.post('/tieu-chi', async (req,res) => {
  try { await ensureSchema(); if(!canManage(req)) return res.status(403).json({message:'Chỉ Manager/Leader hoặc Admin được cấu hình tiêu chí.'});
    const dotTuyenId=Number(req.body?.dot_tuyen_id), ten=safeText(req.body?.ten,150), moTa=safeText(req.body?.mo_ta,500), trongSo=Number(req.body?.trong_so), max=Number(req.body?.diem_toi_da);
    if(!Number.isInteger(dotTuyenId)||dotTuyenId<1||!ten||!Number.isFinite(trongSo)||trongSo<=0||trongSo>100||!Number.isFinite(max)||max<=0||max>10) return res.status(400).json({message:'Vui lòng chọn đợt tuyển dụng và nhập tiêu chí hợp lệ.'});
    const [r]=await db.query('INSERT INTO tieu_chi_danh_gia (dot_tuyen_id,ten,mo_ta,trong_so,diem_toi_da,thu_tu) VALUES (?,?,?,?,?,?)',[dotTuyenId,ten,moTa,trongSo,max,Date.now()%100000]); res.status(201).json({message:'Đã thêm tiêu chí cho đợt tuyển dụng.',id:r.insertId});
  } catch(e) { console.error(e); res.status(500).json({message:'Không thêm được tiêu chí.'}); }
});
router.put('/tieu-chi/:id', async (req,res) => {
  try { await ensureSchema(); if(!canManage(req)) return res.status(403).json({message:'Chỉ Manager/Leader hoặc Admin được cấu hình tiêu chí.'});
    const id=Number(req.params.id),dotTuyenId=Number(req.body?.dot_tuyen_id),ten=safeText(req.body?.ten,150),moTa=safeText(req.body?.mo_ta,500),trongSo=Number(req.body?.trong_so),max=Number(req.body?.diem_toi_da);
    if(!Number.isInteger(id)||id<1||!Number.isInteger(dotTuyenId)||dotTuyenId<1||!ten||!Number.isFinite(trongSo)||trongSo<=0||trongSo>100||!Number.isFinite(max)||max<=0||max>10) return res.status(400).json({message:'Thông tin tiêu chí không hợp lệ.'});
    const [r]=await db.query('UPDATE tieu_chi_danh_gia SET ten=?,mo_ta=?,trong_so=?,diem_toi_da=? WHERE id=? AND dot_tuyen_id=? AND dang_dung=1',[ten,moTa,trongSo,max,id,dotTuyenId]); if(!r.affectedRows) return res.status(404).json({message:'Không tìm thấy tiêu chí thuộc đợt tuyển dụng này.'}); res.json({message:'Đã cập nhật tiêu chí.'});
  } catch(e) { console.error(e); res.status(500).json({message:'Không cập nhật được tiêu chí.'}); }
});
router.delete('/tieu-chi/:id', async (req,res) => {
  try { await ensureSchema(); if(!canManage(req)) return res.status(403).json({message:'Chỉ Manager/Leader hoặc Admin được cấu hình tiêu chí.'}); const id=Number(req.params.id),dotTuyenId=Number(req.query.dot_tuyen_id); if(!Number.isInteger(id)||id<1||!Number.isInteger(dotTuyenId)||dotTuyenId<1) return res.status(400).json({message:'ID tiêu chí hoặc đợt tuyển dụng không hợp lệ.'}); const [r]=await db.query('UPDATE tieu_chi_danh_gia SET dang_dung=0 WHERE id=? AND dot_tuyen_id=?',[id,dotTuyenId]); if(!r.affectedRows) return res.status(404).json({message:'Không tìm thấy tiêu chí.'}); res.json({message:'Đã ngừng sử dụng tiêu chí.'}); }
  catch(e) { console.error(e); res.status(500).json({message:'Không ngừng sử dụng được tiêu chí.'}); }
});

router.get('/lich', async (req,res) => {
  try {
    await ensureSchema();
    let sql = `SELECT pv.id AS phong_van_id,pv.ung_vien_id,pv.vong_phong_van,pv.trang_thai,
      pv.ten_ung_vien,pv.thoi_gian,pv.bat_dau,uv.ho_ten AS ten_ung_vien_db,uv.email AS email_ung_vien
      FROM phong_van pv JOIN ung_vien uv ON uv.id=pv.ung_vien_id`;
    // Support the different schedule schemas used by earlier project versions.
    const [cols] = await db.query('SHOW COLUMNS FROM phong_van'); const names = new Set(cols.map(c=>c.Field));
    const timeCol = ['bat_dau','thoi_gian','thoi_gian_bat_dau','ngay_gio_phong_van','ngay_phong_van'].find(x=>names.has(x));
    // Tên cột đợt tuyển dụng có thể là `ten` hoặc `ten_dot` tùy phiên bản CSDL.
    const [dotColumns] = await db.query('SHOW COLUMNS FROM dot_tuyen');
    const dotNames = new Set(dotColumns.map(c => c.Field));
    const dotNameColumn = dotNames.has('ten') ? 'ten' : (dotNames.has('ten_dot') ? 'ten_dot' : null);
    if (!dotNameColumn) throw new Error('Bảng dot_tuyen không có cột tên ten hoặc ten_dot.');
    if (!dotNames.has('id')) throw new Error('Bảng dot_tuyen không có cột id.');
    const [uvColumns] = await db.query('SHOW COLUMNS FROM ung_vien');
    const uvNames = new Set(uvColumns.map(c => c.Field));
    if (!uvNames.has('dot_tuyen_id')) throw new Error('Bảng ung_vien không có cột dot_tuyen_id.');
    sql = `SELECT pv.id AS phong_van_id,pv.ung_vien_id,uv.dot_tuyen_id,dt.${dotNameColumn} AS ten_dot_tuyen,${names.has('vong_phong_van')?'pv.vong_phong_van':"'Vòng 1' AS vong_phong_van"},${names.has('trang_thai')?'pv.trang_thai':"'' AS trang_thai"},${names.has('hinh_thuc')?'pv.hinh_thuc':"'' AS hinh_thuc"},${names.has('dia_diem')?'pv.dia_diem':"'' AS dia_diem"},uv.ho_ten AS ten_ung_vien,uv.email AS email_ung_vien,${timeCol?`pv.${timeCol}`:'NULL'} AS thoi_gian FROM phong_van pv JOIN ung_vien uv ON uv.id=pv.ung_vien_id JOIN dot_tuyen dt ON dt.id=uv.dot_tuyen_id`;
    const [rows] = await db.query(sql + ' ORDER BY thoi_gian DESC, pv.id DESC LIMIT 500');
    const out=[];
    for (const row of rows) if (await duocPhanCong(req,row.phong_van_id)) out.push(row);
    res.json(out);
  } catch(e) { console.error('GET /api/danh-gia/lich',e); res.status(500).json({message:'Không tải được danh sách lịch phỏng vấn.'}); }
});

router.get('/', async (req,res) => {
  try {
    await ensureSchema();
    const [rows] = await db.query(`SELECT dg.*,pv.ung_vien_id,uv.ho_ten AS ten_ung_vien,uv.email AS email_ung_vien,
      pv.vong_phong_van,nd.ho_ten AS ten_nguoi_danh_gia,qd.ket_qua AS quyet_dinh_cuoi,
      qd.ghi_chu AS ghi_chu_quyet_dinh,qd.nguoi_quyet_dinh_id,qd.email_trang_thai,qd.email_da_gui_luc
      FROM danh_gia_phong_van dg JOIN phong_van pv ON pv.id=dg.phong_van_id
      JOIN ung_vien uv ON uv.id=pv.ung_vien_id LEFT JOIN nguoi_dung nd ON nd.id=dg.nguoi_danh_gia_id
      LEFT JOIN quyet_dinh_phong_van qd ON qd.phong_van_id=pv.id ORDER BY dg.ngay_cap_nhat DESC`);
    const out=[];
    for (const row of rows) if (await duocPhanCong(req,row.phong_van_id)) {
      try { row.diem_json=JSON.parse(row.diem_json||'{}'); } catch { row.diem_json={}; }
      // Chuẩn hóa mọi tiêu chí về thang 10 trước khi áp dụng trọng số.
      // Nhờ vậy nếu một tiêu chí có điểm tối đa 8, đạt 8/8 vẫn tương đương 10/10.
      const detailValues=Object.values(row.diem_json||{});
      let weighted=0, weights=0;
      for (const item of detailValues) {
        const score=Number(item?.diem), max=Number(item?.diem_toi_da), weight=Number(item?.trong_so);
        if (Number.isFinite(score) && Number.isFinite(max) && max>0 && Number.isFinite(weight) && weight>0) {
          weighted += Math.min(10, Math.max(0, score/max*10))*weight;
          weights += weight;
        }
      }
      if (weights>0) {
        const normalizedTotal=Math.min(10, Math.max(0, Math.round((weighted/weights)*100)/100));
        const oldTotal=Number(row.diem_tong);
        row.diem_tong=normalizedTotal;
        // Đồng bộ cả các feedback cũ đã được lưu bằng công thức trước đây.
        if (!Number.isFinite(oldTotal) || Math.abs(oldTotal-normalizedTotal)>0.001) {
          await db.query('UPDATE danh_gia_phong_van SET diem_tong=? WHERE id=?',[normalizedTotal,row.id]);
        }
      }
      out.push(row);
    }
    res.json(out);
  } catch(e) { console.error('GET /api/danh-gia',e); res.status(500).json({message:'Không tải được feedback phỏng vấn.'}); }
});

router.post('/', async (req,res) => {
  try {
    await ensureSchema();
    const phongVanId=Number(req.body?.phong_van_id); if(!Number.isInteger(phongVanId)||phongVanId<1) return res.status(400).json({message:'Vui lòng chọn lịch phỏng vấn hợp lệ.'});
    if (!hasRole(req,'interviewer') && !canManage(req)) return res.status(403).json({message:'Chỉ người phỏng vấn được phân công mới có thể gửi feedback.'});
    if (!(await duocPhanCong(req,phongVanId))) return res.status(403).json({message:'Bạn không được phân công vào lịch phỏng vấn này.'});
    const [campaignRows]=await db.query('SELECT uv.dot_tuyen_id FROM phong_van pv JOIN ung_vien uv ON uv.id=pv.ung_vien_id WHERE pv.id=? LIMIT 1',[phongVanId]);
    const dotTuyenId=Number(campaignRows[0]?.dot_tuyen_id); if(!dotTuyenId) return res.status(400).json({message:'Không xác định được đợt tuyển dụng của ứng viên.'});
    const [criteria]=await db.query('SELECT id,ten,trong_so,diem_toi_da FROM tieu_chi_danh_gia WHERE dot_tuyen_id=? AND dang_dung=1 ORDER BY thu_tu,id',[dotTuyenId]);
    if(!criteria.length) return res.status(400).json({message:'Chưa cấu hình tiêu chí đánh giá.'});
    const scores=req.body?.diem && typeof req.body.diem==='object'?req.body.diem:{}; let weighted=0,weights=0; const detail={};
    for(const c of criteria){
      const n=Number(scores[c.id]), max=Number(c.diem_toi_da), weight=Number(c.trong_so);
      if(!Number.isFinite(n)||n<0||n>max) return res.status(400).json({message:`Điểm tiêu chí "${c.ten}" phải từ 0 đến ${c.diem_toi_da}.`});
      detail[c.id]={ten:c.ten,diem:n,trong_so:weight,diem_toi_da:max};
      // Quy đổi điểm theo thang 10 để điểm tổng luôn đạt tối đa 10/10.
      weighted += (n/max)*10*weight;
      weights += weight;
    }
    const total=weights?Math.min(10,Math.max(0,Math.round(weighted/weights*100)/100)):0;
    const suggestion=['dat','can_nhac','rot','vong_tiep'].includes(req.body?.de_xuat)?req.body.de_xuat:'can_nhac';
    const comment=safeText(req.body?.nhan_xet,5000); const uid=userId(req);
    await db.query(`INSERT INTO danh_gia_phong_van (phong_van_id,nguoi_danh_gia_id,diem_json,diem_tong,nhan_xet,de_xuat)
      VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE diem_json=VALUES(diem_json),diem_tong=VALUES(diem_tong),nhan_xet=VALUES(nhan_xet),de_xuat=VALUES(de_xuat),ngay_cap_nhat=CURRENT_TIMESTAMP`,[phongVanId,uid,JSON.stringify(detail),total,comment,suggestion]);
    // Cập nhật trạng thái ngay trong request lưu đánh giá để không phụ thuộc postMessage/iframe.
    await db.query(`UPDATE ung_vien uv JOIN phong_van pv ON pv.ung_vien_id=uv.id SET uv.trang_thai='da_phong_van' WHERE pv.id=?`,[phongVanId]);
    res.status(201).json({message:'Đã lưu đánh giá phỏng vấn và cập nhật trạng thái ứng viên.',diem_tong:total,trang_thai:'da_phong_van'});
  } catch(e) { console.error('POST /api/danh-gia',e); res.status(500).json({message:'Không lưu được feedback phỏng vấn.'}); }
});


// Đánh dấu ứng viên đã phỏng vấn sau khi đã lưu feedback.
router.post('/mark-interviewed/:id', async (req,res) => {
  try {
    await ensureSchema();
    const id=Number(req.params.id);
    if(!Number.isInteger(id)||id<1) return res.status(400).json({message:'Lịch phỏng vấn không hợp lệ.'});
    if (!hasRole(req,'interviewer') && !canManage(req)) return res.status(403).json({message:'Không có quyền cập nhật trạng thái.'});
    if (!(await duocPhanCong(req,id))) return res.status(403).json({message:'Bạn không được phân công vào lịch phỏng vấn này.'});
    await db.query(`UPDATE ung_vien uv JOIN phong_van pv ON pv.ung_vien_id=uv.id SET uv.trang_thai='da_phong_van' WHERE pv.id=?`,[id]);
    res.json({message:'Đã cập nhật trạng thái ứng viên.'});
  } catch(e) { console.error('POST /api/danh-gia/mark-interviewed',e); res.status(500).json({message:'Không cập nhật được trạng thái ứng viên.'}); }
});

router.get('/:id/email-de-xuat', async (req,res) => {
  try {
    await ensureSchema();
    const id=Number(req.params.id);
    if(!Number.isInteger(id)||id<1) return res.status(400).json({message:'Lịch phỏng vấn không hợp lệ.'});
    if (!(await duocPhanCong(req,id))) return res.status(403).json({message:'Bạn không được phân công vào lịch phỏng vấn này.'});
    const lich=await layLich(id); if(!lich) return res.status(404).json({message:'Không tìm thấy lịch phỏng vấn.'});
    if(!lich.email_ung_vien) return res.status(400).json({message:'Ứng viên chưa có email.'});
    const [rows]=await db.query('SELECT de_xuat FROM danh_gia_phong_van WHERE phong_van_id=? ORDER BY ngay_cap_nhat DESC,id DESC LIMIT 1',[id]);
    if(!rows.length) return res.status(400).json({message:'Vui lòng lưu đánh giá trước khi gửi mail.'});
    const draft=taoEmailDeXuat(lich,rows[0].de_xuat); if(!draft) return res.status(400).json({message:'Đề xuất đánh giá chưa hợp lệ.'});
    res.json({to:lich.email_ung_vien,ten_ung_vien:lich.ten_ung_vien,subject:draft.subject,body:draft.body,label:draft.label});
  } catch(e) { console.error('GET /api/danh-gia/:id/email-de-xuat',e); res.status(500).json({message:e.message||'Không tạo được bản nháp email.'}); }
});

router.post('/:id/gui-email-de-xuat', async (req,res) => {
  try {
    await ensureSchema();
    const id=Number(req.params.id);
    if(!Number.isInteger(id)||id<1) return res.status(400).json({message:'Lịch phỏng vấn không hợp lệ.'});
    if (!(await duocPhanCong(req,id))) return res.status(403).json({message:'Bạn không được phân công vào lịch phỏng vấn này.'});
    const lich=await layLich(id); if(!lich) return res.status(404).json({message:'Không tìm thấy lịch phỏng vấn.'});
    if(!lich.email_ung_vien) return res.status(400).json({message:'Ứng viên chưa có email.'});
    const [rows]=await db.query('SELECT de_xuat FROM danh_gia_phong_van WHERE phong_van_id=? ORDER BY ngay_cap_nhat DESC,id DESC LIMIT 1',[id]);
    if(!rows.length) return res.status(400).json({message:'Vui lòng lưu đánh giá trước khi gửi mail.'});
    const draft=taoEmailDeXuat(lich,rows[0].de_xuat); if(!draft) return res.status(400).json({message:'Đề xuất đánh giá chưa hợp lệ.'});
    const subject=safeText(req.body?.subject||draft.subject,250);
    const text=safeText(req.body?.body||draft.body,12000);
    if(!subject||!text) return res.status(400).json({message:'Tiêu đề và nội dung email không được để trống.'});
    const email=String(process.env.GMAIL_USER||'').trim(), pass=String(process.env.GMAIL_APP_PASSWORD||'').replace(/\s+/g,'');
    if(!email||!pass) throw new Error('Thiếu GMAIL_USER hoặc GMAIL_APP_PASSWORD trong file .env.');
    const html=`<div style="margin:0;background:#f4f6fa;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;color:#243047"><div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e3e8f0;border-radius:12px;overflow:hidden"><div style="background:#173b68;padding:24px 30px;color:#fff"><h2 style="margin:8px 0 0;font-size:22px">${escapeHtml(subject)}</h2></div><div style="padding:28px 30px;font-size:15px;line-height:1.75;white-space:pre-line">${escapeHtml(text)}</div><div style="padding:14px 30px;background:#f8fafc;border-top:1px solid #e8edf4;color:#718096;font-size:12px">Email thông báo kết quả tuyển dụng từ Bộ phận Tuyển dụng.</div></div></div>`;
    const transporter=nodemailer.createTransport({service:'gmail',auth:{user:email,pass}});
    await transporter.sendMail({from:email,to:lich.email_ung_vien,subject,text,html});
    res.json({message:'Đã gửi mail kết quả cho ứng viên.'});
  } catch(e) { console.error('POST /api/danh-gia/:id/gui-email-de-xuat',e); res.status(500).json({message:e.message||'Gửi mail kết quả thất bại.'}); }
});

router.post('/:id/quyet-dinh', async (req,res) => {
  try {
    await ensureSchema(); if(!canManage(req)) return res.status(403).json({message:'Chỉ Manager/Leader hoặc Admin được ra quyết định cuối.'});
    const id=Number(req.params.id), ketQua=req.body?.ket_qua; if(!Number.isInteger(id)||id<1||!['dat','can_nhac','rot','vong_tiep'].includes(ketQua)) return res.status(400).json({message:'Thông tin quyết định chưa hợp lệ.'});
    const lich=await layLich(id); if(!lich) return res.status(404).json({message:'Không tìm thấy lịch phỏng vấn.'});
    const [feedbackCount]=await db.query('SELECT COUNT(*) AS n FROM danh_gia_phong_van WHERE phong_van_id=?',[id]);
    if(!Number(feedbackCount[0]?.n)) return res.status(400).json({message:'Chưa có feedback. Cần ít nhất một người phỏng vấn gửi đánh giá trước khi ra quyết định.'});
    await db.query(`INSERT INTO quyet_dinh_phong_van (phong_van_id,ung_vien_id,nguoi_quyet_dinh_id,ket_qua,ghi_chu,email_trang_thai)
      VALUES (?,?,?,?,?,'chua_gui') ON DUPLICATE KEY UPDATE ung_vien_id=VALUES(ung_vien_id),nguoi_quyet_dinh_id=VALUES(nguoi_quyet_dinh_id),ket_qua=VALUES(ket_qua),ghi_chu=VALUES(ghi_chu),email_trang_thai='chua_gui',email_loi=NULL`,[id,lich.ung_vien_id,userId(req),ketQua,safeText(req.body?.ghi_chu,5000)]);
    res.json({message:'Đã lưu quyết định cuối cùng.'});
  } catch(e) { console.error('POST /api/danh-gia/:id/quyet-dinh',e); res.status(500).json({message:'Không lưu được quyết định cuối.'}); }
});

router.get('/:id/email-ket-qua', async (req,res) => {
  try {
    await ensureSchema(); if(!canHr(req)) return res.status(403).json({message:'Chỉ HR hoặc quản lý được gửi kết quả cho ứng viên.'});
    const id=Number(req.params.id); const lich=await layLich(id); if(!lich) return res.status(404).json({message:'Không tìm thấy lịch phỏng vấn.'});
    if(!lich.email_ung_vien) return res.status(400).json({message:'Ứng viên chưa có email.'});
    const [rows]=await db.query('SELECT * FROM quyet_dinh_phong_van WHERE phong_van_id=? LIMIT 1',[id]); const decision=rows[0];
    if(!decision) return res.status(400).json({message:'Manager/Leader cần lưu quyết định cuối trước khi gửi email.'});
    const labels={dat:'Đạt vòng phỏng vấn',can_nhac:'Đang được cân nhắc',rot:'Chưa phù hợp ở vòng này',vong_tiep:'Được mời tiếp tục quy trình tuyển dụng ở vòng tiếp theo'};
    const explanations={dat:'Chúng tôi vui mừng thông báo bạn đã đạt yêu cầu ở vòng phỏng vấn này. Bộ phận Tuyển dụng sẽ liên hệ để trao đổi về các bước tiếp theo.',can_nhac:'Hồ sơ và kết quả phỏng vấn của bạn hiện đang được bộ phận Tuyển dụng xem xét thêm. Chúng tôi sẽ chủ động liên hệ với bạn ngay khi có cập nhật tiếp theo.',rot:'Sau khi xem xét hồ sơ và kết quả phỏng vấn, rất tiếc chúng tôi chưa thể tiếp tục quy trình tuyển dụng với bạn ở thời điểm này. Chúng tôi trân trọng sự quan tâm của bạn và hy vọng sẽ có cơ hội hợp tác trong tương lai.',vong_tiep:'Chúng tôi vui mừng thông báo bạn được đề xuất tiếp tục quy trình tuyển dụng ở vòng tiếp theo. Bộ phận Tuyển dụng sẽ liên hệ để trao đổi thời gian và thông tin chi tiết.'};
    const campaign=safeText(lich.ten_dot_tuyen||'Đợt tuyển dụng',200), round=safeText(lich.vong_phong_van||'Vòng phỏng vấn',100), candidate=safeText(lich.ten_ung_vien||'Ứng viên',150), label=labels[decision.ket_qua]||decision.ket_qua, explanation=explanations[decision.ket_qua]||'';
    const body=`Chào ${candidate},\n\nCảm ơn bạn đã quan tâm và ứng tuyển trong đợt tuyển dụng ${campaign}, đồng thời dành thời gian tham gia ${round}.\n\nKết quả hiện tại của bạn: ${label}.\n\n${explanation}\n\nChúng tôi chân thành cảm ơn sự quan tâm, thời gian và nỗ lực bạn đã dành cho quy trình tuyển dụng. Chúc bạn luôn thành công trong công việc và những cơ hội sắp tới.\n\nTrân trọng,\nBộ phận Tuyển dụng`;
    res.json({to:lich.email_ung_vien,ten_ung_vien:candidate,subject:`Thông báo kết quả tuyển dụng – ${campaign}`,body,label});
  } catch(e) { console.error('GET /api/danh-gia/:id/email-ket-qua',e); res.status(500).json({message:e.message||'Không tạo được bản nháp email.'}); }
});

router.post('/:id/gui-ket-qua', async (req,res) => {
  try {
    await ensureSchema(); if(!canHr(req)) return res.status(403).json({message:'Chỉ HR hoặc quản lý được gửi kết quả cho ứng viên.'});
    const id=Number(req.params.id); const lich=await layLich(id); if(!lich) return res.status(404).json({message:'Không tìm thấy lịch phỏng vấn.'});
    const [rows]=await db.query('SELECT * FROM quyet_dinh_phong_van WHERE phong_van_id=? LIMIT 1',[id]); const decision=rows[0];
    if(!decision) return res.status(400).json({message:'Manager/Leader cần lưu quyết định cuối trước khi gửi email.'});
    if(!lich.email_ung_vien) return res.status(400).json({message:'Ứng viên chưa có email.'});
    const email=String(process.env.GMAIL_USER||'').trim(), pass=String(process.env.GMAIL_APP_PASSWORD||'').replace(/\s+/g,'');
    if(!email||!pass) throw new Error('Thiếu GMAIL_USER hoặc GMAIL_APP_PASSWORD trong file .env.');
    const labels={dat:'Đạt vòng phỏng vấn',can_nhac:'Đang được cân nhắc',rot:'Chưa phù hợp ở vòng này',vong_tiep:'Được mời tiếp tục quy trình tuyển dụng ở vòng tiếp theo'};
    const label=labels[decision.ket_qua]||decision.ket_qua;
    const campaign=safeText(lich.ten_dot_tuyen||'Đợt tuyển dụng',200);
    const defaultSubject=`Thông báo kết quả tuyển dụng – ${campaign}`;
    const candidate=safeText(lich.ten_ung_vien||'Ứng viên',150);
    const defaultBody=`Chào ${candidate},\n\nCảm ơn bạn đã quan tâm và ứng tuyển trong đợt tuyển dụng ${campaign}, đồng thời dành thời gian tham gia ${safeText(lich.vong_phong_van||'Vòng phỏng vấn',100)}.\n\nKết quả hiện tại của bạn: ${label}.\n\nTrân trọng,\nBộ phận Tuyển dụng`;
    const subject=safeText(req.body?.subject||defaultSubject,250), text=safeText(req.body?.body||defaultBody,12000);
    if(!subject||!text) return res.status(400).json({message:'Tiêu đề và nội dung email không được để trống.'});
    const html=`<div style="margin:0;background:#f4f6fa;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;color:#243047"><div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e3e8f0;border-radius:12px;overflow:hidden"><div style="background:#173b68;padding:24px 30px;color:#fff"><h2 style="margin:8px 0 0;font-size:22px">${escapeHtml(subject)}</h2></div><div style="padding:28px 30px;font-size:15px;line-height:1.75;white-space:pre-line">${escapeHtml(text)}</div><div style="padding:14px 30px;background:#f8fafc;border-top:1px solid #e8edf4;color:#718096;font-size:12px">Email thông báo kết quả tuyển dụng từ Bộ phận Tuyển dụng.</div></div></div>`;
    const transporter=nodemailer.createTransport({service:'gmail',auth:{user:email,pass}});
    await transporter.sendMail({from:email,to:lich.email_ung_vien,subject,text,html});
    await db.query("UPDATE quyet_dinh_phong_van SET email_trang_thai='da_gui',email_da_gui_luc=NOW(),email_loi=NULL WHERE phong_van_id=?",[id]);
    res.json({message:'Đã gửi email thông báo kết quả cho ứng viên.'});
  } catch(e) {
    console.error('POST /api/danh-gia/:id/gui-ket-qua',e);
    try { await db.query("UPDATE quyet_dinh_phong_van SET email_trang_thai='loi',email_loi=? WHERE phong_van_id=?",[safeText(e.message,2000),Number(req.params.id)]); } catch {}
    res.status(500).json({message:e.message||'Gửi email kết quả thất bại.'});
  }
});

module.exports = router;
