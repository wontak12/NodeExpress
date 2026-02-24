class Post {
  constructor({ id, title, body, created } = {}) {
    this.id = id || null;
    this.title = title || "";
    this.body = body || "";
    this.created = created || new Date().toISOString();
  }

  toObject() {
    return {
      id: this.id,
      title: this.title,
      body: this.body,
      created: this.created,
    };
  }

  static fromObject(obj) {
    if (!obj) return null;
    return new Post({
      id: obj.id,
      title: obj.title,
      body: obj.body,
      created: obj.created,
    });
  }
}

module.exports = Post;
