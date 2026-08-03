import { historicalScenarios } from '../data/scenarios.js';
import { startScenario, stopScenario, getActiveScenario } from '../engine/scenarios.js';
import { getLang, t } from './i18n.js';
import { showConfirm, openModal, closeModal } from './modal.js';
import { clearChildren } from './dom.js';

let onChange = () => {};

export function bindScenariosCallbacks(callbacks) {
  onChange = callbacks.onChange ?? onChange;
}

export function openScenariosModal() {
  document.getElementById('scenarios-title').textContent = t('scenariosTitle');
  renderScenariosContent();
  openModal('scenarios-modal');
}

export function closeScenariosModal() {
  closeModal('scenarios-modal');
}

function renderScenariosContent() {
  const root = document.getElementById('scenarios-content');
  if (!root) return;
  const lang = getLang();
  const active = getActiveScenario();
  clearChildren(root);

  if (active) {
    const banner = document.createElement('div');
    banner.className = 'scenario-active-banner';
    banner.textContent = `${t('scenarioActive')}: ${active.title[lang]}`;
    root.appendChild(banner);
  }

  historicalScenarios.forEach((scenario) => {
    const card = document.createElement('div');
    card.className = 'scenario-card';
    const titleRow = document.createElement('div');
    const title = document.createElement('span');
    title.className = 'scenario-title';
    title.textContent = scenario.title[lang];
    titleRow.appendChild(title);
    const badge = document.createElement('span');
    badge.className = 'scenario-badge';
    badge.textContent = `${scenario.durationMinutes} ${t('scenarioMinutesShort')}`;
    titleRow.appendChild(badge);
    card.appendChild(titleRow);

    const desc = document.createElement('div');
    desc.className = 'scenario-description';
    desc.textContent = scenario.description[lang];
    card.appendChild(desc);

    const isActive = active && active.id === scenario.id;
    const btn = document.createElement('button');
    btn.className = 'btn ' + (isActive ? 'btn-danger' : 'btn-primary');
    btn.textContent = isActive ? t('scenarioStop') : t('scenarioPlay');
    btn.addEventListener('click', async () => {
      if (isActive) {
        stopScenario();
      } else {
        if (active) {
          const ok = await showConfirm(t('confirmReplaceScenario'));
          if (!ok) return;
        }
        startScenario(scenario.id);
      }
      renderScenariosContent();
      onChange();
    });
    card.appendChild(btn);
    root.appendChild(card);
  });
}
