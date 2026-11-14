import { SUPABASE_URL } from './config.js';
import { characters, chargeColors } from './fiches.js';

const get = id => document.getElementById(id);
const create = (tag, value) => {
  const element = document.createElement(tag);
  if (value !== undefined) element.textContent = value;
  return element;
};
const makeKey = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), n => n.toString(16).padStart(2, '0')).join('');
const token = localStorage.getItem('skrib-player') || makeKey();
localStorage.setItem('skrib-player', token);
let code = localStorage.getItem('skrib-room') || '';
let state;
let busy = false;
let connectionFailed = false;
const sections = {};

function notice(message = '') {
  get('notice').textContent = message;
  get('notice').hidden = !message;
}

async function request(path, data) {
  const response = await fetch(SUPABASE_URL ? SUPABASE_URL.replace(/\/$/, '') + '/functions/v1' + path.replace(/^\/api/, '') : path, {
    method: data ? 'POST' : 'GET',
    headers: { 'x-player': token, ...(data && { 'Content-Type': 'application/json' }) },
    body: data && JSON.stringify(data),
    signal: AbortSignal.timeout(8000),
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error), { status: response.status });
  return result;
}

const path = () => '/api/parties/' + code;

function button(label, action, fields = {}, description) {
  const item = create('button', label);
  item.type = 'button';
  Object.assign(item.dataset, { action, ...fields });
  if (description) item.setAttribute('aria-label', description);
  return item;
}

function renderSection(id, data, draw) {
  const key = JSON.stringify(data);
  if (sections[id] === key) return;
  sections[id] = key;
  draw(get(id));
}

function render(next) {
  if (state?.code === next.code && state.revision > next.revision) return;
  state = next;
  const { me } = next;
  get('home').hidden = true;
  get('selection').hidden = !!me.character;
  get('game').hidden = !me.character;
  get('session').hidden = false;
  get('room').hidden = false;
  get('room').textContent = 'Code · ' + next.code;
  if (!me.character) {
    renderSection('choices', next.taken, list => {
      list.replaceChildren(...Object.entries(characters).map(([name, info]) => {
        const item = button(name, 'choose', { character: name });
        const taken = next.taken.includes(name);
        item.disabled = taken;
        item.append(create('small', taken ? 'Déjà choisi' : 'Disponible'));
        addPortrait(item, info.card, name);
        return item;
      }));
    });
    return;
  }

  const info = characters[me.character];
  renderSection('portrait', me.character, panel => {
    panel.replaceChildren();
    addPortrait(panel, info.card, me.character);
    get('original-card').href = './' + info.card + '.jpg';
    get('pigment-power').textContent = info.pigment;
    get('character').textContent = me.character;
    get('description').textContent = info.description || 'Description à fournir.';
    get('character-power').textContent = info.power || 'Pouvoir du personnage à fournir.';
  });

  const level = me.level ?? 2;
  const runeCount = level === 1 ? 5 : 6;
  document.querySelectorAll('[data-action="level"]').forEach(control => {
    control.setAttribute('aria-pressed', Number(control.dataset.level) === level);
  });
  document.querySelector('[data-action="roll"]').textContent = 'Lancer les ' + runeCount + ' runes';
  renderSection('runes', [me.character, me.runes, level], panel => {
    panel.style.setProperty('--rune-count', runeCount);
    panel.replaceChildren(...Array.from({ length: runeCount }, (_, index) => {
      const glyph = info.runes[index];
      const result = me.runes ? Boolean(me.runes[index] && glyph) : null;
      const face = result === null ? 'En attente' : result ? 'Glyphe' : 'Vierge';
      const rune = create('div');
      rune.className = 'rune';
      const mark = create('span', result === null ? '–' : result ? glyph : '○');
      if (result) mark.dataset.glyph = glyph;
      rune.append(mark, create('small', face));
      return rune;
    }));
    if (me.runes) {
      const count = me.runes.filter((shown, index) => shown && info.runes[index]).length;
      get('roll-summary').textContent = count + ' / ' + runeCount + ' faces glyphe';
    } else {
      get('roll-summary').textContent = 'Chaque rune gravée a une chance sur deux de montrer son glyphe.' + (me.character === 'Copiste' ? ' La rune vide a deux faces vierges.' : '');
    }
  });

  renderSection('pigments', me.pigments, panel => {
    panel.replaceChildren(...chargeColors.map((color, index) => {
      const active = me.pigments[index];
      const control = button('Charge ' + (index + 1), 'pigment', { index });
      control.style.setProperty('--pigment', color);
      control.disabled = !active;
      control.append(create('small', active ? 'Disponible' : 'Utilisée'));
      return control;
    }));
  });

  document.querySelector('[data-action="reset"]').disabled = me.pigments.every(Boolean);
  get('ink-value').textContent = next.ink ?? '—';
  document.querySelectorAll('[data-action="ink"]').forEach(control => { control.disabled = next.ink === null; });
  renderSection('creatures', next.creatures, list => {
    list.replaceChildren(...next.creatures.map(({ id, name, hp }) => {
      const item = create('li');
      const controls = create('div');
      controls.className = 'counter';
      controls.append(button('−', 'hp', { id, delta: -1 }, 'Retirer 1 PV à ' + name),
        create('output', hp + ' PV'), button('+', 'hp', { id, delta: 1 }, 'Ajouter 1 PV à ' + name),
        button('Retirer', 'remove', { id }, 'Retirer ' + name + ' de la liste'));
      item.append(create('strong', name), controls);
      return item;
    }));
  });
}

