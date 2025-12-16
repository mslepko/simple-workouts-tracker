// API base URL
const API_URL = 'api.php';

// DOM elements
const todayDateEl = document.getElementById('todayDate');
const todayExercisesEl = document.getElementById('todayExercises');
const allExercisesEl = document.getElementById('allExercises');
const calendarEl = document.getElementById('calendar');
const calendarMonthEl = document.getElementById('calendarMonth');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const exerciseModal = document.getElementById('exerciseModal');
const exerciseForm = document.getElementById('exerciseForm');
const addExerciseBtn = document.getElementById('addExerciseBtn');
const closeModal = document.querySelector('.close');
const cancelBtn = document.getElementById('cancelBtn');
const modalTitle = document.getElementById('modalTitle');
const editDayModal = document.getElementById('editDayModal');
const editDayModalTitle = document.getElementById('editDayModalTitle');
const editDayContent = document.getElementById('editDayContent');
const closeEditDay = document.getElementById('closeEditDay');

// Days of week
const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Current editing exercise ID
let currentEditingId = null;

// Current calendar view
let currentCalendarYear = new Date().getFullYear();
let currentCalendarMonth = new Date().getMonth() + 1;

// Cumulative stats cache
let cumulativeStats = {};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    displayTodayDate();
    loadTodayExercises();
    loadAllExercises();
    loadCalendar();

    // Event listeners
    addExerciseBtn.addEventListener('click', openAddModal);
    closeModal.addEventListener('click', closeExerciseModal);
    cancelBtn.addEventListener('click', closeExerciseModal);
    exerciseForm.addEventListener('submit', handleFormSubmit);
    closeEditDay.addEventListener('click', closeEditDayModal);
    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));

    // Value type change listener
    document.querySelectorAll('input[name="valueType"]').forEach(radio => {
        radio.addEventListener('change', handleValueTypeChange);
    });

    window.addEventListener('click', (e) => {
        if (e.target === exerciseModal) {
            closeExerciseModal();
        }
        if (e.target === editDayModal) {
            closeEditDayModal();
        }
    });
});

// Handle value type change
function handleValueTypeChange(e) {
    const valueType = e.target.value;
    const timeUnitGroup = document.getElementById('timeUnitGroup');
    const repsLabel = document.getElementById('exerciseRepsLabel');

    if (valueType === 'time') {
        timeUnitGroup.style.display = 'block';
        repsLabel.textContent = 'Time';
    } else {
        timeUnitGroup.style.display = 'none';
        repsLabel.textContent = 'Reps';
    }
}

// Get display text for exercise value
function getValueDisplay(exercise) {
    if (exercise.value_type === 'time') {
        return `${exercise.reps} ${exercise.time_unit}`;
    }
    return `${exercise.reps} reps`;
}

