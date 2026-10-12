import { EmailCategory } from '../types';

export const APP_NAME = 'Calm Inbox';

export const APP_TAGLINE = 'A quiet space for what matters today.';

/**
 * Single source of truth breakpoint for responsive navigation:
 * Width below 768px: show only the bottom bar.
 * Width 768px and above: show only the side rail.
 */
export const NAV_BREAKPOINT_PX = 768;

export const DEMO_USER = {
  name: 'Maya',
  email: 'maya@example.com',
  initial: 'M',
};

export const PALETTE = {
  // Accents
  chartreuse: '#E8F49A',
  pink: '#E6A0C7',
  lavender: '#C8B8D8',
  peach: '#F0A66F',
  sage: '#74795A',

  // Dark Theme
  dark: {
    background: '#25291B',
    surface: '#2F3424',
    surfaceElevated: '#383E2C',
    buttonFill: '#E8F49A',
    buttonText: '#292D1E',
    bodyText: '#F5F3E8',
    secondaryText: '#B5B79A',
    border: 'rgba(116, 121, 90, 0.3)',
  },

  // Light Theme
  light: {
    background: '#F2F0D5',
    surface: '#FBFAEC',
    surfaceElevated: '#FFFFFF',
    buttonFill: '#292D1E',
    buttonText: '#E8F49A',
    bodyText: '#292D1E',
    secondaryText: '#5C6044',
    border: 'rgba(116, 121, 90, 0.3)',
  },

  // Cream reading surface (used in both themes for open email view)
  readingSurface: {
    background: '#FAF7EE',
    text: '#292D1E',
    secondaryText: '#5C6044',
    border: 'rgba(116, 121, 90, 0.25)',
  },
};

export const UNCATEGORIZED_CATEGORY_ID = 'cat-uncategorized';

export const UNCATEGORIZED_CATEGORY: EmailCategory = {
  id: UNCATEGORIZED_CATEGORY_ID,
  name: 'Uncategorized',
  description: 'Emails that do not fit into other categories or require triage.',
  color: '#B5B79A',
  isSystem: true,
};

export const DEFAULT_CATEGORIES: EmailCategory[] = [
  {
    id: 'work',
    name: 'Work',
    description: 'Project discussions, design reviews, team memos, sprint updates, client correspondence, and work tasks.',
    color: '#C8B8D8', // lavender
    isSystem: false,
  },
  {
    id: 'personal',
    name: 'Personal',
    description: 'Notes from friends, family get-togethers, dinner plans, personal photos, book club, and personal hobbies.',
    color: '#E6A0C7', // pink
    isSystem: false,
  },
  {
    id: 'bills',
    name: 'Bills',
    description: 'Invoices, utility statements, rent receipts, card statements, renewals, and financial notices.',
    color: '#F0A66F', // peach
    isSystem: false,
  },
  {
    id: 'promotions',
    name: 'Promotions',
    description: 'Sales deals, seasonal discounts, store newsletters, coupons, and promotional marketing announcements.',
    color: '#E8F49A', // chartreuse
    isSystem: false,
  },
  {
    id: 'updates',
    name: 'Updates',
    description: 'Automated service notifications, GitHub alerts, delivery status, password confirmations, and app receipts.',
    color: '#74795A', // sage
    isSystem: false,
  },
];
