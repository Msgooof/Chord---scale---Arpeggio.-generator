/* VERSIÓN DE PRUEBA (2026-10-03) de render-core.js, la carga sólo
 * prueba.html. Única diferencia: la clave `fretboardSkin` del estilo. Si la
 * prueba se aprueba, este archivo sustituye a render-core.js. */
/* ==========================================================================
 * KHARO STUDIO — NÚCLEO DE GEOMETRÍA Y COMPOSICIÓN
 * ==========================================================================
 *
 * Funciones puras: sin JSX, sin estado de React, sin tocar el DOM.
 * Se carga con un <script> normal y NO pasa por Babel, igual que theory-core.
 *
 * Por qué existe separado de theory-core.js: la geometría de un mástil
 * DIBUJADO no es teoría musical. El día que haya un módulo de piano
 * compartirá la teoría pero no esta geometría.
 *
 * Por qué no vive dentro del componente que dibuja: hay dos consumidores que
 * necesitan las medidas SIN renderizar nada —
 *   1. La exportación a PNG, que dimensiona el lienzo antes de pintar.
 *   2. El montaje de la hoja de progresión, que necesita saber cuánto mide
 *      cada diagrama para colocarlos, y cada uno puede tener distinto
 *      número de trastes.
 * Medir renderizando y luego leyendo el DOM sería un doble pase frágil.
 * ========================================================================== */

