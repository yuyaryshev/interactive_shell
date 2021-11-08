import { defaultInteractiveShellBaseOpts, GenericInteractiveShell, InteractiveShellBase, InteractiveShellBaseOpts } from "../InteractiveShellBase.js";
import { Output } from "../Output";
import { Subscriber } from "../Subscriber";
import { InteractiveShellError } from "./InteractiveShellError";
import { InteractiveShellCmd } from "../cmd/InteractiveShellCmd";
import { allInteractiveShellCode, createInteractiveShellByCode, InteractiveShellCode, isInteractiveShellCode } from "../allShells";

export interface InteractiveShellOpts extends InteractiveShellBaseOpts {}

export const defaultInteractiveShellCmd = {
    ...defaultInteractiveShellBaseOpts,
};

export class InteractiveShell extends InteractiveShellBase {
    readonly opts: InteractiveShellOpts;
    private currentShell: InteractiveShellBase | undefined;
    private v_consoleLogging: boolean = false;

    constructor(opts0?: InteractiveShellOpts) {
        const opts = {
            ...(opts0 || {}),
            ...defaultInteractiveShellCmd,
        };
        super(opts);
        const pthis = this;
        this.opts = opts;
        opts.allOutputsOverride = this.allOutputs;
        opts.subscribersOverride = this.subscribers;
    }

    async setMode(shellCode: InteractiveShellCode | undefined) {
        if (this.currentShell) {
            await this.currentShell.close();
            this.currentShell = undefined;
        }

        if (shellCode) {
            this.currentShell = createInteractiveShellByCode(shellCode, this.opts);
        }

        if (this.v_consoleLogging && this.currentShell) {
            this.currentShell.setConsoleLogging(this.v_consoleLogging);
        }
    }

    async _internal_exec(command: string): Promise<void> {
        if (isInteractiveShellCode(command)) {
            return this.setMode(command);
        }

        switch (command) {
            case "exit": {
                return this.setMode(undefined);
            }
        }

        if (this.currentShell) {
            await this.currentShell.exec(command);
            return;
        }
        throw new InteractiveShellError(`CODE00000000`, "EUNKNOWN_CMD", { command });
    }

    async _internal_close(): Promise<void> {
        if (this.currentShell) {
            await this.setMode(undefined);
        }
    }

    setConsoleLogging(v: boolean): void {
        this.v_consoleLogging = v;
        if (this.currentShell) {
            this.currentShell.setConsoleLogging(this.v_consoleLogging);
        }
    }

    _internal_testConsoleEnded(output: Output): boolean {
        if (this.currentShell) {
            return this.currentShell._internal_testConsoleEnded(output);
        }
        return true;
    }
}
