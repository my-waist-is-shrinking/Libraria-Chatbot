-- Turn on pgvector (lets us store and search embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- ===== USERS =====
-- Guests are NOT stored (they have no account)
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    full_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,                -- never store plain passwords
    role            VARCHAR(20)  NOT NULL DEFAULT 'user'
                    CHECK (role IN ('user', 'librarian', 'admin')),  -- librarian = Library Management
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ===== COURSES (from the "PROFESSIONAL SUBJECTS" column) =====
CREATE TABLE courses (
    id   SERIAL PRIMARY KEY,
    code VARCHAR(20)  NOT NULL,                 -- e.g. CC-COMPROG11
    name VARCHAR(150) NOT NULL,                 -- e.g. Computer Programming 1
    UNIQUE (code, name)
);

-- ===== BOOKS (the catalog the AI searches) =====
CREATE TABLE books (
    id           SERIAL PRIMARY KEY,
    title        TEXT        NOT NULL,
    author       TEXT,                          -- some books have no author listed
    edition      VARCHAR(50),
    publisher    VARCHAR(255),
    call_number  VARCHAR(50),                   -- shelf location (empty for e-books)
    format       VARCHAR(10) NOT NULL DEFAULT 'Print'
                 CHECK (format IN ('Print', 'E-Book')),
    description  TEXT,                          -- empty for now, helps AI search later
    is_available BOOLEAN     NOT NULL DEFAULT TRUE,
    cover_image  TEXT,                          -- URL or path to book cover image
    copies       INT         NOT NULL DEFAULT 1
                 CHECK (copies >= 0),           -- how many copies the library owns
    embedding    vector(768),                   -- AI "meaning" numbers, filled in later
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Makes "find similar books" fast
CREATE INDEX books_embedding_idx ON books USING hnsw (embedding vector_cosine_ops);

-- ===== BOOK ↔ COURSE links (one book can be in many courses) =====
CREATE TABLE book_courses (
    book_id   INT NOT NULL REFERENCES books(id)   ON DELETE CASCADE,
    course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, course_id)            -- no duplicate links
);

-- ===== CHAT HISTORY (logged-in users only) =====
CREATE TABLE conversations (
    id         SERIAL PRIMARY KEY,
    user_id    INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(255),                              -- first message, shown in the sidebar
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE messages (
    id              SERIAL PRIMARY KEY,
    conversation_id INT         NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content         TEXT        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);