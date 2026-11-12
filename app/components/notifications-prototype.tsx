// PROTOTYPE: "What does the in-app Notification feed look like?" (wayfinder ticket #7).
// Three variants of the feed on the existing app layout, switchable via ?variant=A|B|C.
// Mock, in-memory Notifications only: no Knock, no persistence. Never merge to main.
import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  Bell,
  CheckCheck,
  Circle,
  MessageSquare,
  Receipt,
  UsersRound,
  X,
  ArrowRight,
  Inbox,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { UserRole } from "~/db/schema";

type NotificationType =
  | "refund-request-decided"
  | "refund-request-raised"
  | "seat-claimed"
  | "question-asked"
  | "reply-posted";

export interface MockNotification {
  id: string;
  type: NotificationType;
  actorName: string;
  title: string;
  body?: string;
  link: string;
  when: string;
  today: boolean;
  read: boolean;
}

const typeIcon: Record<NotificationType, ReactNode> = {
  "refund-request-decided": <Receipt className="size-4" />,
  "refund-request-raised": <Receipt className="size-4" />,
  "seat-claimed": <UsersRound className="size-4" />,
  "question-asked": <MessageSquare className="size-4" />,
  "reply-posted": <MessageSquare className="size-4" />,
};

const typeLabel: Record<NotificationType, string> = {
  "refund-request-decided": "Refund Request",
  "refund-request-raised": "Refund Request",
  "seat-claimed": "Seat",
  "question-asked": "Question",
  "reply-posted": "Reply",
};

function seedFor(role: UserRole | null, isTeamAdmin: boolean): MockNotification[] {
  const all: MockNotification[] = [];
  if (role === UserRole.Student) {
    all.push(
      {
        id: "r1",
        type: "reply-posted",
        actorName: "Sarah Chen",
        title: "Sarah Chen replied to your Question in “Props and State”",
        body: "Good question! State is owned by the component; props are passed in from the parent…",
        link: "/courses",
        when: "5 min ago",
        today: true,
        read: false,
      },
      {
        id: "r2",
        type: "refund-request-decided",
        actorName: "Platform Admin",
        title: "Your Refund Request for “Intro to TypeScript” was approved",
        body: "Note from the Platform Admin: “Approved, sorry the course wasn't a fit.”",
        link: "/courses",
        when: "2 h ago",
        today: true,
        read: false,
      },
      {
        id: "r3",
        type: "reply-posted",
        actorName: "Alex Rivera",
        title: "Alex Rivera replied to your Question in “Hooks Deep Dive”",
        body: "I had the same issue, try moving the effect into a custom hook.",
        link: "/courses",
        when: "Yesterday",
        today: false,
        read: true,
      },
      {
        id: "r4",
        type: "refund-request-decided",
        actorName: "Platform Admin",
        title: "Your Refund Request for “CSS Mastery” was declined",
        body: "Note from the Platform Admin: “You've completed 80% of the course, outside the refund window.”",
        link: "/courses",
        when: "3 days ago",
        today: false,
        read: true,
      }
    );
  }
  if (role === UserRole.Instructor) {
    all.push(
      {
        id: "q1",
        type: "question-asked",
        actorName: "Jamie Park",
        title: "Jamie Park asked a Question in “useEffect Pitfalls”",
        body: "Why does my effect run twice in development?",
        link: "/instructor/questions",
        when: "12 min ago",
        today: true,
        read: false,
      },
      {
        id: "q2",
        type: "question-asked",
        actorName: "Priya Nair",
        title: "Priya Nair asked a Question in “Routing Basics”",
        body: "Is there a way to share loaders between nested routes?",
        link: "/instructor/questions",
        when: "1 h ago",
        today: true,
        read: false,
      },
      {
        id: "q3",
        type: "question-asked",
        actorName: "Tom Ellis",
        title: "Tom Ellis asked a Question in “Intro to TypeScript”",
        body: "What's the difference between `type` and `interface`?",
        link: "/instructor/questions",
        when: "2 days ago",
        today: false,
        read: true,
      }
    );
  }
  if (role === UserRole.Admin) {
    all.push(
      {
        id: "a1",
        type: "refund-request-raised",
        actorName: "Jamie Park",
        title: "Jamie Park raised a Refund Request for “CSS Mastery”",
        body: "Reason: “The course content didn't match the description.”",
        link: "/admin/refunds",
        when: "30 min ago",
        today: true,
        read: false,
      },
      {
        id: "a2",
        type: "refund-request-raised",
        actorName: "Acme Corp (Team Admin)",
        title: "Acme Corp raised a Refund Request for a Team Licence of “Intro to TypeScript”",
        body: "Reason: “We bought the wrong course for our team.”",
        link: "/admin/refunds",
        when: "Yesterday",
        today: false,
        read: true,
      }
    );
  }
  if (isTeamAdmin) {
    all.push(
      {
        id: "t1",
        type: "seat-claimed",
        actorName: "Lee Wong",
        title: "Lee Wong claimed a Seat on “React Fundamentals”",
        body: "4 of 10 Seats now claimed.",
        link: "/team",
        when: "20 min ago",
        today: true,
        read: false,
      },
      {
        id: "t2",
        type: "seat-claimed",
        actorName: "Maria Lopez",
        title: "Maria Lopez claimed a Seat on “React Fundamentals”",
        body: "3 of 10 Seats now claimed.",
        link: "/team",
        when: "Yesterday",
        today: false,
        read: true,
      }
    );
  }
  return all;
}

