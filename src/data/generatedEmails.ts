import { Email } from '../types';

/**
 * Deterministic pseudo-random number generator (Mulberry32)
 * Ensures 100% reproducible email generation across runs and devices.
 */
function createPRNG(seed: number) {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t >>> 0) / 4294967296;
  };
}

// 25 Retailers, Food Delivery, and Travel Brands
const PROMOTION_SENDERS = [
  { name: 'Patagonia', email: 'updates@patagonia-outdoors.com', domain: 'patagonia.com' },
  { name: 'REI Co-op', email: 'gear@rei-adventures.com', domain: 'rei.com' },
  { name: 'Everlane', email: 'team@everlane-style.com', domain: 'everlane.com' },
  { name: 'Blue Bottle Coffee', email: 'fresh@bluebottle-roastery.com', domain: 'bluebottlecoffee.com' },
  { name: 'Aesop Botanicals', email: 'service@aesop-care.com', domain: 'aesop.com' },
  { name: 'Allbirds', email: 'orders@allbirds-comfort.com', domain: 'allbirds.com' },
  { name: 'DoorDash Deals', email: 'deals@doordash-offers.com', domain: 'doordash.com' },
  { name: 'Uber Eats', email: 'specials@ubereats-rewards.com', domain: 'ubereats.com' },
  { name: 'Caviar Curated', email: 'table@trycaviar-dining.com', domain: 'trycaviar.com' },
  { name: 'Airbnb Getaways', email: 'discover@airbnb-escapes.com', domain: 'airbnb.com' },
  { name: 'Southwest Airlines', email: 'lowfares@southwest-flyer.com', domain: 'southwest.com' },
  { name: 'Delta SkyMiles', email: 'promos@delta-rewards.com', domain: 'delta.com' },
  { name: 'Muji Home', email: 'newsletter@muji-living.com', domain: 'muji.us' },
  { name: 'Kinfolk Gallery', email: 'shop@kinfolk-press.com', domain: 'kinfolk.com' },
  { name: 'Sonos Sound', email: 'news@sonos-audio.com', domain: 'sonos.com' },
  { name: 'Herman Miller', email: 'design@hermanmiller-studio.com', domain: 'hermanmiller.com' },
  { name: 'Peak Design', email: 'gear@peakdesign-carry.com', domain: 'peakdesign.com' },
  { name: 'Fellow Products', email: 'brew@fellowproducts-kettles.com', domain: 'fellowproducts.com' },
  { name: 'Bellroy Carry', email: 'dispatch@bellroy-carry.com', domain: 'bellroy.com' },
  { name: 'Baggu Studios', email: 'hello@baggu-studio.com', domain: 'baggu.com' },
  { name: 'Outlier NYC', email: 'dispatches@outlier-tailoring.com', domain: 'outlier.nyc' },
  { name: 'Snow Peak Camp', email: 'outdoor@snowpeak-gear.com', domain: 'snowpeak.com' },
  { name: 'Hario Glassware', email: 'japan@hario-coffee.com', domain: 'hario.jp' },
  { name: 'Sweetgreen', email: 'rewards@sweetgreen-greens.com', domain: 'sweetgreen.com' },
  { name: 'Ritual Vitamins', email: 'daily@ritual-wellness.com', domain: 'ritual.com' },
];

const PROMOTION_TOPICS = [
  { subj: 'Seasonal flash sale: 25% off archive styles', body: 'Discover quiet essentials discounted for 48 hours only. Use promo code CALM25.' },
  { subj: 'Free express shipping on all orders over $75', body: 'Stock up on seasonal staples with complimentary zero-emission delivery this week.' },
  { subj: 'New limited drop: Earth tone ceramics & textiles', body: 'Small-batch crafted goods made in partnership with independent studio artisans.' },
  { subj: 'Weekend special: Complimentary tasting flight with any order', body: 'Enjoy notes of toasted hazelnut, stone fruit, and dark cacao with our latest roast.' },
  { subj: 'Member exclusive: Early access to private winter sale', body: 'Your loyalty status unlocks early access before the public launch on Friday morning.' },
  { subj: '20% off your next delivery order', body: 'Craving something warm tonight? Apply promo code COZYBOWL at checkout before Sunday.' },
  { subj: 'Autumn travel escapes: Low fare routes now open', body: 'Book non-stop coastal flights starting at $69 one-way for travel through November.' },
  { subj: 'Restock notice: Heavyweight organic cotton blankets', body: 'Our best-selling natural dye throws are back in stock in sage, oatmeal, and terracotta.' },
];

