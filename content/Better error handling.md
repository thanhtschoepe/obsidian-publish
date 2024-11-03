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
async function fetchUserDataBasic(userId: number): Promise<UserData> {
  try {
    const profile = await fetchProfileRaw(userId);
    const posts = await fetchPostsRaw(userId);
    return { id: userId, profile, posts };
  } catch (error) {
    throw new Error(`Failed to fetch user data: ${error.message}`);
  }
}
```

While this works well for simple scenarios, it presents significant challenges when scaled to enterprise-level applications or complex libraries.

For the sake of comparison later with other alternative, let's consider the scenarios of **API Request Chain with Rate Limiting**.

Consider calling multiple dependent APIs where you need to:
- Handle rate limit errors specially (by waiting and retrying).
- Aggregate errors from multiple calls.
- Transform upstream service errors into your API's error format.
- Preserve the original error context for debugging.

The code would look somewhat like this:

```ts
// Traditional try/catch approach
type UserData = {
  id: number;
  profile: string;
  posts: string[];
};

type ApiError = { type: 'RateLimit' } | { type: 'NetworkError'; message: string };

// Traditional TypeScript with try/catch
// no way to type the possible Error.
async function fetchUserDataTraditional(userId: number): Promise<UserData> {
  try {
    const [profilePromise, postsPromise] = [
      fetchProfileRaw(userId),
      fetchPostsRaw(userId)
    ];

    try {
      const [profile, posts] = await Promise.all([profilePromise, postsPromise]);
      return {
        id: userId,
        profile,
        posts,
      };
    } catch (error) {
      // Handle rate limits by retrying both operations
      if (isRateLimit(error)) {
        await delay(1000);
        const [profile, posts] = await Promise.all([
          fetchProfileRaw(userId),
          fetchPostsRaw(userId)
        ]);
        return {
          id: userId,
          profile,
          posts,
        };
      }
      throw error; // could have been replaced with anything and no type error!
    }
  } catch (error) {
    throw new Error(`Failed to fetch user data: ${error.message}`);
  }
}

// Helper functions for the traditional approach
async function fetchProfileRaw(userId: number): Promise<string> {
  const result = await fetch(`/api/profile/${userId}`);
  if (!result.ok) {
    throw { 
      type: result.status === 429 ? 'RateLimit' : 'NetworkError',
      message: await result.text()
    } as ApiError;
  }
  return result.text();
}

async function fetchPostsRaw(userId: number): Promise<string[]> {
  const result = await fetch(`/api/posts/${userId}`);
  if (!result.ok) {
    throw { 
      type: result.status === 429 ? 'RateLimit' : 'NetworkError',
      message: await result.text()
    } as ApiError;
  }
  return result.json();
}
```

^z3ctgq

## Limitations of Traditional Error Handling

_Previous I made the analogy that try/catch is akin to GOTO statement, which while some agreed, several disagreed. I also mention the analogy to callback hell without going further, which was under explained. I've since retracted these comments as it's not very relevant to the point and is technically not very correct analogies. 
While in my humble opinion that error is harder to follow, I've realized that good stack trace significantly alleviates the problem of finding the source of error, and so my argument no longer holds a lot of weight._

### 1. Type Safety Concerns
While you typically throw Error objects, [JavaScript allows you to throw anything](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/throw). This is why in TypeScript, caught errors are typically typed as `unknown`.

As teams increasingly rely on type-checking for code safety, this limitation becomes more problematic. You can't be certain what you're catching, which means your error handling code might itself be prone to errors.

Did you catch the bug in the example above? Hint: it's line 43
![[Better error handling#^z3ctgq]]


> [!warning]- Bug on line 43
> The thing that was thrown on line 40 is not an instance of Error, so `.message` will throw a very unhelpful `cannot read property of undefined`. Good luck finding out! 

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

A very simple example, for starter, could be division by zero.
```ts
type Result<T, E> = [T, Error | null];

function divide(a: number, b: number): Result<number> {
  if (b === 0) {
    return [0, new Error("Division by zero")];
  }
  return [a / b, null];
}
```

This approach returns a tuple containing either the result or an error.

Here's how it looks in a complex scenario.

```ts

