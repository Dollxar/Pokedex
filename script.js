const pokedex = document.getElementById('pokedex');
const favoritesList = document.getElementById('favorites-list');
const favoritesCount = document.getElementById('favorites-count');
const form = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const typeFiltersContainer = document.getElementById('type-filters');
const loadedCounterEl = document.getElementById('loaded-counter');
const generationLabelEl = document.getElementById('generation-label');
const refreshButton = document.getElementById('refresh-button');
const loaderOverlay = document.getElementById('loader-overlay');
const loadingMessage = document.getElementById('loading-message');
const themeToggleBtn = document.getElementById('theme-toggle');
const modalElement = document.getElementById('pokemonModal');
const modalTitle = modalElement?.querySelector('.modal-title');
const modalBody = modalElement?.querySelector('.modal-body');
const shinyToggleBtn = modalElement?.querySelector('.toggle-shiny-btn');
const megaToggleBtn = modalElement?.querySelector('.toggle-mega-btn');
let modalInstance = null;

const MAX_POKEMON = 1010; // todas las generaciones disponibles
const BATCH_SIZE = 50;
let cachedPokemons = [];
let isLoading = false;
let searchQuery = '';
const speciesDescriptionCache = new Map();
const speciesDataCache = new Map();
const megaCache = new Map();
const favoritesSet = new Set(JSON.parse(localStorage.getItem('pokedex:favorites') || '[]'));
const activeTypes = new Set();
const THEME_STORAGE_KEY = 'pokedex:theme';

const TYPE_LABELS = {
    bug: 'Bicho',
    dark: 'Siniestro',
    dragon: 'Dragón',
    electric: 'Eléctrico',
    fairy: 'Hada',
    fighting: 'Lucha',
    fire: 'Fuego',
    flying: 'Volador',
    ghost: 'Fantasma',
    grass: 'Planta',
    ground: 'Tierra',
    ice: 'Hielo',
    normal: 'Normal',
    poison: 'Veneno',
    psychic: 'Psíquico',
    rock: 'Roca',
    steel: 'Acero',
    water: 'Agua'
};

const debounce = (fn, delay = 300) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
};

const handleSearch = () => {
    searchQuery = searchInput.value.trim().toLowerCase();
    applyFiltersAndRender();
};

form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSearch();
});

searchInput.addEventListener('input', debounce(handleSearch, 250));

if (typeFiltersContainer) {
    typeFiltersContainer.addEventListener('click', (event) => {
        const chip = event.target.closest('.filter-chip');
        if (!chip) return;
        const type = chip.dataset.type;
        if (!type) return;
        if (activeTypes.has(type)) {
            activeTypes.delete(type);
            chip.classList.remove('active');
        } else {
            activeTypes.add(type);
            chip.classList.add('active');
        }
        applyFiltersAndRender();
    });
}

refreshButton?.addEventListener('click', () => {
    if (isLoading) return;
    cachedPokemons = [];
    pokedex.innerHTML = '';
    showLoader('Recargando Pokédex...');
    loadPokemons(true);
});

themeToggleBtn?.addEventListener('click', toggleTheme);

pokedex.addEventListener('click', async (event) => {
    const favoriteBtn = event.target.closest('.favorite-toggle');
    if (favoriteBtn) {
        event.preventDefault();
        event.stopPropagation();
        const id = Number(favoriteBtn.dataset.favoriteId);
        toggleFavorite(id);
        return;
    }
    const card = event.target.closest('.card');
    if (!card) return;
    const pokemonId = Number(card.dataset.id);
    const pokemon = cachedPokemons.find(p => p.id === pokemonId);
    if (!pokemon) return;

    openPokemonModal(pokemon);
});

if (shinyToggleBtn) {
    shinyToggleBtn.addEventListener('click', () => toggleShinySprite(shinyToggleBtn));
}

if (megaToggleBtn) {
    megaToggleBtn.addEventListener('click', () => toggleMegaForm(megaToggleBtn));
}

if (modalElement) {
    modalElement.addEventListener('click', (event) => {
        const tabBtn = event.target.closest('.modal-tab');
        if (tabBtn) {
            activateModalTab(tabBtn.dataset.tab);
        }
    });
}

