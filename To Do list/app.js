/* ===========================
   VARIABLES GLOBALES
=========================== */
let vistaActual = "activa";   // activa | cancelada
let vistaModo = "lista";      // lista | cuadritos

let folders = JSON.parse(localStorage.getItem("folders")) || [];
let activeFolder = localStorage.getItem("activeFolder") || "principal";
let folderToDelete = null;
let folderToEditId = null;    // Movida aquí para mantener el orden

/* --- VALIDACIÓN DE TEXTO REAL --- */
function esTextoValido(texto) {
    // Esta expresión busca al menos una letra (incluye ñ y acentos)
    const tieneLetras = /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(texto);
    return tieneLetras;
}

/* ===========================
   CARPETAS (TABS)
=========================== */

/* --- MODAL ELIMINAR CARPETA --- */
function closeDeleteFolderModal() {
    document.getElementById("delete-folder-modal").style.display = "none";
}

function deleteFolder(folderId) {
    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

    // 1. ELIMINAR: Quitamos las que están en esta carpeta Y están completadas (cancelada)
    tasks = tasks.filter(t => !(Number(t.carpetaId) === Number(folderId) && t.estado === "cancelada"));

    // 2. MOVER: Las que quedan en esta carpeta (que son las activas) se van a principal
    tasks = tasks.map(t => {
        if (Number(t.carpetaId) === Number(folderId)) {
            t.carpetaId = "principal";
        }
        return t;
    });

    localStorage.setItem("tasks", JSON.stringify(tasks));

    // 3. Eliminar la carpeta de la lista
    folders = folders.filter(f => f.id !== folderId);
    localStorage.setItem("folders", JSON.stringify(folders));

    activeFolder = "principal";
    localStorage.setItem("activeFolder", "principal");

    closeDeleteFolderModal();
    renderFolderTabs();
    getTasks();
}

function openDeleteFolderModal(folderId) {
    folderToDelete = folderId;
    
    // Seleccionamos el párrafo que está dentro del modal
    const mensajeModal = document.querySelector("#delete-folder-modal p");
    
    if (mensajeModal) {
        mensajeModal.innerHTML = `Las tareas pendientes se moverán a la principal, pero las <b style="color: #ffb3b3;">tareas completadas serán eliminadas</b> permanentemente.`;
    }

    document.getElementById("delete-folder-modal").style.display = "flex";
    
    document.getElementById("confirm-delete-folder").onclick = () => {
        if (folderToDelete !== null) {
            deleteFolder(folderToDelete);
            if (typeof renderFolderManager === "function") renderFolderManager();
            
            closeDeleteFolderModal();
            folderToDelete = null;
        }
    };
}

/* --- CAMBIAR CARPETA ACTIVA --- */
function setActiveFolder(id) {
    activeFolder = id;
    localStorage.setItem("activeFolder", activeFolder);
    renderFolderTabs();
    getTasks();
}

/* --- RENDER TABS DE CARPETAS --- */
function renderFolderTabs() {
    const tabs = document.getElementById("folder-tabs");
    if (!tabs) return;

    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    tabs.innerHTML = ""; // Limpia la barra para volver a dibujar

    // Color del contador según la vista (Incompletas/Completas)
    const badgeColor = vistaActual === "activa" ? "#8990E1" : "#77DD77"; 

    // --- 1. PESTAÑA PRINCIPAL ---
    const countPrincipal = tasks.filter(t => 
        (t.carpetaId === "principal" || !t.carpetaId) && t.estado === vistaActual
    ).length;

    const isMainActive = activeFolder === "principal";
    const main = document.createElement("div");
    main.className = "folder-tab" + (isMainActive ? " active" : "");
    
    // Si está activa, el número también se verá negro para que combine con la equis
    const mainBadgeColor = isMainActive ? "black" : badgeColor;

    main.innerHTML = `
        Principal 
        <span style="color: ${mainBadgeColor}; font-weight: bold; font-size: 0.75rem; margin-left: 5px;">
            (${countPrincipal})
        </span>`;
    
    main.onclick = () => {
        activeFolder = "principal";
        localStorage.setItem("activeFolder", activeFolder);
        renderFolderTabs();
        getTasks();
    };
    tabs.appendChild(main);

    // --- 2. PESTAÑAS DE USUARIO ---
    folders.forEach(folder => {
        const count = tasks.filter(t => 
            Number(t.carpetaId) === Number(folder.id) && t.estado === vistaActual
        ).length;

        const isActive = folder.id == activeFolder;
        const currentBadgeColor = isActive ? "black" : badgeColor;

        const tab = document.createElement("div");
        tab.className = "folder-tab" + (isActive ? " active" : "");
        tab.innerHTML = `
            <span class="folder-name" onclick="setActiveFolder(${folder.id})">
                ${folder.nombre} 
                <span style="color: ${currentBadgeColor}; font-weight: bold; font-size: 0.75rem; margin-left: 4px;">
                    (${count})
                </span>
            </span>
            <button class="delete-folder-btn" 
                style="color: ${isActive ? 'black' : 'rgba(255,255,255,0.7)'}; border: none; background: none; cursor: pointer; font-size: 1rem;" 
                onclick="openDeleteFolderModal(${folder.id}); event.stopPropagation();">✖</button>
        `;
        tabs.appendChild(tab);
    });

    // --- 3. BOTÓN PARA CREAR CARPETA (+) ---
    const add = document.createElement("div");
    add.className = "folder-tab add";
    add.textContent = "+";
    add.onclick = createFolder;
    tabs.appendChild(add);
}

