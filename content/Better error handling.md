---
title: Better error handling
tags:
  - software_engineering
  - error_handling
  - golang
  - rust
  - haskell
  - typescript
---
I hope everybody had a fun Halloween night.

Today, I wanna talk about Error Handling. There's a lot of horror and tragedy involving bad error handling. You can read more about them in my [[A Halloween scary story]], based on true events, or watch this newly minted Fireship video.

![](https://youtu.be/Iq_r7IcNmUk?si=WkMDGaLFP_OV80J2)

_Thank God I didn't fly during the CrowStrike strike (see what I did there?)._

Bad error handling costed billions of dollar, crashed plane, killed people, tank the stock market, wreck vehicle, delayed flights, so on and so forth. No wonder why this topic is so passionate.

The strategy to deal with error is also a source of controversy amongst different camps of developers. For Typescript and Javascript though, it's still a wild west. Today I wanted to share what I know of the landscape is, and my personal favorite.


# The current art
It's the normal try/catch method. Everybody knows how this work. Same goes for async code.

```ts
try {} catch (e) {} finally {}
```


Looks good for small and simple problem. But when scaled to enterprise and complicated library scale of complexity, this left much to be desire.

Here's the list of problems that people have complained about it:
## Control jump, so basically a glorified go/to. 
Legendary computer scientist [Edsger W. Dijkstra](https://dl.acm.org/doi/10.1145/362929.362947# "Edsger W. Dijkstra") [Goto statement considered harmful](https://dl.acm.org/doi/10.1145/362929.362947)

![](https://www.explainxkcd.com/wiki/images/7/7a/goto.png)

_credit: XKCD_

This is basically the same suffering that earlier developer pre-Promise suffered.
## Anything can be thrown 
You typically throw Error. But did you know that [you can actually throw anything](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/throw)?

It's why in typescript, typically the caught error type is `unknown`.

As more and more people relied on the benefit of type-checking, this break is gnarly. You don't know what you're catching for sure. Your handling code might break as well.

## Throwing code is a surprise

Again, **as more and more people relied on the benefit of type-checking**, ideally the type system can represent the fact that some code may throw, just like how `Promise` represents that the code might not execute synchronously.

There's currently no way to type thrown Error. Code that may throw are completely indistinguishable from code that is guaranteed from not throwing. The best I've seen people could do is adding `@throw` to JSDoc, but documenting code itself is surprising a controversial topic.

If you're going to build software for the next flight control system, or health-saving medical devices, "opt-in" comment from other devs are not really a sustainable strategy.

# What are the options 
Every attempts at better error handling that I've seen these days all agree on the fact that the jumpy control flow is not ideal, and it's necessary to treat Error as Value. You can read more about the motivation [here](https://jessewarden.com/2021/04/errors-as-values.html). Instead of `throwing` error, you `return` it.

In a way, the error becomes another kind of **sentinel** value. It's like how `-1` denotes failure for `.indexOf` method, instead of throwing error.
## Go style
Source: https://go.dev/blog/error-handling-and-go

Instead of return normally, you return a tuple 

```ts
type ResultTuple = [number, null] | [null | Error];
function divisionByZero(n: number): ResultTuple {};
```

The main takeaway here is of course the error is returned, and it is representable by the type system. Documentation is automatic, and it's explicit what code needs error handling, and what's not.

There are proposal about a syntax sugar to make this process better and standardized. You can watch this video from Theo about the topic.

![](https://www.youtube.com/watch?v=lng6dmrWg8A)

## Monadic style

 ![](https://i.imgflip.com/98lel2.jpg)


Monad is such a big word. But essentially it's a data structure that you can "plug" functions in to deal with the error. `Promise` is the closest example I can think of how a Monad would look and feel like.

For error, it's typically called `Either<L,R>` (scale/haskell) or `Result<T,E>` (rust). Typically these are a opaque data structure and so eventually you'll need to "unwrap" the structure to get the data inside, forcing you to handle the error case.

```ts
// type signature is now Result (from Rust)
function division(a: number, b: number): Result<number, Error> {
	/* not focus */
}

// usage;
function main() {
	let data = division(4, 2); 
	if (data.isOk()) {
		// you have to "open" the box to get the value.
		console.log(data.unwrap());
	} else {
		// and you're force to handle the error case, too.
		console.error(data.unwrapError());
	};

	// monad typically allow fluent API to do transformation, similar to Promise
	data.map(n => n *2 ).mapErr(err => err.toString());
}
```

Monadic error handling is most prevalent in Haskell, Scala, Rust and other functional programming language community because it's deeply a functional programming language idea.

You can find implementation of this in popular FP library, like [`Effect`](https://effect.website/docs/error-management/expected-errors/)

My personal favorite Rust flavor is [Oxide-ts](https://www.npmjs.com/package/oxide.ts/v/1.0.0-next.6#new-in-10).

# My take

I did bring these ideas up to my esteemed college at HubSpot. We all agreed that for application developer, especially when you have things like `tanstack/query`and `apolloClient` to deal with errors related to networking, which is by far the largest fallible body of code in a typical front-end applicable, then your use case is simple enough that try/catch would suffice.

Go-style has the advantage of simplicity, which is true to Go spirit. Using the pattern is simple, and perhaps that's enough for even more complex use case. The one critique that I have is that error handling becomes eager.

Monadic-style has more feature, for example supporting boolean-like logic like `and` or `or`, or `flatMap` to chain together multiple fallible operations in a row, all while remaining lazy. Some think the fluent-like API looks clean, while the other dislike the added complexity of API surface as unnecessarily burdensome to learn, akin to a Domain Specific Language.

Personally, function-programming ideas are still much of a learning curve, and a harder sell. Monadic style data structure for handling error may have more feature, but the learning curve might turn people away, especially more junior folks.

I think this quote from a Redditor criticizing Effect and other function programming related tools perfectly echos the sentiment:

This feels a lot like the TS iteration of the "lodash everything" or "ramda everything" style of functional-first JS that was popular for a brief moment five or six years ago.

> ...**but the cognitive burden of this approach is effectively the same as an entirely different programming language**. All of the benefits and costs are mostly the same, but because the _language_ stays the same, time isn't allotted for stuff like the several days it takes to become comfortable with a different mental model like it otherwise would be.
> ...
> If you adopt this, do it with open eyes and be prepared to have "TS repos" and "Effect repos" and engineers who are familiar with one, but not the other, and the necessity of onboarding new engineers as if you were training them in a new programming language.
> **Large scale, paradigm-shifting user-space libraries like this are almost never a good choice unless the entire organization is willing to buy into them for every project in the language.**
> - u/[oorza](https://www.reddit.com/user/oorza/)

# Closing thought
I personally love **Rust** 🦀, so If I can start a new project, I'll use Oxide-ts. 

**How about you? What are your thoughts? Let me know in the comments below.**

