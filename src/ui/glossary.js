import { glossary } from '../data/glossary.js';
import { getLang, t } from './i18n.js';
import { openModal, closeModal } from './modal.js';
import { clearChildren } from './dom.js';

let searchTerm = '';

export function openGlossary() {
  searchTerm = '';
  renderGlossary();
  openModal('glossary-modal');
  // trapFocus() lands on the close button; the search field is the useful
  // starting point for this modal specifically.
  const search = document.getElementById('glossary-search');
  if (search) search.focus();
}

export function closeGlossary() {
  closeModal('glossary-modal');
}

export function renderGlossary() {
  const list = document.getElementById('glossary-list');
  const search = document.getElementById('glossary-search');
  if (!list) return;
  const lang = getLang();
  const entries = glossary[lang];
  const term = searchTerm.trim().toLowerCase();
  const filtered = term
    ? entries.filter(
        (e) => e.term.toLowerCase().includes(term) || e.definition.toLowerCase().includes(term)
      )
    : entries;

  clearChildren(list);

  if (filtered.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = t('noResults');
    list.appendChild(empty);
  } else {
    filtered.forEach((entry) => {
      const item = document.createElement('div');
      item.className = 'glossary-item';
      const dt = document.createElement('div');
      dt.className = 'glossary-term';
      dt.textContent = entry.term;
      const dd = document.createElement('div');
      dd.className = 'glossary-definition';
      dd.textContent = entry.definition;
      item.appendChild(dt);
      item.appendChild(dd);
      list.appendChild(item);
    });
  }

  if (search) {
    search.placeholder = t('glossarySearchPlaceholder');
  }
  const title = document.getElementById('glossary-title');
  if (title) title.textContent = t('glossaryTitle');
}

export function attachGlossaryListeners() {
  const search = document.getElementById('glossary-search');
  if (search) {
    search.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      renderGlossary();
    });
  }
  const closeBtn = document.getElementById('close-glossary-modal');
  if (closeBtn) closeBtn.addEventListener('click', closeGlossary);
}
