# Comment bodies are rendered to HTML on the server

A comment's body is untrusted markdown written by any signed-in Student. The server renders it to sanitised HTML (`renderComment` in `app/lib/comment-markdown.server.ts`) before it reaches the page, and a `RenderedComment` carries both the HTML to show and the raw markdown, which only fills the edit box. The sanitising renderer is server-only, so the browser never decides what markup is safe.

## Considered Options

- **Render markdown in the browser**: rejected, because it would ship the sanitiser to the client and let a stale or tampered bundle decide what HTML is safe.
