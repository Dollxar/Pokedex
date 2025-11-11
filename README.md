# Pokédex Interactiva

Una Pokédex web responsive desarrollada con HTML, CSS y JavaScript puro que consume [PokéAPI](https://pokeapi.co/) para mostrar a todos los pokémon disponibles (más de 1000 registros). Incluye búsqueda inteligente, filtros por tipo, favoritos persistentes, vista detallada con sprites animados/neon shiny, compatibilidad con mega evoluciones y un modo oscuro/claro.

![Captura de la Pokédex](Proyectitos/Pokedex/Assets/Screenshot From 2025-11-11 00-10-24.png)

## ✨ Características

- **Carga progresiva** de los 1010 pokémon con indicador en tiempo real.
- **Buscador instantáneo** por nombre o número de Pokédex (acepta coincidencias parciales).
- **Filtros por tipo** (uno o varios tipos simultáneamente).
- **Favoritos persistentes** con guardado en `localStorage` y carrusel superior.
- **Modal enriquecido** con:
  - Sprites animados (normales, shiny y mega cuando existen).
  - Botones para alternar entre shiny/normal y mega/base.
  - Pestañas para información general, estadísticas y cadena evolutiva.
- **Modo oscuro/claro** con persistencia local.
- **Accesibilidad básica**: mensajes `aria-live`, botones con `aria-label` y navegación con teclado en el modal.

## 🚀 Instalación y uso

```bash
# Clonar el repositorio
git clone https://github.com/<usuario>/pokedex.git
cd pokedex

# Abrir el proyecto (solo requiere un servidor estático)
npx serve Proyectitos/Pokedex
# o utiliza la extensión Live Server / Vite / cualquier servidor local
```

Luego abre `http://localhost:3000` (o el puerto indicado) para interactuar con la Pokédex.

## 📁 Estructura relevante

```
Proyectitos/
└─ Pokedex/
   ├─ index.html        # Estructura principal & modal
   ├─ styles.css        # Estilos, temas, grids, badges, spinner...
   ├─ script.js         # Lógica de carga, filtros, favoritos, modal
   └─ README.md         # Este documento
```

## 🛠️ Stack y dependencias

- **HTML5 + CSS3 + JS Vanilla**
- **Bootstrap 5 (CDN)** para componentes del modal.
- **PokéAPI** como fuente de datos (pokémon, species, evoluciones).

_No se requiere build step ni bundler; basta con servir los archivos estáticos._

## 📌 Pendientes / Ideas futuras

- Añadir paginación manual por región.
- Exportar lista de favoritos en JSON/CSV.
- Mostrar movimientos destacados dentro del modal.
- Implementar un buscador por voz.

## 🤝 Contribuir

1. Haz un fork del repositorio.
2. Crea una rama de feature: `git checkout -b feature/nueva-mejora`.
3. Implementa y agrega pruebas manuales o notas de test.
4. Haz commit + push y abre un Pull Request describiendo el cambio.

Se agradecen issues con capturas o logs si encuentras bugs ❤️.

## 📄 Licencia

Distribuido bajo la licencia MIT. Consulta el archivo `LICENSE` (o añade uno si aún no existe) para más detalles.

---
Construido con paciencia, nostalgia y mucho café ☕️. ¡Atrápalos a todos!
