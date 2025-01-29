export function formatPrice(number: number) {
    if (Math.abs(number) > 1000000) {
        return `${(number / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(number) > 1000) {
        return `${(number / 1000).toFixed(1)}K`;
    }
    return `${number}`;
}
