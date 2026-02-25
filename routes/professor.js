var express = require("express");
var router = express.Router();
var db = require("../models/db");
var jwt = require("jsonwebtoken");
var { randomBytes } = require("crypto");
var { JWT_SECRET } = require("./auth");

// JWT 인증 + 교수 권한 미들웨어
function professorRequired(req, res, next) {
  var authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "인증이 필요합니다." });
  }

  try {
    req.user = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    if (req.user.role !== "professor") {
      return res.status(403).json({ message: "교수 권한이 필요합니다." });
    }
    next();
  } catch (err) {
    res.status(401).json({ message: "유효하지 않은 토큰입니다." });
  }
}

/**
 * @swagger
 * tags:
 *   name: Professor
 *   description: 교수 관리 API
 */

/**
 * @swagger
 * /api/professor/lectures:
 *   post:
 *     summary: 강의 생성 (access_code 자동 생성)
 *     tags: [Professor]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, year, semester, major]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               year:
 *                 type: integer
 *               semester:
 *                 type: integer
 *               major:
 *                 type: string
 *     responses:
 *       201:
 *         description: 강의 생성 성공 (lectureId, access_code 반환)
 *       403:
 *         description: 교수 권한 필요
 */
router.post("/lectures", professorRequired, async function (req, res) {
  var { title, description, year, semester, major } = req.body;
  var access_code = randomBytes(3).toString("hex").toUpperCase(); // 6자리 대문자 난수

  try {
    var [result] = await db.query(
      `INSERT INTO lectures (professor_id, title, description, access_code, year, semester, major)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, title, description || null, access_code, year, semester, major]
    );

    res.status(201).json({ message: "강의 생성 성공", lectureId: result.insertId, access_code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * @swagger
 * /api/professor/lectures:
 *   get:
 *     summary: 내 강의 목록 조회
 *     tags: [Professor]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 강의 목록 반환
 *       403:
 *         description: 교수 권한 필요
 */
router.get("/lectures", professorRequired, async function (req, res) {
  try {
    var [lectures] = await db.query(
      "SELECT * FROM lectures WHERE professor_id = ? ORDER BY created_at DESC",
      [req.user.id]
    );

    res.json(lectures);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * @swagger
 * /api/professor/lectures/{lectureId}/assignments:
 *   get:
 *     summary: 강의별 과제 목록 조회 (교수, 제출 인원 수 포함)
 *     tags: [Professor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lectureId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 과제 목록 반환 (submission_count 포함)
 *       403:
 *         description: 교수 권한 필요 또는 본인 강의 아님
 */
router.get("/lectures/:lectureId/assignments", professorRequired, async function (req, res) {
  var lectureId = req.params.lectureId;

  try {
    var [lectures] = await db.query(
      "SELECT id FROM lectures WHERE id = ? AND professor_id = ?",
      [lectureId, req.user.id]
    );
    if (lectures.length === 0) {
      return res.status(403).json({ message: "본인 강의가 아닙니다." });
    }

    var [assignments] = await db.query(
      `SELECT a.*, COUNT(s.id) AS submission_count
       FROM assignments a
       LEFT JOIN submissions s ON s.assignment_id = a.id
       WHERE a.lecture_id = ?
       GROUP BY a.id
       ORDER BY a.week ASC, a.week_order ASC`,
      [lectureId]
    );

    res.json(assignments.map((a) => ({
      ...a,
      submit_types: JSON.parse(a.submit_types),
      submission_count: Number(a.submission_count),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * @swagger
 * /api/professor/lectures/{lectureId}/assignments/bulk:
 *   post:
 *     summary: 과제 일괄 등록 (JSON 배열)
 *     tags: [Professor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lectureId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required: [week, topic, week_order, practice_content, submit_types]
 *               properties:
 *                 week:
 *                   type: integer
 *                 topic:
 *                   type: string
 *                 week_order:
 *                   type: integer
 *                 video_title:
 *                   type: string
 *                 practice_content:
 *                   type: string
 *                 main_content:
 *                   type: string
 *                 submit_types:
 *                   type: string
 *                   example: "[\"text\",\"image\"]"
 *                 open_date:
 *                   type: string
 *                   format: date-time
 *                 due_date:
 *                   type: string
 *                   format: date-time
 *     responses:
 *       201:
 *         description: 과제 일괄 등록 성공
 *       400:
 *         description: 배열 형식 오류
 *       403:
 *         description: 교수 권한 필요 또는 본인 강의 아님
 */
router.post("/lectures/:lectureId/assignments/bulk", professorRequired, async function (req, res) {
  var lectureId = req.params.lectureId;
  var assignments = req.body;

  if (!Array.isArray(assignments) || assignments.length === 0) {
    return res.status(400).json({ message: "과제 배열이 필요합니다." });
  }

  try {
    var [lectures] = await db.query(
      "SELECT id FROM lectures WHERE id = ? AND professor_id = ?",
      [lectureId, req.user.id]
    );
    if (lectures.length === 0) {
      return res.status(403).json({ message: "본인 강의가 아닙니다." });
    }

    var values = assignments.map((a) => [
      lectureId,
      a.week,
      a.topic,
      a.week_order,
      a.video_title || null,
      a.practice_content || null,
      a.main_content || null,
      typeof a.submit_types === "string" ? a.submit_types : JSON.stringify(a.submit_types),
      a.open_date || null,
      a.due_date || null,
    ]);

    await db.query(
      `INSERT INTO assignments (lecture_id, week, topic, week_order, video_title, practice_content, main_content, submit_types, open_date, due_date)
       VALUES ?`,
      [values]
    );

    res.status(201).json({ message: "과제 일괄 등록 성공", count: assignments.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * @swagger
 * /api/professor/lectures/{lectureId}/assignments/{assignmentId}:
 *   put:
 *     summary: 과제 수정 (제출 형식 포함)
 *     tags: [Professor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lectureId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               week:
 *                 type: integer
 *               topic:
 *                 type: string
 *               week_order:
 *                 type: integer
 *               video_title:
 *                 type: string
 *               practice_content:
 *                 type: string
 *               main_content:
 *                 type: string
 *               submit_types:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [text, image, video]
 *                 example: [text, image]
 *               open_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-03-01T00:00:00"
 *               due_date:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-03-10T23:59:00"
 *     responses:
 *       200:
 *         description: 과제 수정 성공
 *       403:
 *         description: 교수 권한 필요 또는 본인 강의 아님
 *       404:
 *         description: 과제 없음
 */
router.put("/lectures/:lectureId/assignments/:assignmentId", professorRequired, async function (req, res) {
  var { lectureId, assignmentId } = req.params;
  var { week, topic, week_order, video_title, practice_content, main_content, submit_types, open_date, due_date } = req.body;

  try {
    var [lectures] = await db.query(
      "SELECT id FROM lectures WHERE id = ? AND professor_id = ?",
      [lectureId, req.user.id]
    );

    if (lectures.length === 0) {
      return res.status(403).json({ message: "본인 강의가 아닙니다." });
    }

    var [assignments] = await db.query(
      "SELECT id FROM assignments WHERE id = ? AND lecture_id = ?",
      [assignmentId, lectureId]
    );

    if (assignments.length === 0) {
      return res.status(404).json({ message: "과제를 찾을 수 없습니다." });
    }

    await db.query(
      `UPDATE assignments SET week = ?, topic = ?, week_order = ?, video_title = ?,
       practice_content = ?, main_content = ?, submit_types = ?, open_date = ?, due_date = ? WHERE id = ?`,
      [week, topic, week_order, video_title || null, practice_content, main_content || null, JSON.stringify(submit_types), open_date || null, due_date || null, assignmentId]
    );

    res.json({ message: "과제 수정 성공" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * @swagger
 * /api/professor/lectures/{lectureId}/assignments/{assignmentId}/submissions:
 *   get:
 *     summary: 과제별 전체 제출물 조회 (교수)
 *     tags: [Professor]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: lectureId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 제출물 목록 반환 (items 포함)
 *       403:
 *         description: 교수 권한 필요 또는 본인 강의 아님
 *       404:
 *         description: 강의 또는 과제 없음
 */
router.get("/lectures/:lectureId/assignments/:assignmentId/submissions", professorRequired, async function (req, res) {
  var { lectureId, assignmentId } = req.params;

  try {
    // 본인 강의 확인
    var [lectures] = await db.query(
      "SELECT id FROM lectures WHERE id = ? AND professor_id = ?",
      [lectureId, req.user.id]
    );
    if (lectures.length === 0) {
      return res.status(403).json({ message: "본인 강의가 아닙니다." });
    }

    // 과제 확인
    var [assignments] = await db.query(
      "SELECT id FROM assignments WHERE id = ? AND lecture_id = ?",
      [assignmentId, lectureId]
    );
    if (assignments.length === 0) {
      return res.status(404).json({ message: "과제를 찾을 수 없습니다." });
    }

    // 제출 목록 조회
    var [submissions] = await db.query(
      `SELECT s.id, s.submit_type, s.submitted_at,
              u.name AS student_name, u.student_id AS student_number
       FROM submissions s
       INNER JOIN users u ON s.user_id = u.id
       WHERE s.assignment_id = ?
       ORDER BY s.submitted_at DESC`,
      [assignmentId]
    );

    // 각 제출에 items 붙이기
    for (var submission of submissions) {
      var [items] = await db.query(
        "SELECT * FROM submission_items WHERE submission_id = ? ORDER BY `order` ASC",
        [submission.id]
      );
      submission.items = items;
    }

    res.json(submissions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버 오류" });
  }
});

module.exports = router;
