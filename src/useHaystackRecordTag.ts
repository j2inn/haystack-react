/*
 * Copyright (c) 2021, J2 Innovations. All Rights Reserved
 */

import { HDict, HGrid, HRef, HVal } from 'haystack-core'
import { useEffect, useState } from 'react'
import { useClient } from './client'
import { GridRefreshWatchResult, useWatch } from './watch'

/**
 * A Haystack record.
 */
export interface Record extends HDict {
	/**
	 * Id of the record
	 */
	id?: HRef
}

/**
 * A hook to use a record tag from an haystack server as react state.
 *
 * IMPORTANT: writing is currently only supported with a FIN 5/SkySpark server.
 *
 * IMPORTANT: This hooks requires a ClientContext to work. @see https://github.com/j2inn/haystack-nclient
 *
 * @example <caption>Example of usage for a precision tag of type Number.</caption>
 *
 * const record = useReadByFilter('precision and point and temp and zone and sp').grid[0] // One-shot reading the first record that matches the filter
 * const [precision, setPrecision, updatedRecord] = useHaystackRecordTag<HNum>(record, "precision") // Using its tag state
 *
 * @param originalRecord record dict used to retrieve id and initial value.
 * @param tagName name of the tag.
 * @param pollRate poll rate for the value subscription. Expressed in seconds.
 * @returns Returns the point value, a function to update it and the point dict.
 */
export function useHaystackRecordTag<Value extends HVal>(
	originalRecord?: Record,
	tagName?: string,
	pollRate = 5
): [Optional<Value>, RecordTagWriteFunc<Value> | undefined, Optional<Record>] {
	const [currentValue, setCurrentValue] = useState<Optional<Value>>()
	const [tagValue, record] = useReadHaystackRecordTag<Value>(
		originalRecord,
		tagName,
		pollRate
	)
	const write = useWriteHaystackRecordTag(originalRecord?.id, tagName)
	const writeFunc: RecordTagWriteFunc<Value> | undefined = write
		? async (val) => {
				const result = await write?.(val)
				setCurrentValue(val)
				return result
		  }
		: undefined

	useEffect(() => {
		setCurrentValue(tagValue)
	}, [tagValue])

	return [currentValue, writeFunc, record]
}

type RecordGridResult = {
	grid: HGrid<Record>
} & GridRefreshWatchResult

type Optional<Value> = Value | undefined | null

function useReadHaystackRecordTag<Value extends HVal>(
	originalRecord: Optional<Record>,
	tag = '',
	pollRate = 5
): [Optional<Value>, Optional<Record>] {
	const {
		grid: [record],
		isLoading,
	} = useWatch({
		ids: originalRecord?.id,
		pollRate: pollRate,
	}) as RecordGridResult

	return isLoading
		? [originalRecord?.get<Value>(tag), originalRecord]
		: [record?.get<Value>(tag), record]
}

type RecordTagWriteFunc<Value extends HVal> = (
	val?: Value
) => Promise<HGrid<HDict>>

function useWriteHaystackRecordTag<Value extends HVal>(
	id?: HRef,
	tag?: string
): RecordTagWriteFunc<Value> | undefined {
	const client = useClient()

	return id && tag
		? (val) =>
				client.ext.eval(
					val != null
						? `read(id==${id?.toAxon()}).diff({${tag}:${val.toAxon()}}).commit`
						: `read(id==${id?.toAxon()}).diff({-${tag}}).commit`
				)
		: undefined
}
