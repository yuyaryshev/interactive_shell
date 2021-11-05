import { getOutputSize, Output } from "./Output.js";
import { Subscriber } from "./Subscriber.js";

export interface InteractiveShellBaseOpts {
    maxBuffer: number;
}
export const defaultInteractiveShellBaseOpts = {
    maxBuffer: 1 * 1024 * 1024,
};

export abstract class InteractiveShellBase {
    private allOutputsSize: number = 0;
    private allOutputs: Output[] = [];
    private lastCallIndex: number = 0;
    private subscribers: Subscriber[] = [];
    private v_isReady: boolean = true;
    private readyPromiseResolve: undefined | (() => void);
    private v_wait: undefined | Promise<void>;

    constructor(public readonly opts: InteractiveShellBaseOpts) {}

    async exec(command: string): Promise<Output[]> {
        this.lastCallIndex = this.allOutputs.length;
        await this._internal_exec(command);
        await this.wait();
        return this.allOutputs.slice(this.lastCallIndex);
    }

    async close() {
        await this._internal_close();
    }

    consoleLogging(){
        this.subscribe((o: Output) => {
            console.log(o.s);
        });
    }

    getAllOutput(): Output[] {
        return this.allOutputs;
    }

    getAllOutputStr(): string {
        return this.allOutputs.map((o) => o.s || "").join("");
    }

    subscribe(subscriber: Subscriber): void {
        this.subscribers.push(subscriber);
    }

    unsubscribe(subscriber: Subscriber): void {
        for (let i = 0; i < this.subscribers.length; i++) {
            if (this.subscribers[i] === subscriber) {
                this.subscribers.splice(i, 1);
            }
        }
    }

    wait() {
        return this.v_wait;
    }

    lastOutput(): Output {
        return this.allOutputs[this.allOutputs.length - 1] || ({} as any);
    }
    //******************************************************************
    // Internal functions, acestors should implement them.
    // They are called by base class.
    //******************************************************************

    /**
     * Called from exec()
     * @param command - command to execute
     * @private
     */
    abstract _internal_exec(command: string): void | Promise<void>;

    /**
     * Called from close()
     * @private
     */
    abstract _internal_close(): Promise<void>;

    /**
     * Called when new output appered to decide if console is ready for new commands
     * @param output - output to be tested
     * @private
     */
    abstract _internal_testConsoleEnded(output: Output): boolean;

    //******************************************************************
    // Internal functions, acestors should call them to notify base class
    //******************************************************************

    /**
     * Call _internal_addOutput when console outputs anything
     * @param output - the output
     */
    _internal_addOutput(output: Output) {
        for (let i = 0; i < this.subscribers.length; i++) {
            this.subscribers[i](output);
        }
        this.allOutputs.push(output);

        this.allOutputsSize += getOutputSize(output);

        while (this.allOutputsSize > this.opts.maxBuffer && this.allOutputs.length > 1) {
            this.allOutputsSize -= getOutputSize(this.allOutputs.splice(0, 1)[0]);
            if (this.lastCallIndex > 0) {
                this.lastCallIndex--;
            }
        }

        if (!this.v_isReady && (output.exitCode !== undefined || this._internal_testConsoleEnded(output))) {
            this._internal_ExitBusyState();
        }
    }

    /**
     * Call _internal_EnterBusyState when console enters busy state and user input won't be accepted
     */
    _internal_EnterBusyState() {
        if (!this.v_isReady) {
            return;
        }

        const pthis = this;
        const promise = new Promise((resolve) => {
            pthis.readyPromiseResolve = resolve as any;
        }) as any;
        this.v_isReady = false;
        this.v_wait = promise;
        return promise;
    }

    /**
     * Call _internal_ExitBusyState when console exits busy state and is waiting for user input.
     * internal_ReadyState() is called automatically when this.testConsoleEnded returns true
     */
    _internal_ExitBusyState() {
        if (!this.v_isReady) {
            this.v_isReady = true;
            if (this.readyPromiseResolve) {
                const oldReadyPromiseResolve = this.readyPromiseResolve;
                this.readyPromiseResolve = undefined;
                this.v_wait = undefined;
                oldReadyPromiseResolve();
            }
        }
    }

    /**
     * Call _internal_Exited when console exits
     */
    _internal_exited(exitCode?: number | null | undefined): void {
        if (exitCode !== undefined) {
            this._internal_addOutput({ s: "", exitCode: exitCode || 0 });
        } else if (this.lastOutput().exitCode !== undefined) {
            this._internal_addOutput({ s: "", exitCode: 0 });
        }
        this._internal_ExitBusyState();
    }
}