/* --- MODAL CREAR CARPETA --- */
function createFolder() {
    loadTasksForFolderModal();
    document.getElementById("folder-modal").style.display = "flex";
}

/* --- CARGAR TAREAS DE PRINCIPAL EN MODAL CARPETA --- */
function loadTasksForFolderModal() {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    const container = document.getElementById("folder-task-list");

    container.innerHTML = "";

    // VALIDACIÓN: Solo tareas en Principal que estén "activas"
    const principalesActivas = tasks.filter(t => 
        (t.carpetaId === "principal" || !t.carpetaId) && t.estado === "activa"
    );

    if (principalesActivas.length === 0) {
        container.innerHTML = `<p style="opacity:0.7; font-size:0.9rem;">No hay tareas pendientes en Principal para mover.</p>`;
        return;
    }

    principalesActivas.forEach(t => {
        const item = document.createElement("label");
        item.style.display = "block";
        item.style.marginBottom = "8px";
        item.innerHTML = `
            <input type="checkbox" class="folder-task-check" value="${t.id}">
            <span style="margin-left: 8px;">${t.titulo}</span>
        `;
        container.appendChild(item);
    });
}

/* --- CREAR CARPETA + MOVER TAREAS (BOTÓN MODAL) --- */
document.getElementById("folder-create-btn").onclick = () => {
    const nombre = document.getElementById("folder-name-input").value.trim();
    if (!nombre) {
        showError("⚠️ La carpeta necesita un nombre.");
        return;
    }

    // NUEVA VALIDACIÓN: Evitar carpetas duplicadas (ignorando mayúsculas/minúsculas)
    const exists = folders.some(f => f.nombre.toLowerCase() === nombre.toLowerCase());
    if (exists) {
        showError("⚠️ Ya existe una carpeta con ese nombre.");
        return;
    }

    const nueva = {
        id: Date.now(),
        nombre
    };

    folders.push(nueva);
    localStorage.setItem("folders", JSON.stringify(folders));
    if (typeof renderFolderManager === "function") renderFolderManager();

    // mover tareas seleccionadas
    const checks = document.querySelectorAll(".folder-task-check:checked");
    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

    checks.forEach(chk => {
        const id = Number(chk.value);
        tasks = tasks.map(t => {
            if (t.id === id) t.carpetaId = nueva.id;
            return t;
        });
    });

    localStorage.setItem("tasks", JSON.stringify(tasks));

    activeFolder = nueva.id;
    localStorage.setItem("activeFolder", activeFolder);

    renderFolderTabs();
    getTasks();
    closeFolderModal();
};

/* --- CERRAR MODAL CREAR CARPETA --- */
document.getElementById("folder-cancel-btn").onclick = closeFolderModal;

function closeFolderModal() {
    document.getElementById("folder-modal").style.display = "none";
    document.getElementById("folder-name-input").value = "";
}

/* --- CERRAR MODAL MOVER CARPETA --- */
function closeMoveFolderModal() {
    document.getElementById("move-folder-modal").style.display = "none";
}

/* ===========================
   TAREAS
=========================== */

