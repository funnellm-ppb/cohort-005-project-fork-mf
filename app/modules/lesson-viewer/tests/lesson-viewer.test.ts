import { describe, it, expect } from "vitest";
import { markdown } from "~/lib/text";
import { flattenCourseLessons } from "../course.server";
import { renderThread } from "../thread.server";

describe("flattenCourseLessons", () => {
  it("lists every lesson in module order, tagged with its module", () => {
    const flat = flattenCourseLessons({
      modules: [
        {
          id: 1,
          title: "Basics",
          lessons: [
            { id: 10, title: "Hello", moduleId: 1 },
            { id: 11, title: "Types", moduleId: 1 },
          ],
        },
        { id: 2, title: "Empty", lessons: [] },
        {
          id: 3,
          title: "Advanced",
          lessons: [{ id: 30, title: "Generics", moduleId: 3 }],
        },
      ],
    });

    expect(flat).toEqual([
      { id: 10, title: "Hello", moduleId: 1, moduleTitle: "Basics" },
      { id: 11, title: "Types", moduleId: 1, moduleTitle: "Basics" },
      { id: 30, title: "Generics", moduleId: 3, moduleTitle: "Advanced" },
    ]);
  });
});

describe("renderThread", () => {
  const author = {
    id: 1,
    name: "Ada",
    avatarUrl: null,
    isInstructor: false,
    isPlatformAdmin: false,
  };

  function comment(id: number, body: string, deleted = false) {
    return {
      id,
      body: markdown(body),
      createdAt: "2026-01-01T00:00:00.000Z",
      editedAt: null,
      deleted,
      author,
      replies: [],
    };
  }

  it("renders each body, replies included, and blanks deleted ones", async () => {
    const [top] = await renderThread([
      {
        ...comment(1, "**bold**"),
        replies: [comment(2, "gone", true), comment(3, "<script>x</script>")],
      },
    ]);

    expect(top.bodyHtml).toContain("<strong>bold</strong>");
    expect(top.replies[0].bodyHtml).toBe("");
    expect(top.replies[1].bodyHtml).not.toContain("<script>");
  });
});
