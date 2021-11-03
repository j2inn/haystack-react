import { HDict, HNum, HStr, HVal, Kind, valueIsKind } from 'haystack-core'

/**
 * A dict resolvable to an HVal that represents server side state.
 */
export interface ResolvableDict extends HDict {
	meta: ResolvableDictMeta
}

/**
 * The presence of this meta indicates that the dict resolvable to an HVal that represents server side state.
 */
export interface ResolvableDictMeta extends HDict {
	/**
	 * Resolve type that should be applied: @see ResolveType
	 */
	resolveType: HStr & { value: ResolveType }
	/**
	 * Indicates the interval of update for the subscription in seconds. Default is 5 seconds.
	 */
	subscriptionPollTime?: HNum
	/**
	 * If resolveType is "tag" this is mandatory and indicates what tag that should be read.
	 */
	readTag?: HStr
	/**
	 * If resolveType is "tag" this is mandatory and indicates what tag that should be written. Defaults to readTag value if not defined.
	 */
	writeTag?: HStr
	/**
	 * If resolveType is "point" this is the level used by default when writing. If not specified the lowest priority level will be used.
	 * @see https://project-haystack.org/doc/docHaystack/Ops#pointWrite
	 */
	writeLevel?: HNum
	/**
	 * If resolveType is "point" this is the optional write duration.
	 * @see https://project-haystack.org/doc/docHaystack/Ops#pointWrite
	 */
	writeDuration?: HNum
	/**
	 * If resolveType is "point" this is the optional who metadata.
	 * @see https://project-haystack.org/doc/docHaystack/Ops#pointWrite
	 */
	writeWho?: HStr
}

/**
 * Either a ResolvableDict or the Val directly
 */
export type Resolvable<Val extends HVal> = Val | ResolvableDict

export function isResolvableDict(value: unknown): value is ResolvableDict {
	return (
		valueIsKind<HDict>(value, Kind.Dict) &&
		value?.has('meta') &&
		!!value?.get<HDict>('meta')?.has('resolveType')
	)
}

/**
 * Accepted ResolveType options.
 */
export type ResolveType = 'point' | 'tag'

function isResolvable(
	value: unknown,
	resolveType: ResolveType
): value is ResolvableDict {
	return (
		isResolvableDict(value) &&
		value?.meta?.resolveType.value === resolveType
	)
}

export function isResolvablePoint(value: unknown): value is ResolvableDict {
	return isResolvable(value, 'point')
}

export function isResolvableTag(
	value: unknown
): value is ResolvableDict & { meta: { readTag: HStr } } {
	return (
		isResolvable(value, 'tag') &&
		valueIsKind(value?.meta?.readTag, Kind.Str)
	)
}
