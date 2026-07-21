/**
 * Truncates a string to a maximum length, adding an ellipsis if needed.
 *
 * @example
 * truncate("Hello world", 8) // "Hello..."
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Returns the initials of a full name (up to 2 characters).
 * Useful for avatar placeholders.
 *
 * @example
 * initials("Jose Aguilera") // "JA"
 * initials("Alice")         // "A"
 */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}
