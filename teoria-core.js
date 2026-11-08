/* ==========================================================================
 * KHARO STUDIO — BIBLIOTECA DE TEORÍA (0.17)
 * ==========================================================================
 *
 * Funciones puras, como theory-core.js: sin JSX, sin React, sin DOM. Se
 * carga después de banda-core.js y se expone como `window.TeoriaKharo`.
 *
 * Es la biblioteca que alimenta «Entender más» de la ayuda de Banda: qué es
 * cada intervalo, cómo está hecha cada escala, qué hace cada función armónica
 * y, sobre todo, qué hace CADA NOTA sobre CADA ACORDE y por qué.
 *
 *   INTERVALOS        los doce, con su consonancia y su papel.
 *   ESCALAS           construcción, escala madre, nota característica, sonido.
 *   TERMINOS          el glosario que usa el ensayo (se explica cada término
 *                     la primera vez que sale).
 *   notaSobreAcorde() la regla de acorde-escala: nota del acorde, tensión
 *                     disponible, tensión alterada, «con cuidado» o fuera.
 *   funcionDe()       tónica, subdominante o dominante de un acorde en su
 *                     tonalidad (o «modal» en un vamp).
 *   ensayo()          el texto de «Entender más»: cinco partes armadas con
 *                     todo lo anterior para la progresión que suena.
 *
 * Los textos son propios. Para contrastar la terminología se consultó (nov.
 * 2026): la regla de notas a evitar y tensiones disponibles de la teoría de
 * acorde-escala (medio tono sobre una nota del acorde = a evitar; un tono =
 * disponible; en la dominante, solo sobre 3ª y 7ª, con ♭9/♯9/♭13 como
 * alteradas), y la explicación del tritono de la dominante y su resolución
 * por semitono (sensible → tónica, 7ª → 3ª). Fuentes en DOCUMENTACION.md.
 * ========================================================================== */

