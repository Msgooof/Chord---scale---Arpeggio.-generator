# Basic Pitch (red neuronal de notas)

Lo usa el motor «Preciso» de Escucha (0.14). Se carga solo al elegirlo.

| Archivo | De dónde | Licencia |
| --- | --- | --- |
| `model.json`, `group1-shard1of1.bin` | `@spotify/basic-pitch@1.0.1` (carpeta `model/`), vía cdn.jsdelivr.net | Apache 2.0 (ver `LICENSE`) |
| `tf.min.js` | `@tensorflow/tfjs@3.21.0` (`dist/tf.min.js`), vía cdn.jsdelivr.net | Apache 2.0 |

Copias locales a propósito: Kharo funciona sin internet.

Entrada del modelo: audio mono a 22 050 Hz, ventana de 43 844 muestras (~2 s),
forma `[1, 43844, 1]`. Salidas: `Identity_1` = notas (172 cuadros × 88 teclas,
MIDI = índice + 21), `Identity_2` = ataques, `Identity` = contornos.
Se descargaron el 2026-11-06 con permiso de Carlos.
