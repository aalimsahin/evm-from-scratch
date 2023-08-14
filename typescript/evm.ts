/**
 * EVM From Scratch
 * TypeScript template
 *
 * To work on EVM From Scratch in TypeScript:
 *
 * - Install Node.js: https://nodejs.org/en/download/
 * - Go to the `typescript` directory: `cd typescript`
 * - Install dependencies: `yarn` (or `npm install`)
 * - Edit `evm.ts` (this file!), see TODO below
 * - Run `yarn test` (or `npm test`) to run the tests
 * - Use Jest Watch Mode to run tests when files change: `yarn test --watchAll`
 */
import { add, mul, sub, div, mod, exp, flips } from "./libraries/math";
import { checkThereIs } from "./libraries/check";
type Result = {
  success: boolean;
  stack: bigint[];
};

export default function evm(code: Uint8Array): Result {
  let pc = 0;
  let stack: bigint[] = [];

  while (pc < code.length) {
    // if unstop is true, then continue
    // opcode is a number
    // opcode.toString(16) is a hex number
    const opcode = code[pc];
    pc++;
    // TODO: implement the EVM here!
    switch (true) {
      case opcode.toString(16) === "0": // STOP
        return { success: true, stack };
      case opcode.toString(16) === "5f": // PUSH0
        stack.push(BigInt(0));
        break;
      case opcode.toString(16) === "60" || // PUSH1
        opcode.toString(16) === "61" || // PUSH2
        opcode.toString(16) === "63" || // PUSH4
        opcode.toString(16) === "65" || // PUSH6
        opcode.toString(16) === "69" || // PUSH10
        opcode.toString(16) === "6a" || // PUSH11
        opcode.toString(16) === "7f": // PUSH32
        let value61 = "0x";
        // current opcode - push1
        for (
          let i = 0;
          i <= parseInt(opcode.toString(16), 16) - parseInt("60", 16);
          i++
        ) {
          value61 += code[pc].toString(16);
          pc++;
        }
        stack.unshift(BigInt(value61));
        break;
      case opcode.toString(16) === "50": // POP
        stack.shift();
        break;
      case opcode.toString(16) === "1": // ADD
        const add1 = stack.shift();
        const add2 = stack.shift();
        if (!(add1 === undefined || add2 === undefined)) {
          stack.unshift(add(add1, add2));
        }
        break;
      case opcode.toString(16) === "2": // MUL
        const mul1 = stack.shift();
        const mul2 = stack.shift();
        if (!(mul1 === undefined || mul2 === undefined)) {
          stack.unshift(mul(mul1, mul2));
        }
        break;
      case opcode.toString(16) === "3": // SUB
        const sub1 = stack.shift();
        const sub2 = stack.shift();
        if (!(sub1 === undefined || sub2 === undefined)) {
          stack.unshift(sub(sub1, sub2));
        }
        break;
      case opcode.toString(16) === "4": // DIV
        const div1 = stack.shift();
        const div2 = stack.shift();
        if (!(div1 === undefined || div2 === undefined)) {
          stack.unshift(div(div1, div2));
        }
        break;
      case opcode.toString(16) === "6": // MOD
        const mod1 = stack.shift();
        const mod2 = stack.shift();
        if (!(mod1 === undefined || mod2 === undefined)) {
          stack.unshift(mod(mod1, mod2));
        }
        break;
      case opcode.toString(16) === "8": // ADDMOD
        const addmod1 = stack.shift();
        const addmod2 = stack.shift();
        const addmod3 = stack.shift();
        if (
          !(
            addmod1 === undefined ||
            addmod2 === undefined ||
            addmod3 === undefined
          )
        ) {
          const addmod4 = add(addmod1, addmod2);
          stack.unshift(mod(addmod4, addmod3));
        }
        break;
      case opcode.toString(16) === "9": // ADDMOD
        const addmul1 = stack.shift();
        const addmul2 = stack.shift();
        const addmul3 = stack.shift();
        if (
          !(
            addmul1 === undefined ||
            addmul2 === undefined ||
            addmul3 === undefined
          )
        ) {
          const addmul4 = mod(addmul1, addmul3);
          const addmul5 = mod(addmul2, addmul3);
          const addmul6 = mul(addmul4, addmul5);
          stack.unshift(mod(addmul6, addmul3));
        }
        break;
      case opcode.toString(16) === "a": // EXP
        const exp1 = stack.shift();
        const exp2 = stack.shift();
        if (!(exp1 === undefined || exp2 === undefined)) {
          const exp3 = exp(exp1, exp2);
          stack.unshift(exp3);
        }
        break;
      case opcode.toString(16) === "b": // SIGNEXTEND
        //! this is mock, change it later
        const signextend1 = stack.shift();
        const signextend2 = stack.shift();
        if (!(signextend1 === undefined || signextend2 === undefined)) {
          if (signextend1 === BigInt(0)) {
            stack.unshift(signextend2);
          } else {
            stack.unshift(
              BigInt(
                "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
              )
            );
          }
        }
        break;
      case opcode.toString(16) === "10": // LT
        const lt1 = stack.shift();
        const lt2 = stack.shift();
        if (!(lt1 === undefined || lt2 === undefined)) {
          if (lt1 < lt2) {
            stack.unshift(BigInt(1));
          } else {
            stack.unshift(BigInt(0));
          }
        }
        break;
      case opcode.toString(16) === "11": // GT
        const gt1 = stack.shift();
        const gt2 = stack.shift();
        if (!(gt1 === undefined || gt2 === undefined)) {
          if (gt1 > gt2) {
            stack.unshift(BigInt(1));
          } else {
            stack.unshift(BigInt(0));
          }
        }
        break;
      case opcode.toString(16) === "14": // EQ
        const eq1 = stack.shift();
        const eq2 = stack.shift();
        if (!(eq1 === undefined || eq2 === undefined)) {
          if (eq1 === eq2) {
            stack.unshift(BigInt(1));
          } else {
            stack.unshift(BigInt(0));
          }
        }
        break;
      case opcode.toString(16) === "15": // ISZERO
        const iszero1 = stack.shift();
        if (!(iszero1 === undefined)) {
          if (iszero1 === BigInt(0)) {
            stack.unshift(BigInt(1));
          } else {
            stack.unshift(BigInt(0));
          }
        }
        break;
      case opcode.toString(16) === "19": // NOT
        const not1 = stack.shift();
        if (!(not1 === undefined)) {
          stack.unshift(flips(not1));
        }
        break;
      default:
        break;
    }
  }

  return { success: true, stack };
}
