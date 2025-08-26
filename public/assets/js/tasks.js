// assets/js/tasks.js

/* ============================
   DB "ligera" en JSON (fetch)
   ============================ */
class TaskDatabase {
  constructor() {
    // Intentamos varias rutas posibles; usa la primera que responda 200
    this.candidateUrls = [
      "./assets/data/tasks.json",
      "./db.json",
      "/db.json",
      "/assets/data/tasks.json",
    ];
    this.apiUrl = null;
    this.tasks = [];
  }

  async _tryFetch(url) {
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (res.ok) {
        const data = await res.json();
        return { ok: true, data };
      }
    } catch (_) { /* noop */ }
    return { ok: false, data: null };
  }

  async loadTasks() {
    // Busca primera ruta válida
    if (!this.apiUrl) {
      for (const url of this.candidateUrls) {
        const r = await this._tryFetch(url);
        if (r.ok) {
          this.apiUrl = url;
          this.tasks = Array.isArray(r.data) ? r.data : [];
          return this.tasks;
        }
      }
    } else {
      const r = await this._tryFetch(this.apiUrl);
      if (r.ok) {
        this.tasks = Array.isArray(r.data) ? r.data : [];
        return this.tasks;
      }
    }

    // Fallback de ejemplo si no hay JSON accesible
    this.tasks = [
      {
        id: 1,
        title: "Estudiar Cálculo Diferencial",
        description: "Repasar derivadas e integrales",
        category: "Matemáticas",
        dueDate: new Date().toISOString().split("T")[0],
        dueTime: "14:00",
        priority: "high",
        completed: false,
        createdAt: new Date().toISOString(),
        tags: ["examen", "importante"],
      },
      {
        id: 2,
        title: "Proyecto de Programación",
        description: "Terminar el frontend de la aplicación",
        category: "Programación",
        dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        dueTime: "23:59",
        priority: "medium",
        completed: false,
        createdAt: new Date().toISOString(),
        tags: ["proyecto", "javascript"],
      },
    ];
    return this.tasks;
  }

  async saveTask(task) {
    const newTask = {
      ...task,
      id: task.id || Date.now(),
      createdAt: task.createdAt || new Date().toISOString(),
      completed: !!task.completed,
    };
    const i = this.tasks.findIndex((t) => t.id === newTask.id);
    if (i !== -1) this.tasks[i] = newTask;
    else this.tasks.push(newTask);

    // Simular persistencia
    console.log("Guardando en servidor:", newTask);
    return newTask;
  }

  async deleteTask(id) {
    this.tasks = this.tasks.filter((t) => t.id !== id);
    console.log("Eliminando del servidor:", id);
    return true;
  }

  async updateTask(id, updates) {
    const i = this.tasks.findIndex((t) => t.id === id);
    if (i === -1) return null;
    this.tasks[i] = { ...this.tasks[i], ...updates };
    console.log("Actualizando en servidor:", this.tasks[i]);
    return this.tasks[i];
  }

  getStats() {
    const total = this.tasks.length;
    const completed = this.tasks.filter((t) => t.completed).length;
    return { total, completed };
  }
}

/* =================================
   Lógica principal de la vista Tasks
   ================================= */
class StudyTaskManager {
  constructor() {
    this.db = new TaskDatabase();
    this.tasks = [];
    this.currentFilter = "all";
    this.currentTags = [];
    this.pomodoroInterval = null;
    this.pomodoroTime = 25 * 60;

    // Handlers que necesitamos remover en destroy()
    this._onKeydown = (e) => { if (e.key === "Escape") this.closeModal(); };
    this._onTagContainerClick = (e) => {
      const btn = e.target.closest("[data-remove-tag]");
      if (btn) this.removeTag(btn.getAttribute("data-remove-tag"));
    };
  }

  /* ---------- ciclo de vida ---------- */
  async init() {
    await this.loadTasks();
    this.setupEventListeners();
    this.updateUI();
    this.initPomodoro();
  }

