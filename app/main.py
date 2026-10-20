"""Studyflow Flask server and JSON API. Run with: python app/main.py"""

from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

APP_DIR = Path(__file__).resolve().parent
FRONTEND_DIST = APP_DIR / "frontend" / "dist"
DATABASE = APP_DIR / "studyflow.sqlite3"
app = Flask(__name__, static_folder=None)


def connect_db() -> sqlite3.Connection:
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    return db


@contextmanager
def database():
    db = connect_db()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db() -> None:
    APP_DIR.mkdir(parents=True, exist_ok=True)
    with database() as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                course TEXT NOT NULL DEFAULT 'Personal',
                done INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                detail TEXT NOT NULL DEFAULT 'La început de drum',
                progress INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        """)
        if db.execute("SELECT COUNT(*) FROM tasks").fetchone()[0] == 0:
            db.executemany("INSERT INTO tasks(title, course, done) VALUES (?, ?, ?)", [
                ("Recitește notițele de la curs", "Biologie", 0),
                ("Rezolvă setul de probleme", "Statistică", 0),
                ("Citește articolul pentru seminar", "Psihologie", 0),
                ("Pregătește fișele de recapitulare", "Biologie", 1),
            ])
        if db.execute("SELECT COUNT(*) FROM goals").fetchone()[0] == 0:
            db.executemany("INSERT INTO goals(title, detail, progress) VALUES (?, ?, ?)", [
                ("Termină recapitularea la biologie", "8 din 12 sesiuni de studiu", 67),
                ("Construiește o rutină constantă", "5 din 7 zile săptămâna aceasta", 71),
            ])


def rows(table: str) -> list[dict]:
    with database() as db:
        return [dict(row) for row in db.execute(f"SELECT * FROM {table} ORDER BY id")]


@app.get("/api/tasks")
def get_tasks():
    return jsonify(rows("tasks"))


@app.post("/api/tasks")
def create_task():
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    if not title:
        return jsonify(error="Numele sarcinii este obligatoriu."), 400
    course = str(data.get("course", "Personal")).strip() or "Personal"
    with database() as db:
        cursor = db.execute("INSERT INTO tasks(title, course) VALUES (?, ?)", (title[:120], course[:60]))
        task = db.execute("SELECT * FROM tasks WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return jsonify(dict(task)), 201


@app.patch("/api/tasks/<int:task_id>")
def update_task(task_id: int):
    data = request.get_json(silent=True) or {}
    allowed = {key: data[key] for key in ("title", "course", "done") if key in data}
    if not allowed:
        return jsonify(error="Nu există modificări."), 400
    if "done" in allowed:
        allowed["done"] = int(bool(allowed["done"]))
    with database() as db:
        assignments = ", ".join(f"{key} = ?" for key in allowed)
        db.execute(f"UPDATE tasks SET {assignments} WHERE id = ?", (*allowed.values(), task_id))
        row = db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if row is None:
        return jsonify(error="Sarcina nu a fost găsită."), 404
    return jsonify(dict(row))


@app.delete("/api/tasks/<int:task_id>")
def delete_task(task_id: int):
    with database() as db:
        cursor = db.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    if cursor.rowcount == 0:
        return jsonify(error="Sarcina nu a fost găsită."), 404
    return "", 204


@app.get("/api/goals")
def get_goals():
    return jsonify(rows("goals"))


@app.post("/api/goals")
def create_goal():
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    if not title:
        return jsonify(error="Numele obiectivului este obligatoriu."), 400
    with database() as db:
        cursor = db.execute("INSERT INTO goals(title, detail) VALUES (?, ?)", (title[:120], "La început de drum"))
        goal = db.execute("SELECT * FROM goals WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return jsonify(dict(goal)), 201


@app.patch("/api/goals/<int:goal_id>")
def update_goal(goal_id: int):
    data = request.get_json(silent=True) or {}
    progress = data.get("progress")
    if not isinstance(progress, int) or not 0 <= progress <= 100:
        return jsonify(error="Progresul trebuie să fie între 0 și 100."), 400
    with database() as db:
        db.execute("UPDATE goals SET progress = ? WHERE id = ?", (progress, goal_id))
        row = db.execute("SELECT * FROM goals WHERE id = ?", (goal_id,)).fetchone()
    if row is None:
        return jsonify(error="Obiectivul nu a fost găsit."), 404
    return jsonify(dict(row))


@app.delete("/api/goals/<int:goal_id>")
def delete_goal(goal_id: int):
    with database() as db:
        cursor = db.execute("DELETE FROM goals WHERE id = ?", (goal_id,))
    if cursor.rowcount == 0:
        return jsonify(error="Obiectivul nu a fost găsit."), 404
    return "", 204


@app.get("/api/overview")
def get_overview():
    with database() as db:
        total = db.execute("SELECT COUNT(*) FROM tasks").fetchone()[0]
        complete = db.execute("SELECT COUNT(*) FROM tasks WHERE done = 1").fetchone()[0]
        goal_count = db.execute("SELECT COUNT(*) FROM goals").fetchone()[0]
    return jsonify({"task_count": total - complete, "completed_count": complete, "goal_count": goal_count, "focus_hours": 14.5, "consistency": 82})


@app.get("/assets/<path:filename>")
def frontend_assets(filename: str):
    return send_from_directory(FRONTEND_DIST / "assets", filename)


@app.get("/")
def index():
    index_file = FRONTEND_DIST / "index.html"
    if not index_file.exists():
        return ("Interfața React nu este încă compilată. Rulează `npm install` și `npm run build` în app/frontend.", 503)
    return send_from_directory(FRONTEND_DIST, "index.html")


@app.get("/<path:route>")
def frontend_route(route: str):
    if route.startswith("api/") or route.startswith("assets/"):
        return jsonify(error="Nu a fost găsită ruta."), 404
    index_file = FRONTEND_DIST / "index.html"
    if not index_file.exists():
        return ("Interfața React nu este încă compilată. Rulează `npm install` și `npm run build` în app/frontend.", 503)
    return send_from_directory(FRONTEND_DIST, "index.html")


if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", "5000"))
    print(f"Studyflow rulează la http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=True)
