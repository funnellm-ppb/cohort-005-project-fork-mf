import { Link } from "react-router";

export function LandingFooter({ signedIn }: { signedIn: boolean }) {
  const links = signedIn
    ? [
        { to: "/courses", label: "Courses" },
        { to: "/dashboard", label: "Dashboard" },
      ]
    : [
        { to: "/courses", label: "Courses" },
        { to: "/login", label: "Log In" },
        { to: "/signup", label: "Sign Up" },
      ];

  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/" className="text-lg font-bold tracking-tight">
            Cadence
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            Learn to code, at your own pace.
          </p>
        </div>
        <nav className="flex gap-6 text-sm text-muted-foreground">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
