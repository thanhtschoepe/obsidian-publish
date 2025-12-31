---
title: My thoughts on bridging frontend and backend
tags:
  - architecture
  - frontend
  - backend
  - software_engineering
date: 2025-12-29
---

*Co-authored with Claude. I had scattered thoughts on this topic and we worked through them together.*

---

I've been noticing a trend: endpoints built specifically for the frontend are becoming the norm. Tighter coupling between client and server, on purpose.

This shows up from two directions.

**From the frontend side: meta-frameworks.** [Next.js](https://nextjs.org/) and [SvelteKit](https://kit.svelte.dev/) let you run code on the server before the page loads — `getServerSideProps`, `load` functions. You can call your database directly, validate and transform data, all in a trusted environment. The frontend reaches into the backend.

**From the backend side: [HTMX](https://htmx.org/) and the likes.** The server returns HTML directly. Links and buttons encode what actions are available — if the server renders a "Delete" button, that *is* the authorization check. The backend reaches into the frontend.

I tried HTMX because their [essays](https://htmx.org/essays/) make the case so clearly. It's novel, and I liked the purity of the argument. I built a small dashboard with [Axum](https://github.com/tokio-rs/axum), [Maud](https://maud.lambda.xyz/), and [Alpine.js](https://alpinejs.dev/) for client-side bits. Simple CRUD worked fine. But once I needed a filtering DSL — composing partial updates, managing state across interactions — I got lost. In the end, it didn't match my brain. The React model (data → UI as pure functions) is still how I think.

---

If you don't want that tight coupling — if you want a separate server-client architecture — I think typed RPC makes sense.

At HubSpot, we use an internal framework called CHIRP. It's Avro-based: define your service schema once, get typed clients for Java, Python, and TypeScript. Frontend and backend share the same contract. The compiler catches mismatches before production does.

[tRPC](https://trpc.io/) does something similar for TypeScript-only stacks. No code generation — just inference. I'm excited to try it in a hack project. Heard good things.

---

The real appeal of all these approaches — meta-frameworks, HTMX, typed RPC — isn't architectural purity. It's velocity.

When frontend can pull data without waiting on a backend ticket, features ship faster. When backend can render UI without coordinating with a frontend team, same thing. The best setup is whichever one lets your team move without blocking on someone else.
