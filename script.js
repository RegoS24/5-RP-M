document.addEventListener("DOMContentLoaded", () => {
    const isAdminPage = document.body.classList.contains("is-admin");
    const AVATARS = ["👤", "🐱", "🦊", "🤖", "🔥", "💎", "⭐", "👑", "🍕", "🎮"];
    let currentUser = localStorage.getItem("bp_user");
    let editMode = false;
    let sortable = null;

    // --- СИСТЕМА ДАННЫХ (LOCALSTORAGE) ---
    const getDB = () => JSON.parse(localStorage.getItem("bp_users_db") || "{}");
    const saveDB = (db) => localStorage.setItem("bp_users_db", JSON.stringify(db));
    
    // Дефолтные задания, если база пустая
    const getTasks = () => {
        let tasks = JSON.parse(localStorage.getItem("bp_global_tasks"));
        if (!tasks || tasks.length === 0) {
            tasks = [
                {name: "Ежедневный вход", target: 1, base: 50, vip: 100},
                {name: "Собрать 100 ресурсов", target: 100, base: 200, vip: 400},
                {name: "Победить босса", target: 1, base: 500, vip: 1000}
            ];
            localStorage.setItem("bp_global_tasks", JSON.stringify(tasks));
        }
        return tasks;
    };
    const saveTasks = (tasks) => localStorage.setItem("bp_global_tasks", JSON.stringify(tasks));

    // --- УПРАВЛЕНИЕ ТЕМОЙ ---
    const themeBtn = document.getElementById("themeToggleBtn");
    const applyTheme = (theme) => {
        document.body.setAttribute("data-theme", theme);
        localStorage.setItem("bp_theme", theme);
        const statusEl = document.querySelector(".theme-status");
        if(statusEl) statusEl.textContent = theme.toUpperCase();
    };
    if (themeBtn) {
        themeBtn.onclick = () => {
            const next = document.body.getAttribute("data-theme") === "dark" ? "light" : "dark";
            applyTheme(next);
        };
    }
    applyTheme(localStorage.getItem("bp_theme") || "dark");

    // --- ЛОГИКА АДМИН-ПАНЕЛИ ---
    if (isAdminPage) {
        // --- ЧИСТАЯ ПРОВЕРКА БЕЗ ALERT ---
        const admBtn = document.getElementById("admSubmit");
            
        if (admBtn) {
            admBtn.onclick = () => {
                const pinInput = document.getElementById("admKey");
                const errorOverlay = document.getElementById("errorPinOverlay");
                const errorBox = document.getElementById("errorPinBox");

                // Проверяем значение
                if (pinInput && pinInput.value === "1234") {
                    document.getElementById("adminLoginOverlay").style.display = "none";
                    document.getElementById("adminContent").style.display = "block";
                    if (typeof renderAdmin === "function") renderAdmin();
                } else {
                    // ПОКАЗЫВАЕМ КАСТОМНОЕ ОКНО
                    if (errorOverlay) {
                        errorOverlay.style.display = "flex";
                            
                        // Добавляем эффект тряски, если есть стили
                        if (errorBox) {
                            errorBox.classList.add("shake-anim");
                            setTimeout(() => errorBox.classList.remove("shake-anim"), 500);
                        }
                    } else {
                        // Если забыли добавить HTML модалки — сработает алерт (страховка)
                        alert("Неверный ПИН!");
                    }
                        
                    if (pinInput) pinInput.value = ""; // Чистим поле
                }
            };
        }

        // Обработка кнопки "Попробовать снова"
        const closeErrorBtn = document.getElementById("closeErrorBtn");
        if (closeErrorBtn) {
            closeErrorBtn.onclick = () => {
                // Скрываем только уведомление об ошибке
                document.getElementById("errorPinOverlay").style.display = "none";
                
                // Фокусируемся обратно на поле ввода (удобно для пользователя)
                const pinInput = document.getElementById("admKey");
                if (pinInput) pinInput.focus();
            };
        }

        function renderAdmin() {
            const db = getDB();
            document.getElementById("userList").innerHTML = Object.keys(db).map(k => {
                const user = db[k];
                return `
                    <tr>
                        <td><b>${k}</b></td>
                        <td>${user.nickname || k}</td>
                        <td><b style="color:var(--accent)">${user.totalBP || 0} BP</b></td>
                        <td><code>${user.recoveryCode}</code></td>
                        <td>${user.password}</td>
                        <td><button class="del-btn" onclick="deleteUser('${k}')">УДАЛИТЬ</button></td>
                    </tr>
                `;
            }).join("");

            const gTasks = getTasks();
            document.getElementById("taskAdminList").innerHTML = gTasks.map((t, i) => `
                <div style="background:var(--bg); padding:15px; border-radius:12px; margin-top:10px; display:flex; justify-content:space-between; align-items:center; border:1px solid var(--line);">
                    <div>
                        <strong style="display:block; margin-bottom:5px;">${t.name} (Цель: ${t.target})</strong>
                        <span style="font-size:12px; color:var(--dim);">Base: ${t.base} BP | Vip: ${t.vip} BP</span>
                    </div>
                    <button class="del-btn" onclick="deleteTask(${i})">✖</button>
                </div>
            `).join("");

            renderChat();
        }

        window.deleteUser = (id) => { 
            if(confirm("Удалить пользователя навсегда?")) { let db = getDB(); delete db[id]; saveDB(db); renderAdmin(); } 
        };
        window.deleteTask = (i) => { 
            if(confirm("Удалить это задание для всех?")) { let t = getTasks(); t.splice(i, 1); saveTasks(t); renderAdmin(); }
        };

        document.getElementById("btnOpenAddTask").onclick = () => document.getElementById("addTaskModal").style.display="flex";
        document.getElementById("confirmAddTask").onclick = () => {
            const name = document.getElementById("ntName").value.trim();
            if(!name) return alert("Введите название!");
            let t = getTasks();
            t.push({
                name: name,
                target: parseInt(document.getElementById("ntTarget").value) || 1,
                base: parseInt(document.getElementById("ntBase").value) || 0,
                vip: parseInt(document.getElementById("ntVip").value) || 0
            });
            saveTasks(t);
            document.getElementById("addTaskModal").style.display="none";
            renderAdmin();
        };
    }

    // --- ЛОГИКА ТРЕКЕРА ЗАДАЧ ---
    function updateStats() {
        if(isAdminPage || !document.getElementById("totalDisplay")) return;
        
        let got = 0, left = 0, doneCount = 0;
        const isVip = document.getElementById("vipCheckbox")?.checked || false;
        const isX2 = document.getElementById("x2Checkbox")?.checked || false;

        document.querySelectorAll(".task-item").forEach(el => {
            if (el.classList.contains("is-hidden") && !editMode) return;
            
            const baseBP = isVip ? parseInt(el.dataset.vip) : parseInt(el.dataset.base);
            const finalBP = baseBP * (isX2 ? 2 : 1);
            const isDone = el.querySelector(".task-check").checked;

            el.querySelector(".t-bp").textContent = finalBP + " BP";
            
            if (isDone) { 
                got += finalBP; 
                doneCount++; 
                el.classList.add("is-done"); 
            } else { 
                left += finalBP; 
                el.classList.remove("is-done"); 
            }
        });

        document.getElementById("totalDisplay").textContent = got + " BP";
        document.getElementById("remainingDisplay").textContent = left + " BP";
        
        const totalPossible = got + left;
        const progressPercent = totalPossible > 0 ? (got / totalPossible) * 100 : 0;
        document.getElementById("progressFill").style.width = progressPercent + "%";
        
        saveUserProgress(got, doneCount);
        renderAchievements(got, doneCount);
    }

    function saveUserProgress(bp, count) {
        if(!currentUser) return;
        const tasksProgress = [];
        document.querySelectorAll(".task-item").forEach(el => {
            tasksProgress.push({
                name: el.querySelector(".t-name").textContent,
                qty: parseInt(el.querySelector(".current-q").textContent),
                done: el.querySelector(".task-check").checked,
                hidden: el.classList.contains("is-hidden")
            });
        });
        
        let db = getDB();
        if(db[currentUser]) {
            db[currentUser].tasks = tasksProgress;
            db[currentUser].totalBP = bp;
            db[currentUser].doneCount = count;
            saveDB(db);
        }
    }

    // Рендер списка задач
    const taskContainer = document.getElementById("taskBody");
    if(taskContainer && !isAdminPage) {
        const globals = getTasks();
        const db = getDB();
        const userTasks = currentUser && db[currentUser] ? (db[currentUser].tasks || []) : [];

        taskContainer.innerHTML = globals.map(gt => {
            const ut = userTasks.find(x => x.name === gt.name) || {qty:0, done:false, hidden:false};
            // HTML без инлайновых onchange (чтобы избежать конфликтов)
            return `
                <div class="task-item ${ut.done ? 'is-done' : ''} ${ut.hidden ? 'is-hidden' : ''}" 
                     data-base="${gt.base}" data-vip="${gt.vip}" data-target="${gt.target}">
                    <span class="t-name">${gt.name}</span>
                    <span class="t-bp">0 BP</span>
                    <div class="cnt-box">
                        <button class="btn-c" onclick="changeQty(this, -1)">-</button>
                        <div class="val-c"><span class="current-q">${ut.qty}</span>/${gt.target}</div>
                        <button class="btn-c" onclick="changeQty(this, 1)">+</button>
                    </div>
                    <label class="chk-wrap">
                        <input type="checkbox" class="task-check" ${ut.done ? 'checked' : ''}>
                        <div class="chk-box"></div>
                    </label>
                </div>
            `;
        }).join("");
        
        updateStats();
        sortable = new Sortable(taskContainer, { animation: 250, disabled: true, onEnd: () => updateStats() });
    }

    // ГЛОБАЛЬНЫЙ СЛУШАТЕЛЬ ДЛЯ ЧЕКБОКСОВ (Решает проблему неработающих кнопок)
    document.addEventListener("change", (e) => {
        if (e.target.classList.contains("task-check") || e.target.id === "vipCheckbox" || e.target.id === "x2Checkbox") {
            updateStats();
        }
    });

    window.changeQty = (btn, delta) => {
        if(editMode) return;
        const item = btn.closest(".task-item");
        const qSpan = item.querySelector(".current-q");
        const target = parseInt(item.dataset.target);
        let current = parseInt(qSpan.textContent);
        
        let newVal = Math.max(0, Math.min(target, current + delta));
        qSpan.textContent = newVal;
        item.querySelector(".task-check").checked = (newVal === target);
        updateStats();
    };

    // --- КАСТОМНЫЙ СБРОС ПРОГРЕССА ---
    const resetBtn = document.getElementById("resetProgressBtn");
    const resetOverlay = document.getElementById("resetConfirmOverlay");
    const confirmResetAction = document.getElementById("confirmResetAction");

    // 1. При нажатии на главную кнопку сброса — просто открываем модалку
    resetBtn?.addEventListener("click", () => {
        resetOverlay.style.display = "flex";
    });

    // 2. Логика сброса, которая сработает ТОЛЬКО при нажатии "ДА, ОБНУЛИТЬ" в модалке
    confirmResetAction?.addEventListener("click", () => {
        document.querySelectorAll(".task-item").forEach(el => {
            // Обнуляем цифры
            const qSpan = el.querySelector(".current-q");
            if(qSpan) qSpan.textContent = "0";
            
            // Снимаем галочки
            const chk = el.querySelector(".task-check");
            if(chk) chk.checked = false;
            
            // Убираем визуальный стиль выполненной задачи
            el.classList.remove("is-done");
        });

        // Пересчитываем общие цифры (BP, проценты)
        updateStats();
        
        // Закрываем модалку
        resetOverlay.style.display = "none";
    });

    // Настройка списка (скрытие/сортировка)
    document.getElementById("dragToggleBtn")?.addEventListener("click", function() {
        if(!currentUser) {
            document.getElementById("warningOverlay").style.display = "flex";
            return;
        }
        
        editMode = !editMode;
        document.body.classList.toggle("edit-mode-on", editMode);
        if (sortable) sortable.option("disabled", !editMode);
        
        this.innerHTML = editMode ? "<i class='fi fi-rr-check'></i> СОХРАНИТЬ И ВЫЙТИ" : "<i class='fi fi-rr-edit'></i> НАСТРОЙКА СПИСКА";
        this.className = editMode ? "m-btn prm" : "m-btn secondary";

        document.querySelectorAll(".task-item").forEach(el => {
            if (editMode) {
                el.onclick = (e) => {
                    // Разрешаем клик по карточке, только если клик не попал в счетчик
                    if(!e.target.closest('.cnt-box')) {
                        el.classList.toggle("is-hidden");
                    }
                };
            } else {
                el.onclick = null;
            }
        });
        
        if(!editMode) updateStats();
    });

    // --- АВТОРИЗАЦИЯ ---
    const submitAuth = document.getElementById("submitAuth");
    if(submitAuth) submitAuth.onclick = () => {
        const u = document.getElementById("authUser").value.trim().toLowerCase();
        const p = document.getElementById("authPass").value;
        const n = document.getElementById("authNick").value || u;
        const c = document.getElementById("authCode").value;
        
        if(!u || !p) return alert("Введите логин и пароль!");
        let db = getDB();
        const isReg = document.getElementById("regExtra").style.display === "block";

        if(isReg) {
            if(!c || c.length !== 4) return alert("Код восстановления должен состоять из 4 цифр!");
            if(db[u]) return alert("Этот логин уже занят!");
            db[u] = { password: p, nickname: n, recoveryCode: c, totalBP: 0, doneCount: 0, avatar: "👤", tasks: [] };
            saveDB(db);
        } else {
            if(!db[u] || db[u].password !== p) return alert("Неверный логин или пароль!");
        }

        localStorage.setItem("bp_user", u);
        location.reload();
    };

    document.getElementById("toggleAuth")?.addEventListener("click", function() {
        const extra = document.getElementById("regExtra");
        const isReg = extra.style.display === "block";
        extra.style.display = isReg ? "none" : "block";
        this.textContent = isReg ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти";
        document.getElementById("authTitle").textContent = isReg ? "АВТОРИЗАЦИЯ" : "РЕГИСТРАЦИЯ";
    });

    // Восстановление пароля
    document.getElementById("submitRecover")?.addEventListener("click", () => {
        const u = document.getElementById("recUser").value.trim().toLowerCase();
        const c = document.getElementById("recCode").value;
        const p = document.getElementById("recPass").value;
        let db = getDB();
        
        if(db[u] && db[u].recoveryCode === c) {
            if(!p) return alert("Введите новый пароль!");
            db[u].password = p;
            saveDB(db); 
            alert("Пароль успешно изменен!"); 
            location.reload();
        } else { 
            alert("Неверный логин или секретный код!"); 
        }
    });

    // --- ПРОФИЛЬ И НАСТРОЙКИ ---
    if(currentUser && document.getElementById("profileAuth")) {
        const db = getDB();
        if(db[currentUser]) {
            const user = db[currentUser];
            document.getElementById("profileGuest").style.display = "none";
            document.getElementById("profileAuth").style.display = "block";
            document.getElementById("profName").textContent = user.nickname || currentUser;
            document.getElementById("profAvatar").textContent = user.avatar || "👤";
            document.getElementById("profRecovery").textContent = "Ваш секретный код: " + user.recoveryCode;
        }
    }

    // --- КАСТОМНЫЙ ВЫХОД ИЗ АККАУНТА ---
    const logoutBtn = document.getElementById("logoutBtn"); // Убедитесь, что ID кнопки выхода в HTML именно такой
    const logoutOverlay = document.getElementById("logoutConfirmOverlay");
    const confirmLogoutAction = document.getElementById("confirmLogoutAction");

    // 1. Открываем модалку при клике на "Выйти" в профиле
    logoutBtn?.addEventListener("click", () => {
        logoutOverlay.style.display = "flex";
    });

    // 2. Сама логика выхода при нажатии на подтверждение
    confirmLogoutAction?.addEventListener("click", () => {
        localStorage.removeItem("bp_user");
        // Если у вас есть другие ключи сессии, их тоже можно очистить тут
        location.reload(); // Перезагружаем страницу для возврата к экрану входа
    });

    // Редактирование профиля (Аватар и Никнейм)
    document.getElementById("openEditBtn")?.addEventListener("click", () => {
        const db = getDB();
        const user = db[currentUser];
        const picker = document.getElementById("editAvatars");
        
        picker.innerHTML = AVATARS.map(av => `
            <div class="av-opt ${user.avatar === av ? 'active' : ''}" onclick="selectAvatar(this)">${av}</div>
        `).join("");
        
        document.getElementById("editNick").value = user.nickname || currentUser;
        document.getElementById("editOverlay").style.display = "flex";
    });

    window.selectAvatar = (el) => {
        document.querySelectorAll(".av-opt").forEach(a => a.classList.remove("active"));
        el.classList.add("active");
    };

    document.getElementById("submitEdit")?.addEventListener("click", () => {
        let db = getDB();
        const activeAv = document.querySelector(".av-opt.active");
        
        db[currentUser].avatar = activeAv ? activeAv.textContent : "👤";
        const newNick = document.getElementById("editNick").value.trim();
        if(newNick) db[currentUser].nickname = newNick;
        
        saveDB(db);
        location.reload();
    });

    // --- НАВИГАЦИЯ (ТАБЫ) ---
    document.querySelectorAll(".nav-tab").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".nav-tab, .tab-content").forEach(x => x.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
            
            // Когда открываем социальную вкладку (чат), рендерим его и скроллим
            if(btn.dataset.tab === "social") {
                renderChat();
            }
        };
    });

    // --- ЧАТ ---
    function renderChat() {
        const chatBox = document.getElementById("chatMessages");
        if (!chatBox) return;

        const msgs = JSON.parse(localStorage.getItem("bp_chat_history") || "[]");
        const currentUser = localStorage.getItem("bp_user");

        // Функция для цвета ника
        const stringToColor = (str) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            return `hsl(${hash % 360}, 70%, 75%)`;
        };

        // Отрисовка сообщений
        chatBox.innerHTML = msgs.map((m) => {
            const isOwn = m.uid === currentUser;
            const userColor = stringToColor(m.nick || "Guest");
            return `
                <div class="msg-row ${isOwn ? 'own' : 'other'}">
                    <div class="msg-avatar">${m.avatar || "👤"}</div>
                    <div class="msg-bbl">
                        <div class="msg-user" style="color: ${userColor}">${m.nick}</div>
                        <div class="msg-text">${m.text}</div>
                        <div class="msg-time">${m.time || ""}</div>
                    </div>
                </div>
            `;
        }).join("");

        // --- УЛЬТИМАТИВНЫЙ СКРОЛЛ ВНИЗ ---
        // Сначала прыгаем мгновенно (для надежности)
        chatBox.scrollTop = chatBox.scrollHeight;
        
        // Затем через микро-паузу повторяем (когда браузер отрисует всё)
        setTimeout(() => {
            chatBox.scrollTo({
                top: chatBox.scrollHeight,
                behavior: 'auto' // 'auto' работает надежнее чем 'smooth' для авто-скролла
            });
        }, 50);
    }

    window.showAppToast = (text, type = 'info') => {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `app-toast ${type}`;
        let icon = (type === 'danger') ? 'fi-rr-lock' : 'fi-rr-bell';
        toast.innerHTML = `
            <div class="app-toast-icon"><i class="fi ${icon}"></i></div>
            <div class="app-toast-message">${text}</div>
        `;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    };

    function processSend() {
        let currentUser = localStorage.getItem("bp_user");
        if (!currentUser || currentUser.trim() === "") {
            if (window.showAppToast) {
                window.showAppToast("Войдите в аккаунт, чтобы писать", "danger");
            }
            return; // СРАЗУ ОБРЫВАЕМ ВЫПОЛНЕНИЕ, чтобы ничего больше не вылезало
        }

        const input = document.getElementById("chatInput");
        const text = input.value.trim();
        if(!text) return;

        let db = JSON.parse(localStorage.getItem("bp_users_db") || "{}");
        let msgs = JSON.parse(localStorage.getItem("bp_chat_history") || "[]");

        const now = new Date();
        const timeStr = now.getHours().toString().padStart(2, '0') + ":" + 
                        now.getMinutes().toString().padStart(2, '0');

        msgs.push({
            uid: currentUser,
            nick: db[currentUser]?.nickname || currentUser,
            avatar: db[currentUser]?.avatar || "👤",
            text: text,
            time: timeStr
        });

        localStorage.setItem("bp_chat_history", JSON.stringify(msgs.slice(-50)));
        input.value = "";
        
        // Проверяем, существует ли функция рендера, прежде чем вызывать
        if (typeof renderChat === "function") {
            renderChat();
        }
    }

    // Привязываем события
    document.getElementById("sendMsg")?.addEventListener("click", processSend);
    document.getElementById("chatInput")?.addEventListener("keypress", (e) => {
        if (e.key === 'Enter') processSend();
    });

    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendMsg');

    function handleSendMessage() {
        const text = chatInput.value.trim();
        if (text !== "") {
            // Здесь мы вызываем твою логику сохранения сообщения
            // Если у тебя функция отправки называется по-другому, замени sendMessage
            saveNewMessage(text); 
            
            chatInput.value = ""; 
            renderChat(); 
        }
    }

    function saveNewMessage(text) {
        let msgs = JSON.parse(localStorage.getItem("bp_chat_history") || "[]");
        msgs.push({
            nick: currentUserNick, // или как у тебя хранится ник
            avatar: currentUserAvatar, 
            text: text,
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            uid: currentUserUID
        });
        localStorage.setItem("bp_chat_history", JSON.stringify(msgs));
    }

    sendBtn?.addEventListener('click', handleSendMessage);

    chatInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });

    document.getElementById("sendMsg")?.addEventListener("click", () => {
        
        const input = document.getElementById("chatInput");
        const text = input.value.trim();
        if(!text) return;

        let db = getDB();
        let msgs = JSON.parse(localStorage.getItem("bp_chat_history") || "[]");

        // Создаем метку времени (часы:минуты)
        const now = new Date();
        const timeStr = now.getHours().toString().padStart(2, '0') + ":" + 
                        now.getMinutes().toString().padStart(2, '0');

        msgs.push({
            uid: currentUser,
            nick: db[currentUser].nickname,
            avatar: db[currentUser].avatar,
            text: text,
            time: timeStr // <--- СОХРАНЯЕМ ВРЕМЯ
        });

        localStorage.setItem("bp_chat_history", JSON.stringify(msgs.slice(-50)));
        input.value = "";
        renderChat();
    });

    // Переключение видимости панели
    document.getElementById('emojiBtn')?.addEventListener('click', () => {
        const picker = document.getElementById('emojiPicker');
        picker.style.display = picker.style.display === 'none' ? 'flex' : 'none';
    });

    // Функция вставки эмодзи в поле ввода
    window.addEmoji = (emoji) => {
        const input = document.getElementById('chatInput');
        input.value += emoji; // Добавляем эмодзи в конец текста
        input.focus(); // Возвращаем фокус на поле ввода
        // Можно закрывать панель после выбора, если хочешь:
        // document.getElementById('emojiPicker').style.display = 'none';
    };

    // Закрываем панель при клике вне её
    document.addEventListener('click', (e) => {
        const picker = document.getElementById('emojiPicker');
        const btn = document.getElementById('emojiBtn');
        if (picker && btn && !picker.contains(e.target) && e.target !== btn) {
            picker.style.display = 'none';
        }
    });

    // --- ДОСТИЖЕНИЯ ---
    function renderAchievements(bp, count) {
        const achs = [
            {n: "Первый шаг", d: "Выполни 1 задачу", ok: count >= 1},
            {n: "Стахановец", d: "Выполни 10 задач", ok: count >= 10},
            {n: "Коллекционер", d: "Накопи 1000 BP", ok: bp >= 1000},
            {n: "Миллионер", d: "Накопи 5000 BP", ok: bp >= 5000}
        ];
        const container = document.getElementById("achContainer");
        if(container) {
            container.innerHTML = achs.map(a => `
                <div class="ach-card ${a.ok ? 'unlocked' : ''}">
                    <i class="fi fi-rr-trophy"></i>
                    <b>${a.n}</b>
                    <small>${a.d}</small>
                </div>
            `).join("");
        }
    }

    // --- ЗАКРЫТИЕ И ОТКРЫТИЕ МОДАЛОК ---
    document.querySelectorAll(".close-modal").forEach(btn => {
        btn.onclick = () => { document.querySelectorAll(".modal-overlay").forEach(m => m.style.display = "none"); };
    });

    document.querySelectorAll(".open-auth").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".modal-overlay").forEach(m => m.style.display = "none");
            document.getElementById("authOverlay").style.display = "flex";
        };
    });

    document.querySelectorAll(".open-recover").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".modal-overlay").forEach(m => m.style.display = "none");
            document.getElementById("recoverOverlay").style.display = "flex";
        };
    });

    // Переменная для хранения индекса сообщения, которое хотим удалить
    let msgToDelete = null;

    // Функция вызова меню удаления (только для админа)
    window.showChatMenu = (index) => {
        msgToDelete = index;
        document.getElementById("chatAdminMenu").style.display = "flex";
    };

    // Функция самого удаления
    window.deleteMessage = () => {
        if (msgToDelete === null) return;
        
        let msgs = JSON.parse(localStorage.getItem("bp_chat_history") || "[]");
        msgs.splice(msgToDelete, 1); // Удаляем сообщение из массива
        localStorage.setItem("bp_chat_history", JSON.stringify(msgs));
        
        document.getElementById("chatAdminMenu").style.display = "none";
        msgToDelete = null;
        renderChat(); // Перерисовываем чат
    };
});