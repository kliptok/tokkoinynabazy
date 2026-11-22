// Укажите URL развёрнутого Google Apps Script Web App.
// До подключения API сайт работает в демонстрационном режиме.
const API_URL = "https://script.google.com/macros/s/AKfycby-tzlhFCnURjNphry0VgKiGYw2Ys_fAZhD8w57L2byUFVscXBnK3w_bMN7ylADNRm1ig/exec";

const $ = (id) => document.getElementById(id);
const form = $("task-form");
const button = $("task-button");
const result = $("task-result");

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
  if (!API_URL) throw new Error("Демо-режим: API ещё не подключён.");
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

async function loadPublicState() {
  if (!API_URL) {
    $("clip-title").textContent = "Скоро здесь появится новый клип";
    $("clip-description").textContent = "Сайт находится в режиме демонстрации. Подключение сервера ещё не выполнено.";
    $("clip-status").textContent = "Демо-режим";
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
    showResult(data.task.type === "secret" ? "Секретное задание!" : "Твоё задание", data.task.text);
  } catch (error) {
    showResult("Не удалось получить задание", error.message, true);
  } finally {
    button.disabled = false;
    button.textContent = "Получить задание";
  }
});

loadPublicState();
