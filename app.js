/**
 * ============================================================
 *  TISSELIA — Moteur de l'application (app.js)
 *  v3 — Firebase Auth + Firestore
 *
 *  Responsabilités :
 *   1.  Firebase : initialisation Auth + Firestore
 *   2.  Auth UI : overlay connexion / inscription
 *   3.  Auth logique : signIn, signUp, signOut
 *   4.  Cycle de vie auth : onAuthStateChanged
 *   5.  Firestore listener temps-réel sur le document utilisateur
 *   6.  États de l'interface : pending / approved / déconnecté
 *   7.  Double verrouillage : admin (maxSessionUnlocked) + progression
 *   8.  Affichage des séances + quiz
 *   9.  Progression sauvegardée dans Firestore (arrayUnion)
 *   10. Gamification : confettis
 *   11. Sidebar mobile responsive
 * ============================================================
 */

/* ============================================================
   1. FIREBASE — Configuration & Initialisation
   ============================================================ */

const firebaseConfig = {
  apiKey:            'AIzaSyDTDjbO2jrR7rIOp730VOdcNDFV9WeEK2c',
  authDomain:        'mooc-940cd.firebaseapp.com',
  projectId:         'mooc-940cd',
  storageBucket:     'mooc-940cd.firebasestorage.app',
  messagingSenderId: '435689976808',
  appId:             '1:435689976808:web:796331c03112851992ea5d',
  measurementId:     'G-K9VCK3KNKR'
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

/* ============================================================
   2. ÉTAT DE L'APPLICATION
   ============================================================ */

/** Email de l'administrateur — auto-promu à la connexion */
const ADMIN_EMAIL = 'davidpuzos@tisselia.com';

let currentUser       = null;   // firebase.auth().currentUser
let userDoc           = null;   // données Firestore : { role, status, maxSessionUnlocked, completedSessions }
let unsubscribeDoc    = null;   // cleanup du listener Firestore (document utilisateur courant)
let unsubscribeUsers  = null;   // cleanup du listener Firestore (collection users — admin seulement)
let currentSessionId  = null;   // ID de la séance actuellement affichée
let completedSessions = new Set(); // miroir local de userDoc.completedSessions
let adminPanelActive  = false;  // true quand le tableau de bord admin est affiché

/* ============================================================
   3. RÉFÉRENCES DOM
   ============================================================ */

/* Auth */
const authOverlay       = document.getElementById('auth-overlay');
const authForm          = document.getElementById('auth-form');
const authEmailInput    = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authSubmitBtn     = document.getElementById('auth-submit-btn');
const authTitle         = document.getElementById('auth-title');
const authSubtitle      = document.getElementById('auth-subtitle');
const authError         = document.getElementById('auth-error');
const authToggleBtn     = document.getElementById('auth-toggle-btn');
const authToggleLabel   = document.getElementById('auth-toggle-label');
const signupConfirmInput = document.getElementById('signup-password-confirm');
const authMainView      = document.getElementById('auth-main-view');
const authResetView     = document.getElementById('auth-reset-view');

/* Plateforme */
const pendingScreen      = document.getElementById('pending-screen');
const lessonView         = document.getElementById('lesson-view');
const lessonContent      = document.getElementById('lesson-content');
const welcomeScreen      = document.getElementById('welcome-screen');
const progressContainer  = document.getElementById('progress-container');
const progressBarFill    = document.getElementById('progress-bar-fill');
const progressPercent    = document.getElementById('progress-percent');
const sidebarHomeWrapper = document.getElementById('sidebar-home-wrapper');
const courseNav          = document.getElementById('course-nav');
const sidebarFooter      = document.getElementById('sidebar-footer');
const userEmailDisplay   = document.getElementById('user-email-display');
const signoutBtn         = document.getElementById('signout-btn');
const homeBtn            = document.getElementById('home-btn');
const sidebarAdminWrapper = document.getElementById('sidebar-admin-wrapper');
const adminPanelBtn      = document.getElementById('admin-panel-btn');
const adminPanel         = document.getElementById('admin-panel');
const adminStats         = document.getElementById('admin-stats');
const usersTableWrapper  = document.getElementById('users-table-wrapper');
const mainHeaderTitle    = document.getElementById('main-header-title');
const hamburgerBtn       = document.getElementById('hamburger-btn');
const sidebar            = document.getElementById('sidebar');
const sidebarOverlay     = document.getElementById('sidebar-overlay');
const sidebarCloseBtn    = document.getElementById('sidebar-close-btn');
const appWrapper         = document.getElementById('app-wrapper');
const landingPage        = document.getElementById('landing-page');

/* ============================================================
   4. AUTH UI — Helpers d'interface
   ============================================================ */

let isSignupMode = false;

function showAuthOverlay() { authOverlay.classList.remove('hidden'); }
function hideAuthOverlay() { authOverlay.classList.add('hidden'); }

/**
 * Affiche une des 3 vues de l'overlay d'auth :
 *   'onboarding' | 'main' | 'reset'
 */
function showAuthView(name) {
  document.getElementById('auth-onboarding-view').classList.toggle('hidden', name !== 'onboarding');
  document.getElementById('auth-main-view').classList.toggle('hidden', name !== 'main');
  document.getElementById('auth-reset-view').classList.toggle('hidden', name !== 'reset');
}

/** Bascule entre mode "Se connecter" et "S'inscrire". */
function setAuthMode(signup) {
  isSignupMode = signup;
  const confirmField  = document.getElementById('confirm-password-field');
  const forgotWrapper = document.getElementById('forgot-password-wrapper');

  if (signup) {
    authTitle.textContent          = "S'inscrire";
    authSubtitle.textContent       = 'Créez votre compte gratuitement';
    authSubmitBtn.textContent      = 'Créer mon compte';
    authToggleLabel.textContent    = 'Déjà un compte ?';
    authToggleBtn.textContent      = 'Se connecter';
    authPasswordInput.autocomplete = 'new-password';
    confirmField.classList.remove('hidden');
    forgotWrapper.classList.add('hidden');
  } else {
    authTitle.textContent          = 'Se connecter';
    authSubtitle.textContent       = 'Accédez à votre espace de formation';
    authSubmitBtn.textContent      = 'Se connecter';
    authToggleLabel.textContent    = 'Pas encore de compte ?';
    authToggleBtn.textContent      = "S'inscrire";
    authPasswordInput.autocomplete = 'current-password';
    confirmField.classList.add('hidden');
    forgotWrapper.classList.remove('hidden');
  }
  hideAuthError();
}

function showAuthError(msg) {
  authError.textContent = msg;
  authError.classList.remove('hidden');
}
function hideAuthError() {
  authError.classList.add('hidden');
  authError.textContent = '';
}

/** Traduit les codes d'erreur Firebase en français. */
function translateFirebaseError(code) {
  const map = {
    'auth/user-not-found':      'Aucun compte trouvé avec cet email.',
    'auth/wrong-password':      'Mot de passe incorrect.',
    'auth/email-already-in-use':'Cet email est déjà utilisé par un autre compte.',
    'auth/weak-password':       'Le mot de passe doit contenir au moins 6 caractères.',
    'auth/invalid-email':       'Adresse email invalide.',
    'auth/invalid-credential':  'Identifiants incorrects. Vérifiez votre email et mot de passe.',
    'auth/too-many-requests':   'Trop de tentatives. Réessayez dans quelques minutes.',
  };
  return map[code] || 'Une erreur est survenue. Veuillez réessayer.';
}

/* ============================================================
   5. AUTH LOGIQUE — Connexion, Inscription, Déconnexion
   ============================================================ */

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAuthError();
  authSubmitBtn.disabled = true;
  authSubmitBtn.textContent = '…';

  const email    = authEmailInput.value.trim();
  const password = authPasswordInput.value;

  /* Vérification de la confirmation du mot de passe (inscription) */
  if (isSignupMode && password !== signupConfirmInput.value) {
    showAuthError('Les mots de passe ne correspondent pas.');
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = 'Créer mon compte';
    return;
  }

  try {
    if (isSignupMode) {
      /* --- Inscription --- */
      const cred = await auth.createUserWithEmailAndPassword(email, password);

      /* Créer le document utilisateur dans Firestore */
      await db.collection('users').doc(cred.user.uid).set({
        email:              cred.user.email,
        role:               'student',
        status:             'pending',
        maxSessionUnlocked: 0,
        completedSessions:  [],
        createdAt:          firebase.firestore.FieldValue.serverTimestamp()
      });
      /* onAuthStateChanged + startUserDocListener prennent le relais */

    } else {
      /* --- Connexion --- */
      await auth.signInWithEmailAndPassword(email, password);
      /* onAuthStateChanged prend le relais */
    }
  } catch (err) {
    showAuthError(translateFirebaseError(err.code));
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = isSignupMode ? 'Créer mon compte' : 'Se connecter';
  }
});

