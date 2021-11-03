<p align="center">
  <a href="https://github.com/j2inn/haystack-react/actions/workflows/master-push.yaml">
    <img alt="GitHub Workflow Status" src="https://img.shields.io/github/workflow/status/j2inn/haystack-react/Master%20push" />
  </a>

  <a href="https://github.com/j2inn/haystack-react/blob/master/LICENSE">
    <img alt="GitHub" src="https://img.shields.io/github/license/j2inn/haystack-react" />
  </a>
</p>

# Haystack React

A set of APIs to make it super simple to create Haystack based applications using React.

This library is built on top of [haystack-nclient](https://github.com/j2inn/haystack-nclient). and [haystack-core](https://github.com/j2inn/haystack-core).

## Installation

The [haystack-core](https://github.com/j2inn/haystack-core) and [haystack-nclient](https://github.com/j2inn/haystack-nclient) libraries need to be installed as peer dependencies. Therefore to get started using this library in your project, run the following command...

```
npm install haystack-core haystack-nclient haystack-react
```

If you want to use units then install [haystack-units](https://github.com/j2inn/haystack-units) as well...

```
npm install haystack-core haystack-units haystack-nclient haystack-react
```

## APIs

Please click [here](http://j2-docs.s3-website-us-east-1.amazonaws.com/j2inn/haystack-react/index.html) for the API documentation.

## Design

### Hooks

If you're unfamiliar with React hooks then click [here](https://reactjs.org/docs/hooks-intro.html) to read more.

Hooks are being used to make it as easy as possible to create complex applications with React data.

## API

### Client Context

In [haystack-nclient](https://github.com/j2inn/haystack-nclient) all network communications is routed through a `Client` object. Access to the client object and its configuration options is available using the `useClient()` hook.

This hook uses a [React Context](https://reactjs.org/docs/context.html) called `ClientContext`. This enables the underlying Client network configuration to be changed independently of UI implementation.

Set up the Client Context high up in your tree of UI components. For example...

```tsx
const client = new Client({
	base: new URL(window.location.href),
	// Optionally specify a project. This is normally picked up from the browser's current address.
	// project: 'demo'
})

// The 'client' object will be picked up by all components and hooks that call `useClient()` to make a network call.
// This is useful because we can create a UI component that could speak to a variety of origins or projects etc.
const App = (): JSX.Element => {
	return (
		<ClientContext.Provider value={client}>
			<MyFancyUi />
		</ClientContext.Provider>
	)
}
```

The client object can be configured differently if the server is not the FIN framework...

```tsx
const client = new Client({
	base: new URL(window.location.href),
	opsBase: 'haystack',
	// Optionally specify a project. This is normally picked up from the browser's current address.
	// project: 'demo',
	// Optionally prefer Hayson over Zinc...
	options: { headers: { accept: HAYSON_MIME_TYPE } },
})

// The 'client' object will be picked up by all components and hooks that call `useClient()` to make a network call.
// This is useful because we can create a UI component that could speak to a variety of origins or projects etc.
const App = (): JSX.Element => {
	return (
		<ClientContext.Provider value={client}>
			<MyFancyUi />
		</ClientContext.Provider>
	)
}
```

Please note, client instances should always be cached wherever possible since they contain all of the state necessary for maintaining and polling watches.

### useReadByFilter

The `useReadByFilter` hook can be used to make a server side query using a haystack filter.

```tsx
export const GridTable: React.FC<filter: string}> = ({filter}) => {
	const { grid, isLoading, error } = useReadByFilter(filter)

	if (isLoading) {
		return <h1>Loading...</h1>
	}

	if (error) {
		return <h1>Error: {error.message}</h1>
	}

	return (
		<table>
			<thead>
				<tr>
					<Header key='id' name='id' displayName='Id' />
					<Header key='navName' name='navName' displayName='Name' />
					<Header key='curVal' name='curVal' displayName='Value' />
				</tr>
			</thead>
			<tbody>
				{grid.getRows().map(
					(row: HDict): JSX.Element => {
						return (
							<Row
								key={String(row.get<HRef>('id')?.value)}
								row={row}></Row>
						)
					}
				)}
			</tbody>
		</table>
	)
}
```

### useReadByIds

The `useReadByIds` hook can be used to make a server side query using record ids.

```tsx
export const GridTable: React.FC = () => {
	const { grid, isLoading, error } = useReadByIds([
		'@p:demo:r:1eeb15a7-30c88cec',
		'@p:demo:r:1eeb1258-8b832ad0',
	])

	if (isLoading) {
		return <h1>Loading...</h1>
	}

	if (error) {
		return <h1>Error: {error.message}</h1>
	}

	return (
		<table>
			<thead>
				<tr>
					<Header key='id' name='id' displayName='Id' />
					<Header key='navName' name='navName' displayName='Name' />
					<Header key='curVal' name='curVal' displayName='Value' />
				</tr>
			</thead>
			<tbody>
				{grid.getRows().map(
					(row: HDict): JSX.Element => {
						return (
							<Row
								key={String(row.get<HRef>('id')?.value)}
								row={row}></Row>
						)
					}
				)}
			</tbody>
		</table>
	)
}
```

### useEval

The `useEval` hook can be used to make server side expression evaluation.

```tsx
export const GridTable: React.FC<expr: string}> = ({expr}) => {
	const { grid, isLoading, error } = useEval(expr)

	if (isLoading) {
		return <h1>Loading...</h1>
	}

	if (error) {
		return <h1>Error: {error.message}</h1>
	}

	return (
		<table>
			<thead>
				<tr>
					<Header key='id' name='id' displayName='Id' />
					<Header key='navName' name='navName' displayName='Name' />
					<Header key='curVal' name='curVal' displayName='Value' />
				</tr>
			</thead>
			<tbody>
				{grid.getRows().map(
					(row: HDict): JSX.Element => {
						return (
							<Row
								key={String(row.get<HRef>('id')?.value)}
								row={row}></Row>
						)
					}
				)}
			</tbody>
		</table>
	)
}
```

### useWatch

This hook is extremely powerful. It handles all of the opening, closing and polling of a watch. All a developer needs to do is specify what live data needs to be watched.

The `useWatch` hook is used to query and track live data.

-   The hook will cause the UI to be updated automatically when new data is retrieved in the watch.
-   The watch is automatically closed when the React component is unmounted.
-   Watches are smartly collated and polled — additional watches do not make additional poll requests.
-   A haystack filter or array of ids can be used to query and watch the live data.

```tsx
export const GridTable: React.FC = () => {
	const { grid, isLoading, error } = useWatch({
		filter: 'point and curVal',
		pollRate: 1,
		// or
		// ids: ['@p:demo:r:1eeb15a7-30c88cec', '@p:demo:r:1eeb1258-8b832ad0'],
	})

	if (isLoading) {
		return <h1>Loading...</h1>
	}

	if (error) {
		return <h1>Error: {error.message}</h1>
	}

	return (
		<table>
			<thead>
				<tr>
					<Header key='id' name='id' displayName='Id' />
					<Header key='navName' name='navName' displayName='Name' />
					<Header key='curVal' name='curVal' displayName='Value' />
				</tr>
			</thead>
			<tbody>
				{grid.getRows().map(
					(row: HDict): JSX.Element => {
						return (
							<Row
								key={String(row.get<HRef>('id')?.value)}
								row={row}></Row>
						)
					}
				)}
			</tbody>
		</table>
	)
}
```

### useHaystackPoint

This hook allows using the value of a point from an haystack server as a react component state.

-   The hook leverages `useWatch` to retrieve a point live updated data.
-   The hook will cause the UI to be updated automatically when an updated value is retrieved.

```tsx
export const SetpointIncrementer: React.FC = () => {
	// One-shot reading the first point that matches the filter
	const point = useReadByFilter('point and temp and zone and sp').grid[0]

	// Using the point
	const [pointValue, setPointValue, updatedPoint] = useHaystackPoint<HNum>(
		point
	)

	return (
		<div>
			<p>{pointValue?.toString() ?? '---'}</p>
			<button
				onClick={() => {
					if (setPointValue && pointValue) {
						setPointValue(pointValue.plus(HNum.make(1)))
					}
				}}>
				Increment Point
			</button>
		</div>
	)
}
```

### useHaystackRecordTag

This hook allows using the value of a record tag from an haystack server as a react component state.

-   The hook leverages `useWatch` to retrieve the record live updated data.
-   The hook will cause the UI to be updated automatically when an updated value is retrieved.

```tsx
export const SetpointPrecisionIncrementer: React.FC = () => {
	// One-shot reading the first record that matches the filter
	const record = useReadByFilter(
		'precision and point and temp and zone and sp'
	).grid[0]

	// Using its tag
	const [precision, setPrecision, updatedRecord] = useHaystackRecordTag<HNum>(
		record,
		'precision'
	)

	return (
		<div>
			<p>{precision?.toString() ?? '---'}</p>
			<button
				onClick={() => {
					if (setPrecision && precision) {
						setPrecision(precision.plus(HNum.make(1)))
					}
				}}>
				Increment Setpoint Precision
			</button>
		</div>
	)
}
```

### useResolveHaystackValue

This hook allows using a value from an haystack server as a react component state.
This hook should be used when input flexibility is required.
It is meant to abstract how data is actually retrieved/polled/written, enabling at the same time a data driven approach.

It takes a ResolvableDict that contains the record data and a meta tag that indicates how to interact with that record to poll and write an HVal.

Currently a ResolvableDict can indicate one of two `resolveType` values:

-   `"point"`: means that the ResolvableDict passed contains a point data and that the value that needs to be polled and written is the point value.
-   `"tag"`: means that the ResolvableDict passed contains a record data and the value that needs to be polled and written is the value of the tag indicated respectively in the "readTag" and "writeTag" tags of the meta dict.

Additional options such as the watch poll interval can be indicated directly inside the ResolvableDict meta.

-   The hook leverages `useWatch` to retrieve the live updated data.
-   The hook will cause the UI to be updated automatically when an updated value is retrieved.

```tsx
export const SetpointIncrementer: React.FC = () => {
	// One-shot reading the first point that matches the filter
	const [point] = useReadByFilter('point and temp and zone and sp').grid

	//Adding meta data to the dict (note that this could have already been done server side)
	const resolvableDict1 = point
		?.newCopy()
		.set('meta', { resolveType: 'point' }) as Resolvable<HNum>

	const resolvableDict2 = point?.newCopy().set('meta', {
		resolveType: 'tag',
		readTag: 'precision',
	}) as Resolvable<HNum>

	// The actual state used depends on the metadata in the dict:
	const [pointValue, setPointValue] = useResolveHaystackValue<HNum>(
		resolvableDict1
	)
	const [pointPrecision, setPointPrecision] = useResolveHaystackValue<HNum>(
		resolvableDict2
	)

	return (
		<div>
			<p>{pointValue?.toString() ?? '---'}</p>
			<button
				onClick={() => {
					if (setPointValue && pointValue) {
						setPointValue(pointValue.plus(HNum.make(1)))
					}
				}}>
				Increment Point
			</button>

			<p>{pointPrecision?.toString() ?? '---'}</p>
			<button
				onClick={() => {
					if (setPointPrecision && pointPrecision) {
						setPointPrecision(pointPrecision.plus(HNum.make(1)))
					}
				}}>
				Increment Setpoint Precision
			</button>
		</div>
	)
}
```