// 12 Curated Newsletters
const NEWSLETTER_SENDERS = [
  { name: 'Dense Discovery', email: 'kai@densediscovery.com', domain: 'densediscovery.com' },
  { name: 'Morning Brew', email: 'crew@morningbrew-daily.com', domain: 'morningbrew.com' },
  { name: 'The Browser', email: 'editor@thebrowser-reads.com', domain: 'thebrowser.com' },
  { name: 'TLDR Tech', email: 'dan@tldr-tech.com', domain: 'tldr.tech' },
  { name: 'Changelog Weekly', email: 'editors@changelog.com', domain: 'changelog.com' },
  { name: 'Hacker Newsletter', email: 'digest@hackernewsletter.com', domain: 'hackernewsletter.com' },
  { name: 'Platformer', email: 'casey@platformer-news.com', domain: 'platformer.news' },
  { name: 'The Marginalian', email: 'maria@themarginalian.org', domain: 'themarginalian.org' },
  { name: 'Sidebar IO', email: 'sacha@sidebar.io', domain: 'sidebar.io' },
  { name: 'Offscreen Magazine', email: 'dispatch@offscreenmag.com', domain: 'offscreenmag.com' },
  { name: 'Letters of Note', email: 'shaun@lettersofnote.com', domain: 'lettersofnote.com' },
  { name: 'Austin Kleon Newsletter', email: 'austin@austinkleon.com', domain: 'austinkleon.com' },
];

const NEWSLETTER_TOPICS = [
  { subj: 'Issue #312: Designing for slowness, tactile web tools & quiet typography', body: 'A weekly curation of thoughtful technology, art, design essays, and book recommendations.' },
  { subj: 'Daily briefing: Semiconductor trends, clean energy breakthroughs & market digest', body: 'Top technology headlines distilled into 5 minutes of focused reading.' },
  { subj: 'Five curated pieces worth your complete attention this weekend', body: 'From deep-sea cartography to the lost art of letterpress woodblocks.' },
  { subj: 'Frontend architecture round-up: CSS subgrid patterns & local vector search', body: 'Latest developer releases, RFC summaries, and high-performance frontend patterns.' },
  { subj: 'On cultivating attention and the discipline of analog contemplation', body: 'An essay exploring silence, notebook journaling, and protecting cognitive space.' },
  { subj: '10 things worth sharing: Sketches, library archives, and wooden pencils', body: 'A Friday digest of creative inspiration, studio tools, and interesting rabbit holes.' },
];

// 6 Social Services
const SOCIAL_SENDERS = [
  { name: 'GitHub Notifications', email: 'notifications@github-mail.com', service: 'GitHub' },
  { name: 'LinkedIn Network', email: 'updates@linkedin-network.com', service: 'LinkedIn' },
  { name: 'Goodreads', email: 'updates@goodreads-books.com', service: 'Goodreads' },
  { name: 'Strava Athletics', email: 'activities@strava-run.com', service: 'Strava' },
  { name: 'Instagram', email: 'notify@instagram-activity.com', service: 'Instagram' },
  { name: 'Figma Community', email: 'community@figma-hub.com', service: 'Figma' },
];

const SOCIAL_TOPICS = [
  { subj: 'Someone starred your repository studio-design-tokens', body: 'Your public repository studio-design-tokens just received a star from user @dev_artisan.' },
  { subj: 'Sarah Lin and 3 others reacted to your shared post', body: '"Calm interfaces for high-focus work" is trending among your design connections.' },
  { subj: 'Elena finished reading "The Architecture of Happiness"', body: 'See what your friends are reading this month on your virtual bookshelf.' },
  { subj: 'Carlos Rivera gave you kudos on your morning trail run', body: 'Great job completing "Headlands Coastal 8.2 km Loop" today!' },
  { subj: 'David Kim mentioned you in a comment on PR #142', body: '"@maya what do you think of this color variable contrast ratio?"' },
  { subj: 'New collaborator requested your review on a shared design file', body: 'View the prototype and inspect CSS properties in the shared team workspace.' },
];

