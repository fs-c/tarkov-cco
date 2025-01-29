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

export function getPrettyItemType(type: ItemType): string | undefined {
    switch (type) {
        case ItemType.ammo:
            return 'Ammo';
        case ItemType.ammoBox:
            return 'Ammo Box';
        case ItemType.armor:
            return 'Armor';
        case ItemType.armorPlate:
            return 'Armor Plate';
        case ItemType.backpack:
            return 'Backpack';
        case ItemType.barter:
            return 'Barter';
        case ItemType.container:
            return 'Container';
        case ItemType.glasses:
            return 'Glasses';
        case ItemType.grenade:
            return 'Grenade';
        case ItemType.gun:
            return 'Gun';
        case ItemType.headphones:
            return 'Headphones';
        case ItemType.helmet:
            return 'Helmet';
        case ItemType.injectors:
            return 'Injector';
        case ItemType.keys:
            return 'Key';
        case ItemType.meds:
            return 'Med';
        case ItemType.mods:
            return 'Mod';
        case ItemType.pistolGrip:
            return 'Pistol Grip';
        case ItemType.preset:
            return 'Preset';
        case ItemType.provisions:
            return 'Provision';
        case ItemType.rig:
            return 'Rig';
        case ItemType.suppressor:
            return 'Suppressor';
        case ItemType.wearable:
            return 'Wearable';
        default:
            return undefined;
    }
}

export async function fetchAllItemMetadata(): Promise<ItemMetadata[]> {
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

export function filterItemsForSolver(
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
