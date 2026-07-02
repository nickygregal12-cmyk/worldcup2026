import { z } from 'zod'

export class ExternalBoundaryError extends Error {
  constructor(label, issues = []) {
    const detail = issues
      .slice(0, 3)
      .map(issue => `${issue.path.length ? issue.path.join('.') : 'value'}: ${issue.message}`)
      .join('; ')
    super(`${label} failed validation${detail ? ` (${detail})` : ''}.`)
    this.name = 'ExternalBoundaryError'
    this.issues = Object.freeze(issues.map(issue => Object.freeze({
      path: Object.freeze([...issue.path]),
      message: issue.message,
      code: issue.code,
    })))
  }
}

export function parseExternal(schema, value, label = 'External response') {
  const parsed = schema.safeParse(value)
  if (!parsed.success) throw new ExternalBoundaryError(label, parsed.error.issues)
  return parsed.data
}

export const externalRecordSchema = z.record(z.string(), z.unknown())
export const externalRecordArraySchema = z.array(externalRecordSchema)
export const optionalExternalRecordSchema = externalRecordSchema.nullable().optional()

export function parseExternalRows(value, label) {
  return parseExternal(externalRecordArraySchema, value ?? [], label)
}

export function parseExternalRecord(value, label) {
  return parseExternal(externalRecordSchema, value ?? {}, label)
}
