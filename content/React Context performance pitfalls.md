---
title: React Context is not free — performance pitfalls I've hit
tags:
  - react
  - performance
  - frontend
  - software_engineering
date: 2025-12-29
---

*This post was co-authored with Claude. The content is mine, adapted from an internal deep-dive session and guild presentation.*

---

I keep hearing "Redux is bad, just use Context." That certainly was the feeling at my HubSpot team over the last couple years. But after two large rounds of performance optimization (since I work on a tier-1 app, which is the strictest standard), I've learned that Context has real performance costs that people don't talk about enough.

Recently, we pulled an entire feature's state management from Context back to Redux Toolkit. Why? Re-renders. The inline panel was re-rendering constantly, and switching to RTK with selectors made it noticeably smoother.

This post is a brain dump of what I've learned about Context performance — the problems, the fixes, and the foot guns.

# Why does my component re-render?

Quick refresher. React re-renders a component when:
- Props change
- State changes
- **Context changes**

Here's the critical part most people miss: **React components will re-render if they consume a context, regardless of whether the value they read actually changed.**

If your context has `{ viewId, editHash }` and you only read `viewId`, you still re-render when `editHash` changes. This is by design — React doesn't do fine-grained subscriptions for Context.

# The problem: Monolithic contexts

The pattern I see everywhere:

```ts
const AppContext = createContext({
  documentId: string,       // low-churn: rarely changes
  userId: string,           // low-churn
  cursorPosition: number,   // high-churn: changes on every keystroke
  selection: Range | null,  // high-churn: changes frequently
  callbacks: { ... },       // stable
});
```

You've mixed high-churn state (cursorPosition, selection) with low-churn state (documentId, userId). Every time the cursor moves, every component consuming this context re-renders — even if they only care about documentId.

In complex UIs with toolbars, sidebars, and nested panels, this adds up fast.

# Fix #1: Split your contexts

Separate high-churn and low-churn state into different contexts:

```tsx
const DocumentCtx = createContext<{ documentId: string; userId: string }>(null);
const CursorCtx = createContext<{ position: number; selection: Range | null }>(null);

function SplitContextDemo() {
  const [documentId] = useState('doc-123');
  const [userId] = useState('user-456');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selection, setSelection] = useState<Range | null>(null);

  const docValue = useMemo(
    () => ({ documentId, userId }),
    [documentId, userId]
  );

  const cursorValue = useMemo(
    () => ({ position: cursorPosition, selection }),
    [cursorPosition, selection]
  );

  return (
    <DocumentCtx.Provider value={docValue}>
      <CursorCtx.Provider value={cursorValue}>
        <Toolbar />           {/* only re-renders on document change */}
        <CursorIndicator />   {/* only re-renders on cursor change */}
      </CursorCtx.Provider>
    </DocumentCtx.Provider>
  );
}
```

Now components that only need documentId won't re-render when the cursor moves.

# Fix #2: Use an external store

For frequently-changing state, consider moving it outside React entirely:

```tsx
import { useSyncExternalStore } from 'react';

const documentStore = createStore({ documentId: 'doc-123', userId: 'user-456' });
const cursorStore = createStore({ position: 0, selection: null });

function Toolbar() {
  const getSnapshot = useCallback(() => documentStore.get(), []);
  const doc = useSyncExternalStore(
    documentStore.subscribe,
    getSnapshot,
    getSnapshot
  );

  // Only re-renders when documentId or userId changes
  return <ToolbarUI documentId={doc.documentId} userId={doc.userId} />;
}
```

With external stores (Redux, Zustand, MobX, Apollo reactive vars), you get selector-based subscriptions. Components only re-render when their specific slice of state changes.

This is why Redux with selectors often outperforms Context for complex state — it's not about Redux being "better," it's about the subscription model.

# Foot gun #1: Hooks that re-join split contexts

You carefully split your contexts, then someone writes a "convenience" hook:

```ts
function useEditorContext() {
  const doc = useContext(DocumentCtx)!;
  const cursor = useContext(CursorCtx)!;
  return { documentId: doc.documentId, userId: doc.userId, cursorPosition: cursor.position };
}
```

Now every component using `useEditorContext()` re-renders on cursor changes, even if they only read documentId. The split is defeated.

**The fix:** Don't re-join in hooks. If a component needs both, let it call both contexts explicitly so the dependency is visible.

# Foot gun #2: Default arguments create new objects

This one is subtle:

```tsx
// BAD: new object created on every render
function ChildMemoBad({ options = {} as Record<string, unknown> }) {
  return <OptionConsumer options={options} />;
}

// GOOD: stable reference
const EMPTY_OPTS = {} as const;
function ChildMemoGood({ options = EMPTY_OPTS }) {
  return <OptionConsumer options={options} />;
}
```

Default argument `{}` creates a new object on every render → breaks memoization → unnecessary re-renders cascade down.

# Testing for re-renders

Here's a strategy I use to catch re-render issues:

```tsx
describe('render count tests', () => {
  it('counts re-renders with a spy', async () => {
    const onRender = jasmine.createSpy('onRender');

    function Inspector({ onRender }: { onRender: () => void }) {
      onRender();
      return <div data-testid="child">child</div>;
    }

    render(<Inspector onRender={onRender} />, {
      wrapper: ({ children }) => <SystemUnderTest>{children}</SystemUnderTest>,
    });

    expect(onRender.calls.count()).toBe(1);

    await getUserEventSession().click(screen.getByTestId('trigger'));
    await getUserEventSession().click(screen.getByTestId('trigger'));
    await getUserEventSession().click(screen.getByTestId('trigger'));

    expect(onRender).toHaveBeenCalledTimes(4); // 1 initial + 3 expected
  });
});
```

Wrap your system under test as a provider, put an inspector component inside, and count how many times it renders. If changing editHash causes viewId-only components to re-render, you've found a problem.

# What about React Compiler?

React Compiler (formerly React Forget) aims to auto-memoize components and hooks. In theory, it could mitigate some of these issues by automatically preventing unnecessary re-renders.

But it's not magic — it won't fix architectural problems like monolithic contexts or poorly designed hook dependencies. The fundamentals still matter.

# When to use Context

Context isn't bad. It's great for:
- Theme values (rarely change)
- Locale/i18n (rarely change)
- Feature flags (rarely change)
- Dependency injection (stable references)

Basically: **low-churn, widely-consumed values**.

For high-churn state, frequent updates, or state that only some components need, consider:
- Redux with selectors
- Zustand
- Jotai
- MobX
- useSyncExternalStore with your own store

# Takeaway

Context has a cost. Every consumer re-renders when the context value changes. If you're seeing performance issues and you're using Context heavily, check:

1. Are you mixing high-churn and low-churn state in one context?
2. Are your hooks re-joining split contexts?
3. Are default arguments creating new objects?

The solution isn't always "use Redux" — but understanding *why* [[Redux at scale - what actually works|Redux with selectors]] performs better helps you make the right call for your app.

