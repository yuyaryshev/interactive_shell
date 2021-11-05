import { defaultInteractiveShellBaseOpts, InteractiveShellBase, InteractiveShellBaseOpts } from "../InteractiveShellBase.js";
import { Output } from "../Output.js";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { awaitDelay } from "../awaitDelay";

export interface InteractiveShellCmdOpts extends InteractiveShellBaseOpts {}

export const defaultInteractiveShellCmd = {
    ...defaultInteractiveShellBaseOpts,
};

export class InteractiveShellCmd extends InteractiveShellBase {
    private abortController: AbortController;
    private process: ChildProcessWithoutNullStreams;

    constructor(opts?: InteractiveShellCmdOpts) {
        super({ ...(opts || {}), ...defaultInteractiveShellCmd });
        const pthis = this;

        this.abortController = new AbortController();
        const { signal } = this.abortController;

        //
        this.process = spawn("cmd", ["/K"], { signal });

        this.process.stdout.setEncoding("utf-8");
        this.process.stdout.on("data", (s) => {
            pthis._internal_addOutput({ s });
        });

        this.process.stderr.setEncoding("utf-8");
        this.process.stderr.on("data", (s) => {
            pthis._internal_addOutput({ s, err: true });
        });

        let finishFlagsLeft = 3;
        this.process.stdout.on("close", () => {
            if (--finishFlagsLeft <= 0) {
                pthis._internal_exited();
            }
        });

        this.process.stderr.on("close", () => {
            if (--finishFlagsLeft <= 0) {
                pthis._internal_exited();
            }
        });

        this.process.on("close", async (exitCode) => {
            pthis._internal_addOutput({ s: "", exitCode: exitCode || 0 });
            if (--finishFlagsLeft <= 0) {
                pthis._internal_exited();
            }
        });

        this._internal_EnterBusyState();
        pthis.exec(`chcp 65001\n`).finally();
    }

    _internal_testConsoleEnded(output: Output): boolean {
        return output.s.length > 0 && output.s.endsWith(">") && output.s[1] === ":" && output.s[2] === "\\";
    }

    _internal_exec(command0: string) {
        const command = command0.endsWith("\n") ? command0 : command0 + "\r\n";
        this._internal_EnterBusyState();
        this.process.stdin.cork();
        this.process.stdin.write(command);
        this.process.stdin.uncork();
    }

    async _internal_close(): Promise<void> {
        this.abortController.abort();
    }
}
