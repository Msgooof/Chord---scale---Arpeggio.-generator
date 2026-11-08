/* ==========================================================================
 * KHARO STUDIO — NÚCLEO DE LA BANDA (0.16)
 * ==========================================================================
 *
 * Funciones puras, como theory-core.js y song-core.js: sin JSX, sin React,
 * sin sonido y sin tocar el DOM. Se carga con un <script> normal después de
 * theory-core.js y se expone como `window.BandaCore`.
 *
 * Cuatro piezas:
 *
 *   PROGRESIONES  la biblioteca, escrita en grados para tocarla en cualquier
 *                 tono («ii m7 · V 7 · I maj7»).
 *   ESTILOS       por estilo: tempo, swing, la batería de un compás y la
 *                 figura que toca cada instrumento si no eliges otra.
 *   arreglar()    convierte acordes + estilo + acompañamiento en la lista de
 *                 golpes y notas de UNA vuelta, en pulsos. El motor de sonido
 *                 (bloque app-source-banda) solo tiene que tocarla.
 *   caminos()     lo que escribe la ayuda «¿Cómo improviso?» debajo de cada
 *                 acorde: qué escala, a qué nota apuntar, la nota de color,
 *                 una frase corta y el porqué.
 *
 * Unidades: el tiempo va en PULSOS (negras) desde el principio de la vuelta.
 * Los compases son de 4/4. Las alturas, en MIDI (60 = Do central). Las
 * clases de altura (pc), de 0 a 11 con 0 = Do.
 * ========================================================================== */

