const defaultTasks = [
  { id: 1, title: 'Review chapter 4 notes', course: 'Biology', done: false },
  { id: 2, title: 'Finish problem set', course: 'Statistics', done: false },
  { id: 3, title: 'Read research paper', course: 'Psychology', done: false },
  { id: 4, title: 'Prepare flashcards', course: 'Biology', done: true },
];
const schedule = [
  { time: '9:00 AM', title: 'Deep work Â· Biology revision', detail: 'Study block Â· 90 min', tag: 'Focus' },
  { time: '10:30 AM', title: 'Biology lecture', detail: 'Lecture hall B Â· 60 min', tag: 'Class' },
  { time: '12:00 PM', title: 'Statistics problem set', detail: 'Library Â· 45 min', tag: 'Study' },
  { time: '2:00 PM', title: 'Research methods seminar', detail: 'Room 204 Â· 90 min', tag: 'Class' },
];
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
let tasks = loadTasks();
let activeView = 'today';

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem('studyflow.tasks'));
    return Array.isArray(saved) ? saved : defaultTasks;
  } catch { return defaultTasks; }
}
function saveTasks() { localStorage.setItem('studyflow.tasks', JSON.stringify(tasks)); }
function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(date);
}
$('#top-date').textContent = formatDate();
$('#date-kicker').textContent = formatDate().toUpperCase();

function renderSchedule() {
  $('#schedule-list').innerHTML = schedule.map(item => `<div class="schedule-row"><span class="schedule-time">${item.time}</span><span class="timeline-mark"><i></i></span><div class="schedule-info"><div><strong>${item.title}</strong><small>${item.detail}</small></div><span class="schedule-tag">${item.tag}</span></div></div>`).join('');
}
function taskRow(task) {
  return `<div class="task-row ${task.done ? 'done' : ''}" data-task="${task.id}"><button class="task-check" aria-label="${task.done ? 'Mark incomplete' : 'Mark complete'}"><svg viewBox="0 0 12 12"><path d="m2 6 2.5 2.5L10 3"/></svg></button><span class="task-title">${escapeHtml(task.title)}</span><span class="task-course">${escapeHtml(task.course)}</span></div>`;
}
function renderTasks() {
  const openCount = tasks.filter(task => !task.done).length;
  $('#task-list').innerHTML = tasks.slice(0, 4).map(taskRow).join('') || '<p class="empty-note">No tasks yet. Add one to get started.</p>';
  $('#nav-count').textContent = openCount;
  $('#task-stat').innerHTML = `${openCount} <small>tasks</small>`;
  $('#tasks-subtitle').textContent = openCount ? `${openCount} things to move forward` : 'All caught up for now';
}
function renderChart(values = [3.1, 4.4, 2.7, 5.1, 3.4, 1.4, 2.2]) {
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  $('#focus-chart').innerHTML = values.map((value, i) => `<div class="bar-wrap"><div class="bar ${i === 2 ? 'today' : ''}" style="height:${Math.min(value / 6 * 100, 100)}%"></div><span class="bar-label">${labels[i]}</span></div>`).join('');
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function renderAlternate(view) {
  const pane = $('#alternate-view');
  const titles = { schedule: 'Your schedule', tasks: 'All tasks', goals: 'Goals that matter', insights: 'Your study insights' };
  const descriptions = { schedule: 'A clear view of what your day holds.', tasks: 'Small steps, steadily moving forward.', goals: 'Keep your longer-term plans in sight.', insights: 'A few useful signals from your study rhythm.' };
  let content = '';
  if (view === 'schedule') content = `<div class="alternate-list">${schedule.map(item => `<div class="schedule-row"><span class="schedule-time">${item.time}</span><span class="timeline-mark"><i></i></span><div class="schedule-info"><div><strong>${item.title}</strong><small>${item.detail}</small></div><span class="schedule-tag">${item.tag}</span></div></div>`).join('')}</div>`;
  if (view === 'tasks') content = `<button class="primary-button" id="alternate-add-task">ï¼‹ Add a task</button><div class="alternate-list">${tasks.map(taskRow).join('') || '<p class="empty-note">No tasks yet. Add one to get started.</p>'}</div>`;
  if (view === 'goals') content = `<div class="alternate-list"><div class="goal-item"><div class="goal-mark goal-green">01</div><div class="goal-info"><strong>Finish biology revision</strong><span>8 of 12 study sessions</span><div class="goal-track"><i style="width:67%"></i></div></div><b>67%</b></div><div class="goal-item"><div class="goal-mark goal-yellow">02</div><div class="goal-info"><strong>Build a steady routine</strong><span>5 of 7 days this week</span><div class="goal-track yellow-track"><i style="width:71%"></i></div></div><b>71%</b></div><button class="new-goal" id="alternate-add-goal"><span>ï¼‹</span> Add a goal</button></div>`;
  if (view === 'insights') content = `<div class="alternate-list"><div class="focus-summary"><strong>14.5 <small>hrs</small></strong><span><b>+2.5 hrs</b> from last week</span></div><p style="color:#89938a;font-size:12px">Your most focused day so far is Wednesday. You have logged 4h 20m of focus time today, and your weekly consistency is 82%.</p><div class="chart" style="height:140px"><div class="chart-y"><span>6h</span><span>4h</span><span>2h</span><span>0</span></div><div class="chart-main"><div class="chart-grid"><i></i><i></i><i></i><i></i></div><div class="bars" id="alternate-chart"></div></div></div></div>`;
  pane.innerHTML = `<h1>${titles[view]}</h1><p>${descriptions[view]}</p>${content}`;
  if (view === 'insights') {
    const target = $('#focus-chart').innerHTML;
    $('#alternate-chart').innerHTML = target;
  }
  $$('.task-check', pane).forEach(button => button.addEventListener('click', toggleTask));
  $('#alternate-add-task')?.addEventListener('click', openTaskDialog);
  $('#alternate-add-goal')?.addEventListener('click', addGoal);
}
function setView(view) {
  activeView = view;
  $$('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  $('#breadcrumb-page').textContent = view[0].toUpperCase() + view.slice(1);
  const dashboard = $('#dashboard-view');
  const alternate = $('#alternate-view');
  dashboard.hidden = view !== 'today';
  alternate.hidden = view === 'today';
  if (view !== 'today') renderAlternate(view);
  $('#sidebar').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function toggleTask(event) {
  const id = Number(event.currentTarget.closest('[data-task]').dataset.task);
  tasks = tasks.map(task => task.id === id ? { ...task, done: !task.done } : task);
  saveTasks(); renderTasks();
  if (activeView === 'tasks') renderAlternate('tasks');
}
function openTaskDialog() { $('#task-dialog').showModal(); setTimeout(() => $('#task-title').focus(), 30); }
function addGoal() { window.alert('Your next goal is ready to take shape. Goal editing is coming in the next step.'); }

renderSchedule(); renderTasks(); renderChart();
$$('.nav-link').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
$$('[data-view]').filter(element => !element.classList.contains('nav-link')).forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
$$('.task-check').forEach(button => button.addEventListener('click', toggleTask));
$('#add-task').addEventListener('click', openTaskDialog);
$('#task-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const title = String(data.get('title')).trim();
  if (!title) return;
  tasks.unshift({ id: Date.now(), title, course: String(data.get('course')), done: false });
  saveTasks(); renderTasks();
  if (activeView === 'tasks') renderAlternate('tasks');
  form.reset(); $('#task-dialog').close();
});
$('#task-dialog').addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });
$('#mobile-menu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
$('#plan-button').addEventListener('click', () => {
  const firstOpen = tasks.find(task => !task.done);
  if (firstOpen) {
    tasks = tasks.map(task => task.id === firstOpen.id ? { ...task, done: true } : task);
    saveTasks(); renderTasks();
    $('#plan-button').innerHTML = 'âœ“ Plan in motion';
    setTimeout(() => { $('#plan-button').innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> Plan my day'; }, 1800);
  } else setView('schedule');
});
$('#focus-range').addEventListener('click', event => {
  const weekly = event.currentTarget.dataset.range !== 'week';
  event.currentTarget.dataset.range = weekly ? 'week' : 'month';
  event.currentTarget.innerHTML = weekly ? 'This month <span>âŒ„</span>' : 'This week <span>âŒ„</span>';
  renderChart(weekly ? [3.6, 5.2, 4.1, 5.7, 3.8, 2.5, 3.2] : [3.1, 4.4, 2.7, 5.1, 3.4, 1.4, 2.2]);
});
$('#add-goal').addEventListener('click', addGoal);

