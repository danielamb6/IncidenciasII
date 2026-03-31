// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================
const API_URL = "http://localhost:5000/api";

// ==========================================
// VARIABLES GLOBALES
// ==========================================
let todasLasFallas = []; // Cache de fallas (respaldo)

// ==========================================
// FUNCIONES PARA EL DASHBOARD (index.html)
// ==========================================

// Cargar datos del dashboard desde el backend
async function cargarDatosDashboard() {
    try {
        const response = await fetch(`${API_URL}/dashboard-data`, {
            headers: getHeaders()
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            // Actualizar KPIs
            actualizarResumenDashboard(result.stats);
            // Llenar tabla de tickets
            llenarTablaTickets(result.tickets);
            // Cargar opciones de filtros
            cargarOpcionesFiltros();
        } else {
            console.error('Error en respuesta:', result.message);
            mostrarNotificacion('Error al cargar datos del dashboard', 'error');
        }
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        mostrarNotificacion('Error de conexión con el servidor', 'error');
    }
}

// Actualizar los contadores del dashboard
function actualizarResumenDashboard(stats) {
    const totalEl = document.getElementById('total-incidencias');
    const abiertasEl = document.getElementById('abiertas-count');
    const atencionEl = document.getElementById('atencion-count');
    const esperaEl = document.getElementById('espera-refaccion-count');
    const resueltosEl = document.getElementById('resueltos-count');

    if (totalEl) totalEl.textContent = stats?.total || 0;
    if (abiertasEl) abiertasEl.textContent = stats?.abiertas || 0;
    if (atencionEl) atencionEl.textContent = stats?.atencion || 0;
    if (esperaEl) esperaEl.textContent = stats?.espera_refaccion || 0;
    if (resueltosEl) resueltosEl.textContent = stats?.resueltos || 0;
}

// Llenar la tabla de tickets
function llenarTablaTickets(tickets) {
    const tbody = document.getElementById('all-tickets-body');
    if (!tbody) return;

    if (!tickets || tickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No hay tickets para mostrar</td></tr>';
        return;
    }

    let html = '';
    tickets.forEach(ticket => {
        // Formatear fecha
        let fechaFormateada = ticket.fecha || 'N/A';
        try {
            if (ticket.fecha) {
                const fecha = new Date(ticket.fecha);
                fechaFormateada = fecha.toLocaleDateString('es-MX', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        } catch (e) {
            console.warn('Error formateando fecha:', e);
        }

        // Color según estado
        const coloresEstado = {
            'ABIERTO': '#e74c3c',
            'EN ATENCIÓN': '#f39c12',
            'ESPERA_REFACCION': '#9b59b6',
            'RESUELTO': '#2ecc71',
            'CERRADO': '#95a5a6',
            'PENDIENTE': '#3498db'
        };
        const colorEstado = coloresEstado[ticket.estado] || '#666';
        const estadoLegible = ticket.estado ? ticket.estado.replace('_', ' ') : 'N/A';

        html += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px; font-weight: bold;">${ticket.codigo || 'N/A'}</td>
                <td style="padding: 12px;">${fechaFormateada}</td>
                <td style="padding: 12px;">${ticket.empresa || 'N/A'}</td>
                <td style="padding: 12px;">
                    <span style="background-color: ${colorEstado}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: bold;">
                        ${estadoLegible}
                    </span>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Cargar opciones para los filtros (empresas, técnicos)
async function cargarOpcionesFiltros() {
    try {
        // Cargar empresas
        const resEmp = await fetch(`${API_URL}/catalogos/empresas`, {
            headers: getHeaders()
        });
        const empresasData = await resEmp.json();
        
        // Manejar diferentes formatos de respuesta
        let empresas = [];
        if (Array.isArray(empresasData)) {
            empresas = empresasData;
        } else if (empresasData && Array.isArray(empresasData.data)) {
            empresas = empresasData.data;
        } else if (empresasData && empresasData.status === 'success' && Array.isArray(empresasData.data)) {
            empresas = empresasData.data;
        }
        
        const selectEmp = document.getElementById('f-empresa');
        if (selectEmp) {
            selectEmp.innerHTML = '<option value="">Todas las empresas</option>' + 
                empresas.map(e => `<option value="${e.id}">${e.empresa || e.nombre}</option>`).join('');
        }

        // Cargar técnicos
        const resTec = await fetch(`${API_URL}/tecnicos-detallados`, {
            headers: getHeaders()
        });
        const tecnicosResult = await resTec.json();
        
        let tecnicos = [];
        if (tecnicosResult.status === 'success' && Array.isArray(tecnicosResult.data)) {
            tecnicos = tecnicosResult.data;
        }
        
        const selectTec = document.getElementById('f-tecnico');
        if (selectTec) {
            selectTec.innerHTML = '<option value="">Todos los técnicos</option>' + 
                tecnicos.map(t => `<option value="${t.id}">${t.nombre} ${t.primer_apellido || ''}</option>`).join('');
        }
    } catch (error) {
        console.error('Error cargando opciones de filtros:', error);
    }
}

// ==========================================
// FUNCIONES DE FILTROS PARA DASHBOARD
// ==========================================

window.aplicarFiltros = async function() {
    const fEmpresa = document.getElementById('f-empresa')?.value || '';
    const fTecnico = document.getElementById('f-tecnico')?.value || '';
    const fInicio = document.getElementById('f-inicio')?.value || '';
    const fFin = document.getElementById('f-fin')?.value || '';
    const fEstado = document.getElementById('f-estado')?.value || '';

    // Construir URL con filtros
    let url = `${API_URL}/dashboard-data?`;
    if (fEmpresa) url += `empresa=${fEmpresa}&`;
    if (fTecnico) url += `tecnico=${fTecnico}&`;
    if (fInicio) url += `inicio=${fInicio}&`;
    if (fFin) url += `fin=${fFin}&`;
    if (fEstado) url += `estado=${fEstado}`;

    try {
        const response = await fetch(url, {
            headers: getHeaders()
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            actualizarResumenDashboard(result.stats);
            llenarTablaTickets(result.tickets);
            mostrarNotificacion('Filtros aplicados', 'success');
        }
    } catch (error) {
        console.error('Error aplicando filtros:', error);
        mostrarNotificacion('Error al aplicar filtros', 'error');
    }
};

window.limpiarFiltros = function() {
    document.getElementById('f-empresa').value = '';
    document.getElementById('f-tecnico').value = '';
    document.getElementById('f-inicio').value = '';
    document.getElementById('f-fin').value = '';
    document.getElementById('f-estado').value = '';
    
    // Recargar datos sin filtros
    cargarDatosDashboard();
    mostrarNotificacion('Filtros limpiados', 'success');
};

// ==========================================
// FUNCIONES PARA CLIENTES (clientes.html)
// ==========================================

let clientesData = [];

async function cargarClientesDesdeBD() {
    try {
        const response = await fetch(`${API_URL}/clientes-detallados`, {
            headers: getHeaders()
        });
        const result = await response.json();
        if (result.status === 'success') {
            clientesData = result.data;
            actualizarTablaClientes();
        }
    } catch (error) {
        console.error('Error cargando clientes:', error);
        mostrarNotificacion('Error al cargar clientes', 'error');
    }
}

function actualizarTablaClientes() {
    const tbody = document.getElementById('clientes-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = clientesData.map(c => `
        <tr>
            <td>${c.id}</td>
            <td>${c.nombre} ${c.primer_apellido || ''} ${c.segundo_apellido || ''}</td>
            <td>${c.id_telegram || 'N/A'}</td>
            <td>${c.nombre_empresa || 'N/A'}</td>
            <td>
                <span class="status-badge ${c.activo ? 'status-activo' : 'status-inactivo'}">
                    ${c.activo ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td>
                <button onclick="toggleCliente(${c.id})" class="btn-action">
                    <i class="fas ${c.activo ? 'fa-ban' : 'fa-check-circle'}"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

window.toggleCliente = async function(id) {
    try {
        const response = await fetch(`${API_URL}/clientes/${id}/toggle-status`, { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getHeaders()
            }
        });
        const res = await response.json();
        if (res.status === 'success') {
            mostrarNotificacion(res.message, 'success');
            cargarClientesDesdeBD();
        } else {
            mostrarNotificacion(res.message || 'Error al cambiar estado', 'error');
        }
    } catch (error) {
        console.error('Error cambiando estado:', error);
        mostrarNotificacion('Error al cambiar estado', 'error');
    }
};

// ==========================================
// FUNCIONES PARA TÉCNICOS (tecnicos.html)
// ==========================================

let tecnicosData = [];

async function cargarTecnicosDesdeBD() {
    try {
        const response = await fetch(`${API_URL}/tecnicos-detallados`, {
            headers: getHeaders()
        });
        const result = await response.json();
        if (result.status === 'success') {
            tecnicosData = result.data;
            actualizarTablaTecnicos();
        }
    } catch (error) {
        console.error('Error cargando técnicos:', error);
        mostrarNotificacion('Error al cargar técnicos', 'error');
    }
}

function actualizarTablaTecnicos() {
    const tbody = document.getElementById('tecnicos-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = tecnicosData.map(t => `
        <tr>
            <td>${t.id}</td>
            <td>${t.nombre} ${t.primer_apellido || ''} ${t.segundo_apellido || ''}</td>
            <td>${t.id_telegram || 'N/A'}</td>
            <td>${t.nombre_especialidad || 'N/A'}</td>
            <td>
                <span class="status-badge ${t.activo ? 'status-activo' : 'status-inactivo'}">
                    ${t.activo ? 'Activo' : 'Inactivo'}
                </span>
            </td>
            <td>
                <button onclick="toggleTecnico(${t.id})" class="btn-action">
                    <i class="fas ${t.activo ? 'fa-ban' : 'fa-check-circle'}"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

window.toggleTecnico = async function(id) {
    try {
        const response = await fetch(`${API_URL}/tecnicos/${id}/toggle-status`, { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getHeaders()
            }
        });
        const res = await response.json();
        if (res.status === 'success') {
            mostrarNotificacion(res.message, 'success');
            cargarTecnicosDesdeBD();
        } else {
            mostrarNotificacion(res.message || 'Error al cambiar estado', 'error');
        }
    } catch (error) {
        console.error('Error cambiando estado:', error);
        mostrarNotificacion('Error al cambiar estado', 'error');
    }
};

// ==========================================
// FUNCIONES PARA INCIDENCIAS (incidencias.html)
// ==========================================

async function cargarIncidencias() {
    try {
        const response = await fetch(`${API_URL}/fichas-completas`, {
            headers: getHeaders()
        });
        const result = await response.json();
        if (result.status === 'success') {
            const tbody = document.getElementById('incidencias-table-body');
            if (tbody && result.data) {
                tbody.innerHTML = result.data.map(f => `
                    <tr>
                        <td>${f.ticket_cod || 'N/A'}</td>
                        <td>${f.empresa_nombre || 'N/A'}</td>
                        <td>${f.tecnico || 'N/A'}</td>
                        <td>${f.equipo_nombre || 'N/A'}</td>
                        <td>${f.falla_reportada || 'N/A'}</td>
                        <td>${f.detalle_solucion || 'N/A'}</td>
                        <td><span class="badge">${f.estado || 'N/A'}</span></td>
                        <td>${f.fecha_inicio ? new Date(f.fecha_inicio).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error cargando incidencias:', error);
    }
}

// ==========================================
// FUNCIONES PARA CREAR TICKET (crear-ticket.html)
// ==========================================

// Función para cargar todas las fallas (cache de respaldo)
async function cargarTodasLasFallas() {
    try {
        const response = await fetch(`${API_URL}/catalogos/fallas`, {
            headers: getHeaders()
        });
        const data = await response.json();
        
        // Manejar diferentes formatos de respuesta
        if (Array.isArray(data)) {
            todasLasFallas = data;
        } else if (data && Array.isArray(data.data)) {
            todasLasFallas = data.data;
        } else if (data && data.status === 'success' && Array.isArray(data.data)) {
            todasLasFallas = data.data;
        }
        
        console.log('✅ Fallas precargadas:', todasLasFallas.length);
    } catch (error) {
        console.error('Error precargando fallas:', error);
        todasLasFallas = [];
    }
}

async function cargarSelectsTicket() {
    try {
        // Cargar Empresas
        const resEmp = await fetch(`${API_URL}/catalogos/empresas`, {
            headers: getHeaders()
        });
        const empresasData = await resEmp.json();
        
        let empresas = [];
        if (Array.isArray(empresasData)) {
            empresas = empresasData;
        } else if (empresasData && Array.isArray(empresasData.data)) {
            empresas = empresasData.data;
        } else if (empresasData && empresasData.status === 'success' && Array.isArray(empresasData.data)) {
            empresas = empresasData.data;
        }
        
        const selectEmp = document.getElementById('int-id-empresa');
        if (selectEmp) {
            selectEmp.innerHTML = '<option value="">Seleccione Empresa...</option>' + 
                empresas.map(e => `<option value="${e.id}">${e.empresa || e.nombre}</option>`).join('');
        }

        // Cargar Equipos
        const resEq = await fetch(`${API_URL}/catalogos/equipos-con-especialidades`, {
            headers: getHeaders()
        });
        const equipos = await resEq.json();
        const selectEq = document.getElementById('int-equipo');
        const selectFalla = document.getElementById('int-falla');
        
        if (selectEq && Array.isArray(equipos)) {
            selectEq.innerHTML = '<option value="">Seleccione Equipo...</option>' + 
                equipos.map(eq => `<option value="${eq.id}">${eq.equipo}</option>`).join('');

            // Precargar todas las fallas (por si acaso)
            await cargarTodasLasFallas();

            selectEq.onchange = async function() {
                const idEquipo = this.value;
                
                if (!idEquipo) {
                    selectFalla.innerHTML = '<option value="">Seleccione un equipo primero</option>';
                    selectFalla.disabled = true;
                    return;
                }

                selectFalla.disabled = true;
                selectFalla.innerHTML = '<option value="">Cargando fallas...</option>';
                
                try {
                    // Usar el endpoint específico de fallas por equipo
                    const response = await fetch(`${API_URL}/fallas-por-equipo/${idEquipo}`, {
                        headers: getHeaders()
                    });
                    const fallas = await response.json();
                    
                    console.log(`Fallas para equipo ${idEquipo}:`, fallas);
                    
                    if (fallas && fallas.length > 0) {
                        selectFalla.innerHTML = '<option value="">Seleccione Falla...</option>' + 
                            fallas.map(f => `<option value="${f.id}">${f.falla}</option>`).join('');
                        selectFalla.disabled = false;
                    } else {
                        selectFalla.innerHTML = '<option value="">No hay fallas para este equipo</option>';
                    }
                } catch (error) {
                    console.error('Error cargando fallas:', error);
                    selectFalla.innerHTML = '<option value="">Error al cargar fallas</option>';
                }
            };
        }
    } catch (error) {
        console.error('Error cargando selects:', error);
        mostrarNotificacion('Error al cargar catálogos', 'error');
    }
}

// Guardar ticket interno
document.addEventListener('DOMContentLoaded', function() {
    const formTicket = document.getElementById('form-ticket-interno');
    if (formTicket) {
        formTicket.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const sesionStr = localStorage.getItem('sesion');
            if (!sesionStr) {
                mostrarNotificacion('Sesión expirada', 'error');
                return;
            }
            
            const sesion = JSON.parse(sesionStr);
            const payload = {
                id_empresa: document.getElementById('int-id-empresa')?.value,
                num_autobus: document.getElementById('int-autobus')?.value,
                id_falla: document.getElementById('int-falla')?.value,
                id_super_admin: sesion.id 
            };

            if (!payload.id_empresa || !payload.num_autobus || !payload.id_falla) {
                mostrarNotificacion('Todos los campos son requeridos', 'error');
                return;
            }

            try {
                const response = await fetch(`${API_URL}/tickets/interno/crear`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...getHeaders()
                    },
                    body: JSON.stringify(payload)
                });
                const res = await response.json();
                if(res.status === "success") {
                    mostrarNotificacion(`Ticket creado: ${res.codigo}`, 'success');
                    e.target.reset();
                    
                    // Resetear select de fallas
                    const selectFalla = document.getElementById('int-falla');
                    selectFalla.innerHTML = '<option value="">Seleccione un equipo primero</option>';
                    selectFalla.disabled = true;
                    
                    // Recargar la tabla de tickets si existe la función
                    if (typeof cargarTicketsInternos === 'function') {
                        await cargarTicketsInternos();
                    }
                } else {
                    mostrarNotificacion(res.message || 'Error al crear ticket', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                mostrarNotificacion('Error de conexión', 'error');
            }
        });
    }
});

// ==========================================
// FUNCIONES PARA REPORTES (reportes.html)
// ==========================================

async function cargarDatosReporteGeneral() {
    try {
        const response = await fetch(`${API_URL}/reportes/general`, {
            headers: getHeaders()
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            const data = result.data;
            console.log('Datos de reportes:', data);
            // Aquí puedes agregar la lógica para llenar las tablas de reportes
        }
    } catch (error) {
        console.error('Error cargando reportes:', error);
    }
}

async function cargarEmpresasParaSelect() {
    try {
        const response = await fetch(`${API_URL}/catalogos/empresas`, {
            headers: getHeaders()
        });
        const empresasData = await response.json();
        
        let empresas = [];
        if (Array.isArray(empresasData)) {
            empresas = empresasData;
        } else if (empresasData && Array.isArray(empresasData.data)) {
            empresas = empresasData.data;
        } else if (empresasData && empresasData.status === 'success' && Array.isArray(empresasData.data)) {
            empresas = empresasData.data;
        }
        
        const select = document.getElementById('select-empresa-reporte');
        if (select) {
            select.innerHTML = '<option value="">-- Seleccione una empresa --</option>' + 
                empresas.map(e => `<option value="${e.id}">${e.empresa || e.nombre}</option>`).join('');
        }
    } catch (error) {
        console.error('Error cargando empresas:', error);
    }
}

// ==========================================
// FUNCIONES PARA TICKETS INTERNOS (usadas en crear-ticket.html)
// ==========================================

async function cargarTicketsInternos() {
    try {
        const response = await fetch(`${API_URL}/tickets-internos`, {
            headers: getHeaders()
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            const tbody = document.getElementById('tabla-tickets-internos-body');
            if (tbody) {
                if (result.data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay tickets internos</td></tr>';
                } else {
                    tbody.innerHTML = result.data.map(ticket => `
                        <tr>
                            <td>${ticket.codigo || 'N/A'}</td>
                            <td>${ticket.administrador || 'N/A'}</td>
                            <td>${ticket.empresa || 'N/A'} / ${ticket.num_autobus || 'N/A'}</td>
                            <td>${ticket.fecha_inicio || 'N/A'} / ${ticket.fecha_fin || 'Pendiente'}</td>
                            <td>${ticket.equipo || 'N/A'} / ${ticket.falla_reportada || 'N/A'}</td>
                            <td>${ticket.tecnico || 'N/A'} / ${ticket.solucion || 'N/A'}</td>
                            <td>${ticket.observacion || 'N/A'}</td>
                            <td><span class="status-badge">${ticket.estado || 'N/A'}</span></td>
                        </tr>
                    `).join('');
                }
            }
        }
    } catch (error) {
        console.error('Error cargando tickets internos:', error);
    }
}

// ==========================================
// FUNCIONES PARA REPORTES EXTRA (usadas en crear-ticket.html)
// ==========================================

async function cargarReportesExtra() {
    try {
        const response = await fetch(`${API_URL}/reportes-extra`, {
            headers: getHeaders()
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            const tbody = document.getElementById('tabla-extra-body');
            if (tbody) {
                if (result.data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay reportes extra</td></tr>';
                } else {
                    tbody.innerHTML = result.data.map(reporte => `
                        <tr>
                            <td>${reporte.codigo_extra || 'N/A'}</td>
                            <td>${reporte.ficha_origen || 'N/A'}</td>
                            <td>${reporte.equipo || 'N/A'}</td>
                            <td>${reporte.elemento || 'N/A'}</td>
                            <td>${reporte.revision || reporte.solucion || 'N/A'}</td>
                            <td>${reporte.observacion || 'N/A'}</td>
                            <td>${reporte.tipo || 'N/A'}</td>
                        </tr>
                    `).join('');
                }
            }
        }
    } catch (error) {
        console.error('Error cargando reportes extra:', error);
    }
}

// ==========================================
// UTILIDADES COMUNES
// ==========================================

function mostrarNotificacion(mensaje, tipo) {
    const notificacionExistente = document.getElementById('notificacion-toast');
    if (notificacionExistente) notificacionExistente.remove();
    
    const notificacion = document.createElement('div');
    notificacion.id = 'notificacion-toast';
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${tipo === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        border-radius: 8px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    notificacion.innerHTML = `<i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${mensaje}`;
    document.body.appendChild(notificacion);
    
    setTimeout(() => {
        if (notificacion.parentNode) notificacion.remove();
    }, 3000);
}

function configurarNavegacion() {
    const currentPath = window.location.pathname.split('/').pop();
    document.querySelectorAll('.menu-link').forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href === currentPath) {
            link.classList.add('active');
        }
    });
}

// Función para obtener headers con permisos
function getHeaders() {
    const sesion = JSON.parse(localStorage.getItem('sesion') || '{}');
    return {
        'Content-Type': 'application/json',
        'X-User-Rol': sesion.rol || '',
        'X-User-Empresa': sesion.id_empresa || ''
    };
}

// ==========================================
// INICIALIZACIÓN PRINCIPAL
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    // Mostrar información del usuario
    const sesion = localStorage.getItem('sesion');
    if (sesion) {
        try {
            const datos = JSON.parse(sesion);
            const userNameElement = document.getElementById('display-user-name');
            const userRoleElement = document.getElementById('display-user-role');
            
            if (userNameElement) userNameElement.textContent = datos.nombre || 'Usuario';
            if (userRoleElement) userRoleElement.textContent = (datos.rol || 'Admin').toUpperCase();
        } catch (e) {
            console.error('Error al parsear sesión:', e);
        }
    }

    // Configurar logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('sesion');
            window.location.href = 'login.html';
        });
    }

    // Carga inicial según la página actual
    const path = window.location.pathname;
    
    if (path.includes('index.html') || path === '/' || path.includes('dashboard')) {
        cargarDatosDashboard();
    } else if (path.includes('clientes.html')) {
        cargarClientesDesdeBD();
    } else if (path.includes('tecnicos.html')) {
        cargarTecnicosDesdeBD();
    } else if (path.includes('incidencias.html')) {
        cargarIncidencias();
    } else if (path.includes('crear-ticket.html')) {
        cargarSelectsTicket();
        cargarTicketsInternos();
        cargarReportesExtra();
    } else if (path.includes('reportes.html')) {
        cargarDatosReporteGeneral();
        cargarEmpresasParaSelect();
    }
    
    configurarNavegacion();
});

// Exponer funciones globalmente
window.cargarDatosReporteGeneral = cargarDatosReporteGeneral;
window.cargarEmpresasParaSelect = cargarEmpresasParaSelect;
window.mostrarNotificacion = mostrarNotificacion;
window.cargarDatosDashboard = cargarDatosDashboard;
window.cargarClientesDesdeBD = cargarClientesDesdeBD;
window.cargarTecnicosDesdeBD = cargarTecnicosDesdeBD;
window.cargarIncidencias = cargarIncidencias;
window.cargarSelectsTicket = cargarSelectsTicket;
window.cargarTicketsInternos = cargarTicketsInternos;
window.cargarReportesExtra = cargarReportesExtra;