authToggleBtn.addEventListener('click', () => setAuthMode(!isSignupMode));

signoutBtn.addEventListener('click', () => auth.signOut());

/* ============================================================
   6. CYCLE DE VIE AUTH — onAuthStateChanged
   ============================================================ */

auth.onAuthStateChanged((user) => {
  if (user) {
    /* Utilisateur connecté */
    currentUser = user;
    hideAuthOverlay();
    hideLandingPage();
    appWrapper.classList.remove('hidden');
    userEmailDisplay.textContent = user.email;
    sidebarFooter.classList.remove('hidden');

    /* Ceinture et bretelles : si l'email est EXACTEMENT celui de l'admin,
       on force l'affichage du bouton et le listener SANS attendre Firestore. */
    if (user.email === ADMIN_EMAIL) {
      sidebarAdminWrapper.classList.remove('hidden');
      startAdminUsersListener();
    }

    startUserDocListener(user.uid);
  } else {
    /* Utilisateur déconnecté */
    currentUser        = null;
    userDoc            = null;
    completedSessions  = new Set();
    currentSessionId   = null;
    adminPanelActive   = false;
    if (unsubscribeDoc)   { unsubscribeDoc();   unsubscribeDoc   = null; }
    if (unsubscribeUsers) { unsubscribeUsers(); unsubscribeUsers = null; }
    sidebarFooter.classList.add('hidden');
    sidebarAdminWrapper.classList.add('hidden');
    adminPanel.classList.add('hidden');
    hideAuthOverlay();
    hidePlatform();
    showLandingPage();
  }
});

/* ============================================================
   7. FIRESTORE — Listener temps-réel sur le document utilisateur
   Permet le "drip content" : si l'admin change maxSessionUnlocked,
   la sidebar se met à jour automatiquement sans rechargement.
   ============================================================ */

function startUserDocListener(uid) {
  if (unsubscribeDoc) unsubscribeDoc();

  unsubscribeDoc = db.collection('users').doc(uid).onSnapshot((snap) => {

    if (!snap.exists) {
      /* Document absent (rare) : on le crée avec statut pending */
      db.collection('users').doc(uid).set({
        email:              currentUser.email,
        role:               'student',
        status:             'pending',
        maxSessionUnlocked: 0,
        completedSessions:  [],
        createdAt:          firebase.firestore.FieldValue.serverTimestamp()
      });
      return;
    }

    userDoc = snap.data();
    completedSessions = new Set(userDoc.completedSessions || []);

    /* Auto-promotion admin si l'email correspond */
    if (currentUser.email === ADMIN_EMAIL &&
        (userDoc.role !== 'admin' || userDoc.status !== 'approved')) {
      db.collection('users').doc(uid).update({ role: 'admin', status: 'approved' });
      return; /* le snapshot suivant aura les bonnes valeurs */
    }

    /* Afficher / masquer le bouton "Panel Admin" */
    const isAdmin = userDoc.role === 'admin';
    sidebarAdminWrapper.classList.toggle('hidden', !isAdmin);
    if (isAdmin) startAdminUsersListener();

    if (userDoc.status === 'pending') {
      showPendingScreen();
    } else {
      showPlatform();
    }
  }, (err) => {
    console.error('Erreur listener Firestore :', err);
  });
}

/* ============================================================
   8. ÉTATS DE L'INTERFACE
   ============================================================ */

/** Affiche l'écran d'attente (status: pending). */
function showPendingScreen() {
  pendingScreen.classList.remove('hidden');
  lessonView.classList.add('hidden');
  /* Masquer les éléments de cours dans la sidebar */
  progressContainer.classList.add('hidden');
  sidebarHomeWrapper.classList.add('hidden');
  courseNav.classList.add('hidden');
}

/** Affiche la plateforme complète (status: approved). */
function showPlatform() {
  pendingScreen.classList.add('hidden');
  /* Ne pas interférer si le tableau de bord admin est actif */
  if (!adminPanelActive) lessonView.classList.remove('hidden');
  /* Afficher les éléments de cours dans la sidebar */
  progressContainer.classList.remove('hidden');
  sidebarHomeWrapper.classList.remove('hidden');
  courseNav.classList.remove('hidden');
  /* Reconstruire la nav (reflète les nouvelles séances débloquées par l'admin) */
  buildNav();
  updateProgressBar();
  updateCertificate();
  updateLessonNavButtons(); /* met à jour le bouton "suivante" si une séance est ouverte */
  /* CTA "Reprendre" */
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.onclick = () => {
      const id = getResumeSessionId();
      if (id) loadSession(id);
    };
  }
  /* Rafraîchir le tableau de bord si visible */
  if (!welcomeScreen.classList.contains('hidden')) renderDashboard();
}

/** Réinitialise l'affichage lors de la déconnexion. */
function hidePlatform() {
  adminPanelActive = false;
  adminPanel.classList.add('hidden');
  pendingScreen.classList.add('hidden');
  lessonView.classList.remove('hidden');
  lessonContent.classList.add('hidden');
  welcomeScreen.classList.remove('hidden');
  progressContainer.classList.add('hidden');
  sidebarHomeWrapper.classList.add('hidden');
  courseNav.classList.add('hidden');
  courseNav.innerHTML = '';
  currentSessionId = null;
  appWrapper.classList.add('hidden');
}

function showLandingPage() {
  landingPage.classList.remove('hidden');
  document.body.classList.remove('platform-active');
}

function hideLandingPage() {
  landingPage.classList.add('hidden');
  document.body.classList.add('platform-active');
}

/* ============================================================
   9. DOUBLE VERROUILLAGE — Helpers
   ============================================================ */

/** Retourne la liste plate de toutes les séances. */
function allSessionsFlat() {
  return courseData.modules.flatMap(m => m.sessions);
}

/**
 * Une séance N (index 1-based) est débloquée si ET SEULEMENT SI :
 *  1. L'admin a défini maxSessionUnlocked >= N
 *  2. La séance N-1 est dans completedSessions (sauf pour la séance 1)
 *
 *  Exception : les admins ont accès à toutes les séances sans restriction.
 */
function isSessionUnlocked(sessionId) {
  if (!userDoc || userDoc.status !== 'approved') return false;

  /* Passe-partout admin : accès illimité à toutes les séances */
  if (userDoc.role === 'admin') return true;

  const all = allSessionsFlat();
  const idx = all.findIndex(s => s.id === sessionId);
  if (idx < 0) return false;

  const sessionNum  = idx + 1; // 1-based
  const maxUnlocked = userDoc.maxSessionUnlocked || 0;

  /* Condition 1 : verrou admin */
  if (maxUnlocked < sessionNum) return false;

  /* Condition 2 : verrou progression (séance 1 n'a pas de prérequis) */
  if (idx === 0) return true;
  return completedSessions.has(all[idx - 1].id);
}

/**
 * Retourne l'ID de la séance sur laquelle reprendre :
 * la première séance débloquée mais non terminée,
 * ou la dernière séance débloquée si tout est terminé.
 */
function getResumeSessionId() {
  const all = allSessionsFlat();
  for (const s of all) {
    if (isSessionUnlocked(s.id) && !completedSessions.has(s.id)) return s.id;
  }
  /* Tout terminé : revenir sur la dernière séance débloquée */
  for (let i = all.length - 1; i >= 0; i--) {
    if (isSessionUnlocked(all[i].id)) return all[i].id;
  }
  return all[0]?.id || null;
}

/* ============================================================
   10. NAVIGATION — Construction de la sidebar
   ============================================================ */

function totalSessions() {
  return courseData.modules.reduce((sum, mod) => sum + mod.sessions.length, 0);
}

