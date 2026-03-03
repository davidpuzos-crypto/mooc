/**
 * ============================================================
 *  TISSELIA — Moteur de l'application (app.js)
 *
 *  Responsabilités :
 *   1. Lire courseData (data.js) et construire la navigation
 *   2. Afficher le contenu d'une séance au clic
 *   3. Gérer le quiz (validation des réponses)
 *   4. Marquer les séances comme "terminées" (localStorage)
 *   5. Calculer et afficher la jauge de progression globale
 *   6. Gérer la sidebar mobile (hamburger / overlay)
 *   7. Parcours linéaire : verrouillage des séances non débloquées
 *   8. Gamification : confettis au déblocage d'une séance
 *   9. Page d'accueil dédiée avec CTA "Reprendre ma formation"
 * ============================================================
 */

/* ============================================================
   1. ÉTAT DE L'APPLICATION
   ============================================================ */

/** Clé localStorage pour sauvegarder la progression */
const LS_KEY = 'tisselia_progress';

/**
 * Charge la progression depuis localStorage.
 * @returns {Set<string>} Ensemble des IDs de séances terminées.
 */
function loadProgress() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

/**
 * Sauvegarde la progression dans localStorage.
 * @param {Set<string>} completedSet
 */
function saveProgress(completedSet) {
  localStorage.setItem(LS_KEY, JSON.stringify([...completedSet]));
}

/** Séances terminées (Set d'IDs) */
let completedSessions = loadProgress();

/** ID de la séance actuellement affichée */
let currentSessionId = null;

/* ============================================================
   2. RÉFÉRENCES DOM
   ============================================================ */
const courseNav         = document.getElementById('course-nav');
const lessonContent     = document.getElementById('lesson-content');
const welcomeScreen     = document.getElementById('welcome-screen');
const progressBarFill   = document.getElementById('progress-bar-fill');
const progressPercent   = document.getElementById('progress-percent');
const mainHeaderTitle   = document.getElementById('main-header-title');
const hamburgerBtn      = document.getElementById('hamburger-btn');
const sidebar           = document.getElementById('sidebar');
const sidebarOverlay    = document.getElementById('sidebar-overlay');
const sidebarCloseBtn   = document.getElementById('sidebar-close-btn');
const homeBtn           = document.getElementById('home-btn');

/* ============================================================
   3. PARCOURS LINÉAIRE — Helpers de verrouillage
   ============================================================ */

/** Liste plate de toutes les séances (tous modules) */
function allSessionsFlat() {
  return courseData.modules.flatMap(m => m.sessions);
}

/**
 * Indique si une séance est débloquée.
 * Règle : la séance 0 est toujours débloquée ;
 *         la séance N est débloquée si la séance N-1 est terminée.
 * @param {string} sessionId
 * @returns {boolean}
 */
function isSessionUnlocked(sessionId) {
  const all = allSessionsFlat();
  const idx = all.findIndex(s => s.id === sessionId);
  if (idx <= 0) return true;
  return completedSessions.has(all[idx - 1].id);
}

/**
 * Retourne l'ID de la séance sur laquelle reprendre :
 * la première séance débloquée mais non terminée,
 * ou la dernière séance si tout est terminé.
 * @returns {string|null}
 */
function getResumeSessionId() {
  const all = allSessionsFlat();
  for (let i = 0; i < all.length; i++) {
    const unlocked = i === 0 || completedSessions.has(all[i - 1].id);
    if (unlocked && !completedSessions.has(all[i].id)) return all[i].id;
  }
  return all[all.length - 1]?.id || null;
}

/* ============================================================
   4. NAVIGATION — Construction de la sidebar
   ============================================================ */

/**
 * Calcule le nombre total de séances dans courseData.
 * @returns {number}
 */
function totalSessions() {
  return courseData.modules.reduce((sum, mod) => sum + mod.sessions.length, 0);
}

/**
 * Met à jour la jauge de progression et le pourcentage.
 */
function updateProgressBar() {
  const total   = totalSessions();
  const done    = completedSessions.size;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  progressBarFill.style.width = percent + '%';
  progressPercent.textContent  = percent + '%';
}

/**
 * Crée et injecte l'accordéon de navigation dans la sidebar.
 */
