var express = require('express');
var router = express.Router();
var db = require('../models/db');
var jwt = require('jsonwebtoken');

var JWT_SECRET = 'express-jwt-secret';

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: 인증 관련 API
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: 회원가입
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, studentId, loginId, password]
 *             properties:
 *               name:
 *                 type: string
 *               studentId:
 *                 type: string
 *               loginId:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *       409:
 *         description: 이미 사용 중인 아이디
 */
router.post('/register', async function (req, res) {
  var { name, studentId, loginId, password } = req.body;

  try {
    var [existing] = await db.query(
      'SELECT id FROM users WHERE login_id = ?',
      [loginId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: '이미 사용 중인 아이디입니다.' });
    }

    await db.query(
      'INSERT INTO users (name, student_id, login_id, password) VALUES (?, ?, ?, ?)',
      [name, studentId, loginId, password]
    );

    res.status(201).json({ message: '회원가입 성공' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 로그인
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [loginId, password]
 *             properties:
 *               loginId:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: 로그인 성공, JWT 반환
 *       401:
 *         description: 아이디 또는 비밀번호 불일치
 */
router.post('/login', async function (req, res) {
  var { loginId, password } = req.body;

  try {
    var [rows] = await db.query(
      'SELECT * FROM users WHERE login_id = ? AND password = ?',
      [loginId, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    var user = rows[0];
    var token = jwt.sign(
      { id: user.id, name: user.name, loginId: user.login_id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user.id, name: user.name, loginId: user.login_id, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;
module.exports.JWT_SECRET = JWT_SECRET;
