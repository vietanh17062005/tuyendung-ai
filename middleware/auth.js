const jwt = require("jsonwebtoken");

function kiemTraDangNhap(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({
      message: "Chua dang nhap",
    });
  }

  try {
    const chuoiToken = token.split(" ")[1];
    const nguoiDung = jwt.verify(chuoiToken, process.env.JWT_SECRET);

    req.nguoiDung = nguoiDung;

    next();
  } catch (error) {
    res.status(401).json({
      message: "Token khong hop le",
    });
  }
}

function kiemTraVaiTro(...vaiTroChoPhep) {
  return function (req, res, next) {
    if (!vaiTroChoPhep.includes(req.nguoiDung.vai_tro)) {
      return res.status(403).json({
        message: "Ban khong co quyen",
      });
    }

    next();
  };
}

module.exports = {
  kiemTraDangNhap,
  kiemTraVaiTro,
};
