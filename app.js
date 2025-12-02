// API base URL
const API_URL = 'api.php';

// DOM elements
const todayDateEl = document.getElementById('todayDate');
const todayExercisesEl = document.getElementById('todayExercises');
const allExercisesEl = document.getElementById('allExercises');
const previousDateEl = document.getElementById('previousDate');
const previousDayExercisesEl = document.getElementById('previousDayExercises');
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
    previousDateEl.addEventListener('change', handleDateChange);
    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));

    window.addEventListener('click', (e) => {
        if (e.target === exerciseModal) {
            closeExerciseModal();
        }
    });
});

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
        const response = await fetch(`${API_URL}?action=get_today_exercises`);
        const exercises = await response.json();

        if (exercises.length === 0) {
            todayExercisesEl.innerHTML = '<div class="empty-state">No exercises scheduled for today</div>';
            return;
        }

        todayExercisesEl.innerHTML = exercises.map(exercise => `
            <div class="exercise-item ${exercise.is_completed ? 'completed' : ''}">
                <input type="checkbox"
                       class="exercise-checkbox"
                       ${exercise.is_completed ? 'checked' : ''}
                       onchange="toggleCompletion(${exercise.id}, this.checked)">
                <div class="exercise-info">
                    <div class="exercise-name">${exercise.name}</div>
                    <div class="exercise-details">${exercise.sets} sets × ${exercise.reps} reps</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading today exercises:', error);
        todayExercisesEl.innerHTML = '<div class="empty-state">Error loading exercises</div>';
    }
}

// Load all exercises for management
async function loadAllExercises() {
    try {
        // Load exercises and cumulative stats in parallel
        const [exercisesResponse, statsResponse] = await Promise.all([
            fetch(`${API_URL}?action=get_exercises`),
            fetch(`${API_URL}?action=get_cumulative_stats`)
        ]);

        const exercises = await exercisesResponse.json();
        const stats = await statsResponse.json();

        // Create stats lookup
        cumulativeStats = {};
        stats.forEach(stat => {
            cumulativeStats[stat.id] = stat;
        });

        if (exercises.length === 0) {
            allExercisesEl.innerHTML = '<div class="empty-state">No exercises yet. Add your first exercise!</div>';
            return;
        }

        allExercisesEl.innerHTML = exercises.map(exercise => {
            const days = exercise.days_of_week.split(',').map(d => daysShort[parseInt(d)]).join(', ');
            const stat = cumulativeStats[exercise.id] || { total_workouts: 0, total_reps: 0 };
            const totalReps = stat.total_reps || 0;

            return `
                <div class="exercise-item manage-item">
                    <div class="exercise-info">
                        <div class="exercise-name">${exercise.name}</div>
                        <div class="exercise-details">${exercise.sets} sets × ${exercise.reps} reps (+${exercise.increment_value} on Mondays)</div>
                        <div class="exercise-days">${days}</div>
                        <div class="exercise-cumulative">Total reps completed: ${totalReps.toLocaleString()}</div>
                    </div>
                    <div class="exercise-actions">
                        <button class="btn btn-edit" onclick="editExercise(${exercise.id})">Edit</button>
                        <button class="btn btn-delete" onclick="deleteExercise(${exercise.id})">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading all exercises:', error);
        allExercisesEl.innerHTML = '<div class="empty-state">Error loading exercises</div>';
    }
}

// Handle previous date change
async function handleDateChange() {
    const selectedDate = previousDateEl.value;

    if (!selectedDate) {
        previousDayExercisesEl.innerHTML = '<div class="empty-state">Select a date to view exercises</div>';
        return;
    }

    try {
        const response = await fetch(`${API_URL}?action=get_date_exercises&date=${selectedDate}`);
        const exercises = await response.json();

        if (exercises.length === 0) {
            previousDayExercisesEl.innerHTML = '<div class="empty-state">No exercises scheduled for this day</div>';
            return;
        }

        previousDayExercisesEl.innerHTML = exercises.map(exercise => `
            <div class="exercise-item ${exercise.is_completed ? 'completed' : ''}">
                <input type="checkbox"
                       class="exercise-checkbox"
                       ${exercise.is_completed ? 'checked' : ''}
                       onchange="toggleCompletionForDate(${exercise.id}, '${selectedDate}', this.checked)">
                <div class="exercise-info">
                    <div class="exercise-name">${exercise.name}</div>
                    <div class="exercise-details">${exercise.sets} sets × ${exercise.reps} reps</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading previous day exercises:', error);
        previousDayExercisesEl.innerHTML = '<div class="empty-state">Error loading exercises</div>';
    }
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

    const firstDay = date.getDay();
    const daysInMonth = new Date(currentCalendarYear, currentCalendarMonth, 0).getDate();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    let html = '<div class="calendar-grid">';

    // Day headers
    daysShort.forEach(day => {
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

        let classes = 'calendar-day';
        if (hasWorkout) classes += ' has-workout';
        if (isToday) classes += ' today';

        html += `<div class="${classes}">
            <span class="day-number">${day}</span>
            ${hasWorkout ? `<span class="workout-indicator">${calendarData[dateStr]}</span>` : ''}
        </div>`;
    }

    html += '</div>';
    calendarEl.innerHTML = html;
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

// Toggle exercise completion
async function toggleCompletion(exerciseId, completed) {
    const today = new Date().toISOString().split('T')[0];

    try {
        const response = await fetch(`${API_URL}?action=toggle_completion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                exercise_id: exerciseId,
                date: today,
                completed: completed
            })
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
async function toggleCompletionForDate(exerciseId, date, completed) {
    try {
        const response = await fetch(`${API_URL}?action=toggle_completion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                exercise_id: exerciseId,
                date: date,
                completed: completed
            })
        });

        const result = await response.json();

        if (result.success) {
            handleDateChange();
            loadAllExercises();
            loadCalendar();
        }
    } catch (error) {
        console.error('Error toggling completion:', error);
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
        const exercise = exercises.find(e => e.id === id);

        if (exercise) {
            document.getElementById('exerciseName').value = exercise.name;
            document.getElementById('exerciseReps').value = exercise.reps;
            document.getElementById('exerciseSets').value = exercise.sets;
            document.getElementById('exerciseIncrement').value = exercise.increment_value;

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
        increment_value: increment
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