function updateProgressBar() {
  const total   = totalSessions();
  const done    = completedSessions.size;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  progressBarFill.style.width = percent + '%';
  progressPercent.textContent  = percent + '%';

  /* Moyenne globale des quiz (insérée une fois, mise à jour ensuite) */
  let avgEl = document.getElementById('sidebar-quiz-avg');
  if (!avgEl) {
    avgEl = document.createElement('p');
    avgEl.id = 'sidebar-quiz-avg';
    avgEl.className = 'sidebar-quiz-avg';
    progressContainer.appendChild(avgEl);
  }
  const avg = getGlobalQuizAverage();
  if (avg !== null) {
    avgEl.innerHTML = `🎯 Moyenne quiz : <strong>${avg}&nbsp;%</strong>`;
    avgEl.style.display = '';
  } else {
    avgEl.style.display = 'none';
  }
}

/** Calcule la moyenne en % de tous les quiz tentés. */
function getGlobalQuizAverage() {
  const scores = Object.values(userDoc?.quizScores || {});
  if (!scores.length) return null;
  return Math.round(scores.reduce((s, q) => s + q.pct, 0) / scores.length);
}

function buildNav() {
  courseNav.innerHTML = '';

  courseData.modules.forEach((module, mIdx) => {
    const moduleItem = document.createElement('div');
    moduleItem.className = 'module-item';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'module-toggle';
    toggleBtn.setAttribute('aria-expanded', mIdx === 0 ? 'true' : 'false');
    toggleBtn.innerHTML = `
      <span class="module-num">${mIdx + 1}</span>
      <span class="module-title-text">${module.title}</span>
      <span class="module-chevron">▼</span>
    `;

    const sessionsList = document.createElement('ul');
    sessionsList.className = 'sessions-list' + (mIdx === 0 ? ' open' : '');
    if (mIdx === 0) toggleBtn.classList.add('open');

    module.sessions.forEach(session => {
      const li          = document.createElement('li');
      const isCompleted = completedSessions.has(session.id);
      const unlocked    = isSessionUnlocked(session.id);

      const btn = document.createElement('button');
      btn.className = 'session-btn'
        + (isCompleted ? ' completed' : '')
        + (!unlocked   ? ' locked'    : '');
      btn.dataset.sessionId = session.id;
      btn.disabled = !unlocked; /* attribut HTML + pointer-events: none via CSS */
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

    toggleBtn.addEventListener('click', () => {
      const isOpen = sessionsList.classList.contains('open');
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
 * Met à jour les classes visuelles (active / completed / locked) sans
 * reconstruire tout le DOM. Appelée après chaque changement de progression.
 */
function refreshNavState() {
  document.querySelectorAll('.session-btn').forEach(btn => {
    const sid       = btn.dataset.sessionId;
    const completed = completedSessions.has(sid);
    const unlocked  = isSessionUnlocked(sid);

    btn.classList.toggle('active',    sid === currentSessionId);
    btn.classList.toggle('completed', completed);
    btn.classList.toggle('locked',    !unlocked);
    btn.disabled = !unlocked;

    /* Attacher l'écouteur de clic dès qu'une séance vient d'être débloquée */
    if (unlocked && !btn.dataset.listenerAttached) {
      btn.addEventListener('click', () => {
        closeSidebarMobile();
        loadSession(btn.dataset.sessionId);
      });
      btn.dataset.listenerAttached = 'true';
    }
  });

  homeBtn.classList.toggle('active', currentSessionId === null);

  /* Scroll automatique vers la séance active dans la sidebar */
  const activeBtn = courseNav.querySelector('.session-btn.active');
  if (activeBtn) activeBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

/* ============================================================
   11. AFFICHAGE D'UNE SÉANCE
   ============================================================ */

function findSession(sessionId) {
  for (let mIdx = 0; mIdx < courseData.modules.length; mIdx++) {
    const mod  = courseData.modules[mIdx];
    const sIdx = mod.sessions.findIndex(s => s.id === sessionId);
    if (sIdx !== -1) return { module: mod, session: mod.sessions[sIdx] };
  }
  return null;
}

function nextSession(sessionId) {
  const all = allSessionsFlat();
  const idx = all.findIndex(s => s.id === sessionId);
  return idx !== -1 && idx + 1 < all.length ? all[idx + 1] : null;
}

/**
 * Retourne le HTML du bloc "séance suivante" selon l'état courant.
 * - Séance non terminée       → vide (le bloc n'existe pas encore)
 * - Séance terminée + suivante débloquée  → bouton "Séance suivante →"
 * - Séance terminée + suivante verrouillée → bloc "Bientôt disponible"
 * - Dernière séance terminée  → vide (la bannière certificat prend le relais)
 */
function buildNextAreaHTML(isCompleted, next) {
  if (!isCompleted || !next) return '';
  if (isSessionUnlocked(next.id)) {
    return `<button id="next-btn" class="next-btn visible">
      Séance suivante : ${next.title} →
    </button>`;
  }
  return `<div class="coming-soon-block">
    🎉 Bravo, vous êtes à jour !
    La suite de la formation sera débloquée très prochainement.
  </div>`;
}

/**
 * Met à jour dynamiquement la zone "séance suivante" sans recharger la séance.
 * Appelée après chaque changement de progression ou de maxSessionUnlocked.
 */
function updateLessonNavButtons() {
  if (!currentSessionId) return;
  const nextArea = document.getElementById('session-next-area');
  if (!nextArea) return;
  const found = findSession(currentSessionId);
  if (!found) return;
  const { session } = found;
  const isCompleted = completedSessions.has(session.id);
  const next        = nextSession(session.id);
  nextArea.innerHTML = buildNextAreaHTML(isCompleted, next);
  const nextBtn = document.getElementById('next-btn');
  if (nextBtn && next) {
    nextBtn.addEventListener('click', () => loadSession(next.id));
  }
}

function loadSession(sessionId) {
  const found = findSession(sessionId);
  if (!found) return;

  /* Sécurité : refuser l'accès si la séance n'est pas débloquée */
  if (!isSessionUnlocked(sessionId)) return;

  const { module, session } = found;
  currentSessionId = sessionId;

  welcomeScreen.classList.add('hidden');
  lessonContent.classList.remove('hidden');
  mainHeaderTitle.textContent = session.title;

  /* Ouvrir l'accordéon du module courant */
  document.querySelectorAll('.module-toggle').forEach((btn, idx) => {
    if (courseData.modules[idx]?.id === module.id) {
      const list = btn.nextElementSibling;
      document.querySelectorAll('.sessions-list').forEach(l => l.classList.remove('open'));
      document.querySelectorAll('.module-toggle').forEach(b => {
        b.classList.remove('open');
        b.setAttribute('aria-expanded', 'false');
      });
      list.classList.add('open');
      btn.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });

  refreshNavState();
  lessonContent.innerHTML = buildLessonHTML(module, session);
  initLessonEvents(session);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function buildLessonHTML(module, session) {
  const isCompleted = completedSessions.has(session.id);
  const next        = nextSession(session.id);
  const ev          = session.evaluation || null;
  const savedScore  = ev?.type === 'qcm' ? (userDoc?.quizScores?.[session.id] || null) : null;
  /* Le bouton est grisé par défaut si une évaluation est requise (et pas encore complétée) */
  const needsGate   = !isCompleted && ev !== null;

  /* Numéro de la séance dans la liste plate */
  const allSessions = allSessionsFlat();
  const sessionNum  = allSessions.findIndex(s => s.id === session.id) + 1;
  const allCount    = allSessions.length;

  /* ── Fil d'Ariane + Titre ── */
  let html = `
    <div class="lesson-breadcrumb">
      <span>${module.title}</span>
      <span class="sep">›</span>
      <span>${session.title}</span>
    </div>
    <h1 class="lesson-title">${session.title}</h1>
    <div class="lesson-meta">
      <span class="session-badge">Séance ${sessionNum} / ${allCount}</span>
      ${isCompleted ? '<span class="session-badge" style="background:rgba(34,197,94,0.1);color:#16a34a;">✅ Terminée</span>' : ''}
      ${savedScore ? `<span class="session-badge score-badge ${savedScore.pct >= 75 ? 'score-pass' : 'score-fail'}">🎯 ${savedScore.score}/${savedScore.total} &mdash; ${savedScore.pct}&nbsp;%</span>` : ''}
    </div>

    <!-- Onglets de navigation -->
    <div class="lesson-tabs" role="tablist">
      <button class="lesson-tab active" data-tab="description"
        role="tab" aria-selected="true">🗒️ Description</button>
      <button class="lesson-tab" data-tab="cours"
        role="tab" aria-selected="false">📖 Le Cours</button>
      <button class="lesson-tab" data-tab="evaluation"
        role="tab" aria-selected="false">✍️ L'Évaluation</button>
    </div>

    <!-- ── Onglet Description ── -->
    <div class="tab-panel" id="tab-description" role="tabpanel">
  `;

  if (session.description) {
    html += `<div class="session-description">${session.description}</div>`;
  } else {
    html += `<div class="session-description"><p>La description de cette séance sera disponible prochainement.</p></div>`;
  }

  html += `</div><!-- /tab-description -->

    <!-- ── Onglet Cours ── -->
    <div class="tab-panel hidden" id="tab-cours" role="tabpanel">
  `;

  /* Description courte de la vidéo */
  if (session.videoDesc) {
    html += `<p class="video-caption">${session.videoDesc}</p>`;
  }

  /* Vidéo : iframe (YouTube, Canva…) ou fichier direct (.mp4) */
  if (session.video) {
    const isDirectFile = /\.(mp4|webm|ogg)(\?|$)/i.test(session.video);
    if (isDirectFile) {
      html += `
        <div class="video-wrapper">
          <video src="${session.video}" controls playsinline></video>
        </div>`;
    } else {
      html += `
        <div class="video-wrapper">
          <iframe src="${session.video}" title="${session.title}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowfullscreen></iframe>
        </div>`;
    }
  } else {
    html += `<div class="video-placeholder">🎬 La vidéo de cette séance sera disponible prochainement.</div>`;
  }

  /* Fiche récapitulative (ressources flagguées recap:true) — juste après la vidéo */
  const recapRes = session.resources?.filter(r => r.recap) || [];
  if (recapRes.length) {
    recapRes.forEach(res => {
      html += `
        <a href="${res.url}" class="recap-card" target="_blank" rel="noopener noreferrer">
          <div class="recap-card-icon">📋</div>
          <div class="recap-card-body">
            <p class="recap-card-label">Fiche récapitulative</p>
            <p class="recap-card-title">${res.label}</p>
            <p class="recap-card-hint">Retrouvez en PDF tous les points clés de cette séance</p>
          </div>
          <div class="recap-card-arrow">Ouvrir le PDF →</div>
        </a>`;
    });
  }

  /* Autres ressources téléchargeables (non recap) */
  const otherRes = session.resources?.filter(r => !r.recap) || [];
  if (otherRes.length) {
    html += `<div class="resources-section"><p class="section-title">📎 Ressources</p>`;
    otherRes.forEach(res => {
      html += `<a href="${res.url}" class="resource-link" target="_blank" rel="noopener noreferrer">
        <span class="link-icon">${res.icon || '📄'}</span>${res.label}</a>`;
    });
    html += `</div>`;
  }

  html += `</div><!-- /tab-cours -->

    <!-- ── Onglet Évaluation ── -->
    <div class="tab-panel hidden" id="tab-evaluation" role="tabpanel">
  `;

  /* Contenu de l'évaluation */
  if (!ev) {
    html += `
      <div class="eval-placeholder">
        <span>📝</span>
        <p>L'évaluation de cette séance sera disponible prochainement.</p>
      </div>`;
  } else if (ev.type === 'qcm') {
    html += buildQcmHTML(ev.questions, savedScore);
  } else if (ev.type === 'email') {
    html += buildEmailEvalHTML();
  }

  /* Séparateur + bouton de complétion (uniquement dans l'onglet Évaluation) */
  html += `
    <hr style="border:none;border-top:1px solid rgba(0,0,0,0.07);margin:32px 0;" />
    <div class="complete-btn-wrapper">
      <button id="complete-btn" class="complete-btn${needsGate && !isCompleted ? ' needs-gate' : ''}"
        ${isCompleted || needsGate ? 'disabled' : ''}>
        ${isCompleted ? '✅ Séance terminée !' : '✅ Marquer cette séance comme terminée'}
      </button>
      <div id="session-next-area">${buildNextAreaHTML(isCompleted, next)}</div>
    </div>
  </div><!-- /tab-evaluation -->`;

  return html;
}

/** HTML pour une évaluation de type QCM. */
function buildQcmHTML(questions, savedScore) {
  const prevHtml = savedScore
    ? `<div class="quiz-prev-score">
        ${savedScore.pct >= 75 ? '✅' : '⚠️'} Meilleur score : <strong>${savedScore.score}/${savedScore.total} (${savedScore.pct}&nbsp;%)</strong>
       </div>`
    : '';

  let html = `
    <div class="quiz-section" id="quiz-section">
      <h2 class="quiz-title">🧠 Quiz de la séance</h2>
      <p class="quiz-subtitle">Répondez à toutes les questions, puis validez. Score minimum requis : 75 %.</p>
      ${prevHtml}
      <div class="quiz-score-banner hidden" id="quiz-score-banner"></div>`;

  questions.forEach((q, idx) => {
    html += `
      <div class="quiz-question-block" data-qid="${q.id}">
        <p class="quiz-question-text">${idx + 1}. ${q.question}</p>
        <div class="quiz-options" role="radiogroup">`;
    q.options.forEach(opt => {
      html += `
          <div class="quiz-option" data-qid="${q.id}" data-oid="${opt.id}" tabindex="0" role="radio" aria-checked="false">
            <span class="quiz-opt-marker"></span>
            <span>${opt.text}</span>
          </div>`;
    });
    html += `
        </div>
        <div class="quiz-feedback hidden" id="feedback_${q.id}"></div>
      </div>`;
  });

  html += `
      <div class="quiz-actions">
        <button class="quiz-validate-btn" id="quiz-validate-btn" disabled>Valider mes réponses</button>
        <button class="quiz-retry-btn hidden" id="quiz-retry-btn">🔄 Réessayer</button>
      </div>
    </div>`;
  return html;
}

/** HTML pour une évaluation de type email. */
function buildEmailEvalHTML() {
  return `
    <div class="email-eval">
      <p class="email-eval-title">📧 Envoi de votre travail par e-mail</p>
      <p class="email-eval-instructions">
        Pour valider cette séance, envoyez votre production (document Word, PDF,
        lien Canva, présentation…) à l'adresse e-mail de votre formateur.
        Indiquez votre <strong>nom complet</strong> et
        l'<strong>intitulé de la séance</strong> dans l'objet du message.
      </p>
      <p class="email-eval-contact">
        📬 Envoyer à :
        <a href="mailto:davidpuzos@tisselia.com" class="email-eval-address">
          davidpuzos@tisselia.com
        </a>
      </p>
      <label class="email-checkbox-wrapper">
        <input type="checkbox" id="confirm-checkbox" />
        <span class="email-checkbox-label">
          Je confirme avoir envoyé mon travail par e-mail à
          <strong>davidpuzos@tisselia.com</strong>.
        </span>
      </label>
    </div>`;
}

/* ============================================================
   12. QUIZ & ÉVALUATION — Logique d'interactivité
   ============================================================ */

function initLessonEvents(session) {
  const ev          = session.evaluation || null;
  const isCompleted = completedSessions.has(session.id);
  const completeBtn = document.getElementById('complete-btn');
  const next        = nextSession(session.id);

  /* Attacher le listener sur le bouton "suivante" s'il est présent dès le chargement */
  const nextBtnEl = document.getElementById('next-btn');
  if (nextBtnEl && next) {
    nextBtnEl.addEventListener('click', () => loadSession(next.id));
  }

  /* ── Onglets Cours / Évaluation ── */
  lessonContent.querySelectorAll('.lesson-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      lessonContent.querySelectorAll('.lesson-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      lessonContent.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.remove('hidden');

      /* QCM : options visibles → initialiser l'interactivité */
      if (tab.dataset.tab === 'evaluation' && ev?.type === 'qcm') {
        initQuizInteraction(ev.questions, session.id, () => {
          if (!completedSessions.has(session.id)) {
            markSessionComplete(session.id, completeBtn);
          }
        });
      }
    });
  });

  /* ── Logique d'évaluation (uniquement si la séance n'est pas déjà terminée) ── */
  if (!isCompleted && ev?.type === 'email') {
    /* Email : active le bouton "Terminée" quand la case est cochée */
    const checkbox = document.getElementById('confirm-checkbox');
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        completeBtn.disabled = !checkbox.checked;
      });
    }
  }

  /* ── Bouton "Marquer comme terminée" ── */
  if (completeBtn && !isCompleted) {
    completeBtn.addEventListener('click', () =>
      markSessionComplete(session.id, completeBtn));
  }

}

/**
 * Gestion complète du QCM — sélection par clic sur div, calcul du score,
 * sauvegarde Firestore, retake illimité.
 * Utilise section.dataset.quizReady pour éviter le double-attachement.
 */
function initQuizInteraction(questions, sessionId, onPassed) {
  const section = document.getElementById('quiz-section');
  if (!section || section.dataset.quizReady) return;
  section.dataset.quizReady = '1';

  const userAnswers = {};
  const validateBtn = document.getElementById('quiz-validate-btn');
  const retryBtn    = document.getElementById('quiz-retry-btn');
  const scoreBanner = document.getElementById('quiz-score-banner');

  /* ── Sélection d'une option ── */
  function selectOption(qid, oid) {
    section.querySelectorAll(`.quiz-option[data-qid="${qid}"]`).forEach(el => {
      el.classList.remove('selected');
      el.setAttribute('aria-checked', 'false');
    });
    const chosen = section.querySelector(`.quiz-option[data-qid="${qid}"][data-oid="${oid}"]`);
    if (chosen) { chosen.classList.add('selected'); chosen.setAttribute('aria-checked', 'true'); }
    userAnswers[qid] = oid;
    validateBtn.disabled = (Object.keys(userAnswers).length < questions.length);
  }

  /* ── Délégation de clic sur toute la section ── */
  section.addEventListener('click', e => {
    const opt = e.target.closest('.quiz-option:not(.locked)');
    if (opt) selectOption(opt.dataset.qid, opt.dataset.oid);
  });

  /* ── Accessibilité clavier (Espace / Entrée) ── */
  section.addEventListener('keydown', e => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    const opt = e.target.closest('.quiz-option:not(.locked)');
    if (!opt) return;
    e.preventDefault();
    selectOption(opt.dataset.qid, opt.dataset.oid);
  });

  /* ── Validation ── */
  validateBtn.addEventListener('click', () => {
    let correct = 0;

    questions.forEach(q => {
      const chosen   = userAnswers[q.id];
      const block    = section.querySelector(`.quiz-question-block[data-qid="${q.id}"]`);
      const feedback = document.getElementById(`feedback_${q.id}`);
      const isRight  = chosen === q.answer;
      if (isRight) correct++;

      /* Verrouiller et coloriser */
      block.querySelectorAll('.quiz-option').forEach(el => {
        el.classList.remove('selected'); /* retire la sélection pour que correct/wrong s'affiche proprement */
        el.classList.add('locked');
        if (el.dataset.oid === q.answer) el.classList.add('correct');
      });
      const wrongEl = block.querySelector(`.quiz-option[data-oid="${chosen}"]`);
      if (!isRight && wrongEl) wrongEl.classList.add('wrong');

      /* Feedback textuel */
      if (feedback) {
        feedback.textContent = isRight
          ? '✅ Bonne réponse !'
          : "❌ Ce n'est pas la bonne réponse. La bonne réponse est surlignée en vert.";
        feedback.className = `quiz-feedback ${isRight ? 'correct' : 'wrong'}`;
      }
    });

    const total  = questions.length;
    const pct    = Math.round((correct / total) * 100);
    const passed = pct >= 75;

    /* Bannière de score */
    if (scoreBanner) {
      scoreBanner.innerHTML = passed
        ? `🎉 <strong>${correct} / ${total} bonnes réponses — ${pct}&nbsp;%</strong> — Félicitations, séance validée !`
        : `😕 <strong>${correct} / ${total} bonnes réponses — ${pct}&nbsp;%</strong> — Score insuffisant (min.&nbsp;75&nbsp;%). Réessayez !`;
      scoreBanner.className = `quiz-score-banner ${passed ? 'pass' : 'fail'}`;
    }

    /* Sauvegarder le meilleur score dans Firestore */
    if (currentUser) {
      const prev = userDoc?.quizScores?.[sessionId];
      if (!prev || pct > prev.pct) {
        db.collection('users').doc(currentUser.uid)
          .set({ quizScores: { [sessionId]: { score: correct, total, pct } } }, { merge: true })
          .catch(err => console.warn('Score save failed:', err));
      }
    }

    validateBtn.classList.add('hidden');
    if (retryBtn) retryBtn.classList.remove('hidden');
    if (passed) onPassed();
  });

  /* ── Réessayer ── */
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      Object.keys(userAnswers).forEach(k => delete userAnswers[k]);
      section.querySelectorAll('.quiz-option').forEach(el => {
        el.classList.remove('selected', 'correct', 'wrong', 'locked');
        el.setAttribute('aria-checked', 'false');
      });
      section.querySelectorAll('.quiz-feedback').forEach(el => {
        el.textContent = '';
        el.className = 'quiz-feedback hidden';
      });
      if (scoreBanner) scoreBanner.className = 'quiz-score-banner hidden';
      validateBtn.disabled = true;
      validateBtn.classList.remove('hidden');
      retryBtn.classList.add('hidden');
    });
  }
}

