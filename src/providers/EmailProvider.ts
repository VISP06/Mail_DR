import { Email } from '../types';

export interface EmailProvider {
  listEmails(): Promise<Email[]>;
  getEmail(id: string): Promise<Email | null>;
  blockSender(senderEmail: string): Promise<void>;
  markAsRead(ids: string[]): Promise<void>;
  markAsUnread(ids: string[]): Promise<void>;
}
