---
title: A case for wrapper classes in frontend code
tags:
  - oop
  - software_engineering
  - react
  - frontend
---

React devs hear "object-oriented" and reach for the holy water. I get it — we all have trauma from class components, `this` binding, and `super()` nonsense.

But I want to share a pattern I like, even though I haven't been able to use it everywhere.

# The problem

In large frontend codebases, utility functions multiply and scatter. You end up with `utils/`, `helpers/`, `lib/` folders full of functions that operate on the same data types. New developers don't know these exist, so they write their own versions. Now you have implementation drift — two functions that should behave the same but don't.

Testing also suffers. When logic lives inside components (in a `useMemo` or inline), you need to spin up the whole React context, mock providers, stub network calls. It's expensive.

# The pattern: wrapper classes

Instead of free-floating utility functions, wrap your data in a class:

```ts
class ContactWrapper {
  constructor(public readonly inner: Contact) {}

  getDisplayName(): string {
    const { firstName, lastName, email } = this.inner;
    return [firstName, lastName].join(' ').trim() || email || 'Unknown';
  }
}
```

The key constraints:
- **Inner is `public readonly`** — no serialization headaches, still JSON-friendly
- **Don't subclass** — this isn't domain modeling, just utility co-location
- **Mutations return new instances** — stay immutable

# Why I like it

**Discoverability.** Type `contact.` and your IDE shows you what's available. No digging through utils folders.

**Interfaces for polymorphism.** If multiple data types share behavior, express it:

```ts
interface HasDisplayName {
  getDisplayName(): string;
}

function renderLabel(item: HasDisplayName) {
  return <span>{item.getDisplayName()}</span>;
}
```

Now your component doesn't care if it's a Contact, Company, or Association. Anything with `getDisplayName()` works.

**Easier testing.** Test the wrapper class in isolation. The component just calls the method.

# Where it works well

This pattern plays nicely with **reactive systems** — Svelte stores, MobX observables, anything where changing a variable updates the UI automatically. The mental model clicks: there's data, it has methods, changing it changes what you see.

I was actually inspired by MobX when I first explored this. At a previous job (Gofore), a backend dev who was versed in Java found this approach made frontend contributions easier for him. The wrapper class felt familiar — closer to how he already thought about data.

# Where it doesn't

**Redux.** I tried pitching this at my current job, but Redux wants plain objects everywhere. Middleware, selectors, serialization — all assume POJOs. Wrapping and unwrapping constantly defeats the purpose.

If your stack is heavily Redux-based, this pattern probably isn't worth the friction.

# Caveats I haven't fully explored

**Bundle size.** Free-floating functions are tree-shakable. Classes aren't — if you import the class, you get all its methods. I haven't used this at scale, so I don't know how bad it gets with large wrapper classes that accumulate unrelated methods or private helper dependencies.

Rust solves this with Traits, which group related methods together. TypeScript doesn't have that, so you'd need discipline to keep wrapper classes focused.

That said, even with this concern, the pattern encourages separating domain logic from components and hooks. That alone helps testing, which might be worth the tradeoff.

# The "but React uses plain objects" objection

Arrays have `.map()` and `.filter()`. Strings have `.toLowerCase()`. These are methods on prototypes — same mechanism as class methods. You pass arrays and strings around in props without issue. You can pass your own wrapper classes the same way.

# Conclusion

This is a pattern I like, not a prescription. It solves real problems — discoverability, drift, testability — but it needs a stack that doesn't fight it. If you're in Svelte, MobX, or a codebase with less Redux baggage, give it a try.
