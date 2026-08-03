import { gameState, saveGameState } from '../state.js';
import { t } from './i18n.js';

const steps = [
  { target: null, titleKey: 'tourStep1Title', bodyKey: 'tourStep1Body' },
  { target: '.stats', titleKey: 'tourStep2Title', bodyKey: 'tourStep2Body' },
  { target: '#stock-list', titleKey: 'tourStep3Title', bodyKey: 'tourStep3Body' },
  { target: '.market-status-bar', titleKey: 'tourStep4Title', bodyKey: 'tourStep4Body' },
  // Two candidates: the action bar sits above the tabs on desktop, but on a
  // phone it lives inside the closed "more" sheet, where it has no box to
  // highlight — the bottom-nav button that opens it is the visible stand-in.
  { target: ['.action-bar', '#nav-more'], titleKey: 'tourStep5Title', bodyKey: 'tourStep5Body' },
];

let currentStep = 0;

/**
 * First candidate that is actually laid out. A `display:none` ancestor still
 * yields an element from querySelector, but a 0x0 rect, which would draw the
 * highlight ring in the page corner.
 *
 * @param {string | string[] | null} target
 * @returns {Element | null}
 */
function resolveTarget(target) {
  if (!target) return null;
  const selectors = Array.isArray(target) ? target : [target];
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return el;
  }
  return null;
}

function positionHighlight(target) {
  const highlight = document.getElementById('tour-highlight');
  const tooltip = document.getElementById('tour-tooltip');
  if (!highlight || !tooltip) return;

  if (!target) {
    highlight.style.display = 'none';
    tooltip.style.top = '50%';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translate(-50%, -50%)';
    return;
  }

  const el = resolveTarget(target);
  if (!el) {
    // Nothing visible to point at: fall back to the centred, un-highlighted
    // presentation rather than framing an empty rectangle.
    highlight.style.display = 'none';
    tooltip.style.top = '50%';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translate(-50%, -50%)';
    return;
  }
  const rect = el.getBoundingClientRect();
  highlight.style.display = 'block';
  highlight.style.top = `${rect.top - 6 + window.scrollY}px`;
  highlight.style.left = `${rect.left - 6 + window.scrollX}px`;
  highlight.style.width = `${rect.width + 12}px`;
  highlight.style.height = `${rect.height + 12}px`;

  const tooltipHeight = 200;
  const spaceBelow = window.innerHeight - rect.bottom;
  let top;
  if (spaceBelow > tooltipHeight + 20) {
    top = rect.bottom + window.scrollY + 12;
  } else {
    top = Math.max(rect.top + window.scrollY - tooltipHeight - 12, window.scrollY + 12);
  }
  let left = rect.left + window.scrollX;
  if (left + 320 > window.innerWidth - 12) left = window.innerWidth - 320 - 12;
  if (left < 12) left = 12;
  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
  tooltip.style.transform = 'none';

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
}

function renderCurrentStep() {
  const step = steps[currentStep];
  document.getElementById('tour-title').textContent = t(step.titleKey);
  document.getElementById('tour-body').textContent = t(step.bodyKey);
  const prev = document.getElementById('tour-prev');
  const next = document.getElementById('tour-next');
  const skip = document.getElementById('tour-skip');
  prev.disabled = currentStep === 0;
  prev.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
  prev.textContent = t('tourPrev');
  skip.textContent = t('tourSkip');
  next.textContent = currentStep === steps.length - 1 ? t('tourFinish') : t('tourNext');
  positionHighlight(step.target);
}

export function startTour() {
  currentStep = 0;
  document.getElementById('tour-overlay').style.display = 'block';
  renderCurrentStep();
}

export function endTour() {
  document.getElementById('tour-overlay').style.display = 'none';
  if (!gameState.tourCompleted) {
    gameState.tourCompleted = true;
    saveGameState();
  }
}

export function attachTourListeners() {
  document.getElementById('tour-next').addEventListener('click', () => {
    if (currentStep < steps.length - 1) {
      currentStep += 1;
      renderCurrentStep();
    } else {
      endTour();
    }
  });
  document.getElementById('tour-prev').addEventListener('click', () => {
    if (currentStep > 0) {
      currentStep -= 1;
      renderCurrentStep();
    }
  });
  document.getElementById('tour-skip').addEventListener('click', endTour);

  document.addEventListener('keydown', (e) => {
    if (document.getElementById('tour-overlay').style.display !== 'block') return;
    if (e.key === 'Escape') endTour();
    else if (e.key === 'ArrowRight' || e.key === 'Enter')
      document.getElementById('tour-next').click();
    else if (e.key === 'ArrowLeft') document.getElementById('tour-prev').click();
  });

  let resizeRaf = null;
  window.addEventListener('resize', () => {
    if (document.getElementById('tour-overlay').style.display !== 'block') return;
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => positionHighlight(steps[currentStep].target));
  });
}

export function maybeAutoStart() {
  if (gameState.tourCompleted) return;
  const freshGame =
    gameState.transactions.length === 0 && Object.keys(gameState.portfolio).length === 0;
  if (freshGame) {
    setTimeout(() => startTour(), 500);
  } else {
    gameState.tourCompleted = true;
    saveGameState();
  }
}
