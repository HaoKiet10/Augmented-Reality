export const bytesToMB = (bytes: number): number => bytes / (1024 * 1024);

export const formatMB = (bytes: number, fractionDigits = 2): string =>
    bytesToMB(bytes).toFixed(fractionDigits);