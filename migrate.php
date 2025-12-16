<?php
require_once 'config.php';

echo "Running database migration...\n\n";

$conn = getDBConnection();

// Migration 1: Check if value_type columns exist in exercises table
$checkSql = "SHOW COLUMNS FROM exercises LIKE 'value_type'";
$result = $conn->query($checkSql);

if ($result->num_rows > 0) {
    echo "✓ value_type and time_unit columns already exist in exercises table.\n";
} else {
    // Add the new columns
    $sql = "ALTER TABLE exercises
            ADD COLUMN value_type ENUM('reps', 'time') DEFAULT 'reps' COMMENT 'Whether the exercise is measured in reps or time' AFTER increment_value,
            ADD COLUMN time_unit ENUM('seconds', 'minutes') DEFAULT 'seconds' COMMENT 'Time unit when value_type is time' AFTER value_type";

    if ($conn->query($sql) === TRUE) {
        echo "✓ Successfully added value_type and time_unit columns to exercises table.\n";
        echo "✓ All existing exercises have been set to 'reps' type by default.\n";
    } else {
        echo "✗ Error adding columns: " . $conn->error . "\n";
    }
}

// Migration 2: Check if completed tracking columns exist in workout_log table
$checkSql2 = "SHOW COLUMNS FROM workout_log LIKE 'completed_reps'";
$result2 = $conn->query($checkSql2);

if ($result2->num_rows > 0) {
    echo "✓ completed_reps, completed_sets, and completed_time columns already exist in workout_log table.\n";
} else {
    // Add the completed tracking columns
    $sql2 = "ALTER TABLE workout_log
            ADD COLUMN completed_reps INT DEFAULT NULL COMMENT 'Actual reps completed (for rep-based exercises)' AFTER completed,
            ADD COLUMN completed_sets INT DEFAULT NULL COMMENT 'Actual sets completed' AFTER completed_reps,
            ADD COLUMN completed_time INT DEFAULT NULL COMMENT 'Actual time completed in seconds (for time-based exercises)' AFTER completed_sets";

    if ($conn->query($sql2) === TRUE) {
        echo "✓ Successfully added completed_reps, completed_sets, and completed_time columns to workout_log table.\n";
        echo "✓ Historical workout data will now track actual completed values.\n";
    } else {
        echo "✗ Error adding columns: " . $conn->error . "\n";
    }
}

// Migration 3: Check if limit_value column exists in exercises table
$checkSql3 = "SHOW COLUMNS FROM exercises LIKE 'limit_value'";
$result3 = $conn->query($checkSql3);

if ($result3->num_rows > 0) {
    echo "✓ limit_value column already exists in exercises table.\n";
} else {
    // Add the limit_value column
    $sql3 = "ALTER TABLE exercises
            ADD COLUMN limit_value INT DEFAULT NULL COMMENT 'Maximum reps/time limit - increment stops when reached' AFTER increment_value";

    if ($conn->query($sql3) === TRUE) {
        echo "✓ Successfully added limit_value column to exercises table.\n";
        echo "✓ Exercises can now have a maximum limit for automatic increments.\n";
    } else {
        echo "✗ Error adding column: " . $conn->error . "\n";
    }
}

$conn->close();

echo "\nMigration complete!\n";
?>
