// Mini Calendar Widget Controller
class DashboardCalendarWidget {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.events = [];
        this.init();
    }

    init() {
        this.loadEvents();
        this.setupEventListeners();
        this.render();
    }

    loadEvents() {
        // Eventos de ejemplo - conectar con tu DB.json
        this.events = [
            {
                id: 1,
                title: 'Examen de Cálculo',
                category: 'Matemáticas',
                date: new Date(2024, 11, 15),
                time: '10:00',
                priority: 'high'
            },
            {
                id: 2,
                title: 'Entrega Proyecto Web',
                category: 'Programación',
                date: new Date(2024, 11, 20),
                time: '23:59',
                priority: 'high'
            },
            {
                id: 3,
                title: 'Tarea de Física',
                category: 'Física',
                date: new Date(2024, 11, 12),
                time: '14:00',
                priority: 'medium'
            },
            {
                id: 4,
                title: 'Quiz de Química',
                category: 'Química',
                date: new Date(2024, 11, 10),
                time: '09:00',
                priority: 'low'
            },
            {
                id: 5,
                title: 'Presentación Historia',
                category: 'Historia',
                date: new Date(2024, 11, 18),
                time: '11:00',
                priority: 'medium'
            }
        ];

        // En producción, cargar desde tu API
        // this.loadFromAPI();
    }

    async loadFromAPI() {
        try {
            const response = await fetch('/api/events');
            const data = await response.json();
            this.events = data.map(event => ({
                ...event,
                date: new Date(event.date)
            }));
            this.render();
        } catch (error) {
            console.error('Error cargando eventos:', error);
        }
    }

    setupEventListeners() {
        document.getElementById('widgetPrevMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.render();
        });

        document.getElementById('widgetNextMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.render();
        });
    }

    render() {
        this.renderCalendar();
        this.renderEvents();
        this.updateStats();
    }

    renderCalendar() {
        const grid = document.getElementById('widgetCalendarGrid');
        const monthText = document.getElementById('widgetMonthText');
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Actualizar texto del mes
        monthText.textContent = this.currentDate.toLocaleDateString('es-ES', { 
            month: 'long', 
            year: 'numeric' 
        });
        
        grid.innerHTML = '';
        
        // Headers de días
        const dayHeaders = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
        dayHeaders.forEach(day => {
            const header = document.createElement('div');
            header.className = 'widget-day-header';
            header.textContent = day;
            grid.appendChild(header);
        });
        
        // Calcular días
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const prevLastDay = new Date(year, month, 0);
        
        let startDay = firstDay.getDay() || 7;
        startDay = startDay === 0 ? 6 : startDay - 1;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Días del mes anterior
        for (let i = startDay - 1; i >= 0; i--) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'widget-day other-month';
            dayDiv.textContent = prevLastDay.getDate() - i;
            grid.appendChild(dayDiv);
        }
        
        // Días del mes actual
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'widget-day';
            dayDiv.textContent = day;
            
            const currentDate = new Date(year, month, day);
            currentDate.setHours(0, 0, 0, 0);
            
            // Marcar el día de hoy
            if (currentDate.getTime() === today.getTime()) {
                dayDiv.classList.add('today');
            }
            
            // Marcar día seleccionado
            if (currentDate.getTime() === this.selectedDate.setHours(0, 0, 0, 0)) {
                dayDiv.classList.add('selected');
            }
            
            // Verificar si hay eventos
            const dayEvents = this.getEventsForDate(currentDate);
            if (dayEvents.length > 0) {
                dayDiv.classList.add('has-events');
                
                // Verificar prioridad alta
                if (dayEvents.some(e => e.priority === 'high')) {
                    dayDiv.classList.add('high-priority');
                }
            }
            
            // Click handler
            dayDiv.addEventListener('click', () => {
                // Remover selección anterior
                grid.querySelectorAll('.widget-day').forEach(d => {
                    d.classList.remove('selected');
                });
                
                dayDiv.classList.add('selected');
                this.selectedDate = currentDate;
                this.renderEvents(currentDate);
            });
            
            grid.appendChild(dayDiv);
        }
        
        // Días del mes siguiente
        const remainingCells = 42 - (startDay + lastDay.getDate());
        for (let day = 1; day <= remainingCells; day++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'widget-day other-month';
            dayDiv.textContent = day;
            grid.appendChild(dayDiv);
        }
    }

    renderEvents(date = new Date()) {
        const eventList = document.getElementById('widgetEventList');
        const dateText = document.getElementById('widgetSelectedDateText');
        const countSpan = document.getElementById('widgetEventsCount');
        
        // Actualizar texto de fecha
        const isToday = this.isToday(date);
        if (isToday) {
            dateText.textContent = 'Hoy';
        } else {
            dateText.textContent = date.toLocaleDateString('es-ES', { 
                day: 'numeric', 
                month: 'long' 
            });
        }
        
        // Obtener eventos del día
        const dayEvents = this.getEventsForDate(date);
        countSpan.textContent = `${dayEvents.length} evento${dayEvents.length !== 1 ? 's' : ''}`;
        
        eventList.innerHTML = '';
        
        if (dayEvents.length === 0) {
            eventList.innerHTML = `
                <div class="widget-no-events">
                    <i class="fas fa-calendar-check" style="font-size: 24px; margin-bottom: 8px; opacity: 0.5;"></i>
                    <br>No hay eventos programados
                </div>
            `;
            return;
        }
        
        // Ordenar eventos por hora
        dayEvents.sort((a, b) => {
            const timeA = a.time ? a.time.split(':').join('') : '9999';
            const timeB = b.time ? b.time.split(':').join('') : '9999';
            return timeA - timeB;
        });
        
        // Renderizar eventos
        dayEvents.forEach(event => {
            const eventDiv = document.createElement('div');
            eventDiv.className = `widget-event ${event.priority}-priority`;
            eventDiv.innerHTML = `
                <div class="widget-event-time">${event.time || 'Todo el día'}</div>
                <div class="widget-event-content">
                    <div class="widget-event-title">${event.title}</div>
                    <div class="widget-event-category">${event.category}</div>
                </div>
            `;
            
            eventDiv.addEventListener('click', () => {
                // Navegar al calendario completo con el evento seleccionado
                window.location.href = `/calendar?event=${event.id}&date=${date.toISOString()}`;
            });
            
            eventList.appendChild(eventDiv);
        });
    }

    updateStats() {
        // Eventos del mes
        const monthEvents = this.getEventsForMonth(this.currentDate);
        document.getElementById('widgetMonthEvents').textContent = monthEvents.length;
        
        // Eventos de la semana
        const weekEvents = this.getEventsForWeek(new Date());
        document.getElementById('widgetWeekEvents').textContent = weekEvents.length;
        
        // Tareas pendientes (ejemplo)
        const pendingTasks = this.events.filter(e => {
            return e.date >= new Date() && e.priority === 'high';
        }).length;
        document.getElementById('widgetPendingTasks').textContent = pendingTasks;
    }

    getEventsForDate(date) {
        return this.events.filter(event => {
            return event.date.toDateString() === date.toDateString();
        });
    }

    getEventsForMonth(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        
        return this.events.filter(event => {
            return event.date.getFullYear() === year && 
                    event.date.getMonth() === month;
        });
    }

    getEventsForWeek(date) {
        const startOfWeek = new Date(date);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        
        return this.events.filter(event => {
            return event.date >= startOfWeek && event.date <= endOfWeek;
        });
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }
}

// Función para navegar al calendario completo
function navigateToCalendar(event) {
    event.preventDefault();
    // Aquí puedes usar tu sistema de routing
    // Por ejemplo con React Router, Vue Router, o navegación simple
    window.location.href = '/calendar';
    
    // O si usas SPA:
    // router.push('/calendar');
}

// Inicializar widget cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new DashboardCalendarWidget();
    });
} else {
    new DashboardCalendarWidget();
}

// FUTUROS WIDGETS 
