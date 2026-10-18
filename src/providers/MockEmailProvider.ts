import { Email } from '../types';
import { EmailProvider } from './EmailProvider';
import { generateSampleEmails } from '../data/generatedEmails';

export const STORAGE_KEY_READ_OVERRIDES_V1 = 'calm_inbox_read_states_v1';
export const STORAGE_KEY_USE_LARGE_DATASET = 'calm_inbox_use_large_dataset_v1';
export const STORAGE_KEY_TRASH_ARCHIVE_STATES_V1 = 'calm_inbox_trash_archive_states_v1';

const RAW_HANDWRITTEN_EMAILS: Email[] = [
      // 1. Work - Urgent Design Review
      {
        id: 'msg-001',
        senderName: 'Sarah Lin',
        senderEmail: 'sarah.lin@studio-orbit.com',
        subject: 'Final sign-off: Design tokens & layout for v2 release',
        date: '2026-10-11T04:30:00Z',
        snippet: 'Maya, we need your final thumbs-up on the palette updates before engineering freeze today at 4 PM.',
        bodyText: `Hi Maya,\n\nWe've finished implementing the calm earthy palette updates across the design system. David and the frontend team are ready to cut the branch, but we need your final sign-off on the primary token contrast ratios before the engineering freeze today at 4:00 PM PST.\n\nPlease take a look at the Figma specs linked in the ticket and let me know if you approve or if you'd like any last-minute adjustments.\n\nBest,\nSarah\nPrincipal Product Designer`,
        isUnread: true,
        isStarred: true,
        hasAttachment: true,
        userHasReplied: true,
        gmailCategory: 'primary',
      },

      // 2. Bills - Electric Utility
      {
        id: 'msg-002',
        senderName: 'Pacific Gas & Electric',
        senderEmail: 'billing@utility-pge.com',
        subject: 'Your October energy statement is ready ($84.12)',
        date: '2026-10-10T19:15:00Z',
        snippet: 'Your statement of $84.12 for service ending Oct 08 is due on October 25, 2026.',
        bodyText: `Dear Maya,\n\nYour monthly statement for electric and gas service is now available for review online.\n\nAccount: ••••-4921\nAmount Due: $84.12\nDue Date: October 25, 2026\nPayment Method: Autopay scheduled for Oct 24.\n\nYou can review your daily usage breakdown and carbon offset metrics in your account portal.\n\nThank you for choosing PG&E.`,
        isUnread: true,
        isStarred: false,
        hasAttachment: true,
        userHasReplied: false,
        gmailCategory: 'updates',
      },

      // 3. Updates - Flight Gate Change
      {
        id: 'msg-003',
        senderName: 'FlightLine Airlines',
        senderEmail: 'alerts@flightline-air.com',
        subject: 'Flight FL-482 Gate Change & Boarding Notification',
        date: '2026-10-10T14:45:00Z',
        snippet: 'Important: Flight FL482 from SFO to SEA has moved from Gate B12 to Gate C04.',
        bodyText: `Flight Status Update:\n\nPassenger: Maya Thorne\nFlight: FL-482 (San Francisco SFO → Seattle SEA)\nDeparture: Tomorrow, Oct 12 at 08:35 AM\nStatus: On Time\n\nAttention: Departure gate has changed from B12 to C04. Please arrive at Gate C04 at least 35 minutes prior to departure for boarding group 2.\n\nCarry-on bag allowance: 1 standard + 1 personal item.`,
        isUnread: true,
        isStarred: true,
        hasAttachment: true,
        userHasReplied: false,
        gmailCategory: 'updates',
      },

      // 4. Personal - Weekend Dinner
      {
        id: 'msg-004',
        senderName: 'Carlos Rivera',
        senderEmail: 'carlos.rivera92@gmail.com',
        subject: 'Sunday dinner at the courtyard & hiking photos',
        date: '2026-10-10T11:20:00Z',
        snippet: 'Are you still free this Sunday around 6 PM? I picked up that smoked cedar salt we talked about.',
        bodyText: `Hey Maya!\n\nHope your week hasn't been too crazy. Are we still on for dinner this Sunday around 6:00 PM at our place? I picked up some fresh sourdough from Tartine and that smoked cedar salt from our trip.\n\nAlso, I uploaded the high-res photos from Mount Tamalpais last weekend to our shared album. That misty ridge shot turned out unbelievable!\n\nLet me know if 6 works or if you need to push it a bit later.\n\nWarmly,\nCarlos`,
        isUnread: false,
        isStarred: true,
        hasAttachment: true,
        userHasReplied: true,
        gmailCategory: 'primary',
      },

      // 5. Work - Architecture Review
      {
        id: 'msg-005',
        senderName: 'David Patel',
        senderEmail: 'd.patel@studio-orbit.com',
        subject: 'RFC: Offline-first sync model with IndexedDB cache',
        date: '2026-10-09T16:10:00Z',
        snippet: 'Sharing the draft RFC for caching vector embeddings and email metadata locally. Thoughts welcome by Monday.',
        bodyText: `Team,\n\nI have published the draft RFC for our client-side caching tier. We are evaluating wrapping IndexedDB in a lightweight wrapper to cache search embeddings and triage metadata so the app feels instant even under spotty connections.\n\nKey discussion questions:\n1. Eviction strategy for embeddings exceeding 50MB\n2. Re-indexing frequency upon new syncs\n\nPlease leave comments in Notion or reply directly by Monday morning.\n\nCheers,\nDavid Patel\nVP of Engineering`,
        isUnread: true,
        isStarred: false,
        hasAttachment: false,
        userHasReplied: true,
        gmailCategory: 'primary',
      },

      // 6. Promotions - Coffee Roasters
      {
        id: 'msg-006',
        senderName: 'Blue Bottle Coffee',
        senderEmail: 'newsletter@bluebottlecoffee.com',
        subject: 'Autumn Single-Origin Release: Ethiopian Yirgacheffe & 20% off',
        date: '2026-10-09T09:00:00Z',
        snippet: 'Explore floral bergamot and honey notes with freshly roasted beans. Enjoy 20% off with code AUTUMNFLOW.',
        bodyText: `Good morning coffee lover,\n\nOur seasonal Ethiopian Yirgacheffe microlot has just landed at our roastery in Oakland. Expect vibrant citrus blossom, Meyer lemon, and wildflower honey aromatics.\n\nTo celebrate the harvest season, use discount code AUTUMNFLOW at checkout to receive 20% off whole bean subscriptions and brewing gear this weekend.\n\nOffer ends Sunday midnight.\n\nBlue Bottle Team`,
        isUnread: false,
        isStarred: false,
        hasAttachment: false,
        userHasReplied: false,
        gmailCategory: 'promotions',
        unsubscribeUrl: 'https://bluebottlecoffee.com/unsubscribe?user=mthorne_99',
      },

      // 7. Bills - Cloud Hosting
      {
        id: 'msg-007',
        senderName: 'Vercel Billing',
        senderEmail: 'billing@vercel.com',
        subject: 'Invoice #INV-2026-9812 has been paid',
        date: '2026-10-08T22:00:00Z',
        snippet: 'Your monthly Pro team subscription ($20.00) was successfully processed on Visa ending in 4921.',
        bodyText: `Hi Maya,\n\nThis is a receipt for your monthly team subscription.\n\nInvoice ID: INV-2026-9812\nDate: Oct 08, 2026\nPlan: Pro (1 seat)\nTotal Charged: $20.00 USD\nPayment Status: Paid\nCard: Visa ending in 4921\n\nA PDF copy of your receipt has been attached for your bookkeeping.\n\nThanks,\nThe Vercel Team`,
        isUnread: false,
        isStarred: false,
        hasAttachment: true,
        userHasReplied: false,
        gmailCategory: 'updates',
      },

      // 8. Personal - Book Club
      {
        id: 'msg-008',
        senderName: 'Emily Watson',
        senderEmail: 'emily.watson.books@outlook.com',
        subject: 'October Book Club Pick: "Braiding Sweetgrass" discussion date',
        date: '2026-10-08T15:30:00Z',
        snippet: 'Hi all! We decided to meet on Thursday Oct 22 at 7 PM to discuss the first 4 chapters. Who can bring tea?',
        bodyText: `Dear readers,\n\nAfter tallying the votes, our October selection is Robin Wall Kimmerer’s "Braiding Sweetgrass".\n\nOur first gathering will be Thursday, October 22 at 7:00 PM at Emily’s backyard greenhouse. We will cover Chapters 1 through 4 (Planting Sweetgrass).\n\nLet me know if you can make it and if anyone would like to bring herbal tea or baked sourdough treats!\n\nCan’t wait,\nEmily`,
        isUnread: true,
        isStarred: true,
        hasAttachment: false,
        userHasReplied: true,
        gmailCategory: 'primary',
      },

      // 9. Updates - GitHub Security Advisory
      {
        id: 'msg-009',
        senderName: 'GitHub Dependabot',
        senderEmail: 'notifications@github.com',
        subject: '[calm-inbox/core] Moderate severity vulnerability in path-to-regexp',
        date: '2026-10-08T07:12:00Z',
        snippet: 'Dependabot has created PR #42 to automatically bump path-to-regexp to 6.3.0 and patch ReDoS.',
        bodyText: `Dependabot security advisory for repository calm-inbox/core:\n\nVulnerability: Regular expression denial of service (ReDoS)\nSeverity: Moderate (CVSS 5.3)\nAffected versions: < 6.3.0\nPatched version: 6.3.0\n\nA pull request (#42) has been automatically generated with passing CI checks. You may merge it directly from your pull request dashboard.\n\nGitHub Security Team`,
        isUnread: false,
        isStarred: false,
        hasAttachment: false,
        userHasReplied: false,
        gmailCategory: 'updates',
      },

      // 10. Work - Client Project Milestone
      {
        id: 'msg-010',
        senderName: 'Priya Mehta',
        senderEmail: 'priya.mehta@studio-orbit.com',
        subject: 'Client Milestone 3 Deliverable: Greenlight received from Helios',
        date: '2026-10-07T18:40:00Z',
        snippet: 'Helios team accepted the Phase 3 sprint deliverables without caveats! Great work everyone.',
        bodyText: `Team,\n\nFantastic news — Helena from Helios just sent over the official sign-off for Milestone 3. They specifically commended our attention to typographic hierarchy and the calming color palette.\n\nNext steps:\n1. Retro scheduled for Wednesday at 11 AM\n2. Final invoice dispatched by Marcus\n3. Pre-launch staging freeze set for next Friday\n\nTake a moment to celebrate — well deserved!\n\nPriya`,
        isUnread: false,
        isStarred: true,
        hasAttachment: false,
        userHasReplied: true,
        gmailCategory: 'primary',
      },

      // 11. Promotions - Mountain Gear
      {
        id: 'msg-011',
        senderName: 'North Peak Mountain Gear',
        senderEmail: 'gear@northpeakoutfitters.com',
        subject: 'Autumn trail jackets are here: 25% member perk',
        date: '2026-10-07T12:00:00Z',
        snippet: 'Waterproof ripstop, recycled merino linings, and earthy tones. Claim your VIP discount before Oct 15.',
        bodyText: `Hi Maya,\n\nGet ready for crisp morning hikes. Our new Alpine Birch windbreaker collection is built with 100% recycled ripstop nylon, taped seams, and breathable venting.\n\nAs a North Peak trail member, take 25% off any outerwear order with code EARTHPEAK through October 15.\n\nFree shipping and lifetime repairs included.\n\nNorth Peak Outfitters`,
        isUnread: false,
        isStarred: false,
        hasAttachment: false,
        userHasReplied: false,
        gmailCategory: 'promotions',
        unsubscribeUrl: 'https://northpeakoutfitters.com/mail/opt-out?email=mthorne@example.com',
      },

      // 12. Personal - Mom
      {
        id: 'msg-012',
        senderName: 'Eleanor Thorne',
        senderEmail: 'mom.eleanor@earthlink.net',
        subject: 'Autumn garden squash & thanksgiving planning',
        date: '2026-10-06T20:15:00Z',
        snippet: 'Maya darling, the butternut squashes are thriving. Let me know when you know your travel dates for November!',
        bodyText: `Hi Maya,\n\nJust thinking of you! Dad and I harvested twelve enormous butternut squashes from the garden this morning. I roasted two with sage and olive oil and immediately thought of you.\n\nLet us know when you have a better idea of your November travel schedule for Thanksgiving so we can get the guest room ready. No rush at all, just let us know whenever your flights are sorted.\n\nGive little Leo a head scratch from us!\n\nAll my love,\nMom`,
        isUnread: true,
        isStarred: true,
        hasAttachment: false,
        userHasReplied: true,
        gmailCategory: 'primary',
      },

      // 13. Bills - Apex Internet
      {
        id: 'msg-013',
        senderName: 'Apex Fiber Internet',
        senderEmail: 'support@apexfiber.net',
        subject: 'Monthly Fiber Service Invoice: $65.00 scheduled',
        date: '2026-10-06T08:30:00Z',
        snippet: 'Your symmetrical 1Gbps internet service invoice for Oct 15 - Nov 14 is ready. Autopay active.',
        bodyText: `Apex Fiber Billing Notice:\n\nAccount Number: 8820-4109\nBilling Cycle: 10/15/2026 - 11/14/2026\nPlan: 1000 Mbps Symmetrical Fiber\nMonthly Rate: $65.00\nScheduled Payment: October 18, 2026 via checking account ending 8192.\n\nNo action required if autopay is enabled. Contact 1-800-APEX-NET for assistance.`,
        isUnread: false,
        isStarred: false,
        hasAttachment: true,
        userHasReplied: false,
        gmailCategory: 'updates',
      },

      // 14. Work - Budget Approval
      {
        id: 'msg-014',
        senderName: 'Marcus Vance',
        senderEmail: 'm.vance@studio-orbit.com',
        subject: 'Action Needed: Q4 Software Tooling Budget Approval',
        date: '2026-10-05T17:05:00Z',
        snippet: 'Maya, please approve the departmental renewal for Figma Org and Gemini API allocations by Wednesday.',
        bodyText: `Hi Maya,\n\nWe are reconciling the Q4 software tooling requests before the quarterly board audit. Your team’s request includes:\n\n- Figma Enterprise: $1,440 / quarter\n- Google Cloud & Gemini API dev quota: $600 / quarter\n- Linear & Raycast: $240 / quarter\n\nTotal: $2,280 USD.\n\nPlease reply with your explicit confirmation or click "Approve" in the Ramp portal by Wednesday 5 PM so procurement can issue purchase orders.\n\nRegards,\nMarcus Vance\nFinance & Operations`,
        isUnread: true,
        isStarred: false,
        hasAttachment: false,
        userHasReplied: true,
        gmailCategory: 'primary',
      },

      // 15. Updates - UPS Package Delivery
      {
        id: 'msg-015',
        senderName: 'UPS My Choice',
        senderEmail: 'pkginfo@ups.com',
        subject: 'Delivered: Your package from Kinfolk Goods',
        date: '2026-10-05T13:42:00Z',
        snippet: 'Your parcel containing ceramic mugs was safely left by the front porch at 1:38 PM.',
        bodyText: `Tracking Number: 1Z992A048192049182\nSender: Kinfolk Goods Co.\nDelivery Date: Oct 05, 2026 at 1:38 PM\nLocation: Front Porch / Planter Box\n\nProof of delivery photo is available in your UPS My Choice dashboard. If you need support with this shipment, please report an issue within 48 hours.\n\nThank you for using UPS.`,
        isUnread: false,
        isStarred: false,
        hasAttachment: false,
        userHasReplied: false,
        gmailCategory: 'updates',
      },

      // 16. Promotions - Mechanical Keyboards
      {
        id: 'msg-016',
        senderName: 'Kinetic Keyboards',
        senderEmail: 'updates@kinetickeys.io',
        subject: 'Restock: Olive & Cream tactile switches + walnut wrist rests',
        date: '2026-10-04T15:00:00Z',
        snippet: 'Our quiet tactile switches are back in stock. Perfect for distraction-free typing in calm workspaces.',
        bodyText: `Hey artisan typists,\n\nBy popular demand, our Forest Thistle and Cream silent tactile switches are back in inventory. Designed with factory lube and 58g bottom-out springs, they offer deep acoustics without disturbing colleagues or home office calm.\n\nAlso introducing solid walnut wrist rests carved from sustainably harvested Appalachian timber.\n\nExplore the collection at kinetickeys.io.\n\nCheers,\nKinetic Team`,
        isUnread: false,
        isStarred: false,
        hasAttachment: false,
        userHasReplied: false,
        gmailCategory: 'promotions',
        unsubscribeUrl: 'https://kinetickeys.io/unsubscribe?token=user_39102',
      },

      // 17. Personal - Hiking Trip
      {
        id: 'msg-017',
        senderName: 'Lucas Miller',
        senderEmail: 'lucas.m.outdoors@gmail.com',
        subject: 'Point Reyes backpacking permit secured for late October!',
        date: '2026-10-04T09:18:00Z',
        snippet: 'Wildcat camp permit confirmed for Oct 24-25. Let me know if you can join and what gear we need to split.',
        bodyText: `Maya!\n\nI was sitting on recreation.gov at 7:00 AM sharp and managed to snag a 4-person campsite permit at Wildcat Camp in Point Reyes for the weekend of October 24-25!\n\nOcean views, 5-mile easy trail to Alamere Falls, and crisp coastal air. Carlos and Priya are down. Are you in?\n\nIf yes, let’s divide up stoves and water filtration so we don’t duplicate weight.\n\nLet me know by Friday!\nLucas`,
        isUnread: false,
        isStarred: false,
        hasAttachment: true,
        userHasReplied: true,
        gmailCategory: 'primary',
      },

      // 18. Work - 1:1 Sync Notes
      {
        id: 'msg-018',
        senderName: 'Jordan Taylor',
        senderEmail: 'jordan.taylor@studio-orbit.com',
        subject: 'Notes & Follow-ups from our Monthly 1:1',
        date: '2026-10-03T16:50:00Z',
        snippet: 'Great chat today regarding mentorship for junior designers and pacing the sprint roadmap.',
        bodyText: `Hi Maya,\n\nThank you for the open and constructive discussion during our monthly sync today. Recapping key action items:\n\n1. Pair with Leo on design system documentation by next sprint\n2. Block out "focus mornings" on Tuesdays and Thursdays to prevent meeting fatigue\n3. Review professional development stipend options (Design Leadership workshop)\n\nLet me know if I missed anything. Appreciate all your leadership across the team.\n\nBest,\nJordan`,
        isUnread: false,
        isStarred: false,
        hasAttachment: false,
        userHasReplied: false,
        gmailCategory: 'primary',
      },

      // 19. Bills - Gym Membership
      {
        id: 'msg-019',
        senderName: 'Metropolis Health & Gym',
        senderEmail: 'accounts@metropolishealth.com',
        subject: 'Monthly membership dues receipt - $75.00',
        date: '2026-10-03T02:00:00Z',
        snippet: 'Receipt for all-access climbing, yoga, and pool membership for October 2026.',
        bodyText: `Dear Member Maya Thorne,\n\nWe have received your monthly membership dues of $75.00 for October 2026.\n\nTier: All-Access Studio + Climbing Gym\nLocation: Mission District Campus\nNext Billing Date: November 01, 2026\n\nFriendly reminder: Autumn recovery workshops and sound bath sessions begin next Tuesday at 7 PM.\n\nStay well,\nMetropolis Member Services`,
        isUnread: false,
        isStarred: false,
        hasAttachment: true,
        userHasReplied: false,
        gmailCategory: 'updates',
      },

      // 20. Updates - Public Library Hold
      {
        id: 'msg-020',
        senderName: 'San Francisco Public Library',
        senderEmail: 'holds@sfpl.org',
        subject: 'Your hold is ready for pickup: "The Architecture of Happiness"',
        date: '2026-10-02T14:10:00Z',
        snippet: 'Please retrieve your hold at the Main Library pickup shelf #24 before closing on October 09.',
        bodyText: `Dear Maya Thorne,\n\nThe item you requested has arrived and is ready for pickup:\n\nTitle: The Architecture of Happiness\nAuthor: Alain de Botton\nPickup Branch: Main Library - 100 Larkin St\nShelf Location: Hold Shelf #24 (alphabetical by last name)\nHold Expiration Date: October 09, 2026\n\nItems not picked up by the expiration date will be released to the next patron.\n\nHappy reading!\nSFPL Automated Notification System`,
        isUnread: true,
        isStarred: false,
        hasAttachment: false,
        userHasReplied: false,
        gmailCategory: 'updates',
      },

      // 21. Work - User Research Report
      {
        id: 'msg-021',
        senderName: 'Elena Rostova',
        senderEmail: 'elena.rostova@studio-orbit.com',
        subject: 'Synthesis: 12 User Interviews on Email Overload & Focus',
        date: '2026-10-02T10:30:00Z',
        snippet: 'Full synthesis deck is ready. Key finding: 83% of users feel anxiety from badge counts and cluttered inboxes.',
        bodyText: `Hi Maya & Design Team,\n\nI’ve wrapped up analysis on our 12 qualitative in-depth user interviews. The report is linked on Google Drive.\n\nTop takeaways:\n- 83% of knowledge workers report visceral stress when opening their inbox on Monday mornings\n- Users want gentle prioritization: "Tell me what 3 things matter, tuck the rest away peacefully"\n- Bold unread dots and calm organic badges scored 40% higher on emotional satisfaction than red alerts\n\nLet’s review during Wednesday product critique.\n\nWarmly,\nElena Rostova\nLead UX Researcher`,
        isUnread: false,
        isStarred: true,
        hasAttachment: true,
        userHasReplied: true,
        gmailCategory: 'primary',
      },

      // 22. Promotions - Powell's Books
      {
        id: 'msg-022',
        senderName: "Powell's Books",
        senderEmail: 'newsletter@powells.com',
        subject: 'Staff Picks: Quiet essay collections and nature literature',
        date: '2026-10-01T16:00:00Z',
        snippet: 'Handpicked titles for rainy afternoons. Free shipping on orders over $35 with code CALMREADS.',
        bodyText: `Greetings book lover,\n\nAs the autumn chill sets in, our booksellers have curated our favorite reflective non-fiction and contemplative poetry.\n\nHighlights this week:\n- "The Sound of a Wild Snail Eating" by Elisabeth Tova Bailey\n- "World of Wonders" by Aimee Nezhukumatathil\n- "A Philosophy of Walking" by Frédéric Gros\n\nUse coupon CALMREADS for complimentary book-rate shipping on all orders.\n\nFrom our shelves to yours,\nPowell's City of Books`,
        isUnread: false,
        isStarred: false,
        hasAttachment: false,
        userHasReplied: false,
        gmailCategory: 'promotions',
        unsubscribeUrl: 'https://powells.com/unsubscribe?list=weekly_staff_picks&uid=9201',
      },

      // 23. Personal - Dad
      {
        id: 'msg-023',
        senderName: 'Robert Thorne',
        senderEmail: 'robert.thorne@gmail.com',
        subject: 'Old wood carving tools & weekend workshop',
        date: '2026-10-01T11:45:00Z',
        snippet: 'Found grandpa’s Swiss chisels in the garage attic. Cleaned up the brass handles for you!',
        bodyText: `Hey Maya,\n\nI was tidying up the tool shed yesterday and came across your grandfather’s wooden toolbox. Inside were his Swiss wood carving gouges and brass-backed dovetail saw.\n\nI took some steel wool and camellia oil to them, and they are in beautiful working condition. I wrapped them in canvas and set them aside for the next time you visit.\n\nHope your week is going smoothly!\nLove,\nDad`,
        isUnread: false,
        isStarred: false,
        hasAttachment: true,
        userHasReplied: true,
        gmailCategory: 'primary',
      },

      // 24. Bills - Spotify Premium
      {
        id: 'msg-024',
        senderName: 'Spotify',
        senderEmail: 'no-reply@spotify.com',
        subject: 'Receipt: Your Spotify Duo monthly subscription ($14.99)',
        date: '2026-09-30T18:00:00Z',
        snippet: 'Thank you for subscribing to Spotify Duo. Your payment of $14.99 was processed on Sept 30.',
        bodyText: `Spotify Subscription Receipt\n\nPlan: Spotify Premium Duo\nPrice: $14.99 / month\nPayment method: PayPal\nBilling Date: Sept 30, 2026\nNext Billing Date: Oct 30, 2026\n\nListen to ad-free music, download offline playlists, and enjoy lossless audio streaming.\n\nHave questions? Visit support.spotify.com.`,
        isUnread: false,
        isStarred: false,
        hasAttachment: false,
        userHasReplied: false,
        gmailCategory: 'updates',
      },

      // 25. Updates - Figma Workspace
      {
        id: 'msg-025',
        senderName: 'Figma Notifications',
        senderEmail: 'notifications@figma.com',
        subject: 'Sarah Lin mentioned you in "Calm Inbox - Design System V2"',
        date: '2026-09-30T13:25:00Z',
        snippet: '@Maya Thorne: "Check out the corner radius tokens on page 3. Switched to 20px and 28px as requested."',
        bodyText: `Figma comment on Calm Inbox - Design System V2:\n\nSarah Lin wrote:\n"@Maya Thorne Check out the corner radius tokens on page 3. Switched to 20px and 28px as requested. Also softened the stroke opacity on muted states to 30%."\n\nClick to view comment and reply directly on canvas: https://figma.com/file/calm-inbox/comment-38192\n\nFigma Team`,
        isUnread: true,
        isStarred: false,
        hasAttachment: false,
        userHasReplied: false,
        gmailCategory: 'social',
      },

      // 26. Work - Security Compliance
      {
        id: 'msg-026',
        senderName: 'Alex Chen',
        senderEmail: 'alex.chen@studio-orbit.com',
        subject: 'Annual SOC-2 Compliance Training - Due by Oct 15',
        date: '2026-09-29T15:00:00Z',
        snippet: 'Friendly reminder to complete your 20-minute security awareness video module before the mid-month audit.',
        bodyText: `Hi Team,\n\nOur annual SOC-2 Type II observation window begins next week. As part of our mandatory company compliance policies, all team members must finish the 2026 Security Awareness refresher course.\n\nPlatform: SecureCode Academy\nDuration: ~20 minutes\nDeadline: October 15, 2026, 5:00 PM PST\n\nLink to your dashboard: https://securecode.internal/training/maya-thorne\n\nThank you for keeping our infrastructure and customer data secure!\n\nAlex Chen\nDevOps & Security Lead`,
        isUnread: true,
        isStarred: false,
        hasAttachment: false,
        userHasReplied: false,
        gmailCategory: 'primary',
      },

      // 27. Promotions - Sunward Market
      {
        id: 'msg-027',
        senderName: 'Sunward Organic Market',
        senderEmail: 'community@sunwardmarket.com',
        subject: 'Harvest CSA boxes: Farm fresh persimmons, honeycrisp apples, and wild mushrooms',
        date: '2026-09-29T08:15:00Z',
        snippet: 'Reserve your weekly autumn farm share box. Locally grown without synthetic pesticides.',
        bodyText: `Hello neighbor!\n\nThe first autumn farm harvest has arrived at Sunward. This week’s harvest box features:\n- Fuyu persimmons from Sebastopol\n- Honeycrisp organic apples from Sonoma\n- Chanterelle and King Oyster mushrooms\n- Delicata squash and baby Tuscan kale\n\nReserve your weekly subscription at sunwardmarket.com or visit our pantry on 24th Street.\n\nSunward Farm Collective`,
        isUnread: false,
        isStarred: false,
        hasAttachment: false,
        userHasReplied: false,
        gmailCategory: 'promotions',
        unsubscribeUrl: 'https://sunwardmarket.com/unsubscribe?id=sub_891024',
      },

      // 28. Personal - Aunt Clara
      {
        id: 'msg-028',
        senderName: 'Aunt Clara',
        senderEmail: 'clara.m.baker@verizon.net',
        subject: 'Grandma’s cardamon tea bread recipe attached',
        date: '2026-09-28T19:30:00Z',
        snippet: 'Here is the handwritten recipe card I promised you! Bake at 350 for 42 minutes.',
        bodyText: `Dearest Maya,\n\nI finally remembered to scan grandma’s recipe notebook! Attached is her famous cardamom and crushed almond tea bread.\n\nThe secret is crushing fresh green cardamom pods in the mortar rather than using store-bought ground cardamom. It fills the whole house with the most soothing aroma.\n\nLet me know how your loaf turns out when you bake it!\n\nMuch love,\nAunt Clara`,
        isUnread: false,
        isStarred: true,
        hasAttachment: true,
        userHasReplied: true,
        gmailCategory: 'primary',
      },

      // 29. Bills - Cloudflare Domains
      {
        id: 'msg-029',
        senderName: 'Cloudflare Registrar',
        senderEmail: 'billing@cloudflare.com',
        subject: 'Domain renewal confirmation: calminbox.app ($9.77)',
        date: '2026-09-28T12:00:00Z',
        snippet: 'Your domain calminbox.app has been automatically renewed for 1 year through Oct 2027.',
        bodyText: `Cloudflare Registrar Receipt\n\nDomain: calminbox.app\nTerm: 1 Year (expires Oct 28, 2027)\nFee: $9.77 USD (at-cost pricing)\nPayment method: Mastercard ending in 1092\nStatus: Active & Protected by DNSSEC\n\nNo further action required. Manage DNS records from your Cloudflare dashboard.\n\nThank you,\nCloudflare Registrar`,
        isUnread: false,
        isStarred: false,
        hasAttachment: true,
        userHasReplied: false,
        gmailCategory: 'updates',
      },

      // 30. Updates - Notion Workspace
      {
        id: 'msg-030',
        senderName: 'Notion Notifications',
        senderEmail: 'mail@notion.so',
        subject: 'Weekly workspace digest: 8 pages updated in Studio Orbit',
        date: '2026-09-27T17:00:00Z',
        snippet: 'Pages updated: Design System Guidelines, Sprint 34 Board, Q4 Product Roadmap, Brand Palette Tokens.',
        bodyText: `Your Studio Orbit Notion digest for the week:\n\nRecent activity:\n- Maya Thorne edited "Design Tokens - Color & Radii"\n- David Patel commented on "Offline Architecture Spec"\n- Sarah Lin created "Iconography and Organic Shapes"\n\nReview updates on Notion: https://notion.so/studio-orbit/home\n\nStay organized,\nThe Notion Team`,
        isUnread: false,
        isStarred: false,
        hasAttachment: false,
        userHasReplied: false,
        gmailCategory: 'updates',
      },

      // 31. Work - Speaker Invitation
      {
        id: 'msg-031',
        senderName: 'Design Systems SF',
        senderEmail: 'organizers@designsystemssf.org',
        subject: 'Invitation to give a lightning talk on Calm UI Design (Nov 12)',
        date: '2026-09-26T21:10:00Z',
        snippet: 'We loved your writing on tonal surfaces and anti-fatigue interfaces. Would you speak at our autumn meetup?',
        bodyText: `Dear Maya,\n\nThe organizing committee of Design Systems SF was blown away by your recent post on "Designing for Calm: Eliminating Alert Fatigue in Daily Tools."\n\nWe are hosting our Autumn Meetup in downtown San Francisco on Thursday, November 12, and would be honored if you could deliver a 15-minute lightning talk on crafting calm software experiences.\n\nTravel stipend and speaker dinner provided. Please let us know if your calendar permits by October 18.\n\nWarm regards,\nElena & Marcus\nDesign Systems SF Organizers`,
        isUnread: false,
        isStarred: true,
        hasAttachment: false,
        userHasReplied: false,
        gmailCategory: 'primary',
      },

      // 32. Promotions - Ergonomic Chairs
      {
        id: 'msg-032',
        senderName: 'Lumina Design Lab',
        senderEmail: 'studio@luminaseating.com',
        subject: 'The Sage Mesh Ergonomic Task Chair - Pre-order access',
        date: '2026-09-26T14:00:00Z',
        snippet: 'Crafted with breathable wool mesh, recycled aluminum, and natural posture support. 15% VIP launch code.',
        bodyText: `Hi Maya,\n\nWe spent two years testing active lumbar kinematics. The result is the Lumina Sage Chair — designed to blend seamlessly into residential interiors rather than look like cockpit machinery.\n\nUse code CALMSPACE for 15% off pre-orders through end of month.\n\n100-day in-home trial. Free white-glove delivery.\n\nLumina Seating`,
        isUnread: false,
        isStarred: false,
        hasAttachment: false,
        userHasReplied: false,
        gmailCategory: 'promotions',
        unsubscribeUrl: 'https://luminaseating.com/opt-out?email=maya.thorne@example.com',
      },

      // 33. Personal - College Friend
      {
        id: 'msg-033',
        senderName: 'Sophia Turner',
        senderEmail: 'sophia.turner.arch@gmail.com',
        subject: 'Visiting SF next weekend! Let’s get matcha?',
        date: '2026-09-25T19:40:00Z',
        snippet: 'Hey Maya! I’m in town for an architecture symposium Oct 17-19. Would love to catch up for an hour or two!',
        bodyText: `Maya!!\n\nLong time no see! I am flying into San Francisco next Friday for the AIA Sustainable Housing Symposium. I have Saturday afternoon (Oct 18) completely free between 2 PM and 5 PM.\n\nWould you want to grab matcha or coffee around Hayes Valley? Would love to hear about everything you’ve been building.\n\nText me when you get this!\nSophia`,
        isUnread: false,
        isStarred: false,
        hasAttachment: false,
        userHasReplied: true,
        gmailCategory: 'primary',
      },

      // 34. Bills - Water District
      {
        id: 'msg-034',
        senderName: 'Greenleaf Water District',
        senderEmail: 'ebill@greenleafwater.gov',
        subject: 'Bi-Monthly Water & Sewage Utility Bill ($52.30)',
        date: '2026-09-24T16:20:00Z',
        snippet: 'Statement period: 08/01 - 09/30. Total due: $52.30 by October 20, 2026.',
        bodyText: `Greenleaf Municipal Water District\n\nService Address: 412 Pine St, Apt 3B\nAmount: $52.30\nDue Date: October 20, 2026\nStatus: Pending Auto-debit\n\nWater conservation notice: Tier 1 usage maintained. Thank you for your continued water stewardship.\n\nFor account questions, contact utility.support@greenleafwater.gov.`,
        isUnread: false,
        isStarred: false,
        hasAttachment: true,
        userHasReplied: false,
        gmailCategory: 'updates',
      },

      // 35. Updates - Slack Security
      {
        id: 'msg-035',
        senderName: 'Slack Security',
        senderEmail: 'no-reply@slack.com',
        subject: 'New sign-in detected on Chrome macOS for Studio Orbit workspace',
        date: '2026-09-23T11:15:00Z',
        snippet: 'A new session was initiated from IP 192.0.2.42 (San Francisco, CA). If this was you, no action is needed.',
        bodyText: `We noticed a new login to your Slack account:\n\nWorkspace: Studio Orbit\nBrowser: Google Chrome on macOS 16.2\nLocation: San Francisco, United States\nTime: Sept 23, 2026 at 11:14 AM PDT\n\nIf this was you, you can safely ignore this notification. If you did not authorize this login, please immediately revoke all active sessions at slack.com/account/settings.\n\nSlack Security`,
        isUnread: false,
        isStarred: false,
        hasAttachment: false,
        userHasReplied: false,
        gmailCategory: 'updates',
      },

      // 36. Promotions - Peak Airline Deals
      {
        id: 'msg-036',
        senderName: 'Peak Wander Travel',
        senderEmail: 'deals@peakwandertravel.com',
        subject: 'Low autumn fares to Kyoto, Vancouver, and Zurich',
        date: '2026-09-22T13:00:00Z',
        snippet: 'Roundtrip non-stop routes starting at $389. Book by midnight Thursday for travel through February.',
        bodyText: `Explore the quiet season.\n\nFares from SFO / OAK:\n- Vancouver (YVR): $189 RT\n- Kyoto / Osaka (KIX): $690 RT\n- Zurich (ZRH): $540 RT\n\nFlexible cancellation policy and no change fees for tickets purchased within the promotional window.\n\nSafe journeys,\nPeak Wander Travel`,
        isUnread: false,
        isStarred: false,
        hasAttachment: false,
        userHasReplied: false,
        gmailCategory: 'promotions',
        unsubscribeUrl: 'https://peakwandertravel.com/preferences?u=910248-maya',
      },

      // 37. Personal - Coffee Catchup
      {
        id: 'msg-037',
        senderName: 'Oliver Vance',
        senderEmail: 'oliver.vance@hey.com',
        subject: 'Quick question about typography pairing & coffee next week',
        date: '2026-09-21T15:25:00Z',
        snippet: 'Hey Maya, what was that humanist sans-serif font you used for the headline scale? Plus Jakarta?',
        bodyText: `Hi Maya,\n\nI was looking back through your slide deck from the June design summit. What was the exact typeface family you recommended pairing with DM Sans? Was it Plus Jakarta Sans or Manrope?\n\nAlso, let me know if you have 20 minutes for a coffee walk around the park sometime next Wednesday!\n\nBest,\nOliver`,
        isUnread: false,
        isStarred: false,
        hasAttachment: false,
        userHasReplied: true,
        gmailCategory: 'primary',
      },

      // 38. Work - Sprint Planning Agenda
      {
        id: 'msg-038',
        senderName: 'Priya Mehta',
        senderEmail: 'priya.mehta@studio-orbit.com',
        subject: 'Sprint 35 Planning Agenda: AI triage, RAG index & latency targets',
        date: '2026-09-20T17:45:00Z',
        snippet: 'Review the sprint backlog before our 10 AM Monday kickoff. Latency target: under 600ms for semantic queries.',
        bodyText: `Hi Team,\n\nHere is our agenda for Monday’s Sprint 35 kickoff:\n\n1. Review customer feedback on category triage\n2. Establish RAG search benchmark: <600ms response time with Gemini Flash and client-side IndexedDB vector cache\n3. Accessibility review: keyboard focus indicators and touch targets >= 48px\n\nPlease add any extra topics to the shared doc before end of day.\n\nHave a restful weekend!\nPriya`,
        isUnread: false,
        isStarred: false,
        hasAttachment: false,
        userHasReplied: false,
        gmailCategory: 'primary',
      },

      // 39. Updates - ProtonMail Status
      {
        id: 'msg-039',
        senderName: 'Proton Status',
        senderEmail: 'status@proton.me',
        subject: 'Scheduled maintenance notice: Oct 18, 02:00 - 02:30 UTC',
        date: '2026-09-19T20:00:00Z',
        snippet: 'Brief 30-minute database index optimization. Web interface and mobile push may experience brief pauses.',
        bodyText: `Proton Services Infrastructure Maintenance\n\nDate: October 18, 2026\nTime: 02:00 UTC - 02:30 UTC\nAffected Services: Proton Mail Web Application\nImpact: Brief intermittent delays in push sync\n\nNo mail will be lost during this maintenance window; incoming messages will be queued and delivered promptly upon completion.\n\nCheck status.proton.me for real-time telemetry.\n\nProton Operations Team`,
        isUnread: false,
        isStarred: false,
        hasAttachment: false,
        userHasReplied: false,
        gmailCategory: 'updates',
      },

      // 40. Promotions - Artisan Teas
      {
        id: 'msg-040',
        senderName: 'Komorebi Tea House',
        senderEmail: 'tea@komorebitea.jp',
        subject: 'Fresh harvest Genmaicha and Roasted Hojicha arrived',
        date: '2026-09-18T10:00:00Z',
        snippet: 'Toasted brown rice green tea from Shizuoka, Japan. Low caffeine, deeply calming aroma.',
        bodyText: `Dear tea drinker,\n\nWe are delighted to announce that our autumn batch of organic Genmaicha and deeply roasted dark Hojicha has arrived at our warehouse.\n\nBrewing instructions:\n- Genmaicha: 85°C, 60 seconds\n- Roasted Hojicha: 95°C, 45 seconds\n\nOrder today for complimentary tin storage canisters.\n\nWith gratitude,\nKomorebi Tea House`,
        isUnread: false,
        isStarred: false,
        hasAttachment: false,
        userHasReplied: false,
        gmailCategory: 'promotions',
        unsubscribeUrl: 'https://komorebitea.jp/unsubscribe?token=komorebi_98124',
      },
    ];

