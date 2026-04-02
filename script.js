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
        if (!cb || !rewardCell) return;

        // 1. Получаем базовые значения
        const baseValue = parseInt(rewardCell.getAttribute("data-without")) || 0;
        const vipValue = parseInt(rewardCell.getAttribute("data-with")) || 0;

        // 2. Рассчитываем текущую награду в зависимости от чекбоксов VIP и X2
        let currentReward = vipCheckbox.checked ? vipValue : baseValue;
        if (x2Checkbox.checked) currentReward *= 2;

        // 3. ОБНОВЛЯЕМ ТЕКСТ В ТАБЛИЦЕ (то, что ты просил)
        rewardCell.textContent = currentReward + " BP";

        // 4. Считаем общие суммы
        totalPossibleBP += currentReward;
        if (cb.checked) {
            totalBP += currentReward;
            row.classList.add("done");
        } else {
            row.classList.remove("done");
        }
    });

    // Обновление интерфейса (проценты и плашки)
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