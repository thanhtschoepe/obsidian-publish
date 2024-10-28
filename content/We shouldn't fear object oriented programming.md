---
tags:
  - oop
title: We should not fear object oriented programming
---
What puzzles me in my career writing front-end applications using [[React]] is how core parts of the business are all grouped as **utilities**.

To give you a clearer idea, let's think about users. Chances are, there's a `User` type in your application as everybody needs authentication. I typically see code written like this whenever the app needs to display user full name, or fallback to email.

```tsx
type User = {
	firstName?: string;
	lastName?: string;
	email: string;
}

function Account() {
	const user = useUser();
	const displayLabel = firstName && lastName && `${firstName} ${lastName}` || email;

	return <p>{displayLabel}</p>
}
```

Please don't roll your eye for the contrived example. It's all started like this, and then 5 major system expansion later, you might end up with 200 lines of `useMemo` data transformation in the component before you know it.

Sometimes I see logic like this extracted to a separate function. 

```ts
function getDisplayLabelForUser({firstName, lasName, email}: User) {
	return firstName && lastName && `${firstName} ${lastName}` || email;
}
```

This function will unfortunately be named `util`, perhaps in the same file with the component, or in a utility file.

This is probably fine for the one or two off components that uses this logic. But as you scale your system, you'll quickly have a divorced family of data and duplicates version of methods that operates on those data, sometimes contradicting each other. For a typical enterprise system that involves a fair amount of complex domain logic, you can imagine how things can get out of hands very quickly.

# OOP for the greater good

Object oriented programming has a bad rap because React has its design based in functional programming paradigm (immutable data type, pure functions, data flows). Just to be clear, I really love FP, but it's important to be pragmatic to use adopt tools for your particular problem at hand.

When it comes to organizing program into cohesive module, I think there are strengths to OOP. For starter, it allows co-locating data and methods that operates on those data.

```tsx
class UserHelper {
	inner: User;

	get displayLabel() {
		const { firstName, lastName, email } = this.inner;
		return firstName && lastName && `${firstName} ${lastName}` || email;
	}
}

// in component

function Account() {
	const wrappedUser = useUser(); // now returns UserHelper instance.

	return <span>{ wrappedUser.displayLabel }</span>
}
```

This data structure is now safe to be passed to the component. An added benefit would be how tooling can pickup the getter.

![[Screenshot 2024-10-26 at 11.41.32 PM.png]]

## Taking this design further
A common design pattern for OOP that relies more on composition to structure your program is [Mixin](https://www.typescriptlang.org/docs/handbook/mixins.html).

Supposed your app now has a concept of Customer, and you also wanted to display the full name like the User app.

We can structure our program so that the component can work generically.

```tsx
interface HasLabel {
	display(): string;
}

class UserHelper implements HasLabel {
	/* snip */
}
class CustomerHelper implements HasLabel {
	/* snip */
}

// in component

function LabelComponent({ data }: { data: HasLabel }) {
	return <span>{ data.display() }</span>
}
```

What we're getting now is a component that can work based off any data as long as it implements `HasLabel` interface. The Customer can now display something else, like including their company name.

This pattern can be extended to avoid functions that has a bunch of if/else inside. Just for the sake of comparison, the "utility way" is like this.

```tsx
	function getDisplayLabel(data: User | Customer) {
		if (data.tag === 'user') { /* snip */ }
		if (data.tag === 'customer' ) { /* snip */ }
	}
```

For every new data type that can do "display", this function will grow. If you have duplicates of this across the codebase, they will all need to be updated. Finally, if this logic is in a `useMemo` block, they will all need to be updated.
# What's the catch?

Obviously, what we are mainly interested in is co-locating methods and data in 1 place. The temptation to use inheritance is always there, so there's discipline needed when adopting this pattern.

- Do not inherit domain logic app.
- Setter method should update immutably. (ideas from FP)

```ts
class MyHelper {
	constructor(private state: number) {}

	increment(this: MyHelper): this { this.state +=1; return this } // bad
	increment(this: MyHelper): this { return new MyHelper(this.state + 1) } // ok
}
```

Here, the `increment` function can return a new instance of the class, aka updating this immutably.

# Conclusion 

[Design patterns are a solution to the problem OOP itself creates : r/ProgrammerHumor](https://www.reddit.com/r/ProgrammerHumor/comments/10z4lil/design_patterns_are_a_solution_to_the_problem_oop/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button)

I think OOP is a good tool to write more scalable software. It doesn't have to contradict with the core principle that makes functional programming great (no side effect, immutable update, etc). There's added benefit for tooling discovery, not to mention the prospect of writing generic components without fat functions with if/else statements.