/* ============================================================
   13. GAMIFICATION — Confettis
   ============================================================ */

function launchConfetti() {
  if (typeof confetti === 'undefined') return;
  const colors = ['#4db8c8', '#f59b8b', '#ffffff', '#22c55e', '#fbbf24'];
  confetti({ particleCount: 80, angle: 60,  spread: 55, origin: { x: 0, y: 0.75 }, colors });
  setTimeout(() =>
    confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1, y: 0.75 }, colors }),
    150);
}

/* ============================================================
   14a. TOAST — Notifications légères
   ============================================================ */

let toastContainer = null;

function showToast(message, type = 'success') {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  /* Force reflow then animate in */
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('toast-visible'));
  });

  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3500);
}

/* ============================================================
   14b. CERTIFICATE — Bannière de complétion
   ============================================================ */

function updateCertificate() {
  const banner = document.getElementById('certificate-banner');
  if (!banner) return;
  const total = totalSessions();
  if (total > 0 && completedSessions.size >= total) {
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

/* ============================================================
   14. PROGRESSION — Marquer comme terminée (Firestore)
   ============================================================ */

async function markSessionComplete(sessionId, completeBtn) {
  /* Optimistic update — feedback immédiat sans attendre Firestore */
  completedSessions.add(sessionId);
  completeBtn.disabled = true;
  completeBtn.textContent = '✅ Séance terminée !';
  launchConfetti();
  showToast('🎉 Séance validée — bravo !');
  updateCertificate();
  updateLessonNavButtons(); /* affiche "suivante" ou "bientôt disponible" */

  refreshNavState();
  updateProgressBar();

  /* Écriture dans Firestore */
  try {
    await db.collection('users').doc(currentUser.uid).update({
      completedSessions: firebase.firestore.FieldValue.arrayUnion(sessionId)
    });
  } catch (err) {
    console.error('Erreur sauvegarde Firestore :', err);
    /* Annuler l'optimistic update en cas d'échec */
    completedSessions.delete(sessionId);
    completeBtn.disabled = false;
    completeBtn.textContent = '✅ Marquer cette séance comme terminée';
    showToast('❌ Erreur de sauvegarde — réessayez.', 'error');
    updateCertificate();
    updateLessonNavButtons(); /* remet la zone à vide (pas encore terminée) */
    refreshNavState();
    updateProgressBar();
  }
}

/* ============================================================
   15. PAGE D'ACCUEIL
   ============================================================ */

function showHomePage() {
  hideAdminPanel(); /* ferme le panel admin si actif */
  currentSessionId = null;
  welcomeScreen.classList.remove('hidden');
  lessonContent.classList.add('hidden');
  mainHeaderTitle.textContent = 'Tableau de bord';
  refreshNavState();
  renderDashboard();
}

/* ============================================================
   15b. TABLEAU DE BORD — Rendu dynamique de la page d'accueil
   ============================================================ */

function renderDashboard() {
  /* Salutation personnalisée */
  const greetingEl = document.getElementById('dash-greeting');
  if (greetingEl && currentUser) {
    const name = currentUser.displayName || currentUser.email.split('@')[0];
    greetingEl.textContent = `👋 Bonjour, ${name} !`;
  }

  /* ── KPI cards ── */
  const kpisEl = document.getElementById('dash-kpis');
  if (kpisEl) {
    const total    = totalSessions();
    const done     = completedSessions.size;
    const pct      = total > 0 ? Math.round((done / total) * 100) : 0;
    const avg      = getGlobalQuizAverage();
    const quizDone = Object.keys(userDoc?.quizScores || {}).length;
    const nextSess = allSessionsFlat().find(s => isSessionUnlocked(s.id) && !completedSessions.has(s.id));

    kpisEl.innerHTML = `
      <div class="dash-kpi">
        <span class="dash-kpi-label">Séances terminées</span>
        <span class="dash-kpi-value">${done}<span class="dash-kpi-total"> / ${total}</span></span>
        <div class="dash-kpi-bar"><div style="width:${pct}%"></div></div>
      </div>
      <div class="dash-kpi ${avg !== null ? (avg >= 75 ? 'kpi-pass' : 'kpi-fail') : ''}">
        <span class="dash-kpi-label">Moyenne aux quiz</span>
        <span class="dash-kpi-value">${avg !== null ? avg + '&nbsp;%' : '—'}</span>
        ${avg !== null ? `<div class="dash-kpi-bar kpi-bar-score"><div style="width:${avg}%"></div></div>` : ''}
      </div>
      <div class="dash-kpi">
        <span class="dash-kpi-label">Quiz complétés</span>
        <span class="dash-kpi-value">${quizDone}<span class="dash-kpi-total"> / ${total}</span></span>
      </div>
      <div class="dash-kpi dash-kpi-next">
        <span class="dash-kpi-label">Prochaine séance</span>
        <span class="dash-next-title">${nextSess ? nextSess.title : done >= total ? '🎉 Formation terminée !' : '— Aucune séance disponible'}</span>
        ${nextSess ? `<button class="dash-next-btn" data-session-id="${nextSess.id}">Commencer →</button>` : ''}
      </div>`;

    /* Listener sur le bouton "Commencer" de la KPI */
    kpisEl.querySelector('.dash-next-btn')?.addEventListener('click', e => {
      loadSession(e.target.dataset.sessionId);
    });
  }

  /* ── Liste des séances par module ── */
  const sessionsEl = document.getElementById('dash-sessions');
  if (!sessionsEl) return;

  let html = '';
  courseData.modules.forEach(mod => {
    html += `<div class="dash-module">
      <div class="dash-module-header">${mod.title}</div>`;
    mod.sessions.forEach(session => {
      const completed = completedSessions.has(session.id);
      const unlocked  = isSessionUnlocked(session.id);
      const score     = userDoc?.quizScores?.[session.id];
      const stateClass = completed ? 'sess-done' : unlocked ? 'sess-current' : 'sess-locked';
      const icon = completed ? '✅' : unlocked ? '▶️' : '🔒';
      const scoreHtml = score
        ? `<span class="dash-sess-score ${score.pct >= 75 ? 'score-pass' : 'score-fail'}">🎯 ${score.score}/${score.total} — ${score.pct}&nbsp;%</span>`
        : '';
      html += `
        <div class="dash-session ${stateClass}" ${unlocked ? `data-session-id="${session.id}" tabindex="0" role="button"` : ''}>
          <span class="dash-sess-icon">${icon}</span>
          <span class="dash-sess-title">${session.title}</span>
          ${scoreHtml}
        </div>`;
    });
    html += '</div>';
  });
  sessionsEl.innerHTML = html;

  /* Clic / Entrée → ouvrir la séance */
  sessionsEl.querySelectorAll('.dash-session[data-session-id]').forEach(el => {
    el.addEventListener('click', () => loadSession(el.dataset.sessionId));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); loadSession(el.dataset.sessionId); }
    });
  });
}

