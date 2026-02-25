var express = require("express");
var router = express.Router();
var db = require("../models/db");
var jwt = require("jsonwebtoken");
var { JWT_SECRET } = require("./auth");

// JWT 인증 미들웨어 (학생 전용)
function studentRequired(req, res, next) {
  var authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "인증이 필요합니다." });
  }
  try {
    req.user = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "학생 권한이 필요합니다." });
    }
    next();
  } catch (err) {
    res.status(401).json({ message: "유효하지 않은 토큰입니다." });
  }
}

// JWT 인증 미들웨어 (공통)
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
 *   name: Submissions
 *   description: 과제 제출 API
 */

/**
 * @swagger
 * /api/submissions/lecture/{lectureId}:
 *   get:
 *     summary: 강의 전체 과제 제출 상태 조회 (학생)
 *     tags: [Submissions]
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
 *         description: 제출한 과제 목록 반환 (assignment_id, submit_type, submitted_at)
 *       403:
 *         description: 수강하지 않은 강의
 */
router.get("/lecture/:lectureId", authRequired, async function (req, res) {
  var lectureId = req.params.lectureId;

  try {
    // 수강 등록 여부 확인
    var [enrollment] = await db.query(
      "SELECT id FROM lecture_enrollments WHERE user_id = ? AND lecture_id = ?",
      [req.user.id, lectureId]
    );
    if (enrollment.length === 0) {
      return res.status(403).json({ message: "수강하지 않은 강의입니다." });
    }

    var [submissions] = await db.query(
      `SELECT s.assignment_id, s.submit_type, s.submitted_at
       FROM submissions s
       INNER JOIN assignments a ON s.assignment_id = a.id
       WHERE s.user_id = ? AND a.lecture_id = ?`,
      [req.user.id, lectureId]
    );

    res.json(submissions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * @swagger
 * /api/submissions/{assignmentId}:
 *   post:
 *     summary: 과제 제출 (재제출 허용)
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *             required: [submit_type, items]
 *             properties:
 *               submit_type:
 *                 type: string
 *                 enum: [text, image, video, document]
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [order, type]
 *                   properties:
 *                     order:
 *                       type: integer
 *                     type:
 *                       type: string
 *                       enum: [text, image, video, document]
 *                     content:
 *                       type: string
 *                     url:
 *                       type: string
 *     responses:
 *       201:
 *         description: 제출 성공
 *       400:
 *         description: 마감 기한 초과 또는 허용되지 않는 제출 형식
 *       403:
 *         description: 수강하지 않은 강의
 *       404:
 *         description: 과제 없음
 */
router.post("/:assignmentId", studentRequired, async function (req, res) {
  var assignmentId = req.params.assignmentId;
  var { submit_type, items } = req.body;

  try {
    // 과제 존재 확인
    var [assignments] = await db.query(
      "SELECT * FROM assignments WHERE id = ?",
      [assignmentId]
    );
    if (assignments.length === 0) {
      return res.status(404).json({ message: "과제를 찾을 수 없습니다." });
    }
    var assignment = assignments[0];

    // 수강 등록 여부 확인
    var [enrollment] = await db.query(
      "SELECT id FROM lecture_enrollments WHERE user_id = ? AND lecture_id = ?",
      [req.user.id, assignment.lecture_id]
    );
    if (enrollment.length === 0) {
      return res.status(403).json({ message: "수강하지 않은 강의입니다." });
    }

    // 오픈 날짜 체크
    if (assignment.open_date && new Date() < new Date(assignment.open_date)) {
      return res.status(400).json({ message: "아직 제출 기간이 아닙니다." });
    }

    // 마감 기한 체크
    if (assignment.due_date && new Date() > new Date(assignment.due_date)) {
      return res.status(400).json({ message: "마감 기한이 지났습니다." });
    }

    // submit_type 허용 여부 확인
    var allowedTypes = JSON.parse(assignment.submit_types);
    if (!allowedTypes.includes(submit_type)) {
      return res.status(400).json({ message: "허용되지 않는 제출 형식입니다." });
    }

    // 기존 제출 확인 (재제출 처리)
    var [existing] = await db.query(
      "SELECT id FROM submissions WHERE user_id = ? AND assignment_id = ?",
      [req.user.id, assignmentId]
    );

    if (existing.length > 0) {
      var submissionId = existing[0].id;
      // 기존 items 삭제 후 재삽입
      await db.query("DELETE FROM submission_items WHERE submission_id = ?", [submissionId]);
      await db.query(
        "UPDATE submissions SET submit_type = ?, submitted_at = NOW() WHERE id = ?",
        [submit_type, submissionId]
      );

      var itemValues = items.map((item) => [
        submissionId, item.order, item.type, item.content || null, item.url || null,
      ]);
      await db.query(
        "INSERT INTO submission_items (submission_id, `order`, type, content, url) VALUES ?",
        [itemValues]
      );

      return res.json({ message: "재제출 성공", submission_id: submissionId });
    }

    // 신규 제출
    var [result] = await db.query(
      "INSERT INTO submissions (user_id, assignment_id, submit_type) VALUES (?, ?, ?)",
      [req.user.id, assignmentId, submit_type]
    );
    var newSubmissionId = result.insertId;

    var newItemValues = items.map((item) => [
      newSubmissionId, item.order, item.type, item.content || null, item.url || null,
    ]);
    await db.query(
      "INSERT INTO submission_items (submission_id, `order`, type, content, url) VALUES ?",
      [newItemValues]
    );

    res.status(201).json({ message: "제출 성공", submission_id: newSubmissionId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * @swagger
 * /api/submissions/{assignmentId}:
 *   get:
 *     summary: 내 제출 내역 조회
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 제출 내역 반환
 *       404:
 *         description: 제출 내역 없음
 */
router.get("/:assignmentId", authRequired, async function (req, res) {
  var assignmentId = req.params.assignmentId;

  try {
    var [submissions] = await db.query(
      "SELECT * FROM submissions WHERE user_id = ? AND assignment_id = ?",
      [req.user.id, assignmentId]
    );

    if (submissions.length === 0) {
      return res.status(404).json({ message: "제출 내역이 없습니다." });
    }

    var submission = submissions[0];

    var [items] = await db.query(
      "SELECT * FROM submission_items WHERE submission_id = ? ORDER BY `order` ASC",
      [submission.id]
    );

    res.json({ ...submission, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버 오류" });
  }
});

module.exports = router;
