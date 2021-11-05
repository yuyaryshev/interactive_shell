import objectSizeof from "object-sizeof";

export interface Output {
    s: string;
    err?: boolean;
    exitCode?: number;
}

export function getOutputSize(output: Output) {
    return objectSizeof(output);
}