/* ============================================================
   16. ADMIN — Affichage du tableau de bord
   ============================================================ */

/** Ouvre le tableau de bord admin et masque le contenu de cours. */
function showAdminPanel() {
  adminPanelActive = true;
  lessonView.classList.add('hidden');
  pendingScreen.classList.add('hidden');
  adminPanel.classList.remove('hidden');
  adminPanelBtn.classList.add('active');
  homeBtn.classList.remove('active');
  mainHeaderTitle.textContent = 'Tableau de bord Admin';
  closeSidebarMobile();
}

/** Ferme le tableau de bord admin (sans rien afficher d'autre). */
function hideAdminPanel() {
  if (!adminPanelActive) return;
  adminPanelActive = false;
  adminPanel.classList.add('hidden');
  adminPanelBtn.classList.remove('active');
  lessonView.classList.remove('hidden');
}

/* ============================================================
   17. ADMIN — Listener temps-réel sur la collection users
   Déclenché automatiquement si l'utilisateur connecté est admin.
   ============================================================ */

/**
 * S'abonne à toutes les modifications de la collection users.
 * L'appel est idempotent : un seul listener est actif à la fois.
 */
function startAdminUsersListener() {
  if (unsubscribeUsers) return; /* listener déjà actif */

  unsubscribeUsers = db.collection('users')
    .orderBy('createdAt', 'asc')
    .onSnapshot(snapshot => {
      const users = [];
      snapshot.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
      renderAdminStats(users);
      renderUsersTable(users);
    }, err => {
      console.error('Erreur listener users (admin) :', err);
    });
}

