/**
 *
 */
export function awaitDelay(ms: number) {
    return new Promise((resolve: any) => {
        setTimeout(resolve, ms);
    });
}
