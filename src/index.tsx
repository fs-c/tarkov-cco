import { render } from 'preact';

import './style.css';
import { useComputed, useSignal } from '@preact/signals';
import { useEffect, useMemo } from 'preact/hooks';
import {
    fetchAllItemMetadata,
    filterItemsForSolver,
    ItemMetadata,
    ItemType,
} from './item-data';
import { getBestSolutions } from './solver';

export function App() {
    const allItems = useSignal<ItemMetadata[] | undefined>(undefined);

    // min price is arbitrary, in reality there should be no minimum price (since the optimal solution might
    // be 1 390k item + 1 10k item) but we want to limit the solution space
    const minItemBasePrice = useSignal(30000);
    const maxItemBasePrice = useSignal(Infinity);
    // seems like armor/preset base prices include attachments/plates which is not reflected in the flea market price
    const excludedItemTypes = useSignal<ItemType[]>([
        ItemType.preset,
        ItemType.armor,
        ItemType.rig,
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

    const maxSolutionItems = useSignal(5);
    const minSolutionBasePrice = useSignal(400000);
    const numberOfSolutions = useSignal(5);

    const solutions = useComputed(() => {
        if (!allItems.value) {
            return [];
        }

        return getBestSolutions(
            filteredItems.value,
            minSolutionBasePrice.value,
            maxSolutionItems.value,
            numberOfSolutions.value,
        );
    });

    return (
        <div className={'min-h-screen min-w-screen bg-topography'}>
            {solutions.value.map((solution) => (
                <div>{solution.map(({ item }) => item.name).join(', ')}</div>
            ))}
        </div>
    );
}

render(<App />, document.getElementById('app'));
