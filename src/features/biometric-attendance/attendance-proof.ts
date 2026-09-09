import type { AttendanceAttendee, AttendanceVerificationProof } from "./types";
import type { HouseholdMemberRecord, HouseholdRecord } from "@/src/powersync/schema";

export function isVerificationForMember(
  memberId: string | null | undefined,
  proof: AttendanceVerificationProof | null | undefined,
) {
  return Boolean(
    memberId &&
    proof &&
    proof.version === 1 &&
    proof.memberId === memberId &&
    proof.enrollmentId &&
    proof.provider &&
    proof.verificationId &&
    proof.verifiedAt,
  );
}

export function assertPresentAttendeeVerified(attendee: AttendanceAttendee) {
  if (attendee.status !== "present") return;
  if (!isVerificationForMember(attendee.memberId, attendee.biometricVerification)) {
    throw new Error("Present attendance requires a biometric match for the selected member.");
  }
}

export function attendanceRemarks(attendee: AttendanceAttendee) {
  if (attendee.status !== "present") return null;
  assertPresentAttendeeVerified(attendee);

  return JSON.stringify({
    biometricVerification: attendee.biometricVerification,
  });
}

function memberBelongsToHousehold(member: HouseholdMemberRecord, household: HouseholdRecord) {
  const householdKeys = [household.uuid, household.id].filter(Boolean).map(String);
  return householdKeys.includes(String(member.householdUuid));
}

export function buildAttendanceAttendees(
  households: HouseholdRecord[],
  members: HouseholdMemberRecord[],
): AttendanceAttendee[] {
  return households.map((household) => {
    const householdMembers = members.filter(
      (member) =>
        memberBelongsToHousehold(member, household) && !member.deletedAt && member.isActive,
    );
    const selectedMember =
      householdMembers.find((member) => Boolean(member.isRepresentative)) ??
      householdMembers.find((member) => Boolean(member.isHead)) ??
      null;

    return {
      ...household,
      id: household.id,
      status: null,
      memberId: selectedMember ? String(selectedMember.uuid ?? selectedMember.id) : null,
      memberName: selectedMember?.fullName ?? household.representativeName ?? household.headName,
      biometricVerification: null,
    };
  });
}