/* --- CARGAR TAREAS (LISTA / CUADRITOS) --- */
function getTasks() {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    const list = document.getElementById("todo-list");
    if (!list) return;

    // --- 1. IDENTIFICADOR DE CARPETA AUTOMÁTICO ---
    let folderName = "🏠 Principal";
    if (activeFolder !== "principal") {
        const carpetasGuardadas = JSON.parse(localStorage.getItem("folders")) || [];
        const current = carpetasGuardadas.find(f => Number(f.id) === Number(activeFolder));
        if (current) folderName = `📁 ${current.nombre}`;
    }

    // Crear o actualizar el texto encima de la lista (sin tocar tu HTML original)
    let folderDisplay = document.getElementById("dynamic-folder-title");
    if (!folderDisplay) {
        folderDisplay = document.createElement("div");
        folderDisplay.id = "dynamic-folder-title";
        // Estilo minimalista y limpio (puedes ajustar los colores si quieres)
        folderDisplay.style.marginBottom = "15px";
        folderDisplay.style.color = "#aaa"; 
        folderDisplay.style.fontSize = "0.95rem";
        folderDisplay.style.paddingLeft = "5px";
        // Lo insertamos justo ANTES de la lista de tareas
        list.parentNode.insertBefore(folderDisplay, list);
    }
    folderDisplay.innerHTML = `Estás en: <strong style="color: white; font-size: 1.1rem; margin-left: 5px;">${folderName}</strong>`;
    // ----------------------------------------------

    list.innerHTML = "";

    // aplicar vista cuadritos
    if (vistaModo === "cuadritos") {
        list.classList.add("grid-view");
    } else {
        list.classList.remove("grid-view");
    }

    const prioridadPeso = { Alta: 3, Media: 2, Baja: 1 };
    let tareasFiltradas = tasks.filter(t => t.estado === vistaActual);

    // si estamos en una carpeta distinta a Principal, filtrar
    if (activeFolder !== "principal") {
        tareasFiltradas = tareasFiltradas.filter(t => Number(t.carpetaId) === Number(activeFolder));
    } else {
        // si estamos en Principal, mostrar solo tareas sin carpeta o con carpetaId = "principal"
        tareasFiltradas = tareasFiltradas.filter(t => !t.carpetaId || t.carpetaId === "principal");
    }

    tareasFiltradas.sort((a, b) => prioridadPeso[b.prioridad] - prioridadPeso[a.prioridad]);

    if (tareasFiltradas.length === 0) {
        list.innerHTML = `<p style="text-align:center; opacity:0.5; margin-top:50px; color:white;">No hay tareas en esta sección.</p>`;
        return;
    }

    // Dibujar las tarjetas (Bucle limpio)
    tareasFiltradas.forEach(task => {
        const card = document.createElement("div");
        card.className = `task-card ${task.estado}`;
        card.onclick = () => showDetails(task.id);

        card.innerHTML = `
            <div class="task-info">
                <strong>${task.titulo}</strong>
                <div class="tags">
                    <span class="tag ${task.prioridad}">${task.prioridad}</span>
                    <span class="tag category">📚 ${task.categoria}</span>
                </div>
            </div>
            <div class="actions">
                <button class="status-btn" onclick="event.stopPropagation(); changeStatus(${task.id}, '${task.estado === "activa" ? "cancelada" : "activa"}')">
                    ${task.estado === "activa" ? "✔️" : "↩️"}
                </button>
            </div>
        `;

        list.appendChild(card);
    });
}

/* --- AGREGAR TAREA --- */
function addTask() {
    const input = document.getElementById("task-input");
    const titulo = input.value.trim();
    // Asegúrate de que los IDs de categoría y prioridad coincidan con tu HTML
    const categoria = document.getElementById("category-select")?.value || "General";
    const prioridad = document.getElementById("priority-select")?.value || "Media";

    // 1. Validación de longitud (la que ya tenías)
    if (titulo.length < 5 || titulo.length > 100) {
        showError("⚠️ La tarea debe tener entre 5 y 100 caracteres.");
        return;
    }
   
    // ==========================================
    // 2. NUEVA VALIDACIÓN: Números y Especiales
    // ==========================================
    
    // Escanea y cuenta cuántos números (0-9) hay. Si no hay, devuelve 0.
    const cantidadNumeros = (titulo.match(/\d/g) || []).length;
    
    // Escanea y cuenta todo lo que NO sea letra (incluyendo acentos y ñ), NO sea número y NO sea espacio.
    const cantidadEspeciales = (titulo.match(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s]/g) || []).length;

    // Puedes ajustar estos límites según lo que les hayan pedido
    const MAX_NUMEROS = 4; 
    const MAX_ESPECIALES = 3;

    if (cantidadNumeros > MAX_NUMEROS) {
        showError(`⚠️ La tarea debe contener al menos algunas letras.`);
        return;
    }

    if (cantidadEspeciales > MAX_ESPECIALES) {
        showError(`⚠️ Demasiados caracteres especiales.`);
        return;
    }
    // ==========================================

    // Si pasa todas las validaciones, creamos la tarea (tu código original)
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    tasks.push({
        id: Date.now(),
        titulo,
        categoria,
        prioridad,
        estado: "activa",
        fecha: new Date().toLocaleString(),
        carpetaId: activeFolder
    });

    localStorage.setItem("tasks", JSON.stringify(tasks));
    input.value = "";
    getTasks();
    renderFolderTabs(); // Actualiza los numeritos de las carpetas

    document.getElementById("char-count").textContent = "0 / 100";
}

