<?php
require_once 'config.php';

$conn = getDBConnection();

// Get request method and action
$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Handle different API endpoints
switch ($action) {
    case 'get_exercises':
        getExercises($conn);
        break;

    case 'get_today_exercises':
        getTodayExercises($conn);
        break;

    case 'add_exercise':
        addExercise($conn);
        break;

    case 'update_exercise':
        updateExercise($conn);
        break;

    case 'delete_exercise':
        deleteExercise($conn);
        break;

    case 'toggle_completion':
        toggleCompletion($conn);
        break;

    case 'get_history':
        getHistory($conn);
        break;

    case 'get_date_exercises':
        getDateExercises($conn);
        break;

    case 'get_cumulative_stats':
        getCumulativeStats($conn);
        break;

    case 'get_calendar_data':
        getCalendarData($conn);
        break;

    default:
        echo json_encode(['error' => 'Invalid action']);
        break;
}

$conn->close();

// Get all exercises
function getExercises($conn) {
    $sql = "SELECT * FROM exercises ORDER BY name";
    $result = $conn->query($sql);

    $exercises = [];
    while ($row = $result->fetch_assoc()) {
        $exercises[] = $row;
    }

    echo json_encode($exercises);
}

// Get today's exercises based on day of week
function getTodayExercises($conn) {
    $today = date('w'); // 0 (Sunday) to 6 (Saturday)
    $todayDate = date('Y-m-d');

    $sql = "SELECT e.*,
                   CASE WHEN wl.completed IS NOT NULL THEN 1 ELSE 0 END as is_completed
            FROM exercises e
            LEFT JOIN workout_log wl ON e.id = wl.exercise_id AND wl.completed_date = ?
            WHERE FIND_IN_SET(?, e.days_of_week) > 0
            ORDER BY e.name";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param('ss', $todayDate, $today);
    $stmt->execute();
    $result = $stmt->get_result();

    $exercises = [];
    while ($row = $result->fetch_assoc()) {
        $exercises[] = $row;
    }

    echo json_encode($exercises);
}

// Add new exercise
function addExercise($conn) {
    $data = json_decode(file_get_contents('php://input'), true);

    $name = $data['name'];
    $reps = $data['reps'];
    $sets = $data['sets'];
    $days = implode(',', $data['days']);
    $increment = $data['increment_value'];

    $sql = "INSERT INTO exercises (name, reps, sets, days_of_week, increment_value) VALUES (?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('siisi', $name, $reps, $sets, $days, $increment);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'id' => $conn->insert_id]);
    } else {
        echo json_encode(['error' => 'Failed to add exercise']);
    }
}

// Update exercise
function updateExercise($conn) {
    $data = json_decode(file_get_contents('php://input'), true);

    $id = $data['id'];
    $name = $data['name'];
    $reps = $data['reps'];
    $sets = $data['sets'];
    $days = implode(',', $data['days']);
    $increment = $data['increment_value'];

    $sql = "UPDATE exercises SET name=?, reps=?, sets=?, days_of_week=?, increment_value=? WHERE id=?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('siisii', $name, $reps, $sets, $days, $increment, $id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['error' => 'Failed to update exercise']);
    }
}

// Delete exercise
function deleteExercise($conn) {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;

    $sql = "DELETE FROM exercises WHERE id=?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('i', $id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['error' => 'Failed to delete exercise']);
    }
}

// Toggle exercise completion
function toggleCompletion($conn) {
    $data = json_decode(file_get_contents('php://input'), true);

    $exerciseId = $data['exercise_id'];
    $date = $data['date'];
    $completed = $data['completed'];

    if ($completed) {
        // Mark as completed
        $sql = "INSERT INTO workout_log (exercise_id, completed_date, completed)
                VALUES (?, ?, 1)
                ON DUPLICATE KEY UPDATE completed = 1";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('is', $exerciseId, $date);
    } else {
        // Mark as not completed (remove from log)
        $sql = "DELETE FROM workout_log WHERE exercise_id=? AND completed_date=?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('is', $exerciseId, $date);
    }

    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['error' => 'Failed to update completion status']);
    }
}

// Get workout history
function getHistory($conn) {
    $days = isset($_GET['days']) ? intval($_GET['days']) : 30;

    $sql = "SELECT e.name, wl.completed_date, wl.completed
            FROM workout_log wl
            JOIN exercises e ON wl.exercise_id = e.id
            WHERE wl.completed_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            ORDER BY wl.completed_date DESC, e.name";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param('i', $days);
    $stmt->execute();
    $result = $stmt->get_result();

    $history = [];
    while ($row = $result->fetch_assoc()) {
        $history[] = $row;
    }

    echo json_encode($history);
}

// Get exercises for a specific date
function getDateExercises($conn) {
    $date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
    $dayOfWeek = date('w', strtotime($date));

    $sql = "SELECT e.*,
                   CASE WHEN wl.completed IS NOT NULL THEN 1 ELSE 0 END as is_completed
            FROM exercises e
            LEFT JOIN workout_log wl ON e.id = wl.exercise_id AND wl.completed_date = ?
            WHERE FIND_IN_SET(?, e.days_of_week) > 0
            ORDER BY e.name";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param('ss', $date, $dayOfWeek);
    $stmt->execute();
    $result = $stmt->get_result();

    $exercises = [];
    while ($row = $result->fetch_assoc()) {
        $exercises[] = $row;
    }

    echo json_encode($exercises);
}

// Get cumulative statistics for all exercises
function getCumulativeStats($conn) {
    $sql = "SELECT e.id, e.name,
                   COUNT(wl.id) as total_workouts,
                   COALESCE(SUM(CASE WHEN wl.id IS NOT NULL THEN e.sets * e.reps ELSE 0 END), 0) as total_reps
            FROM exercises e
            LEFT JOIN workout_log wl ON e.id = wl.exercise_id
            GROUP BY e.id, e.name
            ORDER BY e.name";

    $result = $conn->query($sql);

    $stats = [];
    while ($row = $result->fetch_assoc()) {
        $stats[] = $row;
    }

    echo json_encode($stats);
}

// Get calendar data for a specific month
function getCalendarData($conn) {
    $year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');
    $month = isset($_GET['month']) ? intval($_GET['month']) : date('m');

    // Get first and last day of the month
    $firstDay = sprintf('%04d-%02d-01', $year, $month);
    $lastDay = date('Y-m-t', strtotime($firstDay));

    // Get all workout dates in this month with count of exercises completed
    $sql = "SELECT completed_date, COUNT(DISTINCT exercise_id) as exercise_count
            FROM workout_log
            WHERE completed_date >= ? AND completed_date <= ?
            GROUP BY completed_date";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param('ss', $firstDay, $lastDay);
    $stmt->execute();
    $result = $stmt->get_result();

    $calendar = [];
    while ($row = $result->fetch_assoc()) {
        $calendar[$row['completed_date']] = $row['exercise_count'];
    }

    echo json_encode($calendar);
}
