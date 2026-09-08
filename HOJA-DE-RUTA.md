# Hoja de ruta de la interfaz de Kharo Studio — prompt de trabajo

> Cómo usar este archivo: pégalo entero al principio de una sesión y di qué fase toca
> («haz la fase 0», «sigue con la fase 2 donde lo dejamos»). Contiene el contexto, las
> reglas, las seis fases con sus tareas y el criterio de cuándo cada una está hecha.
> Base: revisión v3 de `DOCUMENTACION.md`, 6 de septiembre de 2026.

---

## Quién eres y qué vas a hacer

Eres el desarrollador de interfaz de **Kharo Studio**, una app web en un solo `index.html`
(React + Tailwind + Babel en el navegador, sin build) para crear diagramas de acordes,
escalas y arpegios de instrumentos de cuerda, montar canciones con ellos y exportar hojas.

Vas a ejecutar una hoja de ruta de seis fases para arreglar su interfaz. El diagnóstico de
partida, medido en el navegador, es este:

- **La app no perdona.** No hay deshacer en ninguna parte; el único atajo de teclado es
  `Escape`. Borrar un acorde de la biblioteca lo quita de todos los compases de todas las
  canciones sin preguntar, desde un icono de 19×14 px pegado a «Añadir». El mástil no se
  guarda: un F5 lo pierde.
- **La app no enseña lo que sabe.** Arrastrar de una nota a otra, el menú de la flecha y las
  tríadas sólo existen dentro de un modo («A mano») que se enciende en un panel, con las
  instrucciones dentro del panel, para usarse fuera del panel.
- **La app no se lee.** 162 tamaños de letra arbitrarios por debajo de 12 px
  (109×`text-[10px]`, 25×`9px`, 2×`8px`). Bordes a 1,30:1. `--k-text-faint` a 3,77:1.
  Ninguna regla `:focus-visible`. El color de texto más usado (`text-slate-400`, 43 veces)
  viene de Tailwind, no de un token.
- **Tres bugs visibles**: «Ejercicios» recortado en móvil (16 px tocables de 68), la etiqueta
  de la herramienta activa pintada sobre el botón vecino en la barra móvil, y 5 clases de
  Tailwind que no existen (`text-slate-350`, `text-indigo-450`, `border-slate-850`…).

---

## Cómo trabajar en este código

Antes de tocar nada, lee `README.md` y `DOCUMENTACION.md`, sobre todo:

- **§3**: el JSX vive en tres bloques `<script type="text/plain">` que Babel concatena y
  compila al cargar. **Un error de sintaxis es una pantalla en blanco sin número de línea.**
  Trabaja en tandas pequeñas, recarga entre tanda y tanda, y ten la consola abierta.
- **§12**: la piel (chrome) no es la obra (el diagrama y las hojas que se exportan). Un tema
  no puede tocar la obra. **El SVG exportado no contiene ningún `var(--k-*)`**, y tiene que
  seguir así.

Reglas de trabajo:

1. **Una fase por sesión**, en el orden de dependencias de abajo. No mezcles fases.
2. **Antes de empezar cualquier fase que toque CSS o clases**, exporta tres SVG de referencia:
   un acorde, una escala con recorrido, y una hoja de canción. Guárdalos. Al terminar, exporta
   los mismos tres y haz `diff`. **Tienen que salir idénticos.**
3. **No renombres** `bgStyleColor`, `dotRadiusStyle` ni el resto de nombres derivados del
   estilo: tienen ~109 apariciones y un olvido es un `ReferenceError` que deja la app en blanco.
4. Los tres bloques de JSX comparten un único ámbito. Lo que definas en el bloque `core` lo
   ven los otros dos sin importar nada.
5. Los textos de la interfaz hablan como el README: en castellano llano, de músico a músico.
   Nada de jerga de herramienta de diseño.
6. Al cerrar una fase: corre el script de comprobación de abajo en portada, estudio, panel
   abierto, Canción y Ejercicios, a 1280 y a 375 px. Repasa el «Hecho cuando» punto por
   punto. Anota en `DOCUMENTACION.md` qué cambió y los números nuevos. **Di con claridad
   qué queda sin hacer**; no cierres una fase a medias como si estuviera entera.

---

## Reglas del sistema — todo cambio nuevo las cumple

Van también a `DOCUMENTACION.md`, junto a la regla de la piel y la obra.

1. **Ningún `text-[Npx]` nuevo.** Los tamaños salen de la escala de `theme.css`. Si falta
   uno, se añade a la escala.