/* ============================================================
   18. ADMIN — Statistiques globales
   ============================================================ */

function renderAdminStats(users) {
  const students    = users.filter(u => u.role !== 'admin');
  const approved    = students.filter(u => u.status === 'approved').length;
  const pending     = students.filter(u => u.status === 'pending').length;
  const total       = totalSessions();
  const avgDone     = students.length > 0
    ? Math.round(
        students.reduce((sum, u) => sum + (u.completedSessions?.length || 0), 0)
        / students.length
      )
    : 0;

  adminStats.innerHTML = `
    <div class="admin-stat-card">
      <span class="stat-value">${students.length}</span>
      <span class="stat-label">Élèves inscrits</span>
    </div>
    <div class="admin-stat-card approved">
      <span class="stat-value">${approved}</span>
      <span class="stat-label">Approuvés</span>
    </div>
    <div class="admin-stat-card pending">
      <span class="stat-value">${pending}</span>
      <span class="stat-label">En attente</span>
    </div>
    <div class="admin-stat-card">
      <span class="stat-value">${avgDone}<span style="font-size:1rem;font-weight:400;color:var(--text-secondary)">/${total}</span></span>
      <span class="stat-label">Séances moy.</span>
    </div>
  `;
}

/* ============================================================
   19. ADMIN — Tableau des élèves
   ============================================================ */

