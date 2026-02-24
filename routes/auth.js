var express = require('express');
var router = express.Router();
var db = require('../models/db');

// GET /auth/login
router.get('/login', function (req, res) {
  res.render('login', { title: '로그인' });
});

// POST /auth/login
router.post('/login', async function (req, res) {
  var { username, password } = req.body;

  try {
    var [rows] = await db.query(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password]
    );

    if (rows.length > 0) {
      res.send('로그인 성공! 환영합니다, ' + rows[0].name);
    } else {
      res.render('login', { title: '로그인', error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }
  } catch (err) {
    console.error(err);
    res.render('login', { title: '로그인', error: '서버 오류가 발생했습니다.' });
  }
});

// GET /auth/register
router.get('/register', function (req, res) {
  res.render('register', { title: '회원가입' });
});

// POST /auth/register
router.post('/register', async function (req, res) {
  var { name, studentId, username, password } = req.body;

  try {
    var [existing] = await db.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existing.length > 0) {
      return res.render('register', { title: '회원가입', error: '이미 사용 중인 아이디입니다.' });
    }

    await db.query(
      'INSERT INTO users (name, student_id, username, password) VALUES (?, ?, ?, ?)',
      [name, studentId, username, password]
    );

    res.redirect('/auth/login');
  } catch (err) {
    console.error(err);
    res.render('register', { title: '회원가입', error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
