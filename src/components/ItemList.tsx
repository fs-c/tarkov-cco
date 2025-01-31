import {
    ReadonlySignal,
    Signal,
    useComputed,
    useSignal,
} from '@preact/signals';
import { getPrettyItemType, ItemMetadata } from '../item-data';
import { useEffect, useRef } from 'preact/hooks';
import { formatPrice } from '../utils';
import uFuzzy from '@leeoniya/ufuzzy';

const ufuzzy = new uFuzzy();

export function ItemList({
    itemsWithDiff: items,
    itemNameFilter$,
}: {
    itemsWithDiff: ReadonlySignal<(ItemMetadata & { diff: number })[]>;
    itemNameFilter$: Signal<string>;
}) {
    const searchInputRef = useRef<HTMLInputElement>();

    const itemNames = useComputed(() => items.value.map((item) => item.name));

    const sortedItemsWithRanges = useComputed(() => {
        const result = ufuzzy.search(itemNames.value, itemNameFilter$.value);

        const sortedIdxs = result[0] ?? [];
        const info = result[1];

        return [
            ...sortedIdxs.map((sortedIdx, innerIdx) => ({
                item: items.value[sortedIdx],
                ranges: info?.ranges[innerIdx].reduce((acc, curr, idx) => {
                    if (idx % 2 === 0) {
                        acc.push(curr);
                    } else {
                        acc[acc.length - 1] = [acc[acc.length - 1], curr];
                    }
                    return acc;
                }, []),
            })),
            ...items.value
                .filter((_, idx) => !sortedIdxs.includes(idx))
                .map((item) => ({
                    item,
                    ranges: [],
                })),
        ];
    });

    const onItemListNameFilterChange = (e: InputEvent) => {
        itemNameFilter$.value = (e.target as HTMLInputElement).value;
    };

    // set up global "shortcuts":
    //   - escape anywhere clears the search input
    //   - typing anywhere focuses the search input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                document.activeElement === document.body &&
                !e.ctrlKey &&
                !e.altKey &&
                !e.metaKey
            ) {
                searchInputRef.current?.focus();
            }

            if (e.key === 'Escape') {
                itemNameFilter$.value = '';
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className='grid max-h-screen shrink-0 grid-cols-[auto_auto_auto_auto_auto_auto] gap-4 overflow-y-auto bg-stone-900'>
            <div className='sticky top-0 z-10 col-span-full grid h-min grid-cols-subgrid border-b border-stone-800 bg-stone-900 px-4 py-4 text-stone-600'>
                <div className='col-span-2'>
                    <input
                        ref={searchInputRef}
                        type='text'
                        className='h-full w-full text-stone-300 outline-none'
                        placeholder='Search...'
                        value={itemNameFilter$.value}
                        onInput={onItemListNameFilterChange}
                    />
                </div>
                <div>Base</div>
                <div>Flea</div>
                <div>Diff</div>
            </div>

            {sortedItemsWithRanges.value.map(({ item, ranges }) => (
                <div className='col-span-full grid grid-cols-subgrid px-4'>
                    <div className='h-12 w-12 overflow-hidden rounded-md border border-stone-700'>
                        <img
                            className='scale-[1.05] [clip-path:inset(1px)]'
                            src={item.iconLink ?? ''}
                            alt={item.name}
                            title={item.name}
                        />
                    </div>
                    <div className='w-max'>
                        <p>
                            {/* here be dragons */}

                            {ranges.map((range, i) => (
                                <>
                                    {item.name.slice(
                                        (ranges[i - 1] ?? [])[1] ?? 0,
                                        range[0],
                                    )}
                                    <span className='underline'>
                                        {item.name.slice(range[0], range[1])}
                                    </span>
                                </>
                            ))}

                            {item.name.slice(
                                (ranges[ranges.length - 1] ?? [])[1] ?? 0,
                            )}
                        </p>

                        <p className='text-stone-500'>
                            {item.types
                                .map(getPrettyItemType)
                                .filter(Boolean)
                                .join(', ')}
                        </p>
                    </div>
                    <div>{formatPrice(item.basePrice)}</div>
                    <div>{formatPrice(item.lastLowPrice)}</div>
                    <div>{formatPrice(item.diff)}</div>
                </div>
            ))}
        </div>
    );
}
