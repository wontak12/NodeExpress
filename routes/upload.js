var express = require("express");
var router = express.Router();
var multer = require("multer");
var path = require("path");
var { randomUUID } = require("crypto");
var db = require("../models/db");
var jwt = require("jsonwebtoken");
var { JWT_SECRET } = require("./auth");

// JWT 인증 미들웨어
function authRequired(req, res, next) {
  var authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "인증이 필요합니다." });
  }
  try {
    req.user = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ message: "유효하지 않은 토큰입니다." });
  }
}

// 파일 타입 판별
function getFileType(mimetype) {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  return "document";
}

// multer 설정
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    var ext = path.extname(file.originalname);
    cb(null, randomUUID() + ext);
  },
});

var upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: 파일 업로드 API
 */

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: 파일 업로드
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: 업로드 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 file_id:
 *                   type: integer
 *                 url:
 *                   type: string
 *                   example: "http://localhost:3000/uploads/abc123.pdf"
 *       400:
 *         description: 파일 없음
 *       401:
 *         description: 인증 필요
 */
router.post("/", authRequired, upload.single("file"), async function (req, res) {
  if (!req.file) {
    return res.status(400).json({ message: "파일이 없습니다." });
  }

  try {
    var fileType = getFileType(req.file.mimetype);
    var filePath = req.file.path;
    var url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    var [result] = await db.query(
      `INSERT INTO files (original_name, stored_name, file_path, file_type, file_size)
       VALUES (?, ?, ?, ?, ?)`,
      [req.file.originalname, req.file.filename, filePath, fileType, req.file.size]
    );

    res.status(201).json({ file_id: result.insertId, url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버 오류" });
  }
});

module.exports = router;
