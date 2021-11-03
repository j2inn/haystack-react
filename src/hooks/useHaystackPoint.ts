import { HDict, HGrid, HNum, HRef, HVal } from 'haystack-core'
import { useEffect, useState } from 'react'
import { useClient } from '../client'
import { GridRefreshWatchResult, useWatch } from '../watch'

/**
 * A Haystack point record with a specific curVal type
 */
export interface Point<Value extends HVal> extends HDict {
	/**
	 * Point record id
	 */
	id?: HRef
	/**
	 * Current value of the readTag
	 */
	curVal?: Value
}

/**
 * A hook that allows using a point from an haystack server as react state.
 *
 * Important: This hooks requires a ClientContext to work. @see https://github.com/j2inn/haystack-nclient
 *
 * @example <caption>Example of usage with a numeric point.</caption>
 *
 * const point= useReadByFilter('point and temp and zone and sp').grid[0] // One-shot reading the first point that matches the filter
 * const [pointValue, setPointValue, updatedPoint] = useHaystackPoint<HNum>(point) // Using the point state
 *
 * @param originaryPoint point dict used to retrieve its id and initial value.
 * @param pollRate poll rate for the value subscription. Expressed in seconds.
 * @param writeOptions default options for the write callback.
 * @returns Returns the point value, a function to update it and the point dict.
 */
export function useHaystackPoint<Value extends HVal>(
	originaryPoint: Optional<Point<Value>>,
	pollRate = 5,
	writeOptions?: HaystackPointWriteOptions
): [
	Optional<Value>,
	PointWriteFunc<Value> | undefined,
	Optional<Point<Value>>
] {
	const [currentValue, setCurrentValue] = useState<Optional<Value>>()
	const [readValue, point] = useReadHaystackPoint<Value>(
		originaryPoint,
		pollRate
	)
	const write = useWriteHaystackPoint(originaryPoint?.id, writeOptions)
	const writeFunc: PointWriteFunc<Value> | undefined = write
		? async (val, options) => {
				const result = await write?.(val, options)
				setCurrentValue(val)
				return result
		  }
		: undefined

	useEffect(() => {
		setCurrentValue(readValue)
	}, [readValue])

	return [currentValue, writeFunc, point]
}

type PointGridResult<Value extends HVal> = {
	grid: HGrid<Point<Value>>
} & GridRefreshWatchResult

type Optional<Value> = Value | undefined | null

function useReadHaystackPoint<Value extends HVal>(
	originalPoint: Optional<Point<Value>>,
	pollRate = 5
): [Optional<Value>, Optional<Point<Value>>] {
	const {
		grid: [point],
		isLoading,
	} = useWatch({
		ids: originalPoint?.id,
		pollRate: pollRate,
	}) as PointGridResult<Value>

	return isLoading
		? [originalPoint?.curVal, originalPoint]
		: [point?.curVal, point]
}

export type PointWriteFunc<Value extends HVal> = (
	val: Value,
	options?: HaystackPointWriteOptions
) => Promise<HGrid<HDict>>

/**
 * Options for a PointWrite operation,
 * See https://project-haystack.org/doc/docHaystack/Ops#pointWrite
 */
export interface HaystackPointWriteOptions {
	level?: number
	who?: string
	duration?: number | HNum
}

function useWriteHaystackPoint<Value extends HVal>(
	id?: string | HRef,
	generalOptions?: HaystackPointWriteOptions
): PointWriteFunc<Value> | undefined {
	const client = useClient()

	return id
		? (val, options) =>
				client.ops.pointWrite({
					id: id,
					level: generalOptions?.level ?? 17,
					who: generalOptions?.who,
					duration: generalOptions?.duration,
					...options,
					val: val,
				})
		: undefined
}
