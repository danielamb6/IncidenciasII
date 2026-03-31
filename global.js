// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================
const API_URL = "http://localhost:5000/api";

// ==========================================
// FUNCIONES COMUNES
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

function getHeaders() {
    const sesion = JSON.parse(localStorage.getItem('sesion') || '{}');
    return {
        'Content-Type': 'application/json',
        'X-User-Rol': sesion.rol || '',
        'X-User-Empresa': sesion.id_empresa || ''
    };
}

// ==========================================
// FUNCIONES PARA MANEJO DE SESIÓN
// ==========================================
function getCurrentUser() {
    const sesionStr = localStorage.getItem('sesion');
    if (!sesionStr) return null;
    try {
        return JSON.parse(sesionStr);
    } catch (e) {
        console.error('Error al parsear sesión:', e);
        return null;
    }
}

// Obtener ID de empresa como número (o null)
function getCurrentUserEmpresaId() {
    const usuario = getCurrentUser();
    if (!usuario) return null;
    // Intenta con diferentes nombres de propiedad
    const id = usuario.id_empresa || usuario.empresa_id || null;
    console.log('🔍 ID de empresa desde sesión (crudo):', id);
    return id ? Number(id) : null;
}

// Función para filtrar incidencias por empresa del usuario
function filtrarIncidenciasPorEmpresa(incidencias) {
    const empresaId = getCurrentUserEmpresaId();
    const usuario = getCurrentUser();
    
    // Mostrar información de depuración
    console.log('👤 Usuario actual:', usuario);
    console.log('🏢 ID de empresa del usuario (numérico):', empresaId);
    
    // Si no hay empresa o el usuario es super_admin, retornar todas
    if (!empresaId) {
        console.log('⚠️ El usuario no tiene empresa asignada, mostrando TODAS las incidencias.');
        return incidencias;
    }
    
    if (usuario && usuario.rol === 'super_admin') {
        console.log('👑 Usuario super_admin, mostrando TODAS las incidencias.');
        return incidencias;
    }
    
    console.log(`🔍 Filtrando incidencias por empresa ID: ${empresaId}`);
    
    // Mostrar las primeras incidencias para ver qué campos tienen
    if (incidencias.length > 0) {
        console.log('📋 Muestra de la primera incidencia:', incidencias[0]);
        // Ver qué nombres de campo existen
        const campos = Object.keys(incidencias[0]);
        console.log('📌 Campos disponibles en incidencias:', campos);
    }
    
    // Intentar con diferentes posibles nombres de campo
    const filtradas = incidencias.filter(inc => {
        // Probar varios nombres comunes
        const idEmpresa = inc.empresa_id ?? inc.id_empresa ?? null;
        if (idEmpresa === null) {
            console.warn('⚠️ Incidencia sin campo de empresa:', inc);
            return false; // Excluir las que no tienen empresa
        }
        const coincide = Number(idEmpresa) === empresaId;
        if (coincide) {
            console.log('✅ Coincide:', inc.empresa_nombre, 'ID:', idEmpresa);
        }
        return coincide;
    });
    
    console.log(`✅ Incidencias después de filtrar: ${filtradas.length}`);
    return filtradas;
}
function filtrarReportesPorEmpresa(data) {
    const empresaId = getCurrentUserEmpresaId();
    const usuario = getCurrentUser();

    console.log('👤 Usuario actual en reportes:', usuario);
    console.log('🏢 ID de empresa del usuario:', empresaId);

    if (!empresaId || usuario.rol === 'super_admin') {
        console.log('🔓 Mostrando todos los reportes (sin filtro)');
        return data;
    }

    console.log(`🔍 Filtrando reportes por empresa ID: ${empresaId}`);
    const nombreEmpresa = obtenerNombreEmpresaUsuario();
    if (!nombreEmpresa) {
        console.warn('⚠️ No se pudo obtener el nombre de la empresa, no se aplicará filtro adicional');
        return data;
    }

    // Crear copia profunda
    const dataFiltrada = JSON.parse(JSON.stringify(data));

    // Filtrar tickets por empresa en la gráfica
    if (dataFiltrada.graficas && dataFiltrada.graficas.tickets_por_empresa) {
        dataFiltrada.graficas.tickets_por_empresa = dataFiltrada.graficas.tickets_por_empresa.filter(
            item => item.empresa === nombreEmpresa
        );
    }

    // Filtrar tablas
    const filtrarLista = (lista) => {
        if (!lista) return lista;
        return lista.filter(item => item.empresa === nombreEmpresa);
    };

    if (dataFiltrada.tablas) {
        dataFiltrada.tablas.ultimos_externos = filtrarLista(dataFiltrada.tablas.ultimos_externos);
        dataFiltrada.tablas.ultimos_internos = filtrarLista(dataFiltrada.tablas.ultimos_internos);
        // Si hay más tablas con campo empresa, agregar aquí
    }

    // Los análisis (top fallas, etc.) ya deberían venir filtrados, no los tocamos

    console.log('✅ Reportes filtrados por empresa.');
    return dataFiltrada;
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

function mostrarInfoUsuario() {
    const usuario = getCurrentUser();
    if (usuario) {
        const userNameElement = document.getElementById('display-user-name');
        const userRoleElement = document.getElementById('display-user-role');
        if (userNameElement) userNameElement.textContent = usuario.nombre || 'Usuario';
        if (userRoleElement) userRoleElement.textContent = (usuario.rol || 'Admin').toUpperCase();
    }
}

function filtrarMenuPorRol() {
    const usuario = getCurrentUser();
    if (!usuario) return;
    const rol = usuario.rol;

    // Definición de permisos por rol
    const permisos = {
        'super_admin': [
            'menu-dashboard', 'menu-reportes', 'menu-crear-ticket',
            'menu-registro-usuarios', 'menu-incidencias',
            'menu-clientes', 'menu-tecnicos', 'menu-catalogos'
        ],
        'emp_admin': [
            'menu-dashboard', 'menu-reportes', 'menu-incidencias'
        ],
        'supervisor': [
            'menu-dashboard', 'menu-reportes', 'menu-crear-ticket',
            'menu-registro-usuarios', 'menu-incidencias',
            'menu-clientes', 'menu-tecnicos', 'menu-catalogos'
        ]
    };

    const itemsPermitidos = permisos[rol] || permisos['super_admin'];

    document.querySelectorAll('.menu-item').forEach(item => {
        item.style.display = 'none';
    });
    itemsPermitidos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'block';
    });
}

function logout() {
    localStorage.removeItem('sesion');
    window.location.href = 'login.html';
}

// Inicialización común
document.addEventListener('DOMContentLoaded', function() {
    mostrarInfoUsuario();
    filtrarMenuPorRol();
    configurarNavegacion();

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', logout);
    }
});