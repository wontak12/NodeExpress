exports.fromCreateDto = function (body) {
  return {
    title: body && body.title ? String(body.title) : "",
    body: body && body.body ? String(body.body) : "",
  };
};

exports.toResponseDto = function (post) {
  var o =
    post && typeof post.toObject === "function" ? post.toObject() : post || {};
  return {
    id: o.id,
    title: o.title,
    body: o.body,
    created: o.created,
  };
};
