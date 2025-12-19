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

// Get all exercises that are not paused
$sql = "SELECT id, name, reps, increment_value, limit_value FROM exercises WHERE increment_value > 0 AND is_paused = 0";
$result = $conn->query($sql);

$updatedCount = 0;
$limitReachedCount = 0;

while ($row = $result->fetch_assoc()) {
    $exerciseId = $row['id'];
    $currentReps = $row['reps'];
    $incrementValue = $row['increment_value'];
    $limitValue = $row['limit_value'];
    $newReps = $currentReps + $incrementValue;

    // Check if there's a limit and if we would exceed it
    if ($limitValue !== null && $newReps > $limitValue) {
        // Cap at the limit
        $newReps = $limitValue;

        // Only update if not already at limit
        if ($currentReps < $limitValue) {
            $updateSql = "UPDATE exercises SET reps = ? WHERE id = ?";
            $stmt = $conn->prepare($updateSql);
            $stmt->bind_param('ii', $newReps, $exerciseId);

            if ($stmt->execute()) {
                $updatedCount++;
                echo "Updated {$row['name']}: {$currentReps} -> {$newReps} reps (LIMIT REACHED)\n";
            }
        } else {
            $limitReachedCount++;
            echo "Skipped {$row['name']}: Already at limit ({$currentReps} reps)\n";
        }
    } else {
        // No limit or under limit, proceed normally
        $updateSql = "UPDATE exercises SET reps = ? WHERE id = ?";
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param('ii', $newReps, $exerciseId);

        if ($stmt->execute()) {
            $updatedCount++;
            echo "Updated {$row['name']}: {$currentReps} -> {$newReps} reps\n";
        }
    }
}

$conn->close();

echo "\nTotal exercises updated: {$updatedCount}\n";
if ($limitReachedCount > 0) {
    echo "Exercises already at limit: {$limitReachedCount}\n";
}
echo "Increment completed successfully!\n";
