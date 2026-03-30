/* ================================================================
   blogs.js  —  YOUR CONTENT LIVES HERE
   ────────────────────────────────────────────────────────────────
   Two things to edit in this file:
     1. PHOTO_OF_DAY  — photos that rotate in the desktop widget
     2. BLOG_POSTS    — your blog entries

   Both support local file paths (e.g. 'photos/myshot.jpg')
   or any full URL. No other files need to be touched.
================================================================ */


/* ════════════════════════════════════════════════════════════════
   PHOTO OF THE DAY  (desktop widget, right side)
   ────────────────────────────────────────────────────────────────
   • Rotates every PHOTO_ROTATION_MS milliseconds (default 9 s).
   • Click ‹ › arrows on the widget to navigate manually.

   TO ADD A PHOTO:
     1. Drop your image anywhere in the website folder.
     2. Add a new entry below:
          { src: 'photos/morning.jpg', caption: 'Dubai — quiet morning' },
════════════════════════════════════════════════════════════════ */
const PHOTO_ROTATION_MS = 9000;

const PHOTO_OF_DAY = [
  {
    src:     'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=500&q=80',
    caption: 'Dubai — city of gold',
  },
  {
    src:     'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=500&q=80',
    caption: 'marina nights',
  },
  {
    src:     'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&q=80',
    caption: 'somewhere far away',
  },
  // ── Add your own photos below ──────────────────────────────
  // { src: 'photos/your-photo.jpg', caption: 'your caption here' },
];


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
    emoji:   '🌿',
    title:   'Shanghai, China — Hack Club\'s Juice',
    date:    'March 2026',
    excerpt: 'Landing in a different country for the first time alone to make games',
    days: [
      {
        label:   'Day 1 — Arrival',
        date:    'March 1, 2026',
        photos:  [
          { src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', caption: 'Shanghai Arrival' },
          { src: 'https://images.unsplash.com/photo-1542621334-a254cf47733d?w=800&q=80',    caption: 'first day vibes' },
        ],
        content: `idk.`,
      },
      {
        label:   'Day 2 — Settling In',
        date:    'March 2, 2026',
        photos:  [],
        content: `idk.`,
      },
    ],
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
