---
title: Better error handling
tags:
  - software_engineering
  - error_handling
  - golang
  - rust
  - haskell
  - typescript
date: 2024-11-01
---
Bad error handling has cost billions of dollars, crashed planes, killed people, tanked stock markets, wrecked vehicles, and delayed flights. As we reflect on Halloween, it's fitting to consider these horror stories of software gone wrong. You can read more about them in my [[A Halloween scary story]], based on true events, or watch this newly minted Fireship video.

![](https://youtu.be/Iq_r7IcNmUk?si=WkMDGaLFP_OV80J2)

_Thank God I didn't fly during the CrowStrike incident (see what I did there?)._

Error handling isn't just a technical challenge - it's a critical aspect of software safety and reliability. Yet in TypeScript and JavaScript, it remains something of a wild west. Today, I'll share an overview of the current landscape and my preferred approaches.

# The Current State of Error Handling

The most common approach is the traditional try/catch method. Everyone is familiar with its basic syntax, which works similarly for both synchronous and asynchronous code:

```ts
try {} catch (e) {} finally {}
```

While this works well for simple scenarios, it presents significant challenges when scaled to enterprise-level applications or complex libraries.

## Limitations of Traditional Error Handling

_Previous I made the analogy that try/catch is akin to GOTO statement, which while some agreed, several disagreed. I also mention the analogy to callback hell without going further, which was under explained. I've since retracted these comments as it's not very relevant to the point and is technically not very correct analogies. 
While in my humble opinion that error is harder to follow, I've realized that good stack trace significantly alleviates the problem of finding the source of error, and so my argument no longer holds a lot of weight._

### 1. Type Safety Concerns
While you typically throw Error objects, [JavaScript allows you to throw anything](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/throw). This is why in TypeScript, caught errors are typically typed as `unknown`.

As teams increasingly rely on type-checking for code safety, this limitation becomes more problematic. You can't be certain what you're catching, which means your error handling code might itself be prone to errors.

### 2. Lack of Type System Integration
As developers increasingly depend on type-checking, there's a growing need for the type system to represent potentially throwing code, similar to how `Promise` indicates asynchronous execution.

Currently, there's no way to type thrown errors. Code that may throw is indistinguishable from code that won't. While some developers use `@throw` in JSDoc comments, relying on optional documentation isn't a sustainable strategy for critical systems like flight controls or medical devices.

# Modern Approaches to Error Handling

Recent approaches to better error handling share two key principles:
1. Avoid unpredictable control flow jumps
2. Treat errors as values

Instead of throwing errors, these approaches return them, making errors another form of sentinel value (similar to how `.indexOf` returns `-1` for failure rather than throwing).

## Go-style: Return Tuples

Source: https://go.dev/blog/error-handling-and-go

This approach returns a tuple containing either the result or an error:

```ts
type ResultTuple = [number, null] | [null, Error];
function divisionByZero(n: number): ResultTuple {};
```

The key advantage is that errors become part of the type system, making it explicit which code paths need error handling. There are proposals for syntax improvements to standardize this approach, as discussed in this video by Theo:

![](https://www.youtube.com/watch?v=lng6dmrWg8A)

## Monadic Style: Result Types

![](https://i.imgflip.com/98lel2.jpg)

While "monad" sounds intimidating, think of it as a container for values that might fail - similar to how `Promise` handles asynchronous operations. In error handling, this usually takes the form of `Either<L,R>` (Scala/Haskell) or `Result<T,E>` (Rust).

Here's how it looks in practice:

```ts
// Using Result type (Rust-style)
function division(a: number, b: number): Result<number, Error> {
    /* implementation details */
}

// Usage:
function main() {
    let data = division(4, 2); 
    if (data.isOk()) {
        // Safely access the success value
        console.log(data.unwrap());
    } else {
        // Handle the error case explicitly
        console.error(data.unwrapError());
    };

    // Chain operations with a fluent API
    data.map(n => n * 2).mapErr(err => err.toString());
}
```

You can find implementations of this pattern in functional programming libraries like [`Effect`](https://effect.website/docs/error-management/expected-errors/) or [Oxide-ts](https://www.npmjs.com/package/oxide.ts/v/1.0.0-next.6#new-in-10).

# Practical Considerations

In discussions with my colleagues at HubSpot, we've found that for typical frontend applications - especially those using `tanstack/query` or `apolloClient` for network error handling - the traditional try/catch approach often suffices.

The Go-style approach offers simplicity and accessibility, though it requires eager error handling. The monadic style provides more features, like boolean operations and chaining multiple fallible operations, while maintaining lazy evaluation. However, its learning curve and API complexity can be challenging, especially for junior developers.

As one Redditor aptly criticized Effect and similar functional programming tools:

> "...the cognitive burden of this approach is effectively the same as an entirely different programming language. All of the benefits and costs are mostly the same, but because the _language_ stays the same, time isn't allotted for stuff like the several days it takes to become comfortable with a different mental model like it otherwise would be.
> ...
> If you adopt this, do it with open eyes and be prepared to have 'TS repos' and 'Effect repos' and engineers who are familiar with one, but not the other, and the necessity of onboarding new engineers as if you were training them in a new programming language.
> **Large scale, paradigm-shifting user-space libraries like this are almost never a good choice unless the entire organization is willing to buy into them for every project in the language.**"
> - u/[oorza](https://www.reddit.com/user/oorza/)

# Tradeoff - No back trace
_This section is new in my 2nd edition of this article_

From my opinion it's common practice so have a layer somewhere in your codebase that handles error. Once an error is caught, it's possible to identify where it originated from in form of a stack trace. This isn't something that returning error as value provides, and it can be a bit of a problem to find exactly where the error may comes from, especially if there's some error mapping somewhere else before it reached this layer.

In Rust, (to the best of my knowledge), only `anyhow` crates enable Result to have error, which is not the default behavior. 
# Conclusion

While I personally favor the Rust approach and would use Oxide-ts in new projects, the choice of error handling strategy should align with your team's expertise and project requirements. Simple applications might be well-served by traditional try/catch, while more complex systems might benefit from the type safety and explicitness of Result types.

**What's your preferred approach to error handling? Share your thoughts in the comments below!**

