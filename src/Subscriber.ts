import { Output } from "./Output.js";

export type Subscriber = (output: Output) => void | Promise<void>;