/* --- MODAL DETALLES TAREA --- */
function showDetails(id) {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const modal = document.getElementById("task-modal");
    const body = document.getElementById("modal-body");
    const isCancelada = task.estado === "cancelada";

    body.innerHTML = `
        <div style="margin-top: 10px; text-align: left;">
            <label class="edit-label" style="color: rgba(255,255,255,0.9); font-size: 0.9rem; margin-bottom: 5px; display: block;">Editar Título:</label>
            
            <input type="text" id="edit-title" class="edit-input" 
                   value="${task.titulo}" 
                   ${isCancelada ? "disabled" : ""} 
                   style="width: 100%; padding: 12px; border-radius: 12px; border: none; background: rgba(0,0,0,0.2); color: white; font-size: 1rem; margin-bottom: 5px;">
            
            <div id="edit-char-count" style="text-align: right; font-size: 0.75rem; opacity: 0.6; color: white; margin-right: 10px;">
                ${task.titulo.length} / 100
            </div>

            <div class="modal-info-row" style="display: flex; justify-content: space-between; margin-top: 15px; align-items: center;">
                <span style="color: white; font-size: 0.9rem; opacity: 0.8;">Categoría: ${task.categoria}</span>
                <span class="modal-priority-pill ${task.prioridad}">${task.prioridad}</span>
            </div>

            <p style="font-size: 0.75rem; opacity: 0.5; color: white; margin: 15px 0; text-align: center;">
                🕒 Creado el: ${task.fecha || "No disponible"}
            </p>

            ${!isCancelada ? `
                <button onclick="toggleFolderSelector(${task.id})" class="btn-move-folder" style="width: 100%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 10px; border-radius: 10px; cursor: pointer; margin-bottom: 20px;">
                    Mover a una carpeta
                </button>
            ` : ''}

            <div id="folder-selector" style="display:none; margin-top:10px;">
                <div id="folder-selector-list" class="folder-scroll"></div>
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 10px;">
                ${!isCancelada ? `
                    <button onclick="saveEdit(${task.id})" style="flex: 1; padding: 12px; border-radius: 12px; border: none; background: white; color: #8990E1; font-weight: bold; cursor: pointer;">Guardar</button>
                ` : ""}
                <button onclick="document.getElementById('task-modal').style.display='none'" style="flex: 1; padding: 12px; border-radius: 12px; border: none; background: rgba(255,255,255,0.2); color: white; cursor: pointer;">Cerrar</button>
            </div>
            
            <button onclick="deleteTask(${task.id})" 
    style="width: 100%; 
           margin-top: 20px; 
           background-color: #D19494; /* Color Rojo Pastel Sólido */
           color: white; /* Texto blanco para que resalte en el pastel */
           padding: 14px; 
           border: none; 
           border-radius: 15px; 
           font-weight: bold; 
           font-size: 1rem;
           cursor: pointer;
           box-shadow: 0 4px 10px rgba(209, 148, 148, 0.3); /* Sombra suave */
           transition: transform 0.2s, background 0.3s;">
    🗑️ Eliminar
</button>
        </div>
    `;

    modal.style.display = "flex";
    activateEditCounter(); // Para que el contador de letras funcione al escribir
}

/* --- GUARDAR CAMBIOS EN TAREA --- */
function saveEdit(id) {
    const newTitle = document.getElementById("edit-title").value.trim();
    if (newTitle.length < 5) {
        showError("⚠️ La tarea debe ser más largo.");
        return;
    }
    let tasks = JSON.parse(localStorage.getItem("tasks"));
    tasks = tasks.map(t => {
        if (t.id === id) t.titulo = newTitle;
        return t;
    });
    localStorage.setItem("tasks", JSON.stringify(tasks));
    document.getElementById("task-modal").style.display = "none";
    getTasks();
}

/* --- BORRAR TAREA --- */
function deleteTask(id) {
    let tasks = JSON.parse(localStorage.getItem("tasks"));
    tasks = tasks.filter(t => t.id !== id);
    localStorage.setItem("tasks", JSON.stringify(tasks));
    document.getElementById("task-modal").style.display = "none";
    getTasks();
    renderFolderTabs();
}

