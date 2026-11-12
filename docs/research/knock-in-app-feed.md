# Knock (knock.app) for an in-app notification feed in Cadence: research report

**Scope and caveats.** The sources are primary only: docs.knock.app, knock.app/pricing, and the `knocklabs/javascript` and `knocklabs/knock-node` repos (read via raw.githubusercontent.com on `main`). Two kinds of gap:
- Three fetches were blocked by a tooling policy ("secret detected"), so those pages are unread. They were the "Handling token expiration" part of the security docs and the npm registry pages for `@knocklabs/react` and `@knocklabs/node`.
- Where I infer something from source code rather than a docs statement, I say so.

## Summary

- Knock offers a prebuilt React feed (`@knocklabs/react`) and a headless path (`@knocklabs/client` plus hooks).
- The feed runs entirely in the browser using a public API key, a user ID and an optional signed JWT. The server only triggers workflows with the secret key, and signs user tokens when enhanced security is on.
- Workflows live in Knock (dashboard, CLI or Management API), must be committed, and in a non-production environment must also be promoted.
- There is no local emulator. Sandbox mode does not apply to in-app channels. Test by mocking the Node SDK behind your own module.
- The Free plan includes 10,000 messages per month.

---

## 1. React components vs headless; SSR

### Prebuilt components
Docs: https://docs.knock.app/in-app-ui/react/feed and https://docs.knock.app/in-app-ui/react/overview

- `@knocklabs/react` ships `NotificationFeedPopover`, `NotificationFeed` and `NotificationIconButton`.
- You need a public API key and the in-app feed **channel ID**, both from the dashboard.
- The docs example uses `KnockProvider` → `KnockFeedProvider feedId=…` → `NotificationIconButton` plus `NotificationFeedPopover`:

```tsx
import { KnockProvider, KnockFeedProvider, NotificationIconButton, NotificationFeedPopover } from "@knocklabs/react";
import "@knocklabs/react/dist/index.css"; // "Required CSS import, unless you're overriding the styling"

<KnockProvider apiKey={PUBLIC_KEY} user={{ id: user.id }} userToken={token}>
  <KnockFeedProvider feedId={FEED_CHANNEL_ID}>
    <NotificationIconButton ref={btnRef} onClick={() => setOpen(!open)} />
    <NotificationFeedPopover buttonRef={btnRef} isVisible={open} onClose={() => setOpen(false)} />
  </KnockFeedProvider>
</KnockProvider>
```

- Customisation (all from the feed docs page):
  - Override cells with `renderItem`.
  - Set `badgeCountType="unread"` on the icon button. The default badge uses `seen`, per the same page.
  - `colorMode="dark"` on `KnockFeedProvider`.
  - CSS variables prefixed `--rnf-`, and classes prefixed `rnf-`.
- The popover calls `markAllAsSeen()` on open by default. This is shown in the source at `knocklabs/javascript:packages/react/src/modules/feed/components/NotificationFeedPopover/NotificationFeedPopover.tsx` (`defaultOnOpen`). Override it with `onOpen`.
- `@knocklabs/react` is for the web only. See https://raw.githubusercontent.com/knocklabs/javascript/main/packages/react/README.md ("designed to be used via React for web only").
- `@knocklabs/react` v0.15.1 is on `main`. It has peer deps `react ^17 || ^18 || ^19` and optional `next` and `@tanstack/react-router`, and subpath exports `./next` and `./tanstack`. Source: https://raw.githubusercontent.com/knocklabs/javascript/main/packages/react/package.json. The `./next` export only contains `KnockGuideLocationSensor`, which is for guides (https://raw.githubusercontent.com/knocklabs/javascript/main/packages/react/src/next/index.ts). There is no React Router export.

### Headless
Docs: https://docs.knock.app/in-app-ui/react/headless/feed. The old `custom-notifications-ui` URL redirects there.

```tsx
const knockClient = useKnockClient();                       // inside <KnockProvider>
const feedClient = useNotifications(knockClient, FEED_CHANNEL_ID, { mode: "compact" /* or "rich" */ });
const { items, metadata } = useNotificationStore(feedClient); // metadata.unseen_count / unread_count / total_count
useEffect(() => { feedClient.fetch(); }, [feedClient]);
```

