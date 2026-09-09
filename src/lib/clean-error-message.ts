/**
 * Errors bubbling out of sync and mutation steps often carry raw payloads
 * (GraphQL client errors append the full request/response as JSON). UI
 * surfaces only ever show the human-readable sentence in front of that.
 */
export function cleanErrorMessage(
  value: string | undefined | null,
): string | null {
  if (!value) return null;

  let message = value.trim();

  // A message that *is* JSON: pull out a nested message field if there is one.
  if (message.startsWith("{") || message.startsWith("[")) {
    try {
      const parsed = JSON.parse(message) as {
        message?: string;
        errors?: { message?: string }[];
      };
      message = parsed.message ?? parsed.errors?.[0]?.message ?? "";
    } catch {
      message = "";
    }
  }

  // A sentence with a JSON payload appended: keep only the sentence.
  const jsonStart = message.search(/[:\s]\s*[[{]"/);
  if (jsonStart !== -1) message = message.slice(0, jsonStart);

  message = message.replace(/\s+/g, " ").replace(/[:;,\s]+$/, "").trim();
  if (message.length > 140) message = `${message.slice(0, 139).trimEnd()}…`;

  return message || null;
}
