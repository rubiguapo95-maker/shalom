// ─── FIREBASE CONFIG ─────────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyBgiKq2BxCybKIA3VISLhaQ1hF42IjFPE0",
    authDomain: "shalom-79293.firebaseapp.com",
    databaseURL: "https://shalom-79293-default-rtdb.firebaseio.com",
    projectId: "shalom-79293",
    storageBucket: "shalom-79293.firebasestorage.app",
    messagingSenderId: "482773951596",
    appId: "1:482773951596:web:5359892f5ca109d658e449"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ─── SINCRONIZACIÓN FIREBASE ─────────────────────────────────
// Estrategia híbrida: localStorage como fuente principal,
// Firebase sincroniza en tiempo real entre dispositivos.

const CLAVES = {
    pedidos:     "pedidosSHALOM",
    garantias:   "garantiasSHALOM",
    gastos:      "gastosSHALOM",
    movimientos: "movimientosCajaSHALOM",
    clientes:    "clientesSHALOM"
};

// Escuchar cambios en Firebase y actualizar localStorage
function iniciarSincronizacion(){
    // Solo escuchar cambios en pedidos y garantias, no descargar todo al inicio
    // Usar once() en lugar de on() para no mantener conexión permanente que frena la app
    // La sincronización sube datos (localStorage → Firebase) pero no baja masivamente
    console.log("Sincronización Firebase lista");
}

// Función para bajar datos de Firebase al localStorage (usar manualmente si se necesita)
function bajarDesdeFIrebase(){
    db.ref("pedidos").once("value").then(function(snap){
        const data = snap.val();
        if(data){
            const arr = Object.values(data).filter(function(x){ return x !== null; });
            window.localStorage.setItem(CLAVES.pedidos, JSON.stringify(arr));
            mostrarResumenDia();
            alert("✅ " + arr.length + " pedidos sincronizados desde la nube.");
        }
    });
}

// Subir datos locales a Firebase
function sincronizarAFirebase(ref, datos){
    if(!datos || datos.length === 0){
        db.ref(ref).remove().catch(function(e){ console.log("Firebase remove error:", e); });
        return;
    }
    const obj = {};
    datos.forEach(function(item, i){ 
        if(item !== null && item !== undefined){
            obj["item" + i] = item; 
        }
    });
    db.ref(ref).set(obj).catch(function(e){ console.log("Firebase sync error:", e); });
}

// Sobreescribir localStorage.setItem para sincronizar automáticamente
const _lsSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = function(key, value){
    _lsSetItem(key, value);
    const refMap = {
        [CLAVES.pedidos]:     "pedidos",
        [CLAVES.garantias]:   "garantias",
        [CLAVES.gastos]:      "gastos",
        [CLAVES.movimientos]: "movimientos",
        [CLAVES.clientes]:    "clientes"
    };
    if(refMap[key]){
        try {
            const datos = JSON.parse(value);
            const arr = Array.isArray(datos) ? datos : [datos];
            // Filtrar nulls
            const limpio = arr.filter(function(x){ return x !== null && x !== undefined; });
            sincronizarAFirebase(refMap[key], limpio);
        } catch(e){ console.log("Sync parse error:", e); }
    }
};

// Iniciar sincronización al cargar
iniciarSincronizacion();



let cantidadPrendas = 0;
let totalPedido = 0;
let mesActual = new Date().getMonth();
let anioActual = new Date().getFullYear();
let pantallaAnteriorDetalle = "buscar";
let modoEdicion = false;
let bolsaEditando = null;
let bolsaGarantiaSeleccionada = null;
let pantallaAnteriorGarantia = "menu";

// ─── REFERENCIAS ─────────────────────────────────────────────
const botonNuevo            = document.getElementById("nuevoPedido");
const menu                  = document.getElementById("menuPrincipal");
const formulario            = document.getElementById("formularioPedido");
const listaPrendas          = document.getElementById("listaPrendas");
const botonAgregar          = document.getElementById("agregarPrenda");
const botonVolver           = document.getElementById("volverMenu");
const botonGuardar          = document.getElementById("guardarPedido");
const fechaEntradaInput     = document.getElementById("fechaEntrega");
const horaEntradaInput      = document.getElementById("horaEntrega");
const toggleUrgente         = document.getElementById("esUrgente");
const panelUrgente          = document.getElementById("panelUrgente");
const urgenteInfo           = document.getElementById("urgenteInfo");
const urgenteResumen        = document.getElementById("urgenteResumen");
const precioPorPrendaInput  = document.getElementById("precioPorPrenda");
const totalConSobrecargo    = document.getElementById("totalConSobrecargo");
const abonoInput            = document.getElementById("abonoInicial");
const resumenAbono          = document.getElementById("resumenAbono");
const botonIrHoy            = document.getElementById("irHoy");
const pantallaHoy           = document.getElementById("pantallaHoy");
const botonVolverHoy        = document.getElementById("volverDesdeHoy");
const listaHoy              = document.getElementById("listaHoy");
const botonIrBuscar         = document.getElementById("irBuscar");
const pantallaBuscar        = document.getElementById("pantallaBuscar");
const campoBusqueda         = document.getElementById("campoBusqueda");
const listaResultados       = document.getElementById("listaResultados");
const botonVolverBuscar     = document.getElementById("volverDesdeBuscar");
const pantallaDetalle       = document.getElementById("pantallaDetalle");
const contenidoDetalle      = document.getElementById("contenidoDetalle");
const botonVolverDetalle    = document.getElementById("volverDesdeDetalle");
const botonIrCalendario     = document.getElementById("irCalendario");
const pantallaCalendario    = document.getElementById("pantallaCalendario");
const botonVolverCalendario = document.getElementById("volverDesdeCalendario");
const gridCalendario        = document.getElementById("gridCalendario");
const tituloMes             = document.getElementById("tituloMes");
const botonMesPrevio        = document.getElementById("mesPrevio");
const botonMesSiguiente     = document.getElementById("mesSiguiente");
const pedidosDia            = document.getElementById("pedidosDia");
const tituloDia             = document.getElementById("tituloDia");
const listaPedidosDia       = document.getElementById("listaPedidosDia");
const botonExcel            = document.getElementById("exportarExcel");
const botonSyncNube         = document.getElementById("sincronizarDesdeNube");

// Botón sincronizar desde nube
botonSyncNube.addEventListener("click", function(){
    if(!confirm("¿Deseas bajar todos los pedidos desde la nube?\n\nEsto reemplazará los datos locales de este dispositivo.")) return;
    botonSyncNube.textContent = "⏳ Sincronizando...";
    botonSyncNube.disabled = true;
    db.ref("pedidos").once("value").then(function(snap){
        const data = snap.val();
        if(data){
            const arr = Object.values(data).filter(function(x){ return x !== null; });
            window.localStorage.setItem(CLAVES.pedidos, JSON.stringify(arr));
            // Reconstruir lista de clientes desde los pedidos
            reconstruirClientes(arr);
            mostrarResumenDia();
            botonSyncNube.textContent = "☁️ Sincronizar desde la nube";
            botonSyncNube.disabled = false;
            alert("✅ " + arr.length + " pedidos sincronizados correctamente.");
        } else {
            alert("No hay datos en la nube.");
            botonSyncNube.textContent = "☁️ Sincronizar desde la nube";
            botonSyncNube.disabled = false;
        }
    }).catch(function(e){
        alert("Error al sincronizar: " + e.message);
        botonSyncNube.textContent = "☁️ Sincronizar desde la nube";
        botonSyncNube.disabled = false;
    });
});
const resumenDiaDiv         = document.getElementById("resumenDia");
const importarBtn           = document.getElementById("importarExcelBtn");
const archivoExcel          = document.getElementById("archivoExcel");
const botonIrGarantia       = document.getElementById("irGarantia");
const pantallaGarantia      = document.getElementById("pantallaGarantia");
const botonVolverGarantia   = document.getElementById("volverDesdeGarantia");
const busquedaGarantia      = document.getElementById("busquedaGarantia");
const resultadosGarantia    = document.getElementById("resultadosGarantia");
const garantiaPaso1         = document.getElementById("garantiaPaso1");
const garantiaPaso2         = document.getElementById("garantiaPaso2");
const garantiaBolsaInfo     = document.getElementById("garantiaBolsaInfo");
const garantiaPrendaSelect  = document.getElementById("garantiaPrendaSelect");
const garantiaDescripcion   = document.getElementById("garantiaDescripcion");
const garantiaFecha         = document.getElementById("garantiaFecha");
const garantiaHora          = document.getElementById("garantiaHora");
const guardarGarantia       = document.getElementById("guardarGarantia");
const volverPaso1           = document.getElementById("volverPaso1");
const pantallaDetalleGarantia   = document.getElementById("pantallaDetalleGarantia");
const contenidoDetalleGarantia  = document.getElementById("contenidoDetalleGarantia");
const botonVolverDetalleGarantia = document.getElementById("volverDesdeDetalleGarantia");

// ─── INICIO ──────────────────────────────────────────────────
mostrarResumenDia();

// ─── NAVEGACIÓN PRINCIPAL ────────────────────────────────────
botonNuevo.addEventListener("click", function(){
    modoEdicion = false; bolsaEditando = null;
    document.getElementById("tituloFormulario").textContent = "Nuevo Pedido";
    botonGuardar.textContent = "💾 Guardar Pedido";
    const pedidos = obtenerPedidos();
    document.getElementById("numeroBolsa").textContent = "Bolsa #" + (pedidos.length + 1);
    menu.classList.add("oculto");
    formulario.classList.remove("oculto");
});

botonVolver.addEventListener("click", function(){
    if(cantidadPrendas > 0){ if(!confirm("¿Deseas salir? Los datos no guardados se perderán.")) return; }
    limpiarFormulario();
    formulario.classList.add("oculto");
    menu.classList.remove("oculto");
    mostrarResumenDia();
});