- You can also use `useAuthenticatedKnockClient(apiKey, userId, …)` without a provider. See https://raw.githubusercontent.com/knocklabs/javascript/main/packages/react/README.md.
- With headless hooks, **you** must mark items as seen. Without that, `unseen_count` never decreases (headless docs page above).
- `useKnockFeed()` returns `{ knock, feedClient, useFeedStore, colorMode }` and throws if used outside `KnockFeedProvider`. Source: https://raw.githubusercontent.com/knocklabs/javascript/main/packages/react-core/src/modules/feed/context/KnockFeedProvider.tsx.
- `@knocklabs/client` is the lowest level: `new Knock(publicKey)`, `.authenticate(...)`, `.feeds.initialize(channelId)`. Docs: https://docs.knock.app/in-app-ui/javascript/sdk/quick-start.
- `KnockProvider` has an `enabled` prop. When it is `false`, no identify call, API requests or websocket happen. Source: https://raw.githubusercontent.com/knocklabs/javascript/main/packages/react-core/src/modules/core/context/KnockProvider.tsx and the react README.

### SSR compatibility
Knock's docs have no explicit SSR page for React Router. Treat the points below as inferred from source unless noted.

- The client creates its websocket only in the browser. Source: https://raw.githubusercontent.com/knocklabs/javascript/main/packages/client/src/api.ts:
  - `if (typeof window !== "undefined" && typeof WebSocket !== "undefined") { … new Socket(…) }`.
  - Server rendering therefore shouldn't crash on the socket. This is inferred from that guard; I didn't run it.
- The UI also uses browser-only APIs:
  - Popper positioning inside `useEffect`.
  - `BroadcastChannel` in the feed class (`knocklabs/javascript:packages/client/src/clients/feed/feed.ts`).
  - The page-visibility manager in the client.
- I did not verify:
  - Whether the built `@knocklabs/react` bundle carries `"use client"` directives. This is unverified.
  - Whether `@knocklabs/react` v0.15.1 imports its CSS cleanly under Vite SSR. This is unverified.
- Safe pattern for an SSR app:
  - Mount the feed only after hydration (a `useEffect` mounted flag or `React.lazy` after mount), so server and client markup match.
  - Pass the userToken and IDs from the loader.
  - The public key is, by design, safe to expose to the browser.
- A client-side secret-key guard exists: `new Knock(key)` throws if the key starts with `sk_`. Source: https://raw.githubusercontent.com/knocklabs/javascript/main/packages/client/src/knock.ts.

---

## 2. Identifying users and authenticating the client feed

### User IDs
Source: https://docs.knock.app/concepts/users
- Use your own internal ID. Max 256 characters, cannot contain `/` or `#`, and it **cannot be changed** once set.
- Only `id` is required. `name`, `email` and other properties are optional.

### Three ways to identify
Source: https://docs.knock.app/managing-recipients/identifying-recipients
- Direct: `PUT /v1/users/{user_id}`, an upsert.
- Inline: pass full recipient objects in a trigger. Knock identifies them before running the workflow. Client-side inline identify happens when `KnockProvider` is given `user={{ id, …props }}`, and works for users only.
- Bulk: `POST /v1/users/bulk/identify`.

### Node SDK method names
Sources: https://raw.githubusercontent.com/knocklabs/knock-node/main/README.md and https://raw.githubusercontent.com/knocklabs/knock-node/main/api.md
- The current SDK is Stainless-generated (`@knocklabs/node`, README peer example `"@knocklabs/node": "^1"`). It is `new Knock({ apiKey })`, which reads `KNOCK_API_KEY` by default.
- Methods relevant here:
  - Users: `client.users.update(userID, {...})` (PUT; this is the identify method), `users.get`, `users.delete`, `users.bulk.identify`, `users.feeds.listItems(userID, channelID, params)`.
  - Workflows: `client.workflows.trigger(key, {...})` and `client.workflows.cancel(key, {...})`.
  - Messages: `client.messages.markAsRead(id)`, `client.messages.batch.markAsRead({...})`, `client.messages.batch.archive({...})`.
