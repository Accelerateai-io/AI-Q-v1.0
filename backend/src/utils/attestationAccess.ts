/**
 * Authorization rule for vendor self-attestations.
 *
 * A caller may upload evidence to, or change the visibility of, an attestation if
 * they are the original author OR they belong to the same organization. This is
 * what lets multiple users in one vendor org collaborate on the org's attestations
 * instead of only the single user who created each one.
 */
export function canAccessOrgAttestation(
  attestationOrgId: string | null | undefined,
  attestationOwnerUserId: number | null | undefined,
  callerOrgId: string | null | undefined,
  callerUserId: number,
): boolean {
  if (
    attestationOwnerUserId != null &&
    Number.isInteger(callerUserId) &&
    Number(attestationOwnerUserId) === callerUserId
  ) {
    return true;
  }
  const a = (attestationOrgId ?? "").toString().trim();
  const c = (callerOrgId ?? "").toString().trim();
  return a !== "" && c !== "" && a === c;
}