botonIrHoy.addEventListener("click", function(){
    menu.classList.add("oculto");
    renderizarHoy();
    pantallaHoy.classList.remove("oculto");
});

botonVolverHoy.addEventListener("click", function(){
    pantallaHoy.classList.add("oculto");
    menu.classList.remove("oculto");
    mostrarResumenDia();
});

botonIrBuscar.addEventListener("click", function(){
    menu.classList.add("oculto");
    campoBusqueda.value = "";
    mostrarResultados(obtenerPedidos());
    pantallaBuscar.classList.remove("oculto");
});

botonVolverBuscar.addEventListener("click", function(){
    pantallaBuscar.classList.add("oculto");
    menu.classList.remove("oculto");
    mostrarResumenDia();
});

botonVolverDetalle.addEventListener("click", function(){
    pantallaDetalle.classList.add("oculto");
    if(pantallaAnteriorDetalle === "calendario"){ pantallaCalendario.classList.remove("oculto"); }
    else { pantallaBuscar.classList.remove("oculto"); }
});

botonIrCalendario.addEventListener("click", function(){
    menu.classList.add("oculto");
    pedidosDia.classList.add("oculto");
    renderizarCalendario(mesActual, anioActual);
    pantallaCalendario.classList.remove("oculto");
});

botonVolverCalendario.addEventListener("click", function(){
    pantallaCalendario.classList.add("oculto");
    menu.classList.remove("oculto");
    mostrarResumenDia();
});

botonMesPrevio.addEventListener("click", function(){
    mesActual--; if(mesActual < 0){ mesActual=11; anioActual--; }
    pedidosDia.classList.add("oculto");
    renderizarCalendario(mesActual, anioActual);
});

botonMesSiguiente.addEventListener("click", function(){
    mesActual++; if(mesActual > 11){ mesActual=0; anioActual++; }
    pedidosDia.classList.add("oculto");
    renderizarCalendario(mesActual, anioActual);
});

// ─── GARANTÍA — NAVEGACIÓN ───────────────────────────────────
botonIrGarantia.addEventListener("click", function(){
    menu.classList.add("oculto");
    reiniciarGarantia();
    pantallaGarantia.classList.remove("oculto");
    pantallaAnteriorGarantia = "menu";
});

botonVolverGarantia.addEventListener("click", function(){
    pantallaGarantia.classList.add("oculto");
    menu.classList.remove("oculto");
    mostrarResumenDia();
});

volverPaso1.addEventListener("click", function(){
    garantiaPaso2.classList.add("oculto");
    garantiaPaso1.classList.remove("oculto");
    bolsaGarantiaSeleccionada = null;
    busquedaGarantia.value = "";
    resultadosGarantia.innerHTML = "";
});

botonVolverDetalleGarantia.addEventListener("click", function(){
    pantallaDetalleGarantia.classList.add("oculto");
    if(pantallaAnteriorGarantia === "calendario"){
        pantallaCalendario.classList.remove("oculto");
    } else if(pantallaAnteriorGarantia === "buscar"){
        pantallaBuscar.classList.remove("oculto");
    } else {
        menu.classList.remove("oculto");
        mostrarResumenDia();
    }
});

function reiniciarGarantia(){
    bolsaGarantiaSeleccionada = null;
    busquedaGarantia.value = "";
    resultadosGarantia.innerHTML = "";
    garantiaDescripcion.value = "";
    garantiaFecha.value = "";
    garantiaHora.value = "";
    garantiaPaso1.classList.remove("oculto");
    garantiaPaso2.classList.add("oculto");
    document.getElementById("mensajeGarantia").classList.add("oculto");
}

// ─── GARANTÍA — BUSCAR BOLSA ─────────────────────────────────
busquedaGarantia.addEventListener("input", function(){
    const texto = busquedaGarantia.value.trim().toLowerCase();
    if(!texto){ resultadosGarantia.innerHTML = ""; return; }
    const pedidos = obtenerPedidos();
    const filtrados = pedidos.filter(function(p){
        return p.nombre.toLowerCase().includes(texto) || String(p.bolsa).includes(texto);
    });
    resultadosGarantia.innerHTML = "";
    if(filtrados.length === 0){
        resultadosGarantia.innerHTML = "<p class='sin-resultados'>No se encontraron pedidos.</p>";
        return;
    }
    filtrados.forEach(function(pedido){
        const tarjeta = document.createElement("div");
        tarjeta.classList.add("tarjeta-pedido");
        tarjeta.innerHTML = `
            <div class="tarjeta-encabezado">
                <strong>Bolsa #${pedido.bolsa}</strong>
                <span class="tarjeta-fecha">${formatearFecha(pedido.fecha)}</span>
            </div>
            <div class="tarjeta-nombre">👤 ${pedido.nombre}</div>
            <div class="tarjeta-info">📦 ${pedido.prendas.length} prenda(s)</div>
        `;
        tarjeta.addEventListener("click", function(){
            seleccionarBolsaGarantia(pedido);
        });
        resultadosGarantia.appendChild(tarjeta);
    });
});

function seleccionarBolsaGarantia(pedido){
    bolsaGarantiaSeleccionada = pedido;
    garantiaBolsaInfo.innerHTML = `
        <div class="garantia-bolsa-card">
            <strong>Bolsa #${pedido.bolsa}</strong> — ${pedido.nombre}<br>
            <small>Entregada: ${formatearFecha(pedido.fecha)} &nbsp;|&nbsp; ${pedido.prendas.length} prenda(s)</small>
        </div>
    `;
    garantiaPrendaSelect.innerHTML = "";
    pedido.prendas.forEach(function(prenda, i){
        const op = document.createElement("option");
        op.value = i;
        op.textContent = "Prenda #" + (i+1) + " — " + prenda.tipo;
        garantiaPrendaSelect.appendChild(op);
    });
    garantiaPaso1.classList.add("oculto");
    garantiaPaso2.classList.remove("oculto");
}

// ─── GARANTÍA — GUARDAR ──────────────────────────────────────
guardarGarantia.addEventListener("click", function(){
    if(!bolsaGarantiaSeleccionada){ alert("Selecciona una bolsa primero."); return; }
    const descripcion = garantiaDescripcion.value.trim();
    const fecha       = garantiaFecha.value;
    const hora        = garantiaHora.value;
    const prendaIdx   = Number(garantiaPrendaSelect.value);

    if(!descripcion){ alert("Por favor describe el problema de la prenda."); return; }
    if(!fecha){ alert("Por favor selecciona la fecha de entrega."); return; }

    const garantias = obtenerGarantias();
    const prenda    = bolsaGarantiaSeleccionada.prendas[prendaIdx];

    const garantia = {
        id:            Date.now(),
        bolsaOrigen:   bolsaGarantiaSeleccionada.bolsa,
        nombreCliente: bolsaGarantiaSeleccionada.nombre,
        telefono:      bolsaGarantiaSeleccionada.telefono || "",
        prendaTipo:    prenda.tipo,
        prendaIdx:     prendaIdx,
        descripcion:   descripcion,
        fecha:         fecha,
        hora:          hora || null,
        estado:        "Pendiente",
        fechaCreacion: new Date().toLocaleDateString("es-CO"),
        tipo:          "garantia"
    };

    garantias.push(garantia);
    localStorage.setItem("garantiasSHALOM", JSON.stringify(garantias));

    const msg = document.getElementById("mensajeGarantia");
    msg.textContent = "🛡 Garantía registrada para " + garantia.nombreCliente + " — entrega " + formatearFecha(fecha);
    msg.classList.remove("oculto");

    setTimeout(function(){
        msg.classList.add("oculto");
        reiniciarGarantia();
        pantallaGarantia.classList.add("oculto");
        menu.classList.remove("oculto");
        mostrarResumenDia();
    }, 1500);
});

// ─── DETALLE GARANTÍA ────────────────────────────────────────
function mostrarDetalleGarantia(garantia){
    pantallaDetalle.classList.add("oculto");
    pantallaBuscar.classList.add("oculto");
    pantallaCalendario.classList.add("oculto");
    pantallaDetalleGarantia.classList.remove("oculto");

    const estadoClase = garantia.estado === "Terminado" ? "estado-terminado" : "estado-pendiente";
    const textoBoton  = garantia.estado === "Terminado" ? "↩ Marcar como Pendiente" : "✅ Marcar como Terminado";
    const claseBoton  = garantia.estado === "Terminado" ? "btn-pendiente" : "btn-terminado";

    contenidoDetalleGarantia.innerHTML = `
        <div class="detalle-header">
            <h2>🛡 Garantía</h2>
            <span class="badge-garantia">Bolsa #${garantia.bolsaOrigen}</span>
            <span class="estado-badge ${estadoClase}">${garantia.estado}</span>
        </div>
        <div class="detalle-bloque">
            <p><span class="detalle-label">👤 Cliente:</span> ${garantia.nombreCliente}</p>
            <p><span class="detalle-label">📞 Teléfono:</span> ${garantia.telefono || "—"}</p>
            <p><span class="detalle-label">👗 Prenda:</span> ${garantia.prendaTipo}</p>
            <p><span class="detalle-label">🔧 Problema:</span> ${garantia.descripcion}</p>
            <p><span class="detalle-label">📅 Fecha entrega:</span> ${formatearFecha(garantia.fecha)}${garantia.hora ? " a las <strong>" + formatearHora(garantia.hora) + "</strong>" : ""}</p>
            <p><span class="detalle-label">🗓 Registrada:</span> ${garantia.fechaCreacion}</p>
        </div>
        <div class="garantia-valor-badge">🛡 Garantía — Sin costo para el cliente ($0)</div>
        <div class="detalle-acciones">
            <button id="btnCambiarEstadoGarantia" type="button" class="${claseBoton}">${textoBoton}</button>
            <button id="btnEliminarGarantia" type="button" class="btn-eliminar">🗑 Eliminar Garantía</button>
        </div>
    `;

    document.getElementById("btnCambiarEstadoGarantia").addEventListener("click", function(){
        const garantias = obtenerGarantias();
        const idx = garantias.findIndex(function(g){ return g.id === garantia.id; });
        if(idx === -1) return;
        garantias[idx].estado = garantias[idx].estado === "Terminado" ? "Pendiente" : "Terminado";
        localStorage.setItem("garantiasSHALOM", JSON.stringify(garantias));
        mostrarDetalleGarantia(garantias[idx]);
    });

    document.getElementById("btnEliminarGarantia").addEventListener("click", function(){
        if(!confirm("¿Segura que deseas eliminar esta garantía?")) return;
        const garantias = obtenerGarantias();
        const nuevas = garantias.filter(function(g){ return g.id !== garantia.id; });
        localStorage.setItem("garantiasSHALOM", JSON.stringify(nuevas));
        pantallaDetalleGarantia.classList.add("oculto");
        if(pantallaAnteriorGarantia === "calendario"){
            pedidosDia.classList.add("oculto");
            renderizarCalendario(mesActual, anioActual);
            pantallaCalendario.classList.remove("oculto");
        } else if(pantallaAnteriorGarantia === "buscar"){
            mostrarResultados(obtenerPedidos());
            pantallaBuscar.classList.remove("oculto");
        } else {
            menu.classList.remove("oculto");
            mostrarResumenDia();
        }
    });
}

