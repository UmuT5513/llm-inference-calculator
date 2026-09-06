// Cross-browser clipboard copy with a manual prompt fallback.
export async function copyText(text: string, promptLabel?: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      window.prompt(promptLabel || 'Kopyala', text);
      return true;
    } catch {
      return false;
    }
  }
}

// Downloads a string as a file via a temporary blob URL (revoked after use).
export function downloadText(filename: string, text: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}