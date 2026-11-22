// Укажите URL развёрнутого Google Apps Script Web App.
// Вставьте свой адрес /exec между кавычками перед публикацией обновления.
const API_URL = "https://script.google.com/macros/s/AKfycby-tzlhFCnURjNphry0VgKiGYw2Ys_fAZhD8w57L2byUFVscXBnK3w_bMN7ylADNRm1ig/exec";

const $ = (id) => document.getElementById(id);
const form = $("task-form");
const button = $("task-button");
const result = $("task-result");

let currentVkId = "";
let currentTask = null;
let countdownInterval = null;

function showResult(title, message, isError = false) {
  result.classList.remove("hidden", "error");
  if (isError) result.classList.add("error");
  result.replaceChildren();
  const strong = document.createElement("strong");
  strong.textContent = title;
  const p = document.createElement("p");
  p.textContent = message;
  result.append(strong, p);
}

async function apiRequest(payload) {
  if (!API_URL) throw new Error("В app.js не указан URL API. Вставьте адрес Web App, заканчивающийся на /exec.");
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    redirect: "follow"
  });
  if (!response.ok) throw new Error(`Ошибка сервера: ${response.status}`);
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || "Не удалось выполнить запрос.");
  return data;
}

function renderSubmissionForm() {
  const wrapper = document.createElement("div");
  wrapper.className = "submission-form";
  wrapper.style.marginTop = "16px";

  const label = document.createElement("label");
  label.htmlFor = "comment-url";
  label.textContent = "Ссылка на комментарий или подтверждение выполнения";
  label.style.display = "block";
  label.style.marginBottom = "8px";

  const input = document.createElement("input");
  input.id = "comment-url";
  input.name = "commentUrl";
  input.type = "url";
  input.required = true;
  input.placeholder = "https://vk.ru/...";
  input.autocomplete = "url";
  input.style.width = "100%";
  input.style.boxSizing = "border-box";
  input.style.marginBottom = "10px";

  const submitButton = document.createElement("button");
  submitButton.type = "button";
  submitButton.textContent = "Отправить на проверку";

  const status = document.createElement("p");
  status.setAttribute("aria-live", "polite");
  status.style.marginTop = "10px";

  submitButton.addEventListener("click", async () => {
    const commentUrl = input.value.trim();
    if (!commentUrl) {
      status.textContent = "Вставь ссылку перед отправкой.";
      return;
    }
    if (!/^https:\/\/(www\.|m\.)?(vk\.com|vk\.ru)\//i.test(commentUrl)) {
      status.textContent = "Нужна полная ссылка, начинающаяся с https://vk.com/ или https://vk.ru/.";
      return;
    }
    if (!confirm("Проверь ссылку: после отправки исправить её будет нельзя. Отправить?")) return;
    submitButton.disabled = true;
    submitButton.textContent = "Отправляем…";
    status.textContent = "";
    try {
      const data = await apiRequest({
        action: "submitComment",
        vkId: currentVkId,
        commentUrl
      });
      status.textContent = data.message || "Ссылка отправлена организаторам на проверку.";
      input.disabled = true;
      submitButton.textContent = "Ссылка отправлена";
    } catch (error) {
      status.textContent = error.message;
      submitButton.disabled = false;
      submitButton.textContent = "Повторить отправку";
    }
  });

  wrapper.append(label, input, submitButton, status);
  result.append(wrapper);
}

function startCountdown(closeAt) {
  const output = $("clip-countdown");
  const caption = $("timer-caption");
  const card = $("timer-card");
  if (countdownInterval) clearInterval(countdownInterval);
  const end = closeAt ? new Date(closeAt).getTime() : NaN;
  if (!Number.isFinite(end)) {
    output.innerHTML = "<span>3 часа</span><small>с момента публикации</small>";
    caption.textContent = "Получить задание и отправить ссылку нужно в течение 3 часов после публикации клипа.";
    return;
  }
  const tick = () => {
    const remaining = Math.max(0, end - Date.now());
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    output.innerHTML = `<span>${String(hours).padStart(2,"0")} : ${String(minutes).padStart(2,"0")} : ${String(seconds).padStart(2,"0")}</span><small>${remaining > 0 ? "до окончания приёма" : "приём завершён"}</small>`;
    if (remaining <= 0) {
      caption.textContent = "Время на получение задания и отправку ссылки закончилось.";
      card.classList.add("timer-ended");
      clearInterval(countdownInterval);
    }
  };
  card.classList.remove("timer-ended");
  tick();
  countdownInterval = setInterval(tick, 1000);
}

async function loadPublicState() {
  if (!API_URL) {
    $("clip-title").textContent = "Скоро здесь появится новый клип";
    $("clip-description").textContent = "В app.js ещё не указан URL сервера.";
    $("clip-status").textContent = "API не подключён";
    $("clip-status").classList.add("muted");
    return;
  }
  try {
    const data = await apiRequest({ action: "getPublicState" });
    if (!data.activeClip) {
      $("clip-title").textContent = "Сейчас нет активного клипа";
      $("clip-description").textContent = "Следите за обновлениями сообщества!";
      $("clip-status").textContent = "Нет активности";
      $("clip-status").classList.add("muted");
      if (countdownInterval) clearInterval(countdownInterval);
      $("clip-countdown").innerHTML = "<span>— — : — — : — —</span><small>ожидаем новый клип</small>";
      $("timer-caption").textContent = "Когда выйдет новый клип, здесь появится отсчёт до окончания приёма заданий.";
      return;
    }
    $("clip-title").textContent = data.activeClip.title || "Активный клип";
    $("clip-description").textContent = data.activeClip.description || "Получите задание и оставьте комментарий.";
    if (data.activeClip.url) {
      $("clip-link").href = data.activeClip.url;
      $("clip-link").classList.remove("hidden");
    }
    $("clip-status").textContent = "Приём заявок открыт";
    $("clip-status").classList.remove("muted");
    startCountdown(data.activeClip.closeAt);
  } catch (error) {
    $("clip-title").textContent = "Не удалось загрузить клип";
    $("clip-description").textContent = error.message;
    $("clip-status").textContent = "Ошибка";
    $("clip-status").classList.add("muted");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const vkId = $("vk-id").value.trim();
  if (!/^\d{1,20}$/.test(vkId)) {
    showResult("Проверь VK ID", "Введи числовой VK ID.", true);
    return;
  }
  button.disabled = true;
  button.textContent = "Получаем…";
  try {
    const data = await apiRequest({ action: "getTask", vkId });
    currentVkId = vkId;
    currentTask = data.task;
    showResult(data.task.type === "secret" ? "Секретное задание!" : "Твоё задание", data.task.text);
    if (data.existing) {
      const note = document.createElement("p");
      note.textContent = "Это уже назначенное тебе задание для данного клипа. Получить другое нельзя.";
      result.append(note);
    }
    renderSubmissionForm();
  } catch (error) {
    showResult("Не удалось получить задание", error.message, true);
  } finally {
    button.disabled = false;
    button.textContent = "Получить задание";
  }
});

loadPublicState();