// ─── RESUMEN DEL DÍA ─────────────────────────────────────────
function mostrarResumenDia(){
    const hoyStr  = fechaAString(new Date());
    const pedidos = obtenerPedidos();
    const garantias = obtenerGarantias();

    const pedidosHoy    = pedidos.filter(function(p){ return p.fecha===hoyStr && p.estado==="Pendiente"; });
    const garantiasHoy  = garantias.filter(function(g){ return g.fecha===hoyStr && g.estado==="Pendiente"; });
    const totalPrendasHoy = pedidosHoy.reduce(function(acc,p){ return acc+p.prendas.length; },0);
    const urgentesHoy   = pedidosHoy.filter(function(p){ return p.urgente; }).length;
    const vencidos      = pedidos.filter(function(p){ return p.fecha<hoyStr && p.estado==="Pendiente"; }).length;
    const garantiasVencidas = garantias.filter(function(g){ return g.fecha<hoyStr && g.estado==="Pendiente"; }).length;

    if(pedidosHoy.length===0 && garantiasHoy.length===0 && vencidos===0 && garantiasVencidas===0){
        resumenDiaDiv.innerHTML = `<div class="resumen-ok">✅ Sin entregas pendientes hoy</div>`;
    } else {
        let html = `<div class="resumen-titulo">📅 Hoy — ${formatearFecha(hoyStr)}</div>`;
        if(pedidosHoy.length > 0){
            html += `<div class="resumen-fila"><span>📦 Bolsas para entregar hoy:</span><strong>${pedidosHoy.length}</strong></div>`;
            html += `<div class="resumen-fila"><span>👗 Total de prendas hoy:</span><strong>${totalPrendasHoy}</strong></div>`;
            if(urgentesHoy>0) html += `<div class="resumen-fila resumen-urgente"><span>⚡ Pedidos urgentes hoy:</span><strong>${urgentesHoy}</strong></div>`;
        }
        if(garantiasHoy.length > 0){
            html += `<div class="resumen-fila resumen-garantia-fila"><span>🛡 Garantías para entregar hoy:</span><strong>${garantiasHoy.length}</strong></div>`;
        }
        if(vencidos > 0) html += `<div class="resumen-fila resumen-vencido"><span>⚠️ Pedidos vencidos sin entregar:</span><strong>${vencidos}</strong></div>`;
        if(garantiasVencidas > 0) html += `<div class="resumen-fila resumen-vencido"><span>⚠️ Garantías vencidas sin entregar:</span><strong>${garantiasVencidas}</strong></div>`;

        if(pedidosHoy.length > 0 || garantiasHoy.length > 0){
            html += `<div class="resumen-clientes">`;
            pedidosHoy.forEach(function(p){
                html += `<div class="resumen-cliente-item"><span>${p.urgente?"⚡":"👤"} ${p.nombre}</span><span>${p.prendas.length} prenda(s)${p.hora?" · "+formatearHora(p.hora):""}</span></div>`;
            });
            garantiasHoy.forEach(function(g){
                html += `<div class="resumen-cliente-item resumen-garantia-item"><span>🛡 ${g.nombreCliente}</span><span>${g.prendaTipo}${g.hora?" · "+formatearHora(g.hora):""}</span></div>`;
            });
            html += `</div>`;
        }
        resumenDiaDiv.innerHTML = `<div class="resumen-card">${html}</div>`;
    }
    resumenDiaDiv.classList.remove("oculto");
}

// ─── EXPORTAR EXCEL ──────────────────────────────────────────
botonExcel.addEventListener("click", function(){
    const pedidos = obtenerPedidos();
    const garantias = obtenerGarantias();
    if(pedidos.length===0 && garantias.length===0){ alert("No hay datos para exportar."); return; }

    const filasPedidos = pedidos.map(function(p){
        return {
            "Bolsa #":p.bolsa,"Cliente":p.nombre,"Teléfono":p.telefono||"",
            "Fecha Entrega":formatearFecha(p.fecha),"Hora":p.hora?formatearHora(p.hora):"",
            "# Prendas":p.prendas.length,"Urgente":p.urgente?"Sí":"No",
            "Total Prendas":p.total,"Sobrecargo":p.sobrecargo||0,
            "Total Final":p.totalConSobrecargo||p.total,"Abono":p.abono||0,
            "Saldo Pendiente":p.saldo!==undefined?p.saldo:(p.totalConSobrecargo||p.total),
            "Estado":p.estado,"Fecha Creación":p.fechaCreacion
        };
    });

    const filasPrendas = [];
    pedidos.forEach(function(p){
        p.prendas.forEach(function(prenda,i){
            filasPrendas.push({"Bolsa #":p.bolsa,"Cliente":p.nombre,"Fecha Entrega":formatearFecha(p.fecha),"Prenda #":i+1,"Tipo":prenda.tipo,"Medidas":prenda.medidas||"","Descripción":prenda.descripcion||"","Precio":prenda.precio});
        });
    });

    const filasGarantias = garantias.map(function(g){
        return {
            "ID":g.id,"Bolsa Origen":g.bolsaOrigen,"Cliente":g.nombreCliente,
            "Teléfono":g.telefono||"","Prenda":g.prendaTipo,"Problema":g.descripcion,
            "Fecha Entrega":formatearFecha(g.fecha),"Hora":g.hora?formatearHora(g.hora):"",
            "Estado":g.estado,"Fecha Creación":g.fechaCreacion
        };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasPedidos), "Pedidos");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasPrendas), "Detalle Prendas");
    if(filasGarantias.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasGarantias), "Garantías");

    const hoy = new Date();
    XLSX.writeFile(wb, "SHALOM_"+hoy.getFullYear()+"-"+String(hoy.getMonth()+1).padStart(2,"0")+"-"+String(hoy.getDate()).padStart(2,"0")+".xlsx");
});

// ─── IMPORTAR EXCEL ──────────────────────────────────────────
importarBtn.addEventListener("click", function(){ archivoExcel.click(); });

archivoExcel.addEventListener("change", function(e){
    const archivo = e.target.files[0];
    if(!archivo) return;
    if(!confirm("⚠️ Importar un Excel REEMPLAZARÁ todos los pedidos actuales.\n\n¿Deseas continuar?")){ archivoExcel.value=""; return; }
    const reader = new FileReader();
    reader.onload = function(ev){
        try {
            const data = new Uint8Array(ev.target.result);
            const wb   = XLSX.read(data, {type:"array"});
            const ws   = wb.Sheets["Pedidos"];
            if(!ws){ alert("No se encontró la hoja 'Pedidos'."); return; }
            const filas = XLSX.utils.sheet_to_json(ws);
            const wsPrendas = wb.Sheets["Detalle Prendas"];
            const filasPrendas = wsPrendas ? XLSX.utils.sheet_to_json(wsPrendas) : [];
            const pedidosImportados = filas.map(function(fila){
                const bolsa = Number(fila["Bolsa #"])||0;
                const prendasDeBolsa = filasPrendas
                    .filter(function(p){ return Number(p["Bolsa #"])===bolsa; })
                    .map(function(p){ return {tipo:p["Tipo"]||"",medidas:p["Medidas"]||"",descripcion:p["Descripción"]||"",precio:Number(p["Precio"])||0}; });
                const totalFinal = Number(fila["Total Final"])||Number(fila["Total Prendas"])||0;
                const abono = Number(fila["Abono"])||0;
                return {
                    bolsa, nombre:fila["Cliente"]||"", telefono:fila["Teléfono"]||"",
                    fecha:parsearFechaExcel(fila["Fecha Entrega"]), hora:null,
                    prendas:prendasDeBolsa, total:Number(fila["Total Prendas"])||0,
                    urgente:fila["Urgente"]==="Sí", sobrecargo:Number(fila["Sobrecargo"])||0,
                    prendasAdelantadas:0, totalConSobrecargo:totalFinal,
                    abono, saldo:Math.max(0,totalFinal-abono),
                    estado:fila["Estado"]||"Pendiente", fechaCreacion:fila["Fecha Creación"]||""
                };
            });

            // Guardar en localStorage
            window.localStorage.setItem("pedidosSHALOM", JSON.stringify(pedidosImportados));

            // Importar garantías si existen
            const wsGarantias = wb.Sheets["Garantías"];
            if(wsGarantias){
                const filasG = XLSX.utils.sheet_to_json(wsGarantias);
                const garantiasImportadas = filasG.map(function(g){
                    return {id:Number(g["ID"])||Date.now(),bolsaOrigen:Number(g["Bolsa Origen"])||0,
                    nombreCliente:g["Cliente"]||"",telefono:g["Teléfono"]||"",
                    prendaTipo:g["Prenda"]||"",descripcion:g["Problema"]||"",
                    fecha:parsearFechaExcel(g["Fecha Entrega"]),hora:null,
                    estado:g["Estado"]||"Pendiente",fechaCreacion:g["Fecha Creación"]||"",tipo:"garantia"};
                });
                window.localStorage.setItem("garantiasSHALOM", JSON.stringify(garantiasImportadas));
            }

            archivoExcel.value="";
            mostrarResumenDia();
            alert("✅ "+pedidosImportados.length+" pedidos cargados en el dispositivo.\nSincronizando con la nube en lotes, por favor espera...");

            // Subir a Firebase en lotes de 15 para no saturar
            db.ref("pedidos").remove().then(function(){
                var i = 0;
                var tamLote = 15;
                function subirLote(){
                    if(i >= pedidosImportados.length){
                        alert("✅ ¡Listo! Los "+pedidosImportados.length+" pedidos ya están sincronizados en la nube.");
                        return;
                    }
                    var lote = pedidosImportados.slice(i, i+tamLote);
                    var obj = {};
                    lote.forEach(function(item, j){ obj["item"+(i+j)] = item; });
                    db.ref("pedidos").update(obj).then(function(){
                        i += tamLote;
                        setTimeout(subirLote, 500);
                    }).catch(function(err){
                        console.log("Error en lote, reintentando...", err);
                        setTimeout(subirLote, 1000);
                    });
                }
                subirLote();
            });

        } catch(err){ alert("Error al leer el archivo. Asegúrate que sea un Excel exportado desde SHALOM."); console.error(err); }
    };
    reader.readAsArrayBuffer(archivo);
});

