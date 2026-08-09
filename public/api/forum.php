<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true) ?: [];
$action = $_GET['action'] ?? $payload['action'] ?? null;

// Database configuration - adjust via env or directly here
$dbHost = getenv('DB_HOST') ?: '127.0.0.1';
$dbName = getenv('DB_NAME') ?: 'jiipeli';
$dbUser = getenv('DB_USER') ?: 'jiipeli_user';
$dbPass = getenv('DB_PASS') ?: 'yourpassword';

try {
    $pdo = new PDO("mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4", $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (Exception $e) {
    respond(['error' => 'Database connection failed: ' . $e->getMessage()], 500);
}

// Create tables if they don't exist
$pdo->exec("CREATE TABLE IF NOT EXISTS posts (
    post_id VARCHAR(50) PRIMARY KEY,
    title TEXT,
    body TEXT,
    device VARCHAR(255),
    created_at DATETIME
)");

$pdo->exec("CREATE TABLE IF NOT EXISTS comments (
    comment_id VARCHAR(50) PRIMARY KEY,
    post_id VARCHAR(50) NOT NULL,
    body TEXT,
    device VARCHAR(255),
    image_path VARCHAR(255) DEFAULT NULL,
    created_at DATETIME,
    INDEX(post_id)
)");


if ($action === 'post' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    createPost($pdo, $payload);
}
if ($action === 'comment' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    createComment($pdo, $payload);
}

respond(['posts' => loadPosts($pdo)]);

function loadPosts($pdo) {
    $stmt = $pdo->query('SELECT * FROM posts ORDER BY created_at DESC');
    $posts = [];
    while ($row = $stmt->fetch()) {
        $post = [
            'post_id' => $row['post_id'],
            'title' => $row['title'],
            'body' => $row['body'],
            'device' => $row['device'],
            'created_at' => date(DATE_ATOM, strtotime($row['created_at'])),
            'comments' => []
        ];

        $cstmt = $pdo->prepare('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC');
        $cstmt->execute([$row['post_id']]);
        while ($crow = $cstmt->fetch()) {
            $post['comments'][] = [
                'comment_id' => $crow['comment_id'],
                'body' => $crow['body'],
                'device' => $crow['device'],
                'image' => $crow['image_path'] ? 'api/uploads/' . $crow['image_path'] : null,
                'created_at' => date(DATE_ATOM, strtotime($crow['created_at']))
            ];
        }

        $posts[] = $post;
    }
    return $posts;
}

function createPost($pdo, $payload) {
    validatePayload($payload, ['title', 'body', 'device']);

    $post_id = uniqid('', true);
    $stmt = $pdo->prepare('INSERT INTO posts (post_id, title, body, device, created_at) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([
        $post_id,
        trim($payload['title']),
        trim($payload['body']),
        trim($payload['device']),
        gmdate('Y-m-d H:i:s')
    ]);

    respond(['success' => true, 'posts' => loadPosts($pdo)]);
}

function createComment($pdo, $payload) {
    // support both JSON payloads and multipart/form-data
    $post_id = $payload['post_id'] ?? $_POST['post_id'] ?? null;
    $body = $payload['body'] ?? $_POST['body'] ?? null;
    $device = $payload['device'] ?? $_POST['device'] ?? null;

    validatePayload(['post_id' => $post_id, 'body' => $body, 'device' => $device], ['post_id']);

    // ensure post exists
    $pstmt = $pdo->prepare('SELECT 1 FROM posts WHERE post_id = ?');
    $pstmt->execute([(string)$post_id]);
    if (!$pstmt->fetch()) {
        respond(['error' => 'Post not found'], 404);
    }

    $image_path = null;
    if (!empty($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['image'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif', 'image/webp' => 'webp'];
        if (!isset($allowed[$mime])) {
            respond(['error' => 'Unsupported image type'], 400);
        }
        $ext = $allowed[$mime];
        $uploadsDir = __DIR__ . '/uploads';
        if (!is_dir($uploadsDir) && !mkdir($uploadsDir, 0755, true)) {
            respond(['error' => 'Unable to create upload directory'], 500);
        }
        $filename = uniqid('', true) . '.' . $ext;
        $dest = $uploadsDir . '/' . $filename;
        if (!move_uploaded_file($file['tmp_name'], $dest)) {
            respond(['error' => 'Failed to save uploaded file'], 500);
        }
        $image_path = $filename;
    }

    $comment_id = uniqid('', true);
    $stmt = $pdo->prepare('INSERT INTO comments (comment_id, post_id, body, device, image_path, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $comment_id,
        (string)$post_id,
        trim((string)$body),
        trim((string)$device),
        $image_path,
        gmdate('Y-m-d H:i:s')
    ]);

    respond(['success' => true, 'posts' => loadPosts($pdo)]);
}

function validatePayload($payload, $requiredKeys) {
    if (!is_array($payload)) {
        respond(['error' => 'Invalid JSON payload'], 400);
    }

    foreach ($requiredKeys as $key) {
        if (empty($payload[$key]) && $payload[$key] !== '0') {
            respond(['error' => "Missing required field: $key"], 400);
        }
    }
}

function respond($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
