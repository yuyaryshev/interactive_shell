import { InteractiveShellCmd } from "./cmd/InteractiveShellCmd";
import { InteractiveShellError } from "./combined/InteractiveShellError";
import { InteractiveShellBaseOpts } from "./InteractiveShellBase";

export type InteractiveShellCode = "cmd";
export const allInteractiveShellCode = ["cmd"];
export function isInteractiveShellCode(code: string): code is InteractiveShellCode {
    return allInteractiveShellCode.includes(code);
}

export function createInteractiveShellByCode(shellCode: InteractiveShellCode, opts: InteractiveShellBaseOpts) {
    switch (shellCode) {
        case "cmd":
            return new InteractiveShellCmd(opts);
    }
    throw new InteractiveShellError("CODE00000000", "EUNKNOWN_SHELL", { shellCode });
}