- The **older SDK** (pre-v1) used `knock.users.identify(id, props)`, `knock.workflows.trigger(key, {...})` and `Knock.signUserToken`. I could not fetch the old README or npm page, so the old-API names are unverified and from memory.
- The current identify method is `users.update`. The docs' MultiLangCodeBlock for `users.identify` (https://docs.knock.app/managing-recipients/identifying-recipients) doesn't render its snippet in the text I fetched, so I couldn't confirm the exact call there.
- Behaviour:
  - Errors are `Knock.APIError` subclasses.
  - Retries: 2 by default, with backoff.
  - Default timeout: 1 minute.
  - Requires global `fetch`.
  - Both retries and timeout can be overridden per client or per request.

### Which key goes where
Source: https://docs.knock.app/in-app-ui/security-and-authentication
- Secret key: backend only. Public key: client.
- By default, enhanced security is **off**. Anyone with the public key can act as any user. Enable it before going live.
- With enhanced security on, Knock rejects public-key requests that lack a signed user token. The docs suggest enabling environments and keeping enhanced security off in dev.
- The public key can call a fixed list of endpoints. Examples: `GET /v1/users/:id/feeds/:channel_id`, the message status endpoints, preferences, and `PUT /v1/users/:id`. Workflow trigger is not on that list.

### Signing user tokens
Source: https://docs.knock.app/in-app-ui/security-and-authentication
- The signing key is separate from the API keys. Generate it under Platform → API keys. The private key is shown once. Store it as `KNOCK_SIGNING_KEY`, which the SDK reads by default.
- The JWT is **RS256**, with a required `sub` claim and recommended `iat` and `exp`. Default expiry is 3600 s.
- Optional `grants` and `explicit_grants` restrict which resources a token can touch. Examples are `user/feed_read` and `user/feed_write`.
- Helper in the current Node SDK (README, "JWT Token Signing"):

```ts
import { signUserToken } from "@knocklabs/node";
const token = await signUserToken(user.id, { expiresInSeconds: 3600 /*, signingKey, grants, shouldGenerateJti */ });
```

- The docs page still shows the older import `@knocklabs/node/lib/tokenSigner`. The v1 README exports `signUserToken` from the package root.
- The SDK uses `jose`. If you're on CJS and not on a Node version that can `require()` ESM, the README says to pin `jose` v5 via `overrides`.

### Token expiry on the client
- In `@knocklabs/client` (`packages/client/src/interfaces.ts`):
  - `AuthenticateOptions = { onUserTokenExpiring?: (currentToken, decodedToken) => Promise<string|void>; timeBeforeExpirationInMs?; identificationStrategy?: "inline"|"skip" }`.
  - `knock.ts` schedules the callback before `exp`.
- `KnockProvider` exposes `onUserTokenExpiring` and `timeBeforeExpirationInMs` as props (react-core `KnockProvider.tsx`).
- The docs' own "Handling token expiration" section (https://docs.knock.app/in-app-ui/security-and-authentication) was blocked, so its recommendations are unverified. The visible part of that page says to align token expiry with your session token's expiry.

---

## 3. Defining and triggering workflows

