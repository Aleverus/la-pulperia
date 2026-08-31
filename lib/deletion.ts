export type DeletionFailurePhase =
  | "prepare"
  | "storage"
  | "database"
  | "finalize";

export type DeletionResult =
  | { ok: true }
  | {
      ok: false;
      phase: DeletionFailurePhase;
      pending: boolean;
    };

type MediaDeletionSteps = {
  begin: () => Promise<string>;
  removeStorage: (path: string) => Promise<void>;
  restore: () => Promise<void>;
  finalize: () => Promise<void>;
};

export async function deleteMediaRecoverably(
  steps: MediaDeletionSteps,
): Promise<DeletionResult> {
  let path: string;
  try {
    path = await steps.begin();
  } catch {
    return { ok: false, phase: "prepare", pending: false };
  }

  try {
    await steps.removeStorage(path);
  } catch {
    try {
      await steps.restore();
      return { ok: false, phase: "storage", pending: false };
    } catch {
      return { ok: false, phase: "storage", pending: true };
    }
  }

  try {
    await steps.finalize();
    return { ok: true };
  } catch {
    return { ok: false, phase: "database", pending: true };
  }
}

type AccountDeletionSteps = {
  begin: () => Promise<void>;
  getPaths: () => Promise<string[]>;
  removeStorage: (paths: string[]) => Promise<void>;
  confirmRemoved: (paths: string[]) => Promise<void>;
  finalize: () => Promise<void>;
};

export async function deleteAccountRecoverably(
  steps: AccountDeletionSteps,
): Promise<DeletionResult> {
  try {
    await steps.begin();
  } catch {
    return { ok: false, phase: "prepare", pending: false };
  }

  const observedBatches = new Set<string>();
  while (true) {
    let paths: string[];
    try {
      paths = await steps.getPaths();
    } catch {
      return { ok: false, phase: "database", pending: true };
    }
    if (paths.length === 0) break;
    if (paths.length > 1000) {
      return { ok: false, phase: "database", pending: true };
    }

    const batchKey = paths.join("\n");
    if (observedBatches.has(batchKey)) {
      return { ok: false, phase: "database", pending: true };
    }
    observedBatches.add(batchKey);

    try {
      await steps.removeStorage(paths);
    } catch {
      return { ok: false, phase: "storage", pending: true };
    }
    try {
      await steps.confirmRemoved(paths);
    } catch {
      return { ok: false, phase: "database", pending: true };
    }
  }

  try {
    await steps.finalize();
    return { ok: true };
  } catch {
    return { ok: false, phase: "finalize", pending: true };
  }
}