function getModalInstance() {
    if (!modalElement) return null;
    if (!modalInstance) {
        if (!window.bootstrap || !window.bootstrap.Modal) {
            console.warn('Bootstrap Modal no disponible.');
            return null;
        }
        modalInstance = new bootstrap.Modal(modalElement);
    }
    return modalInstance;
}

function getPokemonSprite(pokemon, { shiny = false } = {}) {
    const animated = pokemon.sprites.versions?.['generation-v']?.['black-white']?.animated;
    const showdown = pokemon.sprites.other?.showdown;

    if (shiny) {
        return animated?.front_shiny || showdown?.front_shiny || pokemon.sprites.front_shiny || '';
    }

    return animated?.front_default || showdown?.front_default || pokemon.sprites.front_default || '';
}

function setSpriteForForm(img, form, desiredShinyState = 'default') {
    if (!img) return null;

    const defaultKey = form === 'mega' ? 'defaultMega' : 'defaultBase';
    const shinyKey = form === 'mega' ? 'shinyMega' : 'shinyBase';

    const defaultSrc = img.dataset[defaultKey] || '';
    const shinySrc = img.dataset[shinyKey] || '';

    let stateToApply = desiredShinyState === 'shiny' ? 'shiny' : 'default';
    if (stateToApply === 'shiny' && !shinySrc) {
        stateToApply = 'default';
    }

    const targetSrc = stateToApply === 'shiny'
        ? (shinySrc || defaultSrc)
        : (defaultSrc || shinySrc);

    if (!targetSrc) {
        return null;
    }

    img.src = targetSrc;
    img.dataset.form = form;
    img.dataset.shinyState = stateToApply;
    return stateToApply;
}

function updateShinyButtonLabel() {
    if (!shinyToggleBtn) return;
    const img = document.getElementById('modal-pokemon-gif');
    if (!img) {
        shinyToggleBtn.disabled = true;
        shinyToggleBtn.textContent = 'Shiny no disponible';
        return;
    }

    const hasShiny = Boolean(img.dataset.shinyBase) || Boolean(img.dataset.shinyMega);
    if (!hasShiny) {
        shinyToggleBtn.disabled = true;
        shinyToggleBtn.textContent = 'Shiny no disponible';
        return;
    }

    shinyToggleBtn.disabled = false;
    const state = img.dataset.shinyState === 'shiny' ? 'shiny' : 'default';
    shinyToggleBtn.textContent = state === 'shiny' ? 'Ver forma normal' : 'Ver forma shiny';
}

function setupShinyButton() {
    updateShinyButtonLabel();
}

function toggleShinySprite(button) {
    const img = document.getElementById('modal-pokemon-gif');
    if (!img) return;

    const currentForm = img.dataset.form === 'mega' ? 'mega' : 'base';
    const currentState = img.dataset.shinyState === 'shiny' ? 'shiny' : 'default';
    const desiredState = currentState === 'shiny' ? 'default' : 'shiny';

    const appliedState = setSpriteForForm(img, currentForm, desiredState);
    if (!appliedState) return;

    updateShinyButtonLabel();
    if (button && !button.disabled) {
        button.textContent = appliedState === 'shiny' ? 'Ver forma normal' : 'Ver forma shiny';
    }
}

async function setupMegaButton(pokemon) {
    if (!megaToggleBtn) return;

    const img = document.getElementById('modal-pokemon-gif');
    if (!img) {
        megaToggleBtn.disabled = true;
        megaToggleBtn.textContent = 'Mega no disponible';
        return;
    }

    megaToggleBtn.disabled = true;
    megaToggleBtn.textContent = 'Buscando mega...';
    img.dataset.defaultMega = '';
    img.dataset.shinyMega = '';
    img.dataset.form = 'base';

    try {
        const sprites = await getMegaSprites(pokemon);
        if (!sprites || (!sprites.default && !sprites.shiny)) {
            megaToggleBtn.disabled = true;
            megaToggleBtn.textContent = 'Mega no disponible';
            return;
        }

        img.dataset.defaultMega = sprites.default || sprites.shiny || '';
        img.dataset.shinyMega = sprites.shiny || '';
        megaToggleBtn.disabled = false;
        megaToggleBtn.textContent = 'Ver mega evolución';
        megaToggleBtn.dataset.state = 'base';
    } catch (error) {
        console.error('No se pudo cargar la mega evolución:', error);
        megaToggleBtn.disabled = true;
        megaToggleBtn.textContent = 'Mega no disponible';
    }

    updateShinyButtonLabel();
}