// Format seconds to human readable time
function formatTime(seconds) {
    if (seconds < 60) {
        return `${seconds}s`;
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    let result = [];
    if (hours > 0) result.push(`${hours}h`);
    if (minutes > 0) result.push(`${minutes}m`);
    if (remainingSeconds > 0) result.push(`${remainingSeconds}s`);

    return result.join(' ');
}

// Display today's date
function displayTodayDate() {
    const today = new Date();
    const dayName = daysOfWeek[today.getDay()];
    const dateStr = today.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    todayDateEl.textContent = `${dayName}, ${dateStr}`;
}

// Load today's exercises
async function loadTodayExercises() {
    try {
        const [exercisesResponse, streaksResponse] = await Promise.all([
            fetch(`${API_URL}?action=get_today_exercises`),
            fetch(`${API_URL}?action=get_streaks`)
        ]);

        const exercises = await exercisesResponse.json();
        const streaks = await streaksResponse.json();

        // Create streaks lookup
        const streaksLookup = {};
        streaks.forEach(streak => {
            streaksLookup[streak.exercise_id] = streak.current_streak;
        });

        if (exercises.length === 0) {
            todayExercisesEl.innerHTML = '<div class="empty-state">No exercises scheduled for today</div>';
            return;
        }

        todayExercisesEl.innerHTML = exercises.map(exercise => {
            const streak = streaksLookup[exercise.id] || 0;
            const valueDisplay = getValueDisplay(exercise);
            const exerciseDataJson = JSON.stringify({
                sets: exercise.sets,
                reps: exercise.reps,
                value_type: exercise.value_type,
                time_unit: exercise.time_unit
            }).replace(/"/g, '&quot;');

            return `
                <div class="exercise-item ${exercise.is_completed ? 'completed' : ''}">
                    <input type="checkbox"
                           class="exercise-checkbox"
                           data-exercise-id="${exercise.id}"
                           data-date="today"
                           data-exercise="${exerciseDataJson}"
                           ${exercise.is_completed ? 'checked' : ''}>
                    <div class="exercise-info">
                        <div class="exercise-name">
                            ${exercise.name}
                            ${streak > 0 ? `<span class="streak-badge" title="Current streak">${streak} 🔥</span>` : ''}
                        </div>
                        <div class="exercise-details">${exercise.sets} sets × ${valueDisplay}</div>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners to checkboxes
        document.querySelectorAll('#todayExercises .exercise-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', handleCheckboxChange);
        });
    } catch (error) {
        console.error('Error loading today exercises:', error);
        todayExercisesEl.innerHTML = '<div class="empty-state">Error loading exercises</div>';
    }
}

// Load all exercises for management
async function loadAllExercises() {
    try {
        // Load exercises, cumulative stats, and streaks in parallel
        const [exercisesResponse, statsResponse, streaksResponse] = await Promise.all([
            fetch(`${API_URL}?action=get_exercises`),
            fetch(`${API_URL}?action=get_cumulative_stats`),
            fetch(`${API_URL}?action=get_streaks`)
        ]);

        const exercises = await exercisesResponse.json();
        const stats = await statsResponse.json();
        const streaks = await streaksResponse.json();

        // Create stats lookup
        cumulativeStats = {};
        stats.forEach(stat => {
            cumulativeStats[stat.id] = stat;
        });

        // Create streaks lookup
        const streaksLookup = {};
        streaks.forEach(streak => {
            streaksLookup[streak.exercise_id] = streak.current_streak;
        });

        if (exercises.length === 0) {
            allExercisesEl.innerHTML = '<div class="empty-state">No exercises yet. Add your first exercise!</div>';
            return;
        }

        allExercisesEl.innerHTML = exercises.map(exercise => {
            const days = exercise.days_of_week.split(',').map(d => daysShort[parseInt(d)]).join(', ');
            const stat = cumulativeStats[exercise.id] || { total_workouts: 0, total_reps: 0 };
            const totalReps = stat.total_reps || 0;
            const streak = streaksLookup[exercise.id] || 0;
            const valueDisplay = getValueDisplay(exercise);
            const valueLabel = exercise.value_type === 'time' ? 'time' : 'reps';
            const totalDisplay = exercise.value_type === 'time' ? formatTime(totalReps) : totalReps.toLocaleString();

            return `
                <div class="exercise-item manage-item">
                    <div class="exercise-info">
                        <div class="exercise-name">
                            ${exercise.name}
                            ${streak > 0 ? `<span class="streak-badge" title="Current streak">${streak} 🔥</span>` : ''}
                        </div>
                        <div class="exercise-details">${exercise.sets} sets × ${valueDisplay} (+${exercise.increment_value} on Mondays)</div>
                        <div class="exercise-days">${days}</div>
                        <div class="exercise-cumulative">Total ${valueLabel} completed: ${totalDisplay}</div>
                    </div>
                    <div class="exercise-actions">
                        <button class="btn btn-edit" data-exercise-id="${exercise.id}" data-action="edit">Edit</button>
                        <button class="btn btn-delete" data-exercise-id="${exercise.id}" data-action="delete">Delete</button>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners to all exercise action buttons
        document.querySelectorAll('.exercise-actions button').forEach(button => {
            button.addEventListener('click', handleExerciseAction);
        });
    } catch (error) {
        console.error('Error loading all exercises:', error);
        allExercisesEl.innerHTML = '<div class="empty-state">Error loading exercises</div>';
    }
}

// Open edit day modal
async function openEditDayModal(dateStr) {
    try {
        const response = await fetch(`${API_URL}?action=get_date_exercises&date=${dateStr}`);
        const exercises = await response.json();

        const date = new Date(dateStr + 'T00:00:00');
        const dayName = daysOfWeek[date.getDay()];
        const dateFormatted = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        editDayModalTitle.textContent = `${dayName}, ${dateFormatted}`;

        if (exercises.length === 0) {
            editDayContent.innerHTML = '<div class="empty-state">No exercises scheduled for this day</div>';
        } else {
            editDayContent.innerHTML = exercises.map(exercise => {
                // Use completed values if they exist, otherwise use current planned values
                const displaySets = exercise.completed_sets || exercise.sets;
                let displayReps, displayValueType;

                if (exercise.completed_reps !== null && exercise.completed_reps !== undefined) {
                    // Rep-based exercise that was completed
                    displayReps = exercise.completed_reps;
                    displayValueType = 'reps';
                } else if (exercise.completed_time !== null && exercise.completed_time !== undefined) {
                    // Time-based exercise that was completed
                    displayReps = exercise.completed_time;
                    displayValueType = 'time';
                } else {
                    // Not completed yet, use current planned values
                    displayReps = exercise.reps;
                    displayValueType = exercise.value_type;
                }

                let valueDisplay;
                if (displayValueType === 'time') {
                    valueDisplay = formatTime(displayReps);
                } else {
                    valueDisplay = `${displayReps} reps`;
                }

                const exerciseDataJson = JSON.stringify({
                    sets: exercise.sets,
                    reps: exercise.reps,
                    value_type: exercise.value_type,
                    time_unit: exercise.time_unit
                }).replace(/"/g, '&quot;');

                return `
                    <div class="exercise-item ${exercise.is_completed ? 'completed' : ''}">
                        <input type="checkbox"
                               class="exercise-checkbox"
                               data-exercise-id="${exercise.id}"
                               data-date="${dateStr}"
                               data-exercise="${exerciseDataJson}"
                               ${exercise.is_completed ? 'checked' : ''}>
                        <div class="exercise-info">
                            <div class="exercise-name">${exercise.name}</div>
                            <div class="exercise-details">${displaySets} sets × ${valueDisplay}</div>
                        </div>
                    </div>
                `;
            }).join('');

            // Add event listeners to checkboxes
            document.querySelectorAll('#editDayContent .exercise-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', handleCheckboxChange);
            });
        }

        editDayModal.classList.add('active');
    } catch (error) {
        console.error('Error loading day exercises:', error);
        editDayContent.innerHTML = '<div class="empty-state">Error loading exercises</div>';
    }
}

// Close edit day modal
function closeEditDayModal() {
    editDayModal.classList.remove('active');
    editDayContent.innerHTML = '';
}

// Load calendar for current month
async function loadCalendar() {
    try {
        const response = await fetch(`${API_URL}?action=get_calendar_data&year=${currentCalendarYear}&month=${currentCalendarMonth}`);
        const calendarData = await response.json();

        renderCalendar(calendarData);
    } catch (error) {
        console.error('Error loading calendar:', error);
        calendarEl.innerHTML = '<div class="empty-state">Error loading calendar</div>';
    }
}

// Render calendar view
function renderCalendar(calendarData) {
    const date = new Date(currentCalendarYear, currentCalendarMonth - 1, 1);
    const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    calendarMonthEl.textContent = monthName;

    // Adjust firstDay to start week on Monday (0=Mon, 1=Tue, ..., 6=Sun)
    let firstDay = date.getDay();
    firstDay = (firstDay === 0) ? 6 : firstDay - 1;

    const daysInMonth = new Date(currentCalendarYear, currentCalendarMonth, 0).getDate();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Reorder days to start with Monday
    const daysShortMonFirst = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    let html = '<div class="calendar-grid">';

    // Day headers
    daysShortMonFirst.forEach(day => {
        html += `<div class="calendar-day-header">${day}</div>`;
    });

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentCalendarYear}-${String(currentCalendarMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasWorkout = calendarData[dateStr] > 0;
        const isToday = dateStr === todayStr;
        const isFuture = dateStr > todayStr;

        let classes = 'calendar-day';
        if (!isFuture) classes += ' clickable';
        if (hasWorkout) classes += ' has-workout';
        if (isToday) classes += ' today';
        if (isFuture) classes += ' future';

        html += `<div class="${classes}" data-date="${dateStr}">
            <span class="day-number">${day}</span>
            ${hasWorkout ? `<span class="workout-indicator">${calendarData[dateStr]}</span>` : ''}
        </div>`;
    }

    html += '</div>';
    calendarEl.innerHTML = html;

    // Add click event listeners to calendar days (only past and today)
    document.querySelectorAll('.calendar-day.clickable').forEach(dayEl => {
        dayEl.addEventListener('click', () => {
            const dateStr = dayEl.getAttribute('data-date');
            openEditDayModal(dateStr);
        });
    });
}

// Change calendar month
function changeMonth(delta) {
    currentCalendarMonth += delta;

    if (currentCalendarMonth > 12) {
        currentCalendarMonth = 1;
        currentCalendarYear++;
    } else if (currentCalendarMonth < 1) {
        currentCalendarMonth = 12;
        currentCalendarYear--;
    }

    loadCalendar();
}

// Handle checkbox change for exercise completion
function handleCheckboxChange(e) {
    const exerciseId = parseInt(e.target.getAttribute('data-exercise-id'));
    const dateAttr = e.target.getAttribute('data-date');
    const completed = e.target.checked;
    const exerciseData = e.target.getAttribute('data-exercise');

    if (dateAttr === 'today') {
        toggleCompletion(exerciseId, completed, exerciseData);
    } else {
        toggleCompletionForDate(exerciseId, dateAttr, completed, exerciseData);
    }
}

// Toggle exercise completion
async function toggleCompletion(exerciseId, completed, exerciseDataJson) {
    const today = new Date().toISOString().split('T')[0];

    try {
        const requestBody = {
            exercise_id: exerciseId,
            date: today,
            completed: completed
        };

        // If completing and we have exercise data, include the actual values
        if (completed && exerciseDataJson) {
            const exercise = JSON.parse(exerciseDataJson);
            requestBody.completed_sets = exercise.sets;

            if (exercise.value_type === 'time') {
                // Convert time to seconds based on time_unit
                let timeInSeconds = exercise.reps;
                if (exercise.time_unit === 'minutes') {
                    timeInSeconds = exercise.reps * 60;
                }
                requestBody.completed_time = timeInSeconds;
            } else {
                requestBody.completed_reps = exercise.reps;
            }
        }

        const response = await fetch(`${API_URL}?action=toggle_completion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const result = await response.json();

        if (result.success) {
            loadTodayExercises();
            loadAllExercises();
            loadCalendar();
        }
    } catch (error) {
        console.error('Error toggling completion:', error);
    }
}

// Toggle exercise completion for a specific date
async function toggleCompletionForDate(exerciseId, date, completed, exerciseDataJson) {
    try {
        const requestBody = {
            exercise_id: exerciseId,
            date: date,
            completed: completed
        };

        // If completing and we have exercise data, include the actual values
        if (completed && exerciseDataJson) {
            const exercise = JSON.parse(exerciseDataJson);
            requestBody.completed_sets = exercise.sets;

            if (exercise.value_type === 'time') {
                // Convert time to seconds based on time_unit
                let timeInSeconds = exercise.reps;
                if (exercise.time_unit === 'minutes') {
                    timeInSeconds = exercise.reps * 60;
                }
                requestBody.completed_time = timeInSeconds;
            } else {
                requestBody.completed_reps = exercise.reps;
            }
        }

        const response = await fetch(`${API_URL}?action=toggle_completion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const result = await response.json();

        if (result.success) {
            openEditDayModal(date);
            loadAllExercises();
            loadCalendar();
        }
    } catch (error) {
        console.error('Error toggling completion:', error);
    }
}

// Handle exercise action buttons (edit/delete)
function handleExerciseAction(e) {
    const exerciseId = parseInt(e.target.getAttribute('data-exercise-id'));
    const action = e.target.getAttribute('data-action');

    if (action === 'edit') {
        editExercise(exerciseId);
    } else if (action === 'delete') {
        deleteExercise(exerciseId);
    }
}

// Open add modal
function openAddModal() {
    currentEditingId = null;
    modalTitle.textContent = 'Add Exercise';
    exerciseForm.reset();
    exerciseModal.classList.add('active');
}

// Open edit modal
async function editExercise(id) {
    currentEditingId = id;
    modalTitle.textContent = 'Edit Exercise';

    try {
        const response = await fetch(`${API_URL}?action=get_exercises`);
        const exercises = await response.json();
        const exercise = exercises.find(e => e.id == id);

        if (exercise) {
            document.getElementById('exerciseName').value = exercise.name;
            document.getElementById('exerciseReps').value = exercise.reps;
            document.getElementById('exerciseSets').value = exercise.sets;
            document.getElementById('exerciseIncrement').value = exercise.increment_value;
            document.getElementById('exerciseLimit').value = exercise.limit_value || '';

            // Set value type
            const valueType = exercise.value_type || 'reps';
            document.querySelector(`input[name="valueType"][value="${valueType}"]`).checked = true;

            // Set time unit if applicable
            if (exercise.time_unit) {
                document.getElementById('timeUnit').value = exercise.time_unit;
            }

            // Show/hide time unit group based on value type
            const timeUnitGroup = document.getElementById('timeUnitGroup');
            const repsLabel = document.getElementById('exerciseRepsLabel');
            if (valueType === 'time') {
                timeUnitGroup.style.display = 'block';
                repsLabel.textContent = 'Time';
            } else {
                timeUnitGroup.style.display = 'none';
                repsLabel.textContent = 'Reps';
            }

            // Set checkboxes
            const days = exercise.days_of_week.split(',');
            document.querySelectorAll('input[name="day"]').forEach(checkbox => {
                checkbox.checked = days.includes(checkbox.value);
            });

            exerciseModal.classList.add('active');
        }
    } catch (error) {
        console.error('Error loading exercise:', error);
    }
}

// Delete exercise
async function deleteExercise(id) {
    if (!confirm('Are you sure you want to delete this exercise?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}?action=delete_exercise&id=${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            loadAllExercises();
            loadTodayExercises();
        }
    } catch (error) {
        console.error('Error deleting exercise:', error);
    }
}

// Close modal
function closeExerciseModal() {
    exerciseModal.classList.remove('active');
    exerciseForm.reset();
    currentEditingId = null;
}

// Handle form submit
async function handleFormSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('exerciseName').value;
    const reps = parseInt(document.getElementById('exerciseReps').value);
    const sets = parseInt(document.getElementById('exerciseSets').value);
    const increment = parseInt(document.getElementById('exerciseIncrement').value);
    const limitValue = document.getElementById('exerciseLimit').value;
    const valueType = document.querySelector('input[name="valueType"]:checked').value;
    const timeUnit = document.getElementById('timeUnit').value;

    const days = [];
    document.querySelectorAll('input[name="day"]:checked').forEach(checkbox => {
        days.push(checkbox.value);
    });

    if (days.length === 0) {
        alert('Please select at least one day');
        return;
    }

    const exerciseData = {
        name,
        reps,
        sets,
        days,
        increment_value: increment,
        limit_value: limitValue,
        value_type: valueType,
        time_unit: timeUnit
    };

    try {
        let url = `${API_URL}?action=`;
        if (currentEditingId) {
            url += 'update_exercise';
            exerciseData.id = currentEditingId;
        } else {
            url += 'add_exercise';
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(exerciseData)
        });

        const result = await response.json();

        if (result.success || result.id) {
            closeExerciseModal();
            loadAllExercises();
            loadTodayExercises();
        }
    } catch (error) {
        console.error('Error saving exercise:', error);
    }
}