function addPortrait(panel, card, name) {
  const frame = create('span');
  frame.className = 'portrait-frame';
  const image = create('img');
  image.src = './' + card + '.jpg';
  image.alt = 'Portrait de ' + name;
  frame.append(image);
  panel.prepend(frame);
}

async function perform(endpoint, data) {
  if (busy) return false;
  busy = true;
  notice();
  try {
    let next = await request(endpoint, data);
    // Compatible avec la fonction Supabase déjà déployée : initialiser le niveau
    // avant d’afficher la fiche après le choix du personnage.
    if (data?.action === 'choose') {
      next = await request(endpoint, { action: 'level', level: 1 });
    }
    code = next.code;
    localStorage.setItem('skrib-room', code);
    connectionFailed = false;
    render(next);
    return true;
  } catch (error) {
    notice(error.status ? error.message : 'Connexion impossible. Vérifie que le serveur Skribes est accessible.');
    if (error.status === 409 && code) {
      try { render(await request(path())); } catch {}
    }
    return false;
  } finally {
    busy = false;
  }
}

get('create').addEventListener('click', async () => {
  if (busy) return;
  const key = localStorage.getItem('skrib-create') || makeKey();
  localStorage.setItem('skrib-create', key);
  if (await perform('/api/parties', { key })) localStorage.removeItem('skrib-create');
});
get('join').addEventListener('submit', event => {
  event.preventDefault();
  perform('/api/parties/' + get('code').value.trim().toUpperCase(), { action: 'join' });
});
get('back').addEventListener('click', () => {
  if (busy) return;
  get('code').value = '';
  localStorage.removeItem('skrib-create');
  code = '';
  state = null;
  localStorage.removeItem('skrib-room');
  get('home').hidden = false;
  ['selection', 'game', 'room', 'session'].forEach(id => { get(id).hidden = true; });
  notice();
});
document.querySelector('main').addEventListener('click', event => {
  const clicked = event.target.closest('[data-action]');
  if (!clicked) return;
  const { action, index, character, id, delta, level } = clicked.dataset;
  perform(path(), { action, character, id, level: level === undefined ? undefined : Number(level), index: index === undefined ? undefined : Number(index), delta: delta === undefined ? undefined : Number(delta) });
});

for (const [id, action] of [['ink-form', 'ink'], ['creature-form', 'addCreature']]) {
  get(id).addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(event.target);
    if (await perform(path(), { action, value: Number(form.get('value')), name: form.get('name') })) event.target.reset();
  });
}

async function refresh() {
  if (code && !busy) {
    const previousCode = code;
    try {
      const next = await request(path());
      if (previousCode === code && !busy) {
        if (connectionFailed) notice();
        connectionFailed = false;
        render(next);
      }
    } catch (error) {
      if (previousCode === code && !busy) {
        if ([403, 404].includes(error.status)) get('back').click();
        connectionFailed = true;
        notice(error.status ? error.message : 'Connexion interrompue. Reconnexion en cours…');
      }
    }
  }
  setTimeout(refresh, 1200);
}
refresh();
