import { toBlob } from "html-to-image";

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

/** Renders the card DOM node to a 1080×1350 PNG. */
export async function renderCard(node: HTMLElement): Promise<Blob> {
  await document.fonts.ready;
  const options = {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    pixelRatio: 1,
    cacheBust: true,
    backgroundColor: "#FFF4DF", // must match the card's cream, or it paints over it
  };
  // First pass warms up fonts/emoji — Safari often drops them on the first render.
  await toBlob(node, options);
  const blob = await toBlob(node, options);
  if (!blob) throw new Error("Could not render the image.");
  return blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Native share sheet with the PNG where supported (mostly mobile); download otherwise. */
export async function shareBlob(blob: Blob, filename: string, text: string) {
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "NNN Tracker", text });
      return;
    } catch (err) {
      if ((err as Error).name === "AbortError") return; // user closed the sheet
    }
  }
  downloadBlob(blob, filename);
}
