<?php
require_once 'config.php';

echo "Running database migration...\n\n";

$conn = getDBConnection();

// Check if columns already exist
$checkSql = "SHOW COLUMNS FROM exercises LIKE 'value_type'";
$result = $conn->query($checkSql);

if ($result->num_rows > 0) {
    echo "✓ Columns already exist. No migration needed.\n";
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

$conn->close();

echo "\nMigration complete!\n";
?>
