/* ==========================================================================
 * KHARO STUDIO — NÚCLEO DE TEORÍA MUSICAL
 * ==========================================================================
 *
 * Funciones puras: sin JSX, sin estado de React, sin tocar el DOM.
 * Por eso este archivo se carga con un <script> normal y NO pasa por Babel.
 *
 * Todo lo que sepa de música vive aquí. La interfaz (index.html) lo consume
 * a través del objeto global `KharoTheory`. Cuando se añada el módulo de
 * piano, consumirá este mismo núcleo: la teoría no sabe si el instrumento
 * tiene cuerdas o teclas.
 * ========================================================================== */

(function (global) {
    "use strict";

    const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const INTERVAL_DEGREES = ["1", "b2", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7"];

    const NOTE_TO_SEMITONE = {
        'c': 0, 'c#': 1, 'db': 1, 'd': 2, 'd#': 3, 'eb': 3, 'e': 4, 'f': 5, 'f#': 6,
        'gb': 6, 'g': 7, 'g#': 8, 'ab': 8, 'a': 9, 'a#': 10, 'bb': 10, 'b': 11
    };

    const COMMON_FRETS = [1, 3, 5, 7, 9, 12, 15, 17, 19, 21, 24];

    /* --- Utilidades ------------------------------------------------------ */

    // Devuelve la clase de altura (0-11) de un nombre de nota. Ignora la octava:
    // "e" y "E" son ambos Mi. La octava real la resuelve resolveTuningMIDI().
    function parseNoteToSemi(noteStr) {
        if (!noteStr) return 0;
        const normalized = String(noteStr).trim().toLowerCase();
        return NOTE_TO_SEMITONE[normalized] ?? 0;
    }

    function arraysEqual(a, b) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    /* --- Instrumentos ----------------------------------------------------
     *
     * `strings` es el número de cuerdas y `standard` la afinación de fábrica
     * en notas MIDI REALES (con octava), de la cuerda más grave a la más aguda
     * tal y como se dibujan (índice 0 = la de la izquierda del diagrama).
     *
     * El ukelele y el bajo de 4 cuerdas son instrumentos DISTINTOS aunque
     * compartan el número de cuerdas. Antes se intentaba distinguirlos mirando
     * la letra de cada cuerda, lo que afinaba mal ambos instrumentos.
     * -------------------------------------------------------------------- */
    const INSTRUMENTS = {
        uke4: {
            id: "uke4",
            name: "Ukelele (4c)",
            label: "4 (Ukelele)",
            strings: 4,
            // Afinación reentrante de sol agudo: la 4ª cuerda suena MÁS AGUDA
            // que la 3ª. Es la estándar del ukelele soprano/concierto/tenor.
            standard: [67, 60, 64, 69] // G4 C4 E4 A4
        },
        bass4: {
            id: "bass4",
            name: "Bajo (4c)",
            label: "4 (Bajo)",
            strings: 4,
            standard: [28, 33, 38, 43] // E1 A1 D2 G2
        },
        bass5: {
            id: "bass5",
            name: "Bajo (5c)",
            label: "5 (Bajo 5c)",
            strings: 5,
            standard: [23, 28, 33, 38, 43] // B0 E1 A1 D2 G2
        },
        guitar6: {
            id: "guitar6",
            name: "Guitarra (6c)",
            label: "6 (Guitarra Std)",
            strings: 6,
            standard: [40, 45, 50, 55, 59, 64] // E2 A2 D3 G3 B3 E4
        },
        guitar7: {
            id: "guitar7",
            name: "Guitarra (7c)",
            label: "7 (Extendida)",
            strings: 7,
            standard: [35, 40, 45, 50, 55, 59, 64] // B1 E2 A2 D3 G3 B3 E4
        },
        guitar8: {
            id: "guitar8",
            name: "Guitarra (8c)",
            label: "8 (Rango Ext)",
            strings: 8,
            standard: [30, 35, 40, 45, 50, 55, 59, 64] // F#1 B1 E2 A2 D3 G3 B3 E4
        }
    };

    // Orden de aparición en el desplegable de la interfaz.
    const INSTRUMENT_ORDER = ["uke4", "bass4", "bass5", "guitar6", "guitar7", "guitar8"];

    const DEFAULT_INSTRUMENT = "guitar6";

    function getInstrument(instrumentId) {
        return INSTRUMENTS[instrumentId] || INSTRUMENTS[DEFAULT_INSTRUMENT];
    }

    /* --- Afinaciones de fábrica ------------------------------------------
     * Van indexadas por instrumento, no por número de cuerdas: el ukelele y
     * el bajo de 4 cuerdas necesitan listas separadas.
     * -------------------------------------------------------------------- */
    const TUNING_PRESETS = {
        uke4: [
            { name: "Estándar (G C E A)", notes: ["G", "C", "E", "A"] },
            { name: "Sol grave (G C E A)", notes: ["G", "C", "E", "A"], midi: [55, 60, 64, 69] }
        ],
        bass4: [
            { name: "Estándar (Bajo)", notes: ["E", "A", "D", "G"] },
            { name: "Drop D (D A D G)", notes: ["D", "A", "D", "G"] }
        ],
        bass5: [
            { name: "Estándar (Bajo 5c)", notes: ["B", "E", "A", "D", "G"] }
        ],
        guitar6: [
            { name: "Estándar (E A D G B e)", notes: ["E", "A", "D", "G", "B", "e"] },
            { name: "Drop D (D A D G B e)", notes: ["D", "A", "D", "G", "B", "e"] },
            { name: "DADGAD", notes: ["D", "A", "D", "G", "A", "d"] }
        ],
        guitar7: [
            { name: "Estándar 7c (B E A D G B e)", notes: ["B", "E", "A", "D", "G", "B", "e"] }
        ],
        guitar8: [
            { name: "Estándar 8c (F# B E A D G B e)", notes: ["F#", "B", "E", "A", "D", "G", "B", "e"] }
        ]
    };

    /* --- Resolución de afinación a MIDI real -----------------------------
     *
     * ESTA ES LA PIEZA QUE ARREGLA LOS DOS BUGS DE AFINACIÓN.
     *
     * El problema de fondo: el array de afinación sólo guarda LETRAS ("D"),
     * que no dicen la octava. Antes había dos sistemas paralelos —el análisis
     * de acordes leía las letras, y el audio unas tablas fijas que ignoraban
     * la afinación—, así que Drop D se dibujaba bien pero sonaba estándar.
     *
     * La regla: al reafinar una cuerda, el músico la mueve lo mínimo posible.
     * Así que cada cuerda suena en la octava MÁS CERCANA a su afinación de
     * fábrica. Drop D sobre E2(40) baja a D2(38), no sube a D3(50).
     * -------------------------------------------------------------------- */

    // Nota MIDI más cercana a `referenceMidi` que tenga la clase de altura
    // pedida. Empates (tritono) resuelven hacia arriba, de forma determinista.
    function nearestMidiWithPitchClass(pitchClass, referenceMidi) {
        const refPitchClass = ((referenceMidi % 12) + 12) % 12;
        let delta = (pitchClass - refPitchClass + 12) % 12; // 0..11
        if (delta > 6) delta -= 12;                          // -5..6
        return referenceMidi + delta;
    }

    // MIDI real de una cuerda al aire, a partir del instrumento y la afinación
    // que el usuario tenga puesta. `tuning` es el array de letras de la app.
    function getStringBaseMIDI(tuning, stringIndex, instrumentId) {
        const instrument = getInstrument(instrumentId);
        const standard = instrument.standard;

        const reference = standard[stringIndex] !== undefined
            ? standard[stringIndex]
            : (standard[standard.length - 1] || 40) + (stringIndex - standard.length + 1) * 5;

        const noteStr = Array.isArray(tuning) ? tuning[stringIndex] : tuning;
        if (noteStr === undefined || noteStr === null || String(noteStr).trim() === "") {
            return reference;
        }

        return nearestMidiWithPitchClass(parseNoteToSemi(noteStr), reference);
    }

    // Afinación completa en MIDI real. Un preset puede fijar octavas explícitas
    // con `midi` (lo usa el ukelele de sol grave, que si no se resolvería al
    // sol agudo por cercanía).
    function resolveTuningMIDI(tuning, instrumentId, explicitMidi) {
        const instrument = getInstrument(instrumentId);
        if (Array.isArray(explicitMidi) && explicitMidi.length === instrument.strings) {
            return explicitMidi.slice();
        }
        const result = [];
        for (let i = 0; i < instrument.strings; i++) {
            result.push(getStringBaseMIDI(tuning, i, instrumentId));
        }
        return result;
    }

    /* --- Trastes relativos y absolutos -----------------------------------
     *
     * La app dibuja una VENTANA del mástil: `startingFret` dice en qué traste
     * empieza, y los trastes dentro del diagrama se numeran desde 1. Así que
     * hay dos numeraciones y es fácil confundirlas:
     *
     *   relFret  1  = el primer traste DIBUJADO
     *   absFret  1  = el primer traste REAL del instrumento
     *   absFret = startingFret + relFret - 1
     *
     * Confundirlas es justo lo que hacía que un acorde dibujado en el traste 5
     * sonara como si estuviera en el 1: el análisis usaba el absoluto y el
     * audio el relativo. Toda conversión de traste a MIDI pasa por aquí.
     * -------------------------------------------------------------------- */

    // Traste absoluto (1 = primer traste real) desde el traste dibujado.
    //
    // `relFret = 0` es la CEJUELA de la ventana, y por eso devuelve
    // `startingFret - 1`: al subir la ventana, la cejuela de la digitación se
    // convierte en una cejilla un traste por encima del primero dibujado.
    function toAbsoluteFret(startingFret, relFret) {
        return startingFret + relFret - 1;
    }

    /* MIDI de una posición de una DIGITACIÓN de acorde.
     *
     * Una digitación es una FORMA que se desplaza entera con la ventana: si
     * mueves la ventana, se mueve todo, incluidas las cuerdas al aire. Un
     * guitarrista hace justo eso al subir la forma de C por el mástil — la
     * cejuela pasa a ser una cejilla.
     *
     * Antes las notas pisadas se transponían y las cuerdas al aire no, así que
     * el acorde salía medio transpuesto: la forma de C en el traste 3 se
     * nombraba "Em9/D" en vez de "D".
     *
     * OJO: esto vale para acordes, NO para escalas ni arpegios. Ahí el
     * diagrama es un MAPA del mástil, no una forma, y una cuerda al aire es
     * literalmente la cuerda al aire (`baseMidi`, sin desplazar).
     */
    function fretToMidi(baseMidi, startingFret, relFret) {
        return baseMidi + toAbsoluteFret(startingFret, relFret || 0);
    }

    // Nombre de nota con octava, p. ej. 40 -> "E2". Para depurar y para la UI.
    function midiToNoteName(midi) {
        const pitchClass = ((midi % 12) + 12) % 12;
        const octave = Math.floor(midi / 12) - 1;
        return NOTE_NAMES[pitchClass] + octave;
    }

    function midiToFrequency(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    /* --- Escalas y arpegios ---------------------------------------------- */

    const SCALE_PRESETS = [
        { id: "major", name: "Mayor (Jónica)", intervals: [0, 2, 4, 5, 7, 9, 11] },
        { id: "minor", name: "Menor Natural (Eólica)", intervals: [0, 2, 3, 5, 7, 8, 10] },
        { id: "harmonic_minor", name: "Menor Armónica", intervals: [0, 2, 3, 5, 7, 8, 11] },
        { id: "melodic_minor", name: "Menor Melódica", intervals: [0, 2, 3, 5, 7, 9, 11] },
        { id: "pentatonic_major", name: "Pentatónica Mayor", intervals: [0, 2, 4, 7, 9] },
        { id: "pentatonic_minor", name: "Pentatónica Menor", intervals: [0, 3, 5, 7, 10] },
        { id: "blues", name: "Escala de Blues", intervals: [0, 3, 5, 6, 7, 10] },
        { id: "dorian", name: "Modo Dórico", intervals: [0, 2, 3, 5, 7, 9, 10] },
        { id: "phrygian", name: "Modo Frigio", intervals: [0, 1, 3, 5, 7, 8, 10] },
        { id: "lydian", name: "Modo Lidio", intervals: [0, 2, 4, 6, 7, 9, 11] },
        { id: "mixolydian", name: "Modo Mixolidio", intervals: [0, 2, 4, 5, 7, 9, 10] },
        { id: "locrian", name: "Modo Locrio", intervals: [0, 1, 3, 5, 6, 8, 10] }
    ];

    const ARPEGGIO_PRESETS = [
        { id: "major", name: "Tríada Mayor", intervals: [0, 4, 7] },
        { id: "minor", name: "Tríada Menor", intervals: [0, 3, 7] },
        { id: "dim", name: "Tríada Disminuida", intervals: [0, 3, 6] },
        { id: "aug", name: "Tríada Aumentada", intervals: [0, 4, 8] },
        { id: "maj7", name: "Séptima Mayor (Maj7)", intervals: [0, 4, 7, 11] },
        { id: "dom7", name: "Dominante (7)", intervals: [0, 4, 7, 10] },
        { id: "min7", name: "Séptima Menor (m7)", intervals: [0, 3, 7, 10] },
        { id: "m7b5", name: "Semidisminuido (m7b5)", intervals: [0, 3, 6, 10] },
        { id: "dim7", name: "Disminuido 7 (dim7)", intervals: [0, 3, 6, 9] }
    ];

    /* --- Librería de fórmulas de acordes --------------------------------- */

    const CHORD_FORMULAS = [
        // --- TRÍADAS Y BÁSICOS ---
        { name: "", intervals: [0, 4, 7] },                     // Mayor
        { name: "m", intervals: [0, 3, 7] },                    // Menor
        { name: "sus4", intervals: [0, 5, 7] },                 // Suspendido 4
        { name: "sus2", intervals: [0, 2, 7] },                 // Suspendido 2
        { name: "5", intervals: [0, 7] },                       // Quinta (Power Chord)
        { name: "dim", intervals: [0, 3, 6] },                  // Disminuido
        { name: "aug", intervals: [0, 4, 8] },                  // Aumentado

        // --- SÉPTIMAS ---
        { name: "7", intervals: [0, 4, 7, 10] },                // Dominante 7 (Completo)
        { name: "7", intervals: [0, 4, 10] },                   // Dominante 7 (Sin 5a)
        { name: "maj7", intervals: [0, 4, 7, 11] },             // Mayor 7 (Completo)
        { name: "maj7", intervals: [0, 4, 11] },                // Mayor 7 (Sin 5a)
        { name: "m7", intervals: [0, 3, 7, 10] },               // Menor 7 (Completo)
        { name: "m7", intervals: [0, 3, 10] },                  // Menor 7 (Sin 5a)
        { name: "m(maj7)", intervals: [0, 3, 7, 11] },          // Menor/Séptima Mayor
        { name: "m(maj7)", intervals: [0, 3, 11] },             // Menor/Séptima Mayor (Sin 5a)
        { name: "m7b5", intervals: [0, 3, 6, 10] },             // Semidisminuido
        { name: "dim7", intervals: [0, 3, 6, 9] },              // Disminuido 7
        { name: "7#5", intervals: [0, 4, 8, 10] },              // Aumentado Dominante 7
        { name: "maj7#5", intervals: [0, 4, 8, 11] },           // Aumentado Mayor 7

        // --- ACORDES DE SEXTA ---
        { name: "6", intervals: [0, 4, 7, 9] },                 // Sexta Mayor
        { name: "6", intervals: [0, 4, 9] },                    // Sexta Mayor (Sin 5a)
        { name: "m6", intervals: [0, 3, 7, 9] },                // Sexta Menor
        { name: "m6", intervals: [0, 3, 9] },                   // Sexta Menor (Sin 5a)
        { name: "6/9", intervals: [0, 2, 4, 7, 9] },            // Sexta/Nona Mayor
        { name: "6/9", intervals: [0, 2, 4, 9] },               // Sexta/Nona Mayor (Sin 5a)
        { name: "m6/9", intervals: [0, 2, 3, 7, 9] },           // Sexta/Nona Menor
        { name: "m6/9", intervals: [0, 2, 3, 9] },              // Sexta/Nona Menor (Sin 5a)

        // --- NOVENAS ---
        { name: "9", intervals: [0, 2, 4, 7, 10] },             // Dominante 9 (Completo)
        { name: "9", intervals: [0, 2, 4, 10] },                // Dominante 9 (Sin 5a)
        { name: "maj9", intervals: [0, 2, 4, 7, 11] },          // Mayor 9 (Completo)
        { name: "maj9", intervals: [0, 2, 4, 11] },             // Mayor 9 (Sin 5a)
        { name: "m9", intervals: [0, 2, 3, 7, 10] },            // Menor 9 (Completo)
        { name: "m9", intervals: [0, 2, 3, 10] },               // Menor 9 (Sin 5a)
        { name: "m(maj9)", intervals: [0, 2, 3, 7, 11] },       // Menor Mayor 9
        { name: "m(maj9)", intervals: [0, 2, 3, 11] },          // Menor Mayor 9 (Sin 5a)
        { name: "9b5", intervals: [0, 2, 4, 6, 10] },           // Dominante 9 bemol 5
        { name: "9#5", intervals: [0, 2, 4, 8, 10] },           // Dominante 9 sostenido 5
        { name: "7b9", intervals: [0, 1, 4, 7, 10] },           // Dominante 7 bemol 9
        { name: "7b9", intervals: [0, 1, 4, 10] },              // Dominante 7 bemol 9 (Sin 5a)
        { name: "7#9", intervals: [0, 3, 4, 7, 10] },           // Dominante 7 sostenido 9 ("Hendrix")
        { name: "7#9", intervals: [0, 3, 4, 10] },              // Dominante 7 sostenido 9 (Sin 5a)

        // --- ONCEVAS ---
        { name: "11", intervals: [0, 2, 4, 5, 7, 10] },         // Onceva Dominante
        { name: "11", intervals: [0, 2, 5, 10] },               // Onceva Dominante (Sin 3/5a)
        { name: "maj11", intervals: [0, 2, 4, 5, 7, 11] },      // Onceva Mayor
        { name: "maj11", intervals: [0, 2, 5, 11] },            // Onceva Mayor (Sin 3/5a)
        { name: "m11", intervals: [0, 2, 3, 5, 7, 10] },        // Onceva Menor
        { name: "m11", intervals: [0, 2, 3, 5, 10] },           // Onceva Menor (Sin 5a)
        { name: "maj7#11", intervals: [0, 2, 4, 6, 7, 11] },    // Lidio (maj7#11)
        { name: "maj7#11", intervals: [0, 4, 6, 11] },          // Lidio (maj7#11 sin 5a)
        { name: "maj7#11", intervals: [0, 2, 4, 6, 11] },       // Lidio (maj9#11 sin 5a)

        // --- TRECEVAS ---
        { name: "13", intervals: [0, 2, 4, 7, 9, 10] },         // Treceva Dominante
        { name: "13", intervals: [0, 2, 4, 9, 10] },            // Treceva Dominante (Sin 5a)
        { name: "13", intervals: [0, 4, 9, 10] },               // Treceva Dominante (Voicing de Jazz)
        { name: "maj13", intervals: [0, 2, 4, 7, 9, 11] },      // Treceva Mayor
        { name: "maj13", intervals: [0, 2, 4, 9, 11] },         // Treceva Mayor (Sin 5a)
        { name: "m13", intervals: [0, 2, 3, 7, 9, 10] },        // Treceva Menor
        { name: "m13", intervals: [0, 2, 3, 9, 10] },           // Treceva Menor (Sin 5a)

        // --- NOTAS AÑADIDAS (ADD) ---
        { name: "add9", intervals: [0, 2, 4, 7] },              // Nona Añadida Mayor
        { name: "add9", intervals: [0, 2, 4] },                 // Nona Añadida Mayor (Sin 5a)
        { name: "madd9", intervals: [0, 2, 3, 7] },             // Nona Añadida Menor
        { name: "madd9", intervals: [0, 2, 3] },                // Nona Añadida Menor (Sin 5a)
        { name: "add11", intervals: [0, 4, 5, 7] },             // Onceva Añadida Mayor
        { name: "add11", intervals: [0, 4, 5] },                // Onceva Añadida Mayor (Sin 5a)
        { name: "madd11", intervals: [0, 3, 5, 7] },            // Onceva Añadida Menor
        { name: "madd11", intervals: [0, 3, 5] },               // Onceva Añadida Menor (Sin 5a)

        // --- SUSPENDIDOS EXTENDIDOS ---
        { name: "7sus4", intervals: [0, 5, 7, 10] },            // Dominante 7 Suspendido 4
        { name: "7sus4", intervals: [0, 5, 10] },               // Dominante 7 Suspendido 4 (Sin 5a)
        { name: "9sus4", intervals: [0, 2, 5, 7, 10] },         // Dominante 9 Suspendido 4
        { name: "9sus4", intervals: [0, 2, 5, 10] },            // Dominante 9 Suspendido 4 (Sin 5a)
        { name: "13sus4", intervals: [0, 2, 5, 7, 9, 10] }      // Dominante 13 Suspendido 4
    ];

    /* --- Reconocimiento de acordes ---------------------------------------
     *
     * `sounding` es la lista de notas que suenan, ya resuelta por quien llama:
     *   [{ semitone, stringIndex, isFretted, absoluteFret }, ...]
     *
     * Es agnóstico del instrumento a propósito: sólo mira clases de altura y
     * cuál es la nota más grave. Un teclado puede alimentarlo igual que un
     * mástil.
     * -------------------------------------------------------------------- */
    function identifyChord(sounding) {
        if (!sounding || sounding.length === 0) {
            return { name: "Ninguno (Mástil Vacío)", rootSemi: 0 };
        }

        const ordered = sounding.slice().sort((a, b) => a.stringIndex - b.stringIndex);
        const bassNoteName = NOTE_NAMES[ordered[0].semitone];
        const uniquePitches = [...new Set(ordered.map(n => n.semitone))];

        let bestChord = null;

        for (const root of uniquePitches) {
            const relIntervals = uniquePitches.map(p => (p - root + 12) % 12);
            relIntervals.sort((a, b) => a - b);

            for (const formula of CHORD_FORMULAS) {
                if (arraysEqual(relIntervals, formula.intervals)) {
                    bestChord = {
                        root: NOTE_NAMES[root],
                        type: formula.name,
                        bass: NOTE_NAMES[root] === bassNoteName ? "" : bassNoteName,
                        rootSemi: root
                    };
                    break;
                }
            }
            if (bestChord) break;
        }

        if (!bestChord) {
            const notesString = uniquePitches.map(p => NOTE_NAMES[p]).join(", ");
            return { name: `Desconocido (${notesString})`, rootSemi: uniquePitches[0] };
        }

        let chordString = bestChord.root + bestChord.type;
        if (bestChord.bass) {
            chordString += "/" + bestChord.bass;
        }
        return { name: chordString, rootSemi: bestChord.rootSemi };
    }

    /* --- API pública ----------------------------------------------------- */

    global.KharoTheory = {
        NOTE_NAMES,
        INTERVAL_DEGREES,
        NOTE_TO_SEMITONE,
        COMMON_FRETS,
        INSTRUMENTS,
        INSTRUMENT_ORDER,
        DEFAULT_INSTRUMENT,
        TUNING_PRESETS,
        SCALE_PRESETS,
        ARPEGGIO_PRESETS,
        CHORD_FORMULAS,
        parseNoteToSemi,
        arraysEqual,
        getInstrument,
        nearestMidiWithPitchClass,
        getStringBaseMIDI,
        resolveTuningMIDI,
        toAbsoluteFret,
        fretToMidi,
        midiToNoteName,
        midiToFrequency,
        identifyChord
    };
})(typeof window !== "undefined" ? window : this);
