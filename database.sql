-- Workout Tracker Database Schema

CREATE DATABASE IF NOT EXISTS workout_tracker;
USE workout_tracker;

-- Exercises table
CREATE TABLE IF NOT EXISTS exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    reps INT NOT NULL,
    sets INT NOT NULL,
    days_of_week VARCHAR(50) NOT NULL COMMENT 'Comma-separated: 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat',
    increment_value INT NOT NULL DEFAULT 1 COMMENT 'Amount to increase reps by on Monday',
    limit_value INT DEFAULT NULL COMMENT 'Maximum reps/time limit - increment stops when reached',
    value_type ENUM('reps', 'time') DEFAULT 'reps' COMMENT 'Whether the exercise is measured in reps or time',
    time_unit ENUM('seconds', 'minutes') DEFAULT 'seconds' COMMENT 'Time unit when value_type is time',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Workout log table
CREATE TABLE IF NOT EXISTS workout_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exercise_id INT NOT NULL,
    completed_date DATE NOT NULL,
    completed TINYINT(1) DEFAULT 1,
    completed_reps INT DEFAULT NULL COMMENT 'Actual reps completed (for rep-based exercises)',
    completed_sets INT DEFAULT NULL COMMENT 'Actual sets completed',
    completed_time INT DEFAULT NULL COMMENT 'Actual time completed in seconds (for time-based exercises)',
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
    UNIQUE KEY unique_completion (exercise_id, completed_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Index for faster queries
CREATE INDEX idx_completed_date ON workout_log(completed_date);
CREATE INDEX idx_exercise_id ON workout_log(exercise_id);

-- Migration: Add value_type and time_unit columns if they don't exist
ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS value_type ENUM('reps', 'time') DEFAULT 'reps' COMMENT 'Whether the exercise is measured in reps or time',
ADD COLUMN IF NOT EXISTS time_unit ENUM('seconds', 'minutes') DEFAULT 'seconds' COMMENT 'Time unit when value_type is time';

-- Migration: Add completed reps/sets/time tracking columns if they don't exist
ALTER TABLE workout_log
ADD COLUMN IF NOT EXISTS completed_reps INT DEFAULT NULL COMMENT 'Actual reps completed (for rep-based exercises)',
ADD COLUMN IF NOT EXISTS completed_sets INT DEFAULT NULL COMMENT 'Actual sets completed',
ADD COLUMN IF NOT EXISTS completed_time INT DEFAULT NULL COMMENT 'Actual time completed in seconds (for time-based exercises)';

-- Migration: Add limit_value column to exercises table if it doesn't exist
ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS limit_value INT DEFAULT NULL COMMENT 'Maximum reps/time limit - increment stops when reached' AFTER increment_value;
