import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData, type TestDb } from "~/test/setup";
import * as schema from "~/db/schema";
import { CourseStatus } from "~/db/schema";
import { markdown } from "~/lib/text";
import { createLandingPage } from "../index.server";

let db: TestDb;
let instructorId: number;
let categoryId: number;
let baseCourseId: number;

beforeEach(() => {
  db = createTestDb();
  const base = seedBaseData(db);
  instructorId = base.instructor.id;
  categoryId = base.category.id;
  baseCourseId = base.course.id;
});

// ─── Fixtures ───
// The landing page only reads, and nothing writes these tables from a
// service, so rows go in directly. Kept here so a schema change touches only
// this block.

let slugCounter = 0;

function addCourse(
  title: string,
  createdAt: string,
  status = CourseStatus.Published
) {
  slugCounter += 1;
  return db
    .insert(schema.courses)
    .values({
      title,
      slug: `landing-course-${slugCounter}`,
      description: `${title} description`,
      salesCopy: markdown(title),
      instructorId,
      categoryId,
      status,
      createdAt,
    })
    .returning()
    .get();
}

function addLessons(courseId: number, lessonsPerModule: number[]) {
  lessonsPerModule.forEach((lessonCount, moduleIndex) => {
    const mod = db
      .insert(schema.modules)
      .values({ courseId, title: "Module", position: moduleIndex })
      .returning()
      .get();
    for (let position = 0; position < lessonCount; position++) {
      db.insert(schema.lessons)
        .values({ moduleId: mod.id, title: "Lesson", position })
        .run();
    }
  });
}

function addCategory(slug: string) {
  db.insert(schema.categories).values({ name: slug, slug }).run();
}

const get = () => createLandingPage(db).get();

describe("featured courses", () => {
  it("are the three newest published courses, newest first", async () => {
    addCourse("Oldest", "2020-01-01T00:00:00.000Z");
    addCourse("Middle", "2021-01-01T00:00:00.000Z");
    addCourse("Newer", "2022-01-01T00:00:00.000Z");
    addCourse("Newest", "2023-01-01T00:00:00.000Z");

    // seedBaseData's course is created "now", so it is the newest of all.
    expect((await get()).featuredCourses.map((c) => c.title)).toEqual([
      "Test Course",
      "Newest",
      "Newer",
    ]);
  });

  it("leave out drafts and archived courses", async () => {
    addCourse("Draft", "2099-01-01T00:00:00.000Z", CourseStatus.Draft);
    addCourse("Archived", "2099-01-01T00:00:00.000Z", CourseStatus.Archived);

    expect((await get()).featuredCourses.map((c) => c.title)).toEqual([
      "Test Course",
    ]);
  });

  it("carry the instructor's name and the lessons across every module", async () => {
    addLessons(baseCourseId, [2, 3]);
    const empty = addCourse("Empty", "2020-01-01T00:00:00.000Z");

    const featured = (await get()).featuredCourses;

    expect(featured[0]).toMatchObject({
      id: baseCourseId,
      slug: "test-course",
      instructorName: "Test Instructor",
      lessonCount: 5,
    });
    expect(featured.find((c) => c.id === empty.id)?.lessonCount).toBe(0);
  });

  it("are empty when nothing is published", async () => {
    db.update(schema.courses).set({ status: CourseStatus.Draft }).run();

    expect((await get()).featuredCourses).toEqual([]);
  });
});

describe("stats", () => {
  it("count every published course, not only the featured ones", async () => {
    for (let i = 0; i < 4; i++)
      addCourse(`Course ${i}`, "2020-01-01T00:00:00.000Z");
    addCourse("Draft", "2020-01-01T00:00:00.000Z", CourseStatus.Draft);

    expect((await get()).stats.courses).toBe(5);
  });

  it("count every category", async () => {
    addCategory("design");
    addCategory("data");

    expect((await get()).stats.categories).toBe(3);
  });

  it("count lessons in published courses only", async () => {
    addLessons(baseCourseId, [2, 1]);
    const older = addCourse("Older", "2020-01-01T00:00:00.000Z");
    addLessons(older.id, [4]);
    const draft = addCourse(
      "Draft",
      "2020-01-01T00:00:00.000Z",
      CourseStatus.Draft
    );
    addLessons(draft.id, [10]);

    expect((await get()).stats.lessons).toBe(7);
  });
});
