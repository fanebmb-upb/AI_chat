import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, ArrowUpRight, Bell, BookOpen, CalendarDays,
  Check, ChevronDown, Focus, Goal, LayoutDashboard, ListTodo, Menu, MoreHorizontal, Plus, Search,
  Sparkles, Target, TrendingUp, X,
} from 'lucide-react';

const navItems = [
  { id: 'today', label: 'Astăzi', icon: LayoutDashboard },
  { id: 'schedule', label: 'Program', icon: CalendarDays },
  { id: 'tasks', label: 'Sarcini', icon: ListTodo },
  { id: 'goals', label: 'Obiective', icon: Target },
  { id: 'insights', label: 'Statistici', icon: TrendingUp },
];
const timetable = [
  { time: '09:00', title: 'Recapitulare: celula eucariotă', detail: 'Biologie · sesiune de studiu', type: 'study' },
  { time: '10:30', title: 'Curs de biologie', detail: 'Amfiteatrul B · 60 min', type: 'class' },
  { time: '12:00', title: 'Setul de probleme 04', detail: 'Statistică · sesiune de studiu', type: 'task' },
  { time: '14:00', title: 'Seminar de psihologie', detail: 'Sala 204 · 90 min', type: 'class' },
];
const focusWeek = [3.1, 4.4, 2.7, 5.1, 3.4, 1.4, 2.2];
const days = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'];
const titles = { today: 'Astăzi', schedule: 'Programul meu', tasks: 'Sarcinile mele', goals: 'Obiectivele mele', insights: 'Ritmul meu de studiu' };

