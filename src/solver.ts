import highsWasmUrl from 'highs/runtime?url';
import highsLoader, { HighsSolution } from 'highs';
import { ItemMetadata } from './item-data';

export type Solution = { count: number; item: ItemMetadata }[];

const highs = await highsLoader({
    locateFile: (file) => {
        if (file !== 'highs.wasm') {
            throw new Error(`unexpected file requested from highs: ${file}`);
        }

        return highsWasmUrl;
    },
});

function generateCPLEXLP(
    items: ItemMetadata[],
    minimumBasePriceSum: number,
    maximumNumberOfItems: number,
): string {
    let lpFile = '';

    // minimize the total purchase cost of the items
    lpFile += 'Minimize\n obj: ';
    lpFile += items
        .map((item, i) => `${item.lastLowPrice} x${i + 1}`)
        .join(' + ');
    lpFile += '\n\n';

    // constrain total value of chosen items to be above given value
    lpFile += 'Subject To\n minimumBasePriceConstraint: ';
    lpFile += items.map((item, i) => `${item.basePrice} x${i + 1}`).join(' + ');
    lpFile += ` >= ${minimumBasePriceSum}\n\n`;

    // constrain the number of picked items
    lpFile += 'numberOfItemsConstraint: ';
    lpFile += items.map((_, i) => `x${i + 1}`).join(' + ');
    lpFile += ` <= ${maximumNumberOfItems}\n\n`;

    // bound our items
    lpFile += 'Bounds\n';
    items.forEach((item, i) => {
        lpFile += ` 0 <= x${i + 1} <= ${maximumNumberOfItems}\n`;
    });
    lpFile += '\n';

    // declare our variables (these represent the number of each item we pick)
    lpFile += 'General\n';
    items.forEach((_, i) => {
        lpFile += ` x${i + 1}\n`;
    });
    lpFile += '\nEnd\n';

    return lpFile;
}

// this depends on the order of the items being the same as it was when the LP was generated
function parseHighsSolution(
    items: ItemMetadata[],
    highsSolution: HighsSolution,
): Solution {
    const solution = [];
    for (const column of Object.values(highsSolution.Columns)) {
        const primal = column.Primal;
        if (primal === 0) {
            continue;
        }

        const item = items[column.Index];
        solution.push({
            count: primal,
            item,
        });
    }
    return solution;
}

// not sure why but sometimes the solution contains items with <0 count
function isPlausibleSolution(solution: Solution): boolean {
    return solution.every(({ count }) => count > 0);
}

// get the "best" solutions; first one is optimal, following ones get successively worse
// going too far away from the optimal solution may lead to some pretty bad ones (10 was too high)
function getBestSolutions(
    items: ItemMetadata[],
    minimumBasePriceSum: number,
    maximumNumberOfItems: number,
    numberOfSolutions: number,
): Solution[] {
    const solutions: Solution[] = [];
    const excludedItemIds: string[] = [];
    for (let i = 0; i < numberOfSolutions; i++) {
        const filteredItems = items.filter(
            (item) => !excludedItemIds.includes(item.id),
        );

        const lp = generateCPLEXLP(
            filteredItems,
            minimumBasePriceSum,
            maximumNumberOfItems,
        );

        const solution = parseHighsSolution(items, highs.solve(lp));
        if (isPlausibleSolution(solution)) {
            solutions.push(solution);
        } else {
            console.warn('got an invalid solution', solution, i);
            // don't count this one, but make sure to still exclude the items
            i -= 1;
        }

        excludedItemIds.push(...solution.map(({ item }) => item.id));
    }
    return solutions;
}

export { getBestSolutions };