/* --- CONTADOR DEL MODAL + LÍMITE --- */
function activateEditCounter() {
    const editInput = document.getElementById("edit-title");
    const editCount = document.getElementById("edit-char-count");

    editInput.addEventListener("input", () => {
        let text = editInput.value;

        if (text.length > 100) {
            editInput.value = text.slice(0, 100);
            showError("⚠️ No se puede pasar de 100 caracteres.");
            return;
        }

        editCount.textContent = `${editInput.value.length} / 100`;
        editCount.style.color =
            editInput.value.length > 90 ? "#ffb3b3" : "rgba(255,255,255,0.8)";
    });
}

/* --- CAMBIAR ESTADO DE LA TAREA --- */
function changeStatus(id, newStatus) {
    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    
    // Buscamos la tarea por su ID y le cambiamos el estado
    tasks = tasks.map(t => {
        if (t.id === id) {
            t.estado = newStatus;
        }
        return t;
    });

    // Guardamos los cambios en localStorage
    localStorage.setItem("tasks", JSON.stringify(tasks));
    
    // Refrescamos la lista de tareas y los contadores de las carpetas
    getTasks();
    renderFolderTabs();
}

/* --- TOAST DE ERROR --- */
function showError(mensaje) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = mensaje;

    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}

/* --- SELECTOR DE CARPETAS DENTRO DEL MODAL TAREA --- */
function toggleFolderSelector(taskId) {
    const box = document.getElementById("folder-selector");
    const list = document.getElementById("folder-selector-list");

    box.style.display = box.style.display === "none" ? "block" : "none";

    if (box.style.display === "block") {
        list.innerHTML = "";

        if (folders.length === 0) {
            list.innerHTML = `<p style="opacity:0.7;">No hay carpetas creadas.</p>`;
            return;
        }

        folders.forEach(folder => {
            const btn = document.createElement("button");
            btn.textContent = folder.nombre;

            btn.style.width = "100%";
            btn.style.padding = "10px";
            btn.style.marginBottom = "8px";
            btn.style.border = "none";
            btn.style.borderRadius = "10px";
            btn.style.cursor = "pointer";
            btn.style.background = "white";
            btn.style.color = "#8990E1";
            btn.style.fontWeight = "bold";

            btn.onclick = () => moveTaskToFolderInsideModal(taskId, folder.id);

            list.appendChild(btn);
        });
    }
}

function moveTaskToFolderInsideModal(taskId, folderId) {
    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    
    // Buscamos la tarea específica
    const taskIndex = tasks.findIndex(t => t.id === taskId);

    if (taskIndex !== -1) {
        // VALIDACIÓN DE SEGURIDAD: Si está cancelada, no hacemos nada
        if (tasks[taskIndex].estado === "cancelada") {
            showError("⚠️ No se pueden mover tareas completadas.");
            return;
        }

        tasks[taskIndex].carpetaId = folderId;
        localStorage.setItem("tasks", JSON.stringify(tasks));

        document.getElementById("task-modal").style.display = "none";
        getTasks();
        renderFolderTabs(); // Actualizamos los contadores de las pestañas
    }
}

/* --- MOVER TAREA A CARPETA (OTRO MODAL) --- */
function moveTaskToFolder(folderId) {
    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

    tasks = tasks.map(t => {
        if (t.id === taskToMove) t.carpetaId = folderId;
        return t;
    });

    localStorage.setItem("tasks", JSON.stringify(tasks));

    closeMoveFolderModal();
    document.getElementById("task-modal").style.display = "none";
    getTasks();
}

/* ===========================
   INTERFAZ / EVENTOS
=========================== */

/* --- CONTADOR INPUT PRINCIPAL --- */
const taskInput = document.getElementById("task-input");
const charCount = document.getElementById("char-count");

if (taskInput) {
    taskInput.addEventListener("input", () => {
        let text = taskInput.value;

        if (text.length > 100) {
            taskInput.value = text.slice(0, 100);
            showError("⚠️ No se puede pasar de 100 caracteres.");
            return;
        }

        charCount.textContent = `${text.length} / 100`;
        charCount.style.color = text.length > 90 ? "#ffb3b3" : "rgba(255,255,255,0.8)";
    });
}

