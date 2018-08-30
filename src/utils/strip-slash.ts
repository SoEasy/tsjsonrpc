export function stripSlash(value: string): string {
  if (!value || !value.length) {
    return value;
  }

  let retVal = value;

  if (retVal[0] === '/') {
    retVal = retVal.substr(1);
  }

  if (!retVal.length) {
    return retVal;
  }

  if (retVal[retVal.length - 1] === '/') {
    retVal = retVal.substr(0, retVal.length - 1)
  }

  return retVal;
}
