<?php
class Database
{
    private $pdo;

    public function __construct()
    {
        $dbDir = __DIR__ . '/data';
        if (!is_dir($dbDir))
            mkdir($dbDir, 0777, true);
        $dbFile = $dbDir . '/sched.sqlite';
        $needsInit = !file_exists($dbFile);

        $this->pdo = new PDO('sqlite:' . $dbFile);
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        if ($needsInit) {
            $this->initDb();
        }
    }

    public function getPdo()
    {
        return $this->pdo;
    }

    private function initDb()
    {
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_number TEXT,
                name TEXT,
                email TEXT,
                role TEXT
            );
            
            CREATE TABLE IF NOT EXISTS topics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT
            );
            
            CREATE TABLE IF NOT EXISTS facilitators (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT
            );
            
            CREATE TABLE IF NOT EXISTS topic_facilitators (
                topic_id INTEGER,
                facilitator_id INTEGER,
                PRIMARY KEY (topic_id, facilitator_id),
                FOREIGN KEY(topic_id) REFERENCES topics(id),
                FOREIGN KEY(facilitator_id) REFERENCES facilitators(id)
            );
            
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                type TEXT DEFAULT 'Consultation',
                topic TEXT,
                date_time TEXT,
                end_time TEXT,
                mode TEXT,
                venue TEXT DEFAULT 'TBA',
                facilitator_id INTEGER,
                status TEXT DEFAULT 'PENDING',
                special_requests TEXT,
                FOREIGN KEY(facilitator_id) REFERENCES facilitators(id),
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
            
            INSERT INTO users (student_number, name, email, role) VALUES ('24-1021-948', 'Jullian Doe', 'student@example.com', 'Student');
            
            INSERT INTO topics (name) VALUES ('Mathematics');
            INSERT INTO topics (name) VALUES ('Computer Science');
            INSERT INTO topics (name) VALUES ('Science & Technology');
            INSERT INTO topics (name) VALUES ('Literature & Arts');
            INSERT INTO topics (name) VALUES ('History');
            INSERT INTO topics (name) VALUES ('Other');

            INSERT INTO facilitators (name) VALUES ('Dr. Alan Turing');
            INSERT INTO facilitators (name) VALUES ('Prof. Grace Hopper');
            
            INSERT INTO topic_facilitators (topic_id, facilitator_id) VALUES (1, 1);
            INSERT INTO topic_facilitators (topic_id, facilitator_id) VALUES (2, 1);
            INSERT INTO topic_facilitators (topic_id, facilitator_id) VALUES (2, 2);
            INSERT INTO topic_facilitators (topic_id, facilitator_id) VALUES (4, 2);
            INSERT INTO sessions (user_id, type, topic, date_time, end_time, mode, facilitator_id, status) VALUES (1, 'Instructional Program', 'Computer Science', '2026-03-08 10:00:00', '2026-03-08 11:30:00', 'Online', 1, 'CONFIRMED');
            INSERT INTO sessions (user_id, type, topic, date_time, end_time, mode, facilitator_id, status) VALUES (1, 'Consultation', 'Literature & Arts', '2026-03-08 13:00:00', '2026-03-08 14:00:00', 'Onsite', 2, 'PENDING');
            INSERT INTO sessions (user_id, type, topic, date_time, end_time, mode, facilitator_id, status) VALUES (1, 'Seminar', 'Computer Science', '2026-03-09 11:00:00', '2026-03-09 12:00:00', 'Online', NULL, 'PENDING');
            CREATE TABLE IF NOT EXISTS seminars (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT,
                description TEXT,
                date_time TEXT,
                speaker TEXT,
                venue TEXT DEFAULT 'Library Main Hall'
            );

            INSERT INTO seminars (title, description, date_time, speaker, venue) VALUES (
                'Modern AI in Literature', 
                'Exploring how LLMs are reshaping modern storytelling.', 
                '2026-04-15 14:00:00',
                'Dr. Emily Vance',
                'Audio-Visual Room'
            );
        ");
    }
}
