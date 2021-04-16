/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

/* eslint @typescript-eslint/no-explicit-any: "off" */

import { useState, useEffect, createContext, useContext } from 'react'

import { Client } from 'haystack-nclient'
import { HGrid, HRef, HList, HFilterBuilder } from 'haystack-core'

interface Callback {
	(): void
}

/**
 * The grid result.
 */
export interface GridResult {
	/**
	 * The grid result.
	 */
	grid: HGrid

	/**
	 * True if the grid's data is loading.
	 */
	isLoading: boolean

	/**
	 * The number of times a grid has been loaded.
	 */
	loads: number

	/**
	 * Truthy if the grid's data didn't load properly and threw an error.
	 */
	error?: Error
}

/**
 * A grid result that can be refreshed.
 */
export interface GridRefreshResult extends GridResult {
	/**
	 * Called to refresh any backing data queries.
	 */
	refresh: () => void
}

/**
 * A hook that asynchronously resolves to a grid.
 *
 * @param options.getGrid An asynchronous method that resolves to a grid.
 * @param options.dependencies The dependencies that cause the grid to be refetched.
 * @returns A result that wraps the data.
 */
export function useGrid({
	getGrid,
	dependencies,
}: {
	getGrid: () => Promise<HGrid>
	dependencies: ReadonlyArray<any>
}): GridResult {
	const [grid, setGrid] = useState<HGrid>(new HGrid())

	const [isLoading, setIsLoading] = useState(true)

	let [loads, setLoads] = useState(0)

	const [error, setError] = useState<Error | undefined>(undefined)

	useEffect(
		(): Callback => {
			let cancel = false

			async function doGetGrid(): Promise<void> {
				try {
					setIsLoading(true)

					const grid = await getGrid()

					if (!cancel) {
						setGrid(grid)
					}
				} catch (err) {
					if (!cancel) {
						setError(err)
					}
				} finally {
					if (!cancel) {
						setLoads(++loads)
						setIsLoading(false)
					}
				}
			}

			doGetGrid()

			return (): void => {
				cancel = true
				setIsLoading(false)
				setError(undefined)
			}
		},
		dependencies // Effect re-runs if any of these parameters change.
	)

	return {
		grid,
		isLoading,
		loads,
		error,
	}
}

/**
 * The client context to be used.
 */
export const ClientContext = createContext<Client>(
	new Client({
		base: new URL(window.location.href),
	})
)
ClientContext.displayName = 'Client'

/**
 * @returns The client to use for network communication.
 */
export function useClient(): Client {
	return useContext(ClientContext)
}

/**
 * A hook that restricts network communcations only to ops.
 */
export const OnlyOpsContext = createContext<boolean>(true)
OnlyOpsContext.displayName = 'OnlyOps'

/**
 * @returns true if only ops should be used for network communication.
 */
export function useOnlyOps(): boolean {
	return useContext(OnlyOpsContext)
}

/**
 * A hook that resolves a some ids into a grid.
 *
 * @param ids The ids to read from the server.
 * @returns A result that wraps the grid.
 */
export function useReadByIds(
	ids: string[] | HRef[] | HList<HRef>
): GridRefreshResult {
	const client = useClient()
	const ops = useOnlyOps()
	const [refreshes, setRefreshes] = useState(0)

	if (ops) {
		let builder: HFilterBuilder | undefined
		for (const id of ids) {
			if (!builder) {
				builder = new HFilterBuilder()
			} else {
				builder.or()
			}

			builder.equals('id', HRef.make(id))
		}

		return useReadByFilter(builder?.build() ?? '')
	} else {
		const result = useGrid({
			getGrid: async (): Promise<HGrid> => {
				return ids.length ? client.record.readByIds(ids) : new HGrid()
			},
			dependencies: [JSON.stringify(ids), client, ops, refreshes],
		})

		return {
			...result,
			refresh: () => setRefreshes(refreshes + 1),
		}
	}
}

/**
 * A hook that resolves an id into a grid.
 *
 * @param id The id to read to read from the server.
 * @returns A result that wraps the grid.
 */
export function useReadById(id: string | HRef): GridRefreshResult {
	const client = useClient()
	const ops = useOnlyOps()
	const [refreshes, setRefreshes] = useState(0)
	const dependencies = [JSON.stringify(id), client, ops, refreshes]
	let result: GridResult

	if (ops) {
		const filter = new HFilterBuilder().equals('id', HRef.make(id)).build()

		result = useGrid({
			getGrid: async (): Promise<HGrid> =>
				String(id) ? client.ops.read(filter) : new HGrid(),
			dependencies,
		})
	} else {
		result = useGrid({
			getGrid: async (): Promise<HGrid> =>
				String(id)
					? (await client.record.readById(id)).toGrid()
					: new HGrid(),
			dependencies,
		})
	}

	return {
		...result,
		refresh: () => setRefreshes(refreshes + 1),
	}
}

/**
 * A hook that resolves a haystack filter into a grid.
 *
 * @param filter The haystack filter to query from the server.
 * @returns A result that wraps the grid.
 */
export function useReadByFilter(filter: string): GridRefreshResult {
	const client = useClient()
	const ops = useOnlyOps()
	const [refreshes, setRefreshes] = useState(0)
	const dependencies = [filter, client, ops, refreshes]

	let result: GridResult

	if (ops) {
		result = useGrid({
			getGrid: async (): Promise<HGrid> =>
				filter ? client.ops.read(filter) : new HGrid(),
			dependencies,
		})
	} else {
		result = useGrid({
			getGrid: async (): Promise<HGrid> =>
				filter ? client.record.readByFilter(filter) : new HGrid(),
			dependencies,
		})
	}

	return {
		...result,
		refresh: () => setRefreshes(refreshes + 1),
	}
}

/**
 * A hook that responses an expression into a grid.
 *
 * @param expr The expression to evalulate.
 * @returns The result that wraps the grid.
 */
export function useEval(expr: string): GridRefreshResult {
	const client = useClient()
	const [refreshes, setRefreshes] = useState(0)

	const result = useGrid({
		getGrid: async (): Promise<HGrid> => client.ext.eval(expr),
		dependencies: [expr, client, refreshes],
	})

	return {
		...result,
		refresh: () => setRefreshes(refreshes + 1),
	}
}
