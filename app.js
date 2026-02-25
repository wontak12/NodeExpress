var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var cors = require("cors");
var swaggerUi = require("swagger-ui-express");
var swaggerSpec = require("./swagger");

var authRouter = require("./routes/auth");
var lecturesRouter = require("./routes/lectures");
var professorRouter = require("./routes/professor");
var uploadRouter = require("./routes/upload");
var submissionsRouter = require("./routes/submissions");

var app = express();

app.use(cors({ origin: "http://localhost:3501", credentials: true }));
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 정적 파일 (업로드된 파일 서빙)
app.use("/uploads", express.static("uploads"));

// API 라우터
app.use("/api/auth", authRouter);
app.use("/api/lectures", lecturesRouter);
app.use("/api/professor", professorRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/submissions", submissionsRouter);

// 404
app.use(function (req, res) {
  res.status(404).json({ message: "Not Found" });
});

// 에러 핸들러
app.use(function (err, req, res, next) {
  res.status(err.status || 500).json({ message: err.message });
});

module.exports = app;