2. **Ninguna clase de color de Tailwind nueva.** Sólo tokens `--k-*`. El bloque de
   compatibilidad de `ui.css` no vuelve a crecer.
3. **Toda acción destructiva tiene deshacer o confirmación. Nunca ninguna.** Frecuente y
   pequeña → toast con «Deshacer». Rara y grande → `confirm` que diga qué se pierde.
4. **Todo modo tiene piel.** Si el lienzo se comporta distinto, se ve distinto. Un cursor no
   es una piel.
5. **La instrucción vive donde está la mano.** Lo que explica cómo usar el lienzo se lee en el
   lienzo, no en el panel que encendió el modo.
6. **La obra exportada no cambia.** Se comprueba con el `diff` de los tres SVG.
7. **Nada tocable baja de 44 px en móvil ni de 28 en escritorio.** Y lo destructivo nunca va
   pegado a lo primario.

---

## Las fases

| | Fase | Sesiones | Depende de |
|---|---|---|---|
| 0 | Parar la sangre | ½ | nada |
| 1 | Que perdone | 2 | la 0 |
| 2 | Que se lea | 2–3 | nada |
| 3 | El lienzo | 2 | la 1 |
| 4 | Flujo y navegación | 2 | la 2 |
| 5 | Móvil y cierre | 1–2 | todas |

Las fases 1 y 2 son independientes entre sí; se pueden alternar.

---

### Fase 0 — Parar la sangre

Bugs visibles. Ninguno es de diseño; ninguno debería esperar.

**«Ejercicios» recortado en móvil** — `index.html`, fila de pestañas; `ui.css` `.k-tabs`.
La fila necesita 424 px en 359 y el padre lleva `overflow-hidden`. Que el segundo grupo
(Canción / Ejercicios) baje a su propia fila por debajo de 480 px. No lo escondas con scroll.

**Etiqueta de herramienta encima del botón vecino** — `index.html`, toolbar móvil.
El `span` de la etiqueta activa es `position:absolute` y se pinta 62 px a la derecha de su
botón. En la barra horizontal la etiqueta sobra (ya hay `title`): ocúltala por debajo de `md`.

**Clases de Tailwind que no existen** — `text-slate-350` ×2, `text-indigo-450`,
`border-slate-850`, `text-slate-200`, `text-slate-100`. No hay `tailwind.config`; no hacen
nada. Sustituye por el token que se quería: `var(--k-text-muted)`, `var(--k-highlight)`,
`var(--k-border)`.

**`showToast` sin `clearTimeout`** — `index.html:4841`.
Un toast que llega 2,8 s después de otro muere a los 200 ms. Guarda el temporizador en un
`useRef`, límpialo al entrar, y añade una acción opcional: `showToast(msg, { texto, alPulsar })`
con 8 s de vida cuando hay acción. **La fase 1 se apoya en esto.**

**Hecho cuando:**
- En 375 px los seis destinos del header se tocan enteros.
- En la barra móvil ninguna etiqueta pisa otro botón.
- `grep -c "slate-350\|indigo-450\|slate-850" index.html` devuelve 0.
- Dos toasts seguidos viven cada uno su tiempo entero.

---

### Fase 1 — Que perdone

La que más cambia cómo se siente usar la app. Es más barata de lo que parece: cada cambio
del mástil ya es un gesto discreto (`setBarres` sólo se llama al soltar; `conectarEnRecorrido`
una vez en el `pointerUp`), así que un historial de fotos funciona sin reescribir nada.

**La foto del estudio** — dentro de `App()`.
Un `useMemo` con lo que el usuario considera «su trabajo»: `dots`, `barres`, `stringStates`,
`dotsLibre`, `stringStatesLibre`, `pathManual`, `instrument`, `tuning`, `tuningMidi`,
`numFrets`, `startingFret`.
**Fuera:** el estilo (tiene su propio «Reiniciar»), los paneles, el toast, la reproducción,
`dragCurrent`, `arrastreFlecha`. Meter el estilo es la trampa: mueves el radio, pulsas Ctrl+Z
para quitar una nota, y se deshace el radio.

**`useHistorial(foto, aplicar)`**.
Pila de fotos con índice, tope 60. Un `useEffect` sobre la foto empuja cuando cambia
(compara por `JSON.stringify`; la foto es pequeña). `deshacer` y `rehacer` mueven el índice
y llaman a `aplicar`.