(function (global) {
    "use strict";

    /* --- Constantes de dibujo del mástil --------------------------------- */
    const DIAGRAM_WIDTH = 340;
    const PADDING_TOP = 130;
    const PADDING_BOTTOM = 60;
    const PADDING_LEFT = 70;
    const PADDING_RIGHT = 70;

    const BASE_FRET_HEIGHT = 60;
    // Cada traste mide un 4,5% menos que el anterior, como en un mástil real.
    const FRET_SHRINK = 0.955;

    /* --- Geometría logarítmica del mástil --------------------------------
     *
     * Devuelve TODAS las medidas del diagrama a partir de sus cuatro
     * variables. Es copia literal de las fórmulas que vivían dentro del
     * componente: ni un número cambia, para que el dibujo sea idéntico.
     *
     * `dotRadius` entra en la cuenta porque fija el alto mínimo de un traste:
     * sin él, con muchos trastes las notas no cabrían.
     * -------------------------------------------------------------------- */
    function computeDiagramGeometry({ numStrings, numFrets, startingFret, dotRadius }) {
        const width = DIAGRAM_WIDTH;
        const paddingTop = PADDING_TOP;
        const paddingBottom = PADDING_BOTTOM;
        const paddingLeft = PADDING_LEFT;
        const paddingRight = PADDING_RIGHT;

        const minFretHeight = Math.max(25, dotRadius * 2 + 6);

        const fretWeights = [];
        const fretHeights = [];
        let sumOfHeights = 0;
        for (let f = 1; f <= numFrets; f++) {
            const absFret = startingFret + f - 1;
            const weight = Math.pow(FRET_SHRINK, absFret - 1);
            const calculatedFretHeight = Math.max(minFretHeight, BASE_FRET_HEIGHT * weight);

            fretWeights.push(weight);
            fretHeights.push(calculatedFretHeight);
            sumOfHeights += calculatedFretHeight;
        }

        const gridHeight = sumOfHeights;
        const height = paddingTop + gridHeight + paddingBottom;

        const gridWidth = width - paddingLeft - paddingRight;
        const stringSpacing = gridWidth / (numStrings - 1);

        const fretYPositions = [paddingTop];
        let currentY = paddingTop;
        for (let f = 0; f < numFrets; f++) {
            currentY += fretHeights[f];
            fretYPositions.push(currentY);
        }

        return {
            width, height,
            paddingTop, paddingBottom, paddingLeft, paddingRight,
            gridWidth, gridHeight,
            stringSpacing,
            fretWeights, fretHeights, fretYPositions
        };
    }

    // El título encoge para que un nombre largo no se salga del diagrama.
    function computeTitleFontSize(title) {
        return Math.min(24, Math.max(12, Math.floor(450 / ((title || "").length || 1))));
    }

    /* --- Límites del instrumento ----------------------------------------- */
    const MIN_FRET = 1;
    const MAX_FRET = 24;
    const MIN_NUM_FRETS = 4;
    const MAX_NUM_FRETS = 24;

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function clampStartingFret(value) {
        return clamp(Math.round(value) || MIN_FRET, MIN_FRET, MAX_FRET);
    }

    function clampNumFrets(value) {
        return clamp(Math.round(value) || MIN_NUM_FRETS, MIN_NUM_FRETS, MAX_NUM_FRETS);
    }

    /* --- EL ESTILO DEL DIAGRAMA -------------------------------------------
     *
     * Los colores, grosores y tipografía con los que se dibuja LA OBRA: el
     * mástil del estudio, las miniaturas de la biblioteca, el mástil de la
     * hoja de tonalidad y la ficha de ejercicio. Es lo que el usuario elige
     * en el panel de Estilo, y es lo que viaja dentro del PNG que descarga.
     *
     * NO CONFUNDIR CON EL TEMA DE LA APP. Son dos cosas distintas y hasta
     * ahora se trataban igual:
     *
     *   TEMA   (`theme.css`, los `var(--k-*)`)   claro/oscuro, el chrome.
     *          NUNCA manda en lo que se exporta: si repintara el diagrama, el
     *          PNG cambiaría según cómo tengas puesta la app.
     *   ESTILO (esto)                            los colores de la obra.
     *          SÍ manda, porque es la obra.
     *
     * VIVE AQUÍ, y no en `index.html`, porque `computeDiagramGeometry` ya
     * consume `dotRadius` (`minFretHeight`, más arriba en este archivo). El
     * validador tiene que estar al lado de quien lo consume: un valor
     * corrupto aquí no descoloca un color, deja el mástil en blanco.
     * ---------------------------------------------------------------------- */
    const DEFAULT_STYLE = {
        backgroundColor: "#ffffff",
        gridColor: "#1e293b",
        textColor: "#0f172a",
        dotTextColor: "#ffffff",
        fontFamily: "Inter, sans-serif",
        lineWidth: 1.5,
        dotRadius: 10,
        fretboardRadius: 16,
        baseFingerColor: "#2563eb",

        /* La PIEL DEL DIAPASÓN, que es obra (viaja al archivo exportado):
         *   "plano"   la rejilla de líneas de siempre, en `gridColor`
         *   "madera"  palisandro, trastes de metal, cejuela de hueso,
         *             incrustaciones de nácar y cuerdas entorchadas
         * Por defecto "plano": nadie ve cambiar su diagrama sin pedirlo. */
        fretboardSkin: "plano",

        // El color de las flechas del recorrido.
        pathColor: "#334155",

        /* Un color por grado, para las manchas de las tríadas. No son los
         * colores de intervalo del usuario: esos ya pintan el RELLENO del
         * punto, y una mancha del mismo color sería indistinguible. */
        triadRingColors: ["#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#2563eb", "#7c3aed", "#db2777"],

        // El color de cada grado. Antes vivía suelto en `DEFAULT_INTERVAL_COLORS`;
        // plegado aquí dentro hay UN solo objeto que normalizar y que guardar.
        intervalColors: {
            "1": "#dc2626", // Tónica
            "2": "#f97316", // Segundas
            "3": "#eab308", // Terceras
            "4": "#a855f7", // Cuartas
            "5": "#2563eb", // Quintas
            "6": "#06b6d4", // Sextas
            "7": "#db2777"  // Séptimas
        }
    };

    /* Los topes de los valores numéricos.
     *
     * MÁS ANCHOS QUE LOS SLIDERS del panel (8–13 y 1–4) a propósito: un preset
     * que venga de fuera con un radio de 15 no tiene por qué destrozarse, sólo
     * tiene que ser dibujable. Si algún día se amplía el `min`/`max` de un
     * `<input type="range">`, hay que ampliar esto a la vez o el clamp cortará
     * en silencio y el slider parecerá roto. */
    const LIMITES_ESTILO = {
        dotRadius: { min: 6, max: 16, def: 10 },
        lineWidth: { min: 0.5, max: 6, def: 1.5 },
        fretboardRadius: { min: 0, max: 40, def: 16 }
    };

    const PIELES_DIAPASON = ["plano", "madera"];

    function esHex(valor) {
        return typeof valor === "string" && /^#[0-9a-fA-F]{6}$/.test(valor);
    }

    function numeroSano(valor, limite) {
        // Vacío no es cero. `Number("")` y `Number(null)` dan 0, así que un
        // campo borrado acabaría clampado al mínimo en vez de volver a su
        // valor de fábrica, y el usuario vería el radio saltar a 6 sin haberlo
        // pedido.
        if (valor === null || valor === undefined || valor === "") return limite.def;
        const n = Number(valor);
        return Number.isFinite(n) ? clamp(n, limite.min, limite.max) : limite.def;
    }

    /* Sanea un estilo que viene de fuera: de `localStorage`, de un preset
     * importado o de una versión anterior.
     *
     * ESTO NO ES CELO. `dotRadius` alimenta `minFretHeight`, y `parseInt("")`
     * es `NaN`: ese NaN se propaga a todas las alturas de traste, cada
     * atributo `y` del SVG sale `NaN` y EL DIAGRAMA DESAPARECE SIN UN SOLO
     * ERROR EN CONSOLA. Es el fallo silencioso, que es el caro de encontrar.
     *
     * La salida se construye recorriendo las claves de `DEFAULT_STYLE`, así
     * que las claves desconocidas se caen solas. */
    function normalizeStyle(bruto) {
        const b = (bruto && typeof bruto === "object") ? bruto : {};
        const salida = {};

        Object.keys(DEFAULT_STYLE).forEach(clave => {
            const porDefecto = DEFAULT_STYLE[clave];

            if (LIMITES_ESTILO[clave]) {
                salida[clave] = numeroSano(b[clave], LIMITES_ESTILO[clave]);
                return;
            }
            if (clave === "fretboardSkin") {
                // Lista cerrada: sin esto caería en la rama de los colores y
                // `esHex("madera")` lo devolvería a "plano" en cada guardado.
                salida[clave] = PIELES_DIAPASON.includes(b[clave]) ? b[clave] : porDefecto;
                return;
            }
            if (clave === "fontFamily") {
                // Sólo que sea texto. NO se valida contra la lista del
                // desplegable: quien edite el JSON a mano para poner una
                // fuente que sí tiene instalada no debe ver cómo se la borran.
                salida[clave] = (typeof b[clave] === "string" && b[clave].trim()) ? b[clave] : porDefecto;
                return;
            }
            if (clave === "triadRingColors") {
                const lista = b[clave];
                salida[clave] = (Array.isArray(lista) && lista.length === 7 && lista.every(esHex))
                    ? lista.slice()
                    : porDefecto.slice();
                return;
            }
            if (clave === "intervalColors") {
                // Clave a clave, NUNCA `Object.assign` del bruto: un preset con
                // cuarenta claves basura las arrastraría para siempre.
                const dado = (b[clave] && typeof b[clave] === "object") ? b[clave] : {};
                salida[clave] = {};
                Object.keys(porDefecto).forEach(g => {
                    salida[clave][g] = esHex(dado[g]) ? dado[g] : porDefecto[g];
                });
                return;
            }
            salida[clave] = esHex(b[clave]) ? b[clave] : porDefecto;
        });

        return salida;
    }

    /* --- Guardado del estilo ----------------------------------------------
     *
     * Una sola clave con el estilo activo Y la lista de presets: se escriben
     * juntos, así que no pueden desincronizarse. Con dos claves, un fallo de
     * cuota a mitad dejaría una escrita y la otra no.
     *
     * Envuelto en `try/catch` por lo de siempre: ventana privada, cookies
     * bloqueadas, cuota llena. Como mucho se pierde el guardado, nunca la
     * sesión.
     *
     * El acceso vive aquí y no se toma prestado el de `song-core.js` porque
     * eso invertiría la capa: la geometría del diagrama pasaría a depender del
     * módulo de canción. Son seis líneas; la dependencia costaría más. */
    const STORAGE_STYLE = "kharo.style.v1";

    function loadStyleState() {
        const vacio = { activo: normalizeStyle({}), presets: [] };
        try {
            const bruto = global.localStorage.getItem(STORAGE_STYLE);
            if (!bruto) return vacio;
            const dato = JSON.parse(bruto);
            if (!dato || typeof dato !== "object") return vacio;
            return {
                activo: normalizeStyle(dato.activo),
                presets: Array.isArray(dato.presets)
                    ? dato.presets
                        .filter(p => p && p.id && typeof p.name === "string")
                        .map(p => ({ id: String(p.id), name: p.name, style: normalizeStyle(p.style) }))
                    : []
            };
        } catch (e) {
            return vacio;
        }
    }

    function saveStyleState(estado) {
        try {
            // Se normaliza ANTES de escribir, para que un bug futuro no pueda
            // dejar un radio corrupto en disco esperando a la próxima carga.
            const limpio = {
                activo: normalizeStyle(estado && estado.activo),
                presets: ((estado && estado.presets) || [])
                    .map(p => ({ id: String(p.id), name: String(p.name), style: normalizeStyle(p.style) }))
            };
            global.localStorage.setItem(STORAGE_STYLE, JSON.stringify(limpio));
            return true;
        } catch (e) {
            return false;
        }
    }

    /* --- API pública ----------------------------------------------------- */
    global.KharoRender = {
        DIAGRAM_WIDTH,
        MIN_FRET, MAX_FRET,
        MIN_NUM_FRETS, MAX_NUM_FRETS,
        computeDiagramGeometry,
        computeTitleFontSize,
        clampStartingFret,
        clampNumFrets,

        DEFAULT_STYLE,
        LIMITES_ESTILO,
        normalizeStyle,
        loadStyleState,
        saveStyleState
    };
})(typeof window !== "undefined" ? window : this);
