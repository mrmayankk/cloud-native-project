import { useEffect, useMemo, useState } from "react";
import { taskApi } from "./api.js";

const filters = [
  { label: "All tasks", value: "ALL" },
  { label: "To do", value: "TODO" },
  { label: "In progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "DONE" },
];

const emptyForm = {
  title: "",
  description: "",
  status: "TODO",
  priority: "NORMAL",
  dueDate: "",
};

function formatStatus(status) {
  return status.replace("_", " ").toLowerCase();
}

function formatDate(value) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    new Date(`${value}T00:00:00`),
  );
}

function TaskDialog({ task, onClose, onSave, saving }) {
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    ...(task || {}),
    dueDate: task?.dueDate || "",
  }));
  const [error, setError] = useState("");

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await onSave({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        dueDate: form.dueDate || null,
      });
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="task-dialog" onSubmit={submit}>
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">{task ? "MAKE AN UPDATE" : "PLAN SOMETHING GREAT"}</span>
            <h2>{task ? "Edit task" : "Create a task"}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog">×</button>
        </div>
        <label>
          Task name
          <input
            autoFocus
            maxLength="120"
            name="title"
            onChange={updateField}
            placeholder="What needs to get done?"
            required
            value={form.title}
          />
        </label>
        <label>
          Description <span className="optional">Optional</span>
          <textarea
            maxLength="2000"
            name="description"
            onChange={updateField}
            placeholder="Add a few helpful details..."
            rows="3"
            value={form.description}
          />
        </label>
        <div className="form-grid">
          <label>
            Status
            <select name="status" onChange={updateField} value={form.status}>
              {filters.slice(1).map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
            </select>
          </label>
          <label>
            Priority
            <select name="priority" onChange={updateField} value={form.priority}>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
            </select>
          </label>
        </div>
        <label>
          Due date <span className="optional">Optional</span>
          <input name="dueDate" onChange={updateField} type="date" value={form.dueDate} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button className="button button-quiet" onClick={onClose} type="button">Cancel</button>
          <button className="button button-primary" disabled={saving} type="submit">
            {saving ? "Saving..." : task ? "Save changes" : "Create task"}
          </button>
        </div>
      </form>
    </div>
  );
}

