# Kharo Studio — Diagramas, canciones y ejercicios

Aplicación web que abre en una **portada** con lo que hay dentro, repartido en dos grupos.

**Diagramas** — se dibujan en el mástil, se escuchan y se exportan como **PNG o SVG** listos para
Illustrator. Instrumentos de cuerda: guitarra de 6/7/8, bajo de 4/5, ukelele.

- **Acordes** — pon las notas, arrastra para hacer cejilla; el nombre se detecta solo.
- **Escalas** — la escala por todo el mástil, con **en qué orden se tocan** las notas —arrastrando
  de una a otra, con tope por cuerda para que salga tocable— y **las tríadas que salen de la
  escala**, a un botón del diagrama.
- **Arpegios** — por juegos de cuerdas con sus inversiones y su tapping, o por posiciones.
- **Libre** — el mástil en blanco, **sin el tope de una nota por cuerda**: coloca las que
  necesites, en el orden que quieras, y traza las flechas del recorrido a mano. Con una escala de
  fondo opcional como guía.

**Documentos** — se montan con lo que ya has dibujado y salen en una hoja A4.

- **Canción** — encadena tus acordes en una progresión con duración y ritmo —incluido un **rasgueo
  escrito por ti**, que al escribirlo suena a percusión para poder contarlo—, coloca los acordes
  sobre la letra **arrastrándolos**, escúchalo todo seguido y saca una **hoja A4 en PNG, SVG o
  PDF**, con una página opcional que explica la tonalidad y sus grados.
- **Ejercicios** — fichas de técnica: digitaciones con su recorrido, a la velocidad que elijas. Se
  crean con un atajo desde Escalas, Arpegios y Libre.

Guarda **varias canciones y varios ejercicios**, con su gestor para abrirlos, duplicarlos y
borrarlos. Casi todo tiene **clic derecho**.

**En vivo:** https://kharomusicchordsgenerator.vercel.app

## Cómo se ejecuta

Abre `index.html` en el navegador. No hay build, ni `npm install`, ni servidor: React, Tailwind,
Babel, jsPDF y la tipografía van en `vendor/`, así que funciona sin internet. `vendor/` tiene que
acompañar siempre a `index.html`.

## Qué hay en cada archivo

| Archivo | Qué es |
|---|---|
| `index.html` | La aplicación: interfaz, dibujo del mástil, audio, canción y ejercicios |
| `theme.css` | Los tokens de diseño: colores y medidas. Es el archivo que se reemplaza para cambiar el aspecto |
| `ui.css` | La capa de componentes `.k-*`, construida con esos tokens |
| `theory-core.js` | Teoría musical: instrumentos, afinaciones, escalas, acordes, recorridos, tríadas y grados diatónicos |
| `render-core.js` | Geometría del diagrama |
| `song-core.js` | Modelo de canción y de ejercicio, letra por columnas, tiempos, ritmos y paginación |
| `_trabajo/` | Versiones antiguas, wireframes y pruebas. Temporal: no se sube a GitHub (ver `_trabajo/LEEME.md`) |
| `DOCUMENTACION.md` | Documentación técnica: cómo arranca, mapa del código, decisiones y deuda |

Antes de tocar nada, lee **[DOCUMENTACION.md](DOCUMENTACION.md)** — sobre todo:

- **§3**, porque el JSX se compila a mano con Babel desde tres bloques de texto plano. Si la app
  sale en blanco, el motivo está ahí.
- **§12**, porque el sistema de diseño manda en la interfaz pero **no** en el diagrama ni en las
  hojas que se exportan. Lo que ves tiene que ser lo que te descargas, y eso no puede depender
  del tema.
