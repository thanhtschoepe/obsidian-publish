---
title: Redux at scale — what actually works
tags:
  - redux
  - frontend
  - state-management
  - software_engineering
date: 2025-12-29
---

Redux has a reputation problem. Mention it and people groan about boilerplate, thunks, and action type constants. But at HubSpot, we use Redux Toolkit on some of our highest-traffic applications. I was skeptical about traditional redux for a while, but Redux Toolkit was a pleasant surprise.

Here's what I've learned about making Redux work at scale.

# Redux Toolkit fixed most of the pain

The old complaints — verbose action creators, manual immutable updates, thunk boilerplate — are mostly solved. `createSlice` handles actions and reducers together. Immer handles immutability. RTK Query exists if you want it.

Some teams pushed for Zustand (simpler API, less ceremony), and I personally prefer reactive variable patterns (MobX, Svelte stores). But Redux Toolkit is a reasonable choice when you need explicit state transitions and middleware.

# The middleware model is underrated

The thing that clicked for me: **listenerMiddleware**.

We use it heavily for complex side effects. For example, an autosave feature that:
- Fires an API call only when there's actual change
- Checks specific conditions before saving
- Handles migration logic between data versions

This isn't a simple "dispatch action → call API" thunk. It's conditional, stateful, and needs access to both previous and current state. `listenerMiddleware` handles this cleanly — you listen for specific actions or state changes and run effects in response.

```ts
listenerMiddleware.startListening({
  predicate: (action, currentState, previousState) => {
    // only trigger when specific slice changes
    return currentState.editor.data !== previousState.editor.data;
  },
  effect: async (action, listenerApi) => {
    // debounce, validate, then save
    await listenerApi.delay(1000);
    const state = listenerApi.getState();
    if (shouldAutosave(state)) {
      await saveToServer(state.editor.data);
    }
  },
});
```

This is readable. The conditions are explicit. Testing is straightforward.

# Separating UI state from server state

The other thing that works well: **don't put everything in Redux**.

We have an internal tool similar to TanStack Query (for REST). We inject it alongside Redux:

- **Redux** handles UI state and effects (what's open, what's selected, optimistic updates)
- **The data fetching layer** handles server state (fetching, caching, background refetching)

This separation is huge. Redux stays focused on things that are actually UI concerns. Network state has its own lifecycle, its own cache invalidation, its own loading states. Mixing them leads to bloated reducers and confusing data flows.

# Why not just React Context?

We tried. Before this setup, we had a bunch of React contexts for shared state.

It got expensive. Context triggers re-renders on every consumer when the value changes. With complex UIs and frequent updates, performance tanked. We were memoizing everything, splitting contexts into tiny pieces, and still fighting re-renders.

Redux with selectors solved this — components subscribe to specific slices, updates are granular. The performance difference was noticeable.

(This could be its own post.)

# The underrated benefits

**Widespread knowledge.** Redux is often the first state management tool people learn. At HubSpot, this matters — engineers can transfer between teams without learning a new state paradigm. Every now and then there's another discussion about state management, and the staff engineers and infra folks keep landing on Redux for this reason: it's a common denominator that keeps teams flexible.

**Event sourcing patterns.** Redux is conceptually close to event sourcing. Actions are events, reducers are projections. This unlocks powerful patterns like undo/redo — you're just replaying or reversing actions. Time-travel debugging comes free.

**Testing is actually easier.** This surprised me. Before Redux, we had a lot of context-based state. Tests would partially mock things, code would throw errors from missing providers, and error boundaries would swallow them silently. Tests passed but behavior was weird. With Redux, state is explicit and injectable. No hidden context dependencies.

# The tradeoffs

Redux isn't perfect:
- **Boilerplate still exists**, even with RTK. Slices, selectors, typed hooks — it adds up.
- **It doesn't play well with some patterns** — like the [[Sometimes, objected oriented programming is the right choice|wrapper class pattern]]. Redux wants plain objects everywhere.

But for applications with complex UI state and the need for explicit transitions, it holds up.

# Takeaway

Modern Redux (RTK + listenerMiddleware + separation from server state) is a legitimate choice. The old criticism is dated. If your team knows it, your app has complex state transitions, and you need middleware for effects, don't let the discourse scare you off.

That said, if your app is simpler, Zustand or even just React Context might be enough. Pick the tool that fits.

