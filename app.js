// Укажите URL развёрнутого Google Apps Script Web App.
// Вставьте свой адрес /exec между кавычками перед публикацией обновления.
const API_URL = "https://script.google.com/macros/s/AKfycby-tzlhFCnURjNphry0VgKiGYw2Ys_fAZhD8w57L2byUFVscXBnK3w_bMN7ylADNRm1ig/exec";

const $ = (id) => document.getElementById(id);
const form = $("task-form");
const button = $("task-button");
const result = $("task-result");

let currentVkId = "";
let currentTask = null;

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
    submitButton.disabled = true;
    submitButton.textContent = "Отправляем…";
    status.textContent = "";
    try {
      const data = await apiRequest({
        action: "submitComment",
        vkId: currentVkId,
        commentUrl
      });
      status.textContent = data.message || "Заявка отправлена на проверку.";
      input.disabled = true;
      submitButton.textContent = "Отправлено";
    } catch (error) {
      status.textContent = error.message;
      submitButton.disabled = false;
      submitButton.textContent = "Повторить отправку";
    }
  });

  wrapper.append(label, input, submitButton, status);
  result.append(wrapper);
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
    renderSubmissionForm();
  } catch (error) {
    showResult("Не удалось получить задание", error.message, true);
  } finally {
    button.disabled = false;
    button.textContent = "Получить задание";
  }
});

loadPublicState();
