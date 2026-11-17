import { MAX_NOTE_LENGTH } from "~/lib/notes";

export type NoteDraftStatus = {
  length: number;
  maxLength: number;
  tooLong: boolean;
  unsaved: boolean;
  canSave: boolean;
};

/**
 * What the note editor shows for the Student's draft against the saved Note:
 * the character count, whether it is over the limit, whether there are
 * unsaved changes, and whether Save should be enabled.
 */
export function getNoteDraftStatus(
  draft: string,
  savedBody: string | null
): NoteDraftStatus {
  // Trimmed because saveNote stores the trimmed body: a trailing newline is
  // not an unsaved change, and does not count against the limit.
  const body = draft.trim();
  const tooLong = body.length > MAX_NOTE_LENGTH;
  const unsaved = body !== (savedBody ?? "");

  return {
    length: body.length,
    maxLength: MAX_NOTE_LENGTH,
    tooLong,
    unsaved,
    canSave: unsaved && body.length > 0 && !tooLong,
  };
}
