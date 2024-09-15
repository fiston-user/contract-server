import { DateTime } from "luxon";

// Simple language detection function
export const detectLanguage = (text: string): string => {
  const langPatterns = {
    en: /\b(the|a|an|and|or|but)\b/i,
    fr: /\b(le|la|les|et|ou|mais)\b/i,
    es: /\b(el|la|los|las|y|o|pero)\b/i,
    de: /\b(der|die|das|und|oder|aber)\b/i,
    // Add more languages as needed
  };

  for (const [lang, pattern] of Object.entries(langPatterns)) {
    if (pattern.test(text)) {
      return lang;
    }
  }

  return "en"; // Default to English if no match is found
};

export const calculateExpirationDate = (
  contractDuration: string
): Date | null => {
  // This is a simple implementation and might need to be adjusted based on your needs
  const durationMatch = contractDuration.match(/(\d+)\s*(year|month|day)/i);
  if (durationMatch) {
    const [, amount, unit] = durationMatch;
    const duration = { [unit.toLowerCase() + "s"]: parseInt(amount) };
    return DateTime.local().plus(duration).toJSDate();
  }
  return null; // Return null if duration couldn't be parsed
};