function TaskCard({ task, onEdit, onDelete, onStatusChange }) {
  return (
    <article className={`task-card ${task.status === "DONE" ? "is-done" : ""}`}>
      <button
        aria-label={task.status === "DONE" ? `Mark ${task.title} as to do` : `Complete ${task.title}`}
        className={`complete-toggle ${task.status === "DONE" ? "checked" : ""}`}
        onClick={() => onStatusChange(task, task.status === "DONE" ? "TODO" : "DONE")}
        type="button"
      >
        {task.status === "DONE" ? "✓" : ""}
      </button>
      <div className="task-content">
        <div className="task-title-row">
          <h3>{task.title}</h3>
          <span className={`priority priority-${task.priority.toLowerCase()}`}>
            <span />{task.priority.toLowerCase()}
          </span>
        </div>
        {task.description && <p className="task-description">{task.description}</p>}
        <div className="task-meta">
          <span className={`status-pill status-${task.status.toLowerCase().replace("_", "-")}`}>
            {formatStatus(task.status)}
          </span>
          <span className="due-date"><span aria-hidden="true">◷</span>{formatDate(task.dueDate)}</span>
        </div>
      </div>
      <div className="task-actions">
        <button className="icon-button" onClick={() => onEdit(task)} type="button" aria-label={`Edit ${task.title}`}>✎</button>
        <button className="icon-button delete-button" onClick={() => onDelete(task)} type="button" aria-label={`Delete ${task.title}`}>⌫</button>
      </div>
    </article>
  );
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [dialogTask, setDialogTask] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refreshTasks() {
    setError("");
    try {
      setTasks(await taskApi.list());
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshTasks();
  }, []);

  const counts = useMemo(() => ({
    total: tasks.length,
    active: tasks.filter((task) => task.status === "IN_PROGRESS").length,
    done: tasks.filter((task) => task.status === "DONE").length,
  }), [tasks]);

  const visibleTasks = filter === "ALL" ? tasks : tasks.filter((task) => task.status === filter);

  async function saveTask(values) {
    setSaving(true);
    try {
      const saved = dialogTask
        ? await taskApi.update(dialogTask.id, values)
        : await taskApi.create(values);
      setTasks((current) => {
        const next = dialogTask
          ? current.map((task) => task.id === saved.id ? saved : task)
          : [saved, ...current];
        return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      });
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(task, status) {
    setError("");
    try {
      const updated = await taskApi.update(task.id, { ...task, status });
      setTasks((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (updateError) {
      setError(updateError.message);
    }
  }

  async function deleteTask(task) {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    setError("");
    try {
      await taskApi.remove(task.id);
      setTasks((current) => current.filter((item) => item.id !== task.id));
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  function openCreate() {
    setDialogTask(null);
    setDialogOpen(true);
  }

  function openEdit(task) {
    setDialogTask(task);
    setDialogOpen(true);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a aria-label="Taskflow home" className="brand" href="/">
          <span className="brand-mark">t</span><span>taskflow<span className="brand-dot">.</span></span>
        </a>
        <div className="topbar-right">
          <span className="api-indicator"><span /> API connected</span>
          <span className="avatar" aria-label="Your workspace">M</span>
        </div>
      </header>

      <section className="dashboard">
        <div className="welcome-row">
          <div>
            <span className="eyebrow">YOUR WORKSPACE</span>
            <h1>Make room for <em>great work.</em></h1>
            <p className="welcome-copy">A little progress each day adds up to big results.</p>
          </div>
          <button className="button button-primary add-button" onClick={openCreate} type="button">
            <span>＋</span> New task
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card"><span className="stat-icon violet">✦</span><div><span className="stat-label">Total tasks</span><strong>{counts.total}</strong></div></div>
          <div className="stat-card"><span className="stat-icon amber">◷</span><div><span className="stat-label">In progress</span><strong>{counts.active}</strong></div></div>
          <div className="stat-card"><span className="stat-icon green">✓</span><div><span className="stat-label">Completed</span><strong>{counts.done}</strong></div></div>
        </div>

        <section className="task-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE BIG PICTURE</span>
              <h2>Your tasks <span className="task-count">{visibleTasks.length}</span></h2>
            </div>
            <div aria-label="Filter tasks" className="filter-list" role="tablist">
              {filters.map((item) => (
                <button
                  aria-selected={filter === item.value}
                  className={filter === item.value ? "filter-button active" : "filter-button"}
                  key={item.value}
                  onClick={() => setFilter(item.value)}
                  role="tab"
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="error-banner" role="alert">{error}<button onClick={refreshTasks} type="button">Retry</button></div>}
          {loading ? (
            <div className="empty-state"><div className="loader" /><p>Getting your workspace ready...</p></div>
          ) : visibleTasks.length > 0 ? (
            <div className="task-list">
              {visibleTasks.map((task) => (
                <TaskCard key={task.id} task={task} onEdit={openEdit} onDelete={deleteTask} onStatusChange={changeStatus} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">{filter === "DONE" ? "✓" : "✦"}</span>
              <h3>{filter === "ALL" ? "A fresh start." : `No ${formatStatus(filter)} tasks.`}</h3>
              <p>{filter === "ALL" ? "Create your first task and turn an idea into action." : "Try another filter or add a new task to your list."}</p>
              {filter === "ALL" && <button className="button button-primary" onClick={openCreate} type="button">Create your first task</button>}
            </div>
          )}
        </section>
        <footer className="footer"><span>Built for thoughtful progress.</span><span>Spring Boot <b>·</b> React <b>·</b> PostgreSQL</span></footer>
      </section>

      {dialogOpen && (
        <TaskDialog
          task={dialogTask}
          onClose={() => setDialogOpen(false)}
          onSave={saveTask}
          saving={saving}
        />
      )}
    </main>
  );
}
