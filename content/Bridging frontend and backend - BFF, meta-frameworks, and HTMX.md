---
title: My thoughts on bridging frontend and backend
tags:
  - architecture
  - frontend
  - backend
  - software_engineering
date: 2025-12-29
---

At work, we have a backend endpoint that's become a kitchen sink. It was designed as a shared resource for multiple teams, so it has to serve everyone. My team consumes most of it, but we don't own it. The result: complex JSON payloads where the frontend handles parsing, edge cases, dead fields. Stuff that feels like it shouldn't be our problem.

I pitched a Backend-for-Frontend (BFF) — a thin layer we'd own, sitting between us and the shared backend. We'd handle mapping and validation. The backend team would help with deployment and monitoring. The idea got traction, they spun up a repo, I reviewed PRs. It hasn't shipped yet (priorities), but I'm hopeful.

Funny thing: I wrote the proof-of-concept in Java. Hadn't touched it since college. But mapping and validation code? Not that hard, even in a language you barely know.

# The question underneath

The BFF was a specific fix for a specific problem, but it got me thinking about the broader question: where should the boundary between frontend and backend live?

A lot of the patterns I've experimented with are different answers to that question — and they tend to come from opposite directions. Meta-frameworks are frontend folks reaching into the backend. HTMX (and similar) is backend folks reaching into the frontend. Same problem, different starting points.

# Meta-frameworks

Next.js and SvelteKit let you run code on the server before the page loads — `getServerSideProps`, `load` functions. You can call your database directly. You can validate and transform data without exposing it to the client.

The appeal isn't SSR itself. It's that you're running in a trusted environment. When the server decides what data to send, a lot of client-side defensiveness goes away.

# HTMX

HTMX comes from the other direction. The server returns HTML directly, and links/buttons encode what actions are available. If the server renders a "Delete" button, that *is* the authorization check — the action exists because the server decided you can do it.

I like this in theory. In practice, I couldn't make it work for me.

I tried building a small dashboard with Axum and Maud. Did the whole thing — HTMX plus Alpine.js for the bits of client-side state you inevitably need. Simple CRUD worked fine. But once I needed something like a filtering DSL — composing partial updates, managing state across interactions — I got lost. Where does the state live? How do I reason about it?

Probably a skill gap. But the React model (data → UI as pure functions) is still how I think. I know where the complexity hides. With HTMX, I didn't.

# Where I've ended up

These days I lean on typed RPC. At HubSpot we use Chirp (Avro-based), which generates typed clients for both frontend and backend. Define the service once, get types everywhere. tRPC does something similar for TypeScript-only stacks.

What I care about is that the compiler catches mismatches before production does. The specific tool matters less than having *some* contract that both sides agree on and can verify.

The real appeal of all these approaches — BFF, meta-frameworks, HTMX, typed RPC — isn't architectural purity. It's velocity. When frontend can pull data without waiting on a backend ticket, features ship faster. When backend can render UI without coordinating with a frontend team, same thing. The best setup is whichever one lets your team move without blocking on someone else.