function useMockFeed(role: UserRole | null, isTeamAdmin: boolean) {
  const [items, setItems] = useState(() => seedFor(role, isTeamAdmin));
  const unread = items.filter((n) => !n.read).length;
  return {
    items,
    unread,
    markRead: (id: string, read = true) =>
      setItems((xs) => xs.map((n) => (n.id === id ? { ...n, read } : n))),
    markAllRead: () => setItems((xs) => xs.map((n) => ({ ...n, read: true }))),
  };
}

type Feed = ReturnType<typeof useMockFeed>;

function Badge({ count, className }: { count: number; className?: string }) {
  if (count === 0) return null;
  return (
    <span
      className={cn(
        "flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white",
        className
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
      <Inbox className="size-8 opacity-50" />
      You're all caught up.
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variant A: bell beside the logo, compact popover. Click = mark read + go.
// ---------------------------------------------------------------------------
function VariantABell({ feed }: { feed: Feed }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        <Badge count={feed.unread} className="absolute -right-1 -top-1" />
      </button>
      {open && (
        <div className="absolute left-8 top-0 z-50 w-96 rounded-lg border bg-popover text-popover-foreground shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            <button
              onClick={feed.markAllRead}
              disabled={feed.unread === 0}
              className="text-xs text-primary hover:underline disabled:opacity-40"
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-[28rem] overflow-y-auto">
            {feed.items.length === 0 && <EmptyState />}
            {feed.items.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  feed.markRead(n.id);
                  setOpen(false);
                  navigate(n.link);
                }}
                className={cn(
                  "flex w-full gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-accent",
                  !n.read && "bg-primary/5"
                )}
              >
                <span className="mt-0.5 text-muted-foreground">
                  {typeIcon[n.type]}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-sm",
                      !n.read ? "font-semibold" : "text-muted-foreground"
                    )}
                  >
                    {n.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {n.when}
                  </span>
                </span>
                {!n.read && (
                  <Circle className="mt-1.5 size-2 shrink-0 fill-primary text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variant B: sidebar nav entry + right slide-over drawer with Unread/All tabs,
// Today/Earlier groups, per-item read toggle and a preview line.
// ---------------------------------------------------------------------------
function VariantBNavItem({ feed, onOpen }: { feed: Feed; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    >
      <Bell className="size-4" />
      Notifications
      <Badge count={feed.unread} className="ml-auto" />
    </button>
  );
}

function VariantBDrawer({ feed, onClose }: { feed: Feed; onClose: () => void }) {
  const [tab, setTab] = useState<"unread" | "all">("unread");
  const navigate = useNavigate();
  const visible = feed.items.filter((n) => tab === "all" || !n.read);
  const groups = [
    { label: "Today", items: visible.filter((n) => n.today) },
    { label: "Earlier", items: visible.filter((n) => !n.today) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-[28rem] flex-col border-l bg-background shadow-2xl"
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex items-center gap-1 border-b px-5 py-2">
          {(["unread", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-full px-3 py-1 text-sm capitalize",
                tab === t ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              )}
            >
              {t}
              {t === "unread" && feed.unread > 0 && ` (${feed.unread})`}
            </button>
          ))}
          <button
            onClick={feed.markAllRead}
            disabled={feed.unread === 0}
            className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-40"
          >
            <CheckCheck className="size-3.5" />
            Mark all read
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {groups.length === 0 && <EmptyState />}
          {groups.map((g) => (
            <section key={g.label}>
              <div className="sticky top-0 bg-muted/80 px-5 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                {g.label}
              </div>
              {g.items.map((n) => (
                <div
                  key={n.id}
                  className="group flex gap-3 border-b px-5 py-4 hover:bg-accent/50"
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      n.read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                    )}
                  >
                    {typeIcon[n.type]}
                  </span>
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      feed.markRead(n.id);
                      onClose();
                      navigate(n.link);
                    }}
                  >
                    <span className={cn("block text-sm", !n.read && "font-semibold")}>
                      {n.title}
                    </span>
                    {n.body && (
                      <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                        {n.body}
                      </span>
                    )}
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {typeLabel[n.type]} · {n.when}
                    </span>
                  </button>
                  <button
                    onClick={() => feed.markRead(n.id, !n.read)}
                    title={n.read ? "Mark as unread" : "Mark as read"}
                    className="self-start rounded p-1 text-muted-foreground opacity-0 hover:bg-accent group-hover:opacity-100"
                  >
                    <Circle
                      className={cn("size-3", !n.read && "fill-primary text-primary")}
                    />
                  </button>
                </div>
              ))}
            </section>
          ))}
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variant C: thin top bar over the content with a bell; opens a large two-pane
// inbox. Click selects + marks read and shows the detail; "Open" navigates.
// ---------------------------------------------------------------------------
function VariantCTopBar({ feed, onOpen }: { feed: Feed; onOpen: () => void }) {
  return (
    <div className="sticky top-0 z-40 flex h-12 items-center justify-end border-b bg-background/95 px-6 backdrop-blur">
      <button
        onClick={onOpen}
        className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm hover:bg-accent"
      >
        <Bell className="size-4" />
        {feed.unread > 0 ? `${feed.unread} new` : "Notifications"}
      </button>
    </div>
  );
}

function VariantCInbox({ feed, onClose }: { feed: Feed; onClose: () => void }) {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(
    feed.items[0]?.id ?? null
  );
  const selected = feed.items.find((n) => n.id === selectedId) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-8" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[36rem] w-full max-w-4xl overflow-hidden rounded-xl border bg-background shadow-2xl"
      >
        <div className="flex w-80 shrink-0 flex-col border-r">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="font-semibold">Inbox</span>
            <button
              onClick={feed.markAllRead}
              disabled={feed.unread === 0}
              className="text-xs text-primary hover:underline disabled:opacity-40"
            >
              Mark all read
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {feed.items.length === 0 && <EmptyState />}
            {feed.items.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  setSelectedId(n.id);
                  feed.markRead(n.id);
                }}
                className={cn(
                  "flex w-full flex-col gap-0.5 border-l-2 px-4 py-3 text-left hover:bg-accent",
                  n.id === selectedId ? "border-l-primary bg-accent" : "border-l-transparent"
                )}
              >
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {!n.read && <Circle className="size-2 fill-primary text-primary" />}
                  {typeLabel[n.type]}
                  <span className="ml-auto">{n.when}</span>
                </span>
                <span className={cn("line-clamp-2 text-sm", !n.read && "font-semibold")}>
                  {n.title}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-1 flex-col">
          <div className="flex justify-end border-b px-4 py-3">
            <button onClick={onClose} className="rounded p-1 hover:bg-accent">
              <X className="size-4" />
            </button>
          </div>
          {selected ? (
            <div className="flex flex-1 flex-col gap-4 p-8">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                {typeIcon[selected.type]}
                {typeLabel[selected.type]} · {selected.when}
              </span>
              <h3 className="text-xl font-semibold">{selected.title}</h3>
              {selected.body && (
                <p className="rounded-md bg-muted p-4 text-sm">{selected.body}</p>
              )}
              <div className="mt-auto flex gap-2">
                <button
                  onClick={() => {
                    onClose();
                    navigate(selected.link);
                  }}
                  className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
                >
                  Open <ArrowRight className="size-4" />
                </button>
                <button
                  onClick={() => feed.markRead(selected.id, false)}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
                >
                  Mark as unread
                </button>
              </div>
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wiring: one hook returns the slots the layout drops into the sidebar/main.
// ---------------------------------------------------------------------------
export const notificationVariants = [
  { key: "A", name: "Sidebar bell + popover" },
  { key: "B", name: "Nav item + drawer" },
  { key: "C", name: "Top bar + inbox" },
];

export function useNotificationPrototype(
  variant: string,
  role: UserRole | null,
  isTeamAdmin: boolean
) {
  // Callers key the host on the user id so a DevUI switch re-seeds the feed.
  const feed = useMockFeed(role, isTeamAdmin);
  const [open, setOpen] = useState(false);

  return useMemo(() => {
    if (!role) return { headerSlot: null, navSlot: null, mainTop: null, overlay: null };
    if (variant === "B")
      return {
        headerSlot: null,
        navSlot: <VariantBNavItem feed={feed} onOpen={() => setOpen(true)} />,
        mainTop: null,
        overlay: open ? <VariantBDrawer feed={feed} onClose={() => setOpen(false)} /> : null,
      };
    if (variant === "C")
      return {
        headerSlot: null,
        navSlot: null,
        mainTop: <VariantCTopBar feed={feed} onOpen={() => setOpen(true)} />,
        overlay: open ? <VariantCInbox feed={feed} onClose={() => setOpen(false)} /> : null,
      };
    return {
      headerSlot: <VariantABell feed={feed} />,
      navSlot: null,
      mainTop: null,
      overlay: null,
    };
  }, [variant, role, feed, open]);
}