function toggleMegaForm(button) {
    const img = document.getElementById('modal-pokemon-gif');
    if (!img) return;

    const hasMega = Boolean(img.dataset.defaultMega) || Boolean(img.dataset.shinyMega);
    if (!hasMega) return;

    const currentForm = img.dataset.form === 'mega' ? 'mega' : 'base';
    const targetForm = currentForm === 'mega' ? 'base' : 'mega';
    const currentState = img.dataset.shinyState === 'shiny' ? 'shiny' : 'default';

    const appliedState = setSpriteForForm(img, targetForm, currentState);
    if (!appliedState) return;

    if (button) {
        button.textContent = targetForm === 'mega' ? 'Ver forma normal' : 'Ver mega evolución';
    }
    updateShinyButtonLabel();
}

async function getMegaSprites(pokemon) {
    if (megaCache.has(pokemon.id)) return megaCache.get(pokemon.id);

    try {
        const speciesData = await getPokemonSpeciesData(pokemon.id);
        const megaVariety = speciesData?.varieties?.find(v => v.pokemon.name.includes('mega'));
        if (!megaVariety) {
            megaCache.set(pokemon.id, null);
            return null;
        }

        const res = await fetch(megaVariety.pokemon.url);
        if (!res.ok) {
            megaCache.set(pokemon.id, null);
            return null;
        }

        const megaPokemon = await res.json();
        const sprites = {
            default: getPokemonSprite(megaPokemon),
            shiny: getPokemonSprite(megaPokemon, { shiny: true }),
            name: megaPokemon.name
        };
        megaCache.set(pokemon.id, sprites);
        return sprites;
    } catch (error) {
        console.warn('Error obteniendo mega evolución:', error);
        megaCache.set(pokemon.id, null);
        return null;
    }
}

function renderTypeBadges(types) {
    return types
        .map(t => {
            const typeName = t.type.name;
            const label = TYPE_LABELS[typeName] || typeName;
            return `<span class="type-badge type-${typeName}">${label}</span>`;
        })
        .join('');
}

function renderCard(pokemon) {
    const primaryType = pokemon.types[0]?.type.name || 'normal';
    const types = renderTypeBadges(pokemon.types);

    return `
      <div class="card type-${primaryType}" data-id="${pokemon.id}">
        <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}">
        <h2>#${pokemon.id.toString().padStart(3, '0')} ${pokemon.name}</h2>
        <div class="types">${types}</div>
      </div>`;
}

async function getPokemon(id) {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    return res.json();
}

function renderPokemons(list) {
    pokedex.innerHTML = list.map(renderCard).join('');
}

function openPokemonModal(pokemon) {
    const instance = getModalInstance();
    if (!instance || !modalTitle || !modalBody) return;

    modalTitle.textContent = `#${pokemon.id.toString().padStart(3, '0')} ${pokemon.name}`;
    modalBody.innerHTML = buildModalMarkup(pokemon);

    setupShinyButton();
    setupMegaButton(pokemon);

    instance.show();
    populateDescription(pokemon.id);
}

