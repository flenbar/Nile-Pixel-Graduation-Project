export const CATEGORIES = ["Water point", "Equipment damage", "Service interruption", "Safety concern", "Maintenance", "Other"];
export const PRIORITIES = ["Low", "Medium", "High", "Critical"];
export function validateReport(input) {
  const errors = {};
  if (!CATEGORIES.includes(input.category)) errors.category = "Choose a valid category.";
  if (!input.description || input.description.trim().length < 12) errors.description = "Add at least 12 characters describing the issue.";
  if (input.description?.length > 1500) errors.description = "Description must be 1,500 characters or fewer.";
  if (!input.location || input.location.trim().length < 3) errors.location = "Enter a location.";
  if (input.location?.length > 180) errors.location = "Location must be 180 characters or fewer.";
  if (!PRIORITIES.includes(input.priority)) errors.priority = "Choose a valid priority.";
  return errors;
}
