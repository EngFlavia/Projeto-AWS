const API_BASE_URL = "https://ax9k6tgqz9.execute-api.us-east-1.amazonaws.com/default";
const STORAGE_KEY = "aws-mini-tasks";

const form = document.querySelector("#task-form");
const input = document.querySelector("#task-title");
const list = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const modeLabel = document.querySelector("#mode-label");
const errorMessage = document.querySelector("#error-message");
const filterButtons = document.querySelectorAll(".filter-button");

const useApi = API_BASE_URL.trim().length > 0;

let tasks = [];
let activeFilter = "all";

modeLabel.textContent = useApi ? "AWS API" : "Local";

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = input.value.trim();
  if (!title) return;

  try {
    await createTask(title);
    input.value = "";
    input.focus();
  } catch (error) {
    showError(error.message);
  }
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    render();
  });
});

list.addEventListener("click", async (event) => {
  const checkbox = event.target.closest(".task-check");
  const deleteButton = event.target.closest(".delete-button");

  if (checkbox) {
    try {
      await updateTask(checkbox.dataset.id, checkbox.checked);
    } catch (error) {
      checkbox.checked = !checkbox.checked;
      showError(error.message);
    }
  }

  if (deleteButton) {
    try {
      await deleteTask(deleteButton.dataset.id);
    } catch (error) {
      showError(error.message);
    }
  }
});

loadTasks().catch((error) => showError(error.message));

async function loadTasks() {
  tasks = useApi ? await apiRequest("/tasks") : readLocalTasks();
  render();
}

async function createTask(title) {
  if (useApi) {
    const task = await apiRequest("/tasks", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
    tasks = [task, ...tasks];
  } else {
    const task = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    tasks = [task, ...tasks];
    writeLocalTasks();
  }

  render();
}

async function updateTask(id, completed) {
  if (useApi) {
    const updated = await apiRequest(`/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify({ completed }),
    });
    tasks = tasks.map((task) => (task.id === id ? updated : task));
  } else {
    tasks = tasks.map((task) => (task.id === id ? { ...task, completed } : task));
    writeLocalTasks();
  }

  render();
}

async function deleteTask(id) {
  if (useApi) {
    await apiRequest(`/tasks/${id}`, { method: "DELETE" });
  } else {
    tasks = tasks.filter((task) => task.id !== id);
    writeLocalTasks();
  }

  tasks = tasks.filter((task) => task.id !== id);
  render();
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Erro HTTP ${response.status}`);
  }

  if (response.status === 204) return null;

  return response.json();
}

function readLocalTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function writeLocalTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function showError(message) {
  errorMessage.textContent = `Erro na API: ${message}`;
  errorMessage.classList.remove("is-hidden");
}

function render() {
  errorMessage.classList.add("is-hidden");

  const visibleTasks = tasks.filter((task) => {
    if (activeFilter === "open") return !task.completed;
    if (activeFilter === "done") return task.completed;
    return true;
  });

  emptyState.classList.toggle("is-hidden", visibleTasks.length > 0);
  list.innerHTML = visibleTasks.map(renderTask).join("");
}

function renderTask(task) {
  return `
    <li class="task-item ${task.completed ? "is-done" : ""}">
      <input class="task-check" type="checkbox" data-id="${task.id}" ${task.completed ? "checked" : ""} aria-label="Marcar tarefa como concluida">
      <span class="task-title">${escapeHtml(task.title)}</span>
      <button class="delete-button" type="button" data-id="${task.id}" aria-label="Excluir tarefa">&times;</button>
    </li>
  `;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
