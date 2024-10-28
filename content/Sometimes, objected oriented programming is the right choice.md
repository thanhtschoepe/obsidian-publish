---
title: Sometimes, object oriented programming is the right choice
tags:
  - oop
  - software_engineering
---
# Introduction
In before you tell me, **React** dev be like after hearing about **object oriented design** pitch.

![](https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdjBxeXU3cWxnaGphenF5ZDhnOXlsYWs1cDhwa2xrNnM2Z3EyYnh2OCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/RJAjTowsU0K1a/giphy.webp)


Just to start, I think this attitude is **reasonable** after our collective footgun trauma with earlier React class component. If anybody remember the good old day of 2015 to early 2019, you'd remember the nonsense behind `super` nuances, [lambda method interaction with the `this` keyword](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this#:~:text=The%20value%20of,in%20object%20methods.) in JS and the need of `.bind`. Not to mention how incredibly bloated the code looks like. I think [this article summed the problem up pretty well](https://ui.dev/why-react-hooks#reactcomponent). Yuck indeed.

It's without a shadow of doubt that the functional API with hooks are better on every front, so we can safely conclude that **object oriented design** is obsolete as an idea for user interface development using React, right? 

Well, hold on. Not so fast. I think this paradigm has some useful ideas that can be used to solve very specific problems, and this article is my attempt to convince you that **OOP** can help your code more organized, testable, and provide better [ergonomics](https://blog.rust-lang.org/2017/03/02/lang-ergonomics.html#:~:text=ergonomics%20is%20a%20measure%20of%20the%20friction%20you%20experience%20when%20trying%20to%20get%20things%20done%20with%20a%20tool).

If you work on the type of application that offset as much of these complicate logic about state to your backend (aka just slaps on [tanstack query](https://tanstack.com/query/latest) and profits), then this pitch isn't applicable to you. If you are one of those unfortunate (😅) devs who work on a behemoth of a SPA, and there's a lot of complicated data work that needs to be performed on the client like me, then this article is for you.

# Why, just why?

## Poor discoverability
My current day job is the CRM system at [HubSpot](https://www.hubspot.com/careers), specifically the Index Page. As you'd figure, making a world-class CRM is no easy business, and the amount of business logic in my team's codebase is staggering. In fact, it's probably the largest codebase in the entirety of HubSpot, often giving our internal typescript language server a run for its money, and it takes 20 minutes to build in the CI pipeline, but I digress.

How HubSpot CRM works is that customer data are organized around **Objects**. We have a growing collections of standardly defined Objects like Contacts, Deals, Companies, Tasks, etc. and users can define their own Custom Objects. Each Object has a list of properties, where the actual data corresponds to. For example, a user using Contact object to track their customers interactions may have properties like `first_name`, `last_name` and `email`, amongst other things.

One of the core value proposition of my team, the Index Page, is the data table. The table typically display property value, like a database. However, instead of displaying the underlying unique ID of each Object instance (called **record**), we instead display some sort of a primary display label. For instance:
- Company type: company name.
- Deal type: deal name.
- Ticket: ticket name.
- etc.  

For most object, the property that specify display label is decided by the backend. For the vast majority of Object types out there, getting a primary display label is very standardized. However, there are special case, such as the Contact object. We'd try to display a full name instead from the first name and last name, falling back to email if possible.

In pseudo code (not our actual production code), you can imagine something like this.

```tsx
// filename: PrimaryDisplayLabelCell.tsx

const getDisplayLabel(
	metaData: ObjectMetaData, 
	record: ObjectRecord): string | undeined 	
{
	if (objectMeta.type === 'CONTACT') { // special case.
		// first name and last name may be undefined, need to fallback to email
		return [record.first_name, record.last_name].join(" ").trim() ||
			record.email;
	}
	if (objectMeta.primaryDisplayLabel) {
		return record[objectMeta.primaryDisplayLabel]
	}

	// failed to get primary display label at this point.
}

function PrimaryDisplayLabel({ meta, record }: PrimaryDisplayLabelCellType) {
	const primaryDisplayLabel = getDisplayLabel(meta, record);
	// still need to handle undefined case
	return <>{primaryDisplayLabel}</>
}
```

^sfb57r

We'd define a "utility" function in the same file where the component is defined. The function will handle the Contact object special case for us. This is a typical approach to solve this problem in React.

Since getting primary display label can result in undefined (i.e., ***fail***), we need to have another level of fallback. For the data table, we fallback to the record creation timestamp.

```diff
function PrimaryDisplayLabel({ meta, record }: PrimaryDisplayLabelCellType) {
	const primaryDisplayLabel = getDisplayLabel(meta, record);
+	const fallback = getCreateAtTime(meta, record); 
-	// still need to handle undefined case
-	return <>{primaryDisplayLabel}</>
+   return <>{primaryDisplayLabel ?? fallback}
}
```
## Implementation drift
I wouldn't be writing this article if the stories end there. The actual HubSpot system have other features like [Association](https://knowledge.hubspot.com/records/associate-records). These needs to have primary display label logic too. Not only is there a completely different data type besides core Object that exhibit this feature, getting primary display label is of the business of other UI areas, such as the Record page where users can dive deeper into the details of a particular record.

Since this primary display label is not a data that you can directly get from the backend, and Association is a different feature that may shows up in different components, we've made attempts to extract this logic to a commonly shared module. As you could have guess, it lives in a utility.

```ts
// util.ts - or some other similarly name file/directory
export const getDisplayLabel(metaData: ObjectMetaData | AssociationMetaData, record: ObjectRecord | AssociationRecord) {
	if ('associationId' in metaData) { // duck-type checking that it's association 
		/* Association version */
	else { /* core Object version */ }
	} 
}
```

The problem with this approach is when you have such a huge codebase like my teams', with mid-migration code, your newly onboard devs simply aren't aware that this is even a thing when they work on a separate system. **Utilities functions are not the best when it comes to discoverability.** 

In reality, I've seen this separate system that shares the same behavior have a different implementation that doesn't match all of our PM's requirement, leading to some differences. Let's call this **implementation drift.**

> [!INFO] Implementation drift
> When two system that should exhibit the same behavior, but are instead implemented independently, often with differing or contradictory behaviors. Usually as a result of poor discoverability of shared behavior codes.


## Less unit-testability
The component I shared above is a sane-washed version for the sake of example. In our actual production system at HubSpot, we relies on Context quite heavily. The actual component that renders the display label often retries object meta data and record data directly from context and/or fetching from GraphQL. With the philosophy of asserting only the rendering outcome from [RTL](https://kentcdodds.com/blog/introducing-the-react-testing-library), the cost of writing tests went up as we have to provide mocking and stubbing network calls with msw.

With test setup being a high cost activity, it becomes more expensive to write and run tests that asserts all nuances of getting the primary display label right, amongst other concerns. **If the logic is implemented locally in the component**, in a `useMemo` hook for example, then it is prohibitively **unergonomic** to thoroughly test this feature, which can lead to bugs and regressions.


# What's your suggestion, then?
The way I see it, in the story I shared above, there are data (core Object, Association), and methods that operates on those data (`getPrimaryDisplayLabel`, `getCreationTimeStamp`). Since we have a problem of [[#Poor discoverability]] and [[#Implementation drift]], why not co-locate the those two together?

![](https://i.imgflip.com/983y6e.jpg)

Object-oriented programming has its [vices](https://en.wikipedia.org/wiki/Multiple_inheritance) (diamond problem) and **problematic dogmas** (looking a you, **Java**, with your one-method class nonsense). But credit is due when its due: OOP has some very good perks:
- **Tooling support** to discover methods so you don't have to go into rummage the utils file to look for the right functions.
- Opens up doors for [Fluent interface - Wikipedia](https://en.wikipedia.org/wiki/Fluent_interface), [Builder pattern - Wikipedia](https://en.wikipedia.org/wiki/Builder_pattern), generic code with [trait](<https://en.wikipedia.org/wiki/Trait_(computer_programming)>). Or even [Monads](https://www.youtube.com/watch?v=ZhuHCtR3xq8) which is a super functional programming paradigm thingy.
- Private fields and methods (encapsulation) to lower your onboarding team members **exposure to cognitive overhead**.

## Pitch: Use wrapper utility class
As I said, OOP has its pitfall. We're specifically interested in to get all the benefits above without the trap of over-sharing.

Front-end application typically gets the data from our network. The very first constrains we can run into is around serialization/deserialization. This is a complex problem with lots of pitfalls, so it's best to avoid it altogether. Plus, there are many one-off data process that is bespoken to a UI Component. Best leave those adhoc data work to the call site. **This pattern is for shared behavior only**.


> [!warning] Stick to POJO
> Let's absolutely **Not** replace plain javascript object (POJO) with data model class. Only shared behaviors is applicable to this design.

What we can do to solve this problem is creating a wrapper utility class whose `inner` POJO is public.

```ts
class ObjectMetaDataWrapper {
  constructor(readonly public inner: ObjectMetaData) {};

  /**
   * Attempts to get the primary display label. Handles special case for Contact object type.
   * 
   * @returns string if successful, undefined if failed.
   */
  tryGetDisplayLabel(this: ObjectMetaDataWrapper): string | undefined {
    /** implementation */
  }
}
```

**This class is not meant to be subclassed.**

I think this design provides the best of both world:
- No getters/setters nonsense like in Java.
- No serialization/deserialization issue. Inner POJO can be jsonified like usual.
- Ad-hoc data transformation allowed.
- **Readonly to suggest immutable update only.**
# Benefits

## Tooling support
The vast majority of IDE out there, especially [[VSCode]] supports some form of autosuggestion. 

![[Screenshot 2024-10-27 164617.png]]
Here we have an toy implementation of the idea. When the class instance `metaDataWrapper` is access, intellisense autosuggests our methods. There's no need to go find and trace that utility files! This is a pretty big DX win in my opinion.

## Open up doors for generic code (polymorphism)

> [!TIP] Better explanation
> Other folks who explains this better than me: [The Flaws of Inheritance - YouTube](https://youtu.be/hxGOiiR9ZKg?si=hWdlKyEej7aLTocc).


To be honest, I think the series of if/else like the earlier example above can be quite exhausting to look at and work with, as duck-typing aren't very reliable.
![[Sometimes, objected oriented programming is the right choice#^sfb57r]]

The thing about branching conditions is that they lack a design philosophy behind. It's very easy to add any other conditions that's not relevant to "selecting type of data", contaminating your reasonability. For every new data type that shares this behavior, **this code will need to grow; if your fellow developer managed to find it in the first place anyway.**

We can and should instead express this idea in term of generic. Something like:
> If this data type can have display label, then as a component I can render it.

```tsx
// common interface
interface HasPrimaryLabel {
  tryGetDisplayLabel(): string | undefined
}

class ObjectMetaDataWrapper implements HasPrimaryLabel {
  constructor(public inner: { metaData: ObjectMetaData, data: ObjectData }) {};

  /**
   * Attempts to get the primary display label. Handles special case for Contact object type.
   * 
   * @returns string if successful, undefined if failed.
   */
  tryGetDisplayLabel(this: ObjectMetaDataWrapper): string | undefined {
    /** implementation */
  }
}

class AssociationMetadataWrapper implements HasPrimaryLabel {
  constructor(public inner: { metaData: AssociationMetaData, data: AssociationData }) {};

  tryGetDisplayLabel(this: AssociationMetadataWrapper): string | undefined {
    /** implementation */
  }
}

// this component does not need to know whether the data is core Object or Association, or anything else. Anything that can produce display label will work.
function PrimaryDisplayLabel({ data }: { data: HasPrimaryLabel }) {
  return <>{data.tryGetDisplayLabel()}</>
}
```

If we extract this common behavior into **interface implementations**, then we'd have access to generic implementation (known as Polymorphism). See more: [Dynamic dispatch - Wikipedia](https://en.wikipedia.org/wiki/Dynamic_dispatch)

## Open door to builder pattern for test mocking
At HubSpot, these core Object metadata and Association metadata have invariants that the our current type system can't represent. For example, Association can be one-directional for custom object, so it's `inversedId` may be undefined, but only for special cases.

Normally for the system under test, these invariants are ensured by our backend system. However we often see issues in providing mocks in testing. Ensuring invariants in mock is difficult enough for one module, doing so consistently across several codebase is a difficult challenge.

What utility class pattern unlocks is access to the builder pattern. It's possible to create a set of setter methods that obeys these invariants, allowing the test code to simulate specific scenarios without exposing the engineer writer to massive cognitive overhead having to learn about these invariants, which often result in shortcuts in test mocking.

Testing and maintaining these components will be simpler (duh!) because the only dependency is the that `HasPrimaryLabel` interface. 

Since there is fewer code, there are less code to test. For the one that does, we can have focus.


# Wait, are we just complicating things?
## Can't you define functions in POJO as well?

![](https://i.imgflip.com/9846z5.jpg)

For most purposes they are the same, but there's nuances:
- Class methods are defined on the prototype, so they are referentially stable. Deep equality check will be the same. This should not add to any rerender issue, if that's your concern.

```ts
let objectA = new MyObject();
let objectB = new MyObject();
objectA.method === objectB.method // true
```

```ts
let objectA = { method() {} };
let objectB = { method() {} };
objectA.method === objectB.method // false
```
- You can use `instanceof` on class. For object you need duck-typing discriminant field.
- Typing is auto for class, for POJO route you need to provide different typing, which is more boilerplate.

## But React best practice is to past plain object

![](https://i.imgflip.com/9848hz.jpg)

Have you wonder why there's `.map`, `.filter` on arrays and `.join`, `.lowercase` on String, even though they look like plain object?

Those methods are defined on prototype, which is the same mechanism for methods you would define or your own class in Javascript. **If you can pass string and array without any issue in props and context, you can pass your own data type without issue as well.**

## It's not convention. We don't do that here.
Well, Javascript didn't have class, 