// Go-style approach in TypeScript
type Result<T> = [T, ApiError | null];

async function fetchUserDataGo(userId: number): Promise<Result<UserData>> {
  // Launch both requests in parallel
  const profilePromise = fetchProfileGo(userId);
  const postsPromise = fetchPostsGo(userId);

  // Wait for both and check errors
  const [profileResult, postsResult] = await Promise.all([
    profilePromise,
    postsPromise
  ]);

  const [profile, profileErr] = profileResult;
  const [posts, postsErr] = postsResult;

  // If either had a rate limit error, retry both after delay
  if (profileErr?.type === 'RateLimit' || postsErr?.type === 'RateLimit') {
    await delay(1000);
    const [retryProfileResult, retryPostsResult] = await Promise.all([
      fetchProfileGo(userId),
      fetchPostsGo(userId)
    ]);

    const [retryProfile, retryProfileErr] = retryProfileResult;
    const [retryPosts, retryPostsErr] = retryPostsResult;

    if (retryProfileErr !== null) {
      return [null, retryProfileErr];
    }
    if (retryPostsErr !== null) {
      return [null, retryPostsErr];
    }

    return [{
      id: userId,
      profile: retryProfile,
      posts: retryPosts
    }, null];
  }

  // Check original errors if not rate limited
  if (profileErr !== null) {
    return [null, profileErr];
  }
  if (postsErr !== null) {
    return [null, postsErr];
  }

  return [{
    id: userId,
    profile,
    posts
  }, null];
}

// Helper functions for Go style
async function fetchProfileGo(userId: number): Promise<Result<string>> {
  try {
    const result = await fetch(`/api/profile/${userId}`);
    if (!result.ok) {
      const error: ApiError = {
        type: result.status === 429 ? 'RateLimit' : 'NetworkError',
        message: await result.text()
      };
      return ["", error];
    }
    return [await result.text(), null];
  } catch (error) {
    return ["", { type: 'NetworkError', message: String(error) }];
  }
}

