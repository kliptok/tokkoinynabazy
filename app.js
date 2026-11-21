/*
 * ТокКлип — клиентская логика.
 * Сейчас включён демонстрационный режим. Реальную выдачу заданий подключим
 * после публикации Google Apps Script Web App и настройки API_URL.
 */
const API_URL = ""; // Вставить URL развернутого Apps Script Web App.
const form = document.querySelector("#task-form");
const result = document.querySelector("#task-result");
const button = document.querySelector("#get-task");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const vkId = document.querySelector("#vk-id").value.trim();
  if (!/^[0-9]{1,20}$/.test(vkId)) return;

  if (!API_URL) {
    result.hidden = false;
    result.innerHTML = "<strong>Скоро открытие!</strong><br>Система выдачи заданий ещё подключается. Пока это демонстрационная форма — заявка не сохранена.";
    return;
  }

  button.disabled = true;
  button.textContent = "Проверяем...";
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "getTask", vkId })
    });
    const data = await response.json();
    result.hidden = false;
    if (!response.ok || !data.ok) throw new Error(data.error || "Не удалось получить задание.");
    result.innerHTML = `<strong>Твоё задание:</strong><br>${escapeHtml(data.task.text)}<br><span class="muted">Сохрани его — оно закреплено за твоим VK ID и этим клипом.</span>`;
  } catch (error) {
    result.hidden = false;
    result.textContent = error.message || "Ошибка соединения. Попробуй позже.";
  } finally {
    button.disabled = false;
    button.innerHTML = 'Получить задание <span>→</span>';
  }
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}