function renderUsersTable(users) {
  const students = users.filter(u => u.role !== 'admin');
  const total    = totalSessions();

  if (!students.length) {
    usersTableWrapper.innerHTML = `
      <div class="admin-empty">
        <span>📭</span>
        <p>Aucun élève inscrit pour l'instant.</p>
      </div>`;
    return;
  }

  /* Génère les <option> pour le select maxSessionUnlocked */
  function sessionOptions(maxUnlocked) {
    let opts = `<option value="0" ${maxUnlocked === 0 ? 'selected' : ''}>🔒 Aucun accès</option>`;
    for (let n = 1; n <= total; n++) {
      opts += `<option value="${n}" ${maxUnlocked === n ? 'selected' : ''}>Séance ${n}</option>`;
    }
    return opts;
  }

  let html = `
    <table class="users-table">
      <thead>
        <tr>
          <th>Élève</th>
          <th>Statut</th>
          <th>Accès (jusqu'à)</th>
          <th>Progression</th>
          <th>Score quiz</th>
        </tr>
      </thead>
      <tbody>`;

  students.forEach(user => {
    const done        = (user.completedSessions || []).length;
    const isApproved  = user.status === 'approved';
    const maxUnlocked = user.maxSessionUnlocked || 0;
    const pct         = total > 0 ? Math.round((done / total) * 100) : 0;

    /* Score moyen des quiz */
    const quizScores  = Object.values(user.quizScores || {});
    const avgQuiz     = quizScores.length
      ? Math.round(quizScores.reduce((s, q) => s + q.pct, 0) / quizScores.length)
      : null;
    const quizCount   = quizScores.length;

    /* Détail par quiz : liste des scores séance par séance */
    const quizDetail = quizScores.length
      ? quizScores.map(q => `${q.score}/${q.total}`).join(', ')
      : '';

    html += `
      <tr>
        <td class="user-email-cell">
          <span class="user-avatar-sm">👤</span>
          <span class="user-email-text">${user.email}</span>
        </td>
        <td>
          <button class="status-toggle-btn ${isApproved ? 'approved' : 'pending'}"
            data-uid="${user.id}" data-status="${user.status}">
            ${isApproved ? '✅ Approuvé' : '⏳ En attente'}
          </button>
        </td>
        <td>
          <select class="session-unlock-select" data-uid="${user.id}">
            ${sessionOptions(maxUnlocked)}
          </select>
        </td>
        <td>
          <div class="progress-cell">
            <span class="progress-fraction">${done} / ${total}</span>
            <div class="mini-bar-track">
              <div class="mini-bar-fill" style="width:${pct}%"></div>
            </div>
            <span class="progress-pct">${pct}%</span>
          </div>
        </td>
        <td class="admin-quiz-cell">
          ${avgQuiz !== null
            ? `<span class="admin-quiz-avg ${avgQuiz >= 75 ? 'score-pass' : 'score-fail'}">${avgQuiz}&nbsp;%</span>
               <span class="admin-quiz-count">${quizCount} quiz tenté${quizCount > 1 ? 's' : ''}</span>`
            : '<span class="admin-quiz-none">—</span>'}
        </td>
      </tr>`;
  });

  html += `</tbody></table>`;
  usersTableWrapper.innerHTML = html;

  /* ---- Listeners sur les contrôles générés ---- */

  /* Toggle statut (pending ↔ approved) */
  usersTableWrapper.querySelectorAll('.status-toggle-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const uid       = btn.dataset.uid;
      const newStatus = btn.dataset.status === 'approved' ? 'pending' : 'approved';
      btn.disabled = true;
      try {
        await db.collection('users').doc(uid).update({ status: newStatus });
        /* Le onSnapshot met à jour le tableau automatiquement */
      } catch (err) {
        console.error('Erreur mise à jour statut :', err);
        btn.disabled = false;
      }
    });
  });

  /* Modifier maxSessionUnlocked */
  usersTableWrapper.querySelectorAll('.session-unlock-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const uid   = sel.dataset.uid;
      const value = parseInt(sel.value, 10);
      try {
        await db.collection('users').doc(uid).update({ maxSessionUnlocked: value });
        /* Le onSnapshot de l'élève mettra à jour sa sidebar en temps réel */
      } catch (err) {
        console.error('Erreur mise à jour maxSessionUnlocked :', err);
      }
    });
  });
}

/* ============================================================
   20. SIDEBAR MOBILE
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

homeBtn.addEventListener('click', () => {
  closeSidebarMobile();
  showHomePage();
});

/* Logo sidebar → retour au tableau de bord */
document.querySelector('.sidebar .logo').addEventListener('click', () => {
  closeSidebarMobile();
  showHomePage();
});

adminPanelBtn.addEventListener('click', () => {
  if (adminPanelActive) {
    /* Retour au cours si le panel est déjà ouvert */
    hideAdminPanel();
    showHomePage();
  } else {
    showAdminPanel();
  }
});

/* ============================================================
   21. AUTH v2 — Icônes œil, effacement d'erreurs, Google,
                 Mot de passe oublié / Réinitialisation
   ============================================================ */

/* --- Effacer les erreurs à la frappe --- */
authEmailInput.addEventListener('input', hideAuthError);
authPasswordInput.addEventListener('input', hideAuthError);
signupConfirmInput.addEventListener('input', hideAuthError);

/* --- Bascule visibilité mot de passe (icône œil) --- */
function setupEyeToggle(inputId, toggleId, iconId) {
  const input  = document.getElementById(inputId);
  const toggle = document.getElementById(toggleId);
  const icon   = document.getElementById(iconId);
  toggle.addEventListener('click', () => {
    const isVisible  = input.type === 'text';
    input.type       = isVisible ? 'password' : 'text';
    icon.className   = isVisible ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash';
  });
}
setupEyeToggle('auth-password',          'toggle-password',         'eye-icon-password');
setupEyeToggle('signup-password-confirm', 'toggle-password-confirm', 'eye-icon-confirm');

