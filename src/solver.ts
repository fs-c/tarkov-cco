import { ItemMetadata } from './item-data';
import GLPK from 'glpk.js';

export type Solution = { item: ItemMetadata; count: number }[];

let glpk: ReturnType<typeof GLPK> | undefined;

async function getSolution(
    items: ItemMetadata[],
    minimumBasePriceSum: number,
    maximumNumberOfItems: number,
): Promise<{ item: ItemMetadata; count: number }[]> {
    if (!glpk) {
        console.log('initializing glpk');
        glpk = await GLPK();
    }

    const glpkResult = await glpk.solve({
        name: 'LP',
        objective: {
            direction: glpk.GLP_MIN,
            name: 'objective',
            vars: items.map((item) => ({
                name: item.id,
                coef: item.lastLowPrice,
            })),
        },
        subjectTo: [
            {
                name: 'minimumBasePriceConstraint',
                vars: items.map((item) => ({
                    name: item.id,
                    coef: item.basePrice,
                })),
                bnds: {
                    type: glpk.GLP_LO,
                    lb: minimumBasePriceSum,
                    ub: Infinity,
                },
            },
            {
                name: 'numberOfItemsConstraint',
                vars: items.map((item) => ({ name: item.id, coef: 1 })),
                bnds: {
                    type: glpk.GLP_UP,
                    lb: 0,
                    ub: maximumNumberOfItems,
                },
            },
        ],
        generals: items.map((item) => item.id),
    });

    const solution: { item: ItemMetadata; count: number }[] = [];

    for (const key in glpkResult.result.vars) {
        const value = glpkResult.result.vars[key];
        if (value > 0) {
            const item = items.find((item) => item.id === key);
            if (!item) {
                console.warn('item not found', key);
                continue;
            }

            solution.push({
                item,
                count: value,
            });
        }
    }

    return solution;
}

// get the "best" solutions; first one is optimal, following ones get successively worse
// going too far away from the optimal solution may lead to some pretty bad ones (10 was too high)
export async function getBestSolutions(
    items: ItemMetadata[],
    minimumBasePriceSum: number,
    maximumNumberOfItems: number,
    numberOfSolutions: number,
): Promise<Solution[]> {
    const solutions: { item: ItemMetadata; count: number }[][] = [];
    const excludedItemIds: string[] = [];
    for (let i = 0; i < numberOfSolutions; i++) {
        const filteredItems = items.filter(
            (item) => !excludedItemIds.includes(item.id),
        );

        try {
            const solution = await getSolution(
                filteredItems,
                minimumBasePriceSum,
                maximumNumberOfItems,
            );

            solutions.push(solution);
            excludedItemIds.push(...solution.map(({ item }) => item.id));
        } catch (e) {
            console.warn('got an error while running solver', e);
        }
    }
    return solutions;
}
