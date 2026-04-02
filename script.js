document.addEventListener("DOMContentLoaded", function () {
  // Элементы управления
  const vipCheckbox = document.getElementById("vipCheckbox");
  const x2Checkbox = document.getElementById("x2Checkbox");
  const themeBtn = document.getElementById("themeToggle");
  const resetBtn = document.getElementById("resetBtn");

  // Элементы отображения
  const totalDisplay = document.getElementById("totalDisplay");
  const remainingDisplay = document.getElementById("remainingDisplay");
  const progressFill = document.getElementById("progressFill");
  const progressPercent = document.getElementById("progressPercent");

  /**
   * Основная функция расчета прогресса
   */
  function updateProgress() {
    let totalBP = 0;
    let totalPossibleBP = 0;
    const allRows = document.querySelectorAll("#taskBody tr");

    allRows.forEach(row => {
        const cb = row.querySelector(".task-checkbox");
        const rewardCell = row.querySelector(".reward");
        const quantityDisplay = row.querySelector(".quantity-display");

        if (!cb || !rewardCell) return;

        // 1. Получаем значения из атрибутов
        const baseValue = parseInt(rewardCell.getAttribute("data-without")) || 0;
        const vipValue = parseInt(rewardCell.getAttribute("data-with")) || 0;

        // 2. Считаем текущую награду (VIP и X2)
        let currentReward = vipCheckbox.checked ? vipValue : baseValue;
        if (x2Checkbox.checked) currentReward *= 2;

        // 3. Обновляем текст в таблице
        rewardCell.textContent = currentReward + " BP";

        // 4. Считаем общую возможную сумму
        totalPossibleBP += currentReward;

        // 5. Логика для ВЫПОЛНЕННОГО задания
        if (cb.checked) {
            totalBP += currentReward;
            row.classList.add("done");

            // Сбрасываем счетчик лотереи в 0 только если чекбокс нажат
            if (quantityDisplay) {
                quantityDisplay.textContent = "0";
            }
        } else {
            // Если чекбокс не нажат
            row.classList.remove("done");
        }
    });

    // 6. Обновляем итоговые показатели (прогресс-бар и цифры сверху)
    totalDisplay.textContent = totalBP + " BP";
    remainingDisplay.textContent = (totalPossibleBP - totalBP) + " BP";

    const percent = totalPossibleBP > 0 ? Math.round((totalBP / totalPossibleBP) * 100) : 0;
    progressFill.style.width = percent + "%";
    progressPercent.textContent = percent + "%";
    }
  /**
   * Обработка лотерейных кнопок
   */
  document.querySelectorAll(".lottery-controls").forEach(control => {
    const upBtn = control.querySelector(".up-arrow");
    const downBtn = control.querySelector(".down-arrow");
    const display = control.querySelector(".quantity-display");
    const target = parseInt(control.getAttribute("data-target")) || 0;
    
    // Ищем чекбокс в той же строке (tr)
    const row = control.closest("tr");
    const cb = row.querySelector(".task-checkbox");

    upBtn.addEventListener("click", () => {
        let val = parseInt(display.textContent);
        if (val < target) {
            val++;
            display.textContent = val;
            if (val === target) cb.checked = true;
            updateProgress();
        }
    });

    downBtn.addEventListener("click", () => {
        let val = parseInt(display.textContent);
        if (val > 0) {
            val--;
            display.textContent = val;
            // Если уменьшили — снимаем галочку
            if (val < target) cb.checked = false;
            updateProgress();
        }
    });
});

  /**
   * Слушатели для всех чекбоксов
   */
  document.addEventListener("change", (e) => {
      if (e.target.classList.contains("task-checkbox") || 
          e.target === vipCheckbox || 
          e.target === x2Checkbox) {
          updateProgress();
      }
  });

  /**
   * Переключение темы
   */
  themeBtn.addEventListener("click", () => {
      const body = document.body;
      const currentTheme = body.getAttribute("data-theme");
      const newTheme = currentTheme === "dark" ? "light" : "dark";
      
      body.setAttribute("data-theme", newTheme);
      themeBtn.textContent = newTheme === "dark" ? "☀" : "🌙";
  });

  /**
   * Сброс прогресса
   */
  resetBtn.addEventListener("click", () => {
      if (confirm("Сбросить весь прогресс?")) {
          document.querySelectorAll(".task-checkbox").forEach(cb => cb.checked = false);
          document.querySelectorAll(".quantity-display").forEach(d => d.textContent = "0");
          vipCheckbox.checked = false;
          x2Checkbox.checked = false;
          updateProgress();
      }
  });

  // Первоначальный запуск
  updateProgress();
});

// 1. Объявляем переменную в области видимости файла
let sortableInstance;

document.addEventListener('DOMContentLoaded', () => {
    const taskBody = document.getElementById('taskBody');
    const dragBtn = document.getElementById('dragToggle'); // Объявляем один раз тут
    const dragIcon = document.getElementById('dragIcon');
    let isDragEnabled = false;

    if (!taskBody || !dragBtn) return;

    // 2. Инициализация библиотеки
    sortableInstance = new Sortable(taskBody, {
        animation: 150,
        handle: '.left-cell',
        forceFallback: true,
        fallbackClass: "sortable-drag",
        ghostClass: "sortable-ghost",
        disabled: true,
    
        onStart: function () {
            document.body.classList.add('is-dragging');
        },
        onEnd: function () {
            document.body.classList.remove('is-dragging');
        }
    });

    // 3. Логика кнопки
    dragBtn.addEventListener('click', () => {
        isDragEnabled = !isDragEnabled;
        
        // Переключаем состояние Sortable
        if (sortableInstance) {
            sortableInstance.option("disabled", !isDragEnabled);
        }
        
        // Визуальное переключение кнопки и body
        dragBtn.classList.toggle('active', isDragEnabled);
        document.body.classList.toggle('drag-mode-on', isDragEnabled);
        
        // Смена иконок (проверяем наличие иконки перед заменой)
        if (dragIcon) {
            if (isDragEnabled) {
                dragIcon.classList.replace('fi-rr-edit', 'fi-rr-padlock-check');
            } else {
                dragIcon.classList.replace('fi-rr-padlock-check', 'fi-rr-edit');
            }
        }
    });
});