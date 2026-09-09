# IronLog 🏋️‍♂️

A lightweight, local-first Progressive Web App (PWA) designed for frictionless mobile workout tracking. Features automatic Google Sheets synchronization, rest timers, previous-session memory, and a built-in full-body training guide.

---

## ✨ Features

- **📱 Standalone Mobile Experience:** Runs full-screen with no browser address bars when installed via Chrome or Safari.
- **🔒 Privacy & Local-First:** Your workout logs stay on your device via `localStorage`. No mandatory user accounts or external logins.
- **📊 Google Sheets Sync (Option B):** Automatically appends sets to your own private Google Sheet via a lightweight Google Apps Script webhook.
- **👻 Ghost Memory (Progressive Overload):** Automatically loads the weights, reps, or times from your previous session as subtle placeholders.
- **⏱️ Integrated Rest Timer:** 90-second countdown with haptic vibration alerts upon completing any set.
- **📋 3-Day Full-Body Split:** Pre-configured templates optimized for 60-minute sessions (30-min cardio warmup + 30-min compound free weights).
- **📖 Step-by-Step Exercise Guide:** Dedicated form cues, setup instructions, and breathing guides accessible directly inside the app.
- **🎯 Multi-Modal Tracking:** Supports:
  - **Weight × Reps** (strength training)
  - **Duration** (planks, isometric holds)
  - **Distance + Time** (treadmill, running, walking)

---

## 🗂️ Project Structure

```text
├── index.html        # App layout, tabs (Workout, Guide, History, Settings)
├── style.css         # Dark gym theme, responsive layout, and animations
├── app.js            # Workout state, routine templates, timers, and UI logic
├── sync.js           # Google Sheets sync bridge, localStorage, and JSON backups
├── manifest.json     # PWA configuration for mobile installation
├── sw.js             # Service worker for offline reliability and caching
└── README.md         # Project documentation
```

---

## 🚀 Quick Start & Installation

### 1. Host on GitHub Pages
1. Fork or clone this repository.
2. In your repo, navigate to **Settings > Pages**.
3. Under **Build and deployment > Branch**, select `main` (root) and click **Save**.
4. GitHub will generate your live HTTPS URL (e.g., `https://<username>.github.io/<repo-name>/`).

### 2. Install on Your Phone
- **Android (Chrome):** Open your site URL -> tap the three dots -> tap **Install app** or **Add to Home screen**.
- **iOS (Safari):** Open your site URL -> tap the **Share** button -> tap **Add to Home Screen**.

---

## 🔗 Google Sheets Integration Setup

To automatically log workouts to your personal Google Drive without exposing secrets in your public repository:

### 1. Prepare the Spreadsheet
1. Create a new sheet at [sheets.new](https://sheets.new).
2. Set the following headers in Row 1:
   - `Timestamp` | `Date` | `Exercise` | `Type` | `Set` | `Weight` | `Reps` | `Distance` | `Duration` | `Completed`

### 2. Add Google Apps Script
1. In your sheet, navigate to **Extensions > Apps Script**.
2. Replace the contents of `Code.gs` with the following:

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const payload = JSON.parse(e.postData.contents);
    const dateStr = payload.date || new Date().toISOString();
    const rows = [];

    payload.exercises.forEach(exercise => {
      const type = exercise.type || "weight";
      exercise.sets.forEach((set, idx) => {
        rows.push([
          new Date(),
          dateStr,
          exercise.name,
          type,
          idx + 1,
          set.weight || "",
          set.reps || "",
          set.distance || "",
          set.duration || "",
          set.completed ? "Yes" : "No"
        ]);
      });
    });

    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 10).setValues(rows);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", rowsAdded: rows.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

### 3. Deploy the Web App
1. Click **Deploy > New deployment**.
2. Select type: **Web app**.
3. Set **Execute as:** `Me` and **Who has access:** `Anyone`.
4. Click **Deploy**, authorize permissions, and copy the **Web App URL** ending in `/exec`.

### 4. Connect in App
1. Open IronLog on your phone and go to the **Settings (⚙️)** tab.
2. Paste your Web App URL and tap **Save Webhook URL**.
3. Your workouts will now automatically sync to your spreadsheet in the background.

---

## 🔒 Security Model

- **No Hardcoded Secrets:** Your private Apps Script webhook URL is saved solely within your phone's browser `localStorage`.
- **Safe for Public Repositories:** No personal URLs, authentication keys, or workout metrics are stored in source control.

---

## 📄 License

MIT License. Free to use, modify, and distribute.