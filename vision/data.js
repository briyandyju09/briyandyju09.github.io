/* Content for the atlas. Edit the words here; progress lives in the browser, not in this file. */
window.ATLAS = {
  motto: "Per aspera ad astra",
  goals: [
    {
      id: "calamus", short: "Boards", roman: "I", name: "Calamus", epithet: "the Pen",
      title: "CBSE Grade 12 board exams",
      phase: "Now, through the exams",
      target: "95%+",
      why: "Every other door opens on these marks. I am not chasing a number to prove something; I am building the habit of finishing hard things well.",
      note: "Marks are the sum of ordinary evenings. The syllabus is finite: seven stars, and each one is a finished list, not a mood.",
      stars: [[18,88],[30,72],[44,56],[58,40],[72,24],[88,10],[68,58]],
      edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[2,6],[6,4]],
      steps: [
        "Map the whole syllabus, subject by subject",
        "Finish a first full pass of every subject",
        "Solve the CBSE sample papers under exam timing",
        "Fix the three weakest chapters in each subject",
        "Sit the pre-boards, then review them honestly",
        "Walk into every paper rested and ahead of schedule",
        "Open the results to a score I am proud of"
      ]
    },
    {
      id: "acer", short: "Pearson", roman: "II", name: "Acer", epithet: "the Maple Leaf",
      title: "Lester B. Pearson Scholarship, University of Toronto",
      phase: "This application cycle",
      target: "Pearson Scholar",
      why: "Toronto is the room where the rest of the plan happens. The Pearson is not won by marks alone; it goes to people who make their school and community better.",
      note: "How it works, as of my last check: your school nominates one student, you apply to U of T, then you complete the scholarship application. It is U of T's top award for international undergraduates and covers four years, including tuition, books, incidental fees and residence. Dates and rules change, so the official page wins.",
      link: { href: "https://future.utoronto.ca/pearson/", text: "Official Pearson page" },
      stars: [[50,92],[50,64],[50,8],[12,40],[88,40],[26,74],[74,74]],
      edges: [[0,1],[1,2],[1,3],[1,4],[1,5],[1,6],[2,3],[3,5],[5,6],[6,4],[4,2]],
      steps: [
        "Ask my counsellor about school nomination and the deadline, this week",
        "Choose my three stories: leadership, creativity, community",
        "Lead one thing that has real people in it",
        "Draft the essays, then rewrite them twice",
        "Get the nomination in and the U of T application submitted",
        "Prepare for the finalist stage as if it were certain",
        "Become a Pearson Scholar"
      ]
    },
    {
      id: "corona", short: "Company", roman: "III", name: "Corona", epithet: "the Crown",
      title: "A company that sets the standard",
      phase: "The undergrad years",
      target: "An offer I am proud of",
      why: "I want to learn how the best teams build things, from inside one. Not for the name on the badge, for the people I will build next to.",
      note: "Prestige is a side effect of being useful on hard problems. Build the reflexes, ship things, and the offers follow the work.",
      stars: [[14,82],[86,82],[14,34],[50,16],[86,34],[32,58],[68,58]],
      edges: [[0,2],[2,5],[5,3],[3,6],[6,4],[4,1],[1,0]],
      steps: [
        "Make data structures and algorithms feel like reflex",
        "Ship a project that strangers actually use",
        "Read other people's code until it stops being scary",
        "Land a first internship",
        "Take a stretch role in a second internship",
        "Earn an offer from a company I respect",
        "Find a mentor who does research for a living"
      ]
    },
    {
      id: "nodus", short: "Ph.D.", roman: "IV", name: "Nodus", epithet: "the Knot",
      title: "Doctorate in computer science research",
      phase: "After undergrad",
      target: "Ph.D., Computer Science",
      why: "I want to be the person who finds out something nobody knew yesterday. A doctorate is one question, asked patiently for years.",
      note: "A Ph.D. offer is mostly evidence that you can already do research: a lab you worked in, a paper you helped write, a professor who vouches for you.",
      stars: [[50,50],[16,26],[84,18],[90,64],[58,92],[18,78],[44,8]],
      edges: [[0,1],[0,2],[0,3],[0,4],[0,5],[1,6],[6,2],[2,3],[3,4],[4,5],[5,1]],
      steps: [
        "Take the research-stream courses and get close to a lab",
        "Join a lab as an undergraduate research assistant",
        "Read fifty papers and find the question I cannot drop",
        "Co-author a first paper",
        "Apply to Ph.D. programs with a clear research story",
        "Pass the qualifiers and propose the thesis",
        "Defend the dissertation"
      ]
    },
    {
      id: "arbor", short: "Professor", roman: "V", name: "Arbor", epithet: "the Tree",
      title: "Professor at a university",
      phase: "The long game",
      target: "Tenured professor",
      why: "The best teachers I have had changed what I thought was possible. I want to do that for a room of people, for thirty years.",
      note: "U of T's motto, Velut arbor aevo, means as a tree through the ages. A career is rings, added one year at a time.",
      stars: [[50,94],[50,60],[24,38],[76,38],[12,12],[88,12],[50,8]],
      edges: [[0,1],[1,2],[1,3],[2,4],[3,5],[1,6]],
      steps: [
        "Teach, tutor or TA until I can explain anything simply",
        "Do a postdoc or an industry research stint",
        "Start a research line that is entirely my own",
        "Land a tenure-track position",
        "Build a lab and take on a first student",
        "Earn tenure and teach the class I wished I had",
        "Mentor students who go further than I did"
      ]
    }
  ],
  transmissions: [
    "A syllabus is only a list. Lists end. Cross one chapter off tonight.",
    "The scholarship goes to someone who made a place better. Make one thing better this week.",
    "You do not need to feel ready. Ready is what starting leaves behind.",
    "One question, asked patiently for five years, is a doctorate.",
    "The professor you will be is watching what you do with tonight.",
    "Ordinary evenings, stacked, look like talent from far away.",
    "Do the hard chapter first. Everything after it is downhill.",
    "Rest is part of the plan. A tired mind forgets what a rested one keeps.",
    "Comparison is a bad map. Your sky has its own stars to light.",
    "Write it down, then do the smallest piece of it. Small pieces add up to the whole.",
    "Per aspera ad astra. The aspera is the part you are in right now.",
    "Future you remembers the nights you did not feel like it, and is grateful."
  ],
  letter: "Dear Briyan,\n\nI am writing from an office with a window, a kettle, and a stack of papers that are not going to grade themselves. It is a long way from the desk you are sitting at tonight, and every step between here and there was something you did on a night you did not feel like it.\n\nYou did not get here by being the smartest person in the room. You got here by finishing lists. The boards first, then the Toronto application, then the first lab that let you in and the first paper with your name on it.\n\nTonight, light one star. That is the whole job. I will take care of the rest of the sky.\n\nYours, from the far end of the route"
};