/* --- Connexion Google --- */
document.getElementById('google-signin-btn').addEventListener('click', async () => {
  hideAuthError();
  const btn = document.getElementById('google-signin-btn');
  btn.disabled = true;

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    /* Forcer le sélecteur de compte Google à chaque fois */
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await auth.signInWithPopup(provider);
    const user   = result.user;

    /* Créer le document Firestore si l'utilisateur est nouveau */
    const docRef  = db.collection('users').doc(user.uid);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      await docRef.set({
        email:              user.email,
        role:               'student',
        status:             'pending',
        maxSessionUnlocked: 0,
        completedSessions:  [],
        createdAt:          firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    /* onAuthStateChanged prend le relais */

  } catch (err) {
    /* Ignorer silencieusement si l'utilisateur ferme le popup */
    if (err.code !== 'auth/popup-closed-by-user' &&
        err.code !== 'auth/cancelled-popup-request') {
      showAuthError(translateFirebaseError(err.code));
    }
  } finally {
    /* Toujours ré-activer le bouton (sinon il reste disabled après déconnexion) */
    btn.disabled = false;
  }
});

/* --- Mot de passe oublié : afficher la vue de réinitialisation --- */
document.getElementById('forgot-password-btn').addEventListener('click', () => {
  document.getElementById('reset-email').value = authEmailInput.value;
  document.getElementById('reset-error').classList.add('hidden');
  document.getElementById('reset-success').classList.add('hidden');
  const sendBtn = document.getElementById('reset-send-btn');
  sendBtn.disabled = false;
  sendBtn.textContent = 'Envoyer le lien de réinitialisation';
  showAuthView('reset');
});

/* --- Retour vers la vue principale --- */
document.getElementById('reset-back-btn').addEventListener('click', () => {
  showAuthView('main');
});

/* ============================================================
   22. NAVIGATION AU CLAVIER — Flèches ← / →
   ============================================================ */

document.addEventListener('keydown', (e) => {
  /* Ignorer si focus sur un champ de saisie */
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  if (!currentSessionId) return;

  const unlocked = allSessionsFlat().filter(s => isSessionUnlocked(s.id));
  const idx      = unlocked.findIndex(s => s.id === currentSessionId);
  if (idx === -1) return;

  if (e.key === 'ArrowLeft'  && idx > 0)                    loadSession(unlocked[idx - 1].id);
  if (e.key === 'ArrowRight' && idx < unlocked.length - 1)  loadSession(unlocked[idx + 1].id);
});

/* ============================================================
   23. LANDING PAGE — Interactions & Scroll Reveal
   ============================================================ */

/* --- Fermer l'overlay (retour à la landing) --- */
document.getElementById('auth-close-btn').addEventListener('click', () => {
  hideAuthOverlay();
  /* Remettre la vue principale en mode connexion pour la prochaine ouverture */
  setAuthMode(false);
  showAuthView('main');
});

/* Ouvrir en mode Connexion (accès direct au formulaire) */
function openSignin() {
  setAuthMode(false);
  showAuthView('main');
  showAuthOverlay();
}
document.getElementById('landing-signin-btn').addEventListener('click', openSignin);

/* Ouvrir en mode Inscription → passe d'abord par l'onboarding */
function openSignup() {
  showAuthView('onboarding');
  showAuthOverlay();
}
document.getElementById('landing-signup-btn').addEventListener('click', openSignup);
document.getElementById('hero-signup-btn').addEventListener('click', openSignup);
document.getElementById('footer-signup-btn').addEventListener('click', openSignup);

/* --- Onboarding : "J'ai compris, je crée mon compte" → formulaire inscription --- */
document.getElementById('onboarding-continue-btn').addEventListener('click', () => {
  setAuthMode(true);
  showAuthView('main');
});

/* --- Onboarding : "Déjà un compte ? Se connecter" --- */
document.getElementById('onboarding-signin-btn').addEventListener('click', () => {
  setAuthMode(false);
  showAuthView('main');
});

/* --- Menu mobile landing page --- */
const lpHamburger = document.getElementById('lp-hamburger');
const lpNav       = document.getElementById('lp-nav');
if (lpHamburger && lpNav) {
  lpHamburger.addEventListener('click', () => {
    const isOpen = lpNav.classList.toggle('open');
    lpHamburger.setAttribute('aria-expanded', String(isOpen));
  });
  /* Fermer le menu si on clique sur un lien */
  lpNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      lpNav.classList.remove('open');
      lpHamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

/* --- Scroll : header shadow + IntersectionObserver reveal --- */
const lpHeader = document.getElementById('lp-header');
window.addEventListener('scroll', () => {
  if (lpHeader) lpHeader.classList.toggle('scrolled', window.scrollY > 30);
}, { passive: true });

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* --- Lecteur vidéo custom --- */
(function () {
  const player  = document.getElementById('lp-player');
  if (!player) return;

  const video   = document.getElementById('lp-video');
  const overlay = document.getElementById('lp-ply-overlay');
  const bigBtn  = document.getElementById('lp-ply-bigbtn');
  const ppBtn   = document.getElementById('lp-ply-pp');
  const timeEl  = document.getElementById('lp-ply-time');
  const seek    = document.getElementById('lp-ply-seek');
  const buf     = document.getElementById('lp-ply-seek-buf');
  const fill    = document.getElementById('lp-ply-seek-fill');
  const thumb   = document.getElementById('lp-ply-seek-thumb');
  const muteBtn = document.getElementById('lp-ply-mute');
  const volSldr = document.getElementById('lp-ply-vol');
  const fsBtn   = document.getElementById('lp-ply-fs');

  let hideTimer = null;
  let started   = false;
  let isSeeking = false;

  /* ── utilitaires ──────────────────────────────────── */
  function fmt(s) {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  }

  function syncPlayIcon(playing) {
    ppBtn.querySelector('.lp-icon-play').style.display  = playing ? 'none' : '';
    ppBtn.querySelector('.lp-icon-pause').style.display = playing ? ''     : 'none';
  }

  function syncMuteIcon() {
    const muted = video.muted || video.volume === 0;
    muteBtn.querySelector('.lp-icon-vol').style.display   = muted ? 'none' : '';
    muteBtn.querySelector('.lp-icon-muted').style.display = muted ? ''     : 'none';
  }

  function syncFsIcon() {
    const isFs = !!document.fullscreenElement;
    fsBtn.querySelector('.lp-icon-fs').style.display  = isFs ? 'none' : '';
    fsBtn.querySelector('.lp-icon-efs').style.display = isFs ? ''     : 'none';
  }

  function updateProgress() {
    const pct = video.duration ? video.currentTime / video.duration : 0;
    const trackW = seek.clientWidth - 24;
    fill.style.width  = `${pct * 100}%`;
    thumb.style.left  = `${12 + pct * trackW}px`;
    timeEl.textContent = `${fmt(video.currentTime)} / ${fmt(video.duration)}`;
  }

  function updateBuffer() {
    if (video.buffered.length) {
      buf.style.width = `${(video.buffered.end(video.buffered.length - 1) / video.duration) * 100}%`;
    }
  }

  function showCtrl() {
    player.classList.add('show-ctrl');
    clearTimeout(hideTimer);
    if (!video.paused) hideTimer = setTimeout(() => player.classList.remove('show-ctrl'), 2800);
  }

  function seekTo(clientX) {
    const rect = seek.getBoundingClientRect();
    const x    = Math.max(0, Math.min(clientX - rect.left, rect.width));
    video.currentTime = (x / rect.width) * (video.duration || 0);
    updateProgress();
  }

  /* ── play / pause ─────────────────────────────────── */
  bigBtn.addEventListener('click', () => { video.play(); started = true; });
  ppBtn.addEventListener('click',  (e) => { e.stopPropagation(); video.paused ? video.play() : video.pause(); });
  player.addEventListener('click', (e) => {
    if (!started || e.target === ppBtn || e.target === muteBtn || e.target === fsBtn) return;
    if (e.target === video || e.target === player) { video.paused ? video.play() : video.pause(); }
  });

  video.addEventListener('play', () => {
    syncPlayIcon(true);
    overlay.classList.add('lp-ply-hidden');
    showCtrl();
  });
  video.addEventListener('pause', () => {
    syncPlayIcon(false);
    clearTimeout(hideTimer);
    player.classList.add('show-ctrl');
    if (!video.ended) overlay.classList.remove('lp-ply-hidden');
  });
  video.addEventListener('ended', () => {
    syncPlayIcon(false);
    overlay.classList.remove('lp-ply-hidden');
    player.classList.add('show-ctrl');
  });

  /* ── progression ──────────────────────────────────── */
  video.addEventListener('timeupdate',     updateProgress);
  video.addEventListener('progress',       updateBuffer);
  video.addEventListener('durationchange', updateProgress);

  seek.addEventListener('mousedown', (e) => { isSeeking = true; seekTo(e.clientX); });
  document.addEventListener('mousemove', (e) => { if (isSeeking) seekTo(e.clientX); });
  document.addEventListener('mouseup',   () => { isSeeking = false; });
  seek.addEventListener('touchstart', (e) => seekTo(e.touches[0].clientX), { passive: true });
  seek.addEventListener('touchmove',  (e) => seekTo(e.touches[0].clientX), { passive: true });

  /* ── volume ───────────────────────────────────────── */
  volSldr.addEventListener('input', () => {
    video.volume = parseFloat(volSldr.value);
    video.muted  = video.volume === 0;
    syncMuteIcon();
  });
  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    video.muted = !video.muted;
    volSldr.value = video.muted ? '0' : String(video.volume || 0.7);
    syncMuteIcon();
  });

  /* ── plein écran ──────────────────────────────────── */
  fsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.fullscreenElement ? document.exitFullscreen() : player.requestFullscreen();
  });
  document.addEventListener('fullscreenchange', syncFsIcon);

  /* ── contrôles : affichage au survol ──────────────── */
  player.addEventListener('mousemove',  showCtrl);
  player.addEventListener('mouseleave', () => {
    if (!video.paused) { clearTimeout(hideTimer); hideTimer = setTimeout(() => player.classList.remove('show-ctrl'), 400); }
  });
})();

/* --- Envoi de l'email de réinitialisation --- */
document.getElementById('reset-send-btn').addEventListener('click', async () => {
  const email     = document.getElementById('reset-email').value.trim();
  const errorEl   = document.getElementById('reset-error');
  const successEl = document.getElementById('reset-success');
  const sendBtn   = document.getElementById('reset-send-btn');

  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');

  if (!email) {
    errorEl.textContent = 'Veuillez saisir votre adresse email.';
    errorEl.classList.remove('hidden');
    return;
  }

  sendBtn.disabled    = true;
  sendBtn.textContent = '…';

  try {
    await auth.sendPasswordResetEmail(email);
    successEl.textContent = '✅ Email envoyé ! Vérifiez votre boîte de réception (et vos spams).';
    successEl.classList.remove('hidden');
    sendBtn.textContent = 'Email envoyé ✓';
  } catch (err) {
    errorEl.textContent = translateFirebaseError(err.code);
    errorEl.classList.remove('hidden');
    sendBtn.disabled    = false;
    sendBtn.textContent = 'Envoyer le lien de réinitialisation';
  }
});

/* --- Lecteur tutoriel plateforme (dashboard) --- */
(function () {
  const player  = document.getElementById('dash-tuto-player');
  if (!player) return;
  const video   = document.getElementById('dash-tuto-video');
  const overlay = document.getElementById('dash-tuto-overlay');
  const bigBtn  = document.getElementById('dash-tuto-bigbtn');

  function play() {
    video.play();
    overlay.classList.add('lp-ply-hidden');
  }
  function togglePause() {
    if (video.paused) { video.play(); } else { video.pause(); }
  }

  bigBtn.addEventListener('click', play);
  video.addEventListener('click', togglePause);
  video.addEventListener('ended', () => overlay.classList.remove('lp-ply-hidden'));
})();
