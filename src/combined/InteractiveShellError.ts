export interface InteractiveShellErrorData {
    command?: string;
    shellCode?: string;
}

export const interactiveShellErrorCodes = {
    EINTERNAL: "Unknown internal error.",
    EUNKNOWN_CMD: "Unknown command",
    EUNKNOWN_SHELL: "Unknown shell code"
};
export type InteractiveShellErrorCode = keyof typeof interactiveShellErrorCodes;

export class InteractiveShellError extends Error {
    public interactiveShellError: true = true;
    public code: string;

    constructor(cpl: string, code: InteractiveShellErrorCode, data?: InteractiveShellErrorData) {
        super(cpl + " " + interactiveShellErrorCodes[code]);
        this.code = code;
        if (data) {
            Object.assign(this, data);
        }
    }
}