/* --- BOTÓN CAMBIAR VISTA --- */
const viewBtn = document.getElementById("view-btn");
if (viewBtn) {
    viewBtn.onclick = function () {
        if (vistaModo === "lista") {
            vistaModo = "cuadritos";
            this.innerText = "☰";
        } else {
            vistaModo = "lista";
            this.innerText = "⊞";
        }
        getTasks();
    };
}

/* --- FILTRO INCOMPLETAS / COMPLETAS --- */
const filterBtn = document.getElementById("filter-btn");
if (filterBtn) {
    filterBtn.onclick = function () {
        if (vistaActual === "activa") {
            vistaActual = "cancelada";
            this.innerText = "COMPLETAS";
            this.style.background = "#77DD77"; 
        } else {
            vistaActual = "activa";
            this.innerText = "INCOMPLETAS";
            this.style.background = ""; 
        }
        getTasks();          
        renderFolderTabs();  
    };
}

/* --- EVENTOS DE INTERFAZ (LOS CABLES RESTAURADOS) --- */

// 1. CONECTAR EL BOTÓN DE AGREGAR Y LA TECLA ENTER
const addBtn = document.getElementById("add-btn");
if (addBtn) addBtn.onclick = addTask;

if (taskInput) {
    taskInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter") addTask();
    });
}

// 2. Cierre mediante el botón "X" (clase .close-btn)
document.addEventListener("click", function (e) {
    if (e.target.classList.contains("close-btn")) {
        const modal = e.target.closest(".modal");
        if (modal) modal.style.display = "none";
    }
});

// 3. Cierre al hacer clic fuera del contenido (en el fondo oscuro)
window.addEventListener("click", function (e) {
    if (e.target.classList.contains("modal")) {
        e.target.style.display = "none";
    }
});

// 4. Función auxiliar para cerrar manualmente desde botones "Cancelar"
function cerrarCualquierModal() {
    const modales = document.querySelectorAll(".modal");
    modales.forEach(m => m.style.display = "none");
}

/* --- INICIO --- */
document.addEventListener("DOMContentLoaded", () => {
    renderFolderTabs();
    getTasks();
});
/* --- NUEVA GESTIÓN DE CARPETAS (REESTRUCTURACIÓN) --- */

// 1. Abrir el administrador
function openFolderManager() {
    const modal = document.getElementById("folder-manager-modal");
    renderFolderManager();
    modal.style.display = "flex";
}

// 2. Cerrar el administrador
function closeFolderManager() {
    document.getElementById("folder-manager-modal").style.display = "none";
}

// 3. Dibujar las carpetas dentro del modal
function renderFolderManager() {
    const container = document.getElementById("folder-manager-list");
    if (!container) return;

    let foldersData = JSON.parse(localStorage.getItem("folders")) || [];
    container.innerHTML = "";

    // 1. ORGANIZAR: Ponemos la carpeta que está abierta actualmente de primera
    let sortedFolders = [];
    if (activeFolder === "principal") {
        sortedFolders.push({ id: "principal", nombre: "Principal", esPrincipal: true });
        foldersData.forEach(f => sortedFolders.push(f));
    } else {
        const current = foldersData.find(f => f.id == activeFolder);
        if (current) sortedFolders.push(current);
        sortedFolders.push({ id: "principal", nombre: "Principal", esPrincipal: true });
        foldersData.forEach(f => {
            if (f.id != activeFolder) sortedFolders.push(f);
        });
    }

    // 2. RENDERIZAR
    sortedFolders.forEach(folder => {
        const isSelected = (folder.id == activeFolder || (folder.esPrincipal && activeFolder === "principal"));
        const isPrincipal = folder.esPrincipal;
        const div = document.createElement("div");
        
        div.className = `folder-manage-card ${isSelected ? 'active-folder-highlight' : ''}`;
        const folderName = isPrincipal ? `🏠 ${folder.nombre}` : `📁 ${folder.nombre}`;

        // AQUÍ ESTÁ LA MAGIA: El botón Abrir ahora refresca TODO y cierra el modal
        div.innerHTML = `
            <span style="color: white; font-weight: ${isSelected ? 'bold' : 'normal'}">
                ${folderName} ${isSelected ? ' <small>(Abierta)</small>' : ''}
            </span>
            <div class="folder-manage-actions">
                <button class="btn-folder-action btn-open" 
                    onclick="activeFolder='${folder.id}'; localStorage.setItem('activeFolder', '${folder.id}'); getTasks(); renderFolderTabs(); closeFolderManager();">
                    Abrir
                </button>
                ${!isPrincipal ? `
                    <button class="btn-folder-action btn-edit" onclick="openEditFolderModal(${folder.id}, '${folder.nombre}')">✏️</button>
                    <button class="btn-folder-action btn-delete-folder" onclick="openDeleteFolderModal(${folder.id})">🗑️</button>
                ` : ''}
            </div>
        `;
        container.appendChild(div);
    });
}

