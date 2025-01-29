import GLPK from 'glpk.js';

enum ItemType {
    ammo = 'ammo',
    ammoBox = 'ammoBox',
    any = 'any',
    armor = 'armor',
    armorPlate = 'armorPlate',
    backpack = 'backpack',
    barter = 'barter',
    container = 'container',
    glasses = 'glasses',
    grenade = 'grenade',
    gun = 'gun',
    headphones = 'headphones',
    helmet = 'helmet',
    injectors = 'injectors',
    keys = 'keys',
    markedOnly = 'markedOnly',
    meds = 'meds',
    mods = 'mods',
    noFlea = 'noFlea',
    pistolGrip = 'pistolGrip',
    preset = 'preset',
    provisions = 'provisions',
    rig = 'rig',
    suppressor = 'suppressor',
    wearable = 'wearable',
}

interface ItemMetadata {
    id: string;
    name: string;
    normalizedName: string;
    iconLink: string;
    types: ItemType[];
    lastLowPrice: number;
    basePrice: number;
}

const glpk = GLPK();

async function fetchAllItemMetadata(): Promise<ItemMetadata[]> {
    const time = performance.now();

    const response = await fetch('https://api.tarkov.dev/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query: `{
                items {
                    id
                    name
                    normalizedName
                    basePrice
                    iconLink
                    types
                    lastLowPrice
                }
            }`,
        }),
    });
    const { data } = await (response.json() as Promise<{
        data: { items: unknown[] };
    }>);

    console.log(`item metadata fetched in ${performance.now() - time}ms`);

    return data.items as ItemMetadata[];
}

function filterItems(
    items: ItemMetadata[],
    minBasePrice: number,
    maxBasePrice: number,
    excludedItemTypes: ItemType[],
): ItemMetadata[] {
    return items.filter(
        (item) =>
            item.basePrice &&
            item.lastLowPrice &&
            item.basePrice >= minBasePrice &&
            item.basePrice <= maxBasePrice &&
            item.basePrice > item.lastLowPrice &&
            !item.types.some((type) => excludedItemTypes.includes(type)) &&
            !item.normalizedName.includes('-poster') &&
            !item.normalizedName.includes('-advertisement'),
    );
}

function getSolution(
    items: ItemMetadata[],
    minimumBasePriceSum: number,
    maximumNumberOfItems: number,
): { [key: string]: number } {
    const glpkResult = glpk.solve(
        {
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
        },
        glpk.GLP_MSG_DBG,
    );

    const solution: { [key: string]: number } = {};

    for (const key in glpkResult.result.vars) {
        const value = glpkResult.result.vars[key];
        if (value > 0) {
            solution[key] = value;
        }
    }

    return solution;
}

const items = await fetchAllItemMetadata();

// min price is arbitrary, in reality there should be no minimum price (since the optimal solution might
// be 1 390k item + 1 10k item) but we want to limit the solution space
const itemMinBasePrice = 30000;
const itemMaxBasePrice = Infinity;
// seems like armor/preset base prices include attachments/plates which is not reflected in the flea market price
const excludedItemTypes = [ItemType.preset, ItemType.armor, ItemType.rig];
const filteredItems = filterItems(
    items,
    itemMinBasePrice,
    itemMaxBasePrice,
    excludedItemTypes,
);

console.log(getSolution(filteredItems, 400000, 5));
