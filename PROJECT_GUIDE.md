# Express PlayGround - 프로젝트 구조 가이드

> 백엔드를 처음 접하는 분을 위한 설명입니다.

---

## 이 프로젝트가 뭐하는 건가요?

간단한 **게시판(블로그)** 입니다.
- 글 목록 보기
- 새 글 작성
- 글 상세 보기

데이터는 DB 없이 서버 안의 **JSON 파일**(`data/posts.json`)에 저장됩니다.

---

## 백엔드란?

브라우저(프론트엔드)가 요청을 보내면, **서버(백엔드)** 가 처리해서 응답을 돌려주는 구조입니다.

```
브라우저 (주소창에 URL 입력)
    ↓ 요청 (Request)
서버 (Express 앱)
    ↓ 처리 후
브라우저 (화면에 결과 표시)
```

이 프로젝트는 **Express** 라는 Node.js 백엔드 프레임워크를 사용합니다.

---

## 서버가 켜지는 원리

```
npm start
  └→ node ./bin/www        ← 서버 시작 파일
       └→ app.js           ← 앱 설정 파일
            └→ 포트 3500에서 대기
```

브라우저에서 `http://localhost:3500` 으로 접속하면 서버와 통신하게 됩니다.

---

## 폴더 구조 한눈에 보기

```
Express_PlayGround/
│
├── bin/
│   └── www              ← 서버를 실제로 켜는 진입점
│
├── app.js               ← 앱 전체 설정 (미들웨어, 라우터 연결)
│
├── routes/              ← URL 별로 어떤 처리를 할지 정의
│   ├── index.js         ← "/" → 홈 화면
│   ├── posts.js         ← "/posts" → 게시글 관련 모든 처리
│   └── users.js         ← "/users" → 유저 (현재 미구현)
│
├── models/
│   └── post.js          ← Post 데이터 구조 정의 (클래스)
│
├── dtos/
│   └── postDto.js       ← 데이터를 주고받을 때 형식 변환
│
├── data/
│   └── posts.json       ← 실제 게시글 데이터가 저장되는 파일 (DB 역할)
│
├── views/               ← 브라우저에 보여줄 HTML 템플릿
│   ├── layout.jade      ← 모든 페이지의 공통 틀 (헤더 등)
│   ├── index.jade       ← 홈 화면
│   ├── error.jade       ← 에러 화면
│   └── posts/
│       ├── index.jade   ← 글 목록 페이지
│       ├── new.jade     ← 새 글 작성 폼
│       └── show.jade    ← 글 상세 페이지
│
├── public/
│   └── stylesheets/
│       └── style.css    ← 전체 CSS 스타일
│
└── package.json         ← 프로젝트 정보 및 사용하는 라이브러리 목록
```

---

## 핵심 개념 설명

### 1. 라우터 (routes/)
URL 주소와 처리 로직을 연결하는 곳입니다.

| URL | 방식 | 하는 일 |
|-----|------|---------|
| `/` | GET | 홈 화면 표시 |
| `/posts` | GET | 게시글 목록 표시 |
| `/posts/new` | GET | 새 글 작성 폼 표시 |
| `/posts` | POST | 새 글 저장 후 목록으로 이동 |
| `/posts/:id` | GET | 특정 글 상세 표시 |

> **GET** = 데이터를 달라고 요청 (주소창에 입력하는 것)
> **POST** = 데이터를 보내는 요청 (폼을 제출하는 것)
> **:id** = 실제 글 ID가 들어오는 자리 (예: `/posts/1771834727829`)

---

### 2. 모델 (models/post.js)
게시글 데이터가 어떤 구조인지 정의합니다.

```
Post {
  id      : 글 고유 번호 (타임스탬프로 자동 생성)
  title   : 제목
  body    : 내용
  created : 작성 시간
}
```

---

### 3. DTO (dtos/postDto.js)
**Data Transfer Object** — 데이터를 주고받을 때 형식을 맞춰주는 역할입니다.

- `fromCreateDto` : 브라우저가 보낸 폼 데이터 → 서버가 쓸 수 있는 형식으로 변환
- `toResponseDto` : 서버의 Post 객체 → 화면에 보내줄 형식으로 변환

> 왜 필요한가? 나중에 API가 복잡해졌을 때, 내부 데이터 구조와 외부에 노출하는 구조를 분리하기 위함입니다.

---

### 4. 뷰 (views/)
Jade(Pug) 라는 HTML 템플릿 언어를 사용합니다.
서버가 데이터를 뷰에 넘겨주면, 뷰가 그 데이터를 HTML로 만들어 브라우저에 전달합니다.

```
서버 → res.render("posts/index", { posts: [...] })
         ↓
    views/posts/index.jade 파일이 posts 배열을 받아서
         ↓
    완성된 HTML을 브라우저로 전송
```

---

### 5. 미들웨어 (app.js)
요청이 라우터에 도달하기 **전에** 공통으로 실행되는 처리들입니다.

```javascript
app.use(logger("dev"))              // 모든 요청을 콘솔에 로그 출력
app.use(express.json())             // JSON 형식 요청 파싱
app.use(express.urlencoded(...))    // 폼 데이터 파싱
app.use(cookieParser())             // 쿠키 파싱
app.use(express.static("public"))   // CSS 등 정적 파일 서빙
```

---

## 글 작성 흐름 전체 과정

```
1. 브라우저에서 /posts/new 접속
      ↓
2. routes/posts.js → GET /new → views/posts/new.jade 렌더링
      ↓
3. 사용자가 제목/내용 입력 후 [Create] 버튼 클릭
      ↓
4. 브라우저가 POST /posts 요청 전송 (폼 데이터 포함)
      ↓
5. routes/posts.js → POST /
   - postDto.fromCreateDto(req.body)  → 폼 데이터 정제
   - new Post({ id, title, body, ... }) → Post 객체 생성
   - posts.unshift(post.toObject())   → 배열 맨 앞에 추가
   - writePosts(posts)                → data/posts.json 에 저장
      ↓
6. res.redirect("/posts") → 목록 페이지로 이동
```

---

## 사용하는 라이브러리

| 라이브러리 | 역할 |
|------------|------|
| `express` | Node.js 웹 서버 프레임워크 |
| `jade` | HTML 템플릿 엔진 |
| `morgan` | HTTP 요청 로그 출력 |
| `cookie-parser` | 쿠키 처리 |
| `http-errors` | HTTP 에러 생성 헬퍼 |
| `debug` | 디버그 로그 출력 |

---

## 서버 실행 방법

```bash
npm start
```

브라우저에서 `http://localhost:3500` 접속