/* --- ABRIR MODAL DE EDITAR CARPETA --- */
function openEditFolderModal(id, currentName) {
    folderToEditId = id;
    
    const inputField = document.getElementById("edit-folder-input");
    inputField.value = currentName;
    
    // Mostrar el modal
    document.getElementById("edit-folder-modal").style.display = "flex";
    
    // Enfocar el input automáticamente para que el usuario pueda escribir de inmediato
    setTimeout(() => inputField.focus(), 100);
}

/* --- CERRAR MODAL DE EDITAR CARPETA --- */
function closeEditFolderModal() {
    document.getElementById("edit-folder-modal").style.display = "none";
    folderToEditId = null;
}

/* --- GUARDAR EDICIÓN DE CARPETA --- */
function saveEditFolder() {
    const newName = document.getElementById("edit-folder-input").value.trim();
    
    // Validación 1: No puede estar vacío
    if (!newName) {
        showError("⚠️ La carpeta necesita un nombre.");
        return;
    }

    // Validación 2: No puede llamarse igual a otra carpeta ya existente
    // (Ignoramos mayúsculas/minúsculas y excluimos la carpeta que estamos editando actualmente)
    const exists = folders.some(f => f.nombre.toLowerCase() === newName.toLowerCase() && f.id !== folderToEditId);
    if (exists) {
        showError("⚠️ Ya existe otra carpeta con ese nombre.");
        return;
    }

    // Actualizar el nombre en el arreglo de carpetas
    const folderIndex = folders.findIndex(f => f.id === folderToEditId);
    if (folderIndex !== -1) {
        folders[folderIndex].nombre = newName;
        
        // Guardar en LocalStorage
        localStorage.setItem("folders", JSON.stringify(folders));
        
        // Actualizar la interfaz principal
        renderFolderTabs();
        
        // Actualizar la lista en el administrador de carpetas
        renderFolderManager();
        
        closeEditFolderModal();
    }
}
// temas de apariencia//
/* ===========================
   SISTEMA DE ENTORNOS (TEMAS)
=========================== */

function openThemeModal() {
    document.getElementById("theme-modal").style.display = "flex";
}

function closeThemeModal() {
    document.getElementById("theme-modal").style.display = "none";
}

function changeTheme(themeId) {
    const backgrounds = document.querySelectorAll('.dynamic-bg');
    backgrounds.forEach(bg => bg.classList.remove('active-bg'));
    
    const selectedBg = document.getElementById(themeId);
    if (selectedBg) selectedBg.classList.add('active-bg');
    
    document.body.className = themeId; 
    
    // Limpiar colores personalizados para que el tema funcione bien
    document.documentElement.style.removeProperty('--app-bg');
    document.documentElement.style.removeProperty('--task-card-bg');
    document.documentElement.style.removeProperty('--btn-bg');
    
    localStorage.setItem('savedTheme', themeId);
    closeThemeModal();
}
/* --- ABRIR/CERRAR LISTA DE TEMAS --- */
function toggleThemeList() {
    const list = document.getElementById("theme-list-container");
    const icon = document.getElementById("theme-dropdown-icon");
    
    // Si está oculta, la mostramos y cambiamos la flecha
    if (list.style.display === "none") {
        list.style.display = "flex";
        icon.textContent = "▲";
    } else {
        // Si está visible, la ocultamos
        list.style.display = "none";
        icon.textContent = "▼";
    }
}
/* Generador unificado de partículas (Lluvia y Nieve) */
function generarParticulas() {
    const contenedorLluvia = document.getElementById('tema-lluvia');
    const contenedorNieve = document.getElementById('tema-nieve');
    
    // Lluvia: Solo generamos si no hay elementos con la clase 'particula-lluvia'
    if (contenedorLluvia && !contenedorLluvia.querySelector('.particula-lluvia')) {
        for (let j = 0; j <= 80; j++) {
            let gota = document.createElement('i');
            gota.className = 'particula-lluvia';
            gota.style.left = (innerWidth * Math.random()) + 'px';
            let time = (3 * Math.random()) + 1;
            gota.style.animationDuration = time + 's';
            gota.style.animationDelay = time + 's';
            contenedorLluvia.appendChild(gota);
        }
    }

    // Nieve: Solo generamos si no hay elementos con la clase 'particula-nieve'
    if (contenedorNieve && !contenedorNieve.querySelector('.particula-nieve')) {
        for (let j = 0; j <= 80; j++) {
            let copo = document.createElement('i');
            copo.className = 'particula-nieve';
            // Esparcimos la nieve más allá de los bordes para cubrir toda la pantalla
            copo.style.left = (innerWidth * Math.random()) + 'px';
            let size = (Math.random() * 5 + 2) + 'px'; // Copos de distintos tamaños
            copo.style.width = size;
            copo.style.height = size;
            let time = (6 * Math.random()) + 3; 
            copo.style.animationDuration = time + 's';
            copo.style.animationDelay = (time * Math.random()) + 's';
            contenedorNieve.appendChild(copo);
        }
    }
}
// Inicialización de temas
document.addEventListener("DOMContentLoaded", () => {
    generarParticulas();
    
    // --- NUEVO: Cargar fuente y colores si existen ---
    document.documentElement.style.setProperty('--base-font-size', currentFontSize + 'px');
    
    const savedTheme = localStorage.getItem('savedTheme') || 'tema-oceano';
    if (savedTheme === 'tema-personalizado') {
        const savedColors = JSON.parse(localStorage.getItem("customColors"));
        if(savedColors) {
            document.documentElement.style.setProperty('--app-bg', savedColors.appBg);
            document.documentElement.style.setProperty('--task-card-bg', savedColors.taskBg);
            document.documentElement.style.setProperty('--btn-bg', savedColors.btnBg);
        }
        document.body.className = 'tema-personalizado';
    } else {
        changeTheme(savedTheme);
    }
    // -------------------------------------------------

    renderFolderTabs();
    getTasks();
});/* ===========================
   PERSONALIZACIÓN AVANZADA
=========================== */

