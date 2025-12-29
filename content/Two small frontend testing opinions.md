---
title: Two small React opinions
tags:
  - testing
  - react
  - frontend
  - software_engineering
date: 2025-12-29
---

Two patterns I've landed on that make frontend code easier to test.

# Handle errors at the component layer

Errors should surface where you can do something about them — the component. Use `onError` callbacks from TanStack Query, render error states, show toasts. Don't swallow errors in hooks or services.

The component has UI context. It knows what the user was trying to do and what message makes sense. Everywhere else, errors should flow up, not disappear.

This connects to [[Better error handling|my thoughts on error handling]] — errors as data that flow to a single layer where you decide what to do with them.

# Keep the hook graph flat

Call hooks at the component level. Transform data with plain functions. Don't nest hooks inside hooks.

```tsx
function MyComponent() {
  const user = useUser();
  const permissions = usePermissions();

  const displayData = useMemo(
    () => processData(user, permissions),
    [user, permissions]
  );

  return <View data={displayData} />;
}
```

`processData` is unit testable without React. No providers, no render, no async utilities.

At HubSpot, I migrated a feature to a new state management library and fought through a tangled graph of hooks calling hooks. Intermediate hooks that "conveniently" combine data from other hooks create indirection — hard to trace, hard to test, hard to refactor.

Keeping hooks flat means a flatter data transformation path. You see all the data sources at the component level, and the transformation is explicit.

**The tradeoff:** There's always temptation to "just make a hook that gives me exactly what I need" vs "call all the hooks and plug them through useMemo." The latter is more verbose, and you might duplicate the combination across components.

My take: weigh how much an intermediate hook cleans up vs the indirection it causes. Ask whether the abstraction makes sense. Sometimes it does — but often it's premature, and you're better off with explicit plumbing.

The hard case is when your logic needs data from Context. But [[React Context performance pitfalls|do you need Context?]] Often you can pass data as arguments instead.

