import { newId } from "@/lib/domain/ids";
import type { NotificationKind, Recipient } from "@/lib/domain/types";
import { pushNotification } from "@/lib/db/repo";

export async function notify(
  recipient: Recipient,
  kind: NotificationKind,
  title: string,
  body: string,
  href: string,
): Promise<void> {
  await pushNotification({
    id: newId("ntf"),
    recipient,
    kind,
    title,
    body,
    href,
    read: false,
    createdAt: new Date().toISOString(),
  });
}
