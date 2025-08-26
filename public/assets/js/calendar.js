// assets/js/calendar.js

/* ============================================================
   Calendario de estudio (vista SPA)
   - Sin globals: exporta attachCalendarHandlers() para main.js
   - Limpieza (destroy) para evitar fugas entre navegaciones
   - Fixes:
     * mini-cal: selección sin mutar this.selectedDate en cada iteración
     * delegación de clicks y tolerancia si falta algún nodo
     * data-date en YYYY-MM-DD para evitar desfases de zona horaria
   ============================================================ */

class StudyCalendar {
  constructor() {
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.currentView = "month";
    this.events = [];

    this.categories = {
      math:         { name: "Matemáticas",  color: "#667eea", count: 0 },
      physics:      { name: "Física",       color: "#4299e1", count: 0 },
      chemistry:    { name: "Química",      color: "#48bb78", count: 0 },
      programming:  { name: "Programación", color: "#ed8936", count: 0 },
      languages:    { name: "Idiomas",      color: "#9f7aea", count: 0 },
      history:      { name: "Historia",     color: "#ed64a6", count: 0 },
      literature:   { name: "Literatura",   color: "#f56565", count: 0 },
      general:      { name: "General",      color: "#718096", count: 0 },
    };

    // Referencias a handlers para poder removerlos en destroy()
    this._onEsc = (e) => { if (e.key === "Escape") this.closeEventModal(); };
    this._onMonthDayClick = (e) => {
      // Editar evento si se hace click en uno
      const ev = e.target.closest("[data-event-id]");
      if (ev) {
        const id = parseInt(ev.getAttribute("data-event-id"), 10);
        this.editEvent(id);
        e.stopPropagation();
        return;
      }
      // O abrir modal para crear en el día clicado
      const dayEl = e.target.closest(".calendar-day");
      if (dayEl?.dataset?.date) {
        const d = this.parseYMD(dayEl.dataset.date);
        this.openEventModal(d);
      }
    };
  }

  /* ============ Utils de fecha ============ */
  toYMD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  parseYMD(ymd) {
    const [y, m, d] = ymd.split("-").map((x) => parseInt(x, 10));
    return new Date(y, m - 1, d);
  }
  isToday(date) {
    const a = new Date(date); a.setHours(0,0,0,0);
    const b = new Date();     b.setHours(0,0,0,0);
    return a.getTime() === b.getTime();
  }

  /* ============ Ciclo de vida ============ */
  init() {
    this.loadEvents();
    this.setupEventListeners();
    this.updateDisplay();
    this.renderCategories();
    this.renderUpcomingEvents();
  }

  destroy() {
    // Listeners globales
    document.removeEventListener("keydown", this._onEsc);

    // Listeners delegados
    const main = document.getElementById("calendarMain");
    if (main) main.removeEventListener("click", this._onMonthDayClick);

    // Cierra modal si quedó abierto
    const modal = document.getElementById("eventModal");
    if (modal) modal.classList.remove("show");
  }

  /* ============ Datos ============ */
  loadEvents() {
    // Datos demo (reemplazar por fetch/BD en prod)
    this.events = [
      {
        id: 1,
        title: "Examen de Cálculo",
        description: "Capítulos 1-5",
        category: "math",
        type: "exam",
        date: new Date(2024, 11, 15),
        time: "10:00",
        duration: 120,
        priority: "high",
      },
      {
        id: 2,
        title: "Proyecto de Programación",
        description: "Entrega final",
        category: "programming",
        type: "project",
        date: new Date(2024, 11, 20),
        time: "23:59",
        duration: "all-day",
        priority: "high",
      },
      {
        id: 3,
        title: "Tarea de Física",
        description: "Ejercicios del libro",
        category: "physics",
        type: "homework",
        date: new Date(2024, 11, 12),
        time: "14:00",
        duration: 60,
        priority: "medium",
      },
      {
        id: 4,
        title: "Sesión de estudio - Química",
        description: "Repasar tabla periódica",
        category: "chemistry",
        type: "study",
        date: new Date(2024, 11, 10),
        time: "16:00",
        duration: 90,
        priority: "low",
      },
    ];
    this.updateCategoryCounts();
  }

