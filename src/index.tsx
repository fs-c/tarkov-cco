import { render } from 'preact';

import './style.css';
import { useComputed, useSignal, useSignalEffect } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import {
    fetchAllItemMetadata,
    filterItemsForSolver,
    ItemMetadata,
    ItemType,
} from './item-data';
import { getBestSolutions } from './solver';
import { LoadingSpinner } from './components/LoadingSpinner';
import { SolutionList } from './components/SolutionList';
import { ItemList } from './components/ItemList';

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

    const itemNameFilter = useSignal('');

    const onCombinationListItemClick = (item: ItemMetadata) => {
        itemNameFilter.value = item.name;
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
                    <SolutionList
                        className='h-full'
                        solutions={solutions}
                        onCombinationListItemClick={onCombinationListItemClick}
                    />

                    <ItemList
                        itemsWithDiff={filteredItemsWithDiff}
                        itemNameFilter$={itemNameFilter}
                    />
                </>
            )}
        </div>
    );
}

render(<App />, document.getElementById('app'));