// 5 Calendar & Event Senders
const CALENDAR_SENDERS = [
  { name: 'Google Calendar', email: 'calendar-notification@google.com' },
  { name: 'Luma Events', email: 'invites@lu.ma' },
  { name: 'Zoom Meetings', email: 'no-reply@zoom.us' },
  { name: 'Cal.com Scheduling', email: 'notifications@cal.com' },
  { name: 'Eventbrite Community', email: 'invitations@eventbrite.com' },
];

const CALENDAR_TOPICS = [
  { subj: 'Invitation: Product roadmap sync @ Wed Oct 15', body: 'You have been invited to Product roadmap sync with Sarah Lin and David Kim.' },
  { subj: 'Reminder: Quarterly engineering review starts at 2:00 PM', body: 'This is a quick reminder that the quarterly engineering review begins in 30 minutes in Room 4A.' },
  { subj: 'Webinar: Modern typography systems and fluid design tokens', body: 'Your registration is confirmed. Join the live webinar session tomorrow.' },
  { subj: 'RSVP confirmation: Design Systems Community Meetup', body: 'Thanks for your RSVP. We look forward to seeing you at the community space on Thursday evening.' },
  { subj: 'Calendar invite: 1-on-1 monthly design sync with Jordan Blake', body: 'Updated invitation for monthly design feedback and portfolio review session.' },
  { subj: 'Event reminder: Annual studio retreat and planning kickoff', body: 'Please review the itinerary and RSVP by Friday afternoon.' },
];

// Automated Notifications & Verification Codes
const AUTOMATED_SENDERS = [
  { name: 'Auth0 Security', email: 'security@auth0-notify.com' },
  { name: 'Google Account', email: 'no-reply@accounts-security.google.com' },
  { name: 'AWS CloudWatch', email: 'alerts@amazon-cloud.com' },
  { name: 'Vercel Deployments', email: 'notifications@vercel-builds.com' },
  { name: 'Cloudflare System', email: 'alerts@cloudflare-dns.com' },
  { name: 'UPS Quantum View', email: 'tracking@ups-delivery.com' },
  { name: 'FedEx Express', email: 'tracking@fedex-shipping.com' },
  { name: 'Stripe Payments', email: 'notifications@stripe-payouts.com' },
  { name: '1Password Watchtower', email: 'support@1password-security.com' },
  { name: 'npm Security Registry', email: 'notifications@npmjs-registry.org' },
];

// Receipts, Bills and Statements
const BILLS_SENDERS = [
  { name: 'Pacific Gas & Electric', email: 'billing@utility-pge.com' },
  { name: 'SF Water Department', email: 'statements@sfwater.org' },
  { name: 'Chase Card Services', email: 'alerts@chase-card.com' },
  { name: 'Sonic Fiber Internet', email: 'invoices@sonic-fiber.net' },
  { name: 'FasTrak Bay Area', email: 'no-reply@bayareafastrak.org' },
  { name: 'Kaiser Health Billing', email: 'billing@kaiserpermanente.org' },
  { name: 'Apple Services', email: 'no-reply@apple-receipts.com' },
  { name: 'DigitalOcean Cloud', email: 'billing@digitalocean-cloud.com' },
];

// 10 Colleagues and Clients (Work)
const WORK_SENDERS = [
  { name: 'Sarah Lin', email: 'sarah.lin@studio-orbit.com' },
  { name: 'David Kim', email: 'david.kim@orbit-eng.com' },
  { name: 'Rachel Chen', email: 'rachel@acme-client.com' },
  { name: 'Marcus Vance', email: 'marcus.v@studio-orbit.com' },
  { name: 'Elena Rostova', email: 'elena@design-crit.io' },
  { name: 'Tom Baker', email: 'tom@acme-client.com' },
  { name: 'Priya Patel', email: 'priya.p@orbit-eng.com' },
  { name: 'Liam O\'Connor', email: 'liam@partner-agency.com' },
  { name: 'Chris Wong', email: 'chris.w@studio-orbit.com' },
  { name: 'Jordan Blake', email: 'jordan@product-guild.org' },
];

