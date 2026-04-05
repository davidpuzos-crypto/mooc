// ============================================================
// App.js — Logique de l'application de recrutement soft skills
// ============================================================

// ---------- Referentiel des 14 savoir-etre ----------
const REFERENTIEL = [
    {
        id: "travail_equipe",
        nom: "Travail en equipe",
        description: "Capacite a se coordonner avec les autres en confiance et transparence pour realiser les objectifs.",
        icone: "🤝"
    },
    {
        id: "adaptation",
        nom: "Capacite d'adaptation",
        description: "S'ajuster a des situations variees, des collectifs ou des habitudes propres a l'entreprise.",
        icone: "🔄"
    },
    {
        id: "reactivite",
        nom: "Reactivite",
        description: "Reagir rapidement aux imprevus en hierarchisant l'urgence.",
        icone: "⚡"
    },
    {
        id: "rigueur",
        nom: "Rigueur",
        description: "Realiser des taches avec exactitude selon les regles fournies.",
        icone: "📏"
    },
    {
        id: "gestion_stress",
        nom: "Gestion du stress",
        description: "Garder le controle face a des situations irritantes ou imprevues.",
        icone: "🧘"
    },
    {
        id: "communication",
        nom: "Communication orale",
        description: "S'exprimer clairement et adapter son discours a son interlocuteur.",
        icone: "🗣️"
    },
    {
        id: "ecoute",
        nom: "Ecoute active",
        description: "Etre attentif aux messages verbaux et non-verbaux de son interlocuteur.",
        icone: "👂"
    },
    {
        id: "leadership",
        nom: "Leadership",
        description: "Federer et motiver un groupe autour d'un objectif commun.",
        icone: "🌟"
    },
    {
        id: "creativite",
        nom: "Creativite",
        description: "Proposer des solutions originales ou innovantes face a un probleme.",
        icone: "💡"
    },
    {
        id: "prise_decision",
        nom: "Prise de decision",
        description: "Faire des choix pertinents dans un temps limite en pesant les consequences.",
        icone: "🎯"
    },
    {
        id: "autonomie",
        nom: "Autonomie",
        description: "Realiser des taches sans supervision constante tout en sachant demander de l'aide.",
        icone: "🚀"
    },
    {
        id: "sens_organisation",
        nom: "Sens de l'organisation",
        description: "Structurer son travail, prioriser et respecter les delais.",
        icone: "📋"
    },
    {
        id: "empathie",
        nom: "Empathie",
        description: "Comprendre les emotions et les points de vue des autres.",
        icone: "❤️"
    },
    {
        id: "esprit_critique",
        nom: "Esprit critique",
        description: "Analyser une situation de maniere objective et remettre en question les evidences.",
        icone: "🔍"
    }
];

// ---------- Etat de l'application ----------
let scores = {};
let candidatActuel = null;

// Initialiser les scores a 0
function initScores() {
    scores = {};
    REFERENTIEL.forEach(c => { scores[c.id] = 0; });
}
initScores();

// ---------- Elements du DOM ----------
const formCandidat = document.getElementById("form-candidat");
const msgInscription = document.getElementById("msg-inscription");
const sectionObservation = document.getElementById("section-observation");
const candidatActif = document.getElementById("candidat-actif");
const grilleCompetences = document.getElementById("grille-competences");
const btnEnregistrer = document.getElementById("btn-enregistrer");
const btnReinitialiser = document.getElementById("btn-reinitialiser");
const msgObservation = document.getElementById("msg-observation");
const sectionRecap = document.getElementById("section-recap");
const recapContenu = document.getElementById("recap-contenu");

// ---------- Generation de la grille de competences ----------
function genererGrille() {
    grilleCompetences.innerHTML = "";
    REFERENTIEL.forEach(comp => {
        const card = document.createElement("div");
        card.className = "relative bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col items-center text-center hover:shadow-md transition";

        card.innerHTML = `
            <span class="text-2xl mb-1">${comp.icone}</span>
            <h3 class="font-semibold text-gray-800 text-sm leading-tight mb-1">${comp.nom}</h3>
            <p class="text-xs text-gray-400 mb-3 leading-snug">${comp.description}</p>
            <div class="flex items-center gap-2">
                <button class="skill-btn w-9 h-9 rounded-full bg-red-100 hover:bg-red-200 text-red-600 font-bold text-lg flex items-center justify-center"
                        data-competence="${comp.id}" data-action="minus" title="Retirer un point">−</button>
                <span id="score-${comp.id}" class="badge-count bg-indigo-600 text-white rounded-full h-7 flex items-center justify-center text-sm font-bold px-2">0</span>
                <button class="skill-btn w-9 h-9 rounded-full bg-green-100 hover:bg-green-200 text-green-700 font-bold text-lg flex items-center justify-center"
                        data-competence="${comp.id}" data-action="plus" title="Ajouter un point">+</button>
            </div>
        `;

        grilleCompetences.appendChild(card);
    });

    // Attacher les evenements sur les boutons +/-
    grilleCompetences.querySelectorAll(".skill-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = e.currentTarget.dataset.competence;
            const action = e.currentTarget.dataset.action;

            if (action === "plus") {
                scores[id]++;
            } else if (action === "minus" && scores[id] > 0) {
                scores[id]--;
            }

            // Mettre a jour l'affichage
            const badge = document.getElementById(`score-${id}`);
            badge.textContent = scores[id];

            // Animation
            badge.classList.add("bump");
            setTimeout(() => badge.classList.remove("bump"), 150);
        });
    });
}
genererGrille();