**La bandera `restaurando`** — `index.html:4699`, efecto de `[instrument]`.
Restaurar `instrument` vuelve a disparar el efecto que pone la afinación de fábrica y, si
cambia el número de cuerdas, vacía el mástil recién recuperado. Un `useRef` que el efecto
consulta al entrar (`if (restaurando.current) return;`) y que baja solo en un `useEffect`
sin dependencias declarado **después**: en el mismo commit corre detrás.

**Atajos** — junto al `keydown` de Escape, `index.html:4666`.
`Ctrl+Z` deshace; `Ctrl+Shift+Z` y `Ctrl+Y` rehacen. Sólo con `appView === "studio"` y el
foco fuera de un campo de texto. Toast corto: «Deshecho» / «Nada que deshacer».

**Deshacer al borrar un acorde de la biblioteca** — `index.html:4916`, `removeChordFromLibrary`.
Ya se calcula `usos` antes de borrar. Quédate la copia de `chordLibrary` y de `song.sections`
y ofrécela en el toast: «C borrado, y quitado de 8 compases · Deshacer». No pongas `confirm`:
el diálogo pone el peso antes de saber si te equivocaste; el toast lo pone cuando lo sabes.

**La papelera, al menú** — `index.html:1296`, `abrirMenuAcorde`.
Quita el icono de 19×14 px pegado a «Añadir». Borrar pasa al menú contextual que ya existe.
La tarjeta se queda con «Añadir» a lo ancho, con área táctil de verdad.

**El mástil se guarda** — `song-core.js`, junto a `kharo.chords.v1`.
Quinta clave `kharo.studio.v1` con la misma foto, mismo respiro de 500 ms que el resto.

**Cambiar a un instrumento con otro número de cuerdas.**
Sigue vaciando (la razón del comentario es buena) pero lo dice: toast «Mástil vaciado: el
bajo tiene 4 cuerdas · Deshacer». Con el historial puesto, sale gratis.

**Hecho cuando:**
- Cualquier cosa hecha en el mástil se deshace con Ctrl+Z y se rehace con Ctrl+Shift+Z,
  incluido cambiar de instrumento.
- Mover el radio de nota y pulsar Ctrl+Z **no** toca el radio.
- Borrar un acorde usado en 3 compases y pulsar «Deshacer» devuelve el acorde y los 3 compases.
- F5 con una escala a medio trazar devuelve la escala.

---

### Fase 2 — Que se lea

`theme.css` no tiene escala de tamaños ni de espacios. Trabajo mecánico y ancho.
**Exporta los tres SVG de referencia antes de empezar.**

**Escala tipográfica y de espacio** — `theme.css`.
`--k-text-xs` 12 · `sm` 13 · `md` 14 · `lg` 16 · `xl` 18 · `2xl` 22.
`--k-space-1…6` = 4 · 8 · 12 · 16 · 24 · 32.
**El suelo es 12 px.** Lo que está a 8–10 sube a 12; lo que está a 11–12 sube a 13. Los
rótulos en mayúsculas llevan `letter-spacing: .06em`.

**Clases `.k-text-*` y migración** — `ui.css`, `index.html`.
162 sustituciones de `text-[Npx]` y 59 de `text-xs`. Hazlas con `sed` por tamaño, de mayor a
menor, mirando la app entre tanda y tanda. En la barra de estado nada baja de 13.

**Bordes que se vean** — `theme.css`: `--k-border`, `--k-border-strong`, `--k-surface`.
Hoy borde sobre panel = 1,30:1; panel sobre fondo = 1,05:1. Objetivo: borde de componente
≥ 3:1 (del orden de `#2F63C4` sobre `#001D38`) y `--k-surface` un escalón más claro para que
un panel se separe del lienzo sin depender del borde.

**`--k-text-faint` a ≥ 4,5:1.** De `#64748b` (3,77:1) a `#8AA0B8` o similar.

**Foco visible** — `ui.css`.
`:focus-visible { outline: 2px solid var(--k-highlight); outline-offset: 2px; }` y quitar los
`focus:outline-none` del JSX.

**Retirar Tailwind de verdad** — `ui.css` bloque «en retirada», `index.html`.
Primero lo que el bloque **no** cubre: `text-slate-400/300/500`, `text-gray-*`,
`bg-indigo-500`, `border-indigo-500`. Después, cada regla del bloque que se queda sin usos
se borra.

**Hecho cuando:**
- `grep -c "text-\[[89]px\]\|text-\[1[01]px\]" index.html` devuelve 0.
- El script no lista ningún texto < 12 px ni ningún par < 4,5:1.
- Tab recorre toda la app y siempre se ve dónde está el foco.
- Los tres SVG exportados son byte a byte los de antes.

