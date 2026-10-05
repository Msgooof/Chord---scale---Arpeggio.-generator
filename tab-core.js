/* =========================================================================
 * tab-core.js — el núcleo de las TABLATURAS (0.3)
 *
 * Sin JSX y sin React, como song-core.js: aquí viven el modelo, la altura de
 * cada nota (qué se escribe en el pentagrama) y la MAQUETACIÓN (dónde cae
 * cada cosa en la página). El componente de la hoja sólo pinta lo que esto
 * le dice, así que dibujar en pantalla, en la miniatura de la Biblioteca y en
 * el PDF es exactamente el mismo cálculo.
 *
 * Lo carga sólo v03.html. Prime no lo conoce y no lo necesita: guarda en una
 * clave propia (`kharo.tabs.v1`) que Prime no lee.
 * ========================================================================= */
(function (global) {
    "use strict";

    const T = global.KharoTheory;
    const S = global.KharoSong;

    const TAB_FORMAT_VERSION = 1;
    const STORAGE_TABS = "kharo.tabs.v1";

    /* --- Tiempo ----------------------------------------------------------
     * Todo se cuenta en TICKS, con la negra en 48. Es el menor número que
     * deja enteros la fusa (6), el puntillo de fusa (9) y los tresillos de
     * corchea (16) y de semicorchea (8): con decimales, sumar un compás de
     * tresillos daría 191,99999 y el compás saldría «incompleto».
     * -------------------------------------------------------------------- */
    const NEGRA = 48;
    const FIGURAS = [
        { id: "1", nombre: "Redonda", ticks: 192, tecla: "1" },
        { id: "2", nombre: "Blanca", ticks: 96, tecla: "2" },
        { id: "4", nombre: "Negra", ticks: 48, tecla: "3" },
        { id: "8", nombre: "Corchea", ticks: 24, tecla: "4" },
        { id: "16", nombre: "Semicorchea", ticks: 12, tecla: "5" },
        { id: "32", nombre: "Fusa", ticks: 6, tecla: "6" }
    ];
    const figura = (id) => FIGURAS.find(f => f.id === id) || FIGURAS[2];

    const COMPASES = [
        { id: "4/4", num: 4, den: 4 },
        { id: "3/4", num: 3, den: 4 },
        { id: "2/4", num: 2, den: 4 },
        { id: "6/8", num: 6, den: 8 },
        { id: "12/8", num: 12, den: 8 },
        { id: "5/4", num: 5, den: 4 },
        { id: "7/8", num: 7, den: 8 }
    ];
    const compasDe = (id) => COMPASES.find(c => c.id === id) || COMPASES[0];
    const ticksDelCompas = (id) => { const c = compasDe(id); return c.num * (192 / c.den); };
    // El pulso con el que se agrupan las barras: la negra en x/4, la negra con
    // puntillo en 6/8 y 12/8 (que se cuentan en dos y en cuatro, no en seis).
    const ticksDelPulso = (id) => {
        const c = compasDe(id);
        if (c.den === 8 && c.num % 3 === 0) return 72;
        return 192 / c.den;
    };

    function ticksDeEvento(ev) {
        let t = figura(ev.dur).ticks;
        if (ev.puntillo) t = t * 1.5;
        if (ev.tresillo) t = t * 2 / 3;
        return Math.round(t);
    }

    function ticksDeCompas(compas) {
        return (compas.eventos || []).reduce((n, ev) => n + ticksDeEvento(ev), 0);
    }

    // «completo», «falta» o «sobra». Un compás vacío no se marca: es un
    // compás de silencio, que es lo que dibuja.
    function estadoDelCompas(compas, compasId) {
        if (!compas.eventos || compas.eventos.length === 0) return "vacio";
        const t = ticksDeCompas(compas), cap = ticksDelCompas(compasId);
        return t === cap ? "completo" : (t < cap ? "falta" : "sobra");
    }

    // La figura más larga que cabe en `ticks` (sin puntillo ni tresillo).
    function figuraQueCabe(ticks) {
        for (const f of FIGURAS) if (f.ticks <= ticks) return f.id;
        return null;
    }

    /* --- Técnicas ----------------------------------------------------------
     * Son ANOTACIÓN: la tablatura dice cómo se toca, y el reproductor las
     * imita lo mejor que puede (un bend sube de tono, una muerta es un
     * chasquido), pero lo que importa es que se lean como en cualquier
     * método o en MuseScore.
     * -------------------------------------------------------------------- */
    const BENDS = [0.5, 1, 1.5, 2];
    const TIPOS_BEND = ["bend", "bend-release", "release", "prebend"];

    function tecVacia() {
        return {
            ligado: null,      // "h" | "p"
            tap: false,
            slide: null,       // "a" (hasta la siguiente) | "sube" (entra desde abajo) | "baja" (sale hacia abajo)
            bend: null,        // { tipo, cant }
            vibrato: false,
            armonico: null,    // "natural" | "artificial"
            muerta: false,
            fantasma: false,
            acento: false
        };
    }

    function sanearTec(t) {
        const b = tecVacia();
        if (!t || typeof t !== "object") return b;
        return {
            ligado: t.ligado === "h" || t.ligado === "p" ? t.ligado : null,
            tap: !!t.tap,
            slide: ["a", "sube", "baja"].indexOf(t.slide) !== -1 ? t.slide : null,
            bend: t.bend && TIPOS_BEND.indexOf(t.bend.tipo) !== -1
                ? { tipo: t.bend.tipo, cant: BENDS.indexOf(Number(t.bend.cant)) !== -1 ? Number(t.bend.cant) : 1 }
                : null,
            vibrato: !!t.vibrato,
            armonico: t.armonico === "natural" || t.armonico === "artificial" ? t.armonico : null,
            muerta: !!t.muerta,
            fantasma: !!t.fantasma,
            acento: !!t.acento
        };
    }

    /* --- Modelo ------------------------------------------------------------ */
    const newId = (p) => S.newId(p);

    function createCompas() { return { id: newId("cmp"), eventos: [] }; }

    function createEvento(dur, notas) {
        return {
            id: newId("ev"),
            dur: dur || "4",
            puntillo: false,
            tresillo: false,
            notas: (notas || []).map(n => ({ s: n.s, f: n.f, tec: sanearTec(n.tec) })),
            pua: null,         // "abajo" | "arriba"
            pm: false,
            letRing: false,
            sweep: null,       // "abajo" | "arriba"
            texto: ""
        };
    }

    function createTab(titulo) {
        const inst = T.getInstrument(T.DEFAULT_INSTRUMENT);
        const presets = T.TUNING_PRESETS[inst.id] || [];
        return {
            version: TAB_FORMAT_VERSION,
            id: newId("tab"),
            title: titulo || "Tablatura sin título",
            artista: "",
            notas: "",
            instrument: inst.id,
            tuning: presets[0] ? presets[0].notes.slice() : [],
            tuningName: presets[0] ? presets[0].name : "",
            tuningMidi: null,
            capo: 0,
            bpm: 90,
            compas: "4/4",
            armadura: 0,       // quintas: -7 (7 bemoles) … 7 (7 sostenidos)
            compases: [createCompas(), createCompas(), createCompas(), createCompas()]
        };
    }

    function normalizeTab(bruto) {
        const base = createTab();
        if (!bruto || typeof bruto !== "object") return base;
        const inst = T.getInstrument(bruto.instrument);
        const cuerdas = inst.strings;
        const entero = (v, min, max, def) => {
            const n = parseInt(v, 10);
            return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : def;
        };
        const compases = Array.isArray(bruto.compases) ? bruto.compases.filter(c => c && typeof c === "object").map(c => ({
            id: c.id ? String(c.id) : newId("cmp"),
            eventos: Array.isArray(c.eventos) ? c.eventos.filter(e => e && typeof e === "object").map(e => {
                // Una nota por cuerda: si llegan dos en la misma, gana la última.
                const porCuerda = {};
                (Array.isArray(e.notas) ? e.notas : []).forEach(n => {
                    if (!n) return;
                    const s = parseInt(n.s, 10), f = parseInt(n.f, 10);
                    if (!(s >= 0 && s < cuerdas) || !(f >= 0 && f <= 36)) return;
                    porCuerda[s] = { s, f, tec: sanearTec(n.tec) };
                });
                return {
                    id: e.id ? String(e.id) : newId("ev"),
                    dur: FIGURAS.some(f => f.id === String(e.dur)) ? String(e.dur) : "4",
                    puntillo: !!e.puntillo,
                    tresillo: !!e.tresillo,
                    notas: Object.keys(porCuerda).map(k => porCuerda[k]).sort((a, b) => a.s - b.s),
                    pua: e.pua === "abajo" || e.pua === "arriba" ? e.pua : null,
                    pm: !!e.pm,
                    letRing: !!e.letRing,
                    sweep: e.sweep === "abajo" || e.sweep === "arriba" ? e.sweep : null,
                    texto: typeof e.texto === "string" ? e.texto.slice(0, 40) : ""
                };
            }) : []
        })) : base.compases;

        return {
            version: TAB_FORMAT_VERSION,
            id: typeof bruto.id === "string" && bruto.id ? bruto.id : base.id,
            title: typeof bruto.title === "string" ? bruto.title : base.title,
            artista: typeof bruto.artista === "string" ? bruto.artista : "",
            notas: typeof bruto.notas === "string" ? bruto.notas : "",
            instrument: inst.id,
            tuning: Array.isArray(bruto.tuning) && bruto.tuning.length === cuerdas ? bruto.tuning.slice() : (T.TUNING_PRESETS[inst.id] || [{ notes: [] }])[0].notes.slice(),
            tuningName: typeof bruto.tuningName === "string" ? bruto.tuningName : "",
            tuningMidi: Array.isArray(bruto.tuningMidi) && bruto.tuningMidi.length === cuerdas ? bruto.tuningMidi.slice() : null,
            capo: entero(bruto.capo, 0, 12, 0),
            bpm: entero(bruto.bpm, 30, 300, 90),
            compas: COMPASES.some(c => c.id === bruto.compas) ? bruto.compas : "4/4",
            armadura: entero(bruto.armadura, -7, 7, 0),
            compases: compases.length ? compases : [createCompas()]
        };
    }

    function loadTabs() { return S.loadJSON ? S.loadJSON(STORAGE_TABS, []) : leer(STORAGE_TABS, []); }
    function saveTabs(lista) { return S.saveJSON ? S.saveJSON(STORAGE_TABS, lista) : escribir(STORAGE_TABS, lista); }
    function leer(clave, def) {
        try { const b = global.localStorage.getItem(clave); return b ? JSON.parse(b) : def; } catch (e) { return def; }
    }
    function escribir(clave, v) {
        try { global.localStorage.setItem(clave, JSON.stringify(v)); return true; } catch (e) { return false; }
    }

    /* --- Altura --------------------------------------------------------------
     * La cuerda 0 es la más grave, como en todo Kharo. En la TAB se dibuja
     * abajo: la línea de arriba es la cuerda más aguda, como se lee una
     * tablatura.
     * -------------------------------------------------------------------- */
    function afinacionMidi(tab) {
        return T.resolveTuningMIDI(tab.tuning, tab.instrument, tab.tuningMidi);
    }

    function midiDeNota(tab, nota, afinacion) {
        const af = afinacion || afinacionMidi(tab);
        return (af[nota.s] || 40) + nota.f + (tab.capo || 0);
    }

    // Clave en que se escribe cada instrumento. La guitarra y el bajo SUENAN
    // una octava por debajo de lo escrito (por eso el «8» bajo la clave).
    function claveDe(instrumentId) {
        if (/^bass/.test(instrumentId)) return { id: "fa", octava: 12, lineaInferior: 2 * 7 + 4 }; // sol2 en la 1.ª línea
        if (/^uke/.test(instrumentId)) return { id: "sol", octava: 0, lineaInferior: 4 * 7 + 2 };  // mi4
        return { id: "sol", octava: 12, lineaInferior: 4 * 7 + 2, ocho: true };
    }

    const LETRAS = ["C", "D", "E", "F", "G", "A", "B"];
    const PC_LETRA = [0, 2, 4, 5, 7, 9, 11];
    const SOSTENIDOS = [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [5, 0], [5, 1], [6, 0]];
    const BEMOLES = [[0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [4, -1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]];
    const ORDEN_SOSTENIDOS = [3, 0, 4, 1, 5, 2, 6]; // F C G D A E B
    const ORDEN_BEMOLES = [6, 2, 5, 1, 4, 0, 3];    // B E A D G C F

    function alteracionesDeLaArmadura(armadura) {
        const alt = [0, 0, 0, 0, 0, 0, 0];
        if (armadura > 0) for (let i = 0; i < armadura; i++) alt[ORDEN_SOSTENIDOS[i]] = 1;
        if (armadura < 0) for (let i = 0; i < -armadura; i++) alt[ORDEN_BEMOLES[i]] = -1;
        return alt;
    }

    // Nombre escrito de un MIDI: letra, alteración y escalón diatónico.
    function deletrear(midiEscrito, armadura) {
        const pc = ((midiEscrito % 12) + 12) % 12;
        const [letra, alter] = (armadura < 0 ? BEMOLES : SOSTENIDOS)[pc];
        const octava = Math.floor((midiEscrito - (PC_LETRA[letra] + alter)) / 12) - 1;
        return { letra, alter, octava, diatonico: octava * 7 + letra };
    }

    const nombreDeNota = (midi, armadura) => {
        const d = deletrear(midi, armadura || 0);
        return LETRAS[d.letra] + (d.alter === 1 ? "♯" : d.alter === -1 ? "♭" : "") + d.octava;
    };

    /* --- Maquetación -----------------------------------------------------------
     *
     * Medidas en unidades de la hoja (la A4 de HOJA mide 840 × 1188). `esp`
     * es el espacio entre líneas del pentagrama; todo lo vertical sale de él.
     * -------------------------------------------------------------------- */
    const MEDIDAS = {
        esp: 8,                 // espacio del pentagrama
        tabEsp: 12,             // espacio entre líneas de la TAB
        bandaArriba: 30,        // púa, acentos, texto
        holguraPentagrama: 26,  // notas con líneas adicionales arriba/abajo
        bandaMedia: 46,         // P.M., let ring, sweep, tapping, bends
        bandaAbajo: 14,
        separacion: 12,
        cabezaPrimero: 92,      // clave + armadura + compás
        cabeza: 44,             // clave + «TAB»
        rellenoCompas: 14,
        minEvento: 13
    };

    function anchoDeEvento(ev) {
        const t = ticksDeEvento(ev);
        // Raíz: una blanca no ocupa el doble que una negra, como en cualquier
        // partitura grabada; si no, una redonda se comería medio sistema.
        let w = MEDIDAS.minEvento + 18 * Math.sqrt(t / 24);
        if (ev.notas.some(n => n.f >= 10)) w += 4;
        if (ev.notas.some(n => n.tec.bend)) w += 10;
        if (ev.notas.some(n => n.tec.armonico === "natural" || n.tec.fantasma)) w += 8;
        return w;
    }

    function altoDeSistema(cuerdas) {
        const m = MEDIDAS;
        return m.bandaArriba + m.holguraPentagrama + 4 * m.esp + m.holguraPentagrama +
            m.bandaMedia + (cuerdas - 1) * m.tabEsp + m.bandaAbajo;
    }

    /* Reparte compases en sistemas y sistemas en páginas.
     *   opciones: { ancho, alto, x0, y0Primera, y0, yFin }
     * Devuelve { paginas: [{ sistemas: [...] }], sistemas }, y cada sistema
     * trae sus coordenadas absolutas: lo que pinta la hoja y lo que usa el
     * editor para saber dónde has hecho clic. */
    function maquetar(tab, op) {
        const m = MEDIDAS;
        const cuerdas = T.getInstrument(tab.instrument).strings;
        const altoSis = altoDeSistema(cuerdas);
        const anchoUtil = op.ancho;
        const cap = ticksDelCompas(tab.compas);

        const anchos = tab.compases.map(c => {
            if (!c.eventos.length) return 70;
            return m.rellenoCompas + c.eventos.reduce((n, ev) => n + anchoDeEvento(ev), 0) + 6;
        });

        // Sistemas: tantos compases como quepan.
        const filas = [];
        let actual = [], usado = 0;
        // La armadura se repite en cada sistema; el compás, sólo en el primero.
        const anchoArmadura = Math.abs(tab.armadura || 0) * 7;
        const cabezaDe = (i) => (i === 0 ? m.cabezaPrimero : m.cabeza) + anchoArmadura;
        tab.compases.forEach((c, i) => {
            const cabeza = cabezaDe(filas.length);
            if (actual.length && usado + anchos[i] > anchoUtil - cabeza) {
                filas.push(actual);
                actual = []; usado = 0;
            }
            actual.push(i);
            usado += anchos[i];
        });
        if (actual.length) filas.push(actual);

        const sistemas = filas.map((indices, si) => {
            const cabeza = cabezaDe(si);
            const natural = indices.reduce((n, i) => n + anchos[i], 0);
            const disponible = anchoUtil - cabeza;
            // Se justifica a todo el ancho, salvo el último sistema si está
            // muy vacío: estirar dos compases a lo ancho de la página los
            // hace ilegibles. Es lo que hace MuseScore.
            const ultimo = si === filas.length - 1;
            const factor = (ultimo && natural < disponible * 0.6) ? 1 : disponible / natural;
            let x = op.x0 + cabeza;
            const compases = indices.map(ci => {
                const c = tab.compases[ci];
                const w = anchos[ci] * factor;
                const x0 = x;
                x += w;
                let ex = x0 + m.rellenoCompas * factor;
                let tick = 0;
                const eventos = c.eventos.map((ev, ei) => {
                    const ew = anchoDeEvento(ev) * factor;
                    const r = { indice: ei, x: ex + Math.min(ew / 2, 14 * factor), ancho: ew, x0: ex, tick, ticks: ticksDeEvento(ev) };
                    ex += ew;
                    tick += r.ticks;
                    return r;
                });
                return { indice: ci, x0, x1: x, eventos, estado: estadoDelCompas(c, tab.compas), llenos: ticksDeCompas(c), cap };
            });
            return { indice: si, primero: si === 0, cabeza, x0: op.x0, x1: x, compases, alto: altoSis };
        });

        // Páginas.
        const paginas = [];
        let pagina = null, y = 0;
        sistemas.forEach(s => {
            const tope = paginas.length === 0 ? op.y0Primera : op.y0;
            if (!pagina || y + s.alto > op.yFin) {
                pagina = { sistemas: [] };
                paginas.push(pagina);
                y = tope;
            }
            s.y = y;
            s.pagina = paginas.length - 1;
            // Las alturas de cada pieza, ya absolutas.
            s.yPentagrama = y + m.bandaArriba + m.holguraPentagrama;            // línea de arriba
            s.yPentagramaAbajo = s.yPentagrama + 4 * m.esp;                    // línea de abajo
            s.yBandaMedia = s.yPentagramaAbajo + m.holguraPentagrama;
            s.yTab = s.yBandaMedia + m.bandaMedia;                             // cuerda más aguda
            s.yTabAbajo = s.yTab + (cuerdas - 1) * m.tabEsp;                   // cuerda más grave
            pagina.sistemas.push(s);
            y += s.alto + m.separacion;
        });
        if (!paginas.length) paginas.push({ sistemas: [] });

        return { paginas, sistemas, cuerdas, medidas: m };
    }

    // y de una cuerda en la TAB de un sistema.
    function yDeCuerda(sistema, s, cuerdas) {
        return sistema.yTab + (cuerdas - 1 - s) * MEDIDAS.tabEsp;
    }

    /* --- Barras de corcheas ------------------------------------------------------
     * Se agrupan por pulso: corcheas y menores seguidas, sin silencios, que
     * empiezan en el mismo pulso. Devuelve, por compás, una lista de grupos
     * de índices de evento (un grupo de uno lleva corchete, no barra). */
    function gruposDeBarras(compas, compasId) {
        const pulso = ticksDelPulso(compasId);
        const grupos = [];
        let actual = [], pulsoActual = -1, tick = 0;
        compas.eventos.forEach((ev, i) => {
            const t = ticksDeEvento(ev);
            const barrable = figura(ev.dur).ticks <= 24 && ev.notas.length > 0;
            const p = Math.floor(tick / pulso);
            if (barrable && p === pulsoActual && actual.length) {
                actual.push(i);
            } else {
                if (actual.length) grupos.push(actual);
                actual = barrable ? [i] : [];
                pulsoActual = barrable ? p : -1;
            }
            tick += t;
        });
        if (actual.length) grupos.push(actual);
        return grupos;
    }

    // Cuántas barras lleva una figura: corchea 1, semicorchea 2, fusa 3.
    const barrasDe = (dur) => ({ "8": 1, "16": 2, "32": 3 })[dur] || 0;

    /* --- Tramos ------------------------------------------------------------------
     * P.M., let ring y sweep se escriben a lo largo de varios eventos
     * seguidos. Esto encuentra los tramos dentro de un sistema. */
    function tramos(tab, sistema, campo) {
        const res = [];
        let abierto = null;
        sistema.compases.forEach(cm => {
            const c = tab.compases[cm.indice];
            cm.eventos.forEach(r => {
                const ev = c.eventos[r.indice];
                const v = ev[campo];
                if (v && abierto && abierto.valor === v) {
                    abierto.x1 = r.x0 + r.ancho;
                } else {
                    if (abierto) res.push(abierto);
                    abierto = v ? { valor: v, x0: r.x - 6, x1: r.x0 + r.ancho } : null;
                }
            });
        });
        if (abierto) res.push(abierto);
        return res;
    }

    /* --- Recorrer en orden -------------------------------------------------------
     * Lista plana de eventos con su compás y su tick absoluto: la usan el
     * reproductor y la búsqueda de «la siguiente nota en esta cuerda» (para
     * ligados y slides). */
    function eventosEnOrden(tab) {
        const lista = [];
        let tick = 0;
        tab.compases.forEach((c, ci) => {
            let t = 0;
            c.eventos.forEach((ev, ei) => {
                lista.push({ ci, ei, ev, tick: tick + t, ticks: ticksDeEvento(ev) });
                t += ticksDeEvento(ev);
            });
            // Un compás vacío o incompleto dura igual lo que dice el compás:
            // se oye como silencio, como se ve.
            tick += Math.max(t, ticksDelCompas(tab.compas));
        });
        return { lista, total: tick };
    }

    function siguienteEnCuerda(tab, ci, ei, s) {
        for (let c = ci; c < tab.compases.length; c++) {
            const evs = tab.compases[c].eventos;
            for (let e = (c === ci ? ei + 1 : 0); e < evs.length; e++) {
                const n = evs[e].notas.find(x => x.s === s);
                if (n) return { ci: c, ei: e, nota: n };
                if (evs[e].notas.length) return null; // sólo la INMEDIATA
            }
        }
        return null;
    }

    /* --- Desde un recorrido del mástil -------------------------------------------
     * Un paso de ejercicio (o lo que hay en Escalas/Arpegios) pasa a la TAB
     * como una nota por corchea. `tap` se queda como T y el sweep como su
     * marca, en los eventos que toca. */
    function eventosDesdeRecorrido(path, startingFret, opciones) {
        const o = opciones || {};
        return (path || []).map(pos => {
            const f = pos.f === 0 ? 0 : (startingFret || 1) + pos.f - 1;
            const tec = tecVacia();
            tec.tap = !!pos.tap;
            const ev = createEvento(o.dur || "8", [{ s: pos.s, f, tec }]);
            if (o.sweep) ev.sweep = o.sweep;
            return ev;
        });
    }

    // Reparte una lista de eventos en compases nuevos.
    function enCompases(eventos, compasId) {
        const cap = ticksDelCompas(compasId);
        const res = [];
        let actual = createCompas(), t = 0;
        eventos.forEach(ev => {
            const d = ticksDeEvento(ev);
            if (t + d > cap && actual.eventos.length) { res.push(actual); actual = createCompas(); t = 0; }
            actual.eventos.push(ev);
            t += d;
        });
        if (actual.eventos.length) res.push(actual);
        return res;
    }

    global.KharoTab = {
        TAB_FORMAT_VERSION, STORAGE_TABS, NEGRA,
        FIGURAS, figura, COMPASES, compasDe, ticksDelCompas, ticksDelPulso,
        ticksDeEvento, ticksDeCompas, estadoDelCompas, figuraQueCabe,
        BENDS, TIPOS_BEND, tecVacia, sanearTec,
        createCompas, createEvento, createTab, normalizeTab, loadTabs, saveTabs,
        afinacionMidi, midiDeNota, claveDe, deletrear, nombreDeNota,
        alteracionesDeLaArmadura, LETRAS, ORDEN_SOSTENIDOS, ORDEN_BEMOLES,
        MEDIDAS, maquetar, altoDeSistema, yDeCuerda, gruposDeBarras, barrasDe, tramos,
        eventosEnOrden, siguienteEnCuerda, eventosDesdeRecorrido, enCompases
    };
})(typeof window !== "undefined" ? window : this);