// ─── TOGGLE URGENTE ──────────────────────────────────────────
toggleUrgente.addEventListener("change", function(){
    if(toggleUrgente.checked){ panelUrgente.classList.remove("oculto"); calcularSobrecargo(); }
    else { panelUrgente.classList.add("oculto"); totalConSobrecargo.classList.add("oculto"); }
});
fechaEntradaInput.addEventListener("change", function(){ if(toggleUrgente.checked) calcularSobrecargo(); actualizarResumenAbono(); });
precioPorPrendaInput.addEventListener("input", function(){ if(toggleUrgente.checked) calcularSobrecargo(); });

function calcularSobrecargo(){
    const fecha=fechaEntradaInput.value;
    if(!fecha){ urgenteInfo.textContent="Selecciona la fecha."; urgenteResumen.classList.add("oculto"); totalConSobrecargo.classList.add("oculto"); return; }
    const pedidos=obtenerPedidos(); let pp=0;
    pedidos.forEach(function(p){ if(p.fecha===fecha && p.estado==="Pendiente" && p.bolsa!==bolsaEditando) pp+=p.prendas.length; });
    const precioPrenda=Number(precioPorPrendaInput.value)||2000;
    const sobrecargo=pp*precioPrenda;
    urgenteInfo.textContent=pp===0?"No hay prendas pendientes ese día.":`Hay ${pp} prenda(s) pendiente(s) para ese día.`;
    document.getElementById("prendasPendientesDia").textContent=pp;
    document.getElementById("precioUnitarioMostrar").textContent="$"+precioPrenda.toLocaleString("es-CO");
    document.getElementById("sobrecargTotal").textContent="$"+sobrecargo.toLocaleString("es-CO");
    urgenteResumen.classList.remove("oculto");
    if(sobrecargo>0){ totalConSobrecargo.textContent="⚡ Total con sobrecargo: $"+(totalPedido+sobrecargo).toLocaleString("es-CO"); totalConSobrecargo.classList.remove("oculto"); }
    else totalConSobrecargo.classList.add("oculto");
    actualizarResumenAbono();
}

abonoInput.addEventListener("input", actualizarResumenAbono);
function actualizarResumenAbono(){
    const abono=Number(abonoInput.value)||0; let sobrecargo=0;
    if(toggleUrgente.checked){ const fecha=fechaEntradaInput.value; if(fecha){ const pedidos=obtenerPedidos(); let pp=0; pedidos.forEach(function(p){ if(p.fecha===fecha && p.estado==="Pendiente" && p.bolsa!==bolsaEditando) pp+=p.prendas.length; }); sobrecargo=pp*(Number(precioPorPrendaInput.value)||2000); } }
    const totalReal=totalPedido+sobrecargo; const saldo=totalReal-abono;
    if(abono>0){ document.getElementById("abonoTotal").textContent="$"+totalReal.toLocaleString("es-CO"); document.getElementById("abonoMonto").textContent="$"+abono.toLocaleString("es-CO"); document.getElementById("abonoSaldo").textContent="$"+Math.max(0,saldo).toLocaleString("es-CO"); resumenAbono.classList.remove("oculto"); }
    else resumenAbono.classList.add("oculto");
}

// ─── AGREGAR PRENDA ──────────────────────────────────────────
botonAgregar.addEventListener("click", function(){ agregarBloquePrenda(); });

function agregarBloquePrenda(datos){
    cantidadPrendas++;
    document.getElementById("contadorPrendas").textContent="Prendas registradas: "+cantidadPrendas;
    const bloque=document.createElement("div"); bloque.classList.add("prenda");
    bloque.innerHTML=`<div class="encabezadoPrenda"><h3>Prenda #${cantidadPrendas}</h3><button type="button" class="eliminarPrenda">🗑 Eliminar</button></div>
    <label>Tipo</label><select class="tipoPrenda"><option>Pantalón</option><option>Camisa</option><option>Vestido</option><option>Falda</option><option>Chaqueta</option><option>Blusa</option><option>Uniforme</option><option value="Otro">Otro</option></select>
    <div class="campoOtro" style="display:none;"><label>Especifique la prenda</label><input type="text" class="tipoPrendaOtro" placeholder="Ej: Toga, Cortina, Disfraz"></div>
    <label>Medidas</label><textarea class="medidasPrenda" placeholder="Ej: cintura 80 cm, largo 90 cm"></textarea>
    <label>Descripción</label><textarea class="descripcionPrenda" placeholder="¿Qué debe hacer la modista?"></textarea>
    <label>Precio</label><input type="number" class="precioPrenda" placeholder="Escriba el precio Ej: 15000" min="0" step="500" value="0">`;
    listaPrendas.appendChild(bloque);
    if(datos){
        const tipoSelect=bloque.querySelector(".tipoPrenda");
        const opcionExiste=Array.from(tipoSelect.options).some(function(o){ return o.value===datos.tipo||o.text===datos.tipo; });
        if(opcionExiste){ tipoSelect.value=datos.tipo; } else { tipoSelect.value="Otro"; bloque.querySelector(".campoOtro").style.display="block"; bloque.querySelector(".tipoPrendaOtro").value=datos.tipo; }
        bloque.querySelector(".medidasPrenda").value=datos.medidas||"";
        bloque.querySelector(".descripcionPrenda").value=datos.descripcion||"";
        const precioInput=bloque.querySelector(".precioPrenda");
        if(precioInput) precioInput.value=datos.precio||0;
    }
    bloque.querySelector(".eliminarPrenda").addEventListener("click", function(){ if(!confirm("¿Segura que deseas eliminar esta prenda?")) return; bloque.remove(); cantidadPrendas--; document.getElementById("contadorPrendas").textContent="Prendas registradas: "+cantidadPrendas; calcularTotal(); });
    bloque.querySelector(".precioPrenda").addEventListener("input", calcularTotal);
    const selectorTipo=bloque.querySelector(".tipoPrenda"); const campoOtro=bloque.querySelector(".campoOtro");
    selectorTipo.addEventListener("change", function(){ campoOtro.style.display=selectorTipo.value==="Otro"?"block":"none"; });
    calcularTotal();
}

function calcularTotal(){
    totalPedido=0; document.querySelectorAll(".precioPrenda").forEach(function(p){ totalPedido+=Number(p.value); });
    document.getElementById("totalPedido").textContent="Total: $"+totalPedido.toLocaleString("es-CO");
    if(toggleUrgente.checked) calcularSobrecargo(); actualizarResumenAbono();
}

