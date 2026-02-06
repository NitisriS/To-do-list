document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dailyList = document.getElementById('daily-tasks');
    const monthlyList = document.getElementById('monthly-tasks');
    const modal = document.getElementById('task-modal');
    const form = document.getElementById('task-form');
    const currentDateEl = document.getElementById('current-date');

    // State
    let tasks = JSON.parse(localStorage.getItem('chronosTasks')) || [];

    // Initialization
    function init() {
        updateDate();
        renderTasks();
        requestNotificationPermission();
        setInterval(checkReminders, 60000); // Check every minute
    }

    function updateDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        currentDateEl.innerText = new Date().toLocaleDateString(undefined, options);
    }

    // Task Management
    window.openModal = (type) => {
        document.getElementById('task-type').value = type;
        document.getElementById('modal-title').innerText = type === 'daily' ? 'Add Daily Task' : 'Add Monthly Goal';
        modal.style.display = 'flex';
        // Set default time to now + 1 hour for convenience
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset() + 60);
        document.getElementById('task-deadline').value = now.toISOString().slice(0, 16);
    };

    window.closeModal = () => {
        modal.style.display = 'none';
        form.reset();
    };

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const newTask = {
            id: Date.now(),
            text: document.getElementById('task-desc').value,
            priority: document.getElementById('task-priority').value,
            deadline: document.getElementById('task-deadline').value,
            type: document.getElementById('task-type').value,
            completed: false,
            notified: false
        };

        tasks.push(newTask);
        saveTasks();
        renderTasks();
        closeModal();
    });

    function renderTasks() {
        dailyList.innerHTML = '';
        monthlyList.innerHTML = '';

        // Sort: High priority first, then by deadline
        const sortedTasks = [...tasks].sort((a, b) => {
            const priorityMap = { 'high': 3, 'medium': 2, 'low': 1 };
            if (priorityMap[b.priority] !== priorityMap[a.priority]) {
                return priorityMap[b.priority] - priorityMap[a.priority];
            }
            return new Date(a.deadline) - new Date(b.deadline);
        });

        sortedTasks.forEach(task => {
            if (task.completed) return; // Don't show completed tasks in main list for now

            const card = document.createElement('div');
            card.className = `task-card priority-${task.priority}`;
            card.innerHTML = `
                <div class="task-content">
                    <h3>${task.text}</h3>
                    <div class="task-meta">
                        <span>Due: ${formatDate(task.deadline)}</span>
                        <span>${task.priority.toUpperCase()}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="complete-btn" onclick="completeTask(${task.id})" title="Complete">&#10003;</button>
                    <button class="delete-btn" onclick="deleteTask(${task.id})" title="Delete">&#10007;</button>
                </div>
            `;

            if (task.type === 'daily') dailyList.appendChild(card);
            else monthlyList.appendChild(card);
        });
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    window.completeTask = (id) => {
        const taskIndex = tasks.findIndex(t => t.id === id);
        if (taskIndex > -1) {
            tasks[taskIndex].completed = true;
            // Visual feedback before reload
            renderTasks(); // Or specific animation logic here
            saveTasks();
        }
    };

    window.deleteTask = (id) => {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderTasks();
    };

    function saveTasks() {
        localStorage.setItem('chronosTasks', JSON.stringify(tasks));
    }

    // Reminder System
    function requestNotificationPermission() {
        if (!("Notification" in window)) {
            console.log("This browser does not support desktop notification");
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission();
        }
    }

    function checkReminders() {
        const now = new Date().getTime();

        tasks.forEach(task => {
            if (!task.completed && !task.notified) {
                const deadlineTime = new Date(task.deadline).getTime();
                // Notify if within 15 minutes of deadline or passed
                const timeDiff = deadlineTime - now;

                if (timeDiff <= 900000 && timeDiff > -3600000) { // 15 mins before to 1 hour late
                    sendNotification(task);
                    playAlarm();
                    task.notified = true;
                    saveTasks();
                }
            }
        });
    }

    function playAlarm() {
        const audio = document.getElementById('alarm-sound');
        if (audio) {
            audio.play().catch(error => {
                console.log("Audio play failed (user interaction required):", error);
            });
        }
    }

    function sendNotification(task) {
        if (Notification.permission === "granted") {
            new Notification(`Chronos Reminder: ${task.text}`, {
                body: `Your ${task.priority} priority task is due at ${formatDate(task.deadline)}!`,
                icon: 'https://cdn-icons-png.flaticon.com/512/2693/2693507.png' // Generic calendar icon
            });
        }
    }

    init();
});