### Authoring
- The dashboard, the CLI (`npm i -g @knocklabs/cli`; `knock login` or `--service-token`; `knock.json` with `knockDir`) and the Management API are all supported. Source: https://docs.knock.app/developer-tools/knock-cli.
- `knock workflow push <key>` upserts a workflow by key. Add `--commit -m "msg"` to commit in the same step, and `--environment`, `--all --workflows-dir`. Source: https://docs.knock.app/cli/workflow/push.
- `knock commit promote --to=production`, or `--only=<commit id>` (the two flags can't be combined). Source: https://docs.knock.app/cli/commit/promote.
- The CLI is aimed at CI/CD (https://docs.knock.app/developer-tools/knock-cli).

### Environments and commits
Sources: https://docs.knock.app/version-control/environments and https://docs.knock.app/version-control/commits
- A new account has only **production**. "Enable environments" adds development, and can't be undone. Only an owner or admin can enable them.
- Each environment has its own API keys and its own users, messages, tenants and objects.
- Workflows, guides and layouts are version-controlled. They are editable only in the environment where they were created, and are promoted upward.
- A **saved draft is not live**. API triggers use only the last **committed** version. In production the dashboard calls this "Publish". Dashboard test runs use the last *saved* version (https://docs.knock.app/send-notifications/testing-workflows).
- After environments are enabled, the CLI and Management API default to the **development** environment. Pass `--environment production` explicitly where needed.
- The channel itself is account-level, and its settings are per environment (https://docs.knock.app/integrations/overview).

### Triggering (server)
Source: https://docs.knock.app/send-notifications/triggering-workflows/api

```ts
const res = await knock.workflows.trigger("comment-added", {
  recipients: ["user_42"],            // ids, objects, or inline recipient objects
  actor: "user_7",                    // attributed in the feed item; excluded if it is a subscriber of an object recipient
  data: { project: "Cadence", url },  // max 10 MB; flat is safest (see §4)
  tenant: "acme",                     // optional; scopes feed messages
  cancellation_key: "…",              // enables cancel
}, { headers: { "Idempotency-Key": "comment-added:user_42:comment_99" } }); // headers option per the SDK README
// res.workflow_run_id
```

- The trigger body fields are `key`, `actor`, `recipients`, `data`, `cancellation_key`, `tenant` and `settings`.
- `settings.sandbox_mode` and `settings.skip_delay` exist for test runs.
- **Idempotency**: send an `Idempotency-Key` header, up to 255 characters, valid for 24 hours. Only `POST /workflows/:key/trigger` honours it. Only 2xx responses are cached. A request with the same key but different parameters returns an error. Source: https://docs.knock.app/api-reference/overview/idempotent-requests.
- I did not find an SDK-level `idempotencyKey` parameter. The `headers` request option is documented in the README's "Making custom/undocumented requests" and "Accessing raw Response data" sections. The exact per-request `headers` usage is inferred from Stainless conventions, so treat it as unverified.

### Cancelling
Source: https://docs.knock.app/send-notifications/canceling-workflows
- `knock.workflows.cancel(key, { cancellation_key, recipients? })` returns 204.
- It only works on workflows with a pausing step (delay, batch, wait-for-event, or fetch retry backoff).
- A finished run can't be cancelled. For in-app messages you archive instead.
- Cancellation is asynchronous. Don't cancel within 5 seconds of the trigger, because it may miss the target.

---

## 4. Real-time updates, item fields, statuses and filtering

### Real-time delivery
Source: https://docs.knock.app/in-app-ui/api-overview
- Real-time delivery uses a websocket. The only event is `new-message`, and it "might be throttled". It carries badge-count metadata, not the full message.
- With the client directly, call `feed.listenForUpdates()` and then `feed.fetch()`. Source: https://docs.knock.app/in-app-ui/javascript/sdk/quick-start.
- `feed.on(eventName, cb)` and `feed.off(...)` bind to feed events. The `Feed` class emits events such as `all_seen`. Source: `knocklabs/javascript:packages/client/src/clients/feed/feed.ts`. I didn't find a complete event list in the docs, so that list is unverified.
- Options (all verified in source or docs):
  - `auto_manage_socket_connection: true`, plus `auto_manage_socket_connection_delay` (default 2000 ms), disconnect the socket in inactive tabs (feed docs page).
  - `__experimentalCrossBrowserUpdates` uses `BroadcastChannel` to keep tabs in sync. It is explicitly experimental.
  - `disconnectOnPageHidden` defaults to true in the client (`knock.ts`, `interfaces.ts`).

### Feed item fields
Sources: https://docs.knock.app/in-app-ui/api-overview and `knocklabs/javascript:packages/client/src/clients/feed/interfaces.ts`
- Fields: `id`, `blocks[]` (markdown, text or button_set; use `rendered`), `actors`, `total_actors`, `data`, `source` (workflow key, version and categories), `tenant`, `inserted_at`, `updated_at`.
- Timestamps: `seen_at`, `read_at`, `archived_at`, `clicked_at`, `interacted_at`, `link_clicked_at`.
- `compact` mode (the default) omits `activities`, `total_activities` and nested arrays or objects in `data`. It keeps at most one actor. Use `mode: "rich"` for the full payload.
- Metadata: `{ total_count, unread_count, unseen_count }`.

### Status methods
Source: https://docs.knock.app/in-app-ui/javascript/sdk/quick-start and the feed class source.
- `markAsSeen`, `markAsRead`, `markAsArchived`, plus the inverses `markAsUnseen`, `markAsUnread` and `markAsUnarchived`. All accept one item or an array. They update the store **optimistically**.
- `markAllAsSeen()` and `markAllAsRead()` exist (confirmed in `feed.ts`). `markAllAsArchived` and the others I did not confirm.
- If the user isn't authenticated these methods no-op (`canMutate` in `feed.ts`).
- Badge behaviour: `unseen_count` drives the badge by default. The headless docs describe `unread_count` as items the user hasn't explicitly engaged with.

### Filtering
Source: `FeedClientOptions` in `interfaces.ts`, and https://docs.knock.app/in-app-ui/api-overview
- Options: `status` (unread / read / unseen / seen / all), `archived` (include / exclude / only; the default **excludes** archived), `tenant`, `has_tenant`, `source`, `workflow_categories`, and `trigger_data` (**flat key-value only**, otherwise a 422). Also `page_size`, `before`/`after`, `inserted_at_date_range` and `mode`.
- The Free plan includes "Custom feed filtering" (https://knock.app/pricing).

### Channel ID requirement
- The feed ID must be a **UUID of an `in_app_feed` channel**, or the Feed logs an error. Source: `feed.ts` constructor, and the docs "Find your channel ID" callout.

---

## 5. Testing and local development

- **Environments.** Each has separate data and API keys. Use a dev environment with a dev public key, and keep enhanced security off there (https://docs.knock.app/in-app-ui/security-and-authentication).
- **Workflow test runner and CLI.** The test runner is in the dashboard, and `knock workflow run` is documented at https://docs.knock.app/cli/workflow/run (referenced from https://docs.knock.app/send-notifications/testing-workflows; I didn't open that page).
- **Sandbox mode.** The docs say "Sandbox mode is supported across all channel types (except for in-app)" (https://docs.knock.app/integrations/overview). So the trigger-level `settings.sandbox_mode` does not give you a no-op for the in-app feed. Messages for it are still created in that environment.
- **Local emulator / offline mode.** I found none in the docs I read. Treat as "none found", not as a confirmed absence.
- **Pricing page line.** "End-to-end testing: Yes" appears on every plan (https://knock.app/pricing). The page doesn't explain what it covers.
- **Mocking in Vitest.** Knock's docs don't recommend a mocking approach. This is my recommendation, not Knock's:
  - Keep the Node SDK behind one app module (for example `app/lib/notifications.server.ts`).
  - Tests `vi.mock` that module. For the SDK itself, inject a fake client with a `workflows.trigger` spy.
  - The SDK's `fetch` can also be injected: `new Knock({ fetch })` (README, "Customizing the fetch client"). That allows a fake `fetch` in tests that exercise the real SDK.
  - `signUserToken` needs a real RSA private key. For tests, generate a throwaway key pair in the test.

---

## 6. Free-tier limits

Source: https://knock.app/pricing (page text fetched in full for the plan table)
- **Free, $0/month:**
  - 10,000 messages sent per month. A message is "a single message delivered to a single user on a single channel".
  - 500 guide recipients per month.
  - 500 agent credits.
  - Unlimited stored profiles, workflows, broadcasts, delivery channels, team members and isolated environments.
  - In-app feeds: unlimited feeds per recipient, prebuilt components, bring-your-own components, the Feed API, custom feed filtering, unlimited feed retention.
  - Version control and history, and manage-via-API-and-CLI, are included.
  - Log retention is 30 days. Uptime SLA is 99.9%.
  - "Remove Knock branding": No (Starter and above).
  - No priority support.
- **Starter** is $250/month for 50,000 messages, then $0.005 each.
- **Over-limit behaviour.** "We don't hard cap your messages". Knock contacts you about adding a billing method.
- **Billing.** Messages that bounce or fail to send aren't billed. Messages generated by guide views don't count toward messages sent.
- **Per-user fan-out.** One trigger to N recipients on the in-app channel counts as N messages. Source: the FAQ on the pricing page.

---

## Implications for Cadence

1. **Packages.**
   - Server: `@knocklabs/node` (v1, Stainless; `signUserToken` is exported from the package root).
   - Client: `@knocklabs/react`, or `@knocklabs/client` plus `@knocklabs/react` hooks (headless).
   - For a custom UI that fits Cadence's design system, start with the headless hooks. Use the prebuilt popover only for speed.
2. **Server module.** Make a single `knock.server.ts` wrapper with `identifyUser`, `triggerNotification`, `cancelNotification` and `signFeedToken`. Read `KNOCK_API_KEY` and `KNOCK_SIGNING_KEY` there. The public key and feed channel ID go to the browser through the root loader.
3. **Identification.** Use Cadence's own string user IDs. Upsert via `users.update` on signup or profile change. Alternatively, pass inline recipient objects in the trigger. Keep user traits minimal, since Knock is a cache of your data.
4. **Auth.** Develop with enhanced security off and a dev public key. Before production, turn enhanced security on, mint a user token in the loader for the signed-in session, and give it the same lifetime as the session. Wire `onUserTokenExpiring` to refetch a token from a Cadence route. Consider `explicit_grants` limited to `user/feed_read` and `user/feed_write`.
5. **SSR.**
   - Render the feed after hydration (mounted flag or lazy). Without that, the popover's positioning and socket code may mismatch.
   - Verify Vite SSR handling of `@knocklabs/react` and its CSS in a spike. I did not verify this.
   - `KnockProvider enabled={false}` is a clean way to gate on a loaded token.
6. **Workflows.** Keep them in `.knock/` via `knock workflow pull`, and commit them to git. Deploy with `knock workflow push --all --commit`, and promote to production with `knock commit promote --to=production`. Remember that drafts are not live, so commit before API testing. Pass `--environment` explicitly after enabling environments.
7. **Triggering.**
   - Trigger from the server action that creates the event.
   - Include `actor` (the acting user) and a **flat** `data` object, so filtering by `trigger_data` works later.
   - Add an `Idempotency-Key` such as `event-type:recipient:entity-id`. Add `cancellation_key` only where the workflow has a delay or batch step.
   - Use `tenant` only if you need per-workspace feeds.
8. **Feed UX.** Badge from `unseen_count`. Call `markAllAsSeen()` when the panel opens. Use `markAsRead` on click, and `archived: "exclude"`, which is the default. Use `listenForUpdates()` for live updates. Enable `auto_manage_socket_connection` for idle tabs.
9. **Testing.** There's no local emulator, and sandbox doesn't cover in-app. Wrap the SDK in your server module and `vi.mock` it in Vitest. Assert on the payload passed to `workflows.trigger`. Keep integration tests in a dev Knock environment, and keep them out of CI unless you provide a dev key.
10. **Free tier.** 10,000 messages per month, with one message per recipient per trigger. Fan-out to many recipients burns quota quickly. Over-limit does not hard-stop.

**Gist:** Knock gives Cadence a browser-side feed (public key, user ID and signed JWT) fed by server-side `workflows.trigger` calls. Wrap the SDK behind one module, mount the feed client-only, commit and promote workflows, and mock the module in tests.

## Unverified or not found

- Token-expiry guidance page text, and the npm registry pages for the two packages (blocked fetches).
- Any `"use client"` directives in the React package bundle.
- A Knock page on SSR with React Router or Remix.
- A local emulator or offline mode (none found).
- The exact SDK `headers` usage for the idempotency key.
- A full list of feed events.