const WORK_TOPICS = [
  { subj: 'Quarterly design review prep & slide deck outline', body: 'Maya, I put together the draft slide deck for our leadership sync. Would love your feedback on slides 4 through 7.' },
  { subj: 'Client feedback: Brand assets approval & typography specs', body: 'The Acme leadership team approved our typography pairing recommendations without reservations. Great work!' },
  { subj: 'Quick question regarding responsive breakpoints in v2 release', body: 'Are we maintaining 600px as the single rail breakpoint for tablet portrait? Let me know before sprint planning.' },
  { subj: 'Design system tokens: HSL contrast audit results', body: 'Ran the WCAG AAA accessibility audit on our muted olive tones. Attached the test report.' },
  { subj: 'Sprint planning sync notes & action items', body: 'Here is the summary of deliverables agreed upon during morning standup. Let me know if anything was missed.' },
  { subj: 'Candidate portfolio review: Senior Interface Engineer', body: 'Shared the candidate take-home submission in our recruiting channel. Let me know your score.' },
];

// Friends & Family (Personal)
const PERSONAL_SENDERS = [
  { name: 'Carlos Rivera', email: 'carlos.rivera92@gmail.com' },
  { name: 'Mom (Helen)', email: 'helen.thorne@gmail.com' },
  { name: 'Dad (Richard)', email: 'richard.thorne@gmail.com' },
  { name: 'Sam Thorne', email: 'sam.thorne.art@gmail.com' },
  { name: 'Zoe Martinez', email: 'zoe.martinez@gmail.com' },
  { name: 'Alex Green', email: 'alex.green.sf@gmail.com' },
];

const PERSONAL_TOPICS = [
  { subj: 'Sunday family dinner & peach cobbler recipe', body: 'Hi honey, Dad picked up fresh peaches from the market. Let us know if you can make it around 5:30 PM this Sunday.' },
  { subj: 'Photos from the coastal hike & ridge lookout', body: 'Shared the high-res photo gallery from our Saturday morning hike. That foggy vista came out fantastic!' },
  { subj: 'Book recommendation you mentioned last month', body: 'Finally started reading that architectural history book you recommended. You were right about chapter 3!' },
  { subj: 'Weekend farmers market run & sourdough loaf', body: 'Hey Maya! Heading to the Ferry Building market around 9:30 AM on Saturday. Want me to grab an extra country loaf for you?' },
  { subj: 'Catching up: Coffee walk in the park next week?', body: 'Hope your week is going smoothly! Let me know if you have 30 minutes for a coffee stroll around Dolores Park.' },
];

// Community & Other
const OTHER_SENDERS = [
  { name: 'Potrero Hill Association', email: 'board@potrero-neighbors.org' },
  { name: 'San Francisco Public Library', email: 'notices@sfpl.org' },
  { name: 'Ferry Plaza Farmers Market', email: 'info@cuesa-market.org' },
  { name: 'Bay Area Transit Survey', email: 'feedback@bayareatransit.org' },
];

/**
 * Deterministic generation of 800 realistic sample emails.
 * Mix:
 * - 280 (35%) Promotions
 * - 120 (15%) Newsletters
 * - 96 (12%) Social Notifications
 * - 80 (10%) Automated Notifications & Codes
 * - 64 (8%) Receipts, Bills & Statements
 * - 80 (10%) Work Emails
 * - 48 (6%) Personal Emails
 * - 32 (4%) Other
 * Total = 800 emails.
 */
