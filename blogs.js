/* ================================================================
   blogs.js  —  YOUR CONTENT LIVES HERE
   ────────────────────────────────────────────────────────────────
   Edit BLOG_POSTS below to add your blog entries.

   Photos support local file paths (e.g. 'photos/myshot.jpg')
   or any full URL. No other files need to be touched.
================================================================ */


/* ════════════════════════════════════════════════════════════════
   BLOG POSTS
   ────────────────────────────────────────────────────────────────
   NEWEST POST FIRST  →  paste new posts at the very top of the
   array so they appear first in the blog list.

   ── SINGLE-DAY POST (simple) ─────────────────────────────────
   {
     id:      'post-XXX',            ← must be unique
     emoji:   '✦',                   ← shown on the blog list card
     title:   'Post Title',
     date:    'Month YYYY',          ← shown on the list + post
     excerpt: 'One line preview shown on the blog list.',
     photos:  [
       { src: 'photos/blog/a.jpg', caption: 'optional caption' },
     ],
     content: `Write freely here.

   A blank line between paragraphs is all you need.
   No HTML necessary.`,
   },

   ── MULTI-DAY POST (e.g. a trip diary) ───────────────────────
   {
     id:      'post-XXX',
     emoji:   '🌿',
     title:   'Vermont — Hack Club Intern',
     date:    'March 2026',
     excerpt: 'One line preview.',
     days: [
       {
         label:   'Day 1 — Arrival',      ← shown as section heading
         date:    'March 1, 2026',         ← optional sub-date
         photos:  [
           { src: 'photos/day1.jpg', caption: 'first impressions' },
         ],
         content: `Your day 1 writing here.`,
       },
       {
         label:   'Day 2 — Settling In',
         date:    'March 2, 2026',
         photos:  [],                      ← empty = no photos section
         content: `Day 2 writing...`,
       },
     ],
   },

   ── PHOTOS TIP ────────────────────────────────────────────────
   • Local path:  'photos/blog/my-shot.jpg'   (create a /photos/blog/ folder)
   • Full URL:    'https://...'
   • Leave photos: [] for posts without images — no section appears.
════════════════════════════════════════════════════════════════ */
const BLOG_POSTS = [

  // ── Paste new posts above this line — newest first ─────────

  {
    id:      'post-002',
    emoji:   '🧃',
    title:   'Shanghai, China: Hack Club\'s Juice',
    date:    'April 2025',
    excerpt: 'Flying out alone for the first time to show off a game I built in 100 hours.',
    photos:  [
      { src: 'https://photos.hackclub.com/media/e561f78a-bb48-4ad8-a7fd-c2e03352d09b?dpl=dpl_BtJngvkzMxef2n9Ptg8tgMgF6zBa', caption: 'BottleDream, our first venue, fruit and coffee always somewhere on the counter' },
      { src: 'https://photos.hackclub.com/media/36899886-82b1-43f9-a480-b5eae7bf85af/thumbnail?dpl=dpl_BtJngvkzMxef2n9Ptg8tgMgF6zBa', caption: 'chapter 1, chapter 2, the whole place was built to be walked through like a story' },
      { src: 'https://photos.hackclub.com/media/b81f2c77-15c8-484c-9a9e-2c58f6b786bd?dpl=dpl_BtJngvkzMxef2n9Ptg8tgMgF6zBa', caption: 'me, Kai, and Joel packed into the Shanghai metro' },
      { src: 'https://photos.hackclub.com/media/ce27468c-3d1e-4fc6-804d-627e10b31620?dpl=dpl_BtJngvkzMxef2n9Ptg8tgMgF6zBa', caption: 'one of many spontaneous trips out with the crew' },
      { src: 'https://photos.hackclub.com/media/23f79bc5-ab70-4a92-bd78-98c60fd453f8?dpl=dpl_BtJngvkzMxef2n9Ptg8tgMgF6zBa', caption: 'hotpot, the correct way for too many people to eat one meal' },
      { src: 'https://photos.hackclub.com/media/dc6fe1be-e1b9-4dc2-8048-a9a1c6477818?dpl=dpl_btjngvkzmxef2n9ptg8tgmgf6zba', caption: 'the whole Juice cohort, jackets and all' },
      { src: 'https://photos.hackclub.com/media/cb5ad1ef-260f-49bc-9d88-d654ff4764ca?dpl=dpl_BtJngvkzMxef2n9Ptg8tgMgF6zBa', caption: 'cake, way too much cake, near the end of the week' },
    ],
    content: `Coming to China was on my bucket list of things to do before I die, and somehow Hack Club made it happen before I'd even lived 20% of my life. The reason was Juice: build a game in 100 hours, no real hand-holding beyond a few reviewers checking in on your progress, and if you actually finished, you got flown out to Shanghai to show the thing off in person.

I built Outlaw Heists solo. It's a small top-down two-player heist game made in Godot, one person playing the thief and the other the cop, running around a tiny town at night trying to out-maneuver each other before the pawn shop closes. A hundred hours sounds like plenty of time until you're the only one writing every line of it yourself. It wasn't.

Then I got on a plane by myself for the first time in my life, and landed in Shanghai a few days later.

Our first venue was BottleDream, half cafe and half exhibition, watermelons and dragonfruit sitting on the counter next to the coffee grinder, cardboard signs pointing you toward "chapter 1" and "chapter 2" like the whole place was a story you were meant to walk through. That's roughly where I met Kai, Lopa, Keira, Isaac, Joel, and Maxamillion, and where the week stopped being about the game and started being about them.

We were unsupervised in a way none of us fully knew what to do with, so we did the obvious thing with it. Stayed up most nights. Biked around the district at random hours because someone suggested it and nobody said no. Went to KFC at 3am for no better reason than we could. Sat around coding and gaming together in person, after months of doing the exact same thing alone, on opposite sides of the world, through a screen.

The food alone would've been worth the trip. There was a small restaurant near our hotel we kept going back to without ever really deciding to, and then there was hotpot, which I'm now fully convinced is one of the best ways a group of people can eat a meal together. Everyone reaching into the same pot, nobody agreeing on how spicy it should be.

By the end of it there were something like a hundred of us, from a dozen different countries, standing around in matching Juice jackets for one last photo before everyone had to fly home. It didn't feel like the internet finally meeting in person. It felt more like people who'd already known each other for years, just finally meeting the bodies that went with the usernames.

I loved doing goofy stuff without being judged for it, and doing slightly unhinged stuff without being stopped. Thank you to the reviewers who sat through however many of my submissions before actually approving them, and to the organizers who somehow turned a hundred teenagers building games into a real, working week in Shanghai.

I'm not ready to go back to school knowing that a week ago I was on the other side of the planet, alone, with six people I'd known for six days, doing things I'll probably still be talking about in six years.`,
  },

  {
    id:      'post-001',
    emoji:   '✦',
    title:   'Hello, internet.',
    date:    'January 2026',
    excerpt: 'First entry. Why I built this site and what the future lies for it.',
    photos:  [],
    content: `This is the first entry in what I'm calling The Briyan Archive, a braindump in the internet that's only mine.

I built the whole thing as a desktop OS aesthetic because it felt right; something personal, something you have to explore rather than scroll through.

If you found this somehow: hi. Stay curious.`,
  },

  // ────────────────────────────────────────────────────────────
];
