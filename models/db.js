var mysql = require('mysql2');

var pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '2486',
  database: 'express',
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool.promise();
