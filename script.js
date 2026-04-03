document.addEventListener("DOMContentLoaded", function () {
    // 1. Элементы управления и отображения
    const vipCheckbox = document.getElementById("vipCheckbox");
    const x2Checkbox = document.getElementById("x2Checkbox");
    const themeBtn = document.getElementById("themeToggle");
    const resetBtn = document.getElementById("resetBtn");
    const taskBody = document.getElementById("taskBody");
    const dragBtn = document.getElementById("dragToggle");
    const dragIcon = document.getElementById("dragIcon");
    
    const totalDisplay = document.getElementById("totalDisplay");
    const remainingDisplay = document.getElementById("remainingDisplay");
    const progressFill = document.getElementById("progressFill");
    const progressPercent = document.getElementById("progressPercent");

    let isDragEnabled = false;
    let sortableInstance;

    // 2. Инициализация SortableJS
    if (taskBody && typeof Sortable !== 'undefined') {
        sortableInstance = new Sortable(taskBody, {
            animation: 250,
            handle: '.left-cell', 
            forceFallback: true,
            fallbackOnBody: true,
            fallbackClass: "sortable-drag",
            ghostClass: "sortable-ghost",
            disabled: true,
            
            scroll: true,
            scrollSensitivity: 50,
            scrollSpeed: 10,
            bubbleScroll: false,
            
            onStart: () => document.body.classList.add('is-dragging'),
            onEnd: () => {
                document.body.classList.remove('is-dragging');
                saveAllData(); // Сохраняем порядок после перетаскивания
            }
        });
    }
    

    // 3. Функции LocalStorage
    function saveAllData() {
        const data = {
            tasks: [],
            settings: {
                vip: vipCheckbox.checked,
                x2: x2Checkbox.checked,
                theme: document.body.getAttribute("data-theme")
            },
            order: []
        };

        document.querySelectorAll("#taskBody tr").forEach((row) => {
            const taskId = row.querySelector(".left-cell").textContent;
            const isChecked = row.querySelector(".task-checkbox").checked;
            const quantity = row.querySelector(".quantity-display") ? row.querySelector(".quantity-display").textContent : "0";
            
            data.tasks.push({ id: taskId, checked: isChecked, qty: quantity });
            data.order.push(taskId);
        });

        localStorage.setItem("bpTrackerData", JSON.stringify(data));
    }

    function loadAllData() {
        const saved = localStorage.getItem("bpTrackerData");
        if (!saved) {
            updateProgress();
            return;
        }

        const data = JSON.parse(saved);

        // Восстанавливаем настройки
        vipCheckbox.checked = data.settings.vip;
        x2Checkbox.checked = data.settings.x2;
        document.body.setAttribute("data-theme", data.settings.theme);
        themeBtn.innerHTML = data.settings.theme === "dark" ? '<i class="fi fi-br-sun"></i>' : '<i class="fi fi-br-eclipse-alt"></i>';

        // Восстанавливаем порядок
        const rows = Array.from(taskBody.querySelectorAll("tr"));
        data.order.forEach(taskId => {
            const row = rows.find(r => r.querySelector(".left-cell").textContent === taskId);
            if (row) {
                const taskInfo = data.tasks.find(t => t.id === taskId);
                row.querySelector(".task-checkbox").checked = taskInfo.checked;
                const qtyDisp = row.querySelector(".quantity-display");
                if (qtyDisp) qtyDisp.textContent = taskInfo.qty;
                taskBody.appendChild(row);
            }
        });

        updateProgress();
    }

    // 4. Функция расчета прогресса
    function updateProgress() {
        let totalBP = 0;
        let totalPossibleBP = 0;
        const allRows = document.querySelectorAll("#taskBody tr");
    
        allRows.forEach(row => {
            const cb = row.querySelector(".task-checkbox");
            const rewardCell = row.querySelector(".reward");
            const quantityDisplay = row.querySelector(".quantity-display");
            const lotteryButtons = row.querySelectorAll(".arrow-btn"); // Находим кнопки управления
    
            if (!cb || !rewardCell) return;
    
            const baseValue = parseInt(rewardCell.getAttribute("data-without")) || 0;
            const vipValue = parseInt(rewardCell.getAttribute("data-with")) || 0;
    
            let currentReward = vipCheckbox.checked ? vipValue : baseValue;
            if (x2Checkbox.checked) currentReward *= 2;
    
            rewardCell.textContent = currentReward + " BP";
            totalPossibleBP += currentReward;
    
            if (cb.checked) {
                totalBP += currentReward;
                row.classList.add("done");
                // Блокируем кнопки, если задание выполнено
                lotteryButtons.forEach(btn => btn.disabled = true);
            } else {
                row.classList.remove("done");
                // Разблокируем кнопки, если галочка снята
                lotteryButtons.forEach(btn => btn.disabled = false);
            }
        });
    
        totalDisplay.textContent = totalBP + " BP";
        remainingDisplay.textContent = (totalPossibleBP - totalBP) + " BP";
    
        const percent = totalPossibleBP > 0 ? Math.round((totalBP / totalPossibleBP) * 100) : 0;
        progressFill.style.width = percent + "%";
        progressPercent.textContent = percent + "%";
    
        if (typeof saveAllData === "function") saveAllData(); 
    }

    // 5. Логика кнопки перетаскивания
    if (dragBtn) {
        dragBtn.addEventListener('click', () => {
            isDragEnabled = !isDragEnabled;
            if (sortableInstance) sortableInstance.option("disabled", !isDragEnabled);
            dragBtn.classList.toggle('active', isDragEnabled);
            document.body.classList.toggle('drag-mode-on', isDragEnabled);
            if (dragIcon) {
                dragIcon.classList.toggle('fi-rr-edit', !isDragEnabled);
                dragIcon.classList.toggle('fi-rr-padlock-check', isDragEnabled);
            }
        });
    }

    // 6. Обработка кликов и лотереи
    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".arrow-btn");
        if (btn) {
            const control = btn.closest(".lottery-controls");
            const display = control.querySelector(".quantity-display");
            const target = parseInt(control.getAttribute("data-target"));
            const cb = control.closest("tr").querySelector(".task-checkbox");
            let val = parseInt(display.textContent);

            if (btn.classList.contains("up-arrow") && val < target) val++;
            else if (btn.classList.contains("down-arrow") && val > 0) val--;
            
            display.textContent = val;
            cb.checked = (val === target);
            updateProgress();
        }
    });

    document.addEventListener("change", (e) => {
        if (e.target.classList.contains("task-checkbox")) {
            // НОВОЕ: Если галочку сняли вручную
            if (!e.target.checked) {
                const row = e.target.closest("tr");
                const quantityDisplay = row.querySelector(".quantity-display");
                
                // Если в этой строке есть счетчик (лотерея и т.д.), сбрасываем его на 0
                if (quantityDisplay) {
                    quantityDisplay.textContent = "0";
                }
            }
            updateProgress();
        } else if (e.target === vipCheckbox || e.target === x2Checkbox) {
            updateProgress();
        }
    });

    // 7. Тема и Сброс
    themeBtn.addEventListener("click", () => {
        const body = document.body;
        const newTheme = body.getAttribute("data-theme") === "dark" ? "light" : "dark";
        body.setAttribute("data-theme", newTheme);
        themeBtn.innerHTML = newTheme === "dark" ? '<i class="fi fi-br-sun"></i>' : '<i class="fi fi-br-eclipse-alt"></i>';
        saveAllData();
    });

    resetBtn.addEventListener("click", () => {
        if (confirm("Сбросить весь прогресс?")) {
            document.querySelectorAll(".task-checkbox").forEach(cb => cb.checked = false);
            document.querySelectorAll(".quantity-display").forEach(d => d.textContent = "0");
            updateProgress();
        }
    });

    // Инициализация
    loadAllData();
});