async function api(path, options) {
  const response = await fetch(`/api/${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    throw new Error(problem.error || 'Ceva nu a mers. Încearcă din nou.');
  }
  return response.status === 204 ? null : response.json();
}

function IconButton({ label, children, onClick, className = '' }) {
  return <button type="button" className={`icon-button ${className}`} aria-label={label} title={label} onClick={onClick}>{children}</button>;
}

function App() {
  const [page, setPage] = useState('today');
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [overview, setOverview] = useState({ focus_hours: 14.5, consistency: 82, task_count: 3, completed_count: 1 });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [range, setRange] = useState('Săptămâna aceasta');
  const [query, setQuery] = useState('');

  async function refresh() {
    const [taskRows, goalRows, summary] = await Promise.all([api('tasks'), api('goals'), api('overview')]);
    setTasks(taskRows); setGoals(goalRows); setOverview(summary);
  }

  useEffect(() => {
    refresh().catch(error => setNotice(error.message)).finally(() => setLoading(false));
  }, []);

  const todayLabel = new Intl.DateTimeFormat('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const openTasks = useMemo(() => tasks.filter(task => !task.done), [tasks]);
  const visibleTasks = useMemo(() => tasks.filter(task => `${task.title} ${task.course}`.toLowerCase().includes(query.toLowerCase())), [tasks, query]);

  async function createTask(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api('tasks', { method: 'POST', body: JSON.stringify({ title: form.get('title'), course: form.get('course') }) });
      await refresh(); setModal(null); setNotice('Sarcina a fost adăugată.');
    } catch (error) { setNotice(error.message); }
  }
  async function toggleTask(task) {
    try { await api(`tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ done: !task.done }) }); await refresh(); }
    catch (error) { setNotice(error.message); }
  }
  async function deleteTask(task) {
    try { await api(`tasks/${task.id}`, { method: 'DELETE' }); await refresh(); setNotice('Sarcina a fost ștearsă.'); }
    catch (error) { setNotice(error.message); }
  }
  async function createGoal(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api('goals', { method: 'POST', body: JSON.stringify({ title: form.get('title') }) });
      await refresh(); setModal(null); setNotice('Obiectivul a fost adăugat.');
    } catch (error) { setNotice(error.message); }
  }
  async function setGoalProgress(goal, progress) {
    try { await api(`goals/${goal.id}`, { method: 'PATCH', body: JSON.stringify({ progress: Number(progress) }) }); await refresh(); }
    catch (error) { setNotice(error.message); }
  }
  async function deleteGoal(goal) {
    try { await api(`goals/${goal.id}`, { method: 'DELETE' }); await refresh(); setNotice('Obiectivul a fost șters.'); }
    catch (error) { setNotice(error.message); }
  }

  const header = <header className="topbar">
    <div className="crumb"><span>Workspace</span><b>/</b><strong>{titles[page]}</strong></div>
    <div className="topbar-actions"><span className="today-date">{todayLabel}</span><IconButton label="Caută sarcini" onClick={() => { setPage('tasks'); setTimeout(() => document.querySelector('#task-search')?.focus(), 0); }}><Search size={17} /></IconButton><IconButton label="Notificări"><Bell size={17} /><i className="notification-dot" /></IconButton><button className="avatar avatar-small" aria-label="Profil Alex">A</button></div>
  </header>;

  const taskRows = (items, compact = false) => items.map(task => <div className={`task-row ${task.done ? 'is-done' : ''}`} key={task.id}>
    <button type="button" className="check-task" aria-label={task.done ? 'Marchează ca nefinalizată' : 'Marchează ca finalizată'} onClick={() => toggleTask(task)}><Check size={13} /></button>
    <span className="task-title">{task.title}</span><span className="course-label">{task.course}</span>
    {!compact && <IconButton label="Șterge sarcina" className="delete-inline" onClick={() => deleteTask(task)}><X size={14} /></IconButton>}
  </div>);

  const goalRows = goals.map((goal, index) => <article className="goal-row" key={goal.id}>
    <div className={`goal-glyph tone-${index % 3}`}><Target size={16} /></div>
    <div className="goal-main"><div className="goal-titleline"><strong>{goal.title}</strong><span>{goal.progress}%</span></div><div className="goal-track"><i style={{ width: `${goal.progress}%` }} /></div><div className="goal-detail">{goal.detail}</div>
      <div className="goal-controls"><span>Progres</span><input aria-label={`Progres pentru ${goal.title}`} type="range" min="0" max="100" step="5" value={goal.progress} onChange={event => setGoalProgress(goal, event.target.value)} /><IconButton label="Șterge obiectivul" className="delete-inline" onClick={() => deleteGoal(goal)}><X size={13} /></IconButton></div>
    </div>
  </article>);

  const schedulePanel = <section className="panel schedule-panel">
    <div className="panel-head"><div><h2>Programul de azi</h2><p>O zi bună începe cu un plan simplu.</p></div><button className="quiet-link" onClick={() => setPage('schedule')}>Vezi programul <ArrowUpRight size={14} /></button></div>
    <div className="timeline">{timetable.map((item, index) => <div className={`timeline-row ${index === 1 ? 'next-class' : ''}`} key={item.time}>
      <time>{item.time}</time><span className={`timeline-pin ${item.type}`}><i /></span><div className="timeline-info"><div><strong>{item.title}</strong><small>{item.detail}</small></div><span className={`event-type ${item.type}`}>{item.type === 'class' ? 'Curs' : item.type === 'task' ? 'Sarcină' : 'Focus'}</span></div>
    </div>)}</div>
  </section>;

  const taskPanel = <section className="panel task-panel">
    <div className="panel-head"><div><h2>Sarcini</h2><p>{openTasks.length ? `${openTasks.length} pași mici pentru azi` : 'Ai încheiat tot ce ți-ai propus.'}</p></div><IconButton label="Adaugă sarcină" className="add-icon" onClick={() => setModal('task')}><Plus size={17} /></IconButton></div>
    <div className="task-list">{taskRows(tasks.slice(0, 4), true)}{!tasks.length && <p className="empty-state">Nicio sarcină încă. Adaugă primul lucru de făcut.</p>}</div>
    <button className="quiet-link view-all" onClick={() => setPage('tasks')}>Toate sarcinile <ArrowRight size={14} /></button>
  </section>;

  const focusPanel = <section className="panel focus-panel">
    <div className="panel-head"><div><h2>Timp de concentrare</h2><p>Ritmul tău din ultimele zile</p></div><button className="range-button" onClick={() => setRange(range === 'Săptămâna aceasta' ? 'Săptămâna trecută' : 'Săptămâna aceasta')}>{range} <ChevronDown size={13} /></button></div>
    <div className="focus-metric"><strong>{overview.focus_hours}<small> h</small></strong><span><ArrowUpRight size={13} /> 12% față de săptămâna trecută</span></div>
    <div className="chart-wrap"><div className="chart-axis"><span>6h</span><span>4h</span><span>2h</span><span>0</span></div><div className="chart-area"><div className="chart-lines"><i /><i /><i /><i /></div><div className="bar-set">{focusWeek.map((hours, index) => <div className="bar-col" key={`${days[index]}-${index}`}><div className={`bar ${index === 2 ? 'today-bar' : ''}`} style={{ height: `${hours / 6 * 100}%` }} /><span>{days[index]}</span></div>)}</div></div></div>
  </section>;

  const goalsPanel = <section className="panel goals-panel">
    <div className="panel-head"><div><h2>Obiective active</h2><p>Ține aproape direcția în care mergi.</p></div><button className="quiet-link" onClick={() => setPage('goals')}>Toate <ArrowUpRight size={14} /></button></div>
    <div className="goals-list">{goalRows.slice(0, 2)}{!goals.length && <p className="empty-state">Alege un obiectiv și începe cu un pas mic.</p>}</div>
    <button className="add-goal-link" onClick={() => setModal('goal')}><Plus size={14} /> Adaugă un obiectiv</button>
  </section>;

  function renderPage() {
    if (page === 'today') return <>
      <section className="welcome"><div><p className="date-kicker">{todayLabel}</p><h1>Bună dimineața, Alex<span>✳</span></h1><p>Un pas concentrat azi înseamnă mai multă liniște mâine.</p></div><button className="primary-button" onClick={() => setPage('schedule')}><Sparkles size={16} /> Planifică-mi ziua</button></section>
      <section className="stats-grid" aria-label="Rezumatul zilei">
        <article className="stat-card"><div className="stat-top"><span>Timp de concentrare</span><i className="stat-icon sage"><Focus size={16} /></i></div><strong>4h 20m</strong><p><span className="positive"><ArrowUpRight size={13} /> 12%</span> față de săptămâna trecută</p></article>
        <article className="stat-card"><div className="stat-top"><span>Sarcini deschise</span><i className="stat-icon cream"><ListTodo size={16} /></i></div><strong>{openTasks.length}<small> sarcini</small></strong><p>{overview.completed_count} finalizate azi</p></article>
        <article className="stat-card"><div className="stat-top"><span>Ritmul săptămânii</span><i className="stat-icon lilac"><TrendingUp size={16} /></i></div><strong>{overview.consistency}<small>%</small></strong><p>Ești tot mai constant</p></article>
        <article className="stat-card next-up"><div className="stat-top"><span>Urmează</span><i className="next-dot" /></div><strong>10:30<small> AM</small></strong><p>Biologie · Amfiteatrul B</p></article>
      </section>
      <div className="dashboard-grid">{schedulePanel}{taskPanel}{focusPanel}{goalsPanel}</div>
      <footer className="footer"><span>Fă loc lucrurilor care contează.</span><span>Studyflow <b>·</b> Un pas pe rând</span></footer>
    </>;
    if (page === 'schedule') return <section className="page-view"><div className="view-heading"><div><p className="date-kicker">{todayLabel}</p><h1>{titles[page]}</h1><p>Programul zilei, într-un singur loc.</p></div><button className="primary-button" onClick={() => setPage('today')}>Înapoi la astăzi <ArrowRight size={15} /></button></div>{schedulePanel}<div className="note-banner"><BookOpen size={17} /><span>Programul este demonstrativ pentru prima versiune. Îl vom face editabil în pasul următor.</span></div></section>;
    if (page === 'tasks') return <section className="page-view"><div className="view-heading"><div><p className="date-kicker">ORGANIZEAZĂ-TE ÎN RITMUL TĂU</p><h1>{titles[page]}</h1><p>Începe cu ce contează cel mai mult.</p></div><button className="primary-button" onClick={() => setModal('task')}><Plus size={16} /> Adaugă sarcină</button></div><section className="panel all-tasks"><div className="panel-head"><div><h2>{openTasks.length} sarcini de făcut</h2><p>Modificările se salvează local în baza de date.</p></div><label className="search-field"><Search size={15} /><input id="task-search" placeholder="Caută o sarcină..." value={query} onChange={event => setQuery(event.target.value)} /></label></div><div className="task-list task-list-full">{taskRows(visibleTasks)}{!visibleTasks.length && <p className="empty-state">N-am găsit sarcini care să se potrivească.</p>}</div></section></section>;
    if (page === 'goals') return <section className="page-view"><div className="view-heading"><div><p className="date-kicker">MICILE REUȘITE SE ADUNĂ</p><h1>{titles[page]}</h1><p>Urmărește progresul și ajustează-l când ai nevoie.</p></div><button className="primary-button" onClick={() => setModal('goal')}><Plus size={16} /> Obiectiv nou</button></div><section className="panel all-goals"><div className="panel-head"><div><h2>În lucru</h2><p>Poți actualiza progresul direct din bara fiecărui obiectiv.</p></div><Goal size={22} className="heading-icon" /></div><div className="goals-list goals-list-full">{goalRows}{!goals.length && <p className="empty-state">Primul obiectiv poate începe chiar azi.</p>}</div></section></section>;
    return <section className="page-view"><div className="view-heading"><div><p className="date-kicker">O PRIVIRE DE ANSAMBLU</p><h1>{titles[page]}</h1><p>Date demonstrative despre obiceiurile tale de studiu.</p></div></div><div className="insights-grid">{focusPanel}<section className="panel insight-note"><i className="insight-mark"><Sparkles size={18} /></i><h2>Ritmul tău prinde contur</h2><p>Ai petrecut <strong>4 ore și 20 de minute</strong> în sesiuni concentrate. Alege următorul bloc de studiu în funcție de energia pe care o ai acum.</p><button className="quiet-link" onClick={() => setPage('schedule')}>Vezi programul <ArrowRight size={14} /></button></section></div></section>;
  }

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <a className="brand" href="#today" onClick={event => { event.preventDefault(); setPage('today'); }}><span className="brand-mark"><TrendingUp size={17} /></span><span>studyflow</span></a>
      <p className="side-caption">SPAȚIUL MEU</p>
      <nav className="main-nav" aria-label="Navigare principală">{navItems.map(item => { const Icon = item.icon; return <button key={item.id} className={`nav-item ${page === item.id ? 'selected' : ''}`} onClick={() => { setPage(item.id); setMenuOpen(false); }}><Icon size={17} strokeWidth={1.8} /><span>{item.label}</span>{item.id === 'today' && <small>{openTasks.length}</small>}</button>; })}</nav>
      <div className="sidebar-spacer" />
      <section className="weekly-box"><div className="weekly-head"><span>OBIECTIV SĂPTĂMÂNAL</span><MoreHorizontal size={16} /></div><div className="weekly-number"><strong>14.5</strong><span> / 20 ore</span></div><div className="mini-progress"><i style={{ width: '72.5%' }} /></div><div className="week-days">{days.map((day, index) => <span className={index < 5 ? 'past-day' : ''} key={day}>{day}</span>)}</div></section>
      <button className="profile-row"><span className="avatar">A</span><span><strong>Alex Morgan</strong><small>Cont de student</small></span><MoreHorizontal size={17} /></button>
    </aside>
    {menuOpen && <button className="mobile-scrim" aria-label="Închide navigarea" onClick={() => setMenuOpen(false)} />}
    <main className="main-content">{header}<div className="page-content">
      {loading ? <div className="loading-view"><span className="loading-mark"><Sparkles size={17} /></span>Se pregătește ziua ta…</div> : renderPage()}
      {notice && <div className="toast" role="status"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Închide mesajul"><X size={14} /></button></div>}
    </div></main>
    <button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Deschide navigarea"><Menu size={19} /></button>
    {modal && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setModal(null); }}><form className="modal-card" onSubmit={modal === 'task' ? createTask : createGoal}>
      <div className="modal-heading"><div><span>{modal === 'task' ? 'PAS CU PAS' : 'PRIVEȘTE MAI DEPARTE'}</span><h2>{modal === 'task' ? 'Adaugă o sarcină' : 'Un obiectiv nou'}</h2></div><IconButton label="Închide" onClick={() => setModal(null)}><X size={17} /></IconButton></div>
      <label className="field-label" htmlFor="new-title">{modal === 'task' ? 'Ce ai de făcut?' : 'Pentru ce vrei să lucrezi?'}</label><input className="text-input" id="new-title" name="title" placeholder={modal === 'task' ? 'ex. Recitește notițele de la curs' : 'ex. Termină recapitularea la biologie'} maxLength={120} required autoFocus />
      {modal === 'task' && <><label className="field-label" htmlFor="new-course">Materie</label><select className="text-input" id="new-course" name="course"><option>Biologie</option><option>Statistică</option><option>Psihologie</option><option>Personal</option></select></>}
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModal(null)}>Renunță</button><button className="primary-button" type="submit">{modal === 'task' ? 'Adaugă sarcina' : 'Creează obiectiv'} <ArrowRight size={14} /></button></div>
    </form></div>}
  </div>;
}

export default App;
