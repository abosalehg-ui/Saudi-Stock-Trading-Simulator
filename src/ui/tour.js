import { gameState, saveGameState } from '../state.js';
import { t } from './i18n.js';
import { openModal, closeModal, isModalOpen } from './modal.js';

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

  // No target, or nothing visible to point at: the centred, un-highlighted
  // presentation, rather than framing an empty rectangle. (These were two
  // byte-identical blocks; resolveTarget(null) already returns null.)
  const el = resolveTarget(target);
  if (!el) {
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
  const title = document.getElementById('tour-title');
  const body = document.getElementById('tour-body');
  const prev = document.getElementById('tour-prev');
  const next = document.getElementById('tour-next');
  const skip = document.getElementById('tour-skip');
  if (!title || !body || !prev || !next || !skip) return;
  title.textContent = t(step.titleKey);
  body.textContent = t(step.bodyKey);
  prev.disabled = currentStep === 0;
  prev.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
  prev.textContent = t('tourPrev');
  skip.textContent = t('tourSkip');
  next.textContent = currentStep === steps.length - 1 ? t('tourFinish') : t('tourNext');
  positionHighlight(step.target);
}

export function startTour() {
  if (!document.getElementById('tour-overlay')) return;
  currentStep = 0;
  // Routed through openModal() rather than setting display directly: this is a
  // full-screen overlay, and on its own it had no focus trap and no inert
  // background, so Tab walked straight into the dimmed page behind it. It is
  // also the first thing a new user ever sees.
  renderCurrentStep();
  openModal('tour-overlay', () => markTourSeen());
}

function markTourSeen() {
  if (!gameState.tourCompleted) {
    gameState.tourCompleted = true;
    saveGameState();
  }
}

export function endTour() {
  closeModal('tour-overlay', markTourSeen);
}

/** @returns {boolean} */
export function isTourOpen() {
  return isModalOpen('tour-overlay');
}

export function attachTourListeners() {
  // Guarded: these were unguarded `getElementById(...).addEventListener(...)`
  // chains, so any host without the full tour markup — a test fixture, a page
  // that drops the overlay — threw during start-up instead of simply having no
  // tour.
  const on = (id, handler) => document.getElementById(id)?.addEventListener('click', handler);

  on('tour-next', () => {
    if (currentStep < steps.length - 1) {
      currentStep += 1;
      renderCurrentStep();
    } else {
      endTour();
    }
  });
  on('tour-prev', () => {
    if (currentStep > 0) {
      currentStep -= 1;
      renderCurrentStep();
    }
  });
  on('tour-skip', endTour);

  document.addEventListener('keydown', (e) => {
    if (!isTourOpen()) return;
    // Escape is handled by the modal's own trap. Enter is deliberately not
    // bound either: the focused element is already a button, so the browser
    // fires its click — binding Enter to "next" here meant pressing it on the
    // Back button went back and immediately forward again.
    if (e.key === 'ArrowRight') document.getElementById('tour-next')?.click();
    else if (e.key === 'ArrowLeft') document.getElementById('tour-prev')?.click();
  });

  let resizeRaf = null;
  window.addEventListener('resize', () => {
    if (!isTourOpen()) return;
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
