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

/* ============================================================
   4. AUTH UI — Helpers d'interface
   ============================================================ */

let isSignupMode = false;

function showAuthOverlay() { authOverlay.classList.remove('hidden'); }
function hideAuthOverlay() { authOverlay.classList.add('hidden'); }

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
    hidePlatform();
    showAuthOverlay();
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
  /* (Ré)attacher le CTA de la homepage */
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.onclick = () => {
      const id = getResumeSessionId();
      if (id) loadSession(id);
    };
  }
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
 */
function isSessionUnlocked(sessionId) {
  if (!userDoc || userDoc.status !== 'approved') return false;

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

function loadSession(sessionId) {
  const found = findSession(sessionId);
  if (!found) return;

  hideAdminPanel(); /* ferme le panel admin si actif */

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
    </div>

    <!-- Onglets de navigation -->
    <div class="lesson-tabs" role="tablist">
      <button class="lesson-tab active" data-tab="cours"
        role="tab" aria-selected="true">📖 Le Cours</button>
      <button class="lesson-tab" data-tab="evaluation"
        role="tab" aria-selected="false">✍️ L'Évaluation</button>
    </div>

    <!-- ── Onglet Cours ── -->
    <div class="tab-panel" id="tab-cours" role="tabpanel">
  `;

  /* Vidéo YouTube */
  if (session.video) {
    html += `
      <div class="video-wrapper">
        <iframe src="${session.video}" title="${session.title}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen></iframe>
      </div>`;
  } else {
    html += `<div class="video-placeholder">🎬 La vidéo de cette séance sera disponible prochainement.</div>`;
  }

  /* Texte d'introduction */
  if (session.intro) html += `<div class="lesson-intro">${session.intro}</div>`;

  /* Ressources téléchargeables */
  if (session.resources?.length) {
    html += `<div class="resources-section"><p class="section-title">📎 Ressources</p>`;
    session.resources.forEach(res => {
      html += `<a href="${res.url}" class="resource-link" target="_blank" rel="noopener noreferrer">
        <span class="link-icon">${res.icon || '📄'}</span>${res.label}</a>`;
    });
    html += `</div>`;
  }

  /* Notes personnelles */
  html += `
    <div class="session-notes">
      <label class="notes-label" for="session-notes-input">🗒️ Mes notes (sauvegardées localement)</label>
      <textarea id="session-notes-input" class="notes-textarea"
        placeholder="Écrivez vos notes, idées ou questions ici…"></textarea>
    </div>`;

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
    html += buildQcmHTML(ev.questions);
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
      <button id="next-btn"
        class="next-btn${isCompleted && next ? ' visible' : ''}"
        ${next ? '' : 'style="display:none"'}>
        Séance suivante : ${next?.title || ''} →
      </button>
    </div>
  </div><!-- /tab-evaluation -->`;

  return html;
}

/** HTML pour une évaluation de type QCM. */
function buildQcmHTML(questions) {
  let html = `
    <div class="quiz-section" id="quiz-section">
      <h2 class="quiz-title">🧠 Quiz de la séance</h2>`;

  questions.forEach((q, idx) => {
    html += `
      <div class="quiz-question-block" data-question-id="${q.id}">
        <p class="quiz-question-text">${idx + 1}. ${q.question}</p>
        <div class="quiz-options" role="radiogroup">`;
    q.options.forEach(opt => {
      html += `<label class="quiz-option" data-option-id="${opt.id}">
        <input type="radio" name="q_${q.id}" value="${opt.id}" />
        ${opt.text}</label>`;
    });
    html += `</div><div class="quiz-feedback" id="feedback_${q.id}"></div></div>`;
  });

  html += `
      <button class="quiz-validate-btn" id="quiz-validate-btn" disabled>
        Valider mes réponses
      </button>
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
  const nextBtn     = document.getElementById('next-btn');
  const next        = nextSession(session.id);

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
    });
  });

  /* ── Logique d'évaluation (uniquement si la séance n'est pas déjà terminée) ── */
  if (!isCompleted) {
    if (ev?.type === 'qcm') {
      /* QCM : active le bouton "Terminée" après validation du quiz */
      initQuizEvents(ev.questions, () => { completeBtn.disabled = false; });
    } else if (ev?.type === 'email') {
      /* Email : active le bouton "Terminée" quand la case est cochée */
      const checkbox = document.getElementById('confirm-checkbox');
      if (checkbox) {
        checkbox.addEventListener('change', () => {
          completeBtn.disabled = !checkbox.checked;
        });
      }
    }
    /* Si evaluation === null : pas de verrou, bouton déjà actif depuis le HTML */
  }

  /* ── Bouton "Marquer comme terminée" ── */
  if (completeBtn && !isCompleted) {
    completeBtn.addEventListener('click', () =>
      markSessionComplete(session.id, completeBtn, nextBtn));
  }

  /* ── Bouton "Séance suivante" ── */
  if (nextBtn && next) {
    nextBtn.addEventListener('click', () => loadSession(next.id));
  }

  /* ── Notes personnelles — chargement + auto-sauvegarde (localStorage) ── */
  const notesInput = document.getElementById('session-notes-input');
  if (notesInput) {
    const storageKey = `tisselia_note_${session.id}`;
    notesInput.value = localStorage.getItem(storageKey) || '';
    let saveTimer;
    notesInput.addEventListener('input', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        localStorage.setItem(storageKey, notesInput.value);
      }, 800);
    });
  }
}

/**
 * Initialise les interactions du quiz QCM.
 * @param {Array}    questions  - tableau de questions
 * @param {Function} onValidated - callback appelé après validation (active le bouton Terminée)
 */
function initQuizEvents(questions, onValidated) {
  const validateBtn = document.getElementById('quiz-validate-btn');
  if (!validateBtn) return;

  function checkAllAnswered() {
    validateBtn.disabled = !questions.every(q =>
      document.querySelector(`input[name="q_${q.id}"]:checked`));
  }

  questions.forEach(q => {
    document.querySelectorAll(`input[name="q_${q.id}"]`).forEach(radio => {
      radio.addEventListener('change', () => {
        document.querySelectorAll(`input[name="q_${q.id}"]`).forEach(r =>
          r.closest('.quiz-option').classList.remove('selected'));
        radio.closest('.quiz-option').classList.add('selected');
        checkAllAnswered();
      });
    });
  });

  validateBtn.addEventListener('click', () =>
    validateQuiz(questions, validateBtn, onValidated));
}

function validateQuiz(questions, validateBtn, onValidated) {
  questions.forEach(q => {
    const selected = document.querySelector(`input[name="q_${q.id}"]:checked`);
    const feedback = document.getElementById(`feedback_${q.id}`);
    const block    = document.querySelector(`.quiz-question-block[data-question-id="${q.id}"]`);

    block.querySelectorAll('.quiz-option').forEach(opt => opt.classList.remove('correct', 'wrong'));

    if (!selected) return;

    const isCorrect = selected.value === q.answer;
    block.querySelector(`input[value="${q.answer}"]`)?.closest('.quiz-option')?.classList.add('correct');

    if (!isCorrect) {
      selected.closest('.quiz-option').classList.add('wrong');
      feedback.textContent = "❌ Ce n'est pas la bonne réponse. La réponse correcte est surlignée en vert.";
      feedback.className = 'quiz-feedback wrong';
    } else {
      feedback.textContent = '✅ Bravo, c\'est la bonne réponse !';
      feedback.className = 'quiz-feedback correct';
    }

    block.querySelectorAll('input[type="radio"]').forEach(r => r.disabled = true);
  });

  validateBtn.disabled = true;
  validateBtn.textContent = 'Réponses validées ✓';
  if (onValidated) onValidated();
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

async function markSessionComplete(sessionId, completeBtn, nextBtn) {
  /* Optimistic update — feedback immédiat sans attendre Firestore */
  completedSessions.add(sessionId);
  completeBtn.disabled = true;
  completeBtn.textContent = '✅ Séance terminée !';
  launchConfetti();
  showToast('🎉 Séance validée — bravo !');
  updateCertificate();

  const next = nextSession(sessionId);
  if (next && nextBtn) nextBtn.classList.add('visible');

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
    if (nextBtn) nextBtn.classList.remove('visible');
    showToast('❌ Erreur de sauvegarde — réessayez.', 'error');
    updateCertificate();
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
  mainHeaderTitle.textContent = 'Intelligence Artificielle & Cybersécurité';
  refreshNavState();
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
        </tr>
      </thead>
      <tbody>`;

  students.forEach(user => {
    const done        = (user.completedSessions || []).length;
    const isApproved  = user.status === 'approved';
    const maxUnlocked = user.maxSessionUnlocked || 0;
    const pct         = total > 0 ? Math.round((done / total) * 100) : 0;

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
    const result   = await auth.signInWithPopup(provider);
    const user     = result.user;

    /* Créer le document Firestore si l'utilisateur est nouveau */
    const docRef  = db.collection('users').doc(user.uid);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      await docRef.set({
        email:              user.email,
        role:               'student',
        status:             'pending',
        maxSessionUnlocked: 1,
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
    btn.disabled = false;
  }
});

/* --- Mot de passe oublié : afficher la vue de réinitialisation --- */
document.getElementById('forgot-password-btn').addEventListener('click', () => {
  /* Pré-remplir l'email si déjà saisi */
  document.getElementById('reset-email').value = authEmailInput.value;
  document.getElementById('reset-error').classList.add('hidden');
  document.getElementById('reset-success').classList.add('hidden');
  const sendBtn = document.getElementById('reset-send-btn');
  sendBtn.disabled = false;
  sendBtn.textContent = 'Envoyer le lien de réinitialisation';

  authMainView.classList.add('hidden');
  authResetView.classList.remove('hidden');
});

/* --- Retour vers la vue principale --- */
document.getElementById('reset-back-btn').addEventListener('click', () => {
  authResetView.classList.add('hidden');
  authMainView.classList.remove('hidden');
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