---

### Fase 3 — El lienzo

**El mástil a tamaño** — `ui.css:334`, `.k-fretboard-fit`.
Hoy `width:auto; height:auto; max-*:100%`: el `max` encoge y nunca agranda. Cambia a
`width:100%; height:100%`. Con `viewBox` y `preserveAspectRatio` por defecto el dibujo se
centra y escala. La clase no viaja al archivo exportado.

**…y las coordenadas, en el mismo cambio** — `index.html:6658` `puntoDelLienzo`;
`index.html:5831` `handleTouchMove`.
Las dos conversiones dan por hecho que la caja del SVG tiene la proporción exacta del dibujo.
Con la caja llenando el hueco sobra banda y la cuenta miente. Escala =
`Math.min(caja.width / width, caja.height / height)`; descuenta la banda centrada
`(caja.width - width * escala) / 2` antes de dividir. Deja **una sola** función que usen las
dos rutas. Si arreglas una y no la otra, ratón y dedo dejan de coincidir.

**Steppers pegados al mástil** — `FretStepper`.
Mismo contenedor flex que el SVG, `gap` fijo. Rótulos «Trastes» y «Posición» a 13 px al lado
del par, no a 8 px debajo del número.

**La pista viva** — `index.html:9301`.
De constante a función del estado:
- vacío → «Toca cualquier casilla del mástil.»
- con notas → «Toca las notas en el orden que quieras, o arrastra de una a otra.»
- con flechas → «Clic derecho sobre una flecha para cambiar el recorrido.»
- con tríadas → «Pasa por una ficha para verla; púlsala para dejarla puesta.»
Quita `hidden md:block`: en el móvil es donde más falta hace. 13 px, no 10.

**El modo de recorrido, fuera del cajón** — `index.html:7577` pestaña «A mano»; barra de
estado junto a «Sweep».
Un chip «A mano» en la barra de estado con la misma regla de aparición que Sweep. Dentro
del modo el lienzo cambia de piel: borde de acento alrededor del SVG y rótulo pegado
«Recorrido a mano · Esc para salir». `Esc` sale. La pestaña del panel se queda como espejo.

**La nota dice que se arrastra** — `index.html:6683`, `propsNotaDelMapa`.
Dentro del modo, sobre una nota del recorrido: `cursor: grab` (no `crosshair`) y un aro fino
del acento. Es piel: se pinta con una clase y se limpia en `svgParaExportar` como los nodos
`data-transient`.

**La flecha reacciona** — `index.html:7144`, zona de agarre.
La zona invisible de 12 px ya recibe el ratón; que su `hover` engorde un 50 % la flecha visible.

**`⋯` también en escritorio.**
Al pasar por una flecha, un botón `⋯` en su punto medio que abre el mismo menú que el clic
derecho.

**Hecho cuando:**
- En 1280×720 con 5 trastes el mástil ocupa ≥ 70 % del alto del hueco; con 24 sigue cabiendo.
- Arrastrar de una nota a otra acierta igual con ratón y con dedo, con banda y sin banda.
- Se sabe a simple vista si el modo «A mano» está encendido.

---

### Fase 4 — Flujo y navegación

**Dos ejes, dos tratamientos** — `ModeTabs`, `MODE_TABS`.
Los cuatro modos de dibujo (qué se dibuja) y las dos vistas (dónde estás) ya van en dos cajas.
Que el «activo» se pinte distinto por grupo, y que el grupo de modos se atenúe en Canción y
Ejercicios.

**El empty state, como botón** — `index.html:3665`, prop `vacio`.
De string a nodo: el texto que ya está más un `k-btn--primary` «Montar el primero» que lleva
a Acordes. Al pulsar «Guardar acorde» con un destino pendiente, el toast lleva «Volver a la
canción».

**Canción abre en el trabajo, no en los ajustes.**
Tonalidad, «En los diagramas» y «Nota de la canción» se pliegan en un bloque «Ajustes» cerrado
por defecto. La pantalla abre en biblioteca → progresión → letra; sólo esos tres llevan borde.

**Quitar lo que sale dos veces.**
El ritmo aparece como chip en la barra y como `select` en «Ritmo base»: se queda uno. Cada
tarjeta de acorde escribe su nombre encima y debajo del diagrama: se queda el de debajo.

