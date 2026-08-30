// Shared formatting helpers used across the app.
// Kept free of any UI/React dependencies so they never pull heavy modules in.

export const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

export const dateLabel = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });