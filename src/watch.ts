/*
 * Copyright (c) 2020, J2 Innovations. All Rights Reserved
 */

/* eslint prefer-const: "off" */

import { useEffect, useRef, useState } from 'react'
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

interface WatchData {
	grid: HGrid
	isLoading: boolean
	loads: number
	error?: Error
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

	const data = useRef<WatchData>()

	const watchData =
		data.current ??
		(data.current = {
			grid: new HGrid(),
			isLoading: true,
			loads: 0,
		})

	const [refreshes, setRefreshes] = useState(0)

	let [updates, setUpdates] = useState(0)
	const forceUpdate = (): void => setUpdates(++updates)

	useEffect(
		(): Callback => {
			let cancel = false

			async function open(): Promise<Watch | undefined> {
				try {
					const wasLoading = watchData.isLoading
					watchData.isLoading = true

					// If watch wasn't loading before it is now so force an
					// update in the UI.
					if (!wasLoading) {
						forceUpdate()
					}

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

						watchData.grid = ids
						watchData.isLoading = false

						// Force an update here as we already have some valid data to render before
						// the watch is opened.
						forceUpdate()
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

					watch.pollRate =
						pollRate > 0 ? pollRate : DEFAULT_POLL_RATE_SECS

					watch.changed({
						callback: forceUpdate,
					})

					watchData.grid = watch.grid

					return watch
				} catch (err) {
					if (!cancel) {
						watchData.error = err as Error
					}
				} finally {
					if (!cancel) {
						watchData.isLoading = false
						++watchData.loads
					}
					forceUpdate()
				}
				return undefined
			}

			const promise = open()

			// Return a function that will be invoked when the effect is closed.
			return (): void => {
				cancel = true

				// On clean up, reset to the initial state.
				watchData.isLoading = false
				watchData.error = undefined

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
		grid: watchData.grid,
		isLoading: watchData.isLoading,
		loads: watchData.loads,
		error: watchData.error,
		refresh: (): void => setRefreshes(refreshes + 1),
		updates,
	}
}
