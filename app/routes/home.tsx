import { Link } from "react-router";
import { useState, useEffect } from "react";
import type { Route } from "./+types/home";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "~/components/ui/card";
import { BookOpen, ArrowRight, User, Moon, Sun } from "lucide-react";
import { CourseImage } from "~/components/course-image";
import { DevUI } from "~/components/dev-ui";
import { LandingHero } from "~/components/landing/landing-hero";
import { LandingStats } from "~/components/landing/landing-stats";
import { LandingFooter } from "~/components/landing/landing-footer";
import { landingPage } from "~/modules/landing-page/index.server";
import { getCurrentUserId, getDevCountry } from "~/lib/session";
import { getCountryTierInfo, COUNTRIES } from "~/lib/ppp";
import { eq } from "drizzle-orm";
import { db } from "~/db";
import { users } from "~/db/schema";

function getAllUsers() {
  return db.select().from(users).all();
}

function getUserById(id: number) {
  return db.select().from(users).where(eq(users.id, id)).get();
}

export function meta() {
  return [
    { title: "Cadence — Learn at your own pace" },
    {
      name: "description",
      content:
        "A modern course platform for developers. Browse courses, track your progress, and learn at your own pace.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { featuredCourses, stats } = await landingPage.get();
  const users = getAllUsers();
  const currentUserId = await getCurrentUserId(request);
  const currentUser = currentUserId ? getUserById(currentUserId) : null;
  const devCountry = await getDevCountry(request);
  const countryTierInfo = getCountryTierInfo(devCountry);

  return {
    featuredCourses,
    stats,
    users: users.map((u) => ({ id: u.id, name: u.name, role: u.role })),
    currentUser: currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : null,
    devCountry,
    countryTierInfo,
    countries: COUNTRIES,
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const {
    featuredCourses,
    stats,
    users,
    currentUser,
    devCountry,
    countryTierInfo,
    countries,
  } = loaderData;
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleDarkMode() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("cadence-theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="text-xl font-bold tracking-tight">
            Cadence
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              to="/courses"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Courses
            </Link>
            <button
              onClick={toggleDarkMode}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </button>
            {currentUser ? (
              <Button asChild size="sm">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Log In
                </Link>
                <Button asChild size="sm">
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <LandingHero courses={featuredCourses} signedIn={currentUser !== null} />

      <LandingStats stats={stats} />

      {featuredCourses.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Featured Courses
              </h2>
              <p className="mt-2 text-muted-foreground">
                Start learning with our most popular courses
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/courses">
                View all
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCourses.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.slug}`}
                className="group"
              >
                <Card className="h-full overflow-hidden pt-0 transition-shadow group-hover:shadow-md">
                  <CourseImage
                    src={course.coverImageUrl}
                    alt={course.title}
                    className="aspect-video w-full object-cover"
                  />
                  <CardHeader>
                    <h3 className="font-semibold leading-snug group-hover:text-primary">
                      {course.title}
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {course.description}
                    </p>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="size-3" />
                      {course.instructorName ?? "Instructor"}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="size-3" />
                      {course.lessonCount} lessons
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <LandingFooter signedIn={currentUser !== null} />

      <DevUI
        users={users}
        currentUser={currentUser}
        devCountry={devCountry}
        countryTierInfo={countryTierInfo}
        countries={countries}
      />
    </div>
  );
}
