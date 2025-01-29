import { render } from 'preact';

import './style.css';
import { useComputed, useSignal, useSignalEffect } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import {
    fetchAllItemMetadata,
    filterItemsForSolver,
    getPrettyItemType,
    ItemMetadata,
    ItemType,
} from './item-data';
import { getBestSolutions } from './solver';
import { formatPrice } from './utils';

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
    const numberOfSolutions = useSignal(10);

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

    return (
        <div
            className={
                'min-h-screen min-w-screen bg-topography flex flex-row-reverse'
            }
        >
            <div
                className={'bg-stone-900 overflow-y-auto max-h-screen shrink-0'}
            >
                <table
                    className={
                        'table-auto w-max relative border-separate border-spacing-0'
                    }
                >
                    <thead className={'text-left text-stone-600 top-0'}>
                        <tr
                            className={
                                '*:font-normal *:border-b *:border-stone-800 *:pb-2 *:pt-4 *:sticky *:top-0 *:bg-stone-900/90 *:z-10'
                            }
                        >
                            <th className={'px-2 pl-8'}></th>
                            <th className={'px-2'}></th>
                            <th className={'px-4'}>Base</th>
                            <th className={'px-4'}>Flea</th>
                            <th className={'px-4 pr-8'}>Diff</th>
                        </tr>
                    </thead>

                    <tbody className={'text-stone-300 w-max'}>
                        {filteredItemsWithDiff.value.map((item) => (
                            <tr className={'*:py-2 w-max'}>
                                <td className={'px-2 pl-8'}>
                                    <div
                                        className={
                                            'h-12 w-12 overflow-hidden rounded-md border border-stone-700'
                                        }
                                    >
                                        <img
                                            className={
                                                'scale-[1.05] [clip-path:inset(1px)]'
                                            }
                                            src={item.iconLink ?? ''}
                                        />
                                    </div>
                                </td>
                                <td className={'px-2 w-max'}>
                                    <p>{item.name}</p>
                                    <p className={'text-stone-500'}>
                                        {item.types
                                            .map(getPrettyItemType)
                                            .filter(Boolean)
                                            .join(', ')}
                                    </p>
                                </td>
                                <td className={'px-4'}>
                                    {formatPrice(item.basePrice)}
                                </td>
                                <td className={'px-4'}>
                                    {formatPrice(item.lastLowPrice)}
                                </td>
                                <td className={'px-4 pr-8'}>
                                    {formatPrice(item.diff)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className={'px-8 py-8 flex flex-col gap-16'}>
                <div className={'flex flex-row gap-4 flex-wrap'}>
                    {solutions.value.map((solution) => (
                        <div
                            className={
                                'flex flex-col gap-4 bg-stone-900 p-4 rounded-md border-stone-800'
                            }
                        >
                            <div className={'flex flex-row gap-4'}>
                                {solution.map(({ count, item }) => (
                                    <div className={'relative'}>
                                        <div
                                            className={
                                                'overflow-hidden rounded-md border border-stone-700'
                                            }
                                        >
                                            <img
                                                src={item.iconLink}
                                                className={
                                                    'w-16 h-16 scale-[1.05] [clip-path:inset(1px)]'
                                                }
                                            />
                                        </div>

                                        {/* this is completely insane but otherwise the count didn't look centered */}
                                        <div
                                            className={
                                                'absolute bottom-0 right-0 aspect-square bg-stone-300 text-stone-900 rounded-full translate-x-1/2 translate-y-1/2 h-5 text-center text-sm font-semibold'
                                            }
                                        >
                                            <div
                                                className={
                                                    'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
                                                }
                                            >
                                                {count}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div
                                className={
                                    'flex flex-row gap-4 w-full text-stone-300'
                                }
                            >
                                <p>
                                    {solution.reduce(
                                        (acc, { count, item }) =>
                                            acc + count * item.basePrice,
                                        0,
                                    )}{' '}
                                    Base
                                </p>

                                <p>
                                    {solution.reduce(
                                        (acc, { count, item }) =>
                                            acc + count * item.lastLowPrice,
                                        0,
                                    )}{' '}
                                    Flea
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

render(<App />, document.getElementById('app'));
