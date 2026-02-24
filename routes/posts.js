var express = require("express");
var router = express.Router();
var fs = require("fs");
var path = require("path");

var Post = require("../models/post");
var postDto = require("../dtos/postDto");

var dataFile = path.join(__dirname, "..", "data", "posts.json");

function readPosts() {
  try {
    var raw = fs.readFileSync(dataFile, "utf8");
    return JSON.parse(raw || "[]");
  } catch (e) {
    return [];
  }
}

function writePosts(posts) {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(posts, null, 2), "utf8");
}

/* GET posts list */
router.get("/", function (req, res, next) {
  var posts = readPosts().map(function (p) {
    return postDto.toResponseDto(Post.fromObject(p));
  });
  res.render("posts/index", { title: "Posts", posts: posts });
});

/* GET new post form */
router.get("/new", function (req, res, next) {
  res.render("posts/new", { title: "New Post" });
});

/* POST create new post */
router.post("/", function (req, res, next) {
  var posts = readPosts();
  var id = Date.now().toString();
  var create = postDto.fromCreateDto(req.body);
  var post = new Post({
    id: id,
    title: create.title || "Untitled",
    body: create.body || "",
    created: new Date().toISOString(),
  });
  posts.unshift(post.toObject());
  writePosts(posts);
  res.redirect("/posts");
});

/* GET single post */
router.get("/:id", function (req, res, next) {
  var posts = readPosts();
  var postObj = posts.find(function (p) {
    return p.id === req.params.id;
  });
  if (!postObj) return res.status(404).send("Post not found");
  var postEntity = Post.fromObject(postObj);
  var dto = postDto.toResponseDto(postEntity);
  res.render("posts/show", { title: dto.title, post: dto });
});

module.exports = router;
