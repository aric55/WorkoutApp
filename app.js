// State management
let currentWorkout = [];
let timerInterval = null;
let secondsRemaining = 0;

// 3-Day 60-Minute Workout Templates (30m Walk + 30m Free Weights)
const TEMPLATES = {
  dayA: [
    { name: "Treadmill Walk", type: "distance", sets: [{ distance: "1.5", duration: "30:00", completed: false }] },
    { name: "Goblet / Barbell Squat", type: "weight", sets: [{ weight: "", reps: "8", completed: false }, { weight: "", reps: "8", completed: false }, { weight: "", reps: "8", completed: false }] },
    { name: "Dumbbell Bench Press", type: "weight", sets: [{ weight: "", reps: "10", completed: false }, { weight: "", reps: "10", completed: false }, { weight: "", reps: "10", completed: false }] },
    { name: "Dumbbell Romanian Deadlift", type: "weight", sets: [{ weight: "", reps: "10", completed: false }, { weight: "", reps: "10", completed: false }, { weight: "", reps: "10", completed: false }] },
    { name: "Plank", type: "time", sets: [{ duration: "45s", completed: false }, { duration: "45s", completed: false }] }
  ],
  dayB: [
    { name: "Treadmill Walk", type: "distance", sets: [{ distance: "1.5", duration: "30:00", completed: false }] },
    { name: "Deadlift (Barbell or DB)", type: "weight", sets: [{ weight: "", reps: "6", completed: false }, { weight: "", reps: "6", completed: false }, { weight: "", reps: "6", completed: false }] },
    { name: "Dumbbell Overhead Press", type: "weight", sets: [{ weight: "", reps: "8", completed: false }, { weight: "", reps: "8", completed: false }, { weight: "", reps: "8", completed: false }] },
    { name: "Dumbbell Bent-Over Row", type: "weight", sets: [{ weight: "", reps: "10", completed: false }, { weight: "", reps: "10", completed: false }, { weight: "", reps: "10", completed: false }] },
    { name: "Hanging Knee Raise", type: "weight", sets: [{ weight: "0", reps: "12", completed: false }, { weight: "0", reps: "12", completed: false }] }
  ],
  dayC: [
    { name: "Treadmill Walk", type: "distance", sets: [{ distance: "1.5", duration: "30:00", completed: false }] },
    { name: "Dumbbell Walking Lunges", type: "weight", sets: [{ weight: "", reps: "10", completed: false }, { weight: "", reps: "10", completed: false }, { weight: "", reps: "10", completed: false }] },
    { name: "Dumbbell Incline Bench Press", type: "weight", sets: [{ weight: "", reps: "10", completed: false }, { weight: "", reps: "10", completed: false }, { weight: "", reps: "10", completed: false }] },
    { name: "Lat Pulldown (or DB Pullover)", type: "weight", sets: [{ weight: "", reps: "10", completed: false }, { weight: "", reps: "10", completed: false }, { weight: "", reps: "10", completed: false }] },
    { name: "Side Plank", type: "time", sets: [{ duration: "30s", completed: false }, { duration: "30s", completed: false }] }
  ]
};

// Find the last logged performance for a given exercise and set index
function getLastSessionSet(exerciseName, setIndex) {
  const history = typeof getHistory === 'function' ? getHistory() : [];
  const cleanName = exerciseName.trim().toLowerCase();

  for (const session of history) {
    const matchedEx = session.exercises.find(
      e => e.name.trim().toLowerCase() === cleanName
    );
    if (matchedEx && matchedEx.sets && matchedEx.sets.length > 0) {
      return matchedEx.sets[setIndex] || matchedEx.sets[matchedEx.sets.length - 1];
    }
  }
  return null;
}

// Load a template into the active session
function loadTemplate(templateKey) {
  if (currentWorkout.length > 0) {
    const overwrite = confirm("Replace your current exercises with this template?");
    if (!overwrite) return;
  }
  
  const template = TEMPLATES[templateKey];
  currentWorkout = JSON.parse(JSON.stringify(template)).map(ex => ({
    ...ex,
    id: Date.now() + Math.random()
  }));

  renderWorkout();
}

// Clear current session
function resetWorkout() {
  if (currentWorkout.length === 0) return;
  if (confirm("Clear current exercises?")) {
    currentWorkout = [];
    renderWorkout();
  }
}

// UI Tab Navigation
function switchTab(tab) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  if (tab === 'workout') {
    document.getElementById('workout-view').classList.add('active');
    document.getElementById('nav-workout').classList.add('active');
  } else if (tab === 'history') {
    document.getElementById('history-view').classList.add('active');
    document.getElementById('nav-history').classList.add('active');
    renderHistory();
  } else if (tab === 'settings') {
    document.getElementById('settings-view').classList.add('active');
    document.getElementById('nav-settings').classList.add('active');
    const sheetInput = document.getElementById('sheet-url-input');
    if (sheetInput && typeof getSheetUrl === 'function') {
      sheetInput.value = getSheetUrl();
    }
  }
}

