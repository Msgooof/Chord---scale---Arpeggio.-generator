/* ==========================================================================
 * KHARO STUDIO — NÚCLEO DE CANCIÓN
 * ==========================================================================
 *
 * Funciones puras: sin JSX, sin estado de React, sin tocar el DOM.
 * Se carga con un <script> normal y NO pasa por Babel, igual que sus dos
 * hermanos `theory-core.js` (la música) y `render-core.js` (el mástil).
 *
 * Qué es una canción aquí: una lista de SECCIONES (Intro, Verso, Coro), cada
 * una con su progresión de acordes medida en pulsos, su ritmo, su tempo, sus
 * repeticiones y su letra con los acordes colocados encima.
 *
 * Qué NO sabe este archivo:
 *   - qué notas suena un acorde   → eso lo resuelve theory-core
 *   - de qué color se pinta nada  → eso lo deciden theme.css y ui.css
 *   - cómo se dibuja un mástil    → eso es render-core
 *
 * Por qué vive fuera de index.html: la maquetación de la hoja necesita saber
 * cuánto ocupa cada cosa ANTES de dibujarla, para repartir las secciones en
 * páginas A4. Medir renderizando y leyendo el DOM sería un doble pase frágil
 * — el mismo motivo por el que existe `render-core.js`.
 * ========================================================================== */

