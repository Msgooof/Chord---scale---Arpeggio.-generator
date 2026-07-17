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

    /* --- API pública ----------------------------------------------------- */
    global.KharoRender = {
        DIAGRAM_WIDTH,
        MIN_FRET, MAX_FRET,
        MIN_NUM_FRETS, MAX_NUM_FRETS,
        computeDiagramGeometry,
        computeTitleFontSize,
        clampStartingFret,
        clampNumFrets
    };
})(typeof window !== "undefined" ? window : this);
