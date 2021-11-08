import { getOutputSize, Output } from "./Output.js";
import { Subscriber } from "./Subscriber.js";
import { defaultMaxBuffer } from "./constants";

export interface InteractiveShellBaseOpts {
    maxBuffer: number;
    allOutputsOverride?: OutputsCont;
    subscribersOverride?: Subscriber[];
}

export const defaultInteractiveShellBaseOpts = {
    maxBuffer: defaultMaxBuffer,
};

export interface GenericInteractiveShell {
    exec(command: string): Promise<Output[]>;
    close(): Promise<void> | void;
    setConsoleLogging(v: boolean): void;
    getAllOutput(): Output[];
    getAllOutputStr(): string;
    subscribe(subscriber: Subscriber): void;
    unsubscribe(subscriber: Subscriber): void;
    wait(): Promise<void> | undefined;
    lastOutput(): Output;
}

export interface OutputsCont {
    size: number;
    outputs: Output[];
}
export function newOutputsCont() {
    return { size: 0, outputs: [] };
}

export abstract class InteractiveShellBase implements GenericInteractiveShell {
    protected allOutputs: OutputsCont;
    protected subscribers: Subscriber[];
    private lastCallIndex: number = 0;
    private v_isReady: boolean = true;
    private readyPromiseResolve: undefined | (() => void);
    private v_wait: undefined | Promise<void>;
    private v_consoleLogSubscriber: ((o: Output) => void) | undefined;

    constructor(public readonly opts: InteractiveShellBaseOpts) {
        this.allOutputs = opts.allOutputsOverride || newOutputsCont();
        this.subscribers = opts.subscribersOverride || [];
    }

    async exec(command: string): Promise<Output[]> {
        this.lastCallIndex = this.allOutputs.outputs.length;
        await this._internal_exec(command);
        await this.wait();
        return this.allOutputs.outputs.slice(this.lastCallIndex);
    }

    async close() {
        await this._internal_close();
    }

    setConsoleLogging(v: boolean) {
        if (!!this.v_consoleLogSubscriber !== v) {
            if (this.v_consoleLogSubscriber) {
                this.unsubscribe(this.v_consoleLogSubscriber);
                this.v_consoleLogSubscriber = undefined;
            } else {
                this.subscribe(
                    (this.v_consoleLogSubscriber = (o: Output) => {
                        console.log(o.s);
                    }),
                );
            }
        }
    }

    getAllOutput(): Output[] {
        return this.allOutputs.outputs;
    }

    getAllOutputStr(): string {
        return this.allOutputs.outputs.map((o) => o.s || "").join("");
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
        return this.allOutputs.outputs[this.allOutputs.outputs.length - 1] || ({} as any);
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
        this.allOutputs.outputs.push(output);

        this.allOutputs.size += getOutputSize(output);

        while (this.allOutputs.size > this.opts.maxBuffer && this.allOutputs.outputs.length > 1) {
            this.allOutputs.size -= getOutputSize(this.allOutputs.outputs.splice(0, 1)[0]);
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