(function (global) {
    "use strict";

    const T = global.KharoTheory || {};

    /* --- Nombres --------------------------------------------------------- */

    const SOSTENIDOS = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
    const BEMOLES = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
    const ES = { C: "Do", D: "Re", E: "Mi", F: "Fa", G: "Sol", A: "La", B: "Si" };

    const mod12 = (n) => ((n % 12) + 12) % 12;

    // Las tonalidades que se escriben con bemoles, por su relativa mayor.
    const MAYORES_CON_BEMOLES = [5, 10, 3, 8, 1];
    // Cuánto hay que subir desde la tónica de cada modo hasta su relativa mayor.
    const A_RELATIVA_MAYOR = { mayor: 0, menor: 3, dorico: 10, frigio: 8, lidio: 7, mixolidio: 5 };

    function conBemoles(tono, modo) {
        return MAYORES_CON_BEMOLES.includes(mod12(tono + (A_RELATIVA_MAYOR[modo] || 0)));
    }
    // «B♭», «F♯»: cifrado americano, como lo escribe el resto de Kharo.
    function nombreNota(pc, bemoles) {
        return (bemoles ? BEMOLES : SOSTENIDOS)[mod12(pc)];
    }
    // «Si bemol», «Fa sostenido»: para las frases de la ayuda.
    function nombreNotaEs(pc, bemoles) {
        const n = nombreNota(pc, bemoles);
        const base = ES[n[0]];
        if (n[1] === "♭") return base + " bemol";
        if (n[1] === "♯") return base + " sostenido";
        return base;
    }

    /* --- Calidades de acorde ---------------------------------------------- *
     * Una tabla propia y corta: la banda solo necesita saber qué notas tiene
     * cada acorde de su biblioteca. `simbolo` es cómo se escribe. */
    const CALIDADES = {
        "":     { intervalos: [0, 4, 7], simbolo: "" },
        "m":    { intervalos: [0, 3, 7], simbolo: "m" },
        "5":    { intervalos: [0, 7], simbolo: "5" },
        "6":    { intervalos: [0, 4, 7, 9], simbolo: "6" },
        "69":   { intervalos: [0, 4, 7, 9, 14], simbolo: "6/9" },
        "m6":   { intervalos: [0, 3, 7, 9], simbolo: "m6" },
        "7":    { intervalos: [0, 4, 7, 10], simbolo: "7" },
        "9":    { intervalos: [0, 4, 7, 10, 14], simbolo: "9" },
        "7b9":  { intervalos: [0, 4, 7, 10, 13], simbolo: "7♭9" },
        "maj7": { intervalos: [0, 4, 7, 11], simbolo: "maj7" },
        "maj9": { intervalos: [0, 4, 7, 11, 14], simbolo: "maj9" },
        "m7":   { intervalos: [0, 3, 7, 10], simbolo: "m7" },
        "m9":   { intervalos: [0, 3, 7, 10, 14], simbolo: "m9" },
        "m7b5": { intervalos: [0, 3, 6, 10], simbolo: "m7♭5" },
        "dim7": { intervalos: [0, 3, 6, 9], simbolo: "°7" },
        "sus4": { intervalos: [0, 5, 7], simbolo: "sus4" },
        "7sus4": { intervalos: [0, 5, 7, 10], simbolo: "7sus4" }
    };

    /* --- Grados ----------------------------------------------------------- *
     * «bVII», «#iv», «ii»: la alteración delante y el número romano. La
     * mayúscula o minúscula no cambia la nota (eso lo dice la calidad), solo
     * cómo se lee. */
    const ROMANOS = ["I", "II", "III", "IV", "V", "VI", "VII"];
    const ESCALA_MAYOR = [0, 2, 4, 5, 7, 9, 11];

    function leerGrado(texto) {
        const m = /^([b#]*)([ivIV]+)$/.exec(texto);
        if (!m) throw new Error("Grado ilegible: " + texto);
        const numero = ROMANOS.indexOf(m[2].toUpperCase());
        if (numero < 0) throw new Error("Grado ilegible: " + texto);
        let alteracion = 0;
        for (const c of m[1]) alteracion += c === "b" ? -1 : 1;
        return { numero, alteracion, desdeTonica: mod12(ESCALA_MAYOR[numero] + alteracion), minuscula: m[2] === m[2].toLowerCase() };
    }
    function gradoBonito(texto) {
        return texto.replace(/^b/, "♭").replace(/^#/, "♯");
    }

    /* --- La biblioteca de progresiones -------------------------------------- *
     * Cada acorde: [grado, calidad, pulsos]. `modo` es la tonalidad en la que
     * se piensa la progresión: decide la escala de «Simple» y cómo se nombran
     * las notas. `estilo` es el que se le pone al elegirla, si no hay otro. */
    const PROGRESIONES = [
        // --- Pop y rock
        { id: "pop-axis", nombre: "I–V–vi–IV", familia: "pop", modo: "mayor", estilo: "pop",
          acordes: [["I", "", 4], ["V", "", 4], ["vi", "m", 4], ["IV", "", 4]] },
        { id: "pop-sensible", nombre: "vi–IV–I–V", familia: "pop", modo: "mayor", estilo: "balada",
          acordes: [["vi", "m", 4], ["IV", "", 4], ["I", "", 4], ["V", "", 4]] },
        { id: "doo-wop", nombre: "I–vi–IV–V", familia: "pop", modo: "mayor", estilo: "balada",
          acordes: [["I", "", 4], ["vi", "m", 4], ["IV", "", 4], ["V", "", 4]] },
        { id: "tres-acordes", nombre: "I–IV–V–IV", familia: "pop", modo: "mayor", estilo: "rock",
          acordes: [["I", "", 4], ["IV", "", 4], ["V", "", 4], ["IV", "", 4]] },
        { id: "menor-pop", nombre: "i–♭VI–♭III–♭VII", familia: "pop", modo: "menor", estilo: "pop",
          acordes: [["i", "m", 4], ["bVI", "", 4], ["bIII", "", 4], ["bVII", "", 4]] },
        { id: "andaluza", nombre: "Cadencia andaluza", familia: "latina", modo: "menor", estilo: "rock",
          acordes: [["i", "m", 4], ["bVII", "", 4], ["bVI", "", 4], ["V", "", 4]] },

        // --- Jazz
        { id: "ii-v-i", nombre: "ii–V–I mayor", familia: "jazz", modo: "mayor", estilo: "swing",
          acordes: [["ii", "m7", 4], ["V", "7", 4], ["I", "maj7", 8]] },
        { id: "ii-v-i-menor", nombre: "ii–V–i menor", familia: "jazz", modo: "menor", estilo: "swing",
          acordes: [["ii", "m7b5", 4], ["V", "7b9", 4], ["i", "m6", 8]] },
        { id: "turnaround", nombre: "I–vi–ii–V", familia: "jazz", modo: "mayor", estilo: "swing",
          acordes: [["I", "maj7", 4], ["vi", "m7", 4], ["ii", "m7", 4], ["V", "7", 4]] },
        { id: "rhythm-a", nombre: "Rhythm changes (A)", familia: "jazz", modo: "mayor", estilo: "swing",
          acordes: [["I", "6", 2], ["vi", "m7", 2], ["ii", "m7", 2], ["V", "7", 2],
                    ["I", "6", 2], ["vi", "m7", 2], ["ii", "m7", 2], ["V", "7", 2],
                    ["I", "6", 2], ["I", "7", 2], ["IV", "maj7", 2], ["iv", "m6", 2],
                    ["I", "6", 2], ["vi", "m7", 2], ["ii", "m7", 2], ["V", "7", 2]] },
        { id: "balada-jazz", nombre: "Balada: I–IV–iii–vi", familia: "jazz", modo: "mayor", estilo: "jazz-lento",
          acordes: [["I", "maj7", 4], ["IV", "maj7", 4], ["iii", "m7", 4], ["vi", "m7", 4], ["ii", "m7", 4], ["V", "7sus4", 2], ["V", "7", 2], ["I", "maj7", 8]] },

        // --- Blues
        { id: "blues-12", nombre: "Blues de 12", familia: "blues", modo: "mayor", estilo: "shuffle",
          acordes: [["I", "7", 16], ["IV", "7", 8], ["I", "7", 8], ["V", "7", 4], ["IV", "7", 4], ["I", "7", 4], ["V", "7", 4]] },
        { id: "blues-jazz", nombre: "Blues de jazz", familia: "blues", modo: "mayor", estilo: "swing",
          acordes: [["I", "7", 4], ["IV", "7", 4], ["I", "7", 4], ["v", "m7", 2], ["I", "7", 2],
                    ["IV", "7", 4], ["#iv", "dim7", 4], ["I", "7", 4], ["VI", "7", 4],
                    ["ii", "m7", 4], ["V", "7", 4], ["I", "7", 2], ["VI", "7", 2], ["ii", "m7", 2], ["V", "7", 2]] },
        { id: "blues-menor", nombre: "Blues menor", familia: "blues", modo: "menor", estilo: "shuffle",
          acordes: [["i", "m7", 16], ["iv", "m7", 8], ["i", "m7", 8], ["bVI", "7", 4], ["V", "7", 4], ["i", "m7", 4], ["V", "7", 4]] },

        // --- Modal: un color, mucho tiempo
        { id: "vamp-dorico", nombre: "Vamp dórico: i7–IV7", familia: "modal", modo: "dorico", estilo: "funk",
          acordes: [["i", "m7", 8], ["IV", "7", 8]] },
        { id: "vamp-mixolidio", nombre: "Mixolidio: I–♭VII", familia: "modal", modo: "mixolidio", estilo: "rock",
          acordes: [["I", "", 8], ["bVII", "", 8]] },
        { id: "vamp-lidio", nombre: "Lidio: I–II", familia: "modal", modo: "lidio", estilo: "balada",
          acordes: [["I", "maj7", 8], ["II", "", 8]] },
        { id: "vamp-frigio", nombre: "Frigio: i–♭II", familia: "modal", modo: "frigio", estilo: "rock",
          acordes: [["i", "m", 8], ["bII", "", 8]] },
        { id: "un-acorde", nombre: "Un acorde: i m7", familia: "modal", modo: "dorico", estilo: "funk",
          acordes: [["i", "m7", 16]] },

        // --- Latina
        { id: "bossa", nombre: "Bossa: I–ii–V", familia: "latina", modo: "mayor", estilo: "bossa",
          acordes: [["I", "69", 8], ["ii", "m9", 4], ["V", "7", 4]] },
        { id: "reggae", nombre: "Reggae: I–IV", familia: "latina", modo: "mayor", estilo: "reggae",
          acordes: [["I", "", 8], ["IV", "", 8]] }
    ];

    const FAMILIAS = [
        { id: "pop", nombre: "Pop y rock" },
        { id: "jazz", nombre: "Jazz" },
        { id: "blues", nombre: "Blues" },
        { id: "modal", nombre: "Modal" },
        { id: "latina", nombre: "Latina" }
    ];

    /* --- Estilos ----------------------------------------------------------- *
     * La batería de un compás en 16 semicorcheas: «x» golpe, «o» golpe
     * flojo (desaparece en Suave), «.» nada. En los estilos con swing, las
     * corcheas a contratiempo se retrasan según `swing` (0,5 = recto,
     * 0,67 = tresillo). Las figuras son las que suenan si no eliges otras. */
    const ESTILOS = [
        { id: "pop", nombre: "Pop", tempo: 100, swing: 0.5,
          bateria: { bombo: "x.......x.x.....", caja: "....x.......x...", hhc: "x.x.x.x.x.x.x.x." },
          comp: "corcheas", ritmoGuitarra: "pop",
          figuras: { bateria: "estilo", bajo: "corcheas", piano: "blancas", guitarra: "ritmo" } },
        { id: "rock", nombre: "Rock", tempo: 120, swing: 0.5,
          bateria: { bombo: "x.....x.x.......", caja: "....x.......x...", hhc: "x.x.x.x.x.x.x.x.", crash: "x..............." },
          comp: "blancas", ritmoGuitarra: "negras",
          figuras: { bateria: "estilo", bajo: "corcheas", piano: "redondas", guitarra: "negras" } },
        { id: "balada", nombre: "Balada", tempo: 72, swing: 0.5,
          bateria: { bombo: "x.........x.....", aro: "....x.......x...", hhc: "o.o.o.o.o.o.o.o." },
          comp: "redondas", ritmoGuitarra: "arpegio",
          figuras: { bateria: "estilo", bajo: "blancas", piano: "redondas", guitarra: "ritmo" } },
        { id: "swing", nombre: "Swing", tempo: 140, swing: 0.64, jazz: true,
          bateria: { ride: "x...x.x.x...x.x.", hhp: "....x.......x...", bombo: "o...o...o...o..." },
          comp: "charleston", ritmoGuitarra: "freddie",
          figuras: { bateria: "estilo", bajo: "walking", piano: "comping", guitarra: "ritmo" } },
        { id: "jazz-lento", nombre: "Jazz lento", tempo: 66, swing: 0.62, jazz: true,
          bateria: { barrido: "x.......x.......", escobilla: "....x.......x...", hhp: "....x.......x..." },
          comp: "redondas", ritmoGuitarra: "freddie",
          figuras: { bateria: "escobillas", bajo: "blancas", piano: "comping", guitarra: "redondas" } },
        { id: "bossa", nombre: "Bossa", tempo: 128, swing: 0.5, jazz: true,
          bateria: { aro: "x..x..x...x..x..", bombo: "x..xx..xx..xx..x", hhc: "o.o.o.o.o.o.o.o." },
          comp: "bossa", ritmoGuitarra: "bossa",
          figuras: { bateria: "estilo", bajo: "bossa", piano: "comping", guitarra: "ritmo" } },
        { id: "shuffle", nombre: "Blues shuffle", tempo: 96, swing: 0.67,
          bateria: { bombo: "x.......x.......", caja: "....x.......x...", hhc: "x.x.x.x.x.x.x.x." },
          comp: "charleston", ritmoGuitarra: "shuffle",
          figuras: { bateria: "estilo", bajo: "raiz-quinta", piano: "comping", guitarra: "ritmo" } },
        { id: "funk", nombre: "Funk", tempo: 96, swing: 0.5,
          bateria: { bombo: "x..x..x...x..x..", caja: "....x..o.o..x..o", hhc: "xoxoxoxoxoxoxoxo" },
          comp: "funk", ritmoGuitarra: "funk",
          figuras: { bateria: "estilo", bajo: "funk", piano: "comping", guitarra: "ritmo" } },
        { id: "reggae", nombre: "Reggae", tempo: 76, swing: 0.56,
          bateria: { bombo: "........x.......", aro: "........x.......", hhc: "x.x.x.x.x.x.x.x." },
          comp: "skank", ritmoGuitarra: "skank",
          figuras: { bateria: "estilo", bajo: "raiz-quinta", piano: "comping", guitarra: "ritmo" } }
    ];

    /* --- Figuras: lo que puede tocar cada instrumento ------------------------ *
     * Patrones de acorde: [pulso dentro del compás, duración, fuerza, dirección].
     * La dirección solo importa a la guitarra («d» abajo, «u» arriba, «p» punteo). */
    const PATRONES = {
        redondas:   [[0, 4, 0.8, "d"]],
        blancas:    [[0, 2, 0.8, "d"], [2, 2, 0.7, "d"]],
        negras:     [[0, 0.9, 0.85, "d"], [1, 0.9, 0.7, "d"], [2, 0.9, 0.8, "d"], [3, 0.9, 0.7, "d"]],
        corcheas:   [[0, 0.45, 0.75, "d"], [0.5, 0.4, 0.45, "d"], [1, 0.45, 0.6, "d"], [1.5, 0.4, 0.45, "d"],
                     [2, 0.45, 0.7, "d"], [2.5, 0.4, 0.45, "d"], [3, 0.45, 0.6, "d"], [3.5, 0.4, 0.45, "d"]],
        charleston: [[0, 0.6, 0.75, "d"], [1.5, 0.5, 0.65, "d"]],
        bossa:      [[0, 0.9, 0.7, "d"], [1.5, 0.9, 0.6, "d"], [3, 0.9, 0.6, "d"]],
        skank:      [[1, 0.25, 0.75, "u"], [3, 0.25, 0.75, "u"]],
        funk:       [[0, 0.2, 0.8, "d"], [0.75, 0.2, 0.55, "u"], [1.5, 0.2, 0.7, "d"], [2.5, 0.2, 0.6, "u"], [3.25, 0.2, 0.65, "d"]],
        freddie:    [[0, 0.4, 0.6, "d"], [1, 0.4, 0.7, "d"], [2, 0.4, 0.6, "d"], [3, 0.4, 0.7, "d"]],
        pop:        [[0, 0.9, 0.85, "d"], [1, 0.45, 0.65, "d"], [1.5, 0.45, 0.5, "u"], [2.5, 0.45, 0.55, "u"], [3, 0.45, 0.7, "d"], [3.5, 0.45, 0.5, "u"]],
        shuffle:    [[0, 0.45, 0.8, "d"], [0.5, 0.4, 0.5, "u"], [1, 0.45, 0.7, "d"], [1.5, 0.4, 0.5, "u"], [2, 0.45, 0.8, "d"], [2.5, 0.4, 0.5, "u"], [3, 0.45, 0.7, "d"], [3.5, 0.4, 0.5, "u"]],
        arpegio:    [[0, 1.8, 0.6, "p"], [1, 1.6, 0.5, "p"], [2, 1.4, 0.55, "p"], [3, 1, 0.5, "p"]]
    };
    const NOMBRE_PATRON = {
        redondas: "Redondas", blancas: "Blancas", negras: "Negras", corcheas: "Corcheas", charleston: "Charleston",
        bossa: "Bossa", skank: "Skank", funk: "Funk", freddie: "Freddie Green", pop: "Rasgueo pop",
        shuffle: "Shuffle", arpegio: "Arpegio"
    };

    const FIGURAS = {
        bateria: [
            { id: "estilo", nombre: "Del estilo" },
            { id: "suave", nombre: "Solo platos" },
            { id: "escobillas", nombre: "Escobillas" }
        ],
        bajo: [
            { id: "blancas", nombre: "Blancas" },
            { id: "raiz-quinta", nombre: "Raíz y quinta" },
            { id: "corcheas", nombre: "Corcheas" },
            { id: "walking", nombre: "Walking" },
            { id: "bossa", nombre: "Bossa" },
            { id: "funk", nombre: "Funk" }
        ],
        piano: [
            { id: "redondas", nombre: "Redondas" },
            { id: "blancas", nombre: "Blancas" },
            { id: "comping", nombre: "Comping" }
        ],
        guitarra: [
            { id: "ritmo", nombre: "Del estilo" },
            { id: "negras", nombre: "Negras" },
            { id: "blancas", nombre: "Blancas" },
            { id: "redondas", nombre: "Redondas" }
        ]
    };
    const INSTRUMENTOS = ["bateria", "bajo", "piano", "guitarra"];

    /* Las formaciones: quién toca. «A mano» es lo que queda cuando cambias
     * algo por tu cuenta. */
    const FORMACIONES = [
        { id: "banda", nombre: "Banda", sub: "los cuatro", suenan: ["bateria", "bajo", "piano", "guitarra"] },
        { id: "trio", nombre: "Trío de jazz", sub: "batería · bajo · piano", suenan: ["bateria", "bajo", "piano"],
          figuras: { piano: "comping", bajo: "walking" } },
        { id: "ritmica", nombre: "Bajo y batería", sub: "tú armonizas", suenan: ["bateria", "bajo"] },
        { id: "piano", nombre: "Solo piano", sub: "", suenan: ["piano"] },
        { id: "guitarra", nombre: "Solo guitarra", sub: "", suenan: ["guitarra"] },
        { id: "mano", nombre: "A mano", sub: "", suenan: null }
    ];

    const INTENSIDADES = [
        { id: "suave", nombre: "Suave", valor: 0.3 },
        { id: "media", nombre: "Media", valor: 0.6 },
        { id: "fuerte", nombre: "Fuerte", valor: 0.9 }
    ];

    const CADA_ACORDE = [
        { id: "mitad", nombre: "½", factor: 0.5 },
        { id: "igual", nombre: "Como viene", factor: 1 },
        { id: "doble", nombre: "×2", factor: 2 }
    ];

    const buscar = (lista, id) => lista.find(x => x.id === id);
    const progresion = (id) => buscar(PROGRESIONES, id) || PROGRESIONES[0];
    const estilo = (id) => buscar(ESTILOS, id) || ESTILOS[0];

    /* --- De la progresión a acordes de verdad ------------------------------ */

    /* `tono`: la clase de altura de la tónica. Devuelve los acordes con su
     * raíz, sus intervalos, su nombre y el pulso en que empiezan. */
    function resolver(prog, tono, opciones) {
        const p = typeof prog === "string" ? progresion(prog) : prog;
        const factor = (buscar(CADA_ACORDE, opciones && opciones.cadaAcorde) || CADA_ACORDE[1]).factor;
        const bemoles = conBemoles(tono, p.modo);
        let desde = 0;
        return p.acordes.map(([grado, calidad, pulsos]) => {
            const g = leerGrado(grado);
            const c = CALIDADES[calidad];
            if (!c) throw new Error("Calidad desconocida: " + calidad);
            const raiz = mod12(tono + g.desdeTonica);
            const dura = Math.max(1, pulsos * factor);
            const a = {
                raiz,
                calidad,
                intervalos: c.intervalos.slice(),
                simbolo: nombreNota(raiz, bemoles) + c.simbolo,
                grado: gradoBonito(grado),
                pulsos: dura,
                desde
            };
            desde += dura;
            return a;
        });
    }

    // Lo que dura una vuelta, en pulsos.
    const duracion = (acordes) => acordes.reduce((s, a) => s + a.pulsos, 0);

    // El acorde que suena en el pulso `t` (dentro de la vuelta, con vuelta a empezar).
    function acordeEn(acordes, t) {
        const total = duracion(acordes);
        const x = ((t % total) + total) % total;
        for (let i = acordes.length - 1; i >= 0; i--) if (acordes[i].desde <= x + 1e-9) return i;
        return 0;
    }

    /* --- Pequeñas ayudas de altura ----------------------------------------- */

    // El MIDI de la clase `pc` más cercano a `ref`.
    function cercana(pc, ref) {
        const base = ref - mod12(ref - pc);
        return (ref - base) <= 6 ? base : base + 12;
    }
    // El MIDI de la clase `pc` dentro de [lo, hi], lo más cerca posible de `ref`.
    function enRango(pc, ref, lo, hi) {
        let m = cercana(pc, ref);
        while (m < lo) m += 12;
        while (m > hi) m -= 12;
        return m;
    }

    // Un azar repetible: las mismas entradas dan el mismo arreglo.
    function azar(semilla) {
        let s = (semilla >>> 0) || 1;
        return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    }

    /* --- El swing: retrasar las corcheas a contratiempo ---------------------- *
     * Dentro de cada pulso, 0,5 pasa a `swing`; lo de antes se estira y lo de
     * después se encoge. 0,5 deja todo como está. */
    function conSwing(t, swing) {
        if (!swing || Math.abs(swing - 0.5) < 1e-6) return t;
        const pulso = Math.floor(t + 1e-9), f = t - pulso;
        const g = f < 0.5 ? f * (swing / 0.5) : swing + (f - 0.5) * ((1 - swing) / 0.5);
        return pulso + g;
    }

    /* --- Voces ---------------------------------------------------------------- */

    /* El piano: acorde cerrado entre Do3 y Do5, la inversión más cercana a la
     * anterior para que las voces se muevan poco (conducción de voces). En
     * jazz, con bajo sonando, sin la raíz: la toca el bajo. */
    function vozPiano(acorde, previa, sinRaiz) {
        let ints = acorde.intervalos.map(i => mod12(i));
        ints = [...new Set(ints)];
        if (sinRaiz && ints.length >= 4) ints = ints.filter(i => i !== 0);
        if (ints.length > 4) ints = ints.filter(i => i !== 7);   // con la 9ª, fuera la 5ª
        const pcs = ints.map(i => mod12(acorde.raiz + i));
        const candidatos = [];
        for (let r = 0; r < pcs.length; r++) {
            const orden = pcs.slice(r).concat(pcs.slice(0, r));
            for (let baja = 48; baja <= 60; baja++) {
                if (mod12(baja) !== orden[0]) continue;
                const v = [baja];
                for (let k = 1; k < orden.length; k++) {
                    let n = v[k - 1] + mod12(orden[k] - v[k - 1]);
                    if (n === v[k - 1]) n += 12;
                    v.push(n);
                }
                if (v[v.length - 1] <= 77) candidatos.push(v);
            }
        }
        const media = (v) => v.reduce((s, x) => s + x, 0) / v.length;
        const coste = (v) => {
            if (!previa) return Math.abs(media(v) - 62);
            const centro = Math.abs(media(v) - media(previa));
            const mov = v.reduce((s, x) => s + Math.min(...previa.map(p => Math.abs(p - x))), 0);
            return mov + centro + 0.15 * Math.abs(media(v) - 62);
        };
        candidatos.sort((a, b) => coste(a) - coste(b));
        return candidatos[0];
    }

    /* La guitarra: raíz grave en las cuerdas de abajo y notas del acorde hacia
     * arriba, separadas como las dejan los trastes (de 3 a 7 semitonos). */
    function vozGuitarra(acorde, tipo) {
        const raiz = enRango(acorde.raiz, 45, 40, 51);
        const ints = [...new Set(acorde.intervalos.map(mod12))].filter(i => !(acorde.intervalos.length > 4 && i === 7));
        if (tipo === "freddie") {
            // Tres notas: raíz, 7ª (o 6ª, o 5ª) y 3ª arriba. El sonido de la guitarra de big band.
            const septima = ints.find(i => i === 10 || i === 11 || i === 9);
            const tercera = ints.find(i => i === 3 || i === 4) ?? ints.find(i => i === 5) ?? 7;
            const segunda = raiz + (septima !== undefined ? septima : 7);
            let arriba = segunda + mod12(raiz + tercera - segunda);
            if (arriba === segunda) arriba += 12;
            return [raiz, segunda, arriba];
        }
        const pcs = ints.map(i => mod12(acorde.raiz + i));
        const v = [raiz];
        const usadas = new Set([mod12(raiz)]);
        while (v.length < 6) {
            const ultima = v[v.length - 1];
            const opciones = [];
            for (let s = 3; s <= 7; s++) if (pcs.includes(mod12(ultima + s))) opciones.push(ultima + s);
            if (!opciones.length || ultima > 70) break;
            const nueva = opciones.find(n => !usadas.has(mod12(n))) ?? opciones[0];
            if (nueva > 76) break;
            v.push(nueva);
            usadas.add(mod12(nueva));
        }
        // Skank y funk: solo las tres de arriba, cortas y agudas.
        if (tipo === "skank" || tipo === "funk") {
            const agudas = v.filter(n => n >= 52).slice(-3);
            return agudas.length >= 2 ? agudas : v.slice(-3);
        }
        return v;
    }

    /* --- El bajo ------------------------------------------------------------------ */

    const BAJO_LO = 28, BAJO_HI = 55;

    function lineaBajo(acordes, figura, swing, rnd) {
        const ev = [];
        const total = duracion(acordes);
        let prev = 40;
        const nota = (t, midi, dur, fuerza) => { ev.push({ t, inst: "bajo", midis: [midi], dur, fuerza }); prev = midi; };
        acordes.forEach((a, i) => {
            const sig = acordes[(i + 1) % acordes.length];
            const raiz = enRango(a.raiz, prev, 33, 47);
            const quinta = a.intervalos.includes(7) ? raiz + 7 : a.intervalos.includes(6) ? raiz + 6 : a.intervalos.includes(8) ? raiz + 8 : raiz + 7;
            const fin = a.desde + a.pulsos;
            if (figura === "walking") {
                const tonos = a.intervalos.map(x => raiz + (x % 12)).concat([raiz + 12]).filter(n => n <= BAJO_HI);
                for (let b = 0; b < a.pulsos; b++) {
                    const t = a.desde + b;
                    let m;
                    if (b === 0) m = raiz;
                    else if (b === a.pulsos - 1) {
                        // Aproximación cromática a la raíz del acorde que viene.
                        const destino = enRango(sig.raiz, prev, 31, 50);
                        m = destino + (prev > destino ? 1 : -1);
                    } else {
                        // Sube por las notas del acorde: 3ª, 5ª, 7ª, octava…
                        const arriba = tonos.filter(n => n > raiz);
                        m = arriba.length ? arriba[(b - 1) % arriba.length] : raiz;
                    }
                    nota(t, Math.max(BAJO_LO, Math.min(BAJO_HI, m)), 0.92, b === 0 ? 0.85 : 0.72 + rnd() * 0.08);
                }
                return;
            }
            const patrones = {
                "blancas": [[0, raiz, 1.9, 0.85], [2, raiz, 1.9, 0.75]],
                "raiz-quinta": [[0, raiz, 1.4, 0.85], [1.5, raiz, 0.45, 0.5], [2, quinta, 1.9, 0.75]],
                "corcheas": [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map(x => [x, raiz, 0.42, x % 1 === 0 ? 0.75 : 0.55]),
                "bossa": [[0, raiz, 1.4, 0.8], [1.5, quinta - 12 >= BAJO_LO ? quinta - 12 : quinta, 0.45, 0.6], [2, quinta - 12 >= BAJO_LO ? quinta - 12 : quinta, 1.4, 0.75], [3.5, raiz, 0.45, 0.6]],
                "funk": [[0, raiz, 0.4, 0.9], [0.75, raiz, 0.2, 0.6], [1.5, raiz + 12, 0.25, 0.7], [2.5, raiz, 0.3, 0.75], [3, quinta, 0.3, 0.65], [3.5, raiz + 12 <= BAJO_HI ? raiz + 10 : raiz, 0.3, 0.6]]
            };
            const pat = patrones[figura] || patrones["blancas"];
            // El patrón es de un compás; se repite a lo largo del acorde.
            for (let c = 0; c < a.pulsos; c += 4) {
                pat.forEach(([x, m, dur, f]) => {
                    const t = a.desde + c + x;
                    if (t >= fin - 1e-9) return;
                    nota(t, Math.max(BAJO_LO, Math.min(BAJO_HI, m)), Math.min(dur, fin - t), f);
                });
            }
        });
        ev.forEach(e => { e.t = conSwing(e.t, swing); });
        return ev.filter(e => e.t < total);
    }

    /* --- Piano y guitarra: patrones de acorde --------------------------------- *
     * El patrón es de un compás y se coloca en el compás real (no en el
     * acorde): así un Charleston suena igual aunque los acordes cambien a
     * mitad de compás. Un golpe a contratiempo que cae medio pulso antes de un
     * cambio ya toca el acorde nuevo (anticipación). Un acorde que empieza sin
     * golpe recibe uno. */
    function golpesDeAcorde(acordes, patron, opciones) {
        const total = duracion(acordes);
        const golpes = [];
        for (let c = 0; c < total; c += 4) {
            patron.forEach(([x, dur, fuerza, dir]) => {
                const t = c + x;
                if (t >= total) return;
                let i = acordeEn(acordes, t);
                const sig = (i + 1) % acordes.length;
                const inicioSig = acordes[i].desde + acordes[i].pulsos;
                if (x % 1 !== 0 && inicioSig - t <= 0.5 + 1e-9 && inicioSig - t > 0) i = sig;
                golpes.push({ t, dur, fuerza, dir, i });
            });
        }
        acordes.forEach((a, i) => {
            const tiene = golpes.some(g => g.i === i && g.t >= a.desde - 0.5 && g.t < a.desde + 1);
            if (!tiene && opciones.rellenar) {
                const p = patron.find(([x]) => x === 0) || patron[0];
                golpes.push({ t: a.desde, dur: p[1], fuerza: p[2], dir: p[3], i });
            }
        });
        golpes.sort((a, b) => a.t - b.t);
        // Ninguna nota pasa del siguiente golpe ni del final de la vuelta.
        golpes.forEach((g, k) => {
            const sigT = k + 1 < golpes.length ? golpes[k + 1].t : total;
            g.dur = Math.max(0.1, Math.min(g.dur, sigT - g.t));
        });
        return golpes;
    }

    function patronDe(inst, figura, est) {
        if (inst === "piano") {
            if (figura === "redondas") return "redondas";
            if (figura === "blancas") return "blancas";
            return est.comp;
        }
        if (figura === "ritmo") return est.ritmoGuitarra;
        return figura;
    }

    function partesDeAcorde(acordes, inst, figura, est, swing, conBajo, rnd) {
        const nombre = patronDe(inst, figura, est);
        const patron = PATRONES[nombre] || PATRONES.redondas;
        const golpes = golpesDeAcorde(acordes, patron, { rellenar: true });
        const ev = [];
        let previa = null;
        const voces = acordes.map(a => {
            if (inst === "piano") { previa = vozPiano(a, previa, est.jazz && conBajo); return previa; }
            return vozGuitarra(a, nombre);
        });
        if (inst === "piano") {
            // Una segunda pasada para que el primer acorde también enlace con el último.
            previa = voces[voces.length - 1];
            acordes.forEach((a, i) => { previa = vozPiano(a, previa, est.jazz && conBajo); voces[i] = previa; });
        }
        golpes.forEach(g => {
            let midis = voces[g.i];
            if (inst === "guitarra" && g.dir === "u") midis = midis.slice(-4);       // arriba: solo las agudas
            if (inst === "guitarra" && g.dir === "p") midis = [midis[(Math.round(g.t) % midis.length)]];
            ev.push({ t: conSwing(g.t, swing), inst, midis, dur: g.dur, fuerza: g.fuerza * (0.94 + rnd() * 0.12), dir: g.dir, acorde: g.i });
        });
        return ev;
    }

    /* --- La batería ----------------------------------------------------------- */

    const PIEZAS = ["bombo", "caja", "aro", "hhc", "hho", "hhp", "ride", "campana", "crash", "escobilla", "barrido"];

    function partesBateria(acordes, est, figura, swing, intensidad, rnd) {
        const total = duracion(acordes);
        let rejilla = est.bateria;
        if (figura === "suave") {
            rejilla = {};
            if (est.bateria.ride) rejilla.ride = est.bateria.ride; else rejilla.hhc = est.bateria.hhc || "x.x.x.x.x.x.x.x.";
            rejilla.hhp = "....x.......x...";
        } else if (figura === "escobillas") {
            rejilla = { barrido: "x.......x.......", escobilla: "....x.......x...", hhp: "....x.......x..." };
        }
        const ev = [];
        for (let c = 0; c < total; c += 4) {
            Object.keys(rejilla).forEach(pieza => {
                const fila = rejilla[pieza];
                for (let k = 0; k < 16; k++) {
                    const ch = fila[k];
                    if (ch === "." || ch === undefined) continue;
                    if (ch === "o" && intensidad < 0.4) continue;
                    if (pieza === "crash" && c !== 0) continue;
                    const t = c + k / 4;
                    if (t >= total) continue;
                    const base = ch === "x" ? 0.85 : 0.4;
                    // El 1 del compás un poco más fuerte; todo escalado por la intensidad.
                    const acento = k === 0 ? 1.08 : k % 4 === 0 ? 1 : 0.92;
                    const fuerza = Math.min(1, base * acento * (0.55 + 0.6 * intensidad) * (0.93 + rnd() * 0.14));
                    ev.push({ t: conSwing(t, swing), inst: "bateria", pieza, fuerza, dur: pieza === "barrido" ? 1.6 : 0.5 });
                }
            });
        }
        return ev;
    }

    /* --- arreglar: una vuelta entera --------------------------------------------- *
     *
     * acordes     lo que devuelve resolver()
     * estiloId    id de ESTILOS
     * opciones    { figuras: { bateria, bajo, piano, guitarra },
     *               suenan:  ["bateria", "bajo", …],
     *               intensidad: 0..1,
     *               swing: 0.5..0.67 (si no, el del estilo),
     *               semilla }
     *
     * Devuelve { pulsos, eventos } con los eventos ordenados por `t`. */
    function arreglar(acordes, estiloId, opciones) {
        const est = estilo(estiloId);
        const o = opciones || {};
        const figuras = Object.assign({}, est.figuras, o.figuras || {});
        const suenan = o.suenan || INSTRUMENTOS;
        const intensidad = o.intensidad === undefined ? 0.6 : o.intensidad;
        const swing = o.swing === undefined ? est.swing : o.swing;
        const rnd = azar(o.semilla || 7);
        let eventos = [];
        if (suenan.includes("bateria")) eventos = eventos.concat(partesBateria(acordes, est, figuras.bateria, swing, intensidad, rnd));
        if (suenan.includes("bajo")) eventos = eventos.concat(lineaBajo(acordes, figuras.bajo, swing, rnd));
        if (suenan.includes("piano")) eventos = eventos.concat(partesDeAcorde(acordes, "piano", figuras.piano, est, swing, suenan.includes("bajo"), rnd));
        if (suenan.includes("guitarra")) eventos = eventos.concat(partesDeAcorde(acordes, "guitarra", figuras.guitarra, est, swing, suenan.includes("bajo"), rnd));
        // En Suave, el piano y la guitarra dejan los golpes flojos.
        if (intensidad < 0.4) eventos = eventos.filter(e => e.inst === "bateria" || e.inst === "bajo" || e.fuerza >= 0.55);
        eventos.forEach(e => { if (e.inst !== "bateria") e.fuerza = Math.min(1, e.fuerza * (0.7 + 0.45 * intensidad)); });
        eventos.sort((a, b) => a.t - b.t);
        return { pulsos: duracion(acordes), eventos };
    }

    // El nombre que sale en el pedal para una figura («Del estilo» dice cuál es).
    function nombreFigura(inst, figuraId, estiloId) {
        const f = buscar(FIGURAS[inst] || [], figuraId);
        const est = estilo(estiloId);
        if (inst === "guitarra" && figuraId === "ritmo") return NOMBRE_PATRON[est.ritmoGuitarra] || "Del estilo";
        if (inst === "piano" && figuraId === "comping") return NOMBRE_PATRON[est.comp] || "Comping";
        return f ? f.nombre : figuraId;
    }

    /* ==========================================================================
     * LA AYUDA: caminos para improvisar
     * ========================================================================== */

    const ESCALA_DEL_MODO = { mayor: "major", menor: "minor", dorico: "dorian", frigio: "phrygian", lidio: "lydian", mixolidio: "mixolydian" };

    // Los nombres en castellano corto, para las frases.
    const ESCALAS = {
        major:            { nombre: "mayor", modo: "jónico", color: 11 },
        minor:            { nombre: "menor", modo: "eólico", color: 8 },
        dorian:           { nombre: "dórica", modo: "dórico", color: 9 },
        phrygian:         { nombre: "frigia", modo: "frigio", color: 1 },
        lydian:           { nombre: "lidia", modo: "lidio", color: 6 },
        mixolydian:       { nombre: "mixolidia", modo: "mixolidio", color: 10 },
        locrian:          { nombre: "locria", modo: "locrio", color: 6 },
        melodic_minor:    { nombre: "menor melódica", modo: "menor melódica", color: 11 },
        harmonic_minor:   { nombre: "menor armónica", modo: "menor armónica", color: 11 },
        pentatonic_major: { nombre: "pentatónica mayor" },
        pentatonic_minor: { nombre: "pentatónica menor" },
        blues:            { nombre: "de blues", color: 6 },
        diminished:       { nombre: "disminuida", modo: "disminuida (tono-semitono)", color: null }
    };
    const INTERVALOS_ESCALA = {
        major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
        melodic_minor: [0, 2, 3, 5, 7, 9, 11], pentatonic_major: [0, 2, 4, 7, 9], pentatonic_minor: [0, 3, 5, 7, 10],
        blues: [0, 3, 5, 6, 7, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10],
        lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10], locrian: [0, 1, 3, 5, 6, 8, 10],
        diminished: [0, 2, 3, 5, 6, 8, 9, 11]
    };
    // Los modos de la escala mayor, en orden desde cada grado.
    const MODOS_MAYOR = ["major", "dorian", "phrygian", "lydian", "mixolydian", "minor", "locrian"];

    const NOMBRE_INTERVALO = {
        1: "2ª menor", 2: "2ª mayor", 3: "3ª menor", 4: "3ª mayor", 5: "4ª justa", 6: "4ª aumentada",
        7: "5ª justa", 8: "6ª menor", 9: "6ª mayor", 10: "7ª menor", 11: "7ª mayor"
    };
    const NOMBRE_INTERVALO_CORTO = { 1: "♭2", 2: "9ª", 3: "3ª", 4: "3ª", 5: "4ª", 6: "♯4", 7: "5ª", 8: "♭6", 9: "6ª", 10: "7ª", 11: "7ª" };

    function escala(raiz, presetId) {
        const ints = INTERVALOS_ESCALA[presetId];
        return { raiz, presetId, intervalos: ints, pcs: ints.map(i => mod12(raiz + i)) };
    }
    /* «Do mayor», «la pentatónica menor de La», «la escala de blues de La»:
     * cada una como se dice, para que la frase se lea de corrido. */
    function nombreEscala(e, bemoles) {
        const nota = nombreNotaEs(e.raiz, bemoles);
        if (e.presetId === "pentatonic_major") return "la pentatónica mayor de " + nota;
        if (e.presetId === "pentatonic_minor") return "la pentatónica menor de " + nota;
        if (e.presetId === "blues") return "la escala de blues de " + nota;
        return nota + " " + ESCALAS[e.presetId].nombre;
    }
    const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
    function nombreModo(e, bemoles) {
        return nombreNotaEs(e.raiz, bemoles) + " " + (ESCALAS[e.presetId].modo || ESCALAS[e.presetId].nombre);
    }

    const pcsDe = (a) => [...new Set(a.intervalos.map(i => mod12(a.raiz + i)))];
    const terceraDe = (a) => { const t = a.intervalos.find(i => i === 3 || i === 4); return t === undefined ? null : mod12(a.raiz + t); };
    const septimaDe = (a) => { const s = a.intervalos.find(i => i === 10 || i === 11 || (i === 9 && a.calidad === "dim7")); return s === undefined ? null : mod12(a.raiz + s); };

    /* El modo de un acorde. Si sus notas caben en un modo de la tonalidad
     * (mayor relativa), ese; si no, por su calidad. */
    function modoDelAcorde(a, tono, modoProg) {
        const relMayor = mod12(tono + (A_RELATIVA_MAYOR[modoProg] || 0));
        const mayor = INTERVALOS_ESCALA.major.map(i => mod12(relMayor + i));
        const pcs = pcsDe(a);
        const grado = mayor.indexOf(a.raiz);
        if (grado >= 0 && pcs.every(pc => mayor.includes(pc))) return escala(a.raiz, MODOS_MAYOR[grado]);
        const q = a.calidad;
        if (q === "7" || q === "9" || q === "7sus4") return escala(a.raiz, "mixolydian");
        if (q === "7b9") return escala(mod12(a.raiz + 5), "harmonic_minor");     // el V de la menor armónica
        if (q === "m7b5") return escala(a.raiz, "locrian");
        if (q === "dim7") return escala(a.raiz, "diminished");
        if (q === "m6" || q === "m(maj7)") return escala(a.raiz, "melodic_minor");
        if (q === "m" || q === "m7" || q === "m9") return escala(a.raiz, "dorian");
        if (q === "maj7" || q === "maj9" || q === "") return escala(a.raiz, "lydian");
        return escala(a.raiz, "major");
    }

    /* Una nota del acorde que baje (o suba) medio tono o un tono hasta una
     * nota del siguiente: la resolución que más se oye. La 7ª y la 3ª primero. */
    function resolucion(a, sig) {
        if (!sig || sig === a) return null;
        const destino = pcsDe(sig);
        const guias = [septimaDe(a), terceraDe(a)].filter(x => x !== null);
        for (const g of guias) {
            if (destino.includes(g)) continue;              // si se queda, no resuelve
            for (const paso of [-1, 1, -2]) {
                const d = mod12(g + paso);
                if (destino.includes(d)) return { de: g, a: d };
            }
        }
        return null;
    }

    // Con teoria-core.js cargado (0.17): ¿la nota roza con el acorde?
    function colorRoza(pc, acorde) {
        const T = global.TeoriaKharo;
        return !!(T && T.notaSobreAcorde(pc, acorde).categoria === "evitar");
    }

    const CAMINOS = [
        { id: "simple", nombre: "Simple", nivel: 1 },
        { id: "pentatonica", nombre: "Pentatónica", nivel: 1 },
        { id: "notas", nombre: "Notas del acorde", nivel: 2 },
        { id: "modal", nombre: "Modal", nivel: 3 }
    ];
    const NIVELES = ["", "Empezar", "Seguir", "Ir más lejos"];

    /* Para cada camino y cada acorde: la escala, la nota a la que apuntar, la
     * nota de color (si la hay), la frase de la línea de abajo y el porqué
     * del globo. `prog` da el modo y la familia (el blues tiene sus reglas). */
    function caminos(acordes, tono, prog) {
        const p = typeof prog === "string" ? progresion(prog) : prog;
        const modoProg = p.modo || "mayor";
        const blues = p.familia === "blues";
        const bem = conBemoles(tono, modoProg);
        const n = (pc) => nombreNotaEs(pc, bem);
        const escalaTono = escala(tono, ESCALA_DEL_MODO[modoProg] || "major");
        const menorDeFondo = ["menor", "dorico", "frigio"].includes(modoProg);

        const fichas = (a, e, apunta, color) => ({
            notas: e.pcs,
            acorde: pcsDe(a),
            raiz: a.raiz,
            apunta,
            color
        });

        const resultado = {};

        // --- Simple: una escala para todo.
        resultado.simple = acordes.map((a, i) => {
            const sig = acordes[(i + 1) % acordes.length];
            const e = blues ? escala(tono, modoProg === "menor" ? "pentatonic_minor" : "blues") : escalaTono;
            const fuera = pcsDe(a).filter(pc => !e.pcs.includes(pc));
            const apunta = e.pcs.includes(a.raiz) ? a.raiz : tono;
            const nombre = nombreEscala(e, bem);
            const res = resolucion(a, sig);
            return {
                escala: e, nombre, apunta, color: null, resolucion: res,
                ...fichas(a, e, apunta, null),
                linea: `Toca ${nombre} sobre todo. Termina tus frases en ${n(tono)}.`,
                porque: fuera.length && !blues
                    ? `${a.simbolo} trae ${fuera.length === 1 ? "una nota" : "notas"} de fuera (${fuera.map(n).join(", ")}). Si algo suena raro, muévete un traste: al lado siempre hay una que encaja.`
                    : blues
                        ? `En el blues la misma escala sirve para los tres acordes. El roce con el acorde no es un error: es el sonido del blues.`
                        : `${a.simbolo} sale de ${nombre}: todas sus notas están en la escala, así que no hay nota que choque.`
            };
        });

        // --- Pentatónica: cinco notas que no fallan.
        resultado.pentatonica = acordes.map((a, i) => {
            const sig = acordes[(i + 1) % acordes.length];
            let e, nombre, porque;
            if (blues || menorDeFondo) {
                e = escala(tono, "pentatonic_minor");
                nombre = nombreEscala(e, bem);
                porque = blues
                    ? `La pentatónica menor encima de acordes mayores con 7ª: ese choque de 3ª menor contra 3ª mayor es el blues.`
                    : `Son cinco notas de la escala menor sin la 2ª ni la 6ª, las dos que más chocan con algún acorde.`;
            } else {
                e = escala(tono, "pentatonic_major");
                const relativa = mod12(tono + 9);
                nombre = nombreEscala(e, bem);
                porque = `Son cinco notas de ${n(tono)} mayor sin ${n(tono + 5)} ni ${n(tono + 11)}, las dos que más chocan. Es la misma forma que la pentatónica de ${n(relativa)} menor.`;
            }
            const candidatos = [terceraDe(a), a.raiz, mod12(a.raiz + 7)].filter(x => x !== null);
            const apunta = candidatos.find(pc => e.pcs.includes(pc)) ?? e.pcs.reduce((m, pc) => Math.min(mod12(pc - a.raiz), mod12(a.raiz - pc)) < Math.min(mod12(m - a.raiz), mod12(a.raiz - m)) ? pc : m, e.pcs[0]);
            return {
                escala: e, nombre, apunta, color: null, resolucion: resolucion(a, sig),
                ...fichas(a, e, apunta, null),
                linea: `${mayuscula(nombre)} sirve para todo. Sobre ${a.simbolo}, apoya en ${n(apunta)}.`,
                porque
            };
        });

        // --- Notas del acorde: el arpegio, acorde por acorde.
        resultado.notas = acordes.map((a, i) => {
            const sig = acordes[(i + 1) % acordes.length];
            const pcs = pcsDe(a);
            const e = { raiz: a.raiz, presetId: null, intervalos: a.intervalos.map(mod12), pcs };
            const tercera = terceraDe(a), septima = septimaDe(a);
            const apunta = tercera !== null ? tercera : a.raiz;
            const color = septima;
            const res = resolucion(a, sig);
            const cual = tercera !== null ? "3ª" : "raíz";
            return {
                escala: e, nombre: "Arpegio de " + a.simbolo, apunta, color, resolucion: res,
                ...fichas(a, e, apunta, color),
                linea: `Toca solo ${pcs.map(n).join(", ")}. Cae en ${n(apunta)} justo cuando entra ${a.simbolo}.` +
                    (res ? ` Luego lleva ${n(res.de)} a ${n(res.a)}.` : ""),
                porque: `Las notas del acorde nunca chocan con él. La ${cual} es la que dice qué acorde suena: si la tocas al cambiar, se oye el cambio aunque la banda no estuviera.`
            };
        });

        // --- Modal: un modo por acorde, con su nota de color.
        resultado.modal = acordes.map((a, i) => {
            const sig = acordes[(i + 1) % acordes.length];
            const e = modoDelAcorde(a, tono, modoProg);
            const info = ESCALAS[e.presetId];
            const color = info.color !== undefined && info.color !== null ? mod12(e.raiz + info.color) : null;
            // Si la nota de color ya es del acorde, la que manda es la que no está.
            const nombre = nombreModo(e, bem);
            const res = resolucion(a, sig);
            const apunta = terceraDe(a) ?? a.raiz;
            const centro = e.raiz === a.raiz ? n(a.raiz) : n(e.raiz);
            const madre = e.presetId === "harmonic_minor" ? nombreEscala(e, bem) : null;
            const intervaloColor = color !== null ? mod12(color - a.raiz) : null;
            return {
                escala: e, nombre, apunta, color, resolucion: res,
                ...fichas(a, e, apunta, color),
                // La línea va debajo de «Ahora G7»: no repite el acorde.
                linea: `${mayuscula(nombre)}.` + (color === null ? ""
                    // 0.17: si la biblioteca de teoría dice que la nota de color roza con
                    // el acorde (medio tono sobre una de sus notas), no se pide en pulso fuerte.
                    : colorRoza(color, a) ? ` Su color es ${n(color)}, pero roza con ${a.simbolo}: tócala de paso, en un tiempo débil.`
                    : ` Su color es ${n(color)}: ponla en un pulso fuerte.`) +
                    (res ? ` Busca ${n(res.de)} y llévala a ${n(res.a)} cuando entre ${sig.simbolo}.` : ""),
                porque: (madre
                    ? `${a.simbolo} es el V de ${madre}: la escala trae la tensión que pide resolver.`
                    : `${nombre} son siete notas con ${centro} de centro.`) +
                    (color !== null ? ` ${n(color)} es su nota de color: la ${NOMBRE_INTERVALO[intervaloColor] || NOMBRE_INTERVALO_CORTO[intervaloColor]} sobre ${n(a.raiz)}.` : "")
            };
        });

        return {
            caminos: CAMINOS.map(c => ({ ...c, nivelNombre: NIVELES[c.nivel] })),
            porCamino: resultado,
            tono,
            modo: modoProg,
            bemoles: bem
        };
    }

    /* --- Mis canciones --------------------------------------------------------- *
     * Una canción de Canción, ya expandida en compases con su acorde, a la
     * forma de la banda. `compases`: [{ raiz, intervalos, simbolo, pulsos }]
     * — la conversión desde la biblioteca de acordes la hace la interfaz. */
    function desdeCancion(compases) {
        let desde = 0;
        const salida = [];
        compases.forEach(c => {
            if (!c || c.raiz === null || c.raiz === undefined) return;
            const ultimo = salida[salida.length - 1];
            if (ultimo && ultimo.simbolo === c.simbolo) { ultimo.pulsos += c.pulsos; desde += c.pulsos; return; }
            salida.push({ raiz: mod12(c.raiz), calidad: c.calidad || "", intervalos: c.intervalos.slice(), simbolo: c.simbolo, grado: c.grado || "", pulsos: c.pulsos, desde });
            desde += c.pulsos;
        });
        return salida;
    }

    /* --- API pública ----------------------------------------------------------- */

    global.BandaCore = {
        PROGRESIONES, FAMILIAS, ESTILOS, FIGURAS, FORMACIONES, INTENSIDADES, CADA_ACORDE, CALIDADES,
        INSTRUMENTOS, PIEZAS, PATRONES, CAMINOS, NIVELES, INTERVALOS_ESCALA, ESCALAS,
        progresion, estilo, resolver, duracion, acordeEn, arreglar, caminos, desdeCancion,
        nombreNota, nombreNotaEs, nombreFigura, conBemoles, conSwing, leerGrado,
        // Para las pruebas:
        _vozPiano: vozPiano, _vozGuitarra: vozGuitarra, _resolucion: resolucion, _modoDelAcorde: modoDelAcorde
    };
})(typeof window !== "undefined" ? window : this);
