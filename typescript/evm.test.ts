import { expect, test } from "@jest/globals";
import evm from "./evm";
import tests from "../evm.json";

for (const t of tests as any) {
  test(t.name, () => {
    // Note: as the test cases get more complex, you'll need to modify this
    // to pass down more arguments to the evm function (e.g. block, state, etc.)
    // and return more data (e.g. state, logs, etc.)
    const result = evm(
      hexStringToUint8Array(t.code.bin),
      t.tx,
      t.block,
      t.state,
      t.code.bin
    );
    console.log("test name: ", t.name);
    if (t.expect.stack != null) {
      console.log(
        "my stack is: ",
        result.stack,
        "expected stack is: ",
        t.expect.stack.map((item) => BigInt(item))
      );

      expect(result.stack).toEqual(t.expect.stack.map((item) => BigInt(item)));
    }

    if (t.expect.logs != null) {
      console.log(
        "my logs is: ",
        result.logs,
        "expected logs is: ",
        t.expect.logs
      );
      expect(result.logs).toEqual(t.expect.logs);
    }

    if (t.expect.return != null) {
      console.log(
        "my return is: ",
        result.return,
        "expected return is: ",
        t.expect.return
      );
      expect(result.return).toEqual(t.expect.return);
    }

    expect(result.success).toEqual(t.expect.success);
  });
}

export function hexStringToUint8Array(hexString: string) {
  return new Uint8Array(
    (hexString?.match(/../g) || []).map((byte) => parseInt(byte, 16))
  );
}