export function generateSampleEmails(): Email[] {
  const prng = createPRNG(133742);
  const emails: Email[] = [];

  // Fixed baseline: 2026-10-12T06:00:00.000Z
  const BASE_TIME_MS = 1791784800000;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  // Generate date spread across 14 months (~425 days), most between 1 and 12 months (30 to 365 days)
  const generateDate = (): string => {
    const roll = prng();
    let daysAgo: number;
    if (roll < 0.12) {
      // Recent (1 to 29 days)
      daysAgo = 1 + Math.floor(prng() * 28);
    } else if (roll < 0.88) {
      // 1 to 12 months (30 to 365 days)
      daysAgo = 30 + Math.floor(prng() * 335);
    } else {
      // 12 to 14 months (366 to 425 days)
      daysAgo = 366 + Math.floor(prng() * 59);
    }
    const hour = Math.floor(8 + prng() * 13); // 8 AM to 9 PM
    const minute = Math.floor(prng() * 60);
    const dateMs = BASE_TIME_MS - daysAgo * ONE_DAY_MS + (hour * 3600000 + minute * 60000);
    return new Date(dateMs).toISOString();
  };

  let idCounter = 1;

  // 1. PROMOTIONS (~35% = 280)
  for (let i = 0; i < 280; i++) {
    const sender = PROMOTION_SENDERS[i % PROMOTION_SENDERS.length];
    const topic = PROMOTION_TOPICS[Math.floor(prng() * PROMOTION_TOPICS.length)];
    const hasUnsub = prng() > 0.05; // 95% have unsubscribe link
    const isUnread = prng() < 0.10; // ~10% unread
    const isStarred = prng() < 0.02; // ~2%
    const hasAttachment = prng() < 0.02;
    const userHasReplied = false;

    emails.push({
      id: `gen-${String(idCounter++).padStart(4, '0')}`,
      senderName: sender.name,
      senderEmail: sender.email,
      subject: topic.subj,
      snippet: topic.body,
      bodyText: `${topic.body}\n\nExplore our latest catalog online. Free returns within 30 days.\n\nWarm regards,\nThe ${sender.name} Team`,
      date: generateDate(),
      isUnread,
      isStarred,
      hasAttachment,
      userHasReplied,
      categoryId: 'promotions',
      categorySource: 'rule',
      gmailCategory: 'promotions',
      senderKind: 'promotion',
      unsubscribeUrl: hasUnsub ? `https://${sender.domain}/unsubscribe?id=usr_${1000 + i}` : undefined,
    });
  }

  // 2. NEWSLETTERS (~15% = 120)
  for (let i = 0; i < 120; i++) {
    const sender = NEWSLETTER_SENDERS[i % NEWSLETTER_SENDERS.length];
    const topic = NEWSLETTER_TOPICS[Math.floor(prng() * NEWSLETTER_TOPICS.length)];
    const isUnread = prng() < 0.10;
    const isStarred = prng() < 0.04;
    const hasAttachment = prng() < 0.02;
    const userHasReplied = prng() < 0.02;

    emails.push({
      id: `gen-${String(idCounter++).padStart(4, '0')}`,
      senderName: sender.name,
      senderEmail: sender.email,
      subject: topic.subj,
      snippet: topic.body,
      bodyText: `Welcome to this week's edition of ${sender.name}.\n\n${topic.body}\n\nThank you for reading and supporting independent writing.\n\nBest,\n${sender.name}`,
      date: generateDate(),
      isUnread,
      isStarred,
      hasAttachment,
      userHasReplied,
      categoryId: 'promotions',
      categorySource: 'rule',
      gmailCategory: 'promotions',
      senderKind: 'newsletter',
      unsubscribeUrl: `https://${sender.domain}/opt-out?email=maya@example.com`,
    });
  }

  // 3. SOCIAL NOTIFICATIONS (~12% = 96)
  for (let i = 0; i < 96; i++) {
    const sender = SOCIAL_SENDERS[i % SOCIAL_SENDERS.length];
    const topic = SOCIAL_TOPICS[Math.floor(prng() * SOCIAL_TOPICS.length)];
    const isUnread = prng() < 0.09;
    const isStarred = prng() < 0.01;
    const hasAttachment = false;
    const userHasReplied = false;

    emails.push({
      id: `gen-${String(idCounter++).padStart(4, '0')}`,
      senderName: sender.name,
      senderEmail: sender.email,
      subject: topic.subj,
      snippet: topic.body,
      bodyText: `Hi Maya,\n\n${topic.body}\n\nView activity details in your ${sender.service} dashboard.\n\nNotification settings can be adjusted in your account preferences.`,
      date: generateDate(),
      isUnread,
      isStarred,
      hasAttachment,
      userHasReplied,
      categoryId: 'updates',
      categorySource: 'rule',
      gmailCategory: 'social',
      senderKind: 'social',
    });
  }

  // 4. AUTOMATED NOTIFICATIONS & CODES (~10% = 80)
  for (let i = 0; i < 80; i++) {
    const sender = AUTOMATED_SENDERS[i % AUTOMATED_SENDERS.length];
    const isCode = i % 3 === 0;
    const isShip = !isCode && (i % 2 === 1);
    const code = Math.floor(100000 + prng() * 900000);
    const subj = isCode
      ? (i % 6 === 0 ? `Your verification code is ${code}` : i % 6 === 3 ? `One-time security code for sign-in: ${code}` : `Login alert: Verify your new device`)
      : isShip
      ? (i % 4 === 1 ? `Your order has shipped via UPS` : `Delivered: Package left at front porch`)
      : `Deployment build #284${i} succeeded in 32s`;
    const snippet = isCode
      ? `Use verification code ${code} to complete your authentication. Code expires in 10 minutes.`
      : isShip
      ? `Your shipment tracking status has been updated. Package is out for delivery or delivered.`
      : `Status update from ${sender.name}. All systems operational and signed.`;

    const isUnread = prng() < 0.10;
    const isStarred = prng() < 0.02;
    const hasAttachment = prng() < 0.06;
    const userHasReplied = false;

    emails.push({
      id: `gen-${String(idCounter++).padStart(4, '0')}`,
      senderName: sender.name,
      senderEmail: sender.email,
      subject: subj,
      snippet,
      bodyText: `Automated Service Notification:\n\n${snippet}\n\nIf you did not initiate this request, please review your active sessions immediately.\n\n${sender.name}`,
      date: generateDate(),
      isUnread,
      isStarred,
      hasAttachment,
      userHasReplied,
      categoryId: 'updates',
      categorySource: 'rule',
      gmailCategory: 'updates',
      senderKind: isCode ? 'verification' : isShip ? 'shipping' : 'automated',
    });
  }

  // 5. RECEIPTS, BILLS & STATEMENTS (~8% = 64)
  for (let i = 0; i < 64; i++) {
    const sender = BILLS_SENDERS[i % BILLS_SENDERS.length];
    const amount = (25 + Math.floor(prng() * 160) + 0.5 * Math.floor(prng() * 99)).toFixed(2);
    const subj = `Your monthly statement for $${amount} is ready`;
    const snippet = `Your account statement of $${amount} has been generated and scheduled for autopay.`;

    const isUnread = prng() < 0.11;
    const isStarred = prng() < 0.05;
    const hasAttachment = prng() < 0.35; // Many bills have attachments
    const userHasReplied = false;

    emails.push({
      id: `gen-${String(idCounter++).padStart(4, '0')}`,
      senderName: sender.name,
      senderEmail: sender.email,
      subject: subj,
      snippet,
      bodyText: `Dear Maya,\n\nYour statement of $${amount} has been generated for account ••••-${3000 + i}.\n\nPayment will be processed via your primary payment method.\nA PDF receipt has been generated for your tax and expense records.\n\nThank you,\n${sender.name}`,
      date: generateDate(),
      isUnread,
      isStarred,
      hasAttachment,
      userHasReplied,
      categoryId: 'bills',
      categorySource: 'rule',
      gmailCategory: 'updates',
      senderKind: 'billing',
    });
  }

  // 6. WORK EMAILS (~10% = 80)
  for (let i = 0; i < 80; i++) {
    const sender = WORK_SENDERS[i % WORK_SENDERS.length];
    const topic = WORK_TOPICS[Math.floor(prng() * WORK_TOPICS.length)];
    const isUnread = prng() < 0.10;
    const isStarred = prng() < 0.06;
    const hasAttachment = prng() < 0.12;
    const userHasReplied = prng() < 0.18; // ~18% replied

    emails.push({
      id: `gen-${String(idCounter++).padStart(4, '0')}`,
      senderName: sender.name,
      senderEmail: sender.email,
      subject: topic.subj,
      snippet: topic.body,
      bodyText: `Hi Maya,\n\n${topic.body}\n\nLet me know your thoughts when you have a moment to review.\n\nBest,\n${sender.name}`,
      date: generateDate(),
      isUnread,
      isStarred,
      hasAttachment,
      userHasReplied,
      categoryId: 'work',
      categorySource: 'rule',
      gmailCategory: 'primary',
      senderKind: 'work',
    });
  }

  // 7. PERSONAL EMAILS (~6% = 48)
  for (let i = 0; i < 48; i++) {
    const sender = PERSONAL_SENDERS[i % PERSONAL_SENDERS.length];
    const topic = PERSONAL_TOPICS[Math.floor(prng() * PERSONAL_TOPICS.length)];
    const isUnread = prng() < 0.10;
    const isStarred = prng() < 0.08;
    const hasAttachment = prng() < 0.15;
    const userHasReplied = prng() < 0.25; // ~25% replied

    emails.push({
      id: `gen-${String(idCounter++).padStart(4, '0')}`,
      senderName: sender.name,
      senderEmail: sender.email,
      subject: topic.subj,
      snippet: topic.body,
      bodyText: `${topic.body}\n\nCan't wait to catch up soon!\n\nLove,\n${sender.name}`,
      date: generateDate(),
      isUnread,
      isStarred,
      hasAttachment,
      userHasReplied,
      categoryId: 'personal',
      categorySource: 'rule',
      gmailCategory: 'primary',
      senderKind: 'personal',
    });
  }

  // 8. OTHER (~4% = 32)
  for (let i = 0; i < 32; i++) {
    const sender = OTHER_SENDERS[i % OTHER_SENDERS.length];
    const subj = `Community notice: ${['Weekend street fair', 'Library branch book sale', 'Neighborhood garden workday', 'Annual transit improvement survey'][i % 4]}`;
    const snippet = `Upcoming community event notice and volunteer guidelines for neighborhood residents.`;

    const isUnread = prng() < 0.10;
    const isStarred = prng() < 0.03;
    const hasAttachment = prng() < 0.05;
    const userHasReplied = prng() < 0.03;

    emails.push({
      id: `gen-${String(idCounter++).padStart(4, '0')}`,
      senderName: sender.name,
      senderEmail: sender.email,
      subject: subj,
      snippet,
      bodyText: `Hello neighbors,\n\n${snippet}\n\nEveryone is welcome to participate. See the community board for times and meeting locations.\n\nBest regards,\n${sender.name}`,
      date: generateDate(),
      isUnread,
      isStarred,
      hasAttachment,
      userHasReplied,
      categoryId: 'updates',
      categorySource: 'rule',
      gmailCategory: 'forums',
      senderKind: 'community',
    });
  }

  // 9. CALENDAR INVITES & EVENT REMINDERS (~2.5% = 20)
  for (let i = 0; i < 20; i++) {
    const sender = CALENDAR_SENDERS[i % CALENDAR_SENDERS.length];
    const topic = CALENDAR_TOPICS[i % CALENDAR_TOPICS.length];
    const isUnread = prng() < 0.10;
    const isStarred = prng() < 0.05;
    const hasAttachment = false;
    const userHasReplied = false;

    emails.push({
      id: `gen-${String(idCounter++).padStart(4, '0')}`,
      senderName: sender.name,
      senderEmail: sender.email,
      subject: topic.subj,
      snippet: topic.body,
      bodyText: `Calendar Notification:\n\n${topic.body}\n\nOrganizer: ${sender.name}\nLocation: Virtual sync room\n\nPlease let the host know if you cannot attend.`,
      date: generateDate(),
      isUnread,
      isStarred,
      hasAttachment,
      userHasReplied,
      categoryId: 'updates',
      categorySource: 'rule',
      gmailCategory: 'updates',
      senderKind: 'calendar',
    });
  }

  // Sort deterministically by date descending
  return emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export const GENERATED_EMAILS: Email[] = generateSampleEmails();

export const GENERATED_COUNTS = {
  promotions: 280,
  newsletters: 120,
  social: 96,
  automated: 80,
  receipts: 64,
  work: 80,
  personal: 48,
  other: 32,
  calendar: 20,
  total: 820,
};
