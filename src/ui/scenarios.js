import { historicalScenarios, findScenario } from '../data/scenarios.js';
import { startScenario, stopScenario, getActiveScenario } from '../engine/scenarios.js';
import { getLang, t } from './i18n.js';
import { showConfirm } from './modal.js';

let onChange = () => {};

export function bindScenariosCallbacks(callbacks) {
  onChange = callbacks.onChange ?? onChange;
}

export function openScenariosModal() {
  renderScenariosContent();
  document.getElementById('scenarios-modal').style.display = 'block';
}

export function closeScenariosModal() {
  document.getElementById('scenarios-modal').style.display = 'none';
}

function renderScenariosContent() {
  const root = document.getElementById('scenarios-content');
  if (!root) return;
  const lang = getLang();
  const active = getActiveScenario();
  while (root.firstChild) root.removeChild(root.firstChild);

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
    badge.textContent = `${scenario.durationMinutes} ${lang === 'ar' ? 'د' : 'min'}`;
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
          const ok = await showConfirm(
            lang === 'ar'
              ? 'سيناريو آخر نشط. هل تريد استبداله؟'
              : 'Another scenario is active. Replace it?'
          );
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

export function activeScenarioBanner() {
  const active = getActiveScenario();
  if (!active) return null;
  const lang = getLang();
  return `${t('scenarioActive')}: ${active.title[lang]}`;
}

void findScenario;
