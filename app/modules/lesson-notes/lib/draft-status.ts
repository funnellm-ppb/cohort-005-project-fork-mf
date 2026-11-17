import { MAX_NOTE_LENGTH } from "~/lib/notes";

export type NoteDraftStatus = {
  length: number;
  maxLength: number;
  tooLong: boolean;
  unsaved: boolean;
  canSave: boolean;
};

// The draft is trimmed because saveNote stores the trimmed body: a trailing
// newline is not an unsaved change, and does not count against the limit.
export function noteDraftStatus(
  draft: string,
  savedBody: string | null
): NoteDraftStatus {
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