function buildNav() {
  courseNav.innerHTML = '';

  courseData.modules.forEach((module, mIdx) => {

    /* --- Conteneur du module --- */
    const moduleItem = document.createElement('div');
    moduleItem.className = 'module-item';

    /* --- Bouton toggle du module --- */
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'module-toggle';
    toggleBtn.setAttribute('aria-expanded', mIdx === 0 ? 'true' : 'false');
    toggleBtn.innerHTML = `
      <span class="module-num">${mIdx + 1}</span>
      <span class="module-title-text">${module.title}</span>
      <span class="module-chevron">▼</span>
    `;

    /* --- Liste des séances --- */
    const sessionsList = document.createElement('ul');
    sessionsList.className = 'sessions-list' + (mIdx === 0 ? ' open' : '');
    if (mIdx === 0) toggleBtn.classList.add('open');

    module.sessions.forEach(session => {
      const li = document.createElement('li');
      const isCompleted = completedSessions.has(session.id);
      const unlocked    = isSessionUnlocked(session.id);

      const btn = document.createElement('button');
      btn.className = 'session-btn'
        + (isCompleted ? ' completed' : '')
        + (!unlocked   ? ' locked'    : '');
      btn.dataset.sessionId = session.id;
      btn.disabled = !unlocked;
      btn.innerHTML = `
        <span class="session-title-text">${session.title}</span>
        <span class="session-status-icon">✅</span>
        <span class="session-lock-icon">🔒</span>
      `;

      if (unlocked) {
        btn.addEventListener('click', () => {
          closeSidebarMobile();
          loadSession(session.id);
        });
      }

      li.appendChild(btn);
      sessionsList.appendChild(li);
    });

    /* --- Accordéon toggle --- */
    toggleBtn.addEventListener('click', () => {
      const isOpen = sessionsList.classList.contains('open');
      /* Ferme tous les autres */
      document.querySelectorAll('.sessions-list.open').forEach(el => el.classList.remove('open'));
      document.querySelectorAll('.module-toggle.open').forEach(el => {
        el.classList.remove('open');
        el.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        sessionsList.classList.add('open');
        toggleBtn.classList.add('open');
        toggleBtn.setAttribute('aria-expanded', 'true');
      }
    });

    moduleItem.appendChild(toggleBtn);
    moduleItem.appendChild(sessionsList);
    courseNav.appendChild(moduleItem);
  });
}

/**
 * Met à jour l'état visuel (active / completed / locked) des boutons de séance.
 * Appelée après chaque changement de progression pour refléter les déblocages.
 */
function refreshNavState() {
  document.querySelectorAll('.session-btn').forEach(btn => {
    const sid      = btn.dataset.sessionId;
    const completed = completedSessions.has(sid);
    const unlocked  = isSessionUnlocked(sid);

    btn.classList.toggle('active',    sid === currentSessionId);
    btn.classList.toggle('completed', completed);
    btn.classList.toggle('locked',    !unlocked);
    btn.disabled = !unlocked;

    /* Ajouter l'écouteur de clic si la séance vient d'être débloquée */
    if (unlocked && !btn.dataset.listenerAttached) {
      btn.addEventListener('click', () => {
        closeSidebarMobile();
        loadSession(btn.dataset.sessionId);
      });
      btn.dataset.listenerAttached = 'true';
    }
  });

  /* Mettre à jour l'état actif du bouton Accueil */
  homeBtn.classList.toggle('active', currentSessionId === null);
}

/* ============================================================
   4. AFFICHAGE D'UNE SÉANCE
   ============================================================ */

/**
 * Trouve un module et une session par l'ID de la session.
 * @param {string} sessionId
 * @returns {{ module, session, moduleIndex, sessionIndex } | null}
 */
function findSession(sessionId) {
  for (let mIdx = 0; mIdx < courseData.modules.length; mIdx++) {
    const mod = courseData.modules[mIdx];
    const sIdx = mod.sessions.findIndex(s => s.id === sessionId);
    if (sIdx !== -1) {
      return { module: mod, session: mod.sessions[sIdx], moduleIndex: mIdx, sessionIndex: sIdx };
    }
  }
  return null;
}

/**
 * Retourne la session suivante (tous modules confondus), ou null si dernière.
 * @param {string} sessionId
 * @returns {object|null}
 */
function nextSession(sessionId) {
  const allSessions = courseData.modules.flatMap(m => m.sessions);
  const idx = allSessions.findIndex(s => s.id === sessionId);
  return idx !== -1 && idx + 1 < allSessions.length ? allSessions[idx + 1] : null;
}

/**
 * Charge et affiche le contenu d'une séance.
 * @param {string} sessionId
 */
function loadSession(sessionId) {
  const found = findSession(sessionId);
  if (!found) return;

  const { module, session } = found;
  currentSessionId = sessionId;

  /* Masquer l'écran de bienvenue, montrer le contenu */
  welcomeScreen.classList.add('hidden');
  lessonContent.classList.remove('hidden');

  /* Mettre à jour le titre du header */
  mainHeaderTitle.textContent = session.title;

  /* Ouvrir l'accordéon du module courant */
  document.querySelectorAll('.module-toggle').forEach((btn, idx) => {
    if (courseData.modules[idx] && courseData.modules[idx].id === module.id) {
      const list = btn.nextElementSibling;
      document.querySelectorAll('.sessions-list').forEach(l => l.classList.remove('open'));
      document.querySelectorAll('.module-toggle').forEach(b => { b.classList.remove('open'); b.setAttribute('aria-expanded','false'); });
      list.classList.add('open');
      btn.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });

  /* Rafraîchir états actif / terminé */
  refreshNavState();

  /* Construire le HTML de la séance */
  lessonContent.innerHTML = buildLessonHTML(module, session);

  /* Attacher les événements du quiz et des boutons */
  initLessonEvents(session);

  /* Remonter en haut de la page */
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Construit le HTML complet d'une séance.
 * @param {object} module
 * @param {object} session
 * @returns {string}
 */
function buildLessonHTML(module, session) {
  const isCompleted = completedSessions.has(session.id);
  const next = nextSession(session.id);
  let html = '';

  /* Fil d'Ariane */
  html += `
    <div class="lesson-breadcrumb">
      <span>${module.title}</span>
      <span class="sep">›</span>
      <span>${session.title}</span>
    </div>
    <h1 class="lesson-title">${session.title}</h1>
  `;

  /* Vidéo YouTube */
  if (session.video) {
    html += `
      <div class="video-wrapper">
        <iframe
          src="${session.video}"
          title="${session.title}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen>
        </iframe>
      </div>
    `;
  } else {
    html += `
      <div style="background:#f0f4f8;border-radius:14px;padding:32px;text-align:center;color:#9ba8bb;margin-bottom:32px;font-size:0.9rem;">
        🎬 La vidéo de cette séance sera disponible prochainement.
      </div>
    `;
  }

  /* Texte d'introduction */
  if (session.intro) {
    html += `<div class="lesson-intro">${session.intro}</div>`;
  }

  /* Ressources téléchargeables */
  if (session.resources && session.resources.length > 0) {
    html += `<div class="resources-section"><p class="section-title">📎 Ressources</p>`;
    session.resources.forEach(res => {
      html += `
        <a href="${res.url}" class="resource-link" target="_blank" rel="noopener noreferrer">
          <span class="link-icon">${res.icon || '📄'}</span>
          ${res.label}
        </a>
      `;
    });
    html += `</div>`;
  }

  /* Quiz */
  if (session.quiz && session.quiz.length > 0) {
    html += buildQuizHTML(session.quiz);
  }

  /* Séparateur */
  html += `<hr style="border:none;border-top:1px solid rgba(0,0,0,0.07);margin:32px 0;" />`;

  /* Bouton "Marquer comme terminée" */
  html += `
    <div class="complete-btn-wrapper">
      <button
        id="complete-btn"
        class="complete-btn"
        ${isCompleted ? 'disabled' : ''}>
        ${isCompleted ? '✅ Séance terminée !' : '✅ Marquer cette séance comme terminée'}
      </button>
      <button
        id="next-btn"
        class="next-btn ${isCompleted && next ? 'visible' : ''}"
        ${next ? '' : 'style="display:none"'}>
        Séance suivante : ${next ? next.title : ''} →
      </button>
    </div>
  `;

  return html;
}

/* ============================================================
   5. QUIZ — Construction HTML
   ============================================================ */

/**
 * Construit le HTML du bloc quiz.
 * @param {Array} questions
 * @returns {string}
 */
function buildQuizHTML(questions) {
  let html = `
    <div class="quiz-section" id="quiz-section">
      <h2 class="quiz-title">🧠 Quiz de la séance</h2>
  `;

  questions.forEach((q, idx) => {
    html += `
      <div class="quiz-question-block" data-question-id="${q.id}">
        <p class="quiz-question-text">${idx + 1}. ${q.question}</p>
        <div class="quiz-options" role="radiogroup" aria-label="${q.question}">
    `;
    q.options.forEach(opt => {
      html += `
        <label class="quiz-option" data-option-id="${opt.id}">
          <input type="radio" name="q_${q.id}" value="${opt.id}" />
          ${opt.text}
        </label>
      `;
    });
    html += `
        </div>
        <div class="quiz-feedback" id="feedback_${q.id}"></div>
      </div>
    `;
  });

  html += `
      <button class="quiz-validate-btn" id="quiz-validate-btn" disabled>
        Valider mes réponses
      </button>
    </div>
  `;

  return html;
}

/* ============================================================
   6. ÉVÉNEMENTS — Quiz, bouton "Terminé", "Suivant"
   ============================================================ */

/**
 * Initialise tous les événements pour une séance chargée.
 * @param {object} session
 */
function initLessonEvents(session) {

  /* --- Quiz --- */
  if (session.quiz && session.quiz.length > 0) {
    initQuizEvents(session.quiz);
  }

  /* --- Bouton "Marquer comme terminée" --- */
  const completeBtn = document.getElementById('complete-btn');
  const nextBtn     = document.getElementById('next-btn');

  if (completeBtn && !completeBtn.disabled) {
    completeBtn.addEventListener('click', () => {
      markSessionComplete(session.id, completeBtn, nextBtn);
    });
  }

  /* --- Bouton "Séance suivante" --- */
  if (nextBtn) {
    const next = nextSession(session.id);
    if (next) {
      nextBtn.addEventListener('click', () => loadSession(next.id));
    }
  }
}

/**
 * Active la validation du quiz quand toutes les questions ont une réponse.
 * @param {Array} questions
 */
function initQuizEvents(questions) {
  const validateBtn = document.getElementById('quiz-validate-btn');
  if (!validateBtn) return;

  /* Active le bouton dès que toutes les questions ont une réponse */
  function checkAllAnswered() {
    const allAnswered = questions.every(q => {
      return document.querySelector(`input[name="q_${q.id}"]:checked`);
    });
    validateBtn.disabled = !allAnswered;
  }

  questions.forEach(q => {
    const radios = document.querySelectorAll(`input[name="q_${q.id}"]`);
    radios.forEach(radio => {
      radio.addEventListener('change', () => {
        /* Mettre à jour la classe "selected" sur les labels */
        document.querySelectorAll(`input[name="q_${q.id}"]`).forEach(r => {
          r.closest('.quiz-option').classList.remove('selected');
        });
        radio.closest('.quiz-option').classList.add('selected');
        checkAllAnswered();
      });
    });
  });

  /* Validation des réponses */
  validateBtn.addEventListener('click', () => {
    validateQuiz(questions, validateBtn);
  });
}

/**
 * Valide les réponses du quiz et affiche les feedbacks.
 * @param {Array} questions
 * @param {HTMLElement} validateBtn
 */
function validateQuiz(questions, validateBtn) {
  questions.forEach(q => {
    const selected = document.querySelector(`input[name="q_${q.id}"]:checked`);
    const feedback = document.getElementById(`feedback_${q.id}`);
    const block    = document.querySelector(`.quiz-question-block[data-question-id="${q.id}"]`);

    /* Réinitialise les styles */
    block.querySelectorAll('.quiz-option').forEach(opt => {
      opt.classList.remove('correct', 'wrong');
    });

    if (!selected) return;

    const isCorrect = selected.value === q.answer;

    /* Colorier la bonne réponse en vert */
    const correctLabel = block.querySelector(`input[value="${q.answer}"]`)?.closest('.quiz-option');
    if (correctLabel) correctLabel.classList.add('correct');

    /* Si mauvaise réponse, colorier le choix erroné en rouge */
    if (!isCorrect) {
      selected.closest('.quiz-option').classList.add('wrong');
      feedback.textContent = '❌ Ce n\'est pas la bonne réponse. Regardez la réponse correcte surlignée en vert.';
      feedback.className = 'quiz-feedback wrong';
    } else {
      feedback.textContent = '✅ Bravo, c\'est la bonne réponse !';
      feedback.className = 'quiz-feedback correct';
    }

    /* Désactiver les options */
    block.querySelectorAll('input[type="radio"]').forEach(r => r.disabled = true);
  });

  /* Désactiver le bouton de validation */
  validateBtn.disabled = true;
  validateBtn.textContent = 'Réponses validées ✓';
}

/* ============================================================
   7. GAMIFICATION — Confettis
   ============================================================ */

/**
 * Lance une animation de confettis aux couleurs Tisselia.
 */
function launchConfetti() {
  if (typeof confetti === 'undefined') return;
  const colors = ['#4db8c8', '#f59b8b', '#ffffff', '#22c55e', '#fbbf24'];
  /* Rafale depuis la gauche */
  confetti({ particleCount: 80, angle: 60,  spread: 55, origin: { x: 0,   y: 0.75 }, colors });
  /* Rafale depuis la droite (légère pause pour l'effet "croisé") */
  setTimeout(() => {
    confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1, y: 0.75 }, colors });
  }, 150);
}