async function fetchPostsGo(userId: number): Promise<Result<string[]>> {
  try {
    const result = await fetch(`/api/posts/${userId}`);
    if (!result.ok) {
      const error: ApiError = {
        type: result.status === 429 ? 'RateLimit' : 'NetworkError',
        message: await result.text()
      };
      return [[], error];
    }
    return [await result.json(), null];
  } catch (error) {
    return [[], { type: 'NetworkError', message: String(error) }];
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const isRateLimit = (error: unknown): error is ApiError => 
  (error as ApiError)?.type === 'RateLimit';
``` 

A library that can make this process easier is [go-go-try](https://github.com/thelinuxlich/go-go-try). Theo also covered a proposal to have this approach integrated into the language.

![](https://www.youtube.com/watch?v=lng6dmrWg8A)
## Monadic Style: Result Types

![](https://i.imgflip.com/98lel2.jpg)

While "monad" sounds intimidating, think of it as a container for values that might fail - similar to how `Promise` is a container for a future value. In error handling, this usually takes the form of `Either<L,R>` (Scala/Haskell) or `Result<T,E>` (Rust - [Check guide here](https://doc.rust-lang.org/book/ch09-00-error-handling.html)).

A brief demo for how it works in simple case.
```ts
import { Result, ok, err } from 'neverthrow';

// Simple example
function divideMonadic(a: number, b: number): Result<number, Error> {
  return b === 0
    ? err(new Error('Division by zero'))
    : ok(a / b);
}

// alternative, these system often have a "entrypoint" type of function to convert into the monadic system like so.
function divideMonadic2(a: number, b: number): Result<number, Error> {
 // entrypoint "fromThrowable" capture the fallible system into the monadic framework.
 return Result.fromThrowable(a / b, () => new Error('Division by zero'))
}

// Usage showing composition
const result = divideMonadic(10, 2)
  .map(n => n * 2)
  .mapErr(e => new Error(`Calculation error: ${e.message}`));
```

Here's how it looks in practice (using [`neverthrow`](https://github.com/supermacro/neverthrow)):

```ts
import { Result, ResultAsync, err } from 'neverthrow';

// Types
type UserData = {
  id: number;
  profile: string;
  posts: string[];
};

// It's typical in these community to have union type that represents all possible way a module can fail.
type ApiError = { type: 'RateLimit' } | { type: 'NetworkError'; message: string };

// API functions
function fetchProfile(userId: number): ResultAsync<string, ApiError> {
  // Implementation not shown, but typically these systems provide methods to "enter the Result" system, like fromPromise
  return ResultAsync.fromPromise(/* ... */);
}

function fetchUserPosts(userId: number): ResultAsync<string[], ApiError> {
  // Implementation not shown
  return ResultAsync.fromPromise(/* ... */);
}

// Main business logic
function fetchUserData(userId: number): ResultAsync<UserData, ApiError> {
  const profileResult = withRetry(fetchProfile(userId));
  const postsResult = withRetry(fetchUserPosts(userId));

  return ResultAsync.combine([profileResult, postsResult])
    .map(([profile, posts]) => ({
      id: userId,
      profile,
      posts,
    }));
}

// Helpers
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = <T>(ra: ResultAsync<T, ApiError>): ResultAsync<T, ApiError> => 
  // functional style where developer "attach" logic in the form of callbacks
  // orElse: https://github.com/supermacro/neverthrow?tab=readme-ov-file#resultasyncorelse-method
  ra.orElse(error => 
    error.type === 'RateLimit'
      ? delay(1000).then(() => ra)
      : err(error)
  );
```

These system tuck the difficulty of control flow behind a framework (theoretically known as Monad). You as the application developer will work with the data and error through via attaching "callbacks". Error and data transformation can be done via these methods.

You can find implementations of this pattern in functional programming libraries like [`Effect`](https://effect.website/docs/error-management/expected-errors/) or [Oxide-ts](https://www.npmjs.com/package/oxide.ts/v/1.0.0-next.6#new-in-10) and [neverthrow](https://github.com/supermacro/neverthrow).
#  My take on the tradeoffs

In discussions with my colleagues at HubSpot, we've found that for typical frontend applications - especially those using `tanstack/query` or `apolloClient` for network error handling - the traditional try/catch approach often suffices. **The shorter your data journey is to the layer that handles the error, the less useful the other alternatives bring.**

![[Better error handling 2024-11-03 14.30.17.excalidraw]]

The Go-style approach offers simplicity and accessibility, though it requires eager error handling which can **result in extreme verbosity**. The monadic style provides more features, like boolean operations and chaining multiple fallible operations, while maintaining lazy evaluation. However, **its learning curve and API complexity can be challenging**, especially for junior developers, or folks who disliked functional programming paradigm.

As one Redditor aptly criticized Effect and similar functional programming tools:

> "...the cognitive burden of this approach is effectively the same as an entirely different programming language. All of the benefits and costs are mostly the same, but because the _language_ stays the same, time isn't allotted for stuff like the several days it takes to become comfortable with a different mental model like it otherwise would be.
> ...
> If you adopt this, do it with open eyes and be prepared to have 'TS repos' and 'Effect repos' and engineers who are familiar with one, but not the other, and the necessity of onboarding new engineers as if you were training them in a new programming language.
> **Large scale, paradigm-shifting user-space libraries like this are almost never a good choice unless the entire organization is willing to buy into them for every project in the language.**"
> - u/[oorza](https://www.reddit.com/user/oorza/)

Also, it's common practice so have a layer somewhere in your codebase that handles the remaining recoverable error. Once an error is caught, it's possible to identify where it originated from in form of a stack trace. This isn't something that returning error as value provides, and it can be a bit of a problem to find exactly where the error may comes from, especially if there's some error mapping somewhere else before it reached this layer.

In Rust, (to the best of my knowledge), only `anyhow` crates enable back trace for Result type. Otherwise this is not the default behavior.

# The community's take on the tradeoff
Reddit: https://www.reddit.com/r/typescript/comments/1gi5zul/error_handling_in_typescript/ 
## Additional Context: Panic vs. Recoverable Errors

A significant point raised by the community is the distinction between panic/unrecoverable errors and normal error handling:

> Panics and error return types are two different issues... In Rust you have results that can be an error and you have system failures that can panic. If you have a panic it's the equivalent of a non catchable error in JS, it will simply kill that program because it doesn't know what to do.

> The typical practice is to use errors-as-values for recoverable errors... Irrecoverable errors can still be exceptions. There's not much you can do except let them bubble up and terminate the program.

This helps explain why even languages like Go and Rust, which primarily use errors-as-values, still have concepts like `panic`:

> Go/Rust style error handling sucks and is incomplete. Both of these languages have the concept of a "panic" to deal with the fact that "errors as values" is a broken concept with gaping holes in it.

## The "Check Everything" Controversy

An interesting debate emerged about the necessity of checking every possible error:

> The problem with "errors as values" is that literally every single line of code can potentially error. So if you truly want to be absolutely safe, you have to check for an error after every single calculation in your code.

However, this was contested by others:

> In JS world this could be true, but for Rust (and statically typed compiled languages in general) this is actually not the case... GO pointers are the only exceptions to this. There are no nil check protection at compile level. But Rust, kotlin etc are solid.

## Practical Implementation Strategies

> Not saying I agree, but if you follow OP's thinking, runtime errors thrown by external libraries should be caught by your code as soon as possible, then wrapped in whatever data structure you deem appropriate.

Which explains `fromPromise` methods (and friends) found in `neverthrow` implementation.
## In Defense of Try/Catch

Several developers make compelling arguments for try/catch:

> The performance cost of throwing an exception matters very little, because you only pay it when an exception is actually thrown. With errors as values, you are ALWAYS paying the performance cost because you have to constantly check for errors even when no error has occurred!

> If you need to do cleanup, then that is what the finally block is for. Languages like C# has had the using keyword to allow you to automatically do cleanup, and typescript has gotten a very similar using keyword [...] which gives you some nice syntactic sugar to do what the finally block is for traditionally.

> Try/catch/finally has very specific rules on how it works. I find code protected by exceptions a lot easier to reason about than code that has if err plastered all over it.

> They're all just patterns that you follow depending on the language implementation. Of course, JS/TS's try catch implementation is egregiously bad compared to all the rest of them... but... that's a languiage issue not a "which style is better" issue
> As far as I have been able to see, you don't write any better code if you have a system that throws versus a system that doesn't, either way, it's your problem when you write code that fails, and you'll handle it according to the methods available in the specific language.
 You don't ever have to throw in Javascript. But if you never catch, then you're going to have the worst error handling.

> Try catch has a very long history in programming languages.
## Arguments for Alternative Approaches

However, many developers recognize limitations with try/catch, particularly in TypeScript:

> In JS/TS you can't easily distinguish what type of error occurred and thus handle it accordingly. It could truly be anything.

> In JavaScript you can throw any value. throw 42 is perfectly legal.

> The typical practice is to use errors-as-values for recoverable errors, like "the user didn't enter a valid email address" (so we need to handle that error and take a specific action, such as showing them a nice validation error and letting them try again).

## Arguments against Alternative approaches

The community highlights important tradeoffs about performance and DX concerns.

> People have benchmarked this. Code that uses errors as values is significantly slower than code that uses exceptions.

> I write mainly Go code at the moment. A big proportion of the code are the three lines `if err != nil { return nil, err }`. It really isn't that great an experience.

> You want to us to wrap all our return types? This would create massive overhead to handle a very small annoyance.
> Also, we still need to handle exceptions which occur due to runtime errors.

# Conclusion



While I personally favor the Rust approach and would use `oxide-ts` / `neverthrow` in new projects, the choice of error handling strategy should align with your team's expertise and project requirements. Simple applications might be well-served by traditional try/catch, while more complex systems might benefit from the type safety and explicitness of Result types.

![[Better error handling 2024-11-03 15.05.02.excalidraw]]
**Here's my unhelpful flow chart.**

**What's your preferred approach to error handling? Share your thoughts in the comments below!**