function buildModalMarkup(pokemon) {
    const heroGifDefault = getPokemonSprite(pokemon);
    const heroGifShiny = getPokemonSprite(pokemon, { shiny: true });
    const heroGif = heroGifDefault || heroGifShiny || pokemon.sprites.front_default || '';

    const height = (pokemon.height / 10).toFixed(1);
    const weight = (pokemon.weight / 10).toFixed(1);
    const abilities = pokemon.abilities
        .map(({ ability }) => ability.name)
        .join(', ');

    const statsList = pokemon.stats
        .map(stat => {
            const name = stat.stat.name.toUpperCase();
            const value = stat.base_stat;
            const percentage = Math.min(100, Math.round((value / 255) * 100));
            return `
          <div class="d-flex align-items-center gap-2 mb-2">
            <strong class="text-uppercase" style="min-width:120px;">${name}</strong>
            <div class="progress flex-grow-1" style="height: 8px;">
              <div class="progress-bar bg-warning" role="progressbar" style="width: ${percentage}%;" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="255"></div>
            </div>
            <span>${value}</span>
          </div>`;
        })
        .join('');

    return `
      <div class="text-center mb-4">
        <img
          src="${heroGif}"
          alt="${pokemon.name}"
          class="pokemon-gif img-fluid"
          id="modal-pokemon-gif"
          data-form="base"
          data-shiny-state="default"
          data-default-base="${heroGifDefault || heroGifShiny || ''}"
          data-shiny-base="${heroGifShiny || ''}"
          data-default-mega=""
          data-shiny-mega=""
        >
        <div class="d-flex justify-content-center align-items-center gap-2 flex-wrap mt-3">
          ${renderTypeBadges(pokemon.types)}
        </div>
      </div>
      <div class="row text-start gy-3">
        <div class="col-md-4">
          <div class="p-3 bg-light rounded">
            <h6 class="text-uppercase text-muted mb-1">Altura</h6>
            <p class="fs-5 fw-semibold mb-0">${height} m</p>
          </div>
        </div>
        <div class="col-md-4">
          <div class="p-3 bg-light rounded">
            <h6 class="text-uppercase text-muted mb-1">Peso</h6>
            <p class="fs-5 fw-semibold mb-0">${weight} kg</p>
          </div>
        </div>
        <div class="col-md-4">
          <div class="p-3 bg-light rounded">
            <h6 class="text-uppercase text-muted mb-1">Experiencia base</h6>
            <p class="fs-5 fw-semibold mb-0">${pokemon.base_experience}</p>
          </div>
        </div>
      </div>
      <div class="mt-4">
        <h5>Descripción</h5>
        <p id="modal-description" class="text-muted">Cargando descripción...</p>
      </div>
      <div class="mt-4">
        <h5>Habilidades</h5>
        <p class="mb-0">${abilities}</p>
      </div>
      <div class="mt-4">
        <h5>Estadísticas base</h5>
        ${statsList}
      </div>`;
}

async function populateDescription(pokemonId) {
    const descriptionEl = document.getElementById('modal-description');
    if (!descriptionEl) return;

    descriptionEl.textContent = 'Cargando descripción...';
    try {
        const text = await getPokemonDescription(pokemonId);
        descriptionEl.textContent = text || 'Descripción no disponible.';
    } catch (error) {
        descriptionEl.textContent = 'No se pudo obtener la descripción.';
    }
}

async function getPokemonDescription(id) {
    if (speciesDescriptionCache.has(id)) return speciesDescriptionCache.get(id);
    const data = await getPokemonSpeciesData(id);
    const entry =
        data.flavor_text_entries.find((item) => item.language.name === 'es') ||
        data.flavor_text_entries.find((item) => item.language.name === 'en');
    const text = entry ? entry.flavor_text.replace(/[\n\f]/g, ' ') : '';
    speciesDescriptionCache.set(id, text);
    return text;
}

async function getPokemonSpeciesData(id) {
    if (speciesDataCache.has(id)) return speciesDataCache.get(id);
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
    if (!res.ok) throw new Error('No se pudo obtener la información de la especie');
    const data = await res.json();
    speciesDataCache.set(id, data);
    return data;
}

async function loadPokemons() {
    if (isLoading) return;
    isLoading = true;
    pokedex.innerHTML = '<p>Cargando pokémon...</p>';

    const loadedPokemons = [];

    try {
        for (let start = 1; start <= MAX_POKEMON; start += BATCH_SIZE) {
            const chunkIds = Array.from({ length: Math.min(BATCH_SIZE, MAX_POKEMON - start + 1) }, (_, idx) => start + idx);
            const results = await Promise.allSettled(chunkIds.map(getPokemon));

            results.forEach((result, idx) => {
                if (result.status === 'fulfilled') {
                    loadedPokemons.push(result.value);
                } else {
                    console.warn(`No se pudo cargar el pokémon ${chunkIds[idx]}:`, result.reason);
                }
            });

            if (loadedPokemons.length) {
                renderPokemons(loadedPokemons);
            }
        }

        cachedPokemons = loadedPokemons;

        if (!loadedPokemons.length) {
            pokedex.innerHTML = '<p>No se pudieron cargar los pokémon. Intenta nuevamente.</p>';
        }
    } catch (error) {
        console.error('Error cargando pokémon:', error);
        pokedex.innerHTML = '<p>No se pudieron cargar los pokémon. Intenta nuevamente.</p>';
    } finally {
        isLoading = false;
    }
}



loadPokemons();
