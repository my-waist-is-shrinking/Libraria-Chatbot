-- =====================================================================
-- Loads BSCS_Holdings_Cleaned.csv into the courses, books and
-- book_courses tables (cleans duplicates and splits shared courses).
--
-- How to run (from the Libraria folder, database must be running):
--   docker cp database/BSCS_Holdings_Cleaned.csv libraria-db:/tmp/holdings.csv
--   docker cp database/import_books.sql libraria-db:/tmp/import_books.sql
--   docker exec libraria-db psql -U libraria -d libraria -f /tmp/import_books.sql
-- =====================================================================

-- 1. Staging table: same 6 columns as the CSV, all plain text, no rules
DROP TABLE IF EXISTS raw_exploded;
DROP TABLE IF EXISTS raw_holdings;
CREATE TABLE raw_holdings (
    subject     TEXT,
    call_number TEXT,
    author      TEXT,
    title       TEXT,
    edition     TEXT,
    publisher   TEXT
);

-- Load the file (HEADER = skip the first line with column names)
COPY raw_holdings FROM '/tmp/holdings.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');

-- 2. Helper table: one row per book-course pair
--    "Course A / Course B" → 2 rows, and "CC-COMPROG 11 - Computer Programming 1"
--    → code "CC-COMPROG11" + name "Computer Programming 1"
CREATE TABLE raw_exploded AS
SELECT
    r.*,
    REPLACE(TRIM(SPLIT_PART(s, ' - ', 1)), ' ', '')  AS course_code,   -- remove stray spaces in codes
    TRIM(SPLIT_PART(s, ' - ', 2))                    AS course_name,
    LOWER(REGEXP_REPLACE(r.title, '[^a-zA-Z0-9]', '', 'g')) AS title_key  -- for finding duplicates
FROM raw_holdings r,
     UNNEST(STRING_TO_ARRAY(r.subject, ' / ')) AS s;

-- 3. Courses (ALL-CAPS names become Title Case)
INSERT INTO courses (code, name)
SELECT DISTINCT
    course_code,
    CASE WHEN course_name = UPPER(course_name) THEN INITCAP(course_name) ELSE course_name END
FROM raw_exploded;

-- 4. Books (keep 1 row per same title + edition, so duplicates are merged)
INSERT INTO books (title, author, edition, publisher, call_number, format)
SELECT DISTINCT ON (title_key, COALESCE(edition, ''))
    TRIM(title),
    NULLIF(TRIM(author), ''),                                       -- empty → NULL
    NULLIF(TRIM(edition), ''),
    NULLIF(TRIM(publisher), ''),
    CASE WHEN call_number ILIKE 'e-book%' THEN NULL                 -- e-books have no shelf
         ELSE REGEXP_REPLACE(TRIM(call_number), '\s+', ' ', 'g')    -- collapse extra spaces
    END,
    CASE WHEN call_number ILIKE 'e-book%' THEN 'E-Book' ELSE 'Print' END
FROM raw_exploded
ORDER BY title_key, COALESCE(edition, ''), author NULLS LAST;

-- 5. Link each book to its course(s)
INSERT INTO book_courses (book_id, course_id)
SELECT DISTINCT b.id, c.id
FROM raw_exploded e
JOIN books b
  ON LOWER(REGEXP_REPLACE(b.title, '[^a-zA-Z0-9]', '', 'g')) = e.title_key
 AND COALESCE(b.edition, '') = COALESCE(NULLIF(TRIM(e.edition), ''), '')
JOIN courses c
  ON c.code = e.course_code
 AND LOWER(c.name) = LOWER(e.course_name);

-- 6. Remove the helper tables
DROP TABLE raw_exploded;
DROP TABLE raw_holdings;

-- 7. Show the result
SELECT
    (SELECT COUNT(*) FROM courses)      AS courses,
    (SELECT COUNT(*) FROM books)        AS books,
    (SELECT COUNT(*) FROM book_courses) AS links;