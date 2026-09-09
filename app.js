// State management
let currentWorkout = [];
let timerInterval = null;
let secondsRemaining = 0;

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
    document.getElementById('sheet-url-input').value = getSheetUrl();
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
    sets: [{ weight: '', reps: '', completed: false }]
  });

  input.value = '';
  renderWorkout();
}

function removeExercise(index) {
  currentWorkout.splice(index, 1);
  renderWorkout();
}

function addSet(exerciseIndex) {
  const lastSet = currentWorkout[exerciseIndex].sets.slice(-1)[0] || { weight: '', reps: '' };
  currentWorkout[exerciseIndex].sets.push({
    weight: lastSet.weight,
    reps: lastSet.reps,
    completed: false
  });
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

    let setsHTML = `
      <div class="set-row set-header">
        <div>Set</div>
        <div>Lbs / Kg</div>
        <div>Reps</div>
        <div style="text-align:center">Done</div>
        <div></div>
      </div>
    `;

    exercise.sets.forEach((set, setIdx) => {
      setsHTML += `
        <div class="set-row">
          <div style="font-weight:600; color:var(--text-dim);">${setIdx + 1}</div>
          <input type="number" value="${set.weight}" placeholder="0" 
            oninput="updateSet(${exIdx}, ${setIdx}, 'weight', this.value)" />
          <input type="number" value="${set.reps}" placeholder="0" 
            oninput="updateSet(${exIdx}, ${setIdx}, 'reps', this.value)" />
          <button class="btn-check ${set.completed ? 'completed' : ''}" 
            onclick="toggleComplete(${exIdx}, ${setIdx})">✓</button>
          <button class="btn-del" onclick="removeSet(${exIdx}, ${setIdx})">×</button>
        </div>
      `;
    });

    card.innerHTML = `
      <div class="exercise-header">
        <div class="exercise-title">${exercise.name}</div>
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

  const sheetUrl = getSheetUrl();
  if (sheetUrl) {
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
  const history = getHistory();
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
      const totalSets = ex.sets.filter(s => s.completed).length || ex.sets.length;
      const bestSet = ex.sets.reduce((max, s) => Number(s.weight) > Number(max.weight || 0) ? s : max, {});
      return `<li><strong>${ex.name}</strong>: ${totalSets} sets (Top: ${bestSet.weight || 0} × ${bestSet.reps || 0})</li>`;
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
updateStatusIndicator();