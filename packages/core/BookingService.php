<?php
require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/NotificationWorker.php';

class BookingService {
    private $db;
    
    public function __construct() {
        $this->db = (new Database())->getPdo();
    }
    

    public function getTopics() {
        $stmt = $this->db->query("SELECT * FROM topics ORDER BY name ASC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getFacilitators($topicId = null) {
        $sql = "
            SELECT f.*, 
                   GROUP_CONCAT(t.name, ', ') as expertise,
                   GROUP_CONCAT(tf.topic_id, ',') as topic_ids
            FROM facilitators f
            LEFT JOIN topic_facilitators tf ON f.id = tf.facilitator_id
            LEFT JOIN topics t ON tf.topic_id = t.id
        ";
        
        $params = [];
        if ($topicId) {
            $sql .= " WHERE f.id IN (SELECT facilitator_id FROM topic_facilitators WHERE topic_id = ?) ";
            $params[] = $topicId;
        }
        
        $sql .= " GROUP BY f.id ORDER BY f.name ASC ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function addSession($facilitatorId, $topic, $dateTime, $mode) {
        $stmt = $this->db->prepare("INSERT INTO sessions (facilitator_id, topic, date_time, mode, status) VALUES (?, ?, ?, ?, 'AVAILABLE')");
        return $stmt->execute([$facilitatorId, $topic, $dateTime, $mode]);
    }

    public function removeSession($sessionId) {
        // Only allow removing available sessions
        $stmt = $this->db->prepare("DELETE FROM sessions WHERE id = ? AND status = 'AVAILABLE'");
        return $stmt->execute([$sessionId]);
    }

    public function addFacilitator($name, $topicIds = []) {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("INSERT INTO facilitators (name) VALUES (?)");
            $stmt->execute([$name]);
            $facilitatorId = $this->db->lastInsertId();
            
            if (!empty($topicIds)) {
                $stmt = $this->db->prepare("INSERT INTO topic_facilitators (topic_id, facilitator_id) VALUES (?, ?)");
                foreach ($topicIds as $tid) {
                    $stmt->execute([$tid, $facilitatorId]);
                }
            }
            
            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            return false;
        }
    }

    public function updateFacilitator($id, $name, $topicIds = []) {
        $this->db->beginTransaction();
        try {
            $stmt = $this->db->prepare("UPDATE facilitators SET name = ? WHERE id = ?");
            $stmt->execute([$name, $id]);
            
            $stmt = $this->db->prepare("DELETE FROM topic_facilitators WHERE facilitator_id = ?");
            $stmt->execute([$id]);
            
            if (!empty($topicIds)) {
                $stmt = $this->db->prepare("INSERT INTO topic_facilitators (topic_id, facilitator_id) VALUES (?, ?)");
                foreach ($topicIds as $tid) {
                    $stmt->execute([$tid, $id]);
                }
            }
            
            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            return false;
        }
    }

    public function deleteFacilitator($id) {
        $this->db->beginTransaction();
        try {
            // Remove sessions first
            $stmt = $this->db->prepare("DELETE FROM sessions WHERE facilitator_id = ?");
            $stmt->execute([$id]);
            
            $stmt = $this->db->prepare("DELETE FROM topic_facilitators WHERE facilitator_id = ?");
            $stmt->execute([$id]);
            
            $stmt = $this->db->prepare("DELETE FROM facilitators WHERE id = ?");
            $stmt->execute([$id]);
            
            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            return false;
        }
    }

    public function createAdvancedBooking($type, $facilitatorId, $topic, $dateTime, $endTime, $mode, $userId, $specialRequests) {
        $this->db->beginTransaction();
        try {
            // Nullify facilitator for Seminar or Orientation
            if (in_array(strtolower((string)$type), ['seminar', 'orientation'])) {
                $facilitatorId = null;
            }

            $stmt = $this->db->prepare("INSERT INTO sessions (user_id, type, facilitator_id, topic, date_time, end_time, mode, status, special_requests) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)");
            $stmt->execute([$userId, $type, $facilitatorId, $topic, $dateTime, $endTime, $mode, $specialRequests]);
            $sessionId = $this->db->lastInsertId();

            $this->db->commit();
            NotificationWorker::sendConfirmation($userId, $sessionId, $mode);
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            return false;
        }
    }

    public function getAppointments($userId, $isAdmin = false) {
        $sql = "
            SELECT s.id as session_id, s.type as appointment_type, s.topic, s.date_time, s.end_time, s.mode, s.venue,
                   s.status as booking_status, s.special_requests,
                   f.name as facilitator_name, f.id as facilitator_id,
                   u.name as student_name
            FROM sessions s
            LEFT JOIN facilitators f ON s.facilitator_id = f.id
            JOIN users u ON s.user_id = u.id
        ";
        
        $params = [];
        if (!$isAdmin) {
            $sql .= " WHERE s.user_id = ? ";
            $params[] = $userId;
        }
        
        $sql .= " ORDER BY s.date_time ASC ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function updateAppointment($sessionId, $status, $venue, $facilitatorId) {
        $this->db->beginTransaction();
        try {
            $facId = ($facilitatorId && $facilitatorId !== 'null' && $facilitatorId !== '0') ? $facilitatorId : null;
            $stmt = $this->db->prepare("UPDATE sessions SET status = ?, venue = ?, facilitator_id = ? WHERE id = ?");
            $stmt->execute([$status, $venue, $facId, $sessionId]);
            
            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            return false;
        }
    }

    public function cancelAppointment($sessionId) {
        $stmt = $this->db->prepare("UPDATE sessions SET status = 'Cancelled' WHERE id = ?");
        return $stmt->execute([$sessionId]);
    }

    public function changeInstructorToTba($sessionId) {
        $stmt = $this->db->prepare("UPDATE sessions SET status = 'PENDING', facilitator_id = NULL WHERE id = ?");
        return $stmt->execute([$sessionId]);
    }

    /* Seminar Management */
    public function getSeminars() {
        $stmt = $this->db->query("SELECT * FROM seminars ORDER BY date_time ASC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function addSeminar($title, $desc, $dt, $speaker, $venue) {
        $stmt = $this->db->prepare("INSERT INTO seminars (title, description, date_time, speaker, venue) VALUES (?, ?, ?, ?, ?)");
        return $stmt->execute([$title, $desc, $dt, $speaker, $venue]);
    }

    public function deleteSeminar($id) {
        $stmt = $this->db->prepare("DELETE FROM seminars WHERE id = ?");
        return $stmt->execute([$id]);
    }
}