// ─── GUARDAR / EDITAR PEDIDO ─────────────────────────────────
botonGuardar.addEventListener("click", function(){
    // Evitar doble click
    if(botonGuardar.disabled) return;
    botonGuardar.disabled = true;
    botonGuardar.textContent = "⏳ Guardando...";

    const nombre=document.getElementById("nombreCliente").value.trim();
    const telefono=document.getElementById("telefonoCliente").value.trim();
    const fecha=fechaEntradaInput.value; const hora=horaEntradaInput.value;
    const abono=Number(abonoInput.value)||0;
    if(!nombre){ alert("Por favor escribe el nombre del cliente."); botonGuardar.disabled=false; botonGuardar.textContent="💾 Guardar Pedido"; return; }
    if(!fecha){ alert("Por favor selecciona la fecha de entrega."); botonGuardar.disabled=false; botonGuardar.textContent="💾 Guardar Pedido"; return; }
    const prendasEnDOM = document.querySelectorAll(".prenda").length;
    if(prendasEnDOM===0){ alert("Agrega al menos una prenda antes de guardar."); botonGuardar.disabled=false; botonGuardar.textContent="💾 Guardar Pedido"; return; }
    if(abono > 0 && abono > totalPedido){ alert("⚠️ El abono ($" + abono.toLocaleString("es-CO") + ") no puede ser mayor al total del pedido ($" + totalPedido.toLocaleString("es-CO") + ")."); botonGuardar.disabled=false; botonGuardar.textContent="💾 Guardar Pedido"; return; }
    const prendasData=[];
    document.querySelectorAll(".prenda").forEach(function(bloque){
        const tipo=bloque.querySelector(".tipoPrenda").value;
        const tipoFinal=tipo==="Otro"?(bloque.querySelector(".tipoPrendaOtro").value||"Otro"):tipo;
        prendasData.push({tipo:tipoFinal,medidas:bloque.querySelector(".medidasPrenda").value,descripcion:bloque.querySelector(".descripcionPrenda").value,precio:Number(bloque.querySelector(".precioPrenda").value)});
    });
    let sobrecargo=0,prendasAdelantadas=0; const urgente=toggleUrgente.checked;
    if(urgente){ const pedidos=obtenerPedidos(); pedidos.forEach(function(p){ if(p.fecha===fecha && p.estado==="Pendiente" && p.bolsa!==bolsaEditando) prendasAdelantadas+=p.prendas.length; }); sobrecargo=prendasAdelantadas*(Number(precioPorPrendaInput.value)||2000); }
    const totalFinal=totalPedido+sobrecargo; const saldo=Math.max(0,totalFinal-abono);
    const pedidos=obtenerPedidos();
    const msg=document.getElementById("mensajeGuardado");

    if(modoEdicion){
        // SIEMPRE actualiza la bolsa original, nunca crea una nueva
        const idx=pedidos.findIndex(function(p){ return p.bolsa===bolsaEditando; });
        if(idx===-1){ alert("Error: no se encontró la bolsa a editar."); return; }
        pedidos[idx].nombre=nombre;
        pedidos[idx].telefono=telefono;
        pedidos[idx].fecha=fecha;
        pedidos[idx].hora=hora||null;
        pedidos[idx].prendas=prendasData;
        pedidos[idx].total=totalPedido;
        pedidos[idx].urgente=urgente;
        pedidos[idx].sobrecargo=sobrecargo;
        pedidos[idx].prendasAdelantadas=prendasAdelantadas;
        pedidos[idx].totalConSobrecargo=totalFinal;
        pedidos[idx].abono=abono;
        pedidos[idx].saldo=saldo;
        localStorage.setItem("pedidosSHALOM", JSON.stringify(pedidos));
        guardarCliente(nombre, telefono);
        msg.textContent="✏️ Bolsa #"+bolsaEditando+" actualizada — "+nombre+" ("+prendasData.length+" prenda(s))";
        msg.classList.remove("oculto");
        setTimeout(function(){
            msg.classList.add("oculto");
            botonGuardar.disabled=false;
            botonGuardar.textContent="💾 Guardar Pedido";
            limpiarFormulario();
            formulario.classList.add("oculto");
            menu.classList.remove("oculto");
            mostrarResumenDia();
        }, 1500);
    } else {
        const numeroBolsa=pedidos.length+1;
        const nuevoPedido={bolsa:numeroBolsa,nombre,telefono,fecha,hora:hora||null,prendas:prendasData,total:totalPedido,urgente,sobrecargo,prendasAdelantadas,totalConSobrecargo:totalFinal,abono,saldo,estado:"Pendiente",fechaCreacion:new Date().toLocaleDateString("es-CO")};
        pedidos.push(nuevoPedido);
        localStorage.setItem("pedidosSHALOM", JSON.stringify(pedidos));
        if(abono>0) registrarMovimientoCaja(nuevoPedido, abono, "Abono inicial");
        guardarCliente(nombre, telefono);
        msg.textContent="✅ Bolsa #"+numeroBolsa+" guardada — "+nombre+(urgente&&sobrecargo>0?" | ⚡ $"+sobrecargo.toLocaleString("es-CO"):"")+(abono>0?" | 💰 Abono: $"+abono.toLocaleString("es-CO"):"");
        msg.classList.remove("oculto");
    }
    setTimeout(function(){ document.getElementById("mensajeGuardado").classList.add("oculto"); botonGuardar.disabled=false; botonGuardar.textContent="💾 Guardar Pedido"; limpiarFormulario(); formulario.classList.add("oculto"); menu.classList.remove("oculto"); mostrarResumenDia(); },1500);
});

// ─── BUSCAR ──────────────────────────────────────────────────
campoBusqueda.addEventListener("input", function(){
    const texto=campoBusqueda.value.trim().toLowerCase(); const pedidos=obtenerPedidos();
    if(!texto){ mostrarResultados(pedidos); return; }
    mostrarResultados(pedidos.filter(function(p){ return p.nombre.toLowerCase().includes(texto)||String(p.bolsa).includes(texto); }));
});

function mostrarResultados(pedidos){
    listaResultados.innerHTML="";
    if(pedidos.length===0){ listaResultados.innerHTML="<p class='sin-resultados'>No se encontraron pedidos.</p>"; return; }
    pedidos.forEach(function(pedido){
        const tarjeta=document.createElement("div"); tarjeta.classList.add("tarjeta-pedido");
        const estadoClase=pedido.estado==="Terminado"?"estado-terminado":"estado-pendiente";
        const saldoHTML=pedido.saldo>0?`<span class="badge-saldo">💰 Saldo: $${pedido.saldo.toLocaleString("es-CO")}</span>`:pedido.abono>0?`<span class="badge-pagado">✅ Pagado`:"";
        tarjeta.innerHTML=`<div class="tarjeta-encabezado"><div><strong>Bolsa #${pedido.bolsa}</strong>${pedido.urgente?'<span class="badge-urgente">⚡ Urgente</span>':""}<span class="estado-badge ${estadoClase}">${pedido.estado}</span></div><span class="tarjeta-fecha">Entrega: ${formatearFecha(pedido.fecha)}${pedido.hora?" "+formatearHora(pedido.hora):""}</span></div><div class="tarjeta-nombre">👤 ${pedido.nombre}</div><div class="tarjeta-info">📦 ${pedido.prendas.length} prenda(s) &nbsp;|&nbsp; 💵 $${(pedido.totalConSobrecargo||pedido.total).toLocaleString("es-CO")} ${saldoHTML}</div>`;
        tarjeta.addEventListener("click", function(){ pantallaAnteriorDetalle="buscar"; mostrarDetalle(pedido); });
        listaResultados.appendChild(tarjeta);
    });
}

