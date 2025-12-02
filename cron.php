<?php
/**
 * Cron job to increment reps every Monday before 6am
 *
 * Add to crontab:
 * 0 5 * * 1 php /path/to/tracker/cron.php
 *
 * This runs every Monday at 5:00 AM
 */

require_once 'config.php';

// Check if today is Monday (1 = Monday)
$dayOfWeek = date('N');

if ($dayOfWeek != 1) {
    echo "Not Monday. Skipping increment.\n";
    exit;
}

// Check if time is before 6am
$currentHour = date('G');

if ($currentHour >= 6) {
    echo "Already past 6am. Skipping increment.\n";
    exit;
}

// Connect to database
$conn = getDBConnection();

// Get all exercises
$sql = "SELECT id, name, reps, increment_value FROM exercises WHERE increment_value > 0";
$result = $conn->query($sql);

$updatedCount = 0;

while ($row = $result->fetch_assoc()) {
    $exerciseId = $row['id'];
    $newReps = $row['reps'] + $row['increment_value'];

    // Update the exercise
    $updateSql = "UPDATE exercises SET reps = ? WHERE id = ?";
    $stmt = $conn->prepare($updateSql);
    $stmt->bind_param('ii', $newReps, $exerciseId);

    if ($stmt->execute()) {
        $updatedCount++;
        echo "Updated {$row['name']}: {$row['reps']} -> {$newReps} reps\n";
    }
}

$conn->close();

echo "\nTotal exercises updated: {$updatedCount}\n";
echo "Increment completed successfully!\n";