// ---------- Soumission du formulaire candidat ----------
formCandidat.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nom = document.getElementById("nom").value.trim();
    const prenom = document.getElementById("prenom").value.trim();
    const email = document.getElementById("email").value.trim();
    const lien16p = document.getElementById("lien-16p").value.trim();

    if (!nom || !prenom || !email) {
        afficherMessage(msgInscription, "Veuillez remplir tous les champs obligatoires.", "error");
        return;
    }

    try {
        // Envoyer vers Firestore — collection 'candidats'
        const docRef = await db.collection("candidats").add({
            nom: nom,
            prenom: prenom,
            email: email,
            lien16Personalities: lien16p || null,
            dateInscription: firebase.firestore.FieldValue.serverTimestamp()
        });

        candidatActuel = {
            id: docRef.id,
            nom: nom,
            prenom: prenom,
            email: email,
            lien16p: lien16p
        };

        afficherMessage(msgInscription, "Candidat inscrit avec succes ! (ID: " + docRef.id + ")", "success");

        // Afficher la section observation
        sectionObservation.classList.remove("hidden");
        candidatActif.textContent = "Candidat : " + prenom + " " + nom + " — " + email;

        // Reinitialiser les scores pour le nouveau candidat
        initScores();
        mettreAJourAffichageScores();

        // Scroll vers la section observation
        sectionObservation.scrollIntoView({ behavior: "smooth", block: "start" });

    } catch (error) {
        console.error("Erreur lors de l'inscription :", error);
        afficherMessage(msgInscription, "Erreur lors de l'inscription. Verifiez la console.", "error");
    }
});

// ---------- Enregistrer l'observation ----------
btnEnregistrer.addEventListener("click", async () => {
    if (!candidatActuel) {
        afficherMessage(msgObservation, "Aucun candidat selectionne.", "error");
        return;
    }

    try {
        // Ajouter les scores dans une sous-collection 'observations'
        await db.collection("candidats").doc(candidatActuel.id).collection("observations").add({
            scores: { ...scores },
            dateObservation: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Mettre a jour aussi le document principal avec les derniers scores
        await db.collection("candidats").doc(candidatActuel.id).update({
            derniersScores: { ...scores },
            derniereObservation: firebase.firestore.FieldValue.serverTimestamp()
        });

        afficherMessage(msgObservation, "Observation enregistree avec succes !", "success");

        // Afficher le recapitulatif
        afficherRecap();

    } catch (error) {
        console.error("Erreur lors de l'enregistrement :", error);
        afficherMessage(msgObservation, "Erreur lors de l'enregistrement. Verifiez la console.", "error");
    }
});

// ---------- Reinitialiser les scores ----------
btnReinitialiser.addEventListener("click", () => {
    initScores();
    mettreAJourAffichageScores();
    afficherMessage(msgObservation, "Scores reinitialises.", "info");
});

// ---------- Fonctions utilitaires ----------

function mettreAJourAffichageScores() {
    REFERENTIEL.forEach(comp => {
        const badge = document.getElementById("score-" + comp.id);
        if (badge) badge.textContent = scores[comp.id];
    });
}

function afficherMessage(element, texte, type) {
    element.classList.remove("hidden");
    const couleurs = {
        success: "bg-green-50 text-green-700 border-green-200",
        error: "bg-red-50 text-red-700 border-red-200",
        info: "bg-blue-50 text-blue-700 border-blue-200"
    };
    element.className = "mt-4 p-3 rounded-lg border text-sm " + (couleurs[type] || couleurs.info);
    element.textContent = texte;

    // Masquer apres 5 secondes
    setTimeout(() => {
        element.classList.add("hidden");
    }, 5000);
}

function afficherRecap() {
    sectionRecap.classList.remove("hidden");
    recapContenu.innerHTML = "";

    const titre = document.createElement("p");
    titre.className = "font-semibold text-gray-800 mb-2";
    titre.textContent = candidatActuel.prenom + " " + candidatActuel.nom;
    recapContenu.appendChild(titre);

    // Trier par score decroissant
    const scoresTriees = REFERENTIEL
        .map(c => ({ ...c, score: scores[c.id] }))
        .sort((a, b) => b.score - a.score);

    scoresTriees.forEach(comp => {
        const ligne = document.createElement("div");
        ligne.className = "flex items-center justify-between py-1.5 border-b border-gray-100";
        const maxScore = Math.max(...Object.values(scores), 1);
        const pourcentage = Math.round((comp.score / maxScore) * 100);
        ligne.innerHTML = `
            <span class="flex items-center gap-2">
                <span>${comp.icone}</span>
                <span class="text-gray-700">${comp.nom}</span>
            </span>
            <span class="flex items-center gap-2">
                <div class="w-24 bg-gray-200 rounded-full h-2">
                    <div class="bg-indigo-500 h-2 rounded-full" style="width: ${pourcentage}%"></div>
                </div>
                <span class="font-bold text-indigo-600 w-6 text-right">${comp.score}</span>
            </span>
        `;
        recapContenu.appendChild(ligne);
    });

    sectionRecap.scrollIntoView({ behavior: "smooth", block: "start" });
}