(function (global) {
    "use strict";

    const mod12 = (n) => ((n % 12) + 12) % 12;
    const BC = () => global.BandaCore;
    const ES = { C: "Do", D: "Re", E: "Mi", F: "Fa", G: "Sol", A: "La", B: "Si" };
    const SOST = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
    const BEM = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
    function nombre(pc, bemoles) {
        const n = (bemoles ? BEM : SOST)[mod12(pc)];
        const base = ES[n[0]];
        return n[1] === "♭" ? base + " bemol" : n[1] === "♯" ? base + " sostenido" : base;
    }

    /* --- INTERVALOS ---------------------------------------------------------- *
     * `razon`: la fracción de la serie armónica a la que se parece (la
     * afinación temperada la redondea). Cuanto más simple, más «quieto»
     * suena: por eso la octava y la 5ª se funden y el semitono raspa. */
    const INTERVALOS = [
        { st: 0,  nombre: "unísono / octava", cifra: "1",  razon: "1:1 · 2:1", consonancia: "perfecta",
          papel: "Es la misma nota. Reposo total." },
        { st: 1,  nombre: "segunda menor",    cifra: "♭2", razon: "16:15", consonancia: "disonancia fuerte",
          papel: "El semitono: las dos notas se rozan y vibran. Es el intervalo que más pide moverse." },
        { st: 2,  nombre: "segunda mayor",    cifra: "2",  razon: "9:8", consonancia: "disonancia suave",
          papel: "Un tono. Roza, pero sin aspereza: por eso la 9ª se usa como color." },
        { st: 3,  nombre: "tercera menor",    cifra: "♭3", razon: "6:5", consonancia: "imperfecta",
          papel: "Hace menor a un acorde. Consonante, más oscura que la mayor." },
        { st: 4,  nombre: "tercera mayor",    cifra: "3",  razon: "5:4", consonancia: "imperfecta",
          papel: "Hace mayor a un acorde. Es el quinto armónico de la raíz: por eso suena tan natural." },
        { st: 5,  nombre: "cuarta justa",     cifra: "4",  razon: "4:3", consonancia: "perfecta (inestable sobre el bajo)",
          papel: "Sola es consonante, pero sobre la raíz tira hacia la 3ª: suena a «sin resolver»." },
        { st: 6,  nombre: "tritono",          cifra: "♯4 / ♭5", razon: "45:32", consonancia: "disonancia fuerte",
          papel: "Tres tonos: parte la octava justo por la mitad. Es el motor de la dominante." },
        { st: 7,  nombre: "quinta justa",     cifra: "5",  razon: "3:2", consonancia: "perfecta",
          papel: "El tercer armónico. Refuerza la raíz y casi no tiene color propio." },
        { st: 8,  nombre: "sexta menor",      cifra: "♭6", razon: "8:5", consonancia: "imperfecta",
          papel: "Consonante como intervalo, pero sobre un acorde queda medio tono encima de la 5ª y la empuja." },
        { st: 9,  nombre: "sexta mayor",      cifra: "6",  razon: "5:3", consonancia: "imperfecta",
          papel: "Dulce y abierta. Es la 13ª cuando se pone encima de un acorde con 7ª." },
        { st: 10, nombre: "séptima menor",    cifra: "♭7", razon: "16:9 (~7:4)", consonancia: "disonancia suave",
          papel: "La 7ª del acorde dominante y del menor 7. Le da inquietud al acorde sin romperlo." },
        { st: 11, nombre: "séptima mayor",    cifra: "7",  razon: "15:8", consonancia: "disonancia fuerte",
          papel: "Medio tono por debajo de la octava: la sensible. Pide subir a la raíz." }
    ];

    /* --- ESCALAS Y MODOS ------------------------------------------------------- *
     * `caracteristica`: el intervalo (desde la tónica) que distingue el modo
     * de sus vecinos. `madre`: de qué escala sale y desde qué grado. */
    const ESCALAS = {
        major: { nombre: "mayor (jónica)", pasos: "T T S T T T S", madre: "Es la escala madre: el primer modo de sí misma.",
            caracteristica: 11, sonido: "Luminosa y resuelta. Su 7ª mayor (la sensible) quiere volver a la tónica.",
            acordes: "Imaj7, I6, I69", usos: "Casi toda la música tonal: pop, canción, clásica." },
        dorian: { nombre: "dórica", pasos: "T S T T T S T", madre: "El modo que empieza en el 2º grado de la escala mayor.",
            caracteristica: 9, sonido: "Menor, pero con la 6ª mayor: suena menos triste, más abierta.",
            acordes: "m7, m6, m9 (el ii de un ii–V)", usos: "Jazz modal, funk, rock latino." },
        phrygian: { nombre: "frigia", pasos: "S T T T S T T", madre: "El modo del 3er grado de la escala mayor.",
            caracteristica: 1, sonido: "Menor y oscura; la ♭2 a medio tono de la tónica le da su aire flamenco.",
            acordes: "m, m7, sus4♭9", usos: "Flamenco, metal, música andaluza y de Oriente Próximo." },
        lydian: { nombre: "lidia", pasos: "T T T S T T S", madre: "El modo del 4º grado de la escala mayor.",
            caracteristica: 6, sonido: "Mayor y flotante: la ♯4 quita el único roce de la escala mayor.",
            acordes: "maj7, maj7♯11 (el IV de la tonalidad)", usos: "Bandas sonoras, jazz moderno, pop soñador." },
        mixolydian: { nombre: "mixolidia", pasos: "T T S T T S T", madre: "El modo del 5º grado de la escala mayor.",
            caracteristica: 10, sonido: "Mayor, con la 7ª menor: suena terrenal, a blues y a rock.",
            acordes: "7, 9, 13 (el V de la tonalidad)", usos: "Rock, blues, funk, folk." },
        minor: { nombre: "menor natural (eólica)", pasos: "T S T T S T T", madre: "El modo del 6º grado de la escala mayor (su relativa menor).",
            caracteristica: 8, sonido: "Menor y melancólica; la ♭6 es la que le da la tristeza.",
            acordes: "m, m7 (el vi de la tonalidad)", usos: "Pop, rock, balada." },
        locrian: { nombre: "locria", pasos: "S T T S T T T", madre: "El modo del 7º grado de la escala mayor.",
            caracteristica: 6, sonido: "Inestable: su 5ª disminuida no deja que la tónica descanse.",
            acordes: "m7♭5 (el ii de un ii–V menor)", usos: "Casi solo sobre el semidisminuido." },
        harmonic_minor: { nombre: "menor armónica", pasos: "T S T T S T+S S", madre: "La menor natural con la 7ª subida medio tono.",
            caracteristica: 11, sonido: "Menor y dramática: el salto de tono y medio entre ♭6 y 7 suena a lo lejano.",
            acordes: "m(maj7) en la tónica; su 5º modo da el V7♭9", usos: "Clásica, flamenco, metal neoclásico, el V7 de una tonalidad menor." },
        melodic_minor: { nombre: "menor melódica", pasos: "T S T T T T S", madre: "La menor con la 6ª y la 7ª subidas (la «de jazz», igual al subir y al bajar).",
            caracteristica: 11, sonido: "Menor y elegante: arriba suena casi a mayor.",
            acordes: "m6, m(maj7)", usos: "Jazz: sobre el menor de tónica y, desde otros grados, sobre dominantes alterados." },
        pentatonic_major: { nombre: "pentatónica mayor", pasos: "T T T+S T T+S", madre: "La escala mayor sin la 4ª ni la 7ª.",
            caracteristica: null, sonido: "Abierta y amable; sin semitonos, no tiene ninguna nota que raspe.",
            acordes: "Cualquier acorde mayor de la tonalidad", usos: "Country, pop, rock, música de casi todas las culturas." },
        pentatonic_minor: { nombre: "pentatónica menor", pasos: "T+S T T T+S T", madre: "La menor natural sin la 2ª ni la ♭6.",
            caracteristica: null, sonido: "Firme y cantable; es la primera escala de casi todo guitarrista.",
            acordes: "Acordes menores, y encima de los de 7ª en el blues", usos: "Rock, blues, soul." },
        blues: { nombre: "escala de blues", pasos: "T+S T S S T+S T", madre: "La pentatónica menor con la ♭5 añadida.",
            caracteristica: 6, sonido: "La ♭5 es la nota triste: se pasa por ella, se dobla, se arrastra.",
            acordes: "I7, IV7, V7 de un blues", usos: "Blues, rock, jazz." },
        diminished: { nombre: "disminuida (tono-semitono)", pasos: "T S T S T S T S", madre: "Simétrica: se repite cada tercera menor.",
            caracteristica: null, sonido: "Tensa y sin centro: cualquiera de sus notas puede ser la tónica.",
            acordes: "°7", usos: "Jazz, sobre acordes disminuidos de paso." }
    };

    /* --- GLOSARIO ----------------------------------------------------------------- */
    const TERMINOS = {
        funcion: ["Función armónica", "Lo que hace un acorde dentro de la tonalidad. La tónica es la casa (reposo); la subdominante sale de casa (movimiento); la dominante quiere volver (tensión). Casi todas las progresiones son variaciones de ese viaje."],
        tritono: ["Tritono", "Tres tonos: el intervalo que parte la octava por la mitad. En un acorde de 7ª de dominante está entre la 3ª y la 7ª, y es lo que le da su urgencia por resolver."],
        sensible: ["Sensible", "La 7ª mayor de la escala, medio tono por debajo de la tónica. Es la 3ª del acorde de dominante y pide subir a la tónica."],
        notasGuia: ["Notas guía", "La 3ª y la 7ª de un acorde. Son las que dicen qué acorde es (mayor, menor, dominante) y, al cambiar de acorde, casi siempre se mueven por medio tono o se quedan quietas."],
        tension: ["Tensión", "Una nota que no es del acorde pero cabe encima sin romperlo: la 9ª, la 11ª o la 13ª. Queda un tono por encima de una nota del acorde, así que colorea sin rozar."],
        evitar: ["Nota «con cuidado»", "La que queda medio tono por encima de una nota del acorde. Ese semitono hacia abajo forma una 9ª menor, el roce más áspero que hay. No está prohibida: se usa de paso, en un tiempo débil, camino de la nota de abajo."],
        alterada: ["Tensión alterada", "En un acorde dominante, la ♭9, la ♯9 y la ♭13 no se evitan: suben la tensión que ya tiene la dominante y hacen que la resolución se oiga más."],
        escalaMadre: ["Escala madre", "La escala mayor de la que sale un modo. Re dórico tiene las mismas notas que Do mayor; lo que cambia es la nota en la que te apoyas."],
        caracteristica: ["Nota característica", "La nota que distingue un modo de sus vecinos: la 6ª mayor del dórico, la ♯4 del lidio, la ♭7 del mixolidio. Si no la tocas, el modo no se oye."],
        pentatonica: ["Pentatónica", "Una escala de cinco notas sin semitonos. Al no tener ningún medio tono, ninguna de sus notas queda a medio tono de otra: por eso funciona sobre tantos acordes."],
        vamp: ["Vamp", "Uno o dos acordes que se repiten sin ir a ninguna parte. No hay viaje tónica-dominante: lo que se oye es un color, un modo."],
        prestamo: ["Préstamo modal", "Un acorde que sale de la escala paralela (la menor de la misma tónica, por ejemplo). Trae una nota de fuera y con ella un color distinto."],
        cromatismo: ["Aproximación cromática", "Llegar a una nota del acorde desde medio tono arriba o abajo. La nota de fuera dura poco y la de llegada se oye más fuerte."]
    };
    const termino = (clave) => ({ tipo: "termino", termino: TERMINOS[clave][0], texto: TERMINOS[clave][1] });

    /* --- QUÉ HACE UNA NOTA SOBRE UN ACORDE --------------------------------------- *
     * La regla de acorde-escala:
     *   1. Si está en el acorde: nota del acorde.
     *   2. En un acorde dominante (3ª mayor + 7ª menor) la regla mira solo las
     *      notas guía: la 4 y la 7ª mayor quedan medio tono encima de la 3ª y
     *      de la ♭7 → con cuidado; la ♭9, la ♯9 y la ♭13 → tensiones alteradas;
     *      9, ♯11 y 13 → disponibles.
     *   3. En los demás: medio tono encima de una nota del acorde → con cuidado;
     *      un tono encima → tensión disponible.
     *   4. En una tríada sin 7ª, las dos 7ª se pueden añadir como color.
     *   5. Lo que queda: fuera (nota de paso, cromatismo). */
    const CIFRA_ACORDE = { 0: "1", 1: "♭9", 2: "9", 3: "♭3", 4: "3", 5: "4", 6: "♭5", 7: "5", 8: "♯5", 9: "6", 10: "♭7", 11: "7" };
    const CIFRA_TENSION = { 1: "♭9", 2: "9", 3: "♯9", 5: "11", 6: "♯11", 8: "♭13", 9: "13", 10: "♭7", 11: "7" };
    const CIFRA_FUERA = { 1: "♭2", 2: "2", 3: "♭3", 4: "3", 5: "4", 6: "♭5", 7: "5", 8: "♭6", 9: "6", 10: "♭7", 11: "7" };

    function esDominante(ints) { return ints.includes(4) && ints.includes(10); }

    function notaSobreAcorde(pc, acorde, bemoles) {
        const ints = [...new Set(acorde.intervalos.map(mod12))];
        const rel = mod12(pc - acorde.raiz);
        const n = (x) => nombre(mod12(acorde.raiz + x), bemoles);
        const papelDe = (x) => {
            if (x === 0) return "raíz";
            if (x === 3 || x === 4) return "3ª";
            if (x === 7 || x === 6 || x === 8) return "5ª";
            if (x === 10 || x === 11) return "7ª";
            if (x === 9) return ints.includes(10) || ints.includes(11) ? "13ª" : "6ª";
            if (x === 2 || x === 1) return "9ª";
            if (x === 5) return "4ª";
            return "nota";
        };
        if (ints.includes(rel)) {
            const textos = {
                "raíz": "La raíz: la nota que da nombre al acorde. Siempre reposa, pero sola suena a que no pasa nada.",
                "3ª": `La 3ª ${rel === 3 ? "menor" : "mayor"}: decide si el acorde es ${rel === 3 ? "menor" : "mayor"}. Es la nota que mejor dice qué acorde suena.`,
                "5ª": rel === 7 ? "La 5ª: refuerza la raíz y casi no tiene color. Segura y neutra." : `La 5ª ${rel === 6 ? "disminuida" : "aumentada"}: es lo que hace al acorde inestable. Tócala y se oye la tensión.`,
                "7ª": rel === 11 ? "La 7ª mayor: el color dulce del maj7. Junto con la 3ª es nota guía." : "La 7ª menor: le da inquietud al acorde. Junto con la 3ª es nota guía y, al cambiar, suele bajar medio tono.",
                "6ª": "La 6ª: en los acordes de sexta ocupa el sitio de la 7ª. Suena abierta y estable.",
                "13ª": "La 13ª: forma parte del acorde. Brillante y abierta.",
                "9ª": rel === 1 ? "La ♭9: aquí es parte del acorde, y es lo que lo hace tan tenso." : "La 9ª: forma parte del acorde y le da aire.",
                "4ª": "La 4ª: en un sus4 sustituye a la 3ª. Suena suspendido, sin decir si es mayor o menor."
            };
            return { categoria: "acorde", intervalo: CIFRA_ACORDE[rel] === "6" && (ints.includes(10) || ints.includes(11)) ? "13" : CIFRA_ACORDE[rel], porque: textos[papelDe(rel)] || "Nota del acorde." };
        }
        const triada = !ints.some(i => i === 10 || i === 11 || i === 9);
        if (esDominante(ints)) {
            if (rel === 5) return { categoria: "evitar", intervalo: "4", porque: `Queda medio tono encima de la 3ª (${n(4)}) y la borra: el acorde suena a sus4. Tócala de paso hacia ${n(4)}.` };
            if (rel === 11) return { categoria: "evitar", intervalo: "7", porque: `La 7ª mayor contra la ♭7 (${n(10)}): dos séptimas peleando. De paso, nunca para quedarse.` };
            if (rel === 1) return { categoria: "alterada", intervalo: "♭9", porque: "Medio tono sobre la raíz, pero en una dominante es tensión buscada: empuja hacia el acorde siguiente, sobre todo si es menor." };
            if (rel === 3) return { categoria: "alterada", intervalo: "♯9", porque: "La 3ª menor encima de un acorde mayor: el roce del blues. En la dominante se oye como tensión, no como error." };
            if (rel === 8) return { categoria: "alterada", intervalo: "♭13", porque: "Medio tono encima de la 5ª: oscurece la dominante y pide resolver hacia abajo." };
            if (rel === 2) return { categoria: "tension", intervalo: "9", porque: "Un tono sobre la raíz: añade aire sin cambiar la función del acorde." };
            if (rel === 6) return { categoria: "tension", intervalo: "♯11", porque: "Un tono sobre la 3ª: el color lidio de la dominante. No choca porque deja la 3ª en paz." };
            if (rel === 9) return { categoria: "tension", intervalo: "13", porque: "Un tono sobre la 5ª: da brillo a la dominante sin quitarle tensión." };
        }
        const unSemitonoSobre = ints.find(i => mod12(i + 1) === rel);
        if (unSemitonoSobre !== undefined) {
            const de = mod12(acorde.raiz + unSemitonoSobre);
            const cifra = CIFRA_FUERA[rel] || CIFRA_TENSION[rel] || "?";
            if (rel === 5 && ints.includes(4)) return { categoria: "evitar", intervalo: "4", porque: `Queda medio tono encima de la 3ª (${nombre(de, bemoles)}) y la tapa: el acorde deja de sonar mayor y suena a sus4. Úsala de paso hacia la 3ª.` };
            return { categoria: "evitar", intervalo: cifra, porque: `Queda medio tono encima de ${nombre(de, bemoles)}, la ${papelDe(unSemitonoSobre)} del acorde. Ese semitono es el roce más áspero que hay: úsala de paso, en un tiempo débil, y baja a ${nombre(de, bemoles)}.` };
        }
        if (triada && (rel === 10 || rel === 11)) {
            return { categoria: "tension", intervalo: CIFRA_TENSION[rel], porque: rel === 10 ? "Una 7ª menor encima de la tríada: la vuelve dominante o menor 7. Color con algo de inquietud." : "Una 7ª mayor encima de la tríada: el color dulce del maj7." };
        }
        const unTonoSobre = ints.find(i => mod12(i + 2) === rel);
        if (unTonoSobre !== undefined) {
            const cifra = CIFRA_TENSION[rel] || CIFRA_FUERA[rel] || "?";
            const textos = {
                "9": "Un tono sobre la raíz: añade aire sin cambiar lo que el acorde es. Disponible.",
                "11": ints.includes(3) ? "Un tono sobre la ♭3: en un menor suena abierta y moderna. Disponible." : "Un tono sobre la 3ª. Disponible, pero se oye como suspensión.",
                "♯11": "Un tono sobre la 3ª mayor: el color lidio. No choca porque deja la 3ª tranquila.",
                "13": "Un tono sobre la 5ª: da brillo. Disponible.",
                "♭13": "Un tono sobre la ♭5: la tensión propia del semidisminuido. Disponible."
            };
            return { categoria: "tension", intervalo: cifra, porque: textos[cifra] || "Un tono por encima de una nota del acorde: colorea sin rozar. Disponible." };
        }
        return { categoria: "fuera", intervalo: CIFRA_FUERA[rel] || CIFRA_TENSION[rel] || "?", porque: "Ni es del acorde ni una tensión suya: suena a nota de paso. Funciona si va de camino, por medio tono, a una nota del acorde." };
    }

    /* --- FUNCIÓN ARMÓNICA ----------------------------------------------------------- */
    const FUNCION_MAYOR = { 0: "tonica", 2: "subdominante", 4: "tonica", 5: "subdominante", 7: "dominante", 9: "tonica", 11: "dominante" };
    const FUNCION_MENOR = { 0: "tonica", 2: "subdominante", 3: "tonica", 5: "subdominante", 7: "dominante", 8: "subdominante", 10: "dominante" };
    const NOMBRE_FUNCION = { tonica: "tónica", subdominante: "subdominante", dominante: "dominante", modal: "color modal", paso: "de paso" };

    function funcionDe(acorde, tono, prog) {
        if (prog.familia === "modal") return "modal";
        const rel = mod12(acorde.raiz - tono);
        if (prog.familia === "blues") return rel === 0 ? "tonica" : rel === 5 ? "subdominante" : rel === 7 ? "dominante" : (FUNCION_MAYOR[rel] || "paso");
        const tabla = prog.modo === "menor" ? FUNCION_MENOR : FUNCION_MAYOR;
        return tabla[rel] || "paso";
    }

    // ¿Este acorde es una dominante que resuelve en el siguiente (raíz una 5ª abajo)?
    function resuelveEn(a, sig) {
        const ints = a.intervalos.map(mod12);
        return esDominante(ints) && sig && mod12(sig.raiz - a.raiz) === 5;
    }

    // Lo que se mueven las notas guía de un acorde al siguiente.
    function movimientoGuia(a, sig) {
        const guias = [a.intervalos.map(mod12).find(i => i === 3 || i === 4), a.intervalos.map(mod12).find(i => i === 10 || i === 11)]
            .filter(x => x !== undefined).map(i => mod12(a.raiz + i));
        const destino = [...new Set(sig.intervalos.map(i => mod12(sig.raiz + i)))];
        return guias.map(g => {
            if (destino.includes(g)) return { de: g, a: g, paso: 0 };
            let mejor = null;
            destino.forEach(d => {
                const arriba = mod12(d - g), abajo = mod12(g - d);
                const paso = arriba <= abajo ? arriba : -abajo;
                if (!mejor || Math.abs(paso) < Math.abs(mejor.paso)) mejor = { de: g, a: d, paso };
            });
            return mejor;
        });
    }

    /* --- EL ENSAYO ----------------------------------------------------------------------- *
     * ensayo({ prog, acordes, tono, camino, guias, caminos, bemoles })
     *   → { titulo, subtitulo, secciones: [{ id, titulo, bloques: [...] }] }
     * Bloques: { tipo: "p", texto } · { tipo: "termino", termino, texto } ·
     *          { tipo: "acorde", idx, escala, intro, filas: [{ pc, intervalo, categoria, porque }] } */
    const NOMBRE_CAMINO = { simple: "Simple", pentatonica: "Pentatónica", notas: "Notas del acorde", modal: "Modal" };

    function ensayo({ prog, acordes, tono, camino, guias, caminos, bemoles }) {
        const n = (pc) => nombre(pc, bemoles);
        const lista = (xs) => xs.length <= 1 ? (xs[0] || "") : xs.slice(0, -1).join(", ") + " y " + xs[xs.length - 1];
        const unicos = [];
        acordes.forEach((a, i) => { if (!unicos.some(j => acordes[j].simbolo === a.simbolo)) unicos.push(i); });
        const usados = new Set();
        const usar = (clave) => { if (usados.has(clave)) return []; usados.add(clave); return [termino(clave)]; };
        const secciones = [];

        /* 1 · Qué está sonando */
        {
            const bloques = [];
            const funciones = acordes.map(a => funcionDe(a, tono, prog));
            const tonoTxt = `${n(tono)}${prog.modo === "menor" ? " menor" : prog.modo === "mayor" ? " mayor" : ""}`;
            bloques.push({ tipo: "p", texto: `Suena ${prog.nombre} en ${tonoTxt}: ${lista(unicos.map(i => `${acordes[i].simbolo} (${acordes[i].grado})`))}. ${acordes.length > unicos.length ? "Algunos acordes se repiten en la vuelta." : ""}`.trim() });
            if (prog.familia === "modal") {
                bloques.push({ tipo: "p", texto: `Aquí no hay un viaje de ida y vuelta: ${unicos.length === 1 ? "un solo acorde se queda" : "los acordes se alternan"} sin pedir resolver. Lo que manda no es la tensión sino el color del modo, y ese color lo pone una sola nota.` });
                bloques.push(...usar("vamp"));
            } else {
                const partes = unicos.map(i => `${acordes[i].simbolo} hace de ${NOMBRE_FUNCION[funciones[i]]}`);
                bloques.push({ tipo: "p", texto: `${lista(partes)}. ${prog.familia === "blues" ? "El blues rompe una regla: su tónica ya lleva 7ª menor, así que suena inquieta aunque sea la casa. Ese roce es el estilo." : "La progresión sale de casa, se tensa y vuelve: por eso, aunque se repita, siempre parece que avanza."}` });
                bloques.push(...usar("funcion"));
                const resoluciones = acordes.map((a, i) => ({ a, sig: acordes[(i + 1) % acordes.length] })).filter(x => resuelveEn(x.a, x.sig));
                const vistos = new Set();
                resoluciones.forEach(({ a, sig }) => {
                    const clave = a.simbolo + ">" + sig.simbolo;
                    if (vistos.has(clave)) return;
                    vistos.add(clave);
                    const tercera = mod12(a.raiz + 4), septima = mod12(a.raiz + 10);
                    const mov = movimientoGuia(a, sig);
                    const t = mov.find(m => m.de === tercera), s = mov.find(m => m.de === septima);
                    bloques.push({ tipo: "p", texto: `${a.simbolo} → ${sig.simbolo} es una resolución de dominante. Entre su 3ª (${n(tercera)}) y su 7ª (${n(septima)}) hay un tritono, el intervalo más inestable de la música tonal. Al cambiar, ${[t, s].filter(Boolean).map(m => m.paso === 0 ? `${n(m.de)} se queda quieta` : `${n(m.de)} ${m.paso > 0 ? "sube" : "baja"} a ${n(m.a)}`).join(" y ")}: el tritono se deshace y el oído descansa.` });
                    bloques.push(...usar("tritono"));
                    if (t && t.paso === 1) bloques.push(...usar("sensible"));
                });
                const fueraDeTono = unicos.filter(i => {
                    const madre = prog.modo === "menor" ? [0, 2, 3, 5, 7, 8, 10, 11] : [0, 2, 4, 5, 7, 9, 11];
                    return acordes[i].intervalos.some(x => !madre.includes(mod12(acordes[i].raiz + x - tono)));
                });
                if (fueraDeTono.length && prog.familia !== "blues") {
                    bloques.push({ tipo: "p", texto: `${lista(fueraDeTono.map(i => acordes[i].simbolo))} ${fueraDeTono.length === 1 ? "trae" : "traen"} notas que no son de ${tonoTxt}. Son el color de la progresión: escúchalas, porque ahí es donde una sola escala deja de servir.` });
                    bloques.push(...usar("prestamo"));
                }
            }
            secciones.push({ id: "sonando", titulo: "Qué está sonando", bloques });
        }

        /* 2 · Por qué funciona este camino */
        {
            const bloques = [];
            const g0 = guias[0];
            const info = g0.escala.presetId ? ESCALAS[g0.escala.presetId] : null;
            if (camino === "simple") {
                bloques.push({ tipo: "p", texto: `Una sola escala para toda la progresión: ${g0.nombre}. Funciona porque los acordes se construyen con sus mismas notas, apilando terceras dentro de ella. Si el acorde sale de la escala, ninguna nota de la escala puede ser del todo ajena a él.` });
                if (info) bloques.push({ tipo: "p", texto: `${g0.nombre.charAt(0).toUpperCase() + g0.nombre.slice(1)} se construye así: ${info.pasos} (T = tono, S = semitono). ${info.sonido}` });
                bloques.push({ tipo: "p", texto: "El límite: la escala no sabe qué acorde suena. Las mismas siete notas son tensión sobre un acorde y reposo sobre otro. Por eso, sobre cada acorde, unas notas descansan y otras piden moverse; la parte 3 te dice cuáles." });
            } else if (camino === "pentatonica") {
                bloques.push({ tipo: "p", texto: `${g0.nombre.charAt(0).toUpperCase() + g0.nombre.slice(1)}: cinco notas en vez de siete. Las dos que faltan son justo las que forman semitonos dentro de la escala, y un semitono es lo que hace que una nota raspe contra un acorde.` });
                if (info) bloques.push({ tipo: "p", texto: `Se construye así: ${info.pasos}. ${info.sonido} ${info.madre}` });
                bloques.push({ tipo: "p", texto: "Al quitar los semitonos, casi ninguna nota queda medio tono por encima de una nota de los acordes: se reducen al mínimo las notas «con cuidado». Lo que se pierde es precisión: suena bien en todas partes, pero no dibuja cada acorde." });
                bloques.push(...usar("pentatonica"));
            } else if (camino === "notas") {
                bloques.push({ tipo: "p", texto: "Tocar solo las notas de cada acorde es la forma más segura y la más exigente: no hay escala que te salve, tienes que saber qué acorde suena. A cambio, cada nota que tocas ES el acorde, y la banda podría callarse y se seguiría oyendo la progresión en tu línea." });
                bloques.push({ tipo: "p", texto: "La clave está en el cambio: cae en la 3ª o en la 7ª del acorde nuevo justo cuando entra. Son las notas que distinguen un acorde de otro; la raíz y la 5ª se comparten con demasiados." });
                bloques.push(...usar("notasGuia"));
            } else {
                bloques.push({ tipo: "p", texto: "Un modo por acorde. En una progresión diatónica todos salen de la misma escala madre, así que al cambiar de modo no cambian las notas: cambia la nota en la que te apoyas. Lo que sí cambia es la nota característica de cada modo, y es la que tienes que hacer oír." });
                const modos = unicos.map(i => guias[i]).filter(g => g.escala.presetId && ESCALAS[g.escala.presetId]);
                const vistos = new Set();
                modos.forEach(g => {
                    if (vistos.has(g.escala.presetId)) return;
                    vistos.add(g.escala.presetId);
                    const e = ESCALAS[g.escala.presetId];
                    bloques.push({ tipo: "p", texto: `${e.nombre.charAt(0).toUpperCase() + e.nombre.slice(1)} (${e.pasos}). ${e.madre} ${e.sonido}` });
                });
                bloques.push(...usar("escalaMadre"));
                bloques.push(...usar("caracteristica"));
            }
            secciones.push({ id: "camino", titulo: `Por qué funciona «${NOMBRE_CAMINO[camino]}»`, bloques });
        }

        /* 3 · Nota por nota */
        {
            const bloques = [{ tipo: "p", texto: "Cada nota del camino, medida contra cada acorde. «Nota del acorde» reposa. «Tensión» colorea sin romper. «Tensión alterada» solo existe en la dominante: sube la tensión a propósito. «Con cuidado» queda medio tono encima de una nota del acorde: úsala de paso, camino de la de abajo." }];
            bloques.push(...usar("tension"));
            bloques.push(...usar("evitar"));
            unicos.forEach(i => {
                const a = acordes[i], g = guias[i];
                const filas = g.notas.slice().sort((x, y) => mod12(x - g.escala.raiz) - mod12(y - g.escala.raiz))
                    .map(pc => ({ pc, ...notaSobreAcorde(pc, a, bemoles) }));
                const cuenta = (c) => filas.filter(f => f.categoria === c).length;
                const partes = [];
                if (cuenta("acorde")) partes.push(`${cuenta("acorde")} del acorde`);
                if (cuenta("tension") + cuenta("alterada")) partes.push(`${cuenta("tension") + cuenta("alterada")} ${cuenta("tension") + cuenta("alterada") === 1 ? "tensión" : "tensiones"}`);
                if (cuenta("evitar")) partes.push(`${cuenta("evitar")} con cuidado`);
                if (cuenta("fuera")) partes.push(`${cuenta("fuera")} de paso`);
                if (cuenta("alterada")) bloques.push(...usar("alterada"));
                bloques.push({ tipo: "acorde", idx: i, escala: camino === "notas" ? `arpegio de ${a.simbolo}` : g.nombre, intro: `De las ${filas.length} notas: ${lista(partes)}.`, filas });
            });
            secciones.push({ id: "notas", titulo: "Nota por nota", bloques });
        }

        /* 4 · De un acorde al siguiente */
        {
            const bloques = [{ tipo: "p", texto: "Lo que más se oye de una improvisación no es la escala: es cómo pasas de un acorde al siguiente. Las notas guía se mueven poco, casi siempre medio tono, y si tu línea hace lo mismo, la progresión se oye en lo que tocas." }];
            bloques.push(...usar("notasGuia"));
            const vistos = new Set();
            acordes.forEach((a, i) => {
                const sig = acordes[(i + 1) % acordes.length];
                if (sig === a || sig.simbolo === a.simbolo) return;
                const clave = a.simbolo + ">" + sig.simbolo;
                if (vistos.has(clave)) return;
                vistos.add(clave);
                const mov = movimientoGuia(a, sig);
                if (!mov.length) return;
                const frases = mov.map(m => m.paso === 0 ? `${n(m.de)} se queda (es nota de los dos)` : `${n(m.de)} ${m.paso > 0 ? "sube" : "baja"} ${Math.abs(m.paso) === 1 ? "medio tono" : Math.abs(m.paso) === 2 ? "un tono" : Math.abs(m.paso) + " semitonos"} a ${n(m.a)}`);
                bloques.push({ tipo: "p", texto: `${a.simbolo} → ${sig.simbolo}: ${lista(frases)}. Toca esa nota al final de ${a.simbolo} y llévala a su destino justo en el primer pulso de ${sig.simbolo}.` });
            });
            bloques.push({ tipo: "p", texto: "Un truco que siempre funciona: llega a la nota de destino desde medio tono arriba o abajo. La nota de fuera dura una corchea y la de llegada cae en el pulso fuerte; el oído oye la llegada, no el roce." });
            bloques.push(...usar("cromatismo"));
            secciones.push({ id: "pasos", titulo: "De un acorde al siguiente", bloques });
        }

        /* 5 · Para ir más lejos */
        {
            const orden = ["simple", "pentatonica", "notas", "modal"];
            const sig = orden[(orden.indexOf(camino) + 1) % orden.length];
            const queCambia = {
                simple: "Pasa a «Pentatónica» si quieres sonar más firme con menos notas, o a «Notas del acorde» si quieres que se oiga cada cambio.",
                pentatonica: "Pasa a «Notas del acorde»: la pentatónica suena bien en todas partes, pero no dibuja la progresión. Con los arpegios cada acorde se oye en tu línea.",
                notas: "Pasa a «Modal»: ya sabes dónde están las notas de cada acorde; ahora rellena entre ellas con su modo y haz oír su nota característica.",
                modal: "Vuelve a «Simple» con oídos nuevos: es la misma escala, pero ahora sabes en qué nota apoyarte sobre cada acorde."
            };
            const bloques = [
                { tipo: "p", texto: queCambia[camino] },
                { tipo: "p", texto: "Tres ejercicios para la próxima vuelta: (1) empieza tus frases después del pulso, no encima; (2) termina cada frase en una nota del acorde que suena; (3) toca solo dos notas por compás y elige bien cuáles. Menos notas, mejor escogidas, suenan a música." }
            ];
            secciones.push({ id: "mas", titulo: "Para ir más lejos", bloques, siguiente: sig });
        }

        return {
            titulo: `Entender más · ${NOMBRE_CAMINO[camino]}`,
            subtitulo: `${prog.nombre} en ${n(tono)}${prog.modo === "menor" ? " menor" : ""}. Por qué funciona lo que dice la ayuda, nota a nota.`,
            secciones
        };
    }

    global.TeoriaKharo = {
        INTERVALOS, ESCALAS, TERMINOS, NOMBRE_FUNCION,
        notaSobreAcorde, funcionDe, movimientoGuia, resuelveEn, ensayo, nombre
    };
})(typeof window !== "undefined" ? window : this);
