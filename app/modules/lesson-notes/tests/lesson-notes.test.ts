import { describe, expect, it } from "vitest";
import { getNoteDraftStatus } from "../index";
import { MAX_NOTE_LENGTH } from "~/lib/notes";

describe("getNoteDraftStatus", () => {
  it("cannot save an empty draft when there is no Note yet", () => {
    expect(getNoteDraftStatus("   ", null)).toMatchObject({
      length: 0,
      unsaved: false,
      canSave: false,
    });
  });

  it("can save a new draft and counts its characters", () => {
    expect(getNoteDraftStatus("Generics", null)).toMatchObject({
      length: 8,
      maxLength: MAX_NOTE_LENGTH,
      unsaved: true,
      canSave: true,
    });
  });

  it("has nothing to save when the draft matches the saved Note", () => {
    expect(getNoteDraftStatus("Generics\n", "Generics")).toMatchObject({
      unsaved: false,
      canSave: false,
    });
  });

  it("has unsaved changes once the draft differs from the saved Note", () => {
    expect(getNoteDraftStatus("Generics!", "Generics")).toMatchObject({
      unsaved: true,
      canSave: true,
    });
  });

  it("cannot save a cleared Note, because an empty Note is rejected", () => {
    expect(getNoteDraftStatus("", "Generics")).toMatchObject({
      unsaved: true,
      canSave: false,
    });
  });

  it("allows exactly the limit and blocks one character over", () => {
    const atLimit = "a".repeat(MAX_NOTE_LENGTH);
    expect(getNoteDraftStatus(atLimit, null)).toMatchObject({
      tooLong: false,
      canSave: true,
    });
    expect(getNoteDraftStatus(`${atLimit}a`, null)).toMatchObject({
      length: MAX_NOTE_LENGTH + 1,
      tooLong: true,
      canSave: false,
    });
  });
});
