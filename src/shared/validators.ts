/**
 * Validates date format (YYYY-MM-DD)
 */
export function isValidDateFormat(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(date);
}

/**
 * Validates and extracts the date parameter from a URL
 */
export function validateDateParameter(url: URL): { valid: true; date: string } | { valid: false; error: string } {
  const date = url.searchParams.get("date");

  if (!date) {
    return { valid: false, error: "Date parameter is required" };
  }

  if (!isValidDateFormat(date)) {
    return { valid: false, error: "Invalid date format. Expected YYYY-MM-DD" };
  }

  return { valid: true, date };
}
