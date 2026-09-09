// LocalStorage helpers
function getHistory() {
  return JSON.parse(localStorage.getItem('workout_history') || '[]');
}

function saveHistory(history) {
  localStorage.setItem('workout_history', JSON.stringify(history));
}

function getSheetUrl() {
  return localStorage.getItem('google_sheet_url') || '';
}

function updateStatusIndicator() {
  const url = getSheetUrl();
  const statusEl = document.getElementById('db-status');
  if (!statusEl) return;
  
  if (url) {
    statusEl.innerText = 'Sheets Connected 🟢';
    statusEl.style.color = 'var(--accent)';
  } else {
    statusEl.innerText = 'Local Only ⚪';
    statusEl.style.color = 'var(--text-dim)';
  }
}

// Save Settings
function saveSettings() {
  const url = document.getElementById('sheet-url-input').value.trim();
  localStorage.setItem('google_sheet_url', url);
  updateStatusIndicator();
  alert('Settings saved!');
}

// Google Sheets Sync Bridge
// Payload includes: id, date, exercises: [{ name, type, sets: [{ weight, reps, duration, distance, completed }] }]
async function sendToSheet(entry) {
  const url = getSheetUrl();
  if (!url) return false;

  try {
    // Apps Script requires text/plain to bypass CORS preflight checks
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(entry)
    });
    return true;
  } catch (e) {
    console.error('Failed to push to Google Sheet', e);
    return false;
  }
}

// Bulk sync for un-synced workouts
async function syncAllUnsynced() {
  const url = getSheetUrl();
  if (!url) return alert('Please enter and save a Webhook URL first!');

  const history = getHistory();
  let syncCount = 0;

  for (let item of history) {
    if (!item.synced) {
      const success = await sendToSheet(item);
      if (success) {
        item.synced = true;
        syncCount++;
      }
    }
  }

  saveHistory(history);
  if (typeof renderHistory === 'function') {
    renderHistory();
  }
  alert(`Sync finished! Pushed ${syncCount} workout(s) to your Sheet.`);
}

// Export JSON file fallback
function exportData() {
  const blob = new Blob([localStorage.getItem('workout_history') || '[]'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ironlog-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
}

// Clear all local workout history
function clearAllHistory() {
  const history = getHistory();
  if (history.length === 0) {
    return alert('History is already empty.');
  }

  const confirmed = confirm(
    'Are you sure you want to clear all workout history from this device?\n\n(Note: Any workouts already synced to your Google Sheet will remain safe in your Sheet).'
  );

  if (confirmed) {
    localStorage.removeItem('workout_history');
    if (typeof renderHistory === 'function') {
      renderHistory();
    }
  }
}