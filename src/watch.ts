/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

import { useEffect, useState } from 'react'
import { Watch, DEFAULT_POLL_RATE_SECS, Ids } from 'haystack-nclient'
import { HGrid } from 'haystack-core'
import { GridRefreshResult, useClient, useOnlyOps } from './client'

interface Callback {
	(): void
}

/**
 * A grid refresh watch result.
 */
export interface GridRefreshWatchResult extends GridRefreshResult {
	/**
	 * The number of times the underlying watch has updated the grid result.
	 */
	updates: number
}

/**
 * A hook to watch some live haystack data.
 *
 * @param options.ids The ids of the records to watch. Alternatively a `filter` can be specified.
 * @param options.filter The haystack filter to query on the server. Alternatively record `ids`
 * can be specified.
 * @param options.display An optional display name for the filter.
 * @param options.pollRate An optional poll rate for the watch in seconds.
 * @returns A result that wraps a grid.
 */
export function useWatch({
	filter,
	ids,
	display,
	pollRate = DEFAULT_POLL_RATE_SECS,
}: {
	filter?: string
	ids?: Ids
	display?: string
	pollRate?: number
}): GridRefreshWatchResult {
	const client = useClient()
	const ops = useOnlyOps()

	const [grid, setGrid] = useState<HGrid>(new HGrid())

	const [isLoading, setIsLoading] = useState(true)

	let [loads, setLoads] = useState(0)

	const [error, setError] = useState<Error | undefined>(undefined)

	let [updates, setUpdates] = useState(0)

	const [refreshes, setRefreshes] = useState(0)

	useEffect(
		(): Callback => {
			let cancel = false

			async function open(): Promise<Watch | undefined> {
				try {
					setIsLoading(true)

					if (!ids) {
						ids = filter
							? await (ops
									? client.ops.read(filter)
									: client.record.readByFilter(filter))
							: new HGrid()

						// If the effect was closed after the network call then bail.
						if (cancel) {
							return
						}

						setGrid(ids)
						setIsLoading(false)
						setLoads(++loads)
					}

					const watch = await (ops
						? client.ops.watch
						: client.watch
					).make(
						display ||
							filter ||
							`useWatch@${new Date().toISOString()}`,
						ids
					)

					// If the effect was closed after opening the watch then close it and bail.
					if (cancel) {
						await watch.close()
						return watch
					}

					watch.pollRate = pollRate || DEFAULT_POLL_RATE_SECS

					watch.changed({
						callback: (): void => setUpdates(++updates),
					})

					setGrid(watch.grid)
					setUpdates(++updates)

					return watch
				} catch (err) {
					if (!cancel) {
						setError(err)
					}
				} finally {
					if (!cancel) {
						setIsLoading(false)
						setLoads(++loads)
					}
				}
				return undefined
			}

			const promise = open()

			// Return a function that will be invoked when the effect is closed.
			return (): void => {
				cancel = true

				// On clean up, reset to the initial state.
				setIsLoading(false)
				setError(undefined)

				async function close(): Promise<void> {
					if (promise) {
						const watch = await promise
						watch?.close()
					}
				}
				close()
			}
		},
		[filter, JSON.stringify(ids), client, display, pollRate, ops, refreshes] // Effect re-runs if any of these parameters change.
	)

	return {
		grid,
		isLoading,
		loads,
		error,
		refresh: () => setRefreshes(refreshes + 1),
		updates,
	}
}
