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
                        rootSemi: root,
                        intervals: relIntervals.slice()
                    };
                    break;
                }
            }
            if (bestChord) break;
        }

        if (!bestChord) {
            const notesString = uniquePitches.map(p => NOTE_NAMES[p]).join(", ");
            return { name: `Desconocido (${notesString})`, rootSemi: uniquePitches[0], type: null, intervals: null };
        }

        let chordString = bestChord.root + bestChord.type;
        if (bestChord.bass) {
            chordString += "/" + bestChord.bass;
        }
        /* `type` e `intervals` son AÑADIDOS, no un cambio: quien sólo lee
         * `name` y `rootSemi` sigue igual. Hacen falta para razonar sobre el
         * acorde —si es dominante, si es diatónico— sin volver a parsear la
         * cadena que se acaba de concatenar. */
        return {
            name: chordString,
            rootSemi: bestChord.rootSemi,
            type: bestChord.type,
            intervals: bestChord.intervals
        };
    }

    /* --- De una digitación a notas que suenan -----------------------------
     *
     * Recibe una FOTO del mástil —la misma forma que guarda la biblioteca de
     * acordes— y devuelve las notas MIDI ordenadas de grave a aguda.
     *
     * LA REGLA, que aquí queda en un solo sitio: una cuerda suena si tiene
     * nota pisada, si la pisa una cejilla, o si está marcada al aire.
     * `muted` no suena, y `none` —sin decidir— tampoco.
     *
     * Antes esa decisión estaba duplicada y las dos copias no coincidían: el
     * análisis ignoraba las cuerdas `none` y el rasgueo las tocaba, así que el
     * acorde no sonaba como se llamaba. En una canción eso es inaceptable, y
     * en el mástil tampoco tenía defensa.
     * -------------------------------------------------------------------- */
    function chordVoicingToMidi(snapshot) {
        if (!snapshot) return [];

        const instrument = getInstrument(snapshot.instrument);
        const numStrings = instrument.strings;
        const startingFret = snapshot.startingFret || 1;
        const stringStates = snapshot.stringStates || [];
        const dots = snapshot.dots || [];
        const barres = snapshot.barres || [];

        const usarMidiExplicito = Array.isArray(snapshot.tuningMidi)
            && snapshot.tuningMidi.length === numStrings;

        const notas = [];

        for (let s = 0; s < numStrings; s++) {
            const estado = stringStates[s];
            if (estado === "muted") continue;

            const baseMidi = usarMidiExplicito
                ? snapshot.tuningMidi[s]
                : getStringBaseMIDI(snapshot.tuning, s, snapshot.instrument);

            const dot = dots.find(d => d.s === s);
            if (dot) {
                notas.push(fretToMidi(baseMidi, startingFret, dot.f));
                continue;
            }

            const barre = barres.find(b => s >= b.fromString && s <= b.toString);
            if (barre) {
                notas.push(fretToMidi(baseMidi, startingFret, barre.fret));
                continue;
            }

            if (estado === "open") {
                // Al aire = cejuela de la digitación, que sube con la ventana.
                notas.push(fretToMidi(baseMidi, startingFret, 0));
            }
        }

        return notas.sort((a, b) => a - b);
    }

    /* --- El recorrido de las notas ----------------------------------------
     *
     * En qué ORDEN se tocan las notas que hay dibujadas en el mástil. Es lo
     * que convierte un mapa de posiciones en un ejercicio: sin orden, una
     * escala dibujada es una nube de puntos.
     *
     * `notas` es `[{ s, f, midi }]` — cuerda, traste relativo y altura.
     *
     *   "digitacion"  Cuerda por cuerda de la más grave a la más aguda, y
     *                 dentro de cada cuerda del traste menor al mayor. Es como
     *                 se practica una escala, y es lo que se puede tocar.
     *   "altura"      Por nota, de la más grave a la más aguda. Musicalmente
     *                 impecable y a menudo intocable: obliga a saltos de mano
     *                 que en la digitación no existen.
     *
     * Los dos criterios desempatan igual, así que el recorrido de un mismo
     * dibujo siempre sale idéntico. Un ejercicio que cambia de orden entre dos
     * cargas no sirve para estudiar.
     *
     * `opciones` es opcional y no tiene valores por defecto AQUÍ: el núcleo no
     * opina sobre cuántas notas por cuerda se practican, eso lo decide la app.
     *
     *   notasPorCuerda  Tope de notas por cuerda. Sin él, en un mástil de 20
     *                   trastes el recorrido baja veinte notas por la misma
     *                   cuerda antes de cambiarse, y eso no lo toca nadie: se
     *                   practica bajando tres, saltando de cuerda y siguiendo.
     *   retorno         Añade la vuelta: sube, y baja por el mismo camino.
     *
     * EL LÍMITE ES UN FILTRO Y EL CRITERIO ES UN ORDEN, y por eso se poda
     * ANTES de ordenar. Si se podara después, "altura" —que mezcla cuerdas—
     * dejaría notas de más en unas cuerdas y de menos en otras, y el selector
     * rotulado «notas por cuerda» estaría mintiendo.
     * -------------------------------------------------------------------- */

    /* Las `n` notas más graves de cada cuerda.
     *
     * Las más graves y no las centradas en la ventana: la ventana YA es la
     * posición de la mano (`f` es relativo a ella), así que "las n más graves"
     * y "las n desde donde está la mano" son lo mismo. Centrarlas haría que
     * mover el número de trastes cambiara QUÉ notas se practican sin que nadie
     * lo pida, y un ejercicio que cambia solo no sirve para estudiar. */
    function limitarNotasPorCuerda(notas, n) {
        if (!n || n < 1) return (notas || []).slice();

        const porCuerda = new Map();
        (notas || []).forEach(nota => {
            if (!porCuerda.has(nota.s)) porCuerda.set(nota.s, []);
            porCuerda.get(nota.s).push(nota);
        });

        const salida = [];
        [...porCuerda.keys()].sort((a, b) => a - b).forEach(s => {
            porCuerda.get(s)
                .sort((a, b) => a.f - b.f)
                .slice(0, n)
                .forEach(nota => salida.push(nota));
        });
        return salida;
    }

    function buildNotePath(notas, criterio, opciones) {
        const opts = opciones || {};
        const copia = limitarNotasPorCuerda(notas, opts.notasPorCuerda);

        if (criterio === "altura") {
            copia.sort((a, b) => (a.midi - b.midi) || (a.s - b.s) || (a.f - b.f));
        } else {
            copia.sort((a, b) => (a.s - b.s) || (a.f - b.f));
        }

        let orden = copia.map(n => ({ s: n.s, f: n.f, tap: !!n.tap }));

        /* La vuelta va DENTRO de la lista, no es un modo de dibujo.
         * `crearPasoDeEjercicio` congela `recorridoActual()` dentro del paso, y
         * si el retorno fuera una marca de render, un ejercicio guardado lo
         * perdería. Metido en la lista, ni el sonido ni las flechas ni la ficha
         * de ejercicio tienen que enterarse de que existe. */
        if (opts.retorno && orden.length > 1) {
            orden = orden.concat(orden.slice(0, -1).reverse());
        }

        return orden;
    }

    // Dos posiciones del mástil son la misma si coinciden cuerda y traste.
    function samePosition(a, b) {
        return !!a && !!b && a.s === b.s && a.f === b.f;
    }

    /* --- Los acordes de una tonalidad -------------------------------------
     *
     * Los grados diatónicos: qué acorde sale de construir sobre cada nota de
     * la escala usando SÓLO notas de esa escala. Es lo que contesta «qué
     * acordes pegan en esta canción», que es la pregunta que la gente hace.
     *
     * Se apilan terceras de la propia escala —el grado i, el i+2, el i+4 y el
     * i+6—, así que sale de la escala y no de una tabla escrita a mano. Con
     * eso funciona igual en mayor, en menor armónica o en cualquier modo, sin
     * una lista por escala.
     *
     * Los suspendidos se calculan aparte y se marcan si CABEN en la tonalidad:
     * un sus4 sobre el séptimo grado suele traer una nota de fuera, y decirlo
     * es más útil que ofrecerlo sin más.
     * -------------------------------------------------------------------- */
    function nameChordFromIntervals(intervalos) {
        const ordenados = intervalos.slice().sort((a, b) => a - b);
        const formula = CHORD_FORMULAS.find(f => arraysEqual(ordenados, f.intervals));
        return formula ? formula.name : null;
    }

    function diatonicChords(rootPitch, intervalosEscala) {
        const escala = (intervalosEscala || []).slice().sort((a, b) => a - b);
        if (escala.length < 7) return [];

        const ROMANOS = ["I", "II", "III", "IV", "V", "VI", "VII"];

        return escala.slice(0, 7).map((offsetGrado, i) => {
            const raiz = (rootPitch + offsetGrado) % 12;

            // Apilar terceras dentro de la escala: grados i, i+2, i+4, i+6.
            const alturas = [0, 2, 4, 6].map(salto => {
                const indice = (i + salto) % escala.length;
                return (rootPitch + escala[indice]) % 12;
            });

            const relativos = alturas.map(a => (a - raiz + 12) % 12);
            const triada = relativos.slice(0, 3);
            const septima = relativos;

            const tipoTriada = nameChordFromIntervals(triada);
            const tipoSeptima = nameChordFromIntervals(septima);

            // El romano en minúscula cuando la tercera es menor, y con ° si
            // además la quinta está disminuida. Es la convención de toda la
            // vida y se lee de un vistazo.
            const terceraMenor = relativos.indexOf(3) !== -1;
            const quintaDisminuida = relativos.indexOf(6) !== -1 && relativos.indexOf(7) === -1;
            let romano = terceraMenor ? ROMANOS[i].toLowerCase() : ROMANOS[i];
            if (quintaDisminuida) romano += "°";

            // Los suspendidos: sólo son de la tonalidad si sus tres notas lo son.
            const enLaEscala = (altura) => escala.some(off => (rootPitch + off) % 12 === altura);
            const sus = [
                { nombre: "sus2", intervalos: [0, 2, 7] },
                { nombre: "sus4", intervalos: [0, 5, 7] }
            ].map(candidato => ({
                nombre: NOTE_NAMES[raiz] + candidato.nombre,
                diatonico: candidato.intervalos.every(iv => enLaEscala((raiz + iv) % 12))
            }));

            return {
                grado: i + 1,
                romano,
                raiz: NOTE_NAMES[raiz],
                triada: NOTE_NAMES[raiz] + (tipoTriada === null ? "?" : tipoTriada),
                septima: NOTE_NAMES[raiz] + (tipoSeptima === null ? "?" : tipoSeptima),
                notas: alturas.map(a => NOTE_NAMES[a]),
                sus,

                /* Lo mismo, en números. `raiz` y `triada` son texto para
                 * escribirlo en una hoja; esto es para razonar con ello —
                 * buscar la tríada en el mástil o abrirla como arpegio— sin
                 * tener que volver a parsear una cadena que ya se concatenó. */
                raizPitch: raiz,
                tipoTriada,                                   // "", "m", "dim", "aug" o null
                relativos: triada,                            // [0, 3|4, 6|7|8]
                triadaPitches: triada.map(iv => (raiz + iv) % 12),

                // Qué papel cumple: reposo, camino o tensión.
                funcion: funcionDelGrado(i, escala)
            };
        });
    }

    /* --- Las tríadas de la tonalidad, sobre el mástil ----------------------
     *
     * `diatonicChords` dice QUÉ acordes salen de una escala; esto dice DÓNDE
     * caen sus notas en el mapa que ya está dibujado.
     *
     * No construye formas. Eso es `triadShapeForStringSet`, que da UNA forma
     * de tres cuerdas para tocarla de una pasada. Aquí se trata de lo
     * contrario: mirar los puntos que ya hay en pantalla y decir a qué grado
     * pertenece cada uno.
     *
     * Y sí, una misma posición puede ser de hasta TRES tríadas a la vez —un
     * Do es la fundamental de I, la tercera de vi y la quinta de IV—. Eso no
     * es una ambigüedad a resolver: es justo lo que se quiere ver, cómo se
     * relacionan unas con otras.
     *
     * `posiciones` es el mapa YA dibujado: [{ s, f, pitch }], con `f` relativo
     * a la ventana y `pitch` la clase de altura (0-11). Sin geometría y sin
     * saber dónde empieza la ventana: eso lo sabe quien llama.
     * -------------------------------------------------------------------- */
    function diatonicTriadPositions(rootPitch, intervalosEscala, posiciones) {
        const grados = diatonicChords(rootPitch, intervalosEscala);
        if (grados.length === 0) return [];

        const puntos = posiciones || [];
        return grados.map(g => {
            const conPosiciones = Object.assign({}, g);
            conPosiciones.posiciones = [];
            puntos.forEach(p => {
                const rol = g.triadaPitches.indexOf(p.pitch);   // 0 fund · 1 tercera · 2 quinta
                if (rol !== -1) conPosiciones.posiciones.push({ s: p.s, f: p.f, rolTriada: rol });
            });
            return conPosiciones;
        });
    }

    /* De una tríada diatónica al preset de arpegio que le corresponde, para
     * poder abrirla en el mástil sin que quien llama tenga que conocer la
     * tabla. `null` si no es ninguno de los cuatro tipos: pasa en escalas
     * raras, y decirlo es mejor que abrir un arpegio que no es el que se
     * pulsó. */
    function presetArpegioParaTriada(relativos) {
        const TRIADAS = [
            { id: "major", intervals: [0, 4, 7] },
            { id: "minor", intervals: [0, 3, 7] },
            { id: "dim", intervals: [0, 3, 6] },
            { id: "aug", intervals: [0, 4, 8] }
        ];
        const orden = (relativos || []).slice().sort((a, b) => a - b);
        const encontrado = TRIADAS.find(t => arraysEqual(orden, t.intervals));
        return encontrado ? encontrado.id : null;
    }

    /* --- LA FUNCIÓN TONAL DE CADA GRADO -----------------------------------
     *
     * Qué papel cumple un grado dentro de la tonalidad: si es sitio de
     * reposo (tónica), de tensión que quiere resolver (dominante) o de
     * camino entre los dos (subdominante).
     *
     * La familia va por POSICIÓN en la escala, no por la calidad del acorde:
     * el tercer grado hace de tónica lo mismo en mayor (iii menor) que en
     * menor (III mayor). Por eso funciona en cualquier escala de siete notas
     * sin una tabla por escala, igual que `diatonicChords`.
     *
     * El séptimo es el único que se deduce en vez de leerse de la lista: si
     * está a un semitono de la tónica es SENSIBLE y tira hacia ella; si está
     * a un tono es SUBTÓNICA y no tira. Es la diferencia entre el Si de Do
     * mayor y el Sol de La menor, y decirla es media explicación del modo.
     * -------------------------------------------------------------------- */
    const FAMILIA_POR_GRADO = ["Tónica", "Subdominante", "Tónica", "Subdominante", "Dominante", "Tónica", "Dominante"];
    const NOMBRE_POR_GRADO = ["Tónica", "Supertónica", "Mediante", "Subdominante", "Dominante", "Superdominante", null];

    function funcionDelGrado(indice, intervalosOrdenados) {
        if (indice !== 6) {
            return { familia: FAMILIA_POR_GRADO[indice], nombre: NOMBRE_POR_GRADO[indice], sensible: null };
        }
        // A un semitono de la tónica = sensible. A un tono = subtónica.
        const sensible = (12 - intervalosOrdenados[6]) === 1;
        return {
            familia: sensible ? "Dominante" : "Subdominante",
            nombre: sensible ? "Sensible" : "Subtónica",
            sensible
        };
    }

    /* --- QUÉ ACORDE ES UNA DIGITACIÓN GUARDADA ----------------------------
     *
     * Un acorde de la biblioteca es una FOTO del mástil, no un símbolo. Para
     * razonar sobre él —decir si es de la tonalidad o de fuera— hay que
     * reconocerlo primero.
     *
     * `identifyChord` sólo mira clases de altura y cuál es la más grave, así
     * que basta con ordenar las notas que suenan y numerarlas.
     * -------------------------------------------------------------------- */
    function identifyChordFromVoicing(snapshot) {
        const midis = chordVoicingToMidi(snapshot);
        if (midis.length === 0) return null;
        return identifyChord(midis.map((m, i) => ({
            semitone: ((m % 12) + 12) % 12,
            stringIndex: i,
            isFretted: true,
            absoluteFret: 0
        })));
    }

    /* --- ¿ES DE LA TONALIDAD, O VIENE DE FUERA? ---------------------------
     *
     * Devuelve lo que se puede AFIRMAR con aritmética, y sugerencias para lo
     * que no. Nombrar la función que cumple un acorde prestado es una
     * lectura, y esa la firma quien escribe la canción: por eso
     * `sugerencias` es una lista ordenada y no una respuesta.
     *
     * `diatonico: null` significa «no se puede decir» —tonalidad sin elegir,
     * escala de menos de siete notas, acorde que no se reconoce—. No es lo
     * mismo que «no es de la tonalidad», y confundirlos sería inventar.
     * -------------------------------------------------------------------- */
    function analyzeChordInKey(rootSemi, intervals, keyRoot, escalaIntervalos) {
        const vacio = { diatonico: null, grado: null, romano: null, notasDeFuera: [], sugerencias: [] };
        if (!Number.isInteger(keyRoot) || !Array.isArray(intervals) || !Number.isInteger(rootSemi)) return vacio;

        const grados = diatonicChords(keyRoot, escalaIntervalos);
        if (grados.length === 0) return vacio;

        const escala = (escalaIntervalos || []).slice().sort((a, b) => a - b);
        const enLaTonalidad = (pc) => escala.some(off => (keyRoot + off) % 12 === pc);

        const alturas = intervals.map(iv => (rootSemi + iv) % 12);
        const notasDeFuera = alturas.filter(pc => !enLaTonalidad(pc));

        const propio = grados.find(g => g.raizPitch === rootSemi);
        const gradoDeRaiz = (pc) => grados.find(g => g.raizPitch === pc) || null;

        // Diatónico de verdad: raíz de la tonalidad Y todas sus notas dentro.
        if (propio && notasDeFuera.length === 0) {
            return {
                diatonico: true,
                grado: propio.grado,
                romano: propio.romano,
                notasDeFuera: [],
                sugerencias: []
            };
        }

        const sugerencias = [];
        const esDominante = intervals.indexOf(4) !== -1 && intervals.indexOf(10) !== -1;
        const esMayor = intervals.indexOf(4) !== -1 && intervals.indexOf(7) !== -1;
        const esDisminuido = intervals.indexOf(3) !== -1 && intervals.indexOf(6) !== -1;

        // Dominante secundario: resuelve una quinta abajo, o sea su raíz está
        // una quinta POR ENCIMA de la del grado al que apunta.
        if (esDominante || esMayor) {
            const destino = gradoDeRaiz((rootSemi + 5) % 12);
            if (destino && !(propio && propio.grado === 5)) {
                sugerencias.push({
                    id: "dominante-secundario",
                    etiqueta: `V7/${destino.romano}`,
                    explica: `Dominante de ${destino.triada}: tira hacia el grado ${destino.romano}`
                });
            }
        }

        // Sustituto tritonal: un dominante que resuelve medio tono hacia abajo.
        if (esDominante) {
            const destino = gradoDeRaiz((rootSemi + 11) % 12);
            if (destino) {
                sugerencias.push({
                    id: "sustituto-tritonal",
                    etiqueta: `subV7/${destino.romano}`,
                    explica: `Sustituto tritonal: resuelve medio tono abajo, hacia ${destino.triada}`
                });
            }
        }

        // Disminuido de paso: sube medio tono hasta un grado de la tonalidad.
        if (esDisminuido) {
            const destino = gradoDeRaiz((rootSemi + 1) % 12);
            if (destino) {
                sugerencias.push({
                    id: "disminuido-de-paso",
                    etiqueta: `vii°/${destino.romano}`,
                    explica: `Disminuido de paso: sube medio tono hasta ${destino.triada}`
                });
            }
        }

        /* Préstamo modal: el mismo acorde existe en una escala paralela.
         *
         * Sólo las dos primeras que encajen. `PARALELAS` va de más a menos
         * frecuente, y un Mi bemol en Do sale de la menor natural, de la
         * dórica y de la frigia a la vez: listarlas todas no es más preciso,
         * es más largo. */
        const prestamos = [];
        PARALELAS.forEach(id => {
            if (prestamos.length >= 2) return;
            const preset = SCALE_PRESETS.find(p => p.id === id);
            if (!preset) return;
            const otros = diatonicChords(keyRoot, preset.intervals);
            const igual = otros.find(g => g.raizPitch === rootSemi && arraysEqual(g.relativos, intervals.slice(0, 3)));
            if (!igual) return;
            prestamos.push({
                id: "prestamo-" + id,
                etiqueta: `${igual.romano} de ${preset.name}`,
                explica: `Préstamo modal: es el grado ${igual.romano} de ${NOTE_NAMES[keyRoot]} ${preset.name}`
            });
        });
        prestamos.forEach(p => sugerencias.push(p));

        return {
            diatonico: false,
            grado: propio ? propio.grado : null,
            romano: propio ? propio.romano : null,
            notasDeFuera: notasDeFuera.map(pc => NOTE_NAMES[pc]),
            sugerencias
        };
    }

    // Las escalas de las que se toma prestado más a menudo sobre la misma
    // tónica. No es una lista cerrada de la teoría: son las que caben en el
    // desplegable de tonalidades, que es lo que el usuario puede elegir.
    const PARALELAS = ["major", "minor", "harmonic_minor", "melodic_minor", "dorian", "mixolydian", "phrygian", "lydian"];

    // Las notas de una tonalidad, en orden desde la tónica.
    function scaleNotes(rootPitch, intervalosEscala) {
        return (intervalosEscala || [])
            .slice()
            .sort((a, b) => a - b)
            .map(off => NOTE_NAMES[(rootPitch + off) % 12]);
    }

    /* --- Arpegios agrupados -----------------------------------------------
     *
     * Un arpegio repartido por los 24 trastes es un mapa, no algo que se pueda
     * tocar. Estas dos agrupaciones lo convierten en formas concretas:
     *
     *   JUEGOS DE CUERDAS  Las tríadas en cada grupo de tres cuerdas contiguas,
     *                      con sus inversiones. UNA NOTA POR CUERDA, que no es
     *                      un detalle: es exactamente la condición que hace
     *                      falta para tocarlo con sweep picking.
     *   POSICIONES         Ventanas de cinco trastes ancladas en cada aparición
     *                      de la tónica, para ver el arpegio zona por zona.
     * -------------------------------------------------------------------- */

    // Los grupos de tres cuerdas contiguas, de la más grave a la más aguda.
    function stringSets(numStrings) {
        const sets = [];
        for (let i = 0; i + 2 < numStrings; i++) sets.push([i, i + 1, i + 2]);
        return sets;
    }

    // Nombre legible del juego: en la interfaz las cuerdas se cuentan al revés
    // que en el array, así que la 0 es la 6ª de la guitarra.
    function stringSetName(stringSet, numStrings) {
        return stringSet.map(i => numStrings - i).join("-");
    }

    /* La forma de una tríada en un juego de cuerdas, en una inversión dada.
     *
     * `inversion` 0 = fundamental abajo, 1 = primera, 2 = segunda.
     *
     * La primera cuerda coge el traste más grave que sirva a partir de
     * `desdeTraste`; las otras dos, el más CERCANO a ese. Buscar siempre hacia
     * arriba daría formas de seis trastes de ancho que ninguna mano alcanza.
     */
    function triadShapeForStringSet(tuningMidi, stringSet, pitchClasses, inversion, desdeTraste, maxFret) {
        if (pitchClasses.length < 3) return null;

        const orden = [0, 1, 2].map(i => pitchClasses[(inversion + i) % 3]);
        const desde = Math.max(0, desdeTraste || 0);
        const tope = maxFret || 24;

        const trastePara = (cuerda, clase, cerca) => {
            const base = tuningMidi[cuerda];
            let f = (((clase - base) % 12) + 12) % 12;
            const candidatos = [];
            while (f <= tope) { candidatos.push(f); f += 12; }
            if (candidatos.length === 0) return null;

            return candidatos.reduce((mejor, actual) => {
                if (actual < desde) return mejor;
                if (mejor === null) return actual;
                return Math.abs(actual - cerca) < Math.abs(mejor - cerca) ? actual : mejor;
            }, null);
        };

        const primera = trastePara(stringSet[0], orden[0], desde);
        if (primera === null) return null;

        const posiciones = [{ s: stringSet[0], absFret: primera }];
        for (let k = 1; k < 3; k++) {
            const f = trastePara(stringSet[k], orden[k], primera);
            if (f === null) return null;
            posiciones.push({ s: stringSet[k], absFret: f });
        }

        return posiciones;
    }

    /* Las ventanas de mástil en las que se estudia un arpegio por zonas.
     *
     * Cada ventana empieza donde aparece la tónica en alguna cuerda: son los
     * sitios donde la mano se coloca de forma natural. Se ordenan y se quitan
     * las que caen demasiado juntas, porque dos ventanas separadas por un
     * traste son la misma posición.
     *
     * NO se etiquetan como CAGED. Las cinco formas CAGED sólo significan algo
     * en guitarra de seis cuerdas en afinación estándar y sobre tríadas
     * mayores; esta app admite seis instrumentos, afinaciones libres y nueve
     * tipos de arpegio, incluidos m7b5 y disminuidos. Poner esas letras donde
     * no aplican sería enseñar algo falso, así que cada ventana dice
     * exactamente lo que es: en qué trastes está.
     */
    function neckPositions(tuningMidi, rootPitch, numFretsVentana, maxFret) {
        const tope = maxFret || 15;
        const ancho = numFretsVentana || 5;

        const anclas = [];
        tuningMidi.forEach(base => {
            let f = (((rootPitch - base) % 12) + 12) % 12;
            while (f <= tope) {
                // Un traste antes de la tónica: así la tónica no queda pegada
                // al borde de la ventana.
                anclas.push(Math.max(0, f - 1));
                f += 12;
            }
        });

        const ordenadas = [...new Set(anclas)].sort((a, b) => a - b);

        // Dos ventanas a menos de dos trastes son la misma posición.
        const posiciones = [];
        ordenadas.forEach(inicio => {
            const ultima = posiciones[posiciones.length - 1];
            if (ultima && inicio - ultima.inicio < 2) return;
            posiciones.push({ inicio, trastes: ancho });
        });

        return posiciones.map(pos => ({
            ...pos,
            nombre: "Trastes " + (pos.inicio + 1) + "–" + (pos.inicio + ancho)
        }));
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
        chordVoicingToMidi,
        buildNotePath,
        samePosition,
        diatonicChords,
        diatonicTriadPositions,
        presetArpegioParaTriada,
        identifyChordFromVoicing,
        analyzeChordInKey,
        scaleNotes,
        stringSets,
        stringSetName,
        triadShapeForStringSet,
        neckPositions,
        nameChordFromIntervals,
        identifyChord
    };
})(typeof window !== "undefined" ? window : this);