  updateCategoryCounts() {
    Object.keys(this.categories).forEach((k) => this.categories[k].count = 0);
    this.events.forEach((ev) => {
      if (this.categories[ev.category]) this.categories[ev.category].count++;
    });
  }

  /* ============ Listeners ============ */
  setupEventListeners() {
    // Navegación principal
    document.getElementById("prevBtn")?.addEventListener("click", () => this.navigate(-1));
    document.getElementById("nextBtn")?.addEventListener("click", () => this.navigate(1));
    document.getElementById("todayBtn")?.addEventListener("click", () => this.goToToday());

    // Mini calendario
    document.getElementById("miniPrevBtn")?.addEventListener("click", () => this.navigateMini(-1));
    document.getElementById("miniNextBtn")?.addEventListener("click", () => this.navigateMini(1));

    // Cambiar vista
    document.querySelectorAll(".view-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const v = e.currentTarget?.dataset?.view;
        if (v) this.changeView(v);
      });
    });

    // Modal
    document.getElementById("addEventBtn")?.addEventListener("click", () => this.openEventModal());
    document.getElementById("eventModalClose")?.addEventListener("click", () => this.closeEventModal());
    document.getElementById("eventModalCancel")?.addEventListener("click", () => this.closeEventModal());
    document.getElementById("eventModalSave")?.addEventListener("click", () => this.saveEvent());

    // Quick actions
    document.getElementById("quickAddExam")?.addEventListener("click", () => this.quickAdd("exam"));
    document.getElementById("quickAddHomework")?.addEventListener("click", () => this.quickAdd("homework"));
    document.getElementById("quickAddProject")?.addEventListener("click", () => this.quickAdd("project"));
    document.getElementById("quickAddStudySession")?.addEventListener("click", () => this.quickAdd("study"));

    // Selector Mes/Año (placeholder)
    document.getElementById("monthYearSelector")?.addEventListener("click", () => this.showMonthYearPicker());

    // Delegación en la grilla principal (clic en día o en evento)
    const main = document.getElementById("calendarMain");
    if (main) main.addEventListener("click", this._onMonthDayClick);

    // Global: cerrar modal con ESC
    document.addEventListener("keydown", this._onEsc);
  }

  /* ============ Navegación / Vistas ============ */
  navigate(direction) {
    switch (this.currentView) {
      case "month":
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        break;
      case "week":
        this.currentDate.setDate(this.currentDate.getDate() + (7 * direction));
        break;
      case "day":
        this.currentDate.setDate(this.currentDate.getDate() + direction);
        break;
    }
    this.updateDisplay();
  }

  navigateMini(direction) {
    const miniDate = new Date(this.currentDate);
    miniDate.setMonth(miniDate.getMonth() + direction);
    this.renderMiniCalendar(miniDate);
  }

  goToToday() {
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.updateDisplay();
  }

  changeView(view) {
    this.currentView = view;
    document.querySelectorAll(".view-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.view === view);
      b.setAttribute("aria-selected", b.dataset.view === view ? "true" : "false");
    });
    this.updateDisplay();
  }

  updateDisplay() {
    this.updateHeader();
    this.renderMiniCalendar();
    this.renderMainCalendar();
    this.renderUpcomingEvents();
  }

  updateHeader() {
    const opts = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    const display = document.getElementById("currentDateDisplay");
    if (display) display.textContent = this.currentDate.toLocaleDateString("es-ES", opts);

    const my = this.currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    const myText = my.charAt(0).toUpperCase() + my.slice(1);
    const monthYearText = document.getElementById("monthYearText");
    if (monthYearText) monthYearText.textContent = myText;
  }

  /* ============ Mini calendario ============ */
  renderMiniCalendar(date = this.currentDate) {
    const grid  = document.getElementById("miniCalendarGrid");
    const title = document.getElementById("miniCalendarTitle");
    if (!grid || !title) return;

    const year  = date.getFullYear();
    const month = date.getMonth();

    title.textContent = date.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

    grid.innerHTML = "";

    // Encabezados L M M J V S D
    ["L","M","M","J","V","S","D"].forEach((d) => {
      const h = document.createElement("div");
      h.className = "mini-day-header";
      h.textContent = d;
      grid.appendChild(h);
    });

    const firstDay    = new Date(year, month, 1);
    const lastDay     = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);

    let startDay = firstDay.getDay() || 7; // 1..7 (lun..dom)
    startDay = startDay === 0 ? 6 : startDay - 1;

    const today = new Date(); today.setHours(0,0,0,0);
    const selectedTS = (() => {
      const s = new Date(this.selectedDate);
      s.setHours(0,0,0,0);
      return s.getTime();
    })();

    // Días del mes anterior
    for (let i = startDay - 1; i >= 0; i--) {
      const d = document.createElement("div");
      d.className = "mini-day other-month";
      d.textContent = prevLastDay.getDate() - i;
      grid.appendChild(d);
    }

    // Días mes actual
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = document.createElement("div");
      d.className = "mini-day";
      d.textContent = i;

      const current = new Date(year, month, i); current.setHours(0,0,0,0);
      if (current.getTime() === today.getTime()) d.classList.add("today");
      if (current.getTime() === selectedTS) d.classList.add("selected");

      d.addEventListener("click", () => {
        this.currentDate  = new Date(year, month, i);
        this.selectedDate = new Date(year, month, i);
        this.updateDisplay();
      });

      grid.appendChild(d);
    }

    // Relleno para 6 filas (42 celdas)
    const remaining = 42 - (startDay + lastDay.getDate());
    for (let i = 1; i <= remaining; i++) {
      const d = document.createElement("div");
      d.className = "mini-day other-month";
      d.textContent = i;
      grid.appendChild(d);
    }
  }

  /* ============ Calendario principal ============ */
  renderMainCalendar() {
    const main = document.getElementById("calendarMain");
    if (!main) return;

    switch (this.currentView) {
      case "month":  this.renderMonthView(main);  break;
      case "week":   this.renderWeekView(main);   break;
      case "day":    this.renderDayView(main);    break;
      case "agenda": this.renderAgendaView(main); break;
    }
  }

  renderMonthView(container) {
    const y = this.currentDate.getFullYear();
    const m = this.currentDate.getMonth();

    const firstDay    = new Date(y, m, 1);
    const lastDay     = new Date(y, m + 1, 0);
    const prevLastDay = new Date(y, m, 0);

    let startDay = firstDay.getDay() || 7; // 1..7
    startDay = startDay === 0 ? 6 : startDay - 1;

    let html = '<div class="month-view">';

    // Encabezados
    ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"].forEach((d, i) => {
      html += `<div class="day-header ${i>=5 ? "weekend" : ""}">${d}</div>`;
    });

    // Días prev mes
    for (let i = startDay - 1; i >= 0; i--) {
      const dayNum = prevLastDay.getDate() - i;
      const date   = new Date(y, m - 1, dayNum);
      html += this.renderCalendarDay(date, dayNum, true);
    }

    // Días mes actual
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(y, m, i);
      html += this.renderCalendarDay(date, i, false);
    }

    // Relleno (5 o 6 filas)
    const totalCells = startDay + lastDay.getDate();
    const remaining  = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(y, m + 1, i);
      html += this.renderCalendarDay(date, i, true);
    }

    html += "</div>";
    container.innerHTML = html;
    // (Los clicks de día/evento se manejan por delegación en this._onMonthDayClick)
  }

  renderCalendarDay(date, dayNum, isOtherMonth) {
    const today = new Date(); today.setHours(0,0,0,0);
    const d0 = new Date(date); d0.setHours(0,0,0,0);

    const isToday = d0.getTime() === today.getTime();
    const sel = new Date(this.selectedDate); sel.setHours(0,0,0,0);
    const isSelected = d0.getTime() === sel.getTime();

    const dayEvents = this.getEventsForDate(d0);
    const max = 3;

    let classes = "calendar-day";
    if (isOtherMonth) classes += " other-month";
    if (isToday)      classes += " today";
    if (isSelected)   classes += " selected";

    let html = `<div class="${classes}" data-date="${this.toYMD(d0)}">`;
    html += `<div class="day-number">${dayNum}</div>`;

    if (dayEvents.length > 0) {
      html += '<div class="day-events">';
      dayEvents.slice(0, max).forEach((ev) => {
        html += `
          <div class="event-item ${ev.category}" data-event-id="${ev.id}" title="${ev.title}">
            ${ev.time ? ev.time + " · " : ""}${ev.title}
          </div>`;
      });
      if (dayEvents.length > max) {
        html += `<div class="more-events">+${dayEvents.length - max} más</div>`;
      }
      html += "</div>";
    }

    html += "</div>";
    return html;
  }

  renderWeekView(container) {
    const start = new Date(this.currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // lunes
    start.setDate(diff);

    let html = '<div class="week-view">';
    html += '<div class="time-slot-header"></div>';

    for (let i = 0; i < 7; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const isToday = this.isToday(d);
      const name = d.toLocaleDateString("es-ES", { weekday: "short" });
      const num  = d.getDate();
      html += `
        <div class="week-day-header ${isToday ? "today" : ""}">
          <div class="week-day-name">${name}</div>
          <div class="week-day-number">${num}</div>
        </div>`;
    }

    for (let h = 6; h < 23; h++) {
      html += `<div class="time-slot">${h}:00</div>`;
      for (let i = 0; i < 7; i++) {
        const d = new Date(start); d.setDate(start.getDate() + i); d.setHours(h,0,0,0);
        const evs = this.getEventsForDateTime(d);
        html += `<div class="week-day-cell" data-datetime="${d.toISOString()}">`;
        evs.forEach((ev) => {
          const top = this.calculateEventPosition(ev);
          const height = this.calculateEventHeight(ev);
          const color = this.categories[ev.category]?.color || "var(--primary)";
          html += `<div class="week-event ${ev.category}" style="top:${top}px;height:${height}px;background:${color};">${ev.title}</div>`;
        });
        html += `</div>`;
      }
    }

    html += "</div>";
    container.innerHTML = html;
  }

  renderDayView(container) {
    const date = new Date(this.currentDate);
    const dayEvents = this.getEventsForDate(date);

    let html = '<div class="day-view">';

    html += `
      <div class="day-view-header">
        <div class="day-view-date">
          ${date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
        <div class="day-view-info">
          <span><i class="fa-solid fa-list-check"></i> ${dayEvents.length} eventos</span>
          <span><i class="fa-solid fa-clock"></i> ${this.calculateTotalHours(dayEvents)} h programadas</span>
        </div>
      </div>`;

    for (let h = 6; h < 23; h++) {
      const hourEvents = dayEvents.filter((e) => parseInt(e.time?.split(":")[0] || 0, 10) === h);
      html += `<div class="hour-slot">${String(h).padStart(2,"0")}:00</div><div class="hour-content" data-hour="${h}">`;
      hourEvents.forEach((ev) => {
        const color = this.categories[ev.category]?.color || "var(--primary)";
        html += `<div class="event-item ${ev.category}" style="background:${color};"><strong>${ev.time || ""} ${ev.title}</strong>${ev.description ? `<br><small>${ev.description}</small>` : ""}</div>`;
      });
      html += `</div>`;
    }

    html += "</div>";
    container.innerHTML = html;
  }

  renderAgendaView(container) {
    const start = new Date(this.currentDate);
    const end   = new Date(start); end.setDate(end.getDate() + 30);

    const list = this.getEventsInRange(start, end);
    const grouped = this.groupEventsByDate(list);

    let html = '<div class="agenda-view" style="padding:20px">';
    html += '<h2 style="margin-bottom:20px">Agenda - Próximos 30 días</h2>';

    const keys = Object.keys(grouped);
    if (!keys.length) {
      html += '<p style="text-align:center;color:var(--text-muted);padding:40px">No hay eventos programados</p>';
    } else {
      keys.forEach((k) => {
        const d = new Date(k);
        const evs = grouped[k];
        html += `<div style="margin-bottom:24px">
          <h3 style="color:var(--primary);margin-bottom:12px">
            ${d.toLocaleDateString("es-ES", { weekday:"long", day:"numeric", month:"long" })}
          </h3>`;
        evs.forEach((ev) => {
          const color = this.categories[ev.category]?.color || "var(--primary)";
          html += `
            <div style="background:var(--bg-secondary);padding:14px;border-radius:8px;margin-bottom:10px;border-left:4px solid ${color}">
              <div style="display:flex;justify-content:space-between;align-items:start;gap:10px">
                <div>
                  <strong style="font-size:16px">${ev.title}</strong>
                  <div style="margin-top:6px;color:var(--text-muted);font-size:14px">
                    <i class="fa-solid fa-clock"></i> ${ev.time || "Todo el día"}
                    <span style="margin:0 8px">•</span>
                    <i class="fa-solid fa-bookmark"></i> ${this.categories[ev.category]?.name || ev.category}
                    ${ev.description ? `<br><i class="fa-solid fa-circle-info"></i> ${ev.description}` : ""}
                  </div>
                </div>
                <div style="display:flex;gap:8px">
                  <button class="action-btn" data-edit="${ev.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
                  <button class="action-btn delete" data-del="${ev.id}" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                </div>
              </div>
            </div>`;
        });
        html += `</div>`;
      });
    }

    html += "</div>";
    container.innerHTML = html;

    // Delegar clicks de editar/eliminar en agenda
    container.querySelectorAll("[data-edit]").forEach((b) =>
      b.addEventListener("click", () => this.editEvent(parseInt(b.dataset.edit, 10)))
    );
    container.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", () => this.deleteEvent(parseInt(b.dataset.del, 10)))
    );
  }

  /* ============ Side panels ============ */
  renderCategories() {
    const container = document.getElementById("categoriesList");
    if (!container) return;
    let html = "";
    Object.keys(this.categories).forEach((key) => {
      const c = this.categories[key];
      html += `
        <div class="category-item" data-category="${key}">
          <div class="category-info">
            <div class="category-color" style="background:${c.color}"></div>
            <span class="category-name">${c.name}</span>
          </div>
          <span class="category-count">${c.count}</span>
        </div>`;
    });
    container.innerHTML = html;
  }

  renderUpcomingEvents() {
    const container = document.getElementById("upcomingEvents");
    if (!container) return;

    const up = this.getUpcomingEvents(5);
    if (!up.length) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px">No hay eventos próximos</p>';
      return;
    }

    let html = "";
    up.forEach((ev) => {
      const priClass = `${ev.priority}-priority`;
      const dateStr = ev.date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
      html += `
        <div class="upcoming-event ${priClass}" data-event-id="${ev.id}">
          <div class="upcoming-event-time">${ev.time || "Todo el día"}</div>
          <div class="upcoming-event-content">
            <div class="upcoming-event-title">${ev.title}</div>
            <div class="upcoming-event-category">
              ${this.categories[ev.category]?.name || ev.category} • ${dateStr}
            </div>
          </div>
        </div>`;
    });
    container.innerHTML = html;

    // Click para editar desde "próximos"
    container.querySelectorAll("[data-event-id]").forEach((el) => {
      el.addEventListener("click", () => this.editEvent(parseInt(el.dataset.eventId, 10)));
    });
  }

  /* ============ Consultas eventos ============ */
  getEventsForDate(date) {
    return this.events.filter((ev) => {
      const d = new Date(ev.date);
      return d.toDateString() === date.toDateString();
    });
  }
  getEventsForDateTime(dateTime) {
    return this.events.filter((ev) => {
      const d = new Date(ev.date);
      const h = parseInt(ev.time?.split(":")[0] || 0, 10);
      return d.toDateString() === dateTime.toDateString() && h === dateTime.getHours();
    });
  }
  getEventsInRange(start, end) {
    return this.events
      .filter((ev) => {
        const d = new Date(ev.date);
        return d >= start && d <= end;
      })
      .sort((a, b) => a.date - b.date);
  }
  getUpcomingEvents(limit = 5) {
    const now = new Date();
    return this.events.filter((ev) => ev.date >= now).sort((a,b) => a.date - b.date).slice(0, limit);
  }
  groupEventsByDate(events) {
    const g = {};
    events.forEach((ev) => {
      const k = new Date(ev.date); k.setHours(0,0,0,0);
      const key = k.toDateString();
      if (!g[key]) g[key] = [];
      g[key].push(ev);
    });
    return g;
  }

  /* ============ Layout cálculos ============ */
  calculateEventPosition(ev) {
    const m = parseInt(ev.time?.split(":")[1] || 0, 10);
    return (m / 60) * 60; // px relativos a la celda
    // (ajusta con CSS si cada hora mide diferente en px)
  }
  calculateEventHeight(ev) {
    const mins = ev.duration === "all-day" ? 480 : parseInt(ev.duration || 60, 10);
    return (mins / 60) * 60;
  }
  calculateTotalHours(events) {
    const total = events.reduce((sum, ev) => {
      const mins = ev.duration === "all-day" ? 480 : parseInt(ev.duration || 0, 10);
      return sum + mins;
    }, 0);
    return (total / 60).toFixed(1);
  }

  /* ============ Modal / CRUD ============ */
  openEventModal(date = null) {
    const modal = document.getElementById("eventModal");
    const form  = document.getElementById("eventForm");
    if (!modal || !form) return;

    form.reset();
    document.getElementById("eventModalTitle").textContent = "Nuevo Evento";
    document.getElementById("eventId").value = "";

    if (date) {
      document.getElementById("eventDate").value = this.toYMD(date);
    }

    modal.classList.add("show");
  }

  closeEventModal() {
    document.getElementById("eventModal")?.classList.remove("show");
  }

  quickAdd(type) {
    this.openEventModal();
    const t = document.getElementById("eventType");
    const title = document.getElementById("eventTitle");
    const prio  = document.getElementById("eventPriority");
    const dur   = document.getElementById("eventDuration");
    if (!t || !title || !prio || !dur) return;

    t.value = type;
    switch (type) {
      case "exam":
        title.value = "Examen de ";
        prio.value  = "high";
        dur.value   = "120";
        break;
      case "homework":
        title.value = "Tarea de ";
        prio.value  = "medium";
        dur.value   = "60";
        break;
      case "project":
        title.value = "Proyecto de ";
        prio.value  = "high";
        dur.value   = "all-day";
        break;
      case "study":
        title.value = "Sesión de estudio - ";
        prio.value  = "low";
        dur.value   = "90";
        break;
    }
  }

  saveEvent() {
    const idField = document.getElementById("eventId");
    const title   = document.getElementById("eventTitle")?.value?.trim();
    if (!title) { alert("Por favor ingresa un título para el evento"); return; }

    const event = {
      id: idField?.value ? parseInt(idField.value, 10) : Date.now(),
      title,
      description: document.getElementById("eventDescription")?.value || "",
      category:    document.getElementById("eventCategory")?.value || "general",
      type:        document.getElementById("eventType")?.value || "other",
      date:        new Date(document.getElementById("eventDate")?.value || this.toYMD(new Date())),
      time:        document.getElementById("eventTime")?.value || "",
      duration:    document.getElementById("eventDuration")?.value || 60,
      priority:    document.getElementById("eventPriority")?.value || "medium",
      reminder:    document.getElementById("eventReminder")?.value || "none",
    };

    const i = this.events.findIndex((e) => e.id === event.id);
    if (i !== -1) this.events[i] = event; else this.events.push(event);

    this.updateCategoryCounts();
    this.closeEventModal();
    this.updateDisplay();
    // TODO: Puedes integrar tu sistema de notificaciones aquí
    console.log("Evento guardado:", event);
  }

  editEvent(id) {
    const ev = this.events.find((e) => e.id === id);
    if (!ev) return;

    document.getElementById("eventModalTitle").textContent = "Editar Evento";
    document.getElementById("eventId").value        = ev.id;
    document.getElementById("eventTitle").value     = ev.title;
    document.getElementById("eventDescription").value = ev.description || "";
    document.getElementById("eventCategory").value  = ev.category;
    document.getElementById("eventType").value      = ev.type;
    document.getElementById("eventDate").value      = this.toYMD(new Date(ev.date));
    document.getElementById("eventTime").value      = ev.time || "";
    document.getElementById("eventDuration").value  = ev.duration;
    document.getElementById("eventPriority").value  = ev.priority;
    document.getElementById("eventReminder").value  = ev.reminder || "none";

    document.getElementById("eventModal")?.classList.add("show");
  }

  deleteEvent(id) {
    if (!confirm("¿Estás seguro de eliminar este evento?")) return;
    this.events = this.events.filter((e) => e.id !== id);
    this.updateCategoryCounts();
    this.updateDisplay();
  }

  showMonthYearPicker() {
    // Pendiente: selector de mes/año (dialog simple)
    console.log("Mostrar selector de mes/año");
  }
}

/* ============================================================
   Hook para el router (SPA)
   - main.js deberá importar { attachCalendarHandlers } y
     llamarlo cuando path === "/calendario"
   ============================================================ */
export function attachCalendarHandlers() {
  const cal = new StudyCalendar();
  cal.init();
  return () => cal.destroy();
}