**La voz del panel de Estilo.**
«Entorno vectorial» → «Colores». «Espesores & tamaños» → «Trazos y tamaños». «Detalles de la
obra» → «Notas y flechas».

**Tarjetas de la portada.**
Las dos de Documentos en una rejilla de cuatro dejan media fila vacía: rejilla de 3+3 o
Documentos a dos columnas anchas. «Se guarda todo en este navegador» sube del pie: es la
advertencia más útil de la página.

**Hecho cuando:**
- Nunca hay dos pestañas con el mismo aspecto de «activa» en el header.
- Con la biblioteca vacía, desde Canción se guarda el primer acorde y se vuelve en tres clics.
- Canción abre con la biblioteca visible sin scroll en 1280×720.

---

### Fase 5 — Móvil y cierre

**Pulsación larga = clic derecho.** `onContextMenu` no existe en iOS. Un `pointerdown` con
temporizador de 450 ms que abre el mismo menú; se cancela si el dedo se mueve más de 6 px.

**El slider de tempo.** 4 px de alto de área de click. `input[type=range]` con `height: 24px`
y el track fino por CSS.

**Objetivos en escritorio.** Nada pulsable baja de 28 px de alto en escritorio ni de 44 en móvil.

**Vaciar el bloque de compatibilidad** de `ui.css`. Si queda algo con usos, la fase 2 no acabó.

**Segunda pasada del script** en todas las pantallas, a 1280 y a 375. Anota en
`DOCUMENTACION.md` los números finales junto a los de partida.

**Hecho cuando:**
- En un iPhone se llega a todo lo que en escritorio se llega con clic derecho.
- El bloque «en retirada» de `ui.css` está vacío.
- El script no lista nada en ninguna pantalla.

---

## Script de comprobación

Pégalo en la consola con la app abierta. Lista lo que no cumple; si no lista nada, la
pantalla está bien.

```js
(() => {
  const lum = m => { const f = v => { v /= 255; return v <= .03928 ? v/12.92 : ((v+.055)/1.055)**2.4 };
    return .2126*f(m[0]) + .7152*f(m[1]) + .0722*f(m[2]) };
  const rgb = s => (s.match(/\d+(\.\d+)?/g) || [0,0,0]).slice(0,3).map(Number);
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)]; return ((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2) };
  const fondo = el => { for (; el; el = el.parentElement) { const c = getComputedStyle(el).backgroundColor;
    if (c && !c.startsWith('rgba(0, 0, 0, 0')) return rgb(c) } return rgb(getComputedStyle(document.body).backgroundColor) };
  const movil = innerWidth < 768, minimo = movil ? 44 : 28, avisos = [];
  document.querySelectorAll('body *').forEach(el => {
    const r = el.getBoundingClientRect(); if (!r.width) return;
    const cs = getComputedStyle(el), texto = el.childElementCount === 0 && (el.innerText || '').trim();
    if (texto) {
      const fs = parseFloat(cs.fontSize);
      if (fs < 12) avisos.push(['letra < 12px', fs + 'px', texto.slice(0, 30)]);
      const c = ratio(rgb(cs.color), fondo(el));
      if (c < 4.5) avisos.push(['contraste < 4.5', c + ':1', texto.slice(0, 30)]);
    }
    if (el.matches('button,[role=button],input,select,a[href]') && (r.width < minimo || r.height < minimo))
      avisos.push(['objetivo < ' + minimo, Math.round(r.width) + '×' + Math.round(r.height), (el.innerText || el.title || el.type || '').slice(0, 30)]);
    if (el.scrollWidth > el.clientWidth + 2 && cs.overflowX === 'visible' && el.clientWidth > 100)
      avisos.push(['desborda sin scroll', el.scrollWidth + ' en ' + el.clientWidth, (el.className || '').toString().slice(0, 30)]);
  });
  console.table(avisos.map(([que, valor, donde]) => ({ que, valor, donde })));
  return avisos.length + ' avisos';
})();
```

---

## Fuera de alcance

No lo hagas aunque parezca que toca:

- **Tema claro.** El gancho `[data-theme]` ya está; después de la fase 2 es sólo valores.
- **Tutorial u onboarding.** Si la fase 3 funciona, no hace falta.
- **Zoom y pan del lienzo.** Se decide después de la fase 3.
- **El piano.** Sigue sin integrar (§15).

Decisiones abiertas que son de Carlos, no tuyas — pregunta si llegas a ellas:

- Si «A mano» debería ser el modo por defecto al encender las flechas.
- Si la biblioteca de acordes merece vista propia en el header.
