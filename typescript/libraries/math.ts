export const MAX_UINT256 =
  BigInt(0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff);
export function add(a: bigint, b: bigint): bigint {
  return (a + b) % MAX_UINT256;
}

export function mul(a: bigint, b: bigint): bigint {
  return (a * b) % MAX_UINT256;
}

export function sub(a: bigint, b: bigint): bigint {
  const result = a - b;
  if (result < 0n) {
    return MAX_UINT256 + result;
  } else {
    return result;
  }
}

export function div(a: bigint, b: bigint): bigint {
  if (b === 0n) {
    return 0n;
  }
  return (a / b) % MAX_UINT256;
}

export function mod(a: bigint, b: bigint): bigint {
  if (b === 0n) {
    return 0n;
  }
  return a % b;
}

export function exp(a: bigint, b: bigint): bigint {
  return a ** b % MAX_UINT256;
}

export function flips(a: bigint): bigint {
  return a ^ MAX_UINT256;
}