function toggleThemeList() {
    const list = document.getElementById("theme-list-container");
    const icon = document.getElementById("theme-dropdown-icon");
    if (list.style.display === "none") {
        list.style.display = "flex";
        icon.textContent = "▲";
        // Cerrar el otro acordeón automáticamente
        document.getElementById("custom-list-container").style.display = "none";
        document.getElementById("custom-dropdown-icon").textContent = "▼";
    } else {
        list.style.display = "none";
        icon.textContent = "▼";
    }
}

function toggleCustomList() {
    const list = document.getElementById("custom-list-container");
    const icon = document.getElementById("custom-dropdown-icon");
    if (list.style.display === "none") {
        list.style.display = "flex";
        icon.textContent = "▲";
        // Cerrar el acordeón de temas
        document.getElementById("theme-list-container").style.display = "none";
        document.getElementById("theme-dropdown-icon").textContent = "▼";
        
        // Cargar los colores actuales en los selectores
        loadColorsIntoPickers();
    } else {
        list.style.display = "none";
        icon.textContent = "▼";
    }
}

function applyCustomColors() {
    const appBg = document.getElementById("color-app-bg").value;
    const taskBg = document.getElementById("color-task-bg").value;
    const btnBg = document.getElementById("color-btn-bg").value;

    // Modificamos las variables CSS en tiempo real
    document.documentElement.style.setProperty('--app-bg', appBg);
    document.documentElement.style.setProperty('--task-card-bg', taskBg);
    document.documentElement.style.setProperty('--btn-bg', btnBg);

    // Activamos un modo "personalizado" para que los temas fijos no estorben
    document.body.className = 'tema-personalizado';
    
    // Guardamos en la memoria
    const customPrefs = { appBg, taskBg, btnBg };
    localStorage.setItem("customColors", JSON.stringify(customPrefs));
    localStorage.setItem("savedTheme", "tema-personalizado");
}

let currentFontSize = parseInt(localStorage.getItem("fontSize")) || 16;
function changeFontSize(step) {
    currentFontSize += step;
    
    // Límites para que la letra no quede microscópica ni gigante
    if(currentFontSize < 12) currentFontSize = 12;
    if(currentFontSize > 22) currentFontSize = 22;
    
    document.documentElement.style.setProperty('--base-font-size', currentFontSize + 'px');
    localStorage.setItem("fontSize", currentFontSize);
}

function loadColorsIntoPickers() {
    // Si hay colores guardados, los mostramos en las paletas
    const saved = JSON.parse(localStorage.getItem("customColors"));
    if (saved) {
        document.getElementById("color-app-bg").value = saved.appBg || "#8990E1";
        document.getElementById("color-task-bg").value = saved.taskBg || "#C1C6F0";
        document.getElementById("color-btn-bg").value = saved.btnBg || "#A9B1E6";
    }
}

