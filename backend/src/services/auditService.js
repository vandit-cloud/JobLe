import { AuditLog } from "../models/AuditLog.js";

export async function createAuditLog({ recruiterId, entityType, entityId, action, metadata = {} }) {
  await AuditLog.create({
    recruiterId,
    entityType,
    entityId,
    action,
    metadata,
  });
}

