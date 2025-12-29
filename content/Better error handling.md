---
title: My thoughts on error handling in TypeScript
tags:
  - software_engineering
  - error_handling
  - typescript
date: 2024-11-01
---
 o
I've been thinking about error handling in TypeScript lately. This isn't a definitive guide — just where I've landed after writing a lot of frontend code.

# The problem with try/catch

Try/catch works fine for simple cases. But it has two things that bother me:

1. **You can't type errors.** In TypeScript, caught errors are `unknown`. You have no idea what you're catching.
2. **You can throw anything.** `throw 42` is valid JavaScript. Good luck handling that.

```ts
try {
  await doSomething();
} catch (error) {
  // error is `unknown`. Could be anything.
  // hope you enjoy runtime surprises!
}
```

For small apps where errors just bubble up to a toast notification, this is fine. But when you need to handle different error types differently — retry on rate limits, show specific messages for validation errors — the lack of typing starts to hurt.

# Alternatives I've tried

## Go-style tuples

Return `[value, error]` tuples instead of throwing:

```ts
const [data, err] = await fetchUser(id);
if (err) {
  // handle it
}
```

**What I like:** Simple, explicit, no magic.

**What I don't:** Gets verbose fast. You end up with `if (err)` checks everywhere. Go developers know the pain.

## Result types (neverthrow, oxide-ts)

This approach is inspired by Rust, which I really like. Wrap values in a `Result<T, E>` type that's either `Ok` or `Err`:

```ts
const result = await fetchUser(id);

result
  .map(user => user.name)
  .mapErr(err => logError(err));
```

**What I like:** Typed errors. Chainable. Forces you to handle the error case.

But the thing I appreciate most is that it lets you **concentrate error handling into one layer**. Errors become data that flows through your system — similar to how you pipe data into components for display. Instead of scattered `console.error` calls and try/catch blocks at every level, errors bubble up to a single place where you decide: log it, show a toast, render an error state, whatever.

This avoids the classic problems of double-logging or noisy console errors that should've been user-facing messages. If you've worked with Rust backends (like axum with `thiserror`), it's a similar pattern — errors are typed, composable, and handled at the boundary.

**What I don't like:** Learning curve. Your teammates need to buy in. It's basically a different programming paradigm.

I shared this with the TypeScript community and at work. The feedback was mixed — people either loved it or found it too foreign. The challenge is always adoption.

# Where I've landed

For most frontend work — especially if you're using React Query or Apollo — try/catch is fine. These libraries already handle the error state for you. The distance from "error happens" to "error is displayed" is short.

Result types shine when:
- You're building a library
- Errors need to flow through multiple layers
- You actually need to distinguish between error types programmatically

I personally like `neverthrow` for new projects where I control the codebase. But I wouldn't push it on a team that's not into functional patterns. The cognitive overhead isn't worth the holy war.

**TL;DR:** Use what fits your team. Try/catch isn't broken, it's just limited. If those limits bite you, there are options.
