import highsLoader, { HighsSolution } from 'highs';

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

let time = performance.now();
const highs = await highsLoader();
console.log(`highs loaded in ${performance.now() - time}ms`);

function generateCPLEXLP(
    items: ItemMetadata[],
    minimumBasePriceSum: number,
    maximumNumberOfItems: number,
): string {
    const time = performance.now();

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

    // bound our items (no negatives, enforce zero for indices we want to exclude)
    lpFile += 'Bounds\n';
    items.forEach((_, i) => {
        lpFile += ` 0 <= x${i + 1} <= ${maximumNumberOfItems}\n`;
    });
    lpFile += '\n';

    // declare our variables (these represent the number of each item we pick)
    lpFile += 'General\n';
    items.forEach((_, i) => {
        lpFile += ` x${i + 1}\n`;
    });
    lpFile += '\nEnd\n';

    console.log(
        `CPLEX LP generated in ${performance.now() - time}ms for ${items.length} items`,
    );
    return lpFile;
}

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

function filterItems(items: ItemMetadata[]) {
    // min price is arbitrary, in reality there should be no minimum price (since the optimal solution might
    // be 1 390k item + 1 10k item) but we want to limit the solution space
    const minBasePrice = 30000;
    const maxBasePrice = Infinity;
    // seems like armor/preset base prices include attachments/plates which is not reflected in the flea market price
    const excludedItemTypes = [ItemType.preset, ItemType.armor];

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

function parseHighsSolution(
    highsSolution: HighsSolution,
): { count: number; item: ItemMetadata }[] {
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

const items = filterItems(await fetchAllItemMetadata());

const lp = generateCPLEXLP(items, 400000, 5);

Bun.write('lp.txt', lp);

time = performance.now();
const solution = highs.solve(lp);
console.log(`solution found in ${performance.now() - time}ms`);

Bun.write('solution.txt', JSON.stringify(solution, null, 4));

console.log(parseHighsSolution(solution));
