import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates a short, readable order code from a UUID
 * Format: #A001, #B002, etc. (letter + 3 digits)
 * @param uuid - The order UUID
 * @returns Short order code like #A015
 */
export function formatOrderCode(uuid: string): string {
  if (!uuid || uuid.length < 8) return '#????';
  
  // Use first 4 chars of UUID to generate a deterministic short code
  const hex = uuid.replace(/-/g, '').substring(0, 4);
  const num = parseInt(hex, 16);
  
  // Generate letter (A-Z) from first part and number (001-999) from second part
  const letter = String.fromCharCode(65 + (num % 26)); // A-Z
  const number = String(num % 1000).padStart(3, '0'); // 000-999
  
  return `#${letter}${number}`;
}
