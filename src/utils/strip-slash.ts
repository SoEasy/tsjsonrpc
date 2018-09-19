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

export function stripStarterSlash(value: string): string {
  if (!value || !value.length) {
    return value;
  }

  return value[0] === '/' ? value.substr(1) : value;
}

export function stripEndingSlash(value: string): string {
  if (!value || !value.length) {
    return value;
  }

  return value[value.length - 1] === '/' ? value.substr(0, value.length - 1) : value;
}