// ─── DETALLE PEDIDO ──────────────────────────────────────────
function mostrarDetalle(pedido){
    pantallaBuscar.classList.add("oculto"); pantallaCalendario.classList.add("oculto"); pantallaDetalle.classList.remove("oculto");
    const estadoClase=pedido.estado==="Terminado"?"estado-terminado":"estado-pendiente";
    const textoBoton=pedido.estado==="Terminado"?"↩ Marcar como Pendiente":"✅ Marcar como Terminado";
    const claseBoton=pedido.estado==="Terminado"?"btn-pendiente":"btn-terminado";
    let prendasHTML="";
    pedido.prendas.forEach(function(prenda,i){ prendasHTML+=`<div class="prenda-detalle"><strong>Prenda #${i+1} — ${prenda.tipo}</strong><p><span class="detalle-label">Medidas:</span> ${prenda.medidas||"—"}</p><p><span class="detalle-label">Descripción:</span> ${prenda.descripcion||"—"}</p><p><span class="detalle-label">Precio:</span> $${prenda.precio.toLocaleString("es-CO")}</p></div>`; });
    let urgenteHTML="";
    if(pedido.urgente && pedido.sobrecargo>0) urgenteHTML=`<div class="detalle-urgente"><p>⚡ <strong>Pedido Urgente</strong></p><p>Prendas adelantadas: <strong>${pedido.prendasAdelantadas}</strong></p><p>Sobrecargo: <strong>$${pedido.sobrecargo.toLocaleString("es-CO")}</strong></p></div>`;
    const totalFinal=pedido.totalConSobrecargo||pedido.total; const abonoActual=pedido.abono||0; const saldoActual=pedido.saldo!==undefined?pedido.saldo:totalFinal;
    const abonoHTML=`<div class="detalle-abono"><h3>💰 Pagos</h3><div class="abono-fila"><span>Total del pedido:</span><strong>$${totalFinal.toLocaleString("es-CO")}</strong></div><div class="abono-fila"><span>Abono recibido:</span><strong class="color-verde">$${abonoActual.toLocaleString("es-CO")}</strong></div><div class="abono-fila abono-saldo"><span>Saldo pendiente:</span><strong class="color-rojo">$${saldoActual.toLocaleString("es-CO")}</strong></div>${saldoActual>0?`<div class="abono-editar"><label>Registrar nuevo abono:</label><div class="urgente-precio-wrap"><span>$</span><input id="nuevoAbono" type="number" min="0" step="1000" placeholder="Monto" style="width:auto;flex:1;"></div><button id="btnRegistrarAbono" type="button" class="btn-abono">💰 Registrar Abono</button></div>`:'<p class="pagado-completo">✅ Pagado completamente</p>'}</div>`;
    contenidoDetalle.innerHTML=`<div class="detalle-header"><h2>Bolsa #${pedido.bolsa}</h2>${pedido.urgente?'<span class="badge-urgente">⚡ Urgente</span>':""}<span class="estado-badge ${estadoClase}">${pedido.estado}</span></div><div class="detalle-bloque"><p><span class="detalle-label">👤 Cliente:</span> ${pedido.nombre}</p><p><span class="detalle-label">📞 Teléfono:</span> ${pedido.telefono||"—"}</p><p><span class="detalle-label">📅 Fecha de entrega:</span> ${formatearFecha(pedido.fecha)}${pedido.hora?" a las <strong>"+formatearHora(pedido.hora)+"</strong>":""}</p><p><span class="detalle-label">🗓 Fecha de creación:</span> ${pedido.fechaCreacion}</p></div>${urgenteHTML}<h3>Prendas</h3>${prendasHTML}<div class="detalle-total">💵 Subtotal prendas: $${pedido.total.toLocaleString("es-CO")}${pedido.urgente&&pedido.sobrecargo>0?`<br><small>+ $${pedido.sobrecargo.toLocaleString("es-CO")} sobrecargo</small><br>Total final: $${totalFinal.toLocaleString("es-CO")}`:""}</div>${abonoHTML}<div class="detalle-acciones"><button id="btnCambiarEstado" type="button" class="${claseBoton}">${textoBoton}</button><button id="btnEditarPedido" type="button" class="btn-editar">✏️ Editar Pedido</button><button id="btnEliminarPedido" type="button" class="btn-eliminar">🗑 Eliminar Pedido</button></div>`;
    document.getElementById("btnCambiarEstado").addEventListener("click", function(){
        const rawP = window.localStorage.getItem("pedidosSHALOM");
        const pedidos = rawP ? JSON.parse(rawP) : [];
        const idx=pedidos.findIndex(function(p){ return p.bolsa===pedido.bolsa; });
        if(idx===-1){ alert("No se encontró el pedido."); return; }
        const nuevoEstado = pedidos[idx].estado==="Terminado" ? "Pendiente" : "Terminado";
        pedidos[idx].estado = nuevoEstado;
        window.localStorage.setItem("pedidosSHALOM", JSON.stringify(pedidos));
        sincronizarAFirebase("pedidos", pedidos);
        mostrarDetalle(pedidos[idx]);

        // Si acaba de marcarse como Terminado y tiene teléfono, mostrar botón WhatsApp
        if(nuevoEstado === "Terminado" && pedidos[idx].telefono){
            const telefono = pedidos[idx].telefono.replace(/\D/g,"");
            const telefonoFinal = telefono.startsWith("57") ? telefono : "57" + telefono;
            const texto =
                "Hola " + pedidos[idx].nombre + ", te saludamos desde SHALOM Modistería." + "\n\n" +
                "Tu pedido (Bolsa #" + pedidos[idx].bolsa + ") ya está listo." + "\n\n" +
                "Ya puedes pasar a recogerlo!" + "\n\n" +
                "Gracias por confiar en nosotros.";
            const url = "https://wa.me/" + telefonoFinal + "?text=" + encodeURIComponent(texto);
            window.open(url, "_blank");
        }
    });
    const btnAbono=document.getElementById("btnRegistrarAbono");
    if(btnAbono){ btnAbono.addEventListener("click", function(){
        const nuevoMonto=Number(document.getElementById("nuevoAbono").value)||0;
        if(nuevoMonto<=0){ alert("Ingresa un monto válido."); return; }
        const rawP2 = window.localStorage.getItem("pedidosSHALOM");
        const pedidos = rawP2 ? JSON.parse(rawP2) : [];
        const idx=pedidos.findIndex(function(p){ return p.bolsa===pedido.bolsa; });
        if(idx===-1) return;
        const totalF=pedidos[idx].totalConSobrecargo||pedidos[idx].total;
        const abonoActual = pedidos[idx].abono || 0;
        if(abonoActual + nuevoMonto > totalF){
            alert("⚠️ El abono no puede superar el total del pedido ($" + totalF.toLocaleString("es-CO") + "). Saldo pendiente: $" + (totalF - abonoActual).toLocaleString("es-CO"));
            return;
        }
        pedidos[idx].abono=(pedidos[idx].abono||0)+nuevoMonto;
        pedidos[idx].saldo=Math.max(0,totalF-pedidos[idx].abono);
        window.localStorage.setItem("pedidosSHALOM",JSON.stringify(pedidos));
        sincronizarAFirebase("pedidos", pedidos);
        // Registrar en caja
        const descCaja = pedidos[idx].saldo===0 ? "Pago total" : "Abono parcial";
        registrarMovimientoCaja(pedidos[idx], nuevoMonto, descCaja);
        mostrarDetalle(pedidos[idx]);
    }); }
    document.getElementById("btnEditarPedido").addEventListener("click", function(){ abrirEdicion(pedido); });
    document.getElementById("btnEliminarPedido").addEventListener("click", function(){ if(!confirm("⚠️ ¿Segura que deseas ELIMINAR la Bolsa #"+pedido.bolsa+" de "+pedido.nombre+"?")) return; const pedidos=obtenerPedidos(); localStorage.setItem("pedidosSHALOM",JSON.stringify(pedidos.filter(function(p){ return p.bolsa!==pedido.bolsa; }))); pantallaDetalle.classList.add("oculto"); if(pantallaAnteriorDetalle==="calendario"){ pedidosDia.classList.add("oculto"); renderizarCalendario(mesActual,anioActual); pantallaCalendario.classList.remove("oculto"); } else { campoBusqueda.value=""; mostrarResultados(obtenerPedidos()); pantallaBuscar.classList.remove("oculto"); } });
}

function abrirEdicion(pedido){
    pantallaDetalle.classList.add("oculto");
    limpiarFormulario();
    modoEdicion = true;
    bolsaEditando = pedido.bolsa;
    document.getElementById("tituloFormulario").textContent="✏️ Editando Bolsa #"+pedido.bolsa;
    document.getElementById("numeroBolsa").textContent="Bolsa #"+pedido.bolsa;
    botonGuardar.textContent="💾 Guardar Cambios";
    document.getElementById("nombreCliente").value=pedido.nombre;
    document.getElementById("telefonoCliente").value=pedido.telefono||"";
    fechaEntradaInput.value=pedido.fecha; horaEntradaInput.value=pedido.hora||""; abonoInput.value=pedido.abono||"";
    if(pedido.urgente){ toggleUrgente.checked=true; panelUrgente.classList.remove("oculto"); }
    pedido.prendas.forEach(function(prenda){ agregarBloquePrenda(prenda); });
    formulario.classList.remove("oculto");
}

// ─── CALENDARIO ──────────────────────────────────────────────
// ─── PEDIDOS DE HOY ─────────────────────────────────────────

function renderizarHoy(){
    const hoyStr  = fechaAString(new Date());
    const pedidos = obtenerPedidos();
    const garantias = obtenerGarantias();

    // Pendientes de hoy
    const pendientesHoy = pedidos.filter(function(p){
        return p.fecha === hoyStr && p.estado === "Pendiente";
    });
    const garantiasPendientesHoy = garantias.filter(function(g){
        return g.fecha === hoyStr && g.estado === "Pendiente";
    });
    const terminadosHoy = pedidos.filter(function(p){
        return p.fecha === hoyStr && p.estado === "Terminado";
    }).length;

    const total = pendientesHoy.length + garantiasPendientesHoy.length + terminadosHoy;
    const resumen = document.getElementById("hoyResumenTexto");
    resumen.textContent = total + " entrega(s) hoy — " + terminadosHoy + " terminada(s), " + (pendientesHoy.length + garantiasPendientesHoy.length) + " pendiente(s)";

    listaHoy.innerHTML = "";
    const hoyVacio = document.getElementById("hoyVacio");

    if(pendientesHoy.length === 0 && garantiasPendientesHoy.length === 0){
        hoyVacio.classList.remove("oculto");
    } else {
        hoyVacio.classList.add("oculto");

        // Mostrar pedidos pendientes
        pendientesHoy.forEach(function(pedido){
            const tarjeta = document.createElement("div");
            tarjeta.classList.add("tarjeta-hoy");

            const totalFinal = pedido.totalConSobrecargo || pedido.total;
            tarjeta.innerHTML = `
                <div class="hoy-info">
                    <div class="hoy-nombre">${pedido.urgente ? "⚡ " : ""}${pedido.nombre}</div>
                    <div class="hoy-detalle">
                        Bolsa #${pedido.bolsa} · ${pedido.prendas.length} prenda(s)
                        ${pedido.hora ? " · " + formatearHora(pedido.hora) : ""}
                    </div>
                    <div class="hoy-total">$${totalFinal.toLocaleString("es-CO")}
                        ${pedido.saldo > 0 ? ' · Saldo: $' + pedido.saldo.toLocaleString("es-CO") : " · ✅ Pagado"}
                    </div>
                </div>
                <button type="button" class="btn-hoy-terminar">✓ Listo</button>
            `;

            // Al marcar como terminado desaparece de la lista
            tarjeta.querySelector(".btn-hoy-terminar").addEventListener("click", function(){
                const pedidos = obtenerPedidos();
                const idx = pedidos.findIndex(function(p){ return p.bolsa === pedido.bolsa; });
                if(idx === -1) return;
                pedidos[idx].estado = "Terminado";
                window.localStorage.setItem("pedidosSHALOM", JSON.stringify(pedidos));
                sincronizarAFirebase("pedidos", pedidos);
                // Animación de salida
                tarjeta.style.transition = "opacity 0.3s, transform 0.3s";
                tarjeta.style.opacity = "0";
                tarjeta.style.transform = "translateX(60px)";
                setTimeout(function(){
                    tarjeta.remove();
                    renderizarHoy();
                    // WhatsApp si tiene teléfono
                    if(pedidos[idx].telefono){
                        const tel = pedidos[idx].telefono.replace(/\D/g,"");
                        const telFinal = tel.startsWith("57") ? tel : "57" + tel;
                        const texto = "Hola " + pedidos[idx].nombre + ", te saludamos desde SHALOM Modisteria.\n\nTu pedido (Bolsa #" + pedidos[idx].bolsa + ") ya esta listo.\n\nYa puedes pasar a recogerlo!\n\nGracias por confiar en nosotros.";
                        window.open("https://wa.me/" + telFinal + "?text=" + encodeURIComponent(texto), "_blank");
                    }
                }, 300);
            });

            listaHoy.appendChild(tarjeta);
        });

        // Mostrar garantías pendientes
        garantiasPendientesHoy.forEach(function(garantia){
            const tarjeta = document.createElement("div");
            tarjeta.classList.add("tarjeta-hoy", "tarjeta-hoy-garantia");
            tarjeta.innerHTML = `
                <div class="hoy-info">
                    <div class="hoy-nombre">🛡 ${garantia.nombreCliente}</div>
                    <div class="hoy-detalle">
                        Garantía · Bolsa #${garantia.bolsaOrigen} · ${garantia.prendaTipo}
                        ${garantia.hora ? " · " + formatearHora(garantia.hora) : ""}
                    </div>
                    <div class="hoy-total" style="color:#e65100">Sin costo</div>
                </div>
                <button type="button" class="btn-hoy-terminar">✓ Listo</button>
            `;

            tarjeta.querySelector(".btn-hoy-terminar").addEventListener("click", function(){
                const garantias = obtenerGarantias();
                const idx = garantias.findIndex(function(g){ return g.id === garantia.id; });
                if(idx === -1) return;
                garantias[idx].estado = "Terminado";
                window.localStorage.setItem("garantiasSHALOM", JSON.stringify(garantias));
                sincronizarAFirebase("garantias", garantias);
                tarjeta.style.transition = "opacity 0.3s, transform 0.3s";
                tarjeta.style.opacity = "0";
                tarjeta.style.transform = "translateX(60px)";
                setTimeout(function(){ tarjeta.remove(); renderizarHoy(); }, 300);
            });

            listaHoy.appendChild(tarjeta);
        });
    }
}

