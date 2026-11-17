import { noteDraftStatus, type NoteDraftStatus } from "./lib/draft-status";

export type { NoteDraftStatus };

/**
 * What the note editor shows for the Student's draft against the saved Note:
 * the character count, whether it is over the limit, whether there are
 * unsaved changes, and whether Save should be enabled.
 */
export function getNoteDraftStatus(
  draft: string,
  savedBody: string | null
): NoteDraftStatus {
  return noteDraftStatus(draft, savedBody);
}
