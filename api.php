<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Vary: Origin');
require_once __DIR__ . '/packages/core/BookingService.php';

$action = $_GET['action'] ?? '';
$service = new BookingService();

if ($action === 'get_sessions') {
    $sessions = $service->getAvailableSessions();
    echo json_encode(['success' => true, 'sessions' => $sessions]);
    exit;
}

if ($action === 'lock_session') {
    $data = json_decode(file_get_contents('php://input'), true);
    $sessionId = $data['session_id'] ?? 0;
    $success = $service->lockSession($sessionId);
    echo json_encode(['success' => $success]);
    exit;
}

if ($action === 'unlock_session') {
    $data = json_decode(file_get_contents('php://input'), true);
    $sessionId = $data['session_id'] ?? 0;
    $success = $service->unlockSession($sessionId);
    echo json_encode(['success' => $success]);
    exit;
}

if ($action === 'confirm_booking') {
    $data = json_decode(file_get_contents('php://input'), true);
    $sessionId = $data['session_id'] ?? 0;
    $specialRequests = $data['special_requests'] ?? '';
    // Dynamically retrieve authenticated User ID Context
    $userId = $_SESSION['user_id'] ?? 1; 
    
    $success = $service->confirmBooking($sessionId, $userId, $specialRequests);
    echo json_encode(['success' => $success]);
    exit;
}

if ($action === 'get_topics') {
    $topics = $service->getTopics();
    echo json_encode(['success' => true, 'topics' => $topics]);
    exit;
}

if ($action === 'get_facilitators') {
    $topicId = $_GET['topic_id'] ?? null;
    $facilitators = $service->getFacilitators($topicId);
    echo json_encode(['success' => true, 'facilitators' => $facilitators]);
    exit;
}

if ($action === 'add_session') {
    $data = json_decode(file_get_contents('php://input'), true);
    $fid = $data['facilitator_id'] ?? 0;
    $topic = $data['topic'] ?? '';
    $dt = $data['date_time'] ?? '';
    $mode = $data['mode'] ?? 'Onsite';
    $success = $service->addSession($fid, $topic, $dt, $mode);
    echo json_encode(['success' => $success]);
    exit;
}

if ($action === 'remove_session') {
    $data = json_decode(file_get_contents('php://input'), true);
    $sid = $data['session_id'] ?? 0;
    $success = $service->removeSession($sid);
    echo json_encode(['success' => $success]);
    exit;
}

if ($action === 'add_facilitator') {
    $data = json_decode(file_get_contents('php://input'), true);
    $name = $data['name'] ?? '';
    // expect an array of topic ids
    $topicIds = $data['topic_ids'] ?? [];
    $success = $service->addFacilitator($name, $topicIds);
    echo json_encode(['success' => $success]);
    exit;
}

if ($action === 'update_facilitator') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? 0;
    $name = $data['name'] ?? '';
    // expect an array of topic ids
    $topicIds = $data['topic_ids'] ?? [];
    $success = $service->updateFacilitator($id, $name, $topicIds);
    echo json_encode(['success' => $success]);
    exit;
}

if ($action === 'delete_facilitator') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? 0;
    $success = $service->deleteFacilitator($id);
    echo json_encode(['success' => $success]);
    exit;
}

if ($action === 'advanced_booking') {
    $data = json_decode(file_get_contents('php://input'), true);
    $type = $data['type'] ?? 'Consultation';
    $fid = $data['facilitator_id'] ?? 0;
    $dt = $data['date_time'] ?? '';
    $et = $data['end_time'] ?? '';
    $mode = $data['mode'] ?? 'Onsite';
    $name = $data['name'] ?? '';
    $email = $data['email'] ?? '';
    $phone = $data['phone'] ?? '';
    $notes = $data['notes'] ?? '';
    $reminder = $data['reminder'] ?? '30';
    $topic = $data['topic'] ?? 'General Consultation';
    
    // Auth context (simulated or session based)
    $userId = $_SESSION['user_id'] ?? 1;
    
    $specialRequests = "Name: $name | Email: $email | Phone: $phone | Reminder: $reminder minutes";
    if ($notes) {
        $specialRequests .= " | Notes: $notes";
    }
    
    $success = $service->createAdvancedBooking($type, $fid, $topic, $dt, $et, $mode, $userId, $specialRequests);
    echo json_encode(['success' => $success]);
    exit;
}

if ($action === 'get_appointments') {
    $userId = $_SESSION['user_id'] ?? 1;
    $isAdmin = isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin';
    $apps = $service->getAppointments($userId, $isAdmin);
    echo json_encode(['success' => true, 'appointments' => $apps]);
    exit;
}

if ($action === 'update_appointment') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? 0;
    $status = $data['status'] ?? 'PENDING';
    $venue = $data['venue'] ?? 'TBA';
    $facId = $data['facilitator_id'] ?? null;
    $success = $service->updateAppointment($id, $status, $venue, $facId);
    echo json_encode(['success' => $success]);
    exit;
}

if ($action === 'cancel_appointment') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? 0;
    $success = $service->cancelAppointment($id);
    echo json_encode(['success' => $success]);
    exit;
}

if ($action === 'change_instructor') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? 0;
    $success = $service->changeInstructorToTba($id);
    echo json_encode(['success' => $success]);
    exit;
}

if ($action === 'get_seminars') {
    $seminars = $service->getSeminars();
    echo json_encode(['success' => true, 'seminars' => $seminars]);
    exit;
}

if ($action === 'add_seminar') {
    $data = json_decode(file_get_contents('php://input'), true);
    $title = $data['title'] ?? '';
    $desc = $data['description'] ?? '';
    $dt = $data['date_time'] ?? '';
    $speaker = $data['speaker'] ?? '';
    $venue = $data['venue'] ?? '';
    $success = $service->addSeminar($title, $desc, $dt, $speaker, $venue);
    echo json_encode(['success' => $success]);
    exit;
}

if ($action === 'delete_seminar') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? 0;
    $success = $service->deleteSeminar($id);
    echo json_encode(['success' => $success]);
    exit;
}

echo json_encode(['success' => false, 'message' => 'API Endpoint Unrecognized']);