const ORIGINAL_BASE_TIME_MS = 1791784800000; // 2026-10-12T06:00:00.000Z

function computeRelativeDate(fixedDateStr: string, baseTimeMs: number): string {
  const origMs = new Date(fixedDateStr).getTime();
  const offset = ORIGINAL_BASE_TIME_MS - origMs;
  return new Date(baseTimeMs - offset).toISOString();
}

export function getOriginalHandwrittenEmails(baseTimeMs: number = Date.now()): Email[] {
  return RAW_HANDWRITTEN_EMAILS.map((e) => ({
    ...e,
    date: computeRelativeDate(e.date, baseTimeMs),
    isTrashed: false,
    isArchived: false,
  }));
}

export class MockEmailProvider implements EmailProvider {
  private initialSampleEmails: Email[];
  private emails: Email[];
  private blockedSenders: Set<string>;

  constructor() {
    this.blockedSenders = new Set<string>();
    const baseTime = Date.now();
    this.initialSampleEmails = getOriginalHandwrittenEmails(baseTime);
    this.emails = [...this.initialSampleEmails];
    this.refreshEmailsDataset(baseTime);
    this.loadPersistedReadStates();
    this.loadPersistedTrashArchiveStates();
  }

  /**
   * Refreshes the active emails array based on the large dataset toggle.
   */
  public refreshEmailsDataset(baseTimeMs: number = Date.now()): void {
    let useLarge = true;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_USE_LARGE_DATASET);
        if (stored !== null) {
          useLarge = stored === 'true';
        }
      } catch (e) {
        useLarge = true;
      }
    }

    if (useLarge) {
      const generated = generateSampleEmails(baseTimeMs);
      const existingIds = new Set(this.initialSampleEmails.map((e) => e.id));
      const filteredGenerated = generated.filter((e) => !existingIds.has(e.id));
      this.emails = [...this.initialSampleEmails, ...filteredGenerated];
    } else {
      this.emails = [...this.initialSampleEmails];
    }
  }

  async listEmails(): Promise<Email[]> {
    this.refreshEmailsDataset();
    this.loadPersistedReadStates();
    this.loadPersistedTrashArchiveStates();
    // Return all emails except those from blocked senders
    return this.emails.filter(
      (email) => !this.blockedSenders.has(email.senderEmail.toLowerCase())
    );
  }

  async getEmail(id: string): Promise<Email | null> {
    const found = this.emails.find((email) => email.id === id);
    if (!found) return null;
    if (this.blockedSenders.has(found.senderEmail.toLowerCase())) {
      return null;
    }
    return { ...found };
  }

  async blockSender(senderEmail: string): Promise<void> {
    this.blockedSenders.add(senderEmail.toLowerCase());
  }

  // Mark emails as read
  async markAsRead(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    this.emails = this.emails.map((email) => {
      if (idSet.has(email.id)) {
        return { ...email, isUnread: false };
      }
      return email;
    });
    this.persistReadStates();
  }

  // Mark emails as unread (Undo)
  async markAsUnread(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    this.emails = this.emails.map((email) => {
      if (idSet.has(email.id)) {
        return { ...email, isUnread: true };
      }
      return email;
    });
    this.persistReadStates();
  }

  // Trash emails
  async trashEmails(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    this.emails = this.emails.map((email) => {
      if (idSet.has(email.id)) {
        return { ...email, isTrashed: true };
      }
      return email;
    });
    this.persistTrashArchiveStates();
  }

  // Archive emails
  async archiveEmails(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    this.emails = this.emails.map((email) => {
      if (idSet.has(email.id)) {
        return { ...email, isArchived: true };
      }
      return email;
    });
    this.persistTrashArchiveStates();
  }

  // Restore emails (works for both trashed and archived)
  async restoreEmails(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    this.emails = this.emails.map((email) => {
      if (idSet.has(email.id)) {
        return { ...email, isTrashed: false, isArchived: false };
      }
      return email;
    });
    this.persistTrashArchiveStates();
  }

  // Helper methods for unblocking and managing blocked senders
  async unblockSender(senderEmail: string): Promise<void> {
    this.blockedSenders.delete(senderEmail.toLowerCase());
  }

  async getBlockedSenders(): Promise<string[]> {
    return Array.from(this.blockedSenders);
  }

  private persistReadStates(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stateMap: Record<string, boolean> = {};
        for (const e of this.emails) {
          stateMap[e.id] = e.isUnread;
        }
        window.localStorage.setItem(STORAGE_KEY_READ_OVERRIDES_V1, JSON.stringify(stateMap));
      }
    } catch (e) {
      console.warn('Failed to persist email read state:', e);
    }
  }

  private loadPersistedReadStates(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY_READ_OVERRIDES_V1);
        if (raw) {
          const stateMap = JSON.parse(raw) as Record<string, boolean>;
          this.emails = this.emails.map((e) => {
            if (typeof stateMap[e.id] === 'boolean') {
              return { ...e, isUnread: stateMap[e.id] };
            }
            return e;
          });
        }
      }
    } catch (e) {
      console.warn('Failed to restore email read state:', e);
    }
  }

  private persistTrashArchiveStates(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stateMap: Record<string, { isTrashed?: boolean; isArchived?: boolean }> = {};
        for (const e of this.emails) {
          if (e.isTrashed || e.isArchived) {
            stateMap[e.id] = {
              isTrashed: Boolean(e.isTrashed),
              isArchived: Boolean(e.isArchived),
            };
          }
        }
        window.localStorage.setItem(STORAGE_KEY_TRASH_ARCHIVE_STATES_V1, JSON.stringify(stateMap));
      }
    } catch (e) {
      console.warn('Failed to persist email trash/archive state:', e);
    }
  }

  private loadPersistedTrashArchiveStates(): void {
    try {
      let stateMap: Record<string, { isTrashed?: boolean; isArchived?: boolean }> = {};
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STORAGE_KEY_TRASH_ARCHIVE_STATES_V1);
        if (raw) {
          stateMap = JSON.parse(raw) as Record<string, { isTrashed?: boolean; isArchived?: boolean }>;
        }
      }
      this.emails = this.emails.map((e) => {
        const entry = stateMap[e.id];
        return {
          ...e,
          isTrashed: entry ? Boolean(entry.isTrashed) : Boolean(e.isTrashed || false),
          isArchived: entry ? Boolean(entry.isArchived) : Boolean(e.isArchived || false),
        };
      });
    } catch (e) {
      console.warn('Failed to restore email trash/archive state:', e);
    }
  }

  async resetReadStates(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY_READ_OVERRIDES_V1);
        window.localStorage.removeItem(STORAGE_KEY_TRASH_ARCHIVE_STATES_V1);
      }
    } catch (e) {}
  }

  async resetSampleEmails(): Promise<Email[]> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY_READ_OVERRIDES_V1);
        window.localStorage.removeItem(STORAGE_KEY_TRASH_ARCHIVE_STATES_V1);
      }
    } catch (e) {
      console.warn('Failed to clear persisted email states on reset:', e);
    }

    let useLarge = true;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(STORAGE_KEY_USE_LARGE_DATASET);
        if (val !== null) {
          useLarge = JSON.parse(val);
        }
      }
    } catch (e) {}

    const baseTimeMs = Date.now();
    this.initialSampleEmails = getOriginalHandwrittenEmails(baseTimeMs);
    const freshGenerated = generateSampleEmails(baseTimeMs);

    if (useLarge) {
      const existingIds = new Set(this.initialSampleEmails.map((e) => e.id));
      const filteredGenerated = freshGenerated.filter((e) => !existingIds.has(e.id));
      this.emails = [
        ...this.initialSampleEmails,
        ...filteredGenerated,
      ];
    } else {
      this.emails = [...this.initialSampleEmails];
    }

    return this.emails.filter(
      (email) => !this.blockedSenders.has(email.senderEmail.toLowerCase())
    );
  }
}
