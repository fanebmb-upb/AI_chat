# Studyflow

Studyflow is a student planner built with React, Vite, Flask, and SQLite. The Flask server hosts the compiled React app and provides a JSON API for tasks, goals, and a small overview.

## Requirements

- Python 3.10+
- Node.js 20+

## Run locally on Windows PowerShell

Install frontend packages and build the React app:

```powershell
cd app/frontend
npm.cmd install
npm.cmd run build
cd ../..
```

Install Flask and start the local server:

```powershell
python -m pip install -r app/requirements.txt
python app/main.py
```

Open http://127.0.0.1:5000. Flask creates a local SQLite database at `app/studyflow.sqlite3` and seeds sample tasks and goals on first run. Data stays on this computer.

## React development mode

Run `npm.cmd run dev` from `app/frontend` to use Vite's development server while editing the React UI. The built local app is served by Flask at port 5000.

Schedule entries and focus metrics are sample data for this first version. Tasks and goals are stored in SQLite and can be added, completed, updated, and deleted from the app.
