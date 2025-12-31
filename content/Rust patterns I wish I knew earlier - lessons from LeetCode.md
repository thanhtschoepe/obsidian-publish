---
tags:
  - blog
  - rust
  - leetcode
date-created: 2025-12-31
status: published
---

# The Rust I learned from LeetCode

*Disclaimer: This article is co-authored with Claude as I revisited my notes from the past year. We picked out patterns that kept showing up and seemed worth sharing.*

None of what's below is really "idiomatic". But I like functional programming and the expressiveness it permits. Not all of it results in a superior solution, but I found some that looked lovely through some very interesting use. I hope you find these useful if you're also a fellow enjoyer of Rust.

---

## `try_fold` and early returns

In JavaScript, if I need to return early from a loop, I can't use `.reduce()` — I have to drop into imperative code. Rust has the same limitation with `.fold()`.

But `try_fold` solves it by repurposing `Result` as a control flow signal:

```rust
nums.iter()
    .enumerate()
    .try_fold(HashMap::new(), |mut seen, (i, &num)| {
        match seen.get(&(target - num)) {
            Some(&j) => Err(vec![j as i32, i as i32]),  // done, bail out
            None => {
                seen.insert(num, i);
                Ok(seen)  // keep going
            }
        }
    })
```

`Err` doesn't mean "error" here — it means "I found what I was looking for, stop iterating." That's a novel way to think about `Result`. It's not just for error handling; it's a general-purpose "continue or stop" signal.

## `bool.then()` and treating booleans like monads

Rust lets you attach methods to primitives, and `bool` has `.then()`:

```rust
// turn a bool into Option
c.is_ascii_alphanumeric().then(|| c.to_ascii_lowercase())
// true  → Some(c.to_ascii_lowercase())
// false → None
```

This is kind of rad. Rust treats `bool` like it can interop with the `Option`/`Result` world. It's a small thing, but it means you can stay in iterator chains instead of dropping into if-else:

```rust
s.chars().filter_map(|c|
    // Rust strings are unicode and lowercasing is really just an ASCII concept, so we need to test first!
    c.is_ascii_alphanumeric().then(|| c.to_ascii_lowercase())
)
```

## Iterator `.eq()` for comparison

Most languages only let you compare iterables if you convert them to strings first — or you write the comparison loop yourself. Rust's iterators have `.eq()` built in:

```rust
let chars = s.chars()
    .filter_map(|c| c.is_ascii_alphanumeric().then(|| c.to_ascii_lowercase()));

chars.clone().eq(chars.clone().rev())  // palindrome check
```

Element-by-element comparison, lazy, short-circuits on first mismatch. No allocation, no string conversion. Pretty rad.

## `Range` for two-pointer state

Two-pointer problems usually have two variables and an invariant you have to remember:

```rust
let mut left = 0;
let mut right = nums.len() - 1;
while left < right { ... }
```

I started using `Range` to bundle them:

```rust
let mut range = 0..nums.len();
while !range.is_empty() {
    let left = range.start;
    let right = range.end - 1;
    // shrink by adjusting range.start or range.end
}
```

One variable, and `is_empty()` captures the termination condition. It makes the "shrinking search space" idea more explicit.

## `Reverse` for min-heaps

Rust's `BinaryHeap` is a max-heap. Instead of implementing a min-heap, you wrap values:

```rust
use std::cmp::Reverse;

min_heap.push(Reverse(5));
min_heap.pop()  // gives Reverse(smallest)
```

`Reverse` just flips the `Ord` implementation. Zero runtime cost. The type encodes the behavior change.

---

## The common thread

Looking back, the patterns I like share something: they encode information in the type system.

- `Result` in `try_fold` encodes "continue vs. stop"
- `bool.then()` bridges booleans into `Option`
- `Range` encodes "a search space that shrinks"
- `Reverse` encodes "flip the ordering"

Rust rewards this way of thinking. And LeetCode, without the pressure of production code, is a good place to explore it.

---

*What have you learned from unusual practice?*
