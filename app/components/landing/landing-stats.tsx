import type { LucideIcon } from "lucide-react";
import { BookOpen, GraduationCap, PlayCircle } from "lucide-react";
import type { LandingPageStats } from "~/modules/landing-page/landing-page";

export function LandingStats({ stats }: { stats: LandingPageStats }) {
  return (
    <section className="border-y border-border bg-muted/50 py-12">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 sm:grid-cols-3">
        <Stat icon={BookOpen} value={stats.courses} label="Published courses" />
        <Stat
          icon={PlayCircle}
          value={stats.lessons}
          label="Lessons to work through"
        />
        <Stat
          icon={GraduationCap}
          value={stats.categories}
          label="Categories"
        />
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="size-6 text-primary" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