/* ============================================================
   8. PROGRESSION — Marquer une séance comme terminée
   ============================================================ */

/**
 * Marque la séance comme terminée, met à jour l'UI.
 * @param {string} sessionId
 * @param {HTMLElement} completeBtn
 * @param {HTMLElement} nextBtn
 */
function markSessionComplete(sessionId, completeBtn, nextBtn) {
  completedSessions.add(sessionId);
  saveProgress(completedSessions);

  /* Confettis 🎉 */
  launchConfetti();

  /* Mettre à jour le bouton */
  completeBtn.disabled = true;
  completeBtn.textContent = '✅ Séance terminée !';

  /* Afficher le bouton "Séance suivante" */
  const next = nextSession(sessionId);
  if (next && nextBtn) {
    nextBtn.classList.add('visible');
  }

  /* Rafraîchir la sidebar (déblocage de la séance suivante) et la progression */
  refreshNavState();
  updateProgressBar();
}

/* ============================================================
   9. PAGE D'ACCUEIL
   ============================================================ */

/**
 * Affiche la page d'accueil et réinitialise l'état courant.
 */
function showHomePage() {
  currentSessionId = null;
  welcomeScreen.classList.remove('hidden');
  lessonContent.classList.add('hidden');
  mainHeaderTitle.textContent = 'Intelligence Artificielle & Cybersécurité';
  refreshNavState(); /* met homeBtn en .active, retire .active des séances */
}

/* ============================================================
   10. SIDEBAR MOBILE
   ============================================================ */
function openSidebarMobile() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSidebarMobile() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

hamburgerBtn.addEventListener('click', openSidebarMobile);
sidebarCloseBtn.addEventListener('click', closeSidebarMobile);
sidebarOverlay.addEventListener('click', closeSidebarMobile);

/* ============================================================
   11. LISTENERS GLOBAUX
   ============================================================ */

/* Bouton "Accueil" dans la sidebar */
homeBtn.addEventListener('click', () => {
  closeSidebarMobile();
  showHomePage();
});

/* ============================================================
   12. INITIALISATION
   ============================================================ */

/**
 * Point d'entrée de l'application.
 * Attache le listener du bouton CTA après que le DOM de la homepage est prêt.
 */
function init() {
  buildNav();
  updateProgressBar();

  /* Bouton "Reprendre ma formation" (dans la homepage) */
  document.getElementById('start-btn').addEventListener('click', () => {
    const resumeId = getResumeSessionId();
    if (resumeId) loadSession(resumeId);
  });
}

/* Lancer l'app quand le DOM est prêt */
document.addEventListener('DOMContentLoaded', init);
