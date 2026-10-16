import {
  Mail,
  MailOpen,
  Briefcase,
  Heart,
  Receipt,
  Tag,
  Bell,
  GraduationCap,
  Folder,
  LucideIcon,
} from 'lucide-react';

/**
 * Category Art Icon Lookup
 *
 * Mapped by category id and by name (case-insensitive):
 * - All emails = Mail
 * - Unread = MailOpen
 * - Work = Briefcase
 * - Personal = Heart
 * - Bills = Receipt
 * - Promotions = Tag
 * - Updates = Bell
 * - College = GraduationCap
 * - Uncategorized and any other or user-created category = Folder
 * (Sparkles icon is explicitly never used for categories)
 */
const CATEGORY_ICON_LOOKUP: Record<string, LucideIcon> = {
  all: Mail,
  'all emails': Mail,
  'all-emails': Mail,

  unread: MailOpen,
  'unread emails': MailOpen,

  work: Briefcase,
  business: Briefcase,

  personal: Heart,
  family: Heart,

  bills: Receipt,
  finance: Receipt,
  receipts: Receipt,

  promotions: Tag,
  promos: Tag,
  deals: Tag,

  updates: Bell,
  notifications: Bell,

  college: GraduationCap,
  school: GraduationCap,
  education: GraduationCap,
  university: GraduationCap,

  uncategorized: Folder,
};

export function getCategoryIcon(id?: string, name?: string): LucideIcon {
  if (id) {
    const key = id.trim().toLowerCase();
    if (CATEGORY_ICON_LOOKUP[key]) {
      return CATEGORY_ICON_LOOKUP[key];
    }
  }

  if (name) {
    const key = name.trim().toLowerCase();
    if (CATEGORY_ICON_LOOKUP[key]) {
      return CATEGORY_ICON_LOOKUP[key];
    }
  }

  // Default for user-created categories, uncategorized, or unknown categories
  return Folder;
}
