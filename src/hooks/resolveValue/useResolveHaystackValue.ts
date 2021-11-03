import { HDict, HVal } from 'haystack-core'
import { second } from 'haystack-units'
import {
	HaystackPointWriteOptions,
	PointWriteFunc,
	useHaystackPoint,
} from '../useHaystackPoint'
import { useHaystackRecordTag } from '../useHaystackRecordTag'
import {
	isResolvableDict,
	isResolvablePoint,
	isResolvableTag,
	Resolvable,
	ResolvableDict,
} from './Resolvable'

/**
 * A hook to use a value from an haystack-server as react state.
 *
 * This hook should be used when input flexibility is required.
 * It is meant to abstract how data is actually retrieved/polled/written, enabling at the same time a data driven approach.
 *
 * It takes a ResolvableDict that contains the record data and a meta tag that indicates how to interact with that record to poll and write an HVal.
 * @see ResolvableDict for the options available.
 *
 * IMPORTANT: this hook requires a ClientContext to work. @see https://github.com/j2inn/haystack-nclient
 *
 * @example <caption>Here’s a usage example:</caption>
 * const [point] = useReadByFilter('point and temp and zone and sp').grid // One-shot reading the first point that matches the filter
 *
 * //Adding meta data to the dict (this could be done server side)
 * const resolvableDict1 = point?.newCopy().set('meta', {resolveType: 'point'}) as Resolvable<HNum>
 * const resolvableDict2 = point?.newCopy().set('meta', {resolveType: 'tag', readTag: 'precision'}) as Resolvable<HNum>
 *
 * // The actual state used depends on the metadata in the dict:
 * const [pointValue, setPointValue, point] = useResolveHaystackValue<HNum>(resolvableDict1)
 * const [pointPrecision, setPointPrecision, point] = useResolveHaystackValue<HNum>(resolvableDict2)
 *
 * @param resolvable Resolvable containing a record and metadata on how to resolve the value or the value itself.
 * @param pollRate poll rate for the value subscription. Expressed in seconds. Default is 5.
 * @returns a resolved value and a function to update it on the server, if the value is not resolved it is passed through.
 */
export function useResolveHaystackValue<Value extends HVal>(
	resolvable?: Resolvable<Value>
): [Optional<Value>, PointWriteFunc<Value> | undefined, Optional<HDict>] {
	const pollTime = resolvePollTime(resolvable)
	const isPoint = isResolvablePoint(resolvable)
	const isTag = isResolvableTag(resolvable)

	const [pointValue, writePoint, point] = useHaystackPoint<Value>(
		isPoint ? resolvable : undefined,
		pollTime,
		isPoint ? resolveDefaultPointWriteOpt(resolvable) : undefined
	)

	const [tag, writeTag, record] = useHaystackRecordTag<Value>(
		isTag ? resolvable : undefined,
		isTag ? resolvable.meta.readTag.value : undefined,
		pollTime
	)

	return isPoint
		? [pointValue, writePoint, point]
		: isTag
		? [tag, writeTag, record]
		: [resolvable, undefined, undefined]
}

const resolveDefaultPointWriteOpt: (
	resolvableDict: ResolvableDict
) => HaystackPointWriteOptions = (resolvableDict) => {
	return {
		who: resolvableDict.meta?.writeWho?.value,
		duration: resolvableDict.meta?.writeDuration,
		level: resolvableDict.meta?.writeLevel?.value,
	}
}

const resolvePollTime: (resolvable?: Resolvable<HVal>) => number | undefined = (
	resolvable
) => {
	return isResolvableDict(resolvable)
		? resolvable?.meta?.subscriptionPollTime?.convertTo(second).value
		: undefined
}

type Optional<Value> = Value | undefined | null
