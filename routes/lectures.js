var express = require("express");
var router = express.Router();
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

/**
 * @swagger
 * tags:
 *   name: Lectures
 *   description: 강의 관련 API
 */

/**
 * @swagger
 * /api/lectures:
 *   get:
 *     summary: 내가 등록한 강의 목록 조회
 *     tags: [Lectures]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 강의 목록 반환
 *       401:
 *         description: 인증 필요
 */
router.get("/", authRequired, async function (req, res) {
  try {
    var [lectures] = await db.query(
      `SELECT l.* FROM lectures l
       INNER JOIN lecture_enrollments le ON l.id = le.lecture_id
       WHERE le.user_id = ?`,
      [req.user.id],
    );
    res.json(lectures);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * @swagger
 * /api/lectures/enroll:
 *   post:
 *     summary: 인증번호로 강의 등록
 *     tags: [Lectures]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [access_code]
 *             properties:
 *               access_code:
 *                 type: string
 *     responses:
 *       201:
 *         description: 강의 등록 성공
 *       400:
 *         description: 이미 등록된 강의
 *       404:
 *         description: 인증번호 불일치
 */
router.post("/enroll", authRequired, async function (req, res) {
  var { access_code } = req.body;

  try {
    var [lectures] = await db.query(
      "SELECT * FROM lectures WHERE access_code = ?",
      [access_code],
    );

    if (lectures.length === 0) {
      return res.status(404).json({ message: "인증번호가 올바르지 않습니다." });
    }

    var lecture = lectures[0];

    var [existing] = await db.query(
      "SELECT id FROM lecture_enrollments WHERE user_id = ? AND lecture_id = ?",
      [req.user.id, lecture.id],
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "이미 등록된 강의입니다." });
    }

    await db.query(
      "INSERT INTO lecture_enrollments (user_id, lecture_id) VALUES (?, ?)",
      [req.user.id, lecture.id],
    );

    res.status(201).json({ message: "강의 등록 성공" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * @swagger
 * /api/lectures/{lectureId}/assignments:
 *   get:
 *     summary: 강의별 과제 목록 조회
 *     tags: [Lectures]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lectureId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 강의 ID
 *     responses:
 *       200:
 *         description: 과제 목록 반환 (주차/순서 정렬)
 *       403:
 *         description: 등록하지 않은 강의
 *       404:
 *         description: 강의 없음
 */
router.get("/:lectureId/assignments", authRequired, async function (req, res) {
  var lectureId = req.params.lectureId;

  try {
    // 강의 존재 여부 확인
    var [lectures] = await db.query("SELECT id FROM lectures WHERE id = ?", [
      lectureId,
    ]);

    if (lectures.length === 0) {
      return res.status(404).json({ message: "강의를 찾을 수 없습니다." });
    }

    // 교수는 본인 강의면 통과, 학생은 수강 등록 여부 확인
    if (req.user.role === "professor") {
      var [ownLecture] = await db.query(
        "SELECT id FROM lectures WHERE id = ? AND professor_id = ?",
        [lectureId, req.user.id],
      );
      if (ownLecture.length === 0) {
        return res.status(403).json({ message: "본인 강의가 아닙니다." });
      }
    } else {
      var [enrollment] = await db.query(
        "SELECT id FROM lecture_enrollments WHERE user_id = ? AND lecture_id = ?",
        [req.user.id, lectureId],
      );
      if (enrollment.length === 0) {
        return res.status(403).json({ message: "등록하지 않은 강의입니다." });
      }
    }

    var [assignments] = await db.query(
      `SELECT * FROM assignments WHERE lecture_id = ?
       ORDER BY week ASC, week_order ASC`,
      [lectureId],
    );

    res.json(
      assignments.map((a) => ({
        ...a,
        submit_types: JSON.parse(a.submit_types),
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버 오류" });
  }
});

module.exports = router;
