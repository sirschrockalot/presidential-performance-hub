import type { Prisma } from "@prisma/client";

type AuditLogWriter = {
  auditLog: {
    // Prisma's checked create input can be relation-only; use unchecked to allow actorUserId.
    create: (args: { data: Prisma.AuditLogUncheckedCreateInput }) => Promise<unknown>;
  };
};

export type AuditLogParams = {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
};

function toSerializable(value: unknown): unknown {
  // Keep audit metadata JSON-safe; Prisma expects JsonValue.
  if (value instanceof Date) return value.toISOString();

  // Prisma Decimal (runtime library) behaves like an object with toNumber().
  if (value && typeof value === "object" && "toNumber" in value && typeof (value as any).toNumber === "function") {
    try {
      return (value as any).toNumber();
    } catch {
      return (value as any).toString?.() ?? String(value);
    }
  }

  return value;
}

function normalizeMetadata(metadata: unknown): Prisma.InputJsonValue | undefined {
  if (metadata === undefined) return undefined;
  return JSON.parse(
    JSON.stringify(metadata, (_key, val) => {
      return toSerializable(val);
    })
  ) as Prisma.InputJsonValue;
}

export async function writeAuditLog(prismaOrTx: AuditLogWriter, params: AuditLogParams) {
  const metadata = normalizeMetadata(params.metadata);

  await prismaOrTx.auditLog.create({
    data: {
      actorUserId: params.actorUserId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: metadata ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    },
  });
}

