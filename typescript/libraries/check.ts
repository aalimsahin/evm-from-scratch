export function checkThereIs(...args: any[]) {
  for (const arg of args) {
    if (!arg) {
      return false;
    }
  }
  return true;
}
