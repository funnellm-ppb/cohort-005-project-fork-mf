import { count, desc, eq, inArray } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "~/db/schema";
import { CourseStatus } from "~/db/schema";

export type Db = BetterSQLite3Database<typeof schema>;

export const FEATURED_COURSE_LIMIT = 3;

export type FeaturedCourse = {
  id: number;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string | null;
  instructorName: string;
  lessonCount: number;
};

export type LandingPageStats = {
  courses: number;
  categories: number;
  lessons: number;
};

export type LandingPage = {
  featuredCourses: FeaturedCourse[];
  stats: LandingPageStats;
};

const { courses, categories, users, modules, lessons } = schema;
const isPublished = eq(courses.status, CourseStatus.Published);

function getNewestPublishedCourses(db: Db) {
  return db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      description: courses.description,
      coverImageUrl: courses.coverImageUrl,
      instructorName: users.name,
    })
    .from(courses)
    .innerJoin(users, eq(courses.instructorId, users.id))
    .where(isPublished)
    .orderBy(desc(courses.createdAt), desc(courses.id))
    .limit(FEATURED_COURSE_LIMIT)
    .all();
}

function getLessonCounts(db: Db, courseIds: number[]) {
  const rows = db
    .select({ courseId: modules.courseId, lessonCount: count(lessons.id) })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(inArray(modules.courseId, courseIds))
    .groupBy(modules.courseId)
    .all();

  return new Map(rows.map((row) => [row.courseId, row.lessonCount]));
}

async function getStats(db: Db): Promise<LandingPageStats> {
  const publishedModuleIds = db
    .select({ id: modules.id })
    .from(modules)
    .innerJoin(courses, eq(modules.courseId, courses.id))
    .where(isPublished);

  const [courseCount, categoryCount, lessonCount] = await Promise.all([
    db.$count(courses, isPublished),
    db.$count(categories),
    db.$count(lessons, inArray(lessons.moduleId, publishedModuleIds)),
  ]);

  return {
    courses: courseCount,
    categories: categoryCount,
    lessons: lessonCount,
  };
}

export async function getLandingPage(db: Db): Promise<LandingPage> {
  const newest = getNewestPublishedCourses(db);
  const lessonCounts = getLessonCounts(
    db,
    newest.map((course) => course.id)
  );

  return {
    featuredCourses: newest.map((course) => ({
      ...course,
      lessonCount: lessonCounts.get(course.id) ?? 0,
    })),
    stats: await getStats(db),
  };
}
