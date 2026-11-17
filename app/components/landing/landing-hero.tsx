import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { CourseImage } from "~/components/course-image";
import type { FeaturedCourse } from "~/modules/landing-page/landing-page";

type HeroCourse = Pick<FeaturedCourse, "id" | "title" | "coverImageUrl">;

export function LandingHero({
  courses,
  signedIn,
}: {
  courses: HeroCourse[];
  signedIn: boolean;
}) {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-16 px-6 py-20 lg:grid-cols-2 lg:py-28">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          Courses for developers
        </p>
        <h1 className="mt-4 text-5xl font-bold tracking-tight sm:text-6xl">
          Learn to code,
          <br />
          <span className="text-muted-foreground">at your own pace</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Structured courses built by experienced instructors. Track your
          progress, take quizzes, and build real-world skills.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Button asChild size="lg">
            <Link to="/courses">
              Browse Courses
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            {signedIn ? (
              <Link to="/dashboard">Go to Dashboard</Link>
            ) : (
              <Link to="/signup">Create a free account</Link>
            )}
          </Button>
        </div>
      </div>
      {courses.length > 0 && <HeroCovers courses={courses} />}
    </section>
  );
}

const COVER_POSITIONS = [
  "left-0 top-0 z-10 -rotate-3",
  "right-0 top-20 z-30 rotate-2",
  "bottom-0 left-16 z-20 -rotate-1",
];

function HeroCovers({ courses }: { courses: HeroCourse[] }) {
  return (
    <div
      aria-hidden="true"
      className="relative hidden h-[28rem] lg:block"
      data-testid="hero-covers"
    >
      {courses.slice(0, COVER_POSITIONS.length).map((course, index) => (
        <div
          key={course.id}
          className={`absolute w-72 overflow-hidden rounded-xl border border-border bg-card shadow-xl ${COVER_POSITIONS[index]}`}
        >
          <CourseImage
            src={course.coverImageUrl}
            alt=""
            className="aspect-video w-full object-cover"
          />
          <p className="truncate px-4 py-3 text-sm font-medium">
            {course.title}
          </p>
        </div>
      ))}
    </div>
  );
}
