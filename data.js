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
 *    id         : identifiant unique (string),
 *    title      : Titre de la séance,
 *    video      : URL YouTube embed (ou null),
 *    intro      : Texte d'introduction (HTML, ou null),
 *    resources  : [ { label, url, icon } ] ou [],
 *    evaluation : { type: "qcm"|"email", questions?: [...] } ou null
 *  }
 *
 *  evaluation.type = "qcm"   → quiz à choix multiples (questions obligatoires)
 *  evaluation.type = "email" → l'élève envoie sa production par e-mail
 *  evaluation = null         → pas encore d'évaluation pour cette séance
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

        /* ------ Séance 1 — Démystifier l'IA (4 QCM) ------ */
        {
          id: "m1s1",
          title: "Séance 1 — Démystifier l'Intelligence Artificielle",
          video: "https://www.youtube.com/embed/aSlyjXijNoA",
          videoDesc: `Cette vidéo lève le voile sur le fonctionnement réel de ChatGPT et des grands
            modèles de langage — en introduisant le concept de « perroquet stochastique »
            et le phénomène d'hallucination.`,
          description: `
            <div class="desc-hero">
              <div class="desc-hero-text">
                <p>ChatGPT impressionne, mais savez-vous vraiment ce qui se passe sous le capot ?
                Dans cette séance, nous allons lever le voile sur le fonctionnement réel des outils
                d'IA générative et démonter quelques idées reçues très répandues.</p>
                <p>Un concept clé à retenir : le <strong>« perroquet stochastique »</strong>. Cette
                métaphore, proposée par des chercheuses en linguistique, décrit les grands modèles de
                langage comme des systèmes qui assemblent des mots de façon statistiquement cohérente —
                sans pour autant <em>comprendre</em> quoi que ce soit. ChatGPT ne raisonne pas : il
                prédit le mot suivant le plus probable, encore et encore.</p>
                <p>Comprendre cela change tout : vous saurez pourquoi l'IA peut se tromper avec
                assurance (ce qu'on appelle les <strong>« hallucinations »</strong>), et pourquoi
                certains termes comme « intelligence » ou « comprend » sont trompeurs.</p>
              </div>
              <img src="https://tisselia.com/wp-content/uploads/2026/03/Seance-1.png"
                alt="Illustration — Démystifier l'Intelligence Artificielle"
                class="desc-hero-img" />
            </div>
            <div class="session-objectives">
              <p class="objectives-title">Objectifs de la séance</p>
              <ul>
                <li>Comprendre le mécanisme de prédiction de mots des LLM</li>
                <li>Définir le concept de « perroquet stochastique »</li>
                <li>Identifier et expliquer le phénomène d'hallucination</li>
                <li>Adopter un vocabulaire précis et non anthropomorphique</li>
              </ul>
            </div>
          `,
          resources: [
            {
              label: "Support de présentation — Démystifier l'IA",
              url: "https://tisselia.com/wp-content/uploads/2026/03/Comprendre-lIntelligence-Artificielle.pdf",
              icon: "📄",
              recap: true
            }
          ],
          evaluation: {
            type: "qcm",
            questions: [
              {
                id: "m1s1q1",
                question: "Comment ChatGPT génère-t-il une réponse, fondamentalement ?",
                options: [
                  { id: "a", text: "Il recherche la réponse dans une base de données encyclopédique." },
                  { id: "b", text: "Il prédit, mot après mot, le token le plus probable en fonction du contexte." },
                  { id: "c", text: "Il formule un raisonnement logique pas à pas, comme un humain." },
                  { id: "d", text: "Il consulte internet en temps réel pour construire sa réponse." }
                ],
                answer: "b"
              },
              {
                id: "m1s1q2",
                question: "Que désigne l'expression « perroquet stochastique » appliquée aux grands modèles de langage (LLM) ?",
                options: [
                  { id: "a", text: "Un modèle qui copie mot pour mot des textes existants sans les modifier." },
                  { id: "b", text: "Un système qui génère du texte de façon aléatoire, sans aucune cohérence." },
                  { id: "c", text: "Un modèle qui assemble des séquences de mots statistiquement plausibles sans réellement comprendre le sens." },
                  { id: "d", text: "Un algorithme qui imite la voix humaine pour la synthèse vocale." }
                ],
                answer: "c"
              },
              {
                id: "m1s1q3",
                question: "Dans le contexte de l'IA générative, qu'appelle-t-on une « hallucination » ?",
                options: [
                  { id: "a", text: "Une réponse délibérément mensongère générée par le modèle pour tromper l'utilisateur." },
                  { id: "b", text: "Une erreur visuelle produite par les outils de génération d'images." },
                  { id: "c", text: "Une affirmation fausse ou inventée présentée avec assurance par le modèle." },
                  { id: "d", text: "Un biais dans les données d'entraînement qui fausse les statistiques." }
                ],
                answer: "c"
              },
              {
                id: "m1s1q4",
                question: "Pourquoi les chercheurs déconseillent-ils d'utiliser des termes comme « comprend », « pense » ou « sait » pour décrire un LLM ?",
                options: [
                  { id: "a", text: "Ces termes sont protégés juridiquement et ne peuvent pas être utilisés librement." },
                  { id: "b", text: "Ils anthropomorphisent le modèle et créent une confusion sur ses capacités réelles, qui sont purement statistiques." },
                  { id: "c", text: "Ils sont techniquement inexacts car les LLM fonctionnent uniquement sur des images, pas du texte." },
                  { id: "d", text: "L'usage de ce vocabulaire est interdit par les conditions d'utilisation d'OpenAI." }
                ],
                answer: "b"
              }
            ]
          }
        },

        /* ------ Séance 2 — Histoire de l'IA (1 QCM) ------ */
        {
          id: "m1s2",
          title: "Séance 2 — Histoire de l'IA : d'où ça vient ?",
          video: "https://www.youtube.com/embed/9W8H2tGLJng",
          videoDesc: `Un voyage de 75 ans à travers l'histoire de l'IA : des pionniers des années 1950
            aux révolutions du deep learning, en passant par les deux « hivers de l'IA ».`,
          description: `
            <p>L'Intelligence Artificielle n'est pas une invention du XXI<sup>e</sup> siècle. Ses
            racines plongent dans les années 1950, avec des pionniers qui rêvaient déjà de machines
            capables de « penser ».</p>
            <p>En parcourant <strong>75 ans d'histoire</strong>, vous découvrirez les grandes
            ruptures technologiques, les périodes de désillusion (les fameux « hivers de l'IA »),
            et les avancées fulminantes qui ont abouti aux outils que vous utilisez aujourd'hui.
            Comprendre cette trajectoire vous donnera une vision plus lucide des promesses et des
            limites actuelles de l'IA.</p>
            <div class="session-objectives">
              <p class="objectives-title">Objectifs de la séance</p>
              <ul>
                <li>Situer les grandes étapes historiques de l'IA</li>
                <li>Identifier les figures fondatrices et leurs contributions</li>
                <li>Comprendre les cycles d'euphorie et de désenchantement</li>
              </ul>
            </div>
          `,
          resources: [
            {
              label: "Support de présentation — L'histoire de l'Intelligence Artificielle",
              url: "https://tisselia.com/wp-content/uploads/2026/03/Lhistoire-de-lIntelligence-Artificielle.pdf",
              icon: "📄",
              recap: true
            },
            {
              label: "Frise chronologique — 75 ans d'histoire de l'IA",
              url: "#",
              icon: "📅"
            }
          ],
          evaluation: {
            type: "qcm",
            questions: [
              {
                id: "m1s2q1",
                question: "À qui attribue-t-on la création du terme « Intelligence Artificielle », et lors de quelle conférence fondatrice ?",
                options: [
                  { id: "a", text: "Alan Turing, lors de la conférence de Cambridge en 1950." },
                  { id: "b", text: "John McCarthy, lors de la conférence de Dartmouth en 1956." },
                  { id: "c", text: "Marvin Minsky, lors du symposium du MIT en 1959." },
                  { id: "d", text: "Norbert Wiener, lors du congrès de cybernétique à New York en 1948." }
                ],
                answer: "b"
              }
            ]
          }
        },

        /* ------ Séance 3 ------ */
        {
          id: "m1s3",
          title: "Séance 3 — Comprendre le fonctionnement de l'Intelligence Artificielle",
          video: null,
          intro: null,
          resources: [],
          evaluation: null
        },

        /* ------ Séance 4 ------ */
        {
          id: "m1s4",
          title: "Séance 4 — Panorama des grands outils IA",
          video: null,
          intro: null,
          resources: [],
          evaluation: null
        },

        /* ------ Séance 5 ------ */
        {
          id: "m1s5",
          title: "Séance 5 — Prompt Engineering : parler à l'IA efficacement",
          video: null,
          intro: null,
          resources: [],
          evaluation: null
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
          evaluation: null
        },
        {
          id: "m2s6",
          title: "Séance 6 — Retouche et édition d'images par l'IA",
          video: null,
          intro: null,
          resources: [],
          evaluation: null
        },
        {
          id: "m2s7",
          title: "Séance 7 — Génération et montage vidéo assisté par IA",
          video: null,
          intro: null,
          resources: [],
          evaluation: null
        },
        {
          id: "m2s8",
          title: "Séance 8 — Créer des avatars et présentateurs virtuels",
          video: null,
          intro: null,
          resources: [],
          evaluation: null
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
          evaluation: null
        },
        {
          id: "m3s10",
          title: "Séance 10 — Traduction et adaptation culturelle via l'IA",
          video: null,
          intro: null,
          resources: [],
          evaluation: null
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
          evaluation: null
        },
        {
          id: "m4s12",
          title: "Séance 12 — Présenter et valoriser son projet",
          video: null,
          intro: null,
          resources: [],
          evaluation: null
        }
      ]
    }

  ] // fin modules
}; // fin courseData