// Workout builder
function addExercise() {
  const input = document.getElementById('new-exercise-input');
  const name = input.value.trim();
  if (!name) return;

  currentWorkout.push({
    id: Date.now(),
    name: name,
    type: 'weight',
    sets: [createEmptySet('weight')]
  });

  input.value = '';
  renderWorkout();
}

function createEmptySet(type, previousSet = {}) {
  if (type === 'time') {
    return { duration: previousSet.duration || '', completed: false };
  } else if (type === 'distance') {
    return { distance: previousSet.distance || '', duration: previousSet.duration || '', completed: false };
  } else {
    return { weight: previousSet.weight || '', reps: previousSet.reps || '', completed: false };
  }
}

function changeExerciseType(index, newType) {
  currentWorkout[index].type = newType;
  currentWorkout[index].sets = [createEmptySet(newType)];
  renderWorkout();
}

function removeExercise(index) {
  currentWorkout.splice(index, 1);
  renderWorkout();
}

function addSet(exerciseIndex) {
  const ex = currentWorkout[exerciseIndex];
  const lastSet = ex.sets.slice(-1)[0] || {};
  ex.sets.push(createEmptySet(ex.type, lastSet));
  renderWorkout();
}

function removeSet(exerciseIndex, setIndex) {
  currentWorkout[exerciseIndex].sets.splice(setIndex, 1);
  renderWorkout();
}

function updateSet(exerciseIndex, setIndex, field, value) {
  currentWorkout[exerciseIndex].sets[setIndex][field] = value;
}

function toggleComplete(exerciseIndex, setIndex) {
  const set = currentWorkout[exerciseIndex].sets[setIndex];
  set.completed = !set.completed;
  renderWorkout();

  if (set.completed) {
    startTimer(90);
    if (navigator.vibrate) navigator.vibrate(100);
  }
}

