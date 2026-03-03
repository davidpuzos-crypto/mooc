/**
 * ============================================================
 *  TISSELIA — Structure des données de la formation
 *  Fichier UNIQUE à modifier pour mettre à jour le contenu.
 *
 *  Structure :
 *  courseData = {
 *    title   : Titre de la formation,
 *    modules : [ ...modules ]
 *  }
 *
 *  Chaque module = {
 *    id      : identifiant unique (string),
 *    title   : Titre du module,
 *    sessions: [ ...sessions ]
 *  }
 *
 *  Chaque session = {
 *    id       : identifiant unique (string),
 *    title    : Titre de la séance,
 *    video    : URL YouTube embed (ou null),
 *    intro    : Texte d'introduction (HTML ou texte brut, ou null),
 *    resources: [ { label, url, icon } ] ou [],
 *    quiz     : [ ...questions ] ou []
 *  }
 *
 *  Chaque question de quiz = {
 *    id      : identifiant unique,
 *    question: Énoncé,
 *    options : [ { id, text } ],
 *    answer  : id de la bonne réponse
 *  }
 * ============================================================
 */

const courseData = {
  title: "Intelligence Artificielle & Cybersécurité",

  modules: [

    /* ============================================================
       MODULE 1 : Découvrir, s'initier et être créatif avec l'IA
    ============================================================ */
    {
      id: "m1",
      title: "Découvrir, s'initier et être créatif avec l'IA",
      sessions: [

        /* ------ Séance 1 (données de test complètes) ------ */
        {
          id: "m1s1",
          title: "Séance 1 — Introduction à l'Intelligence Artificielle",
          video: "https://www.youtube.com/embed/aircAruvnKk",
          intro: `
            <p>Bienvenue dans cette première séance ! Nous allons explorer ensemble les fondements
            de l'Intelligence Artificielle : ce qu'elle est, d'où elle vient, et comment elle
            transforme notre quotidien.</p>
            <p>Au programme : définitions clés, grandes dates historiques, et un premier tour
            d'horizon des outils IA que vous utiliserez tout au long de cette formation.</p>
            <p><strong>Objectifs de la séance :</strong></p>
            <ul style="margin: 12px 0 0 20px; line-height: 2;">
              <li>Comprendre ce qu'est l'IA et ses grands paradigmes</li>
              <li>Distinguer IA générative, Machine Learning et Deep Learning</li>
              <li>Identifier les principaux outils IA disponibles en 2024</li>
            </ul>
          `,
          resources: [
            {
              label: "Présentation PDF — Introduction à l'IA",
              url: "#",
              icon: "📄"
            },
            {
              label: "Fiche récap — Les outils IA essentiels",
              url: "#",
              icon: "📋"
            }
          ],
          quiz: [
            {
              id: "m1s1q1",
              question: "Parmi les propositions suivantes, laquelle définit le mieux l'Intelligence Artificielle Générative ?",
              options: [
                { id: "a", text: "Un système qui détecte des anomalies dans des données." },
                { id: "b", text: "Un système capable de créer du contenu original (texte, images, sons) à partir d'exemples." },
                { id: "c", text: "Un programme qui exécute des tâches répétitives de façon automatisée." },
                { id: "d", text: "Un algorithme qui trie et classe des données existantes." }
              ],
              answer: "b"
            },
            {
              id: "m1s1q2",
              question: "Quel modèle de langage de grande taille (LLM) a été rendu public par OpenAI et a popularisé les chatbots conversationnels à partir de 2022 ?",
              options: [
                { id: "a", text: "DALL·E" },
                { id: "b", text: "Midjourney" },
                { id: "c", text: "ChatGPT (basé sur GPT)" },
                { id: "d", text: "Stable Diffusion" }
              ],
              answer: "c"
            }
          ]
        },

        /* ------ Séance 2 (vide pour l'instant) ------ */
        {
          id: "m1s2",
          title: "Séance 2 — Les grands outils IA du moment",
          video: null,
          intro: null,
          resources: [],
          quiz: []
        },

        /* ------ Séance 3 ------ */
        {
          id: "m1s3",
          title: "Séance 3 — Créer du contenu textuel avec l'IA",
          video: null,
          intro: null,
          resources: [],
          quiz: []
        },

        /* ------ Séance 4 ------ */
        {
          id: "m1s4",
          title: "Séance 4 — Prompt Engineering : parler à l'IA efficacement",
          video: null,
          intro: null,
          resources: [],
          quiz: []
        }
      ]
    },

    /* ============================================================
       MODULE 2 : Générer et éditer des contenus visuels et vidéo
    ============================================================ */
    {
      id: "m2",
      title: "Générer et éditer des contenus visuels et vidéo avec l'IA",
      sessions: [

        {
          id: "m2s5",
          title: "Séance 5 — Génération d'images avec l'IA (Midjourney, DALL·E)",
          video: null,
          intro: null,
          resources: [],
          quiz: []
        },
        {
          id: "m2s6",
          title: "Séance 6 — Retouche et édition d'images par l'IA",
          video: null,
          intro: null,
          resources: [],
          quiz: []
        },
        {
          id: "m2s7",
          title: "Séance 7 — Génération et montage vidéo assisté par IA",
          video: null,
          intro: null,
          resources: [],
          quiz: []
        },
        {
          id: "m2s8",
          title: "Séance 8 — Créer des avatars et présentateurs virtuels",
          video: null,
          intro: null,
          resources: [],
          quiz: []
        }
      ]
    },

    /* ============================================================
       MODULE 3 : Rédiger et traduire avec l'IA
    ============================================================ */
    {
      id: "m3",
      title: "Rédiger et traduire avec l'IA",
      sessions: [
        {
          id: "m3s9",
          title: "Séance 9 — Rédiger des contenus professionnels avec l'IA",
          video: null,
          intro: null,
          resources: [],
          quiz: []
        },
        {
          id: "m3s10",
          title: "Séance 10 — Traduction et adaptation culturelle via l'IA",
          video: null,
          intro: null,
          resources: [],
          quiz: []
        }
      ]
    },

    /* ============================================================
       MODULE 4 : Concrétiser et présenter son projet
    ============================================================ */
    {
      id: "m4",
      title: "Concrétiser et présenter son projet",
      sessions: [
        {
          id: "m4s11",
          title: "Séance 11 — Construire son projet IA de A à Z",
          video: null,
          intro: null,
          resources: [],
          quiz: []
        },
        {
          id: "m4s12",
          title: "Séance 12 — Présenter et valoriser son projet",
          video: null,
          intro: null,
          resources: [],
          quiz: []
        }
      ]
    }

  ] // fin modules
}; // fin courseData
