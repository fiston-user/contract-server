import { DateTime } from "luxon";

export const detectLanguage = (text: string): string => {
  // This is a placeholder implementation
  // In a real-world scenario, you'd use a language detection library or API
  return "en"; // Default to English
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
