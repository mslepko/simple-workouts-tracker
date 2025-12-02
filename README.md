# Workout Tracker

A simple web-based workout tracker for home exercises with automatic progression.

## Features

- Add exercises with name, reps, sets, and weekly schedule
- Daily view showing only today's scheduled exercises
- Checkbox to mark exercises as complete (resets on scheduled days)
- Automatic rep increment every Monday before 6am
- Full CRUD operations for exercise management
- Workout history tracking
- No authentication required

## Requirements

- PHP 7.0 or higher
- MySQL 5.6 or higher
- Web server (Apache/Nginx)

## Installation

### 1. Database Setup

Create the database and tables:

```bash
mysql -u your_username -p < database.sql
```

Or manually run the SQL commands in `database.sql` using phpMyAdmin or MySQL command line.

### 2. Configure Database Connection

Edit `config.php` and update the database credentials:

```php
define('DB_HOST', 'localhost');
define('DB_USER', 'your_username');
define('DB_PASS', 'your_password');
define('DB_NAME', 'workout_tracker');
```

### 3. Upload Files

Upload all files to your web server directory:
- database.sql
- config.php
- api.php
- index.html
- styles.css
- app.js
- cron.php

### 4. Set Up Cron Job

To enable automatic rep increment every Monday before 6am, add this to your crontab:

```bash
crontab -e
```

Add this line (adjust the path to match your installation):

```
0 5 * * 1 php /path/to/tracker/cron.php
```

This will run every Monday at 5:00 AM.

Alternatively, if you have cPanel or similar hosting control panel, set up a cron job through the interface:
- Command: `php /path/to/tracker/cron.php`
- Schedule: Weekly, Monday, 5:00 AM

### 5. Access the App

Open your browser and navigate to:
```
http://yourdomain.com/tracker/
```

## Usage

### Adding Exercises

1. Click "Add Exercise" button
2. Enter exercise name (e.g., "Pushups", "Squats")
3. Set number of reps and sets
4. Select which days of the week to perform the exercise
5. Set the Monday increment value (how many reps to add each Monday)
6. Click "Save"

### Daily Workout

- The app automatically shows exercises scheduled for today
- Check the box next to each exercise as you complete it
- Completed exercises are tracked in the history

### Managing Exercises

- Edit: Click "Edit" to modify exercise details
- Delete: Click "Delete" to remove an exercise

### Automatic Progression

Every Monday before 6am, the cron job automatically increases the reps for all exercises by their configured increment value.

For example:
- If Squats are at 20 reps with +5 increment
- On Monday, they automatically become 25 reps

## File Structure

```
tracker/
├── database.sql       # Database schema
├── config.php        # Database configuration
├── api.php           # Backend API endpoints
├── index.html        # Main application page
├── styles.css        # Styling
├── app.js            # Frontend JavaScript
├── cron.php          # Auto-increment cron job
└── README.md         # This file
```

## Troubleshooting

### Exercises not showing

- Check that you selected at least one day of the week for the exercise
- Verify you're viewing on a day the exercise is scheduled for

### Database connection errors

- Verify database credentials in `config.php`
- Check that the database exists and tables are created
- Ensure PHP MySQL extension is enabled

### Cron job not working

- Verify the cron job is properly configured
- Check file path in crontab is correct
- Ensure PHP CLI is available on your server
- Check server logs for cron execution

### Auto-increment not working

- Verify cron job is running (check cron logs)
- Test manually: `php cron.php`
- Check that increment values are set for exercises

## Security Notes

This app has no authentication and should only be used in trusted environments. For production use:

- Add authentication
- Use HTTPS
- Implement CSRF protection
- Validate and sanitize all inputs
- Restrict database user permissions

## License

Free to use and modify as needed.
