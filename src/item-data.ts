export enum ItemType {
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

export interface ItemMetadata {
    id: string;
    name: string;
    normalizedName: string;
    iconLink: string;
    types: ItemType[];
    lastLowPrice: number;
    basePrice: number;
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

function filterItemsForSolver(
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

export { fetchAllItemMetadata, filterItemsForSolver };
