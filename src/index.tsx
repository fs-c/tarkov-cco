import { render } from 'preact';

import './style.css';
import { useComputed, useSignal, useSignalEffect } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import {
    fetchAllItemMetadata,
    filterItemsForSolver,
    getPrettyItemType,
    ItemMetadata,
    ItemType,
} from './item-data';
import { getBestSolutions } from './solver';
import { formatPrice } from './utils';
import uFuzzy from '@leeoniya/ufuzzy';
import { LoadingSpinner } from './components/LoadingSpinner';

const ufuzzy = new uFuzzy();

export function App() {
    const allItems = useSignal<ItemMetadata[] | undefined>(undefined);

    // min price is arbitrary, in reality there should be no minimum price (since the optimal solution might
    // be 1 390k item + 1 10k item) but we want to limit the solution space
    const minItemBasePrice = useSignal(30000);
    const maxItemBasePrice = useSignal(800000);
    // seems like armor/preset base prices include attachments/plates which is not reflected in the flea market price
    const excludedItemTypes = useSignal<ItemType[]>([
        ItemType.preset,
        ItemType.armor,
        ItemType.rig,
        ItemType.backpack,
        ItemType.keys,
    ]);

    useEffect(() => {
        fetchAllItemMetadata().then((items) => {
            allItems.value = items;
        });
    }, []);

    const filteredItems = useComputed(() => {
        if (!allItems.value) {
            return [];
        }

        return filterItemsForSolver(
            allItems.value,
            minItemBasePrice.value,
            maxItemBasePrice.value,
            excludedItemTypes.value,
        );
    });

    const filteredItemsWithDiff = useComputed(() => {
        return filteredItems.value
            .map((item) => ({
                ...item,
                diff: item.lastLowPrice - item.basePrice,
            }))
            .sort((a, b) => a.diff - b.diff);
    });

    const maxSolutionItems = useSignal(5);
    const minSolutionBasePrice = useSignal(400000);

    const numberOfSolutions = useSignal(30);

    // don't ever write to solutions directly, it should really be a computed/readonly but the value
    // computation is async and this was the simplest way to do it
    const solutions = useSignal<{ item: ItemMetadata; count: number }[][]>([]);
    useSignalEffect(() => {
        if (filteredItems.value.length === 0) {
            return;
        }

        getBestSolutions(
            filteredItems.value,
            minSolutionBasePrice.value,
            maxSolutionItems.value,
            numberOfSolutions.value,
        ).then((solutionsValue) => {
            solutions.value = solutionsValue;
        });
    });

    const itemListNameFilter = useSignal('');
    const filteredItemsWithDiffNames = useComputed(() =>
        filteredItemsWithDiff.value.map((item) => item.name),
    );
    const itemListContent = useComputed(() => {
        const result = ufuzzy.search(
            filteredItemsWithDiffNames.value,
            itemListNameFilter.value,
        );

        const sortedIdxs = result[0] ?? [];
        const info = result[1];

        return [
            ...sortedIdxs.map((sortedIdx, innerIdx) => ({
                item: filteredItemsWithDiff.value[sortedIdx],
                ranges: info?.ranges[innerIdx].reduce((acc, curr, idx) => {
                    if (idx % 2 === 0) {
                        acc.push(curr);
                    } else {
                        acc[acc.length - 1] = [acc[acc.length - 1], curr];
                    }
                    return acc;
                }, []),
            })),
            ...filteredItemsWithDiff.value
                .filter((_, idx) => !sortedIdxs.includes(idx))
                .map((item) => ({
                    item,
                    ranges: [],
                })),
        ];
    });

    const searchInputRef = useRef<HTMLInputElement>();

    // set up global "shortcuts":
    //   - escape anywhereclears the search input
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
                itemListNameFilter.value = '';
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    });

    const onItemListNameFilterChange = (e: InputEvent) => {
        itemListNameFilter.value = (e.target as HTMLInputElement).value;
    };

    const onCombinationListItemClick = (item: ItemMetadata) => {
        itemListNameFilter.value = item.name;
    };

    const isLoading = useComputed(() => {
        return (
            solutions.value.length === 0 ||
            filteredItemsWithDiff.value.length === 0
        );
    });

    return (
        <div className='bg-topography flex min-h-screen min-w-screen flex-row items-center justify-center text-stone-300'>
            {isLoading.value ? (
                <LoadingSpinner />
            ) : (
                <>
                    <div className='flex max-h-screen flex-col overflow-y-auto px-8'>
                        <div className='flex flex-row flex-wrap gap-4 py-8'>
                            {solutions.value.map((solution) => (
                                <div className='flex flex-col gap-4 rounded-md border-stone-800 bg-stone-900 p-4'>
                                    <div className='flex flex-row gap-4'>
                                        {solution.map(({ count, item }) => (
                                            <div
                                                className={
                                                    'group relative cursor-pointer'
                                                }
                                                onClick={() =>
                                                    onCombinationListItemClick(
                                                        item,
                                                    )
                                                }
                                            >
                                                <div className='overflow-hidden rounded-md border border-stone-700 transition-all group-hover:border-stone-400'>
                                                    <img
                                                        src={item.iconLink}
                                                        className='h-16 w-16 scale-[1.05] [clip-path:inset(1px)]'
                                                        alt={item.name}
                                                        title={item.name}
                                                    />
                                                </div>

                                                {/* this is completely insane but otherwise the count didn't look centered */}
                                                <div className='absolute right-0 bottom-0 aspect-square h-5 translate-x-1/2 translate-y-1/2 rounded-full bg-stone-300 text-center text-sm font-semibold text-stone-900'>
                                                    <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
                                                        {count}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className='flex w-full flex-row gap-4 text-stone-300'>
                                        <p>
                                            {formatPrice(
                                                solution.reduce(
                                                    (acc, { count, item }) =>
                                                        acc +
                                                        count * item.basePrice,
                                                    0,
                                                ),
                                            )}{' '}
                                            <span className='text-stone-400'>
                                                Base
                                            </span>
                                        </p>

                                        <p>
                                            {formatPrice(
                                                solution.reduce(
                                                    (acc, { count, item }) =>
                                                        acc +
                                                        count *
                                                            item.lastLowPrice,
                                                    0,
                                                ),
                                            )}{' '}
                                            <span className='text-stone-400'>
                                                Flea
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className='flex-grow'></div>

                        <div className='flex flex-col gap-2 py-8'>
                            <p>
                                Optimal{' '}
                                <a
                                    className='underline'
                                    href='https://escapefromtarkov.fandom.com/wiki/Hideout#Cultist_Circle'
                                >
                                    Tarkov Cultist Circle
                                </a>{' '}
                                inputs, using data from{' '}
                                <a
                                    className='underline'
                                    href='https://tarkov.dev'
                                >
                                    tarkov.dev
                                </a>{' '}
                                and{' '}
                                <a
                                    className='underline'
                                    href='https://sp-tarkov.com/'
                                >
                                    SPT
                                </a>
                                .
                            </p>

                            <p>
                                <a
                                    className='underline'
                                    href='https://github.com/fs-c/tarkov-cco'
                                >
                                    github/tarkov-cco
                                </a>
                            </p>
                        </div>
                    </div>

                    <div className='inline-grid max-h-screen shrink-0 grid-cols-[auto_auto_auto_auto_auto] gap-4 overflow-y-auto bg-stone-900'>
                        <div className='sticky top-0 z-10 col-span-full grid h-min grid-cols-subgrid border-b border-stone-800 bg-stone-900 px-4 py-4 text-stone-600'>
                            <div className='col-span-2'>
                                <input
                                    ref={searchInputRef}
                                    type='text'
                                    className='h-full w-full text-stone-300 outline-none'
                                    placeholder='Search...'
                                    value={itemListNameFilter.value}
                                    onInput={onItemListNameFilterChange}
                                />
                            </div>
                            <div>Base</div>
                            <div>Flea</div>
                            <div>Diff</div>
                        </div>

                        {itemListContent.value.map(({ item, ranges }) => (
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
                                                    (ranges[i - 1] ?? [])[1] ??
                                                        0,
                                                    range[0],
                                                )}
                                                <span className='underline'>
                                                    {item.name.slice(
                                                        range[0],
                                                        range[1],
                                                    )}
                                                </span>
                                            </>
                                        ))}

                                        {item.name.slice(
                                            (ranges[ranges.length - 1] ??
                                                [])[1] ?? 0,
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
                </>
            )}
        </div>
    );
}

render(<App />, document.getElementById('app'));
