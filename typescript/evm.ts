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
import { keccak256, fromHex } from "viem";
import { hexStringToUint8Array } from "./evm.test";

type Result = {
  success: boolean;
  stack: bigint[];
  logs?: {
    address: string;
    data: string;
    topics: string[];
  }[];
  return?: string;
};

const uint256 = BigInt(2 ** 256);

export default function evm(
  code: Uint8Array,
  tx: {
    to?: string;
    from?: string;
    origin?: string;
    gasprice?: string;
    value?: string;
    data?: string;
  },
  block: {
    number?: string;
    timestamp?: string;
    coinbase?: string;
    gaslimit?: string;
    gasprice?: string;
    difficulty?: string;
    chainid?: string;
    basefee?: string;
  },
  state: {
    [key: string]: {
      balance?: string;
      code?: { asm: string | null; bin: string };
    };
  },
  bin: string
): Result {
  let pc = 0;
  let opcodePc = 0n;
  let stack: bigint[] = [];
  let logs: {
    address: string;
    data: string;
    topics: string[];
  }[] = [];
  let returnValue = "";
  const memory: Record<number, string> = {};
  let memorySize = 0;
  const storage: Record<string, bigint> = {};
  let callerAddress: string | null = null;
  let isCall = false;
  let isStaticCall = false;
  let isConstructor = false;

  while (pc < code.length) {
    // console.log("code", pc, stack);
    // opcode is a number
    // opcode.toString(16) is a hex number
    const opcode = code[pc];
    pc++;
    if (opcode.toString(16) !== "58") {
      if (opcode.toString(16) === "60") {
        opcodePc = opcodePc + 2n;
      } else {
        opcodePc = opcodePc + 1n;
      }
    }
    switch (true) {
      case opcode.toString(16) === "0": // STOP
        return { success: true, stack };
      case opcode.toString(16) === "5f": // PUSH0
        stack.unshift(BigInt(0));
        break;
      case [
        "60",
        "61",
        "62",
        "63",
        "64",
        "65",
        "66",
        "67",
        "68",
        "69",
        "6a",
        "6b",
        "6c",
        "6d",
        "6e",
        "6f",
        "70",
        "71",
        "72",
        "73",
        "74",
        "75",
        "76",
        "77",
        "78",
        "79",
        "7a",
        "7b",
        "7c",
        "7d",
        "7e",
        "7f",
      ].includes(opcode.toString(16)): // PUSH1 ... PUSH32
        const pushSize = opcode - 95;
        let finalValue = "0x";

        for (let i = 0; i < code.slice(pc, pc + pushSize).length; i++) {
          let currentValue = code[pc + i].toString(16);
          if (currentValue.length === 1) {
            currentValue = "0" + currentValue;
          }
          finalValue += currentValue;
        }

        stack.unshift(BigInt(finalValue));
        pc += pushSize;
        break;
      case opcode.toString(16) === "50": // POP
        stack.shift();
        break;
      case opcode.toString(16) === "1": // ADD
        if (stack.length < 2) {
          return { success: false, stack };
        }
        const add1 = stack.shift()!;
        const add2 = stack.shift()!;

        stack.unshift((add1 + add2) % uint256);
        pc += 1;
        break;
      case opcode.toString(16) === "2": // MUL
        if (stack.length < 2) {
          return { success: false, stack };
        }
        const mul1 = stack.shift()!;
        const mul2 = stack.shift()!;

        stack.unshift((mul1 * mul2) % uint256);
        pc += 1;
        break;
      case opcode.toString(16) === "3": // SUB
        if (stack.length < 2) {
          return { success: false, stack };
        }
        const sub1 = stack.shift()!;
        const sub2 = stack.shift()!;

        if (sub1 - sub2 < 0) {
          stack.unshift(uint256 + (sub1 - sub2));
        } else {
          stack.unshift(sub1 - sub2);
        }
        pc += 1;
        break;
      case opcode.toString(16) === "4": // DIV
        if (stack.length < 2) {
          return { success: false, stack };
        }
        const div1 = stack.shift()!;
        const div2 = stack.shift()!;

        if (div2 === 0n) {
          stack.unshift(div2);
        } else {
          stack.unshift(div1 / div2);
        }
        pc += 1;
        break;
      case opcode.toString(16) === "5": // SDIV
        if (stack.length < 2) {
          return { success: false, stack };
        }
        let SDIV1 = stack.shift()!;
        const SDIV2 = stack.shift()!;

        if (SDIV2.toString(2).padStart(8, "0").slice(0, 1) === "0") {
          //positive number
          if (SDIV2 === 0n) {
            stack.unshift(SDIV2);
          } else {
            stack.unshift(SDIV1 / SDIV2);
          }
        } else {
          //negative number
          const SDIVFillCount = 32 - byteLength(SDIV2);
          let SDIVFinalValue = "0x";

          for (let i = 0; i < SDIVFillCount; i++) {
            SDIVFinalValue += "ff";
          }
          SDIVFinalValue += SDIV2.toString(16);

          if (BigInt(SDIVFinalValue) === 0n) {
            stack.unshift(BigInt(SDIVFinalValue));
          } else {
            if (SDIV1.toString(2).padStart(8, "0").slice(0, 1) !== "0") {
              SDIV1 = SDIV1 - uint256;
            }

            let SDIVResult = SDIV1 / (BigInt(SDIVFinalValue) - uint256);

            if (SDIVResult < 0) {
              SDIVResult += uint256;
            }

            stack.unshift(SDIVResult);
          }
        }
        pc += 1;
        break;
      case opcode.toString(16) === "6": // MOD
        if (stack.length < 2) {
          return { success: false, stack };
        }
        const mod1 = stack.shift()!;
        const mod2 = stack.shift()!;

        if (mod2 === 0n) {
          stack.unshift(mod2);
        } else {
          stack.unshift(mod1 % mod2);
        }

        pc += 1;
        break;
      case opcode.toString(16) === "7": // SMOD
        if (stack.length < 2) {
          return { success: false, stack };
        }
        let smod1 = stack.shift()!;
        const smod2 = stack.shift()!;

        if (smod2.toString(2).padStart(8, "0").slice(0, 1) === "0") {
          //positive number
          if (smod2 === 0n) {
            stack.unshift(smod2);
          } else {
            stack.unshift(smod1 % smod2);
          }
        } else {
          const smodFillCount = 32 - byteLength(smod2);
          let smodFinalValue = "0x";

          for (let i = 0; i < smodFillCount; i++) {
            smodFinalValue += "ff";
          }
          smodFinalValue += smod2.toString(16);

          if (BigInt(smodFinalValue) === 0n) {
            stack.unshift(BigInt(smodFinalValue));
          } else {
            if (smod1.toString(2).padStart(8, "0").slice(0, 1) !== "0") {
              smod1 = smod1 - uint256;
            }

            let SDIVResult = smod1 % (BigInt(smodFinalValue) - uint256);

            if (SDIVResult < 0) {
              SDIVResult += uint256;
            }

            stack.unshift(SDIVResult);
          }
        }

        pc += 1;
        break;
      case opcode.toString(16) === "8": // ADDMOD
        if (stack.length < 3) {
          return { success: false, stack };
        }
        const addmod1 = stack.shift()!;
        const addmod2 = stack.shift()!;
        const addmod3 = stack.shift()!;

        stack.unshift((addmod1 + addmod2) % addmod3);
        pc += 1;
        break;
      case opcode.toString(16) === "9": // MULMOD
        if (stack.length < 3) {
          return { success: false, stack };
        }
        const mulmod1 = stack.shift()!;
        const mulmod2 = stack.shift()!;
        const mulmod3 = stack.shift()!;

        stack.unshift((mulmod1 * mulmod2) % mulmod3);
        pc += 1;
        break;
      case opcode.toString(16) === "a": // EXP
        if (stack.length < 2) {
          return { success: false, stack };
        }
        const exp1 = stack.shift()!;
        const exp2 = stack.shift()!;

        stack.unshift(exp1 ** exp2 % uint256);
        pc += 1;
        break;
      case opcode.toString(16) === "b": // SIGNEXTEND
        if (stack.length < 2) {
          return { success: false, stack };
        }
        const SIGNEXTEND1 = stack.shift()!;
        const SIGNEXTEND2 = stack.shift()!;

        if (SIGNEXTEND2.toString(2).padStart(8, "0").slice(0, 1) === "0") {
          //positive number
          stack.unshift(SIGNEXTEND2);
        } else {
          //negative number
          const SIGNEXTENDFillCount = 32 - byteLength(SIGNEXTEND1);
          let SIGNEXTENDFinalValue = "0x";

          for (let i = 0; i < SIGNEXTENDFillCount; i++) {
            SIGNEXTENDFinalValue += "ff";
          }
          SIGNEXTENDFinalValue += SIGNEXTEND2.toString(16);
          stack.unshift(BigInt(SIGNEXTENDFinalValue));
        }
        pc += 1;
        break;
      case opcode.toString(16) === "10": // LT
        if (stack.length < 2) {
          return { success: false, stack };
        }
        const lt1 = stack.shift()!;
        const lt2 = stack.shift()!;

        if (lt1 < lt2) {
          stack.unshift(1n);
        } else {
          stack.unshift(0n);
        }

        pc += 1;
        break;
      case opcode.toString(16) === "11": // GT
        if (stack.length < 2) {
          return { success: false, stack };
        }
        const gt1 = stack.shift()!;
        const gt2 = stack.shift()!;

        if (gt1 > gt2) {
          stack.unshift(1n);
        } else {
          stack.unshift(0n);
        }

        pc += 1;
        break;
      case opcode.toString(16) === "12": // SLT
        if (stack.length < 2) {
          return { success: false, stack };
        }
        let slt1 = stack.shift()!;
        let slt2 = stack.shift()!;

        if (slt1.toString(2).padStart(8, "0").slice(0, 1) === "1") {
          slt1 = slt1 - uint256;
        }

        if (slt2.toString(2).padStart(8, "0").slice(0, 1) === "1") {
          slt2 = slt2 - uint256;
        }

        if (slt1 < slt2) {
          stack.unshift(1n);
        } else {
          stack.unshift(0n);
        }

        pc += 1;
        break;
      case opcode.toString(16) === "13": // SGT
        if (stack.length < 2) {
          return { success: false, stack };
        }
        let sgt1 = stack.shift()!;
        let sgt2 = stack.shift()!;

        if (sgt1.toString(2).padStart(8, "0").slice(0, 1) === "1") {
          sgt1 = sgt1 - uint256;
        }

        if (sgt2.toString(2).padStart(8, "0").slice(0, 1) === "1") {
          sgt2 = sgt2 - uint256;
        }

        if (sgt1 > sgt2) {
          stack.unshift(1n);
        } else {
          stack.unshift(0n);
        }

        pc += 1;
        break;
      case opcode.toString(16) === "14": // EQ
        if (stack.length < 2) {
          return { success: false, stack };
        }
        const eq1 = stack.shift()!;
        const eq2 = stack.shift()!;

        if (eq1 === eq2) {
          stack.unshift(1n);
        } else {
          stack.unshift(0n);
        }

        pc += 1;
        break;
      case opcode.toString(16) === "15": // ISZERO
        if (stack.length < 1) {
          return { success: false, stack };
        }
        const iszero1 = stack.shift()!;

        if (iszero1 === 0n) {
          stack.unshift(1n);
        } else {
          stack.unshift(0n);
        }

        pc += 1;
        break;
      case opcode.toString(16) === "16": // AND
        if (stack.length < 2) {
          return { success: false, stack };
        }
        const and1 = stack.shift()!;
        const bitAnd1 = and1.toString(2).padStart(8, "0");
        const and2 = stack.shift()!;
        const bitAnd2 = and2.toString(2).padStart(8, "0");
        const andForCount =
          bitAnd1.length > bitAnd2.length ? bitAnd2.length : bitAnd1.length;

        let bitAndResult = "";
        for (let i = 0; i < andForCount; i++) {
          if (bitAnd1[i] === "0" || bitAnd2[i] === "0") {
            bitAndResult += "0";
          } else {
            bitAndResult += "1";
          }
        }

        const andResult = BigInt(
          "0x" +
            parseInt(bitAndResult, 2)
              .toString(16)
              .padStart(Math.ceil(bitAndResult.length / 4), "0")
        );

        stack.unshift(andResult);

        pc += 1;
        break;
      case opcode.toString(16) === "17": // OR
        if (stack.length < 2) {
          return { success: false, stack };
        }
        const or1 = stack.shift()!;
        const bitOr1 = or1.toString(2).padStart(8, "0");
        const or2 = stack.shift()!;
        const bitOr2 = or2.toString(2).padStart(8, "0");
        const orForCount =
          bitOr1.length > bitOr2.length ? bitOr1.length : bitOr2.length;

        let bitOrResult = "";
        for (let i = 0; i < orForCount; i++) {
          if (bitOr1[i] === "1" || bitOr2[i] === "1") {
            bitOrResult += "1";
          } else {
            bitOrResult += "0";
          }
        }

        const orResult = BigInt(
          "0x" +
            parseInt(bitOrResult, 2)
              .toString(16)
              .padStart(Math.ceil(bitOrResult.length / 4), "0")
        );

        stack.unshift(orResult);

        pc += 1;
        break;
      case opcode.toString(16) === "18": // XOR
        if (stack.length < 2) {
          return { success: false, stack };
        }
        const xor1 = stack.shift()!;
        const bitXor1 = xor1.toString(2).padStart(8, "0");
        const xor2 = stack.shift()!;
        const bitXor2 = xor2.toString(2).padStart(8, "0");
        const xorForCount =
          bitXor1.length > bitXor2.length ? bitXor1.length : bitXor2.length;

        let bitXorResult = "";
        for (let i = 0; i < xorForCount; i++) {
          if (
            (bitXor1[i] === "1" && bitXor2[i] === "1") ||
            (bitXor1[i] === "0" && bitXor2[i] === "0")
          ) {
            bitXorResult += "0";
          } else {
            bitXorResult += "1";
          }
        }

        const xorResult = BigInt(
          "0x" +
            parseInt(bitXorResult, 2)
              .toString(16)
              .padStart(Math.ceil(bitXorResult.length / 4), "0")
        );

        stack.unshift(xorResult);

        pc += 1;
        break;
      case opcode.toString(16) === "19": // NOT
        if (stack.length < 1) {
          return { success: false, stack };
        }
        const not1 = stack.shift()!;
        const bitNot1 = not1.toString(2).padStart(8, "0");

        let bitNot1Result = "";
        for (let i = 0; i < bitNot1.length; i++) {
          if (bitNot1[i] === "0") {
            bitNot1Result += "1";
          } else {
            bitNot1Result += "0";
          }
        }

        const notResult = BigInt(
          "0x" +
            parseInt(bitNot1Result, 2)
              .toString(16)
              .padStart(Math.ceil(bitNot1Result.length / 4), "0")
        );

        if (notResult.toString(2).padStart(8, "0").slice(0, 1) === "0") {
          //positive number
          stack.unshift(notResult);
        } else {
          //negative number
          const notFillCount = 32 - byteLength(notResult);
          let notFinalValue = "0x";

          for (let i = 0; i < notFillCount; i++) {
            notFinalValue += "ff";
          }
          notFinalValue += notResult.toString(16);
          stack.unshift(BigInt(notFinalValue));
        }

        pc += 1;
        break;
      case opcode.toString(16) === "1b": // SHL
        if (stack.length < 2) {
          return { success: false, stack };
        }
        const shl1 = stack.shift()!;
        const shl2 = stack.shift()!;

        if (shl1 > 255) {
          stack.unshift(0n);
        } else {
          let shlResult = shl2.toString(2).padStart(8, "0");

          for (let i = 0n; i < shl1; i++) {
            shlResult += "0";
          }

          const shlResultHex = parseInt(shlResult, 2)
            .toString(16)
            .padStart(Math.ceil(shlResult.length / 4), "0")
            .slice(-64);

          stack.unshift(BigInt("0x" + shlResultHex));
        }
        pc += 1;
        break;
      case opcode.toString(16) === "1c": // SHR
        if (stack.length < 2) {
          return { success: false, stack };
        }
        const shr1 = stack.shift()!;
        const shr2 = stack.shift()!;

        if (shr1 > 255) {
          stack.unshift(0n);
        } else {
          let shrResult = shr2.toString(2).padStart(8, "0");

          for (let i = 0n; i < shr1; i++) {
            shrResult = shrResult.slice(0, shrResult.length - 1);
          }

          const shlResultHex =
            "0x" +
            parseInt(shrResult, 2)
              .toString(16)
              .padStart(Math.ceil(shrResult.length / 4), "0");

          stack.unshift(BigInt(shlResultHex));
        }
        pc += 1;
        break;
      case opcode.toString(16) === "1d": // SAR
        if (stack.length < 2) {
          return { success: false, stack };
        }
        const sar1 = stack.shift()!;
        const sar2 = stack.shift()!;

        if (sar1 > 255) {
          if (
            sar2.toString(2).padStart(8, "0").slice(0, 1) === "0" ||
            sar2.toString(2).padStart(8, "0").length % 8 !== 0
          ) {
            stack.unshift(0n);
          } else {
            stack.unshift(uint256 - 1n);
          }
        } else {
          if (sar2.toString(2).padStart(8, "0").slice(0, 1) === "0") {
            //positive number
            let sarResult = sar2.toString(2).padStart(8, "0");

            for (let i = 0n; i < sar1; i++) {
              sarResult = sarResult.slice(0, sarResult.length - 1);
            }

            const sarResultHex =
              "0x" +
              parseInt(sarResult, 2)
                .toString(16)
                .padStart(Math.ceil(sarResult.length / 4), "0");

            stack.unshift(BigInt(sarResultHex));
          } else {
            //negative number
            let sarResult = sar2.toString(2).padStart(8, "0");

            for (let i = 0n; i < sar1; i++) {
              sarResult = "1" + sarResult.slice(0, sarResult.length - 1);
            }

            const big = BigInt("0b" + sarResult);

            let sarResultHex = big.toString(16);

            const width = Math.ceil(sarResult.length / 4);
            if (sarResultHex.length < width) {
              sarResultHex = sarResultHex.padStart(width, "0");
            }

            sarResultHex = "0x" + sarResultHex;

            stack.unshift(BigInt(sarResultHex));
          }
        }

        pc += 1;
        break;
      case opcode.toString(16) === "1a": // BYTE
        if (stack.length < 2) {
          return { success: false, stack };
        }

        const byte1 = stack.shift()!;
        const byte2 = stack.shift()!;

        if (byte1 > 31n) {
          stack.unshift(0n);
        } else {
          const byteFromRight = 31n - byte1;

          const byte2Hex = byte2.toString(16);
          const byteStart = byte2Hex.length - (Number(byteFromRight) + 1) * 2;
          const byteResult = byte2Hex.slice(byteStart, byteStart + 2);

          stack.unshift(BigInt("0x" + byteResult));
        }

        pc += 1;
        break;
      case [
        "80",
        "81",
        "82",
        "83",
        "84",
        "85",
        "86",
        "87",
        "88",
        "89",
        "8a",
        "8b",
        "8c",
        "8d",
        "8e",
        "8f",
      ].includes(opcode.toString(16)): // DUP1...DUP16
        const dupIndex = opcode - 128;
        const dup = stack[dupIndex];
        stack.unshift(dup);
        break;
      case [
        "90",
        "91",
        "92",
        "93",
        "94",
        "95",
        "96",
        "97",
        "98",
        "99",
        "9a",
        "9b",
        "9c",
        "9d",
        "9e",
        "9f",
      ].includes(opcode.toString(16)): // SWAP1...SWAP16
        const swapIndex = opcode - 144;
        const swap1 = stack.shift()!;
        const [swap2] = stack.splice(swapIndex, 1);
        stack.splice(swapIndex, 0, swap1);
        stack.unshift(swap2);
        break;
      case opcode.toString(16) === "58": // PC
        stack.unshift(BigInt(opcodePc));
        break;
      case opcode.toString(16) === "5a": // GAS
        stack.unshift(uint256 - 1n);
        break;
      case opcode.toString(16) === "56": // JUMP
        stack.shift();
        let jumpDest = 0;

        for (let i = pc; i < code.length; i++) {
          // need to check if JUMPDEST is valid
          if (
            code[i].toString(16) === "5b" &&
            code[i - 1].toString(16) !== "60"
          ) {
            jumpDest = i;
          }
        }

        if (jumpDest === 0) {
          return { success: false, stack };
        }

        pc = jumpDest + 1;
        break;
      case opcode.toString(16) === "57": // JUMPI
        stack.shift()!;
        const jumpi2 = stack.shift()!;

        if (jumpi2 === 0n) {
          break;
        }

        let jumpiDest = 0;
        for (let i = pc; i < code.length; i++) {
          // need to check if JUMPDEST is valid
          if (
            code[i].toString(16) === "5b" &&
            code[i - 1].toString(16) !== "60"
          ) {
            jumpiDest = i;
          }
        }

        if (jumpiDest === 0) {
          return { success: false, stack };
        }

        pc = jumpiDest + 1;
        break;
      case opcode.toString(16) === "5b": // JUMPDEST
        break;
      case opcode.toString(16) === "51": // MLOAD
        if (stack.length < 1) {
          return { success: false, stack };
        }
        const mload1 = stack.shift()!;
        let hexMload2 = "0x";
        for (let i = 0; i < 32; i++) {
          const mloadValue = memory[Number(mload1) + i] ?? "00";
          hexMload2 += mloadValue;

          if (i === 31 && Number(mload1) + 32 > memorySize) {
            memorySize = Number(mload1) + 32;
          }
        }

        stack.unshift(BigInt(hexMload2));
        break;
      case opcode.toString(16) === "52": // MSTORE
        if (stack.length < 2) {
          return { success: false, stack };
        }
        const mstore1 = stack.shift()!;
        const mstore2 = stack.shift()!;
        let hexMstore2 = mstore2.toString(16);
        if (hexMstore2.length < 64) {
          const missingMstore2 = 64 - hexMstore2.length;
          hexMstore2 = "0".repeat(missingMstore2) + hexMstore2;
        }

        for (let i = 0; i < 32; i++) {
          memory[Number(mstore1) + i] = hexMstore2.slice(i * 2, (i + 1) * 2);

          if (Number(mstore1) + i > memorySize) {
            memorySize = Math.ceil((Number(mstore1) + i) / 32) * 32;
          }
        }
        break;
      case opcode.toString(16) === "53": // MSTORE8
        if (stack.length < 2) {
          return { success: false, stack };
        }
        const mstore81 = stack.shift()!;
        const mstore82 = stack.shift()!;
        let hexMstore82 = mstore82.toString(16);
        memory[Number(mstore81)] = hexMstore82;
        const mstore8Size = Math.ceil(Number(mstore81) / 32) * 32;
        if (mstore8Size > memorySize) {
          memorySize = mstore8Size;
        }
        break;
      case opcode.toString(16) === "59": // MSIZE
        const msize1 = Math.ceil(memorySize / 32) * 32;
        stack.unshift(BigInt(msize1));
        break;
      case opcode.toString(16) === "20": // SHA3
        if (stack.length < 2) {
          return { success: false, stack };
        }
        const sha31 = stack.shift()!;
        const sha32 = stack.shift()!;
        let sha3Hex = "0x";
        for (let i = 0; i < Number(sha32); i++) {
          const sha3Value = memory[Number(sha31) + i] ?? "00";
          sha3Hex += sha3Value;
        }
        const bytes = fromHex(sha3Hex as `0x${string}`, "bytes");
        stack.unshift(BigInt(keccak256(bytes)));
        break;
      case opcode.toString(16) === "30": // ADDRESS
        if (tx.to == null) {
          return { success: false, stack: [] };
        }

        stack.unshift(BigInt(tx.to));
        break;
      case opcode.toString(16) === "32": // ORIGIN
        if (tx.origin == null) {
          return { success: false, stack: [] };
        }

        stack.unshift(BigInt(tx.origin));
        break;
      case opcode.toString(16) === "33": // CALLER
        if (tx.from == null && callerAddress == null) {
          return { success: false, stack: [] };
        }

        if (tx.from != null) {
          stack.unshift(BigInt(tx.from));
        } else {
          stack.unshift(BigInt(callerAddress!));
        }
        break;
      case opcode.toString(16) === "3a": // GASPRICE
        if (tx.gasprice == null) {
          return { success: false, stack: [] };
        }

        stack.unshift(BigInt(tx.gasprice));
        break;
      case opcode.toString(16) === "48": // BASEFEE
        if (block.basefee == null) {
          return { success: false, stack: [] };
        }

        stack.unshift(BigInt(block.basefee));
        break;
      case opcode.toString(16) === "41": // COINBASE
        if (block.coinbase == null) {
          return { success: false, stack: [] };
        }

        stack.unshift(BigInt(block.coinbase));
        break;
      case opcode.toString(16) === "42": // TIMESTAMP
        if (block.timestamp == null) {
          return { success: false, stack: [] };
        }

        stack.unshift(BigInt(block.timestamp));
        break;
      case opcode.toString(16) === "43": // NUMBER
        if (block.number == null) {
          return { success: false, stack: [] };
        }

        stack.unshift(BigInt(block.number));
        break;
      case opcode.toString(16) === "44": // DIFFICULTY
        if (block.difficulty == null) {
          return { success: false, stack: [] };
        }

        stack.unshift(BigInt(block.difficulty));
        break;
      case opcode.toString(16) === "45": // GASLIMIT
        if (block.gaslimit == null) {
          return { success: false, stack: [] };
        }

        stack.unshift(BigInt(block.gaslimit));
        break;
      case opcode.toString(16) === "46": // CHAINID
        if (block.chainid == null) {
          return { success: false, stack: [] };
        }

        stack.unshift(BigInt(block.chainid));
        break;
      case opcode.toString(16) === "40": // BLOCKHASH
        break;
      case opcode.toString(16) === "31": // BALANCE
        const balanceAddress = stack.shift()!;

        const balanceAddressHex =
          "0x" + balanceAddress.toString(16).toLowerCase();
        let balanceOfAddress = "0x0";

        if (
          state != null &&
          state[balanceAddressHex] != null &&
          state[balanceAddressHex].balance != null
        ) {
          balanceOfAddress = state[balanceAddressHex].balance;
        }

        stack.unshift(BigInt(balanceOfAddress));
        break;
      case opcode.toString(16) === "34": // CALLVALUE
        if (tx.value == null) {
          return { success: false, stack: [] };
        }

        stack.unshift(BigInt(tx.value));
        break;
      case opcode.toString(16) === "35": // CALLDATALOAD
        if (tx.data == null) {
          return { success: false, stack: [] };
        }
        const callDataLoad1 = stack.shift()!;
        let callDataLoad2 = tx.data.slice(
          Number(callDataLoad1) * 2,
          Number(callDataLoad1) * 2 + 64
        );
        const missingCallDataLoad2 = 64 - callDataLoad2.length;
        for (let i = 0; i < missingCallDataLoad2; i++) {
          callDataLoad2 += "0";
        }

        stack.unshift(BigInt("0x" + callDataLoad2));
        break;
      case opcode.toString(16) === "36": // CALLDATASIZE
        if (tx == null || tx.data == null) {
          stack.unshift(0n);
        } else {
          stack.unshift(BigInt(tx.data.length / 2));
        }
        break;
      case opcode.toString(16) === "37": // CALLDATACOPY
        if (tx == null || tx.data == null) {
          stack.unshift(0n);
        } else {
          const callDataCopy1 = stack.shift()!; // destOffset
          const callDataCopy2 = stack.shift()!; // offset
          const callDataCopy3 = stack.shift()!; // size

          const calldataToCopy = tx.data.slice(
            Number(callDataCopy2) * 2,
            Number(callDataCopy2) * 2 + Number(callDataCopy3) * 2
          );

          for (let i = 0; i < calldataToCopy.length / 2; i++) {
            memory[Number(callDataCopy1) + i] = calldataToCopy.slice(
              i * 2,
              (i + 1) * 2
            );

            if (Number(callDataCopy1) + i > memorySize) {
              memorySize =
                Math.ceil(Number(Number(callDataCopy1) + i) / 32) * 32;
            }
          }
        }
        break;
      case opcode.toString(16) === "38": // CODESIZE
        stack.unshift(BigInt(code.length));
        break;
      case opcode.toString(16) === "39": // CODECOPY
        const codecopy1 = stack.shift()!; // destOffset
        const codecopy2 = stack.shift()!; // offset
        const codecopy3 = stack.shift()!; // size
        let codecopy4 = bin.slice(
          Number(codecopy2) * 2,
          Number(codecopy2) * 2 + Number(codecopy3) * 2
        );
        const missingCodecopy1 = Number(codecopy3) * 2 - codecopy4.length;

        codecopy4 = codecopy4 + "0".repeat(missingCodecopy1);

        if (codecopy4.length < 64) {
          const missingCodecopy2 = 64 - codecopy4.length;
          codecopy4 = codecopy4 + "0".repeat(missingCodecopy2);
        }

        for (let i = 0; i < 32; i++) {
          memory[Number(codecopy1) + i] = codecopy4.slice(i * 2, (i + 1) * 2);
        }
        break;
      case opcode.toString(16) === "3b": // EXTCODESIZE
        const extcodeSizeAddress1 = stack.shift()!;
        if (
          state == null ||
          state["0x" + extcodeSizeAddress1.toString(16)] == null ||
          state["0x" + extcodeSizeAddress1.toString(16)].code == null
        ) {
          stack.unshift(0n);
        } else {
          const extcodeSizeCode =
            state["0x" + extcodeSizeAddress1.toString(16)].code;
          if (extcodeSizeCode != null) {
            stack.unshift(BigInt(extcodeSizeCode.bin.length / 2));
          }
        }
        break;
      case opcode.toString(16) === "3c": // EXTCODECOPY
        const extcodeCopy1 = stack.shift()!; // address
        const extcodeCopy2 = stack.shift()!; // destOffset
        const extcodeCopy3 = stack.shift()!; // offset
        const extcodeCopy4 = stack.shift()!; // size
        const extcodeCopyHexAddress =
          "0x" + extcodeCopy1.toString(16).toLowerCase();

        if (
          state != null &&
          state[extcodeCopyHexAddress] != null &&
          state[extcodeCopyHexAddress].code != null
        ) {
          const extcodeCopyBin = state[extcodeCopyHexAddress].code.bin;

          let extcodeCopyData = extcodeCopyBin.slice(
            Number(extcodeCopy3) * 2,
            Number(extcodeCopy3) * 2 + Number(extcodeCopy4) * 2
          );
          const missingExtcodeCopyData =
            Number(extcodeCopy4) * 2 - extcodeCopyData.length;
          for (let i = 0; i < missingExtcodeCopyData; i++) {
            extcodeCopyData += "0";
          }

          for (let i = 0; i < extcodeCopyData.length / 2; i++) {
            memory[Number(extcodeCopy2) + i] = extcodeCopyData.slice(
              i * 2,
              (i + 1) * 2
            );
          }
        }
        break;
      case opcode.toString(16) === "3f": // EXTCODEHASH
        const extcodeHashAddress = stack.shift()!;
        const extcodeHashHexAddress =
          "0x" + extcodeHashAddress.toString(16).toLowerCase();

        if (
          state != null &&
          state[extcodeHashHexAddress] != null &&
          state[extcodeHashHexAddress].code != null
        ) {
          const extcodeHashBin = state[extcodeHashHexAddress].code.bin;
          const bytes = fromHex(
            ("0x" + extcodeHashBin) as `0x${string}`,
            "bytes"
          );
          stack.unshift(BigInt(keccak256(bytes)));
        } else {
          stack.unshift(BigInt(0));
        }
        break;
      case opcode.toString(16) === "47": // SELFBALANCE
        if (tx.to == null || state == null) {
          return { success: false, stack: [] };
        }
        const selfBalanceAddress = tx.to;
        const selfBalance = state[selfBalanceAddress].balance;

        if (selfBalance != null) {
          stack.unshift(BigInt(selfBalance));
        } else {
          stack.unshift(BigInt(0));
        }
        break;
      case opcode.toString(16) === "54": // SLOAD
        const sload1 = stack.shift()!;
        const sload2 = storage[sload1.toString(16)];
        if (sload2 == null) {
          stack.unshift(0n);
        } else {
          stack.unshift(BigInt(sload2));
        }
        break;
      case opcode.toString(16) === "55": // SSTORE
        const sstore1 = stack.shift()!;
        const sstore2 = stack.shift()!;

        if (!isStaticCall) {
          storage[sstore1.toString(16)] = sstore2;
        }
        break;
      case ["a0", "a1", "a2", "a3", "a4"].includes(opcode.toString(16)): // LOG0
        if (tx.to == null) {
          break;
        }
        const log01 = stack.shift()!;
        const log02 = stack.shift()!;
        const log0Address = tx.to;
        let log0Data = "";
        if (memorySize > 0) {
          for (let i = 0; i < Number(log02); i++) {
            if (memory[Number(log01) + i] != null) {
              log0Data += memory[Number(log01) + i];
            }
          }
        }

        const logTopicCount = Number(BigInt("0x" + opcode.toString(16)) - 160n);
        const logTopics: string[] = [];

        if (logTopicCount > 0) {
          for (let i = 0; i < logTopicCount; i++) {
            const logTopic = stack.shift()!;
            logTopics.push("0x" + logTopic.toString(16).toLowerCase());
          }
        }

        logs.push({
          address: log0Address,
          data: log0Data,
          topics: logTopics,
        });
        break;
      case opcode.toString(16) === "f3": // RETURN
        const return1 = stack.shift()!; // offset
        const return2 = stack.shift()!; // size
        let return1Value = "";
        for (let i = 0; i < Number(return2); i++) {
          if (memory[Number(return1) + i] != null) {
            return1Value += memory[Number(return1) + i];
          }
        }
        returnValue = return1Value;
        break;
      case opcode.toString(16) === "fd": // REVERT
        const revert1 = stack.shift()!; // offset
        const revert2 = stack.shift()!; // size
        let revert1Value = "";
        for (let i = 0; i < Number(revert2); i++) {
          if (memory[Number(revert1) + i] != null) {
            revert1Value += memory[Number(revert1) + i];
          }
        }
        returnValue = revert1Value;

        if (!isCall) {
          return { success: false, stack, return: returnValue };
        }
        isCall = false;
        break;
      case opcode.toString(16) === "f1": // CALL
        const call1 = stack.shift()!; // gas
        const call2 = stack.shift()!; // to
        const call3 = stack.shift()!; // value
        const call4 = stack.shift()!; // argsOffset
        const call5 = stack.shift()!; // argsSize
        const call6 = stack.shift()!; // retOffset
        const call7 = stack.shift()!; // retSize
        const callAddressHex = "0x" + call2.toString(16).toLowerCase();

        if (tx != null && tx.to != null) {
          callerAddress = tx.to;
        } else {
          callerAddress = callAddressHex;
        }

        if (
          state == null ||
          state[callAddressHex] == null ||
          state[callAddressHex].code == null
        ) {
          return { success: false, stack: [] };
        } else {
          const callBin = state[callAddressHex].code.bin;
          const callBin2 = code.slice(pc);
          pc = 0;
          code = hexStringToUint8Array(callBin);

          if (callBin2.length > 0) {
            const callMergedBin = new Uint8Array(code.length + callBin2.length);
            callMergedBin.set(code, 0);
            callMergedBin.set(callBin2, code.length);
            code = callMergedBin;
          }

          if (callBin.includes("fd")) {
            stack.unshift(0n);
          } else {
            stack.unshift(1n);
          }
          isCall = true;
        }
        break;
      case opcode.toString(16) === "3d": // RETURNDATASIZE
        stack.unshift(BigInt(returnValue.length / 2));
        break;
      case opcode.toString(16) === "3e": // RETURNDATACOPY
        const returndataCopy1 = stack.shift()!; // destOffset
        const returndataCopy2 = stack.shift()!; // offset
        const returndataCopy3 = stack.shift()!; // size
        const returndataCopy4 = returnValue.slice(
          Number(returndataCopy2) * 2,
          Number(returndataCopy2) * 2 + Number(returndataCopy3) * 2
        );

        for (let i = 0; i < returndataCopy4.length / 2; i++) {
          memory[Number(returndataCopy1) + i] = returndataCopy4.slice(
            i * 2,
            (i + 1) * 2
          );
        }
        break;
      case opcode.toString(16) === "f4": // DELEGATECALL
        const delegatecall1 = stack.shift()!; // gas
        const delegatecall2 = stack.shift()!; // to
        const delegatecall3 = stack.shift()!; // value
        const delegatecall4 = stack.shift()!; // argsOffset
        const delegatecall5 = stack.shift()!; // argsSize
        const delegatecall6 = stack.shift()!; // retOffset
        const delegatecall7 = stack.shift()!; // retSize
        const delegatecallAddressHex =
          "0x" + delegatecall2.toString(16).toLowerCase();

        if (tx != null && tx.to != null) {
          callerAddress = tx.to;
        }

        if (
          state == null ||
          state[delegatecallAddressHex] == null ||
          state[delegatecallAddressHex].code == null
        ) {
          return { success: false, stack: [] };
        } else {
          const delegatecallBin = state[delegatecallAddressHex].code.bin;
          const delegatecallBin2 = code.slice(pc);
          pc = 0;
          code = hexStringToUint8Array(delegatecallBin);

          if (delegatecallBin2.length > 0) {
            const callMergedBin = new Uint8Array(
              code.length + delegatecallBin2.length
            );
            callMergedBin.set(code, 0);
            callMergedBin.set(delegatecallBin2, code.length);
            code = callMergedBin;
          }

          if (delegatecallBin.includes("fd")) {
            stack.unshift(0n);
          } else {
            stack.unshift(1n);
          }
          isCall = true;
        }
        break;
      case opcode.toString(16) === "fa": // STATICCALL
        const staticcall1 = stack.shift()!; // gas
        const staticcall2 = stack.shift()!; // to
        const staticcall3 = stack.shift()!; // value
        const staticcall4 = stack.shift()!; // argsOffset
        const staticcall5 = stack.shift()!; // argsSize
        const staticcall6 = stack.shift()!; // retOffset
        const staticcall7 = stack.shift()!; // retSize
        const staticcallAddressHex =
          "0x" + staticcall2.toString(16).toLowerCase();

        if (tx != null && tx.to != null) {
          callerAddress = tx.to;
        }

        if (
          state == null ||
          state[staticcallAddressHex] == null ||
          state[staticcallAddressHex].code == null
        ) {
          return { success: false, stack: [] };
        } else {
          const staticcallBin = state[staticcallAddressHex].code.bin;
          const staticcallBin2 = code.slice(pc);
          pc = 0;
          code = hexStringToUint8Array(staticcallBin);

          if (staticcallBin2.length > 0) {
            const staticcallMergedBin = new Uint8Array(
              code.length + staticcallBin2.length
            );
            staticcallMergedBin.set(code, 0);
            staticcallMergedBin.set(staticcallBin2, code.length);
            code = staticcallMergedBin;
          }

          if (staticcallBin.includes("fd") || staticcallBin.includes("55")) {
            stack.unshift(0n);
          } else {
            stack.unshift(1n);
          }
          isCall = true;
          isStaticCall = true;
        }
        break;
      case opcode.toString(16) === "f0": // CREATE
        const create1 = stack.shift()!;
        const create2 = stack.shift()!;
        const create3 = stack.shift()!;

        let createAccountConstructor = "";
        if (!isConstructor) {
          for (
            let i = Number(create2);
            i < Number(create3) + Number(create2);
            i++
          ) {
            createAccountConstructor += memory[i];
          }
        }

        if (createAccountConstructor.length > 0) {
          if (createAccountConstructor.includes("fd")) {
            stack.unshift(0n);
            break;
          }
          const createAccountConstructorCode = hexStringToUint8Array(
            createAccountConstructor
          );
          const createAndRemainingCode = code.slice(pc - 7);

          const createMergedCode = new Uint8Array(
            createAccountConstructorCode.length + createAndRemainingCode.length
          );
          createMergedCode.set(createAccountConstructorCode, 0);
          createMergedCode.set(
            createAndRemainingCode,
            createAccountConstructorCode.length
          );
          code = createMergedCode;
          pc = 0;
          isConstructor = true;
          break;
        }

        if (tx != null && tx.to != null) {
          if (state == null) {
            state = {};
          }

          const bytes = fromHex(tx.to as `0x${string}`, "bytes");
          const createAddress = "0x" + keccak256(bytes).slice(26);

          const createCode =
            returnValue.length === 0
              ? undefined
              : {
                  asm: "",
                  bin: returnValue,
                };

          state[createAddress] = {
            balance: "0x" + create1.toString(16),
            code: createCode,
          };
          stack.unshift(BigInt(createAddress));
        }
        break;
      case opcode.toString(16) === "ff": // SELFDESTRUCT
        const selfdestruct1 = stack.shift()!;

        if (callerAddress != null) {
          const selfDestructBalance = state[callerAddress].balance;

          const selfDestructTransferAddress = "0x" + selfdestruct1.toString(16);
          state = {
            [selfDestructTransferAddress]: {
              balance: selfDestructBalance,
            },
          };
        }
        break;
      default:
        return { success: false, stack: [] };
    }
  }

  return { success: true, stack, logs, return: returnValue };
}

function byteLength(n: bigint): number {
  let hex = n.toString(16);

  if (hex === "0") {
    return 1;
  }

  if (hex.length % 2 !== 0) {
    hex = "0" + hex;
  }

  return hex.length / 2;
}
