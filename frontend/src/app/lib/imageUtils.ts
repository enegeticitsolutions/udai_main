const getPublicUploadBase = () => {
  if (typeof window === "undefined") {
    return (
      (import.meta.env.VITE_PUBLIC_UPLOAD_BASE_URL as string) ??
      (import.meta.env.VITE_PUBLIC_API_BASE_URL as string) ??
      (import.meta.env.VITE_BASE_URL as string) ??
      "http://localhost:4000"
    ).replace(/\/$/, "");
  }

  const { hostname } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:4000";
  }

  const envUrl =
    (import.meta.env.VITE_PUBLIC_UPLOAD_BASE_URL as string) ??
    (import.meta.env.VITE_PUBLIC_API_BASE_URL as string) ??
    (import.meta.env.VITE_BASE_URL as string);
  return envUrl?.replace(/\/$/, "") ?? "https://udaiapi.datamoshtechnologies.com";
};

export function getImageUrl(path?: string | null): string {
  if (!path) return '';
  const trimmed = path.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      if (
        (parsed.hostname === 'localhost' ||
          parsed.hostname === '127.0.0.1' ||
          parsed.hostname === '0.0.0.0') &&
        parsed.pathname.startsWith('/uploads/')
      ) {
        return `${getPublicUploadBase()}${parsed.pathname}`;
      }
    } catch {
      // Return as-is if URL parsing fails
    }
    return trimmed;
  }

  if (trimmed.startsWith('/uploads/')) {
    return `${getPublicUploadBase()}${trimmed}`;
  }

  const baseUrl = import.meta.env.BASE_URL || '/';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  if (trimmed.startsWith('/')) {
    return cleanBase + trimmed.slice(1);
  }
  return cleanBase + trimmed;
}
