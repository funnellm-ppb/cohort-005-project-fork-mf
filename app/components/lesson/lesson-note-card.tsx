import { useState } from "react";
import { useFetcher } from "react-router";
import { Lock, NotebookPen } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { cn, formatRelativeTime } from "~/lib/utils";
import { getNoteDraftStatus } from "~/modules/lesson-notes";

/** The Student's private Note on a Lesson. */
export function LessonNoteCard({
  note,
}: {
  note: { body: string; updatedAt: string } | null;
}) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [draft, setDraft] = useState(note?.body ?? "");
  const isSaving = fetcher.state !== "idle";
  const error = fetcher.data?.error;
  const status = getNoteDraftStatus(draft, note?.body ?? null);

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <NoteHeader />

        <fetcher.Form method="post" className="space-y-2">
          <input type="hidden" name="intent" value="save-note" />
          <Textarea
            name="body"
            rows={4}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Jot down what you want to remember from this lesson..."
            aria-label="Your notes"
            className="resize-y"
          />

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              size="sm"
              disabled={isSaving || !status.canSave}
            >
              {isSaving ? "Saving..." : "Save note"}
            </Button>

            <NoteSaveState
              error={error}
              unsaved={status.unsaved}
              updatedAt={note?.updatedAt ?? null}
            />

            <NoteCharacterCount
              length={status.length}
              maxLength={status.maxLength}
              tooLong={status.tooLong}
            />
          </div>
        </fetcher.Form>
      </CardContent>
    </Card>
  );
}

function NoteSaveState({
  error,
  unsaved,
  updatedAt,
}: {
  error: string | undefined;
  unsaved: boolean;
  updatedAt: string | null;
}) {
  if (error) return <span className="text-xs text-destructive">{error}</span>;
  if (unsaved && updatedAt)
    return (
      <span className="text-xs text-muted-foreground">Unsaved changes</span>
    );
  if (!updatedAt) return null;

  return (
    <span suppressHydrationWarning className="text-xs text-muted-foreground">
      Saved {formatRelativeTime(updatedAt)}
    </span>
  );
}

function NoteHeader() {
  return (
    <div className="mb-4 flex items-center gap-2">
      <NotebookPen className="size-5 text-primary" />
      <h2 className="text-xl font-semibold">Your notes</h2>
      <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
        <Lock className="size-3" />
        Only you can see this
      </span>
    </div>
  );
}

function NoteCharacterCount({
  length,
  maxLength,
  tooLong,
}: {
  length: number;
  maxLength: number;
  tooLong: boolean;
}) {
  return (
    <span
      className={cn(
        "ml-auto text-xs",
        tooLong ? "text-destructive" : "text-muted-foreground"
      )}
    >
      {length} / {maxLength}
    </span>
  );
}
