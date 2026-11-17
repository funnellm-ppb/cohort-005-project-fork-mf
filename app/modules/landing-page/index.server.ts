import { db } from "~/db";
import { getLandingPage, type Db } from "./lib/landing-page";

export type {
  FeaturedCourse,
  LandingPage,
  LandingPageStats,
} from "./lib/landing-page";

/**
 * What the landing page at `/` shows, bound to a database. The app uses
 * `landingPage`, which reads the app database; tests build their own against
 * a test database.
 */
export function createLandingPage(database: Db) {
  return {
    /**
     * The newest published courses, each with its lesson count, and the
     * catalogue figures: published courses, categories, and lessons in
     * published courses. Drafts and archived courses never appear.
     */
    get() {
      return getLandingPage(database);
    },
  };
}

// Pure so a route importing this only for its loader doesn't pull the
// database into the client bundle (see `~/db`).
export const landingPage = /* @__PURE__ */ createLandingPage(db);