// Timer Logic
function startTimer(seconds) {
  clearInterval(timerInterval);
  secondsRemaining = seconds;
  const banner = document.getElementById('timer-banner');
  banner.style.display = 'flex';
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    secondsRemaining--;
    updateTimerDisplay();
    if (secondsRemaining <= 0) {
      stopTimer();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  document.getElementById('timer-banner').style.display = 'none';
}

function updateTimerDisplay() {
  const m = String(Math.floor(secondsRemaining / 60)).padStart(2, '0');
  const s = String(secondsRemaining % 60).padStart(2, '0');
  document.getElementById('timer-display').innerText = `${m}:${s}`;
}

// Render active workout interface
function renderWorkout() {
  const container = document.getElementById('exercises-container');
  container.innerHTML = '';

  currentWorkout.forEach((exercise, exIdx) => {
    const card = document.createElement('div');
    card.className = 'exercise-card';
    const type = exercise.type || 'weight';

    let colHeaders = '';
    let gridStyle = '';

    if (type === 'weight') {
      gridStyle = 'grid-template-columns: 35px 1fr 1fr 45px 35px;';
      colHeaders = `
        <div>Set</div>
        <div>Lbs / Kg</div>
        <div>Reps</div>
        <div style="text-align:center">Done</div>
        <div></div>
      `;
    } else if (type === 'time') {
      gridStyle = 'grid-template-columns: 35px 2fr 45px 35px;';
      colHeaders = `
        <div>Set</div>
        <div>Time</div>
        <div style="text-align:center">Done</div>
        <div></div>
      `;
    } else if (type === 'distance') {
      gridStyle = 'grid-template-columns: 35px 1fr 1fr 45px 35px;';
      colHeaders = `
        <div>Set</div>
        <div>Distance</div>
        <div>Time</div>
        <div style="text-align:center">Done</div>
        <div></div>
      `;
    }

    let setsHTML = `<div class="set-row set-header" style="${gridStyle}">${colHeaders}</div>`;

    exercise.sets.forEach((set, setIdx) => {
      const last = getLastSessionSet(exercise.name, setIdx);
      let inputsHTML = '';

      if (type === 'weight') {
        const weightPlaceholder = (last && last.weight) ? last.weight : '0';
        const repsPlaceholder = (last && last.reps) ? last.reps : '0';

        inputsHTML = `
          <input type="number" value="${set.weight || ''}" placeholder="${weightPlaceholder}" 
            oninput="updateSet(${exIdx}, ${setIdx}, 'weight', this.value)" />
          <input type="number" value="${set.reps || ''}" placeholder="${repsPlaceholder}" 
            oninput="updateSet(${exIdx}, ${setIdx}, 'reps', this.value)" />
        `;
      } else if (type === 'time') {
        const timePlaceholder = (last && last.duration) ? last.duration : 'e.g. 45s';

        inputsHTML = `
          <input type="text" value="${set.duration || ''}" placeholder="${timePlaceholder}" 
            oninput="updateSet(${exIdx}, ${setIdx}, 'duration', this.value)" />
        `;
      } else if (type === 'distance') {
        const distPlaceholder = (last && last.distance) ? last.distance : 'mi / km';
        const timePlaceholder = (last && last.duration) ? last.duration : '30:00';

        inputsHTML = `
          <input type="text" value="${set.distance || ''}" placeholder="${distPlaceholder}" 
            oninput="updateSet(${exIdx}, ${setIdx}, 'distance', this.value)" />
          <input type="text" value="${set.duration || ''}" placeholder="${timePlaceholder}" 
            oninput="updateSet(${exIdx}, ${setIdx}, 'duration', this.value)" />
        `;
      }

      setsHTML += `
        <div class="set-row" style="${gridStyle}">
          <div style="font-weight:600; color:var(--text-dim);">${setIdx + 1}</div>
          ${inputsHTML}
          <button class="btn-check ${set.completed ? 'completed' : ''}" 
            onclick="toggleComplete(${exIdx}, ${setIdx})">✓</button>
          <button class="btn-del" onclick="removeSet(${exIdx}, ${setIdx})">×</button>
        </div>
      `;
    });

    card.innerHTML = `
      <div class="exercise-header">
        <div>
          <div class="exercise-title">${exercise.name}</div>
          <select style="background:#262626; color:var(--text-dim); border:1px solid var(--border); border-radius:4px; font-size:0.75rem; padding:2px 4px; margin-top:4px;"
            onchange="changeExerciseType(${exIdx}, this.value)">
            <option value="weight" ${type === 'weight' ? 'selected' : ''}>Weight × Reps</option>
            <option value="time" ${type === 'time' ? 'selected' : ''}>Duration (e.g. Planks)</option>
            <option value="distance" ${type === 'distance' ? 'selected' : ''}>Distance + Time (Cardio)</option>
          </select>
        </div>
        <button class="btn-small btn-secondary" onclick="removeExercise(${exIdx})">Remove</button>
      </div>
      ${setsHTML}
      <button class="btn-small btn-secondary" style="margin-top:0.5rem;" onclick="addSet(${exIdx})">+ Add Set</button>
    `;

    container.appendChild(card);
  });
}

// Finish and Log Workout
async function finishWorkout() {
  if (currentWorkout.length === 0) return alert('No exercises to log!');

  const history = getHistory();
  const entry = {
    id: Date.now(),
    date: new Date().toISOString(),
    exercises: currentWorkout,
    synced: false
  };

  history.unshift(entry);
  saveHistory(history);

  const sheetUrl = typeof getSheetUrl === 'function' ? getSheetUrl() : '';
  if (sheetUrl && typeof sendToSheet === 'function') {
    const success = await sendToSheet(entry);
    if (success) {
      entry.synced = true;
      saveHistory(history);
    }
  }

  currentWorkout = [];
  renderWorkout();
  switchTab('history');
}

// Render History
function renderHistory() {
  const container = document.getElementById('history-container');
  const history = typeof getHistory === 'function' ? getHistory() : [];
  container.innerHTML = '';

  if (history.length === 0) {
    container.innerHTML = '<p style="color:var(--text-dim)">No workouts logged yet.</p>';
    return;
  }

  history.forEach(item => {
    const dateStr = new Date(item.date).toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const card = document.createElement('div');
    card.className = 'history-card';

    let details = item.exercises.map(ex => {
      const type = ex.type || 'weight';
      const sets = ex.sets || [];
      const totalSets = sets.filter(s => s.completed).length || sets.length;

      let summary = '';
      if (type === 'time') {
        const topSet = sets[0]?.duration ? `${sets[0].duration}` : 'Logged';
        summary = `${totalSets} sets (${topSet})`;
      } else if (type === 'distance') {
        const d = sets[0]?.distance || '0';
        const t = sets[0]?.duration || '0';
        summary = `${d} in ${t}`;
      } else {
        const bestSet = sets.reduce((max, s) => Number(s.weight) > Number(max.weight || 0) ? s : max, {});
        summary = `${totalSets} sets (Top: ${bestSet.weight || 0} × ${bestSet.reps || 0})`;
      }

      return `<li><strong>${ex.name}</strong>: ${summary}</li>`;
    }).join('');

    const syncBadge = item.synced 
      ? '<span class="sync-badge synced">Synced</span>' 
      : '<span class="sync-badge pending">Local Only</span>';

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3>Workout</h3>
        ${syncBadge}
      </div>
      <div class="history-meta">${dateStr}</div>
      <ul style="padding-left:1.2rem; font-size:0.9rem; line-height:1.4;">${details}</ul>
    `;
    container.appendChild(card);
  });
}

// Initialize on load
if (typeof updateStatusIndicator === 'function') {
  updateStatusIndicator();
}