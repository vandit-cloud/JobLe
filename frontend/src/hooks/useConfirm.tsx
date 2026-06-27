import { useState } from "react";

export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  return {
    open,
    pendingId,
    request(id: string) {
      setPendingId(id);
      setOpen(true);
    },
    close() {
      setOpen(false);
      setPendingId(null);
    },
  };
}

