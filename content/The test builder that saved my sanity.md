---
title: The test builder that saved my sanity
tags:
  - testing
  - react
  - frontend
  - software_engineering
date: 2025-12-29
---

I was working on viz-core — a state management library for HubSpot's index page. The migration was going fine until I hit the tests.

The index page has a lot of interdependent state: Redux, React contexts, MSW handlers, property metadata. The existing test setup required you to wire each system separately. Want the active view to be `view-123`? Set it in Redux. Set it in the context. Set it in the cache. Make sure the MSW handler returns it.

I kept running into cases where one system disagreed with another and the test failed mysteriously. That was quite an experience!

# The insight

A staff engineer had mentioned earlier that year: "you should have a mock-world style builder." It stuck with me.

The idea: **if a library provides abstraction in code, it should also provide abstraction in test.**

Viz-core already ships its own test builder — the library knows its internals, so it can abstract them for test authors. You don't need to know which endpoint viz-core calls or craft MSW response shapes. The builder handles it.

But the index page consumes viz-core alongside other systems (Redux slices, property metadata, scopes). So I added an index page builder that composes viz-core's builder with the rest of the test infrastructure.

# What I built

The index page builder presents a unified interface — you describe the world, it handles the rest:

```ts
const { render } = createIndexTestBuilder()
  .withActiveView({ id: 'view-123', name: 'My View' })
  .withProperties([{ name: 'email', type: 'string' }])
  .withScopes(['crm-access'])
  .build();

render(<MyComponent />);
```

Internally, the builder composes viz-core's builder with the rest of the test infrastructure. But that's an implementation detail — test authors don't see it. They just describe the world at the business level, and everything agrees.

# Why this matters

The constrained `with*` API forces the builder to stay aligned with what the library actually exposes. If the library changes how it fetches views, the builder updates — test authors don't have to.

It also made onboarding easier. New engineers could write tests without understanding every layer of the stack. That alone was worth it.

This connects to [[Two small React opinions|my opinion on keeping hooks dumb]] — when you separate business logic from plumbing, testing gets easier. The builder is the same idea: separate what you're testing from how the test infrastructure works.