(function (global) {
    "use strict";

    /* --- Versión del formato ---------------------------------------------
     * Va dentro de cada canción guardada. El día que el modelo cambie, esto
     * es lo que permite migrar lo que el usuario ya tenía escrito en vez de
     * perderlo.
     * -------------------------------------------------------------------- */
    const SONG_FORMAT_VERSION = 1;

    /* --- Compases ---------------------------------------------------------
     * `beatsPerBar` es la unidad de todo lo demás: la duración de un acorde
     * se mide en PULSOS, no en compases, para poder escribir un acorde que
     * dura medio compás o tres.
     * -------------------------------------------------------------------- */
    const TIME_SIGNATURES = [
        { id: "4/4", name: "4/4", beatsPerBar: 4 },
        { id: "3/4", name: "3/4 (vals)", beatsPerBar: 3 },
        { id: "2/4", name: "2/4", beatsPerBar: 2 },
        { id: "6/8", name: "6/8", beatsPerBar: 6 }
    ];

    const DEFAULT_TIME_SIGNATURE = "4/4";
    const DEFAULT_BPM = 100;

    function getTimeSignature(id) {
        return TIME_SIGNATURES.find(t => t.id === id) || TIME_SIGNATURES[0];
    }

    function beatsPerBar(timeSignatureId) {
        return getTimeSignature(timeSignatureId).beatsPerBar;
    }

    /* --- Patrones rítmicos ------------------------------------------------
     *
     * Son DATOS, no código: añadir un ritmo es añadir una entrada. Cada patrón
     * describe UN compás, y el motor lo repite mientras dure el acorde.
     *
     * Cada evento es una de dos cosas:
     *
     *   RASGUEO   { at, dir, zone, spread }
     *       at     en qué pulso cae. Admite fracciones: 1.5 es el "y" del 2.
     *       dir    "down" de la cuerda más grave a la más aguda, "up" al revés.
     *              Es lo que da el vaivén: un rasgueo hacia arriba suena
     *              distinto aunque sean las mismas notas.
     *       zone   "all" todas | "bass" las graves | "treble" las agudas.
     *              Separar bajo y acompañamiento es lo que convierte un
     *              rasgueo plano en un patrón que suena a algo.
     *       spread milisegundos entre cuerda y cuerda. Cero sería un piano.
     *
     *   PUNTEO    { at, pick }
     *       pick   índice de la nota dentro del acorde, 0 = la más grave.
     *              Si el acorde tiene menos notas, se da la vuelta con módulo,
     *              así que un patrón de arpegio funciona con tríadas y con
     *              acordes de seis cuerdas sin tocar nada.
     *
     * `gain` (0..1) es la fuerza del golpe: es lo que marca el acento.
     * ---------------------------------------------------------------------- */
    const RHYTHM_PATTERNS = [
        {
            id: "redonda",
            name: "Redonda (un golpe)",
            description: "Un rasgueo por acorde. Para escuchar la armonía sin ritmo de por medio.",
            beats: 4,
            events: [
                { at: 0, dir: "down", zone: "all", spread: 35, gain: 1 }
            ]
        },
        {
            id: "negras",
            name: "Negras (un golpe por pulso)",
            description: "Cuatro abajo. El patrón con el que se aprende todo.",
            beats: 4,
            events: [
                { at: 0, dir: "down", zone: "all", spread: 28, gain: 1 },
                { at: 1, dir: "down", zone: "all", spread: 28, gain: 0.75 },
                { at: 2, dir: "down", zone: "all", spread: 28, gain: 0.85 },
                { at: 3, dir: "down", zone: "all", spread: 28, gain: 0.75 }
            ]
        },
        {
            id: "pop",
            name: "Pop (D · D U · U D U)",
            description: "El rasgueo de guitarra de acompañamiento más usado que existe.",
            beats: 4,
            events: [
                { at: 0,   dir: "down", zone: "all",    spread: 26, gain: 1 },
                { at: 1,   dir: "down", zone: "all",    spread: 26, gain: 0.8 },
                { at: 1.5, dir: "up",   zone: "treble", spread: 20, gain: 0.55 },
                { at: 2.5, dir: "up",   zone: "treble", spread: 20, gain: 0.55 },
                { at: 3,   dir: "down", zone: "all",    spread: 26, gain: 0.8 },
                { at: 3.5, dir: "up",   zone: "treble", spread: 20, gain: 0.55 }
            ]
        },
        {
            id: "balada",
            name: "Balada (arpegio)",
            description: "Nota a nota: bajo y luego las agudas. Para lo lento.",
            beats: 4,
            events: [
                { at: 0,   pick: 0, gain: 1 },
                { at: 0.5, pick: 2, gain: 0.7 },
                { at: 1,   pick: 3, gain: 0.8 },
                { at: 1.5, pick: 4, gain: 0.7 },
                { at: 2,   pick: 1, gain: 0.9 },
                { at: 2.5, pick: 3, gain: 0.7 },
                { at: 3,   pick: 4, gain: 0.8 },
                { at: 3.5, pick: 2, gain: 0.6 }
            ]
        },
        {
            id: "vals",
            name: "Vals (bajo · acorde · acorde)",
            description: "Tres pulsos: el bajo cae en el uno y el acorde en los otros dos.",
            beats: 3,
            events: [
                { at: 0, pick: 0, gain: 1 },
                { at: 1, dir: "down", zone: "treble", spread: 22, gain: 0.7 },
                { at: 2, dir: "down", zone: "treble", spread: 22, gain: 0.7 }
            ]
        },
        {
            id: "reggae",
            name: "Reggae (a contratiempo)",
            description: "Sólo suena entre pulso y pulso. El silencio es la mitad del patrón.",
            beats: 4,
            events: [
                { at: 0.5, dir: "up", zone: "treble", spread: 16, gain: 0.9 },
                { at: 1.5, dir: "up", zone: "treble", spread: 16, gain: 0.9 },
                { at: 2.5, dir: "up", zone: "treble", spread: 16, gain: 0.9 },
                { at: 3.5, dir: "up", zone: "treble", spread: 16, gain: 0.9 }
            ]
        }
    ];

    const DEFAULT_RHYTHM = "negras";

    /* --- Patrones escritos por el usuario ---------------------------------
     *
     * Los de fábrica de arriba son listas de eventos. Los que escribe el
     * usuario son una REJILLA, que es como se lee y se escribe un rasgueo en
     * papel: casillas de semicorchea con la flecha que toca en cada una.
     *
     * `gridToEvents` traduce la rejilla a los mismos eventos que el motor ya
     * consume, así que la reproducción no distingue unos de otros y no hubo
     * que tocarla.
     * -------------------------------------------------------------------- */
    /* CORCHEAS por defecto, no semicorcheas.
     *
     * Con cuatro casillas por pulso, un compás de 4/4 son dieciséis casillas de
     * treinta píxeles: medio metro de rejilla para escribir un rasgueo que casi
     * siempre va en corcheas. Con dos, ocho casillas. Las semicorcheas siguen
     * estando —se cambia con un interruptor— pero dejan de ser el precio de
     * entrada.
     *
     * `gridToEvents` ya leía `subdivision` del patrón, así que el motor de
     * sonido no se entera del cambio. */
    const SUBDIVISION_POR_DEFECTO = 2; // corcheas

    /* Cambiar la resolución de una rejilla sin perder lo escrito.
     *
     * De corcheas a semicorcheas cada golpe se queda donde estaba y se abren
     * huecos entre medias; al revés, se conserva lo que cae en corchea y se
     * avisa de lo que no cabe. Rehacer el patrón a mano cada vez que se cambia
     * de resolución sería peor que no ofrecer el cambio. */
    function reescalarRejilla(pattern, nuevaSub) {
        const sub = pattern.subdivision || SUBDIVISION_POR_DEFECTO;
        if (nuevaSub === sub) return { pattern, perdidas: 0 };

        const celdas = new Array(pattern.beats * nuevaSub).fill(null);
        let perdidas = 0;

        (pattern.cells || []).forEach((celda, i) => {
            if (!celda) return;
            const posicion = (i / sub) * nuevaSub;         // en casillas nuevas
            if (Number.isInteger(posicion) && posicion < celdas.length) {
                celdas[posicion] = { ...celda };
            } else {
                perdidas++;
            }
        });

        return {
            pattern: { ...pattern, subdivision: nuevaSub, cells: celdas },
            perdidas
        };
    }

    function createStrumPattern(nombre, beats) {
        const pulsos = beats || 4;
        return {
            id: newId("rit"),
            name: nombre || "Mi rasgueo",
            beats: pulsos,
            subdivision: SUBDIVISION_POR_DEFECTO,
            propio: true,
            cells: new Array(pulsos * SUBDIVISION_POR_DEFECTO).fill(null)
        };
    }

    /* La rotación de una casilla al tocarla. Un solo gesto para recorrer todos
     * los estados es lo único que funciona con el dedo; con un menú por casilla
     * escribir un compás serían veinte toques. */
    const CICLO_CELDA = [
        null,
        { dir: "down", accent: false, muted: false },
        { dir: "up", accent: false, muted: false },
        { dir: "down", accent: true, muted: false },
        { dir: "up", accent: true, muted: false },
        { dir: "down", accent: false, muted: true }
    ];

    function nextCellState(celda, atras) {
        const indice = CICLO_CELDA.findIndex(c =>
            (c === null && celda === null) ||
            (c && celda && c.dir === celda.dir && c.accent === celda.accent && c.muted === celda.muted)
        );
        const desde = indice === -1 ? 0 : indice;
        const paso = atras ? -1 : 1;
        const siguiente = (desde + paso + CICLO_CELDA.length) % CICLO_CELDA.length;
        const valor = CICLO_CELDA[siguiente];
        return valor ? { ...valor } : null;
    }

    function gridToEvents(pattern) {
        const sub = pattern.subdivision || SUBDIVISION_POR_DEFECTO;
        const eventos = [];

        (pattern.cells || []).forEach((celda, i) => {
            if (!celda) return;

            eventos.push({
                at: i / sub,
                dir: celda.dir,
                // Hacia abajo suena el acorde entero; hacia arriba, sólo las
                // agudas. Es lo que hace que un rasgueo suene a rasgueo y no a
                // acordeón, y no hace falta que nadie lo decida casilla a casilla.
                zone: celda.dir === "up" ? "treble" : "all",
                // Un apagado es un golpe seco: se rasguea igual de rápido pero
                // no suena la nota, sólo el ataque.
                spread: celda.muted ? 12 : (celda.dir === "up" ? 20 : 26),
                gain: celda.muted ? 0.35 : (celda.accent ? 1 : 0.8),
                duration: celda.muted ? 0.12 : null,
                // Un apagado es un golpe seco. Antes eso sólo se traducía a
                // ganancia y duración, así que quien reproduce no podía
                // distinguirlo de un rasgueo flojo — y para sonar percusivo hay
                // que saber cuál es cuál.
                muted: !!celda.muted,
                accent: !!celda.accent
            });
        });

        return eventos;
    }

    /* Busca primero entre los patrones propios: si el usuario ha escrito uno,
     * es el que quiere. `propios` es la lista que viaja dentro de la canción. */
    function getRhythm(rhythmId, propios) {
        const propio = (propios || []).find(r => r.id === rhythmId);
        if (propio) return propio;
        return RHYTHM_PATTERNS.find(r => r.id === rhythmId) || RHYTHM_PATTERNS[1];
    }

    // Los eventos de un patrón, venga de la rejilla o de la lista de fábrica.
    function rhythmEvents(pattern) {
        return pattern.cells ? gridToEvents(pattern) : (pattern.events || []);
    }

    /* --- Modelo -----------------------------------------------------------
     * Los identificadores llevan marca de tiempo y un trozo aleatorio: dos
     * acordes guardados en el mismo milisegundo (pulsando rápido) chocarían
     * con sólo la fecha.
     * -------------------------------------------------------------------- */
    function newId(prefijo) {
        return prefijo + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    /* Un acorde guardado es una FOTO del mástil, no sólo un nombre.
     * Guardar "Am" no basta: hay veinte formas de tocar un Am, y la hoja tiene
     * que dibujar la que el usuario eligió y el reproductor sonar esa misma. */
    function createChordSnapshot(estado) {
        return {
            id: newId("ch"),
            name: estado.name || "Acorde",
            instrument: estado.instrument,
            tuning: (estado.tuning || []).slice(),
            tuningMidi: estado.tuningMidi ? estado.tuningMidi.slice() : null,
            numFrets: estado.numFrets,
            startingFret: estado.startingFret,
            dots: (estado.dots || []).map(d => ({ ...d })),
            barres: (estado.barres || []).map(b => ({ ...b })),
            stringStates: (estado.stringStates || []).slice()
        };
    }

    function createSection(nombre) {
        return {
            id: newId("sec"),
            name: nombre || "Parte",
            repeats: 1,
            bpm: null,        // null = hereda el de la canción
            rhythmId: null,   // null = hereda el de la canción
            bars: [],         // [{ chordId, beats }]
            lines: [],        // [{ chordLine, lyric }]
            notes: ""
        };
    }

    function createSong(titulo) {
        return {
            version: SONG_FORMAT_VERSION,
            /* Una canción no tenía IDENTIDAD. Daba igual mientras sólo existiera
             * una —la app guardaba `[song]` y leía `[0]`—, pero en cuanto hay
             * varias hace falta poder decir «esta» sin depender del título, que
             * el usuario cambia y repite. */
            id: newId("song"),
            title: titulo || "Canción sin título",

            /* La tonalidad tiene dos formas de existir:
             *
             *   ELEGIDA   `keyRoot` (0-11) + `keyScale`. La app la conoce y
             *             puede razonar sobre ella: sacar los grados, decir qué
             *             acordes pegan, montar la hoja de teoría.
             *   LIBRE     `keyRoot` en null y `key` con lo que quieras escribir.
             *             La hoja de teoría se apaga, porque generar teoría
             *             sobre una tonalidad que no se sabe cuál es sería
             *             inventarla.
             */
            key: "",
            keyRoot: null,
            keyScale: "major",
            showTheorySheet: false,

            // Qué se escribe dentro de cada punto de los diagramas: el dedo, el
            // nombre de la nota o el grado. Es el mismo trío que ofrece el
            // estudio, y ahora sí son tres: «grados» faltaba.
            chordLabels: "dedos",

            /* Respecto a QUÉ se cuenta el grado. Son dos preguntas distintas y
             * las dos se hacen:
             *   "acorde"     el grado dentro del propio acorde — 1, 3, 5, 7.
             *                Sirve para ver la digitación por dentro.
             *   "tonalidad"  el grado dentro de la tonalidad de la canción.
             *                Sirve para ver por qué ese acorde está ahí.
             * Sin tonalidad elegida sólo tiene sentido la primera. */
            degreeBasis: "acorde",

            /* Cómo se lee cada acorde EN ESTA TONALIDAD.
             *   { [chordId]: { funcion, nota } }
             *
             * Va aquí y no en el acorde de la biblioteca porque la biblioteca
             * es de TODAS las canciones: un Am es vi en Do y ii en Sol, así que
             * la lectura no es del acorde, es de la canción.
             *
             * Y no va en el compás porque el mismo acorde puede estar en ocho
             * compases y la lectura es la misma en los ocho. Además
             * `normalizeSong` reconstruye cada compás con un `map` que sólo
             * conserva `chordId` y `beats`. */
            harmony: {},
            bpm: DEFAULT_BPM,
            timeSignature: DEFAULT_TIME_SIGNATURE,
            rhythmId: DEFAULT_RHYTHM,
            // Los rasgueos escritos por el usuario viajan DENTRO de la canción:
            // si vivieran aparte, una canción compartida sonaría con otro ritmo.
            customRhythms: [],
            notes: "",
            sections: [createSection("Intro")]
        };
    }

    /* --- La letra, alineada por columnas ----------------------------------
     *
     * Un bloque de letra son DOS líneas de texto:
     *
     *      chordLine   "        C         G"
     *      lyric       "Cuando me voy de aquí"
     *
     * El acorde cae sobre la columna en la que empieza su nombre. Lo que se
     * guarda es esa COLUMNA (un índice de carácter), no una posición en
     * píxeles: por eso el editor y la hoja usan tipografía monoespaciada, que
     * es lo único que hace que columna × ancho-de-carácter sea exacto. Con una
     * proporcional, la "i" y la "m" desalinearían el acorde de su sílaba.
     * -------------------------------------------------------------------- */

    // "    C   G" -> [{ col: 4, name: "C" }, { col: 8, name: "G" }]
    function parseChordLine(chordLine) {
        const marcas = [];
        if (!chordLine) return marcas;

        const regex = /\S+/g;
        let match;
        while ((match = regex.exec(chordLine)) !== null) {
            marcas.push({ col: match.index, name: match[0] });
        }
        return marcas;
    }

    // El camino de vuelta: de marcas a línea de texto. Si dos acordes se
    // pisan, el segundo se corre a la derecha en vez de tragarse al primero.
    function buildChordLine(marcas) {
        let linea = "";
        marcas
            .slice()
            .sort((a, b) => a.col - b.col)
            .forEach(marca => {
                const col = Math.max(marca.col, linea.length ? linea.length + 1 : 0);
                linea = linea.padEnd(col, " ") + marca.name;
            });
        return linea;
    }

    // Meter un acorde donde está el cursor. Es lo que evita tener que contar
    // espacios a mano, que es donde la gente abandona este formato.
    function insertChordAtColumn(chordLine, col, nombre) {
        const marcas = parseChordLine(chordLine).filter(m => m.col !== col);
        marcas.push({ col: Math.max(0, col | 0), name: nombre });
        return buildChordLine(marcas);
    }

    function removeChordAtColumn(chordLine, col) {
        return buildChordLine(parseChordLine(chordLine).filter(m => m.col !== col));
    }

    /* Deja el bloque listo para dibujar: cada acorde con su columna y la
     * sílaba sobre la que cae. `beyondLyric` avisa de los acordes que quedan
     * más allá del final de la letra — pasa al acortar un verso, y si no se
     * marcan se dibujan flotando en el vacío sin que nadie entienda por qué. */
    function alignLyricBlock(bloque) {
        const lyric = (bloque && bloque.lyric) || "";
        const marcas = parseChordLine(bloque && bloque.chordLine).map(m => ({
            col: m.col,
            name: m.name,
            syllable: lyric.slice(m.col, m.col + m.name.length),
            beyondLyric: m.col >= lyric.length
        }));
        return { lyric, marks: marcas };
    }

    // Ancho en caracteres de un bloque: manda la más larga de las dos líneas,
    // porque un acorde al final puede sobresalir de la letra.
    function blockColumns(bloque) {
        const lyric = (bloque && bloque.lyric) || "";
        const chordLine = (bloque && bloque.chordLine) || "";
        return Math.max(lyric.length, chordLine.length);
    }

    /* --- Tiempos ---------------------------------------------------------- */

    function sectionBeats(section) {
        return (section.bars || []).reduce((total, bar) => total + (bar.beats || 0), 0);
    }

    // Con las repeticiones ya aplicadas.
    function sectionTotalBeats(section) {
        return sectionBeats(section) * Math.max(1, section.repeats || 1);
    }

    function songBeats(song) {
        return (song.sections || []).reduce((total, s) => total + sectionTotalBeats(s), 0);
    }

    function beatsToSeconds(beats, bpm) {
        return (beats * 60) / (bpm || DEFAULT_BPM);
    }

    // Duración de la canción entera en segundos, respetando el tempo propio
    // de cada sección.
    function songSeconds(song) {
        return (song.sections || []).reduce((total, section) => {
            const bpm = section.bpm || song.bpm || DEFAULT_BPM;
            return total + beatsToSeconds(sectionTotalBeats(section), bpm);
        }, 0);
    }

    function formatDuration(segundos) {
        const total = Math.max(0, Math.round(segundos));
        const min = Math.floor(total / 60);
        const seg = total % 60;
        return min + ":" + String(seg).padStart(2, "0");
    }

    /* --- Expansión para reproducir ----------------------------------------
     *
     * Convierte la canción en una lista plana y ordenada de compases con su
     * momento exacto en segundos. Las repeticiones se despliegan aquí: al
     * reproductor le llega una secuencia sin bucles que interpretar.
     *
     * Cada elemento conserva de dónde viene (`sectionId`, `repeat`, `barIndex`)
     * para poder resaltar en pantalla por dónde va la canción.
     * -------------------------------------------------------------------- */
    function expandSong(song) {
        const salida = [];
        let tiempo = 0;

        (song.sections || []).forEach(section => {
            const bpm = section.bpm || song.bpm || DEFAULT_BPM;
            const rhythmId = section.rhythmId || song.rhythmId || DEFAULT_RHYTHM;
            const repeticiones = Math.max(1, section.repeats || 1);

            for (let repeat = 0; repeat < repeticiones; repeat++) {
                (section.bars || []).forEach((bar, barIndex) => {
                    const beats = bar.beats || 0;
                    if (beats <= 0) return;

                    salida.push({
                        sectionId: section.id,
                        sectionName: section.name,
                        repeat,
                        barIndex,
                        chordId: bar.chordId,
                        beats,
                        bpm,
                        rhythmId,
                        startSeconds: tiempo,
                        durationSeconds: beatsToSeconds(beats, bpm)
                    });

                    tiempo += beatsToSeconds(beats, bpm);
                });
            }
        });

        return salida;
    }

    /* --- Los golpes de un compás ------------------------------------------
     *
     * Despliega el patrón sobre los pulsos que dure el acorde. Si el acorde
     * dura más que el patrón, el patrón se repite; si dura menos, se corta.
     * Así un mismo ritmo vale para un acorde de dos pulsos y para uno de ocho.
     *
     * Devuelve tiempos en SEGUNDOS relativos al inicio del compás, que es lo
     * que necesita el planificador de audio.
     * -------------------------------------------------------------------- */
    function rhythmEventsForBar(rhythmId, beats, bpm, propios) {
        const patron = getRhythm(rhythmId, propios);
        const cicloBeats = patron.beats || 4;
        const eventos = [];
        const listaEventos = rhythmEvents(patron);

        for (let inicio = 0; inicio < beats; inicio += cicloBeats) {
            listaEventos.forEach(evento => {
                const beatAbsoluto = inicio + evento.at;
                if (beatAbsoluto >= beats) return; // se sale del acorde

                eventos.push({
                    atSeconds: beatsToSeconds(beatAbsoluto, bpm),
                    dir: evento.dir || null,
                    zone: evento.zone || "all",
                    pick: typeof evento.pick === "number" ? evento.pick : null,
                    spread: (evento.spread || 0) / 1000,
                    gain: evento.gain === undefined ? 1 : evento.gain,
                    // Null = lo que dure por defecto. Sólo los apagados la fijan.
                    duration: evento.duration || null,
                    /* Este `forEach` copia campo a campo: lo que no esté escrito
                     * aquí NO llega al reproductor por mucho que lo ponga el
                     * patrón. Es el cuello de botella de toda la cadena. */
                    muted: !!evento.muted,
                    accent: !!evento.accent
                });
            });
        }

        return eventos.sort((a, b) => a.atSeconds - b.atSeconds);
    }

    /* Qué notas del acorde entran en un golpe.
     *
     * `notas` viene ordenada de grave a aguda. La frontera entre bajo y agudas
     * se pone a un tercio: con seis cuerdas son las dos graves, con una tríada
     * es sólo la primera. Es una regla aproximada, pero es la que hace que el
     * mismo patrón suene bien en guitarra, en bajo y en ukelele sin
     * configurar nada. */
    function notesForEvent(notas, evento) {
        if (!notas || notas.length === 0) return [];

        if (evento.pick !== null && evento.pick !== undefined) {
            return [notas[evento.pick % notas.length]];
        }

        const corte = Math.max(1, Math.round(notas.length / 3));
        let seleccion;
        if (evento.zone === "bass") seleccion = notas.slice(0, corte);
        else if (evento.zone === "treble") seleccion = notas.slice(corte);
        else seleccion = notas.slice();

        if (seleccion.length === 0) seleccion = notas.slice();

        // Hacia arriba se rasguea de la aguda a la grave.
        return evento.dir === "up" ? seleccion.slice().reverse() : seleccion;
    }

    /* --- Guardado ---------------------------------------------------------
     *
     * localStorage puede lanzar excepción sin que haya nada roto: en ventana
     * privada, con las cookies bloqueadas o con la cuota llena. Se envuelve
     * todo para que como mucho se pierda el guardado, nunca la sesión.
     * -------------------------------------------------------------------- */
    const STORAGE_SONGS = "kharo.songs.v1";
    const STORAGE_CHORDS = "kharo.chords.v1";
    /* El mástil del estudio. Era lo ÚNICO que no sobrevivía a un F5: se podía
     * pasar media hora trazando una escala y perderla al recargar. Guarda la
     * misma foto que alimenta el deshacer, así que no hay dos ideas distintas
     * de «lo que es tu trabajo». */
    const STORAGE_STUDIO = "kharo.studio.v1";

    function loadJSON(clave, porDefecto) {
        try {
            const bruto = global.localStorage.getItem(clave);
            if (!bruto) return porDefecto;
            const dato = JSON.parse(bruto);
            return dato === null || dato === undefined ? porDefecto : dato;
        } catch (e) {
            return porDefecto;
        }
    }

    function saveJSON(clave, valor) {
        try {
            global.localStorage.setItem(clave, JSON.stringify(valor));
            return true;
        } catch (e) {
            return false;
        }
    }

    function loadSongs() { return loadJSON(STORAGE_SONGS, []); }
    function saveSongs(songs) { return saveJSON(STORAGE_SONGS, songs); }
    function loadChordLibrary() { return loadJSON(STORAGE_CHORDS, []); }
    function saveChordLibrary(acordes) { return saveJSON(STORAGE_CHORDS, acordes); }
    function loadStudio() { return loadJSON(STORAGE_STUDIO, null); }
    function saveStudio(foto) { return saveJSON(STORAGE_STUDIO, foto); }

    /* Una canción que llega de fuera (un archivo importado) puede venir de
     * cualquier versión, o directamente rota. Se normaliza contra el modelo
     * actual en vez de confiar en ella. */
    function normalizeSong(bruto) {
        const base = createSong();
        if (!bruto || typeof bruto !== "object") return base;

        const song = {
            version: SONG_FORMAT_VERSION,
            // Las canciones guardadas antes de que esto existiera no traen id:
            // se les da uno al leerlas, y así la migración no necesita paso.
            id: typeof bruto.id === "string" && bruto.id ? bruto.id : base.id,
            title: typeof bruto.title === "string" ? bruto.title : base.title,
            key: typeof bruto.key === "string" ? bruto.key : "",
            keyRoot: Number.isInteger(bruto.keyRoot) && bruto.keyRoot >= 0 && bruto.keyRoot < 12
                ? bruto.keyRoot
                : null,
            keyScale: typeof bruto.keyScale === "string" ? bruto.keyScale : "major",
            showTheorySheet: !!bruto.showTheorySheet,
            // Tres modos, no dos. Antes cualquier valor desconocido colapsaba a
            // "dedos", así que «grados» no habría sobrevivido a un guardado.
            chordLabels: ["notas", "grados"].indexOf(bruto.chordLabels) !== -1 ? bruto.chordLabels : "dedos",
            degreeBasis: bruto.degreeBasis === "tonalidad" ? "tonalidad" : "acorde",
            harmony: (bruto.harmony && typeof bruto.harmony === "object")
                ? Object.keys(bruto.harmony).reduce((acc, id) => {
                    const v = bruto.harmony[id];
                    if (v && typeof v === "object") {
                        acc[String(id)] = {
                            funcion: typeof v.funcion === "string" ? v.funcion : "",
                            nota: typeof v.nota === "string" ? v.nota : ""
                        };
                    }
                    return acc;
                }, {})
                : {},
            bpm: Number(bruto.bpm) > 0 ? Number(bruto.bpm) : DEFAULT_BPM,
            timeSignature: getTimeSignature(bruto.timeSignature).id,
            rhythmId: typeof bruto.rhythmId === "string" ? bruto.rhythmId : DEFAULT_RHYTHM,
            customRhythms: Array.isArray(bruto.customRhythms)
                ? bruto.customRhythms
                    .filter(r => r && r.id && Array.isArray(r.cells))
                    .map(r => ({
                        id: String(r.id),
                        name: typeof r.name === "string" ? r.name : "Mi rasgueo",
                        beats: Number(r.beats) > 0 ? Number(r.beats) : 4,
                        subdivision: Number(r.subdivision) > 0 ? Number(r.subdivision) : SUBDIVISION_POR_DEFECTO,
                        propio: true,
                        cells: r.cells.map(c => c && c.dir
                            ? { dir: c.dir === "up" ? "up" : "down", accent: !!c.accent, muted: !!c.muted }
                            : null)
                    }))
                : [],
            notes: typeof bruto.notes === "string" ? bruto.notes : "",
            sections: []
        };

        const secciones = Array.isArray(bruto.sections) ? bruto.sections : [];
        song.sections = secciones.map(s => ({
            id: s && s.id ? String(s.id) : newId("sec"),
            name: s && typeof s.name === "string" ? s.name : "Parte",
            repeats: Number(s && s.repeats) > 0 ? Number(s.repeats) : 1,
            bpm: Number(s && s.bpm) > 0 ? Number(s.bpm) : null,
            rhythmId: s && typeof s.rhythmId === "string" ? s.rhythmId : null,
            bars: Array.isArray(s && s.bars)
                ? s.bars
                    .filter(b => b && b.chordId)
                    .map(b => ({ chordId: String(b.chordId), beats: Number(b.beats) > 0 ? Number(b.beats) : 4 }))
                : [],
            lines: Array.isArray(s && s.lines)
                ? s.lines.map(l => ({
                    chordLine: l && typeof l.chordLine === "string" ? l.chordLine : "",
                    lyric: l && typeof l.lyric === "string" ? l.lyric : ""
                }))
                : [],
            notes: s && typeof s.notes === "string" ? s.notes : ""
        }));

        if (song.sections.length === 0) song.sections = [createSection("Intro")];
        return song;
    }

    /* --- Paginación de la hoja --------------------------------------------
     *
     * Reparte las secciones en páginas A4 midiendo con números, no con el DOM.
     * `medidas` trae los altos en píxeles de cada pieza, que los pone quien
     * dibuja: así el cálculo no depende de la maqueta concreta.
     *
     * Una sección se parte entre páginas si no cabe entera — cortar por una
     * línea de letra es normal en un cancionero; dejar media página en blanco
     * para no cortar, no.
     * -------------------------------------------------------------------- */
    function paginateSong(song, medidas, bloquesIniciales) {
        const m = Object.assign({
            pageHeight: 1188,
            marginTop: 150,
            marginBottom: 60,
            sectionHeader: 34,
            barsRow: 46,
            lyricBlock: 42,
            sectionGap: 18,
            notesLine: 28
        }, medidas || {});

        const alturaUtil = m.pageHeight - m.marginTop - m.marginBottom;
        const paginas = [];
        let pagina = { bloques: [] };
        let usado = 0;

        function nuevaPagina() {
            paginas.push(pagina);
            pagina = { bloques: [] };
            usado = 0;
        }

        function colocar(bloque, alto) {
            if (usado + alto > alturaUtil && pagina.bloques.length > 0) nuevaPagina();
            pagina.bloques.push(bloque);
            usado += alto;
        }

        // Lo que va antes de las secciones y también ocupa: el diccionario de
        // acordes de la portada. Cada uno trae su propio alto porque sólo quien
        // dibuja sabe cuánto mide.
        (bloquesIniciales || []).forEach(bloque => {
            colocar(bloque, bloque.alto || 0);
        });

        (song.sections || []).forEach(section => {
            colocar({ tipo: "seccion", section }, m.sectionHeader);

            if ((section.bars || []).length > 0) {
                /* `barsRow` puede ser un número o una FUNCIÓN de la sección: la
                 * progresión ocupa las filas que necesite, y cuántas son sólo lo
                 * sabe quien la dispone. El alto viaja dentro del bloque, igual
                 * que en el diccionario de acordes, para que quien dibuja avance
                 * exactamente lo que se reservó aquí. */
                const alto = typeof m.barsRow === "function" ? m.barsRow(section) : m.barsRow;
                colocar({ tipo: "compases", section, alto: alto }, alto);
            }

            (section.lines || []).forEach((line, indice) => {
                colocar({ tipo: "letra", section, line, indice }, m.lyricBlock);
            });

            if (section.notes) {
                colocar({ tipo: "nota", section }, m.notesLine);
            }

            usado += m.sectionGap;
        });

        if (pagina.bloques.length > 0) paginas.push(pagina);
        if (paginas.length === 0) paginas.push({ bloques: [] });

        return paginas;
    }

    /* --- EJERCICIOS -------------------------------------------------------
     *
     * Otra cosa distinta de una canción: una ficha de técnica. Un ejercicio es
     * una lista de PASOS, y cada paso es una foto del mástil con su recorrido
     * —qué notas y en qué orden—, más la velocidad a la que se practica.
     *
     * Comparte modelo mental con la canción (tempo, repetir, exportar a A4) y
     * por eso vive aquí, pero no comparte estructura: un ejercicio no tiene
     * letra, ni acordes por compases, ni secciones.
     * -------------------------------------------------------------------- */
    const SUBDIVISIONES = [
        { id: "negras", name: "Negras", porPulso: 1 },
        { id: "corcheas", name: "Corcheas", porPulso: 2 },
        { id: "tresillos", name: "Tresillos", porPulso: 3 },
        { id: "semicorcheas", name: "Semicorcheas", porPulso: 4 }
    ];

    function getSubdivision(id) {
        return SUBDIVISIONES.find(x => x.id === id) || SUBDIVISIONES[1];
    }

    // Segundos por nota: es lo que el usuario llama «velocidad de la digitación».
    function noteSeconds(bpm, subdivisionId) {
        return 60 / ((bpm || DEFAULT_BPM) * getSubdivision(subdivisionId).porPulso);
    }

    function createExercise(titulo) {
        return {
            version: SONG_FORMAT_VERSION,
            id: newId("ej"),
            title: titulo || "Ejercicio sin título",
            notes: "",
            bpm: 80,
            subdivision: "corcheas",
            loop: true,
            pasos: []
        };
    }

    /* Un paso: la foto del mástil tal y como estaba, con su recorrido.
     * Se guarda TODO lo que hace falta para reconstruirlo —instrumento,
     * afinación, ventana— porque un ejercicio se abre semanas después y el
     * mástil puede estar en otra cosa. */
    function createExerciseStep(estado) {
        return {
            id: newId("paso"),
            tipo: estado.tipo || "escala",
            nombre: estado.nombre || "Paso",
            instrument: estado.instrument,
            tuning: (estado.tuning || []).slice(),
            tuningMidi: estado.tuningMidi ? estado.tuningMidi.slice() : null,
            startingFret: estado.startingFret,
            numFrets: estado.numFrets,
            /* En un paso LIBRE no hay tónica ni preset: las notas las elegiste
             * tú y no salen de ninguna fórmula. Se guardan en `null` en vez de
             * inventar un 0 y una escala mayor, que luego colorearían una
             * tónica que nadie ha pedido. */
            root: Number.isInteger(estado.root) ? estado.root : null,
            presetId: typeof estado.presetId === "string" ? estado.presetId : null,
            // `tap` va POR NOTA y no como un ajuste del paso: así
            // sobrevive a editar el recorrido a mano.
            path: (estado.path || []).map(pos => ({ s: pos.s, f: pos.f, tap: !!pos.tap })),
            sweep: !!estado.sweep,

            /* La mancha de la agrupación, cuando el paso viene de una tríada de
             * la tonalidad. Sólo un color literal.
             *
             * Con ella el paso se dibuja COMO SE VEÍA en el mástil: envuelto y
             * sin flechas. Y sin flechas a propósito — de una forma no importa
             * en qué orden se toca, importa dónde está la mano; el recorrido es
             * para las escalas. */
            envolvente: estado.envolvente && estado.envolvente.color
                ? { color: String(estado.envolvente.color) }
                : null,

            repeticiones: 1
        };
    }

    // Cuánto dura el ejercicio entero, con las repeticiones de cada paso.
    function exerciseSeconds(exercise) {
        const porNota = noteSeconds(exercise.bpm, exercise.subdivision);
        return (exercise.pasos || []).reduce(
            (total, paso) => total + paso.path.length * Math.max(1, paso.repeticiones || 1) * porNota,
            0
        );
    }

    function normalizeExercise(bruto) {
        const base = createExercise();
        if (!bruto || typeof bruto !== "object") return base;

        return {
            version: SONG_FORMAT_VERSION,
            id: bruto.id ? String(bruto.id) : base.id,
            title: typeof bruto.title === "string" ? bruto.title : base.title,
            notes: typeof bruto.notes === "string" ? bruto.notes : "",
            bpm: Number(bruto.bpm) > 0 ? Number(bruto.bpm) : 80,
            subdivision: getSubdivision(bruto.subdivision).id,
            loop: bruto.loop !== false,
            pasos: Array.isArray(bruto.pasos)
                ? bruto.pasos.filter(x => x && Array.isArray(x.path)).map(x => ({
                    id: x.id ? String(x.id) : newId("paso"),
                    tipo: ["arpegio", "libre"].indexOf(x.tipo) !== -1 ? x.tipo : "escala",
                    nombre: typeof x.nombre === "string" ? x.nombre : "Paso",
                    instrument: x.instrument,
                    tuning: Array.isArray(x.tuning) ? x.tuning.slice() : [],
                    tuningMidi: Array.isArray(x.tuningMidi) ? x.tuningMidi.slice() : null,
                    startingFret: Number(x.startingFret) > 0 ? Number(x.startingFret) : 1,
                    numFrets: Number(x.numFrets) > 0 ? Number(x.numFrets) : 5,
                    // `null` es un valor legítimo —un paso libre no tiene tónica
                    // ni preset— y antes se colapsaba a 0 y a "major".
                    root: Number.isInteger(x.root) ? x.root : null,
                    presetId: typeof x.presetId === "string" ? x.presetId : null,
                    path: x.path.map(pos => ({ s: Number(pos.s) || 0, f: Number(pos.f) || 0, tap: !!pos.tap })),
                    sweep: !!x.sweep,
                    envolvente: x.envolvente && typeof x.envolvente.color === "string"
                        ? { color: x.envolvente.color }
                        : null,
                    repeticiones: Number(x.repeticiones) > 0 ? Number(x.repeticiones) : 1
                }))
                : []
        };
    }

    const STORAGE_EXERCISES = "kharo.exercises.v1";
    function loadExercises() { return loadJSON(STORAGE_EXERCISES, []); }
    function saveExercises(lista) { return saveJSON(STORAGE_EXERCISES, lista); }

    /* --- API pública ----------------------------------------------------- */
    global.KharoSong = {
        SONG_FORMAT_VERSION,
        TIME_SIGNATURES,
        DEFAULT_TIME_SIGNATURE,
        DEFAULT_BPM,
        RHYTHM_PATTERNS,
        DEFAULT_RHYTHM,

        newId,
        getTimeSignature,
        beatsPerBar,
        getRhythm,
        rhythmEvents,
        createStrumPattern,
        nextCellState,
        // El ciclo, expuesto: el menú de clic derecho pinta un botón por estado
        // y tiene que ser LA MISMA lista que recorre el clic izquierdo. Con dos
        // listas, añadir un estado dejaría el menú y el ciclo diciendo cosas
        // distintas.
        CICLO_CELDA,
        gridToEvents,
        reescalarRejilla,

        createChordSnapshot,
        createSection,
        createSong,
        normalizeSong,

        parseChordLine,
        buildChordLine,
        insertChordAtColumn,
        removeChordAtColumn,
        alignLyricBlock,
        blockColumns,

        sectionBeats,
        sectionTotalBeats,
        songBeats,
        beatsToSeconds,
        songSeconds,
        formatDuration,

        expandSong,
        rhythmEventsForBar,
        notesForEvent,

        paginateSong,

        SUBDIVISIONES,
        getSubdivision,
        noteSeconds,
        createExercise,
        createExerciseStep,
        exerciseSeconds,
        normalizeExercise,
        loadExercises,
        saveExercises,

        loadSongs,
        saveSongs,
        loadChordLibrary,
        saveChordLibrary,
        loadStudio,
        saveStudio
    };
})(typeof window !== "undefined" ? window : this);
