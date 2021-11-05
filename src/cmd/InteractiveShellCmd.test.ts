import { expect } from "chai";
import { dirname } from "path";
import { InteractiveShellCmd } from "./InteractiveShellCmd.js";
import {Output} from "../Output";

const icwd = dirname(process.cwd());
function prepareStr(s: string) {
    return s.split(icwd).join("...").split("\r\n").join("\n").trim();
}

describe("InteractiveShellCmd.test.ts", () => {
    it("echo abcd - exit", async () => {
        // TODO
        // Не знаю почему, но изредка этот тест падает. В stdout вместо ожидаемого в таких случаях "...\interactive_shell>"
        // То есть даже chcp 65001 не успел выполниться!

        const c = new InteractiveShellCmd();
        await c.exec("echo abcd\nexit");
        c.consoleLogging();
        expect(prepareStr(c.getAllOutputStr())).to.equal(
            prepareStr(`
D:\\b\\Mine\\GIT_Work\\interactive_shell>chcp 65001
Active code page: 65001

D:\\b\\Mine\\GIT_Work\\interactive_shell>echo abcd
abcd

D:\\b\\Mine\\GIT_Work\\interactive_shell>exit
`),
        );
    });

    xit("ping 127.0.0.1", async () => {
        const c = new InteractiveShellCmd();
        c.consoleLogging();
        await c.exec("ping 127.0.0.1 -n 2 -w 100\nexit");
        expect(prepareStr(c.getAllOutputStr())).to.equal(
            prepareStr(`
...\\interactive_shell>chcp 65001
Active code page: 65001

...\\interactive_shell>ping 127.0.0.1 -n 2 -w 100

Pinging 127.0.0.1 with 32 bytes of data:
Reply from 127.0.0.1: bytes=32 time<1ms TTL=128
Reply from 127.0.0.1: bytes=32 time<1ms TTL=128

Ping statistics for 127.0.0.1:
    Packets: Sent = 2, Received = 2, Lost = 0 (0% loss),
Approximate round trip times in milli-seconds:
    Minimum = 0ms, Maximum = 0ms, Average = 0ms

...\\interactive_shell>exit
`),
        );
    }).timeout(3000);

    it("ncu", async () => {
        const c = new InteractiveShellCmd();
        c.consoleLogging();
        await c.exec("ncu\nexit");
        expect(prepareStr(c.getAllOutputStr())).to.equal(prepareStr(`TBD`));
    }).timeout(20000);
});

/*
    Во всех тестах должно работать также как непосредственный запуск из консоли.
    + Обычный запуск echo
    - inquirer - табличные запросы-ответы
    - Отображение прогресса ncu - не хуже чем это происходит в cmd
    - Отображение прогресса установки пакетов в pnpm - не хуже чем это происходит в cmd
    - Заполнение пароля в git (должно проходить также как это проходит в консоли)
    - Заполнение пароля в ssh (должно проходить также как это проходит в консоли)
*/
