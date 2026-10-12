import React from 'react';
import { Email } from '../types';

/**
 * Client-side email search matching sender name, sender email address, subject, and email body text.
 * Case-insensitive and collapses multiple whitespace characters.
 */
export function searchEmails(query: string, emails: Email[]): Email[] {
  const clean = query.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!clean) return emails;

  return emails.filter((email) => {
    const senderName = (email.senderName || '').toLowerCase();
    const senderEmail = (email.senderEmail || '').toLowerCase();
    const subject = (email.subject || '').toLowerCase();
    const body = (email.bodyText || '').toLowerCase();

    return (
      senderName.includes(clean) ||
      senderEmail.includes(clean) ||
      subject.includes(clean) ||
      body.includes(clean)
    );
  });
}

/**
 * Safely highlights matching query terms in text using a soft chartreuse background.
 * Works seamlessly in both light and dark themes.
 */
export function highlightMatch(text: string, query: string): React.ReactNode {
  const clean = query.trim().replace(/\s+/g, ' ');
  if (!clean || !text) return text;

  // Escape special regex characters in query
  const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  if (parts.length <= 1) return text;

  return parts.map((part, index) => {
    if (part.toLowerCase() === clean.toLowerCase()) {
      return (
        <mark
          key={index}
          className="bg-[#E8F49A]/80 dark:bg-[#E8F49A]/30 text-[#292D1E] dark:text-[#F5F3E8] font-bold rounded-xs px-0.5"
          style={{ mixBlendMode: 'normal' }}
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}
