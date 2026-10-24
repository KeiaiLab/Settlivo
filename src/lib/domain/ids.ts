import { customAlphabet } from "nanoid";

const nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 8);
export type IdPrefix = "org" | "wrk" | "inv" | "tx" | "run" | "wd" | "ntf" | "wal" | "lrq";

export function newId(prefix: IdPrefix): string {
  return `${prefix}_${nano()}`;
}
