# Database Structure

## ERD 관계 요약

```
users    1:N lectures (professor_id)
lectures 1:N assignments
lectures 1:N lecture_enrollments
users    1:N lecture_enrollments
users    1:N submissions
assignments 1:N submissions
files    1:N submissions
```

---

## 테이블 상세

### users
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 고유 식별자 |
| name | VARCHAR(50) | NOT NULL | 이름 |
| student_id | VARCHAR(20) | NOT NULL | 학번 |
| login_id | VARCHAR(50) | NOT NULL, UNIQUE | 아이디 |
| password | VARCHAR(255) | NOT NULL | 비밀번호 |
| role | ENUM('student','professor') | NOT NULL, DEFAULT 'student' | 권한 |
| created_at | DATETIME | DEFAULT NOW() | 가입일 |

---

### lectures
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 고유 식별자 |
| professor_id | INT | FK → users.id, NOT NULL | 담당 교수 |
| title | VARCHAR(100) | NOT NULL | 강의명 |
| description | TEXT | - | 강의 설명 |
| access_code | VARCHAR(20) | NOT NULL | 접속 인증번호 |
| year | INT | NOT NULL | 년도 |
| semester | INT | NOT NULL | 학기 |
| major | VARCHAR(50) | NOT NULL | 전공 |
| created_at | DATETIME | DEFAULT NOW() | 생성일 |

---

### assignments
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 고유 식별자 |
| lecture_id | INT | FK → lectures.id | 소속 강의 |
| week | INT | NOT NULL | 주차 |
| topic | VARCHAR(100) | NOT NULL | 주제 |
| week_order | INT | NOT NULL | 주차별 순서 (1, 2) |
| video_title | VARCHAR(100) | - | 영상 제목 |
| practice_content | TEXT | NOT NULL | 실습 내용 |
| main_content | TEXT | - | 주요 내용 |
| submit_types | VARCHAR(100) | NOT NULL, DEFAULT '["text"]' | 허용 제출 형식 (JSON 배열) |
| due_date | DATETIME | NULL | 마감 날짜 |
| created_at | DATETIME | DEFAULT NOW() | 생성일 |

---

### lecture_enrollments
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 고유 식별자 |
| user_id | INT | FK → users.id | 학생 |
| lecture_id | INT | FK → lectures.id | 강의 |
| enrolled_at | DATETIME | DEFAULT NOW() | 최초 인증 등록일 |

- UNIQUE KEY (user_id, lecture_id) — 중복 등록 방지

---

### files
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 고유 식별자 |
| original_name | VARCHAR(255) | NOT NULL | 원본 파일명 |
| stored_name | VARCHAR(255) | NOT NULL | 서버 저장 파일명 |
| file_path | VARCHAR(255) | NOT NULL | 저장 경로 |
| file_type | ENUM('image','video') | NOT NULL | 파일 타입 |
| file_size | INT | NOT NULL | 파일 크기 (bytes) |
| uploaded_at | DATETIME | DEFAULT NOW() | 업로드일 |

---

### submissions
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 고유 식별자 |
| user_id | INT | FK → users.id | 제출한 학생 |
| assignment_id | INT | FK → assignments.id | 과제 |
| submit_type | ENUM('text','image','video') | NOT NULL | 제출 형식 |
| content | TEXT | - | 텍스트 내용 |
| file_id | INT | FK → files.id | 첨부 파일 |
| submitted_at | DATETIME | DEFAULT NOW() | 제출일 |
