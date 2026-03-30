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
          video: "https://www.youtube.com/embed/sotJrOKclCs?si=fLVlhqeyV6CWmV0i",
          videoDesc: `Comprendre comment fonctionne vraiment ChatGPT et pourquoi il peut se tromper.`,
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
          video: "https://www.youtube.com/embed/g67E8cEKjH0?si=l-G7LXFyio4peFJI",
          videoDesc: `75 ans d'histoire de l'IA, des pionniers des années 1950 aux révolutions du deep learning.`,
          description: `
            <div class="desc-hero">
              <div class="desc-hero-text">
                <p>L'Intelligence Artificielle n'est pas une invention du XXI<sup>e</sup> siècle. Ses
                racines plongent dans les années 1950, avec des pionniers qui rêvaient déjà de machines
                capables de « penser ».</p>
                <p>En parcourant <strong>75 ans d'histoire</strong>, vous découvrirez les grandes
                ruptures technologiques, les périodes de désillusion (les fameux « hivers de l'IA »),
                et les avancées fulminantes qui ont abouti aux outils que vous utilisez aujourd'hui.
                Comprendre cette trajectoire vous donnera une vision plus lucide des promesses et des
                limites actuelles de l'IA.</p>
              </div>
              <img src="https://tisselia.com/wp-content/uploads/2026/03/Seance-2.png"
                alt="Illustration — Histoire de l'Intelligence Artificielle"
                class="desc-hero-img" />
            </div>
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
              url: "https://tisselia.com/wp-content/uploads/2026/03/Frise-chronologique-—-75-ans-dhistoire-de-lIA.pdf",
              icon: "📅"
            }
          ],
          evaluation: {
            type: "qcm",
            questions: [
              {
                id: "m1s2q1",
                question: "Question 1 — Le Test de Turing\nQuel est le principe du Test de Turing proposé en 1950 ?",
                options: [
                  { id: "a", text: "Un humain doit résoudre des problèmes de mathématiques aussi vite qu'une machine." },
                  { id: "b", text: "Si un humain ne parvient pas à distinguer une machine d'un humain lors d'une conversation écrite, la machine peut être considérée comme « pensante »." },
                  { id: "c", text: "Une machine doit battre un champion humain aux échecs pour prouver son intelligence." },
                  { id: "d", text: "Une machine doit produire un texte sans aucune faute d'orthographe pour passer le test." }
                ],
                answer: "b"
              },
              {
                id: "m1s2q2",
                question: "Question 2 — Les deux écoles de Dartmouth\nQuelle distinction oppose les deux grandes écoles de pensée nées à Dartmouth en 1956 ?",
                options: [
                  { id: "a", text: "L'approche matérielle (hardware) contre l'approche logicielle (software)." },
                  { id: "b", text: "L'approche occidentale contre l'approche orientale de l'intelligence." },
                  { id: "c", text: "L'approche symbolique (règles explicites) contre l'approche connexionniste (apprentissage par les données)." },
                  { id: "d", text: "L'approche déductive contre l'approche inductive en mathématiques." }
                ],
                answer: "c"
              },
              {
                id: "m1s2q3",
                question: "Question 3 — Deep Blue et Kasparov\nPourquoi la victoire de Deep Blue sur Kasparov en 1997 ne signifie-t-elle pas que la machine est « intelligente » ?",
                options: [
                  { id: "a", text: "Parce que Kasparov a triché pendant la partie." },
                  { id: "b", text: "Parce que Deep Blue fonctionnait par force brute de calcul (200 millions de positions/seconde) sans comprendre les échecs, et ne savait faire que cette tâche précise." },
                  { id: "c", text: "Parce que les règles des échecs avaient été modifiées pour avantager la machine." },
                  { id: "d", text: "Parce que Deep Blue utilisait en réalité une équipe d'humains cachés pour jouer." }
                ],
                answer: "b"
              },
              {
                id: "m1s2q4",
                question: "Question 4 — AlphaGo vs Deep Blue\nQu'est-ce qui distingue fondamentalement AlphaGo de Deep Blue ?",
                options: [
                  { id: "a", text: "AlphaGo avait accès à Internet pendant les parties, ce qui lui donnait un avantage considérable." },
                  { id: "b", text: "Contrairement à Deep Blue, AlphaGo a appris par imitation puis par renforcement (en jouant des millions de parties contre lui-même), et a découvert des stratégies inédites que les humains n'avaient jamais trouvées." },
                  { id: "c", text: "AlphaGo utilisait uniquement des règles programmées par des maîtres du Go, sans aucun apprentissage automatique." },
                  { id: "d", text: "AlphaGo était simplement plus rapide que Deep Blue grâce à des processeurs plus puissants." }
                ],
                answer: "b"
              },
              {
                id: "m1s2q5",
                question: "Question 5 — Le tournant de 2012\nParmi les facteurs suivants, lequel n'est PAS cité comme l'un des trois ingrédients ayant rendu possible le tournant du deep learning en 2012 ?",
                options: [
                  { id: "a", text: "La puissance de calcul accrue grâce aux GPU." },
                  { id: "b", text: "La disponibilité de quantités massives de données grâce à Internet." },
                  { id: "c", text: "La découverte d'une nouvelle théorie de la conscience artificielle." },
                  { id: "d", text: "L'amélioration progressive des algorithmes d'apprentissage." }
                ],
                answer: "c"
              }
            ]
          }
        },

        /* ------ Séance 3 — Les grandes familles de l'IA (5 QCM) ------ */
        {
          id: "m1s3",
          title: "Séance 3 — Les grandes familles de l'IA",
          video: "https://www.youtube.com/embed/DNXGQW8OxEA?si=q6od3zIaZ7wReZSD",
          videoDesc: `Comprendre comment les différentes formes d'IA s'emboîtent et à quoi elles servent concrètement.`,
          description: `
            <div class="desc-hero">
              <div class="desc-hero-text">
                <p>L'Intelligence Artificielle est souvent perçue comme un bloc homogène, alors qu'elle
                recouvre des réalités très différentes. Cette séance vous donne une <strong>carte mentale
                claire</strong> du paysage de l'IA, organisée autour de deux axes complémentaires.</p>
                <p>Le premier axe est <strong>technique</strong> : comprendre comment les différentes formes
                d'IA s'emboîtent les unes dans les autres, à travers la métaphore des poupées russes.
                De l'IA classique basée sur des règles, au Machine Learning qui apprend par l'exemple,
                au Deep Learning qui empile des couches de neurones artificiels, jusqu'à l'IA générative.
                Chaque niveau est plus puissant mais aussi plus exigeant en données et en calcul.</p>
                <p>Le second axe est <strong>pratique</strong> : distinguer les trois grandes familles
                d'usage — <em>reconnaissance</em>, <em>prédiction</em>, <em>génération</em> — à travers
                des exemples concrets tirés du quotidien professionnel. L'accent est mis sur ce que chaque
                famille fait vraiment, et sur ce qu'elle ne fait pas, notamment la nuance essentielle que
                l'IA générative recombine sans véritablement créer au sens humain.</p>
              </div>
              <img src="https://tisselia.com/wp-content/uploads/2026/03/Familles-de-lIA.png"
                alt="Illustration — Les grandes familles de l'IA"
                class="desc-hero-img" />
            </div>
            <div class="session-objectives">
              <p class="objectives-title">Objectifs de la séance</p>
              <ul>
                <li>Distinguer IA classique, Machine Learning, Deep Learning et IA générative sans les confondre</li>
                <li>Identifier les trois méthodes d'apprentissage du Machine Learning</li>
                <li>Différencier les trois familles d'IA selon leurs usages (reconnaissance, prédiction, génération)</li>
                <li>Porter un regard critique sur la notion de « création » attribuée à l'IA générative</li>
              </ul>
            </div>
          `,
          resources: [
            {
              label: "Support de présentation — Les grandes familles de l'IA",
              url: "https://tisselia.com/wp-content/uploads/2026/03/Les-grandes-familles-de-lIA.pdf",
              icon: "📄",
              recap: true
            }
          ],
          evaluation: {
            type: "qcm",
            questions: [
              {
                id: "m1s3q1",
                question: "Parmi ces affirmations, laquelle est correcte ?",
                options: [
                  { id: "a", text: "Tout Machine Learning est du Deep Learning." },
                  { id: "b", text: "Toute IA générative repose sur du Deep Learning." },
                  { id: "c", text: "Tout Deep Learning est de l'IA générative." },
                  { id: "d", text: "L'IA classique est une forme de Machine Learning." }
                ],
                answer: "b"
              },
              {
                id: "m1s3q2",
                question: "Dans l'apprentissage supervisé, que fournit-on à la machine ?",
                options: [
                  { id: "a", text: "Des données sans étiquettes pour qu'elle trouve des groupes seule." },
                  { id: "b", text: "Un système de récompenses et de pénalités." },
                  { id: "c", text: "Des exemples étiquetés associant une donnée à une réponse attendue." },
                  { id: "d", text: "Un ensemble de règles écrites par un humain." }
                ],
                answer: "c"
              },
              {
                id: "m1s3q3",
                question: "Pourquoi dit-on que le Deep Learning est « profond » ?",
                options: [
                  { id: "a", text: "Parce qu'il analyse des données très complexes." },
                  { id: "b", text: "Parce qu'il utilise beaucoup de couches de neurones empilées successivement." },
                  { id: "c", text: "Parce qu'il nécessite beaucoup de temps d'entraînement." },
                  { id: "d", text: "Parce qu'il imite fidèlement le cerveau humain." }
                ],
                answer: "b"
              },
              {
                id: "m1s3q4",
                question: "Karim utilise un outil qui analyse la météo, les vacances scolaires et les matchs de foot pour prévoir le nombre de couverts de son restaurant. De quel type d'IA s'agit-il ?",
                options: [
                  { id: "a", text: "IA de reconnaissance." },
                  { id: "b", text: "IA générative." },
                  { id: "c", text: "IA classique à base de règles." },
                  { id: "d", text: "IA prédictive." }
                ],
                answer: "d"
              },
              {
                id: "m1s3q5",
                question: "Qu'est-ce qui distingue fondamentalement l'IA générative des deux autres familles ?",
                options: [
                  { id: "a", text: "Elle fonctionne sans données d'entraînement." },
                  { id: "b", text: "Elle produit du contenu nouveau à partir de recombinaisons de ce qu'elle a ingéré." },
                  { id: "c", text: "Elle crée de manière consciente comme un humain." },
                  { id: "d", text: "Elle est la seule à utiliser du Deep Learning." }
                ],
                answer: "b"
              }
            ]
          }
        },

        /* ------ Séance 4 ------ */
        {
          id: "m1s4",
          title: "Séance 4 — Prompt Engineering : parler à l'IA efficacement",
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
