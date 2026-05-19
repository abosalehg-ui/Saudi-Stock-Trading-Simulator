import { learningPaths } from '../data/lessons.js';
import { gameState, saveGameState } from '../state.js';
import { getLang, t } from './i18n.js';

let activePathKey = null;
let activeLessonIndex = 0;

export function openLearningModal() {
  activePathKey = null;
  activeLessonIndex = 0;
  renderPathList();
  document.getElementById('learning-modal').style.display = 'block';
}

export function closeLearningModal() {
  document.getElementById('learning-modal').style.display = 'none';
}

function getCompletedSet() {
  return gameState.completedLessons || {};
}

function pathProgress(pathKey) {
  const path = learningPaths[pathKey];
  const completed = getCompletedSet();
  const done = path.lessons.filter((l) => completed[l.id]).length;
  return { done, total: path.lessons.length };
}

function renderPathList() {
  const root = document.getElementById('learning-content');
  if (!root) return;
  const lang = getLang();
  while (root.firstChild) root.removeChild(root.firstChild);

  const container = document.createElement('div');
  container.className = 'lesson-paths';
  Object.entries(learningPaths).forEach(([key, path]) => {
    const card = document.createElement('div');
    card.className = 'lesson-path-card';
    const title = document.createElement('div');
    title.className = 'lesson-path-title';
    title.textContent = t(path.titleKey);
    card.appendChild(title);

    const { done, total } = pathProgress(key);
    const progress = document.createElement('div');
    progress.style.fontSize = '12px';
    progress.style.color = '#95a5a6';
    progress.style.marginBottom = '6px';
    progress.textContent = `${t('lessonProgress')}: ${done}/${total}`;
    card.appendChild(progress);

    const bar = document.createElement('div');
    bar.className = 'lesson-path-progress-bar';
    const fill = document.createElement('div');
    fill.className = 'lesson-path-progress-fill';
    fill.style.width = `${total === 0 ? 0 : (done / total) * 100}%`;
    bar.appendChild(fill);
    card.appendChild(bar);

    const list = document.createElement('div');
    list.className = 'lesson-list';
    path.lessons.forEach((lesson, idx) => {
      const completed = getCompletedSet()[lesson.id];
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'lesson-list-item' + (completed ? ' completed' : '');
      item.style.border = 'none';
      item.style.color = 'inherit';
      item.style.cursor = 'pointer';
      item.style.fontFamily = 'inherit';
      item.style.textAlign = lang === 'ar' ? 'right' : 'left';
      const titleSpan = document.createElement('span');
      titleSpan.textContent = lesson.title[lang];
      const statusSpan = document.createElement('span');
      statusSpan.style.fontSize = '11px';
      statusSpan.textContent = completed ? t('lessonCompleted') : t('lessonStart');
      item.appendChild(titleSpan);
      item.appendChild(statusSpan);
      item.addEventListener('click', () => openLesson(key, idx));
      list.appendChild(item);
    });
    card.appendChild(list);
    container.appendChild(card);
  });
  root.appendChild(container);
}

function openLesson(pathKey, lessonIdx) {
  activePathKey = pathKey;
  activeLessonIndex = lessonIdx;
  renderLesson();
}

function renderLesson() {
  const root = document.getElementById('learning-content');
  if (!root) return;
  const lang = getLang();
  const path = learningPaths[activePathKey];
  const lesson = path.lessons[activeLessonIndex];
  while (root.firstChild) root.removeChild(root.firstChild);

  const wrapper = document.createElement('div');
  wrapper.className = 'lesson-content';
  const title = document.createElement('h3');
  title.textContent = lesson.title[lang];
  wrapper.appendChild(title);

  const lines = lesson.content[lang];
  let currentList = null;
  lines.forEach((line) => {
    if (line.startsWith('- ')) {
      if (!currentList) {
        currentList = document.createElement('ul');
        wrapper.appendChild(currentList);
      }
      const li = document.createElement('li');
      appendMarkdownText(li, line.slice(2));
      currentList.appendChild(li);
    } else {
      currentList = null;
      const p = document.createElement('p');
      appendMarkdownText(p, line);
      wrapper.appendChild(p);
    }
  });

  const actions = document.createElement('div');
  actions.className = 'lesson-actions';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-secondary';
  backBtn.textContent = t('lessonClose');
  backBtn.addEventListener('click', renderPathList);
  actions.appendChild(backBtn);

  const completed = getCompletedSet()[lesson.id];
  const completeBtn = document.createElement('button');
  completeBtn.className = 'btn btn-primary';
  if (activeLessonIndex < path.lessons.length - 1) {
    completeBtn.textContent = t('lessonNext');
  } else {
    completeBtn.textContent = completed ? t('lessonClose') : t('lessonCompleted');
  }
  completeBtn.addEventListener('click', () => {
    markLessonComplete(lesson.id);
    if (activeLessonIndex < path.lessons.length - 1) {
      activeLessonIndex += 1;
      renderLesson();
    } else {
      renderPathList();
    }
  });
  actions.appendChild(completeBtn);

  wrapper.appendChild(actions);
  root.appendChild(wrapper);
}

function markLessonComplete(lessonId) {
  if (!gameState.completedLessons) gameState.completedLessons = {};
  if (!gameState.completedLessons[lessonId]) {
    gameState.completedLessons[lessonId] = Date.now();
    saveGameState();
  }
}

function appendMarkdownText(parent, text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  parts.forEach((part) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const strong = document.createElement('strong');
      strong.textContent = part.slice(2, -2);
      parent.appendChild(strong);
    } else if (part) {
      parent.appendChild(document.createTextNode(part));
    }
  });
}
