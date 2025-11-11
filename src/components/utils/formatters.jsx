import { format } from "date-fns";

export function formatAmount(amount, decimals = 8) {
  if (!amount && amount !== 0) return "0";
  const value = Number(amount) / Math.pow(10, decimals);
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function truncate(str, n = 10) {
  if (!str) return "";
  if (str.length <= n * 2) return str;
  return `${str.slice(0, n)}...${str.slice(-n)}`;
}

export function fromUnix(ms) {
  if (typeof ms !== "number" || !isFinite(ms) || ms <= 0) {
    return "N/A";
  }
  try {
    return format(new Date(ms), "yyyy-MM-dd HH:mm:ss");
  } catch (error) {
    return "Invalid Date";
  }
}

export function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(
    () => true,
    () => false
  );
}

export function timeAgo(timestamp) {
  if (typeof timestamp !== "number" || !isFinite(timestamp) || timestamp <= 0) {
    return "N/A";
  }
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 0) return "in the future";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}