const MESES=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function renderizarCalendario(mes,anio){
    tituloMes.textContent=MESES[mes]+" "+anio; gridCalendario.innerHTML="";
    ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"].forEach(function(d){ const h=document.createElement("div"); h.classList.add("cal-header"); h.textContent=d; gridCalendario.appendChild(h); });
    const primerDia=new Date(anio,mes,1).getDay(); const totalDias=new Date(anio,mes+1,0).getDate();
    for(let i=0;i<primerDia;i++){ const v=document.createElement("div"); v.classList.add("cal-dia","cal-vacio"); gridCalendario.appendChild(v); }
    const pedidos=obtenerPedidos(); const garantias=obtenerGarantias();
    const hoyStr=fechaAString(new Date()); const mananaStr=fechaAString(new Date(new Date().setDate(new Date().getDate()+1)));
    for(let dia=1;dia<=totalDias;dia++){
        const celda=document.createElement("div"); celda.classList.add("cal-dia");
        const celdaFecha=`${anio}-${String(mes+1).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;
        const pdl=pedidos.filter(function(p){ return p.fecha===celdaFecha&&p.estado==="Pendiente"; });
        const gdl=garantias.filter(function(g){ return g.fecha===celdaFecha&&g.estado==="Pendiente"; });
        const totalP=pdl.reduce(function(acc,p){ return acc+p.prendas.length; },0);
        if(celdaFecha===hoyStr) celda.classList.add("cal-hoy");
        else if(celdaFecha===mananaStr) celda.classList.add("cal-manana");
        else if(celdaFecha>hoyStr&&(pdl.length>0||gdl.length>0)) celda.classList.add("cal-futuro");
        else if(celdaFecha<hoyStr&&(pdl.length>0||gdl.length>0)) celda.classList.add("cal-vencido");
        celda.innerHTML=`<span class="cal-numero">${dia}</span>`;
        if(pdl.length>0||gdl.length>0){
            celda.classList.add("cal-con-pedidos");
            const info=document.createElement("div"); info.classList.add("cal-info");
            if(pdl.length>0) info.innerHTML+=`<span class="cal-bolsas">${pdl.length} bolsa(s)</span><span class="cal-prendas">${totalP} prenda(s)</span>`;
            if(gdl.length>0) info.innerHTML+=`<span class="cal-garantias">${gdl.length} garantía(s)</span>`;
            celda.appendChild(info);
            celda.addEventListener("click", function(){ mostrarPedidosDia(dia,mes,anio,pdl,gdl); });
        }
        gridCalendario.appendChild(celda);
    }
}

function mostrarPedidosDia(dia,mes,anio,pedidosList,garantiasList){
    tituloDia.textContent="Entregas del "+dia+" de "+MESES[mes]+" "+anio;
    listaPedidosDia.innerHTML=""; pedidosDia.classList.remove("oculto");
    pedidosList.forEach(function(pedido){
        const tarjeta=document.createElement("div"); tarjeta.classList.add("tarjeta-pedido");
        const estadoClase=pedido.estado==="Terminado"?"estado-terminado":"estado-pendiente";
        tarjeta.innerHTML=`<div class="tarjeta-encabezado"><div><strong>Bolsa #${pedido.bolsa}</strong>${pedido.urgente?'<span class="badge-urgente">⚡ Urgente</span>':""}<span class="estado-badge ${estadoClase}">${pedido.estado}</span></div>${pedido.hora?`<span class="tarjeta-hora">🕐 ${formatearHora(pedido.hora)}</span>`:""}</div><div class="tarjeta-nombre">👤 ${pedido.nombre}</div><div class="tarjeta-info">📦 ${pedido.prendas.length} prenda(s) &nbsp;|&nbsp; 💵 $${(pedido.totalConSobrecargo||pedido.total).toLocaleString("es-CO")}</div>`;
        tarjeta.addEventListener("click", function(){ pantallaAnteriorDetalle="calendario"; mostrarDetalle(pedido); });
        listaPedidosDia.appendChild(tarjeta);
    });
    garantiasList.forEach(function(garantia){
        const tarjeta=document.createElement("div"); tarjeta.classList.add("tarjeta-pedido","tarjeta-garantia");
        const estadoClase=garantia.estado==="Terminado"?"estado-terminado":"estado-pendiente";
        tarjeta.innerHTML=`<div class="tarjeta-encabezado"><div><strong>🛡 Garantía — Bolsa #${garantia.bolsaOrigen}</strong><span class="estado-badge ${estadoClase}">${garantia.estado}</span></div>${garantia.hora?`<span class="tarjeta-hora">🕐 ${formatearHora(garantia.hora)}</span>`:""}</div><div class="tarjeta-nombre">👤 ${garantia.nombreCliente}</div><div class="tarjeta-info">👗 ${garantia.prendaTipo} &nbsp;|&nbsp; $0</div>`;
        tarjeta.addEventListener("click", function(){ pantallaAnteriorGarantia="calendario"; mostrarDetalleGarantia(garantia); });
        listaPedidosDia.appendChild(tarjeta);
    });
}

// ─── FUNCIONES DE APOYO ──────────────────────────────────────
function obtenerPedidos(){ const d=localStorage.getItem("pedidosSHALOM"); return d?JSON.parse(d):[]; }
function obtenerGarantias(){ const d=localStorage.getItem("garantiasSHALOM"); return d?JSON.parse(d):[]; }

function limpiarFormulario(){
    document.getElementById("nombreCliente").value=""; document.getElementById("telefonoCliente").value="";
    fechaEntradaInput.value=""; horaEntradaInput.value=""; abonoInput.value=""; listaPrendas.innerHTML="";
    document.getElementById("contadorPrendas").textContent="Prendas registradas: 0";
    document.getElementById("totalPedido").textContent="Total: $0";
    toggleUrgente.checked=false; panelUrgente.classList.add("oculto"); totalConSobrecargo.classList.add("oculto"); resumenAbono.classList.add("oculto");
    cantidadPrendas=0; totalPedido=0; modoEdicion=false; bolsaEditando=null;
    document.getElementById("tituloFormulario").textContent="Nuevo Pedido"; botonGuardar.textContent="💾 Guardar Pedido";
}

function formatearFecha(fecha){ if(!fecha) return "—"; const[a,m,d]=fecha.split("-"); return `${d}/${m}/${a}`; }
function formatearHora(hora){ if(!hora) return ""; const[h,m]=hora.split(":"); const hNum=Number(h); return `${hNum%12||12}:${m} ${hNum>=12?"PM":"AM"}`; }
function fechaAString(date){ return date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0"); }
function parsearFechaExcel(fechaStr){ if(!fechaStr) return ""; if(String(fechaStr).includes("/")){ const[d,m,a]=String(fechaStr).split("/"); return `${a}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`; } return String(fechaStr); }

// ─── BASE DE CLIENTES ─────────────────────────────────────────

function obtenerClientes(){
    const d = localStorage.getItem("clientesSHALOM");
    return d ? JSON.parse(d) : [];
}

function reconstruirClientes(pedidos){
    // Extrae todos los clientes únicos de la lista de pedidos
    const mapa = {};
    pedidos.forEach(function(p){
        if(p.nombre && !mapa[p.nombre.toLowerCase()]){
            mapa[p.nombre.toLowerCase()] = {
                nombre: p.nombre,
                telefono: p.telefono || ""
            };
        }
    });
    const clientes = Object.values(mapa);
    window.localStorage.setItem(CLAVES.clientes, JSON.stringify(clientes));
    console.log("Clientes reconstruidos:", clientes.length);
}

function guardarCliente(nombre, telefono){
    if(!nombre) return;
    const d = localStorage.getItem("clientesSHALOM");
    const clientes = d ? JSON.parse(d) : [];
    const existe = clientes.find(function(c){ return c.nombre.toLowerCase() === nombre.toLowerCase(); });
    if(existe){
        // Actualizar teléfono si cambió
        if(telefono && existe.telefono !== telefono){
            existe.telefono = telefono;
            localStorage.setItem("clientesSHALOM", JSON.stringify(clientes));
        }
        return;
    }
    clientes.push({ nombre, telefono: telefono || "" });
    localStorage.setItem("clientesSHALOM", JSON.stringify(clientes));
}

function iniciarAutocompletado(){
    const inputNombre = document.getElementById("nombreCliente");
    const inputTel    = document.getElementById("telefonoCliente");

    // Crear contenedor de sugerencias
    let sugerenciasDiv = document.getElementById("sugerenciasClientes");
    if(!sugerenciasDiv){
        sugerenciasDiv = document.createElement("div");
        sugerenciasDiv.id = "sugerenciasClientes";
        sugerenciasDiv.classList.add("sugerencias-clientes");
        inputNombre.parentNode.insertBefore(sugerenciasDiv, inputNombre.nextSibling);
    }

    inputNombre.addEventListener("input", function(){
        const texto = inputNombre.value.trim().toLowerCase();
        sugerenciasDiv.innerHTML = "";
        if(texto.length < 1){ sugerenciasDiv.classList.add("oculto"); return; }

        const clientes = obtenerClientes();
        const filtrados = clientes.filter(function(c){
            return c.nombre.toLowerCase().includes(texto);
        }).slice(0, 5);

        if(filtrados.length === 0){ sugerenciasDiv.classList.add("oculto"); return; }

        filtrados.forEach(function(c){
            const item = document.createElement("div");
            item.classList.add("sugerencia-item");
            item.innerHTML = `<span class="sug-nombre">${c.nombre}</span>${c.telefono ? `<span class="sug-tel">${c.telefono}</span>` : ""}`;
            item.addEventListener("click", function(){
                inputNombre.value = c.nombre;
                if(c.telefono) inputTel.value = c.telefono;
                sugerenciasDiv.innerHTML = "";
                sugerenciasDiv.classList.add("oculto");
            });
            sugerenciasDiv.appendChild(item);
        });

        sugerenciasDiv.classList.remove("oculto");
    });

    // Cerrar sugerencias al hacer clic fuera
    document.addEventListener("click", function(e){
        if(!inputNombre.contains(e.target) && !sugerenciasDiv.contains(e.target)){
            sugerenciasDiv.classList.add("oculto");
        }
    });
}

// Iniciar autocompletado al cargar
iniciarAutocompletado();

// ─── CAJA DEL DÍA ────────────────────────────────────────────

const botonIrCaja      = document.getElementById("irCaja");
const pantallaCaja     = document.getElementById("pantallaCaja");
const botonVolverCaja  = document.getElementById("volverDesdeCaja");
const botonAgregarGasto = document.getElementById("agregarGasto");

const CLAVE_CAJA = "1976";
let fechaCajaActual = new Date();

botonIrCaja.addEventListener("click", function(){
    const clave = prompt("🔐 Ingresa la clave para acceder a la Caja:");
    if(clave === null) return;
    if(clave !== CLAVE_CAJA){ alert("❌ Clave incorrecta."); return; }
    fechaCajaActual = new Date();
    menu.classList.add("oculto");
    renderizarCaja(fechaAString(fechaCajaActual));
    pantallaCaja.classList.remove("oculto");
});

botonVolverCaja.addEventListener("click", function(){
    pantallaCaja.classList.add("oculto");
    menu.classList.remove("oculto");
    mostrarResumenDia();
});

document.getElementById("cajaDiaAnterior").addEventListener("click", function(){
    fechaCajaActual.setDate(fechaCajaActual.getDate() - 1);
    renderizarCaja(fechaAString(fechaCajaActual));
});

document.getElementById("cajaDiaSiguiente").addEventListener("click", function(){
    const hoy = new Date();
    const siguiente = new Date(fechaCajaActual);
    siguiente.setDate(siguiente.getDate() + 1);
    if(siguiente > hoy){ return; } // no pasar de hoy
    fechaCajaActual.setDate(fechaCajaActual.getDate() + 1);
    renderizarCaja(fechaAString(fechaCajaActual));
});

botonAgregarGasto.addEventListener("click", function(){
    const nombre = document.getElementById("gastoNombre").value.trim();
    const valor  = Number(document.getElementById("gastoValor").value) || 0;
    if(!nombre){ alert("Escribe el nombre del gasto."); return; }
    if(valor <= 0){ alert("Ingresa un valor válido."); return; }

    const gastos = obtenerGastos();
    gastos.push({ id: Date.now(), fecha: fechaAString(fechaCajaActual), nombre, valor });
    localStorage.setItem("gastosSHALOM", JSON.stringify(gastos));

    document.getElementById("gastoNombre").value = "";
    document.getElementById("gastoValor").value  = "";
    renderizarCaja(fechaAString(fechaCajaActual));
});

function obtenerGastos(){
    const d = localStorage.getItem("gastosSHALOM");
    return d ? JSON.parse(d) : [];
}

function renderizarCaja(fechaStr){
    if(!fechaStr) fechaStr = fechaAString(new Date());
    const hoyStr  = fechaAString(new Date());
    const gastos  = obtenerGastos();

    // Título con indicador si es hoy
    const esHoy = fechaStr === hoyStr;
    document.getElementById("cajaTituloDia").textContent =
        formatearFecha(fechaStr) + (esHoy ? " — Hoy" : "");

    const movimientos = obtenerMovimientosCaja();
    const ingresosHoy = movimientos.filter(function(m){ return m.fecha === fechaStr; });
    const totalIngresos = ingresosHoy.reduce(function(acc, m){ return acc + m.valor; }, 0);

    const gastosHoy = gastos.filter(function(g){ return g.fecha === fechaStr; });
    const totalGastos = gastosHoy.reduce(function(acc, g){ return acc + g.valor; }, 0);

    const balance = totalIngresos - totalGastos;

    // Actualizar resumen
    document.getElementById("cajaIngresoTotal").textContent = "$" + totalIngresos.toLocaleString("es-CO");
    document.getElementById("cajaGastoTotal").textContent   = "$" + totalGastos.toLocaleString("es-CO");
    const balanceEl = document.getElementById("cajaBalance");
    balanceEl.textContent = "$" + balance.toLocaleString("es-CO");
    balanceEl.className   = balance >= 0 ? "color-verde" : "color-rojo";

    // Mostrar/ocultar formulario de gastos (solo si es hoy)
    const gastoForm = document.querySelector(".gasto-form");
    if(gastoForm) gastoForm.style.display = esHoy ? "flex" : "none";

    // Renderizar ingresos
    const listaIngresos = document.getElementById("listaIngresos");
    listaIngresos.innerHTML = "";
    if(ingresosHoy.length === 0){
        listaIngresos.innerHTML = "<p class='sin-resultados'>No hay ingresos registrados hoy.</p>";
    } else {
        ingresosHoy.forEach(function(m){
            const item = document.createElement("div");
            item.classList.add("caja-item", "caja-item-ingreso");
            item.innerHTML = `
                <div class="caja-item-info">
                    <span class="caja-item-nombre">👤 ${m.cliente} — Bolsa #${m.bolsa}</span>
                    <span class="caja-item-desc">${m.descripcion}</span>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                    <strong class="color-verde">+$${m.valor.toLocaleString("es-CO")}</strong>
                    <button type="button" class="btn-eliminar-gasto btn-eliminar-ingreso" data-id="${m.id}">✕</button>
                </div>
            `;
            listaIngresos.appendChild(item);
        });

        // Eliminar ingreso
        listaIngresos.querySelectorAll(".btn-eliminar-ingreso").forEach(function(btn){
            btn.addEventListener("click", function(){
                if(!confirm("⚠️ ¿Segura que deseas eliminar este ingreso de la caja?\n\nEsto no deshace el abono del pedido, solo lo quita del registro de caja.")) return;
                const id = Number(btn.getAttribute("data-id"));
                const movs = obtenerMovimientosCaja().filter(function(m){ return m.id !== id; });
                localStorage.setItem("movimientosCajaSHALOM", JSON.stringify(movs));
                renderizarCaja(fechaAString(fechaCajaActual));
            });
        });
    }

    // Renderizar gastos
    const listaGastos = document.getElementById("listaGastos");
    listaGastos.innerHTML = "";
    if(gastosHoy.length === 0){
        listaGastos.innerHTML = "<p class='sin-resultados'>No hay gastos registrados hoy.</p>";
    } else {
        gastosHoy.forEach(function(g){
            const item = document.createElement("div");
            item.classList.add("caja-item", "caja-item-gasto");
            item.innerHTML = `
                <div class="caja-item-info">
                    <span class="caja-item-nombre">🧾 ${g.nombre}</span>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                    <strong class="color-rojo">-$${g.valor.toLocaleString("es-CO")}</strong>
                    <button type="button" class="btn-eliminar-gasto" data-id="${g.id}">✕</button>
                </div>
            `;
            listaGastos.appendChild(item);
        });

        // Eliminar gasto
        listaGastos.querySelectorAll(".btn-eliminar-gasto").forEach(function(btn){
            btn.addEventListener("click", function(){
                if(!confirm("¿Eliminar este gasto?")) return;
                const id = Number(btn.getAttribute("data-id"));
                const gastos = obtenerGastos().filter(function(g){ return g.id !== id; });
                localStorage.setItem("gastosSHALOM", JSON.stringify(gastos));
                renderizarCaja(fechaAString(fechaCajaActual));
            });
        });
    }
}

function obtenerMovimientosCaja(){
    const d = localStorage.getItem("movimientosCajaSHALOM");
    return d ? JSON.parse(d) : [];
}

function registrarMovimientoCaja(pedido, monto, descripcion){
    if(!monto || monto <= 0) return;
    const d = _lsSetItem ? localStorage.getItem("movimientosCajaSHALOM") : null;
    const movimientos = d ? JSON.parse(d) : [];
    const nuevoMov = {
        id:          Date.now(),
        fecha:       fechaAString(new Date()),
        bolsa:       pedido.bolsa,
        cliente:     pedido.nombre,
        valor:       Number(monto),
        descripcion: descripcion
    };
    movimientos.push(nuevoMov);
    // Use native localStorage to avoid any interceptor issues
    const raw = JSON.stringify(movimientos);
    window.localStorage.setItem("movimientosCajaSHALOM", raw);
    // Also sync to Firebase directly
    sincronizarAFirebase("movimientos", movimientos);
}
