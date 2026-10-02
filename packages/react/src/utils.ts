export function cx(...classes: Array<string | false | null | undefined>): string | undefined {
  const result = classes.filter(Boolean).join(" ");
  return result || undefined;
}