  destroy() {
    // Limpia intervalos del Pomodoro y listeners globales
    this.pausePomodoro();
    document.removeEventListener("keydown", this._onKeydown);

    const tagsContainer = document.getElementById("tagsContainer");
    if (tagsContainer) {
      tagsContainer.removeEventListener("click", this._onTagContainerClick);
    }

    // Quita notificaciones pendientes
    document.querySelectorAll(".notification").forEach((n) => n.remove());

    // Cierra modal si quedó abierto
    const modal = document.getElementById("taskModal");
    if (modal) modal.classList.remove("show");
  }

  /* ---------- carga ---------- */
  async loadTasks() {
    this.tasks = await this.db.loadTasks();
  }

  /* ---------- eventos UI ---------- */
  setupEventListeners() {
    const addBtn = document.getElementById("addTaskBtn");
    addBtn?.addEventListener("click", () => this.showTaskModal());

    document.getElementById("modalClose")?.addEventListener("click", () => this.closeModal());
    document.getElementById("modalCancel")?.addEventListener("click", () => this.closeModal());
    document.getElementById("modalSave")?.addEventListener("click", () => this.saveTask());

    document.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        this.currentFilter = chip.dataset.filter || "all";
        this.renderTasks();
      });
    });

    const tagInput = document.getElementById("tagInput");
    tagInput?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const val = tagInput.value.trim();
        if (val) this.addTag(val);
        tagInput.value = "";
      }
    });

    document.addEventListener("keydown", this._onKeydown);

    // Delegación para quitar etiquetas
    const tagsContainer = document.getElementById("tagsContainer");
    tagsContainer?.addEventListener("click", this._onTagContainerClick);
  }

  /* ---------- UI ---------- */
  updateUI() {
    this.updateStats();
    this.renderTasks();
  }

  updateStats() {
    const { total, completed } = this.db.getStats();
    const totalEl = document.getElementById("totalTasks");
    const compEl  = document.getElementById("completedTasks");
    const streakEl = document.getElementById("studyStreak");

    if (totalEl) totalEl.textContent = total;
    if (compEl)  compEl.textContent  = completed;
    if (streakEl) streakEl.textContent = (Math.floor(Math.random() * 10) + 1).toString(); // simulado
  }

  renderTasks() {
    const container = document.getElementById("tasksContainer");
    if (!container) return;

    const list = this.getFilteredTasks();
    container.innerHTML = "";

    if (list.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
          <span style="font-size:64px; opacity:.3">📘</span>
          <p style="margin-top: 20px; color: var(--text-muted); font-size: 18px;">
            No hay tareas que mostrar
          </p>
          <p style="margin-top: 10px; color: var(--text-muted);">
            ¡Comienza agregando tu primera tarea de estudio!
          </p>
        </div>`;
      return;
    }

    list.forEach((t) => container.appendChild(this.createTaskCard(t)));
  }

  createTaskCard(task) {
    const card = document.createElement("div");
    card.className = `task-card priority-${task.priority} ${task.completed ? "completed" : ""}`;

    const dueDateTime = task.dueDate ? new Date(`${task.dueDate}T${task.dueTime || "00:00"}`) : null;
    const isOverdue = dueDateTime && dueDateTime < new Date() && !task.completed;

    card.innerHTML = `
      <div class="task-header">
        <div class="task-checkbox ${task.completed ? "checked" : ""}" data-id="${task.id}"></div>
        <div class="task-content">
          <div class="task-title">${task.title}</div>
          <div class="task-category">${task.category}</div>
          ${task.description ? `<p style="margin-top:8px;color:var(--text-muted);font-size:14px;">${task.description}</p>` : ""}
          ${task.tags && task.tags.length
            ? `<div class="task-tags">${task.tags.map((tag) => `<span class="task-tag">#${tag}</span>`).join("")}</div>`
            : ""}
        </div>
      </div>
      <div class="task-footer">
        <div class="task-due" ${isOverdue ? 'style="color: var(--danger);"' : ""}>
          <i class="fas fa-${isOverdue ? "exclamation-circle" : "calendar"}"></i>
          ${task.dueDate ? new Date(task.dueDate).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "Sin fecha"}
          ${task.dueTime ? ` - ${task.dueTime}` : ""}
        </div>
        <div class="task-actions">
          <button class="action-btn edit" data-id="${task.id}" title="Editar"><i class="fas fa-edit"></i></button>
          <button class="action-btn delete" data-id="${task.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
        </div>
      </div>`;

    card.querySelector(".task-checkbox")?.addEventListener("click", () => this.toggleTask(task.id));
    card.querySelector(".edit")?.addEventListener("click", () => this.editTask(task.id));
    card.querySelector(".delete")?.addEventListener("click", () => this.deleteTask(task.id));

    return card;
  }

  getFilteredTasks() {
    const today = new Date(); today.setHours(0,0,0,0);
    const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);

    switch (this.currentFilter) {
      case "today":
        return this.tasks.filter((t) => {
          if (!t.dueDate) return false;
          const d = new Date(t.dueDate); d.setHours(0,0,0,0);
          return d.getTime() === today.getTime();
        });
      case "week":
        return this.tasks.filter((t) => t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) <= weekEnd);
      case "pending":
        return this.tasks.filter((t) => !t.completed);
      case "completed":
        return this.tasks.filter((t) => t.completed);
      case "high":
        return this.tasks.filter((t) => t.priority === "high" && !t.completed);
      case "overdue":
        return this.tasks.filter((t) => {
          if (!t.dueDate || t.completed) return false;
          const due = new Date(`${t.dueDate}T${t.dueTime || "23:59"}`);
          return due < new Date();
        });
      default:
        return this.tasks;
    }
  }

  /* ---------- Modal & Etiquetas ---------- */
  showTaskModal(taskId = null) {
    const modal = document.getElementById("taskModal");
    const form = document.getElementById("taskForm");
    if (!modal || !form) return;

    form.reset();
    this.currentTags = [];
    this.renderTagsInput();

    if (taskId) {
      const t = this.tasks.find((x) => x.id === taskId);
      if (t) {
        document.getElementById("modalTitle").textContent = "Editar tarea";
        document.getElementById("taskId").value = t.id;
        document.getElementById("taskTitle").value = t.title;
        document.getElementById("taskDescription").value = t.description || "";
        document.getElementById("taskCategory").value = t.category;
        document.getElementById("taskPriority").value = t.priority;
        document.getElementById("taskDueDate").value = t.dueDate || "";
        document.getElementById("taskDueTime").value = t.dueTime || "";
        (t.tags || []).forEach((tag) => this.addTag(tag));
      }
    } else {
      document.getElementById("modalTitle").textContent = "Nueva tarea de estudio";
      document.getElementById("taskId").value = "";
    }

    modal.classList.add("show");
  }

  closeModal() {
    const modal = document.getElementById("taskModal");
    modal?.classList.remove("show");
  }

  addTag(tag) {
    if (!tag || this.currentTags.includes(tag)) return;
    this.currentTags.push(tag);
    this.renderTagsInput();
  }

  removeTag(tag) {
    this.currentTags = this.currentTags.filter((t) => t !== tag);
    this.renderTagsInput();
  }

  renderTagsInput() {
    const container = document.getElementById("tagsContainer");
    if (!container) return;
    container.innerHTML = "";
    this.currentTags.forEach((tag) => {
      const el = document.createElement("div");
      el.className = "tag-input-item";
      el.innerHTML = `
        ${tag}
        <button type="button" data-remove-tag="${tag}" title="Quitar etiqueta">×</button>`;
      container.appendChild(el);
    });
  }

  /* ---------- CRUD ---------- */
  async saveTask() {
    const id = document.getElementById("taskId").value;
    const title = document.getElementById("taskTitle").value.trim();
    if (!title) return this.showNotification("El título es obligatorio", "error");

    const taskData = {
      id: id ? parseInt(id, 10) : Date.now(),
      title,
      description: document.getElementById("taskDescription").value,
      category: document.getElementById("taskCategory").value,
      priority: document.getElementById("taskPriority").value,
      dueDate: document.getElementById("taskDueDate").value,
      dueTime: document.getElementById("taskDueTime").value,
      tags: this.currentTags,
    };

    await this.db.saveTask(taskData);
    await this.loadTasks();
    this.updateUI();
    this.closeModal();
    this.showNotification(id ? "Tarea actualizada" : "Tarea creada", "success");
  }

  editTask(id) { this.showTaskModal(id); }

  async deleteTask(id) {
    if (confirm("¿Estás seguro de eliminar esta tarea?")) {
      await this.db.deleteTask(id);
      await this.loadTasks();
      this.updateUI();
      this.showNotification("Tarea eliminada", "success");
    }
  }

  async toggleTask(id) {
    const t = this.tasks.find((x) => x.id === id);
    if (!t) return;
    await this.db.updateTask(id, { completed: !t.completed });
    await this.loadTasks();
    this.updateUI();
    this.showNotification(t.completed ? "Tarea marcada como pendiente" : "¡Tarea completada! 🎉", "success");
  }

  /* ---------- Notificaciones ---------- */
  showNotification(message, type = "info") {
    const n = document.createElement("div");
    n.className = `notification ${type}`;
    n.innerHTML = `
      <div class="notification-icon">
        <i class="fas fa-${type === "success" ? "check-circle" : "exclamation-circle"}"></i>
      </div>
      <div class="notification-content">${message}</div>`;

    document.body.appendChild(n);
    requestAnimationFrame(() => n.classList.add("show"));
    setTimeout(() => {
      n.classList.remove("show");
      setTimeout(() => n.remove(), 300);
    }, 3000);
  }

  /* ---------- Pomodoro ---------- */
  initPomodoro() {
    const startBtn = document.getElementById("startTimer");
    const pauseBtn = document.getElementById("pauseTimer");
    const resetBtn = document.getElementById("resetTimer");
    const preset = document.getElementById("pomodoroPreset");

    startBtn?.addEventListener("click", () => this.startPomodoro());
    pauseBtn?.addEventListener("click", () => this.pausePomodoro());
    resetBtn?.addEventListener("click", () => this.resetPomodoro());
    preset?.addEventListener("change", (e) => {
      this.pomodoroTime = parseInt(e.target.value, 10) * 60;
      this.updatePomodoroDisplay();
    });

    // Estado inicial
    this.updatePomodoroDisplay();
  }

  startPomodoro() {
    if (this.pomodoroInterval) return;
    this.pomodoroInterval = setInterval(() => {
      if (this.pomodoroTime > 0) {
        this.pomodoroTime--;
        this.updatePomodoroDisplay();
      } else {
        this.pausePomodoro();
        this.showNotification("¡Tiempo completado! Toma un descanso 🎉", "success");
      }
    }, 1000);
  }

  pausePomodoro() {
    if (this.pomodoroInterval) {
      clearInterval(this.pomodoroInterval);
      this.pomodoroInterval = null;
    }
  }

  resetPomodoro() {
    this.pausePomodoro();
    const preset = document.getElementById("pomodoroPreset");
    this.pomodoroTime = parseInt(preset?.value || "25", 10) * 60;
    this.updatePomodoroDisplay();
  }

  updatePomodoroDisplay() {
    const m = Math.floor(this.pomodoroTime / 60);
    const s = this.pomodoroTime % 60;
    const el = document.getElementById("pomodoroTimer");
    if (el) el.textContent = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
}

/* ======================================
   Hook para el router (SPA): attach/clean
   ====================================== */
export function attachTasksHandlers() {
  const manager = new StudyTaskManager();
  manager.init().catch(console.error);

  // Devuelve cleanup para main.js
  return () => manager.destroy();
}
