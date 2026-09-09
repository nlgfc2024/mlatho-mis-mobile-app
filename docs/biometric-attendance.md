# Member biometric attendance

## Security model

Member attendance must use a member-aware biometric provider. Expo
`LocalAuthentication`, iOS Face ID/Touch ID, and Android `BiometricPrompt` are
appropriate for unlocking the signed-in staff account, but they cannot return
or compare a specific member's identity. They must never be used as a member
attendance match.

The app therefore fails closed unless a native module named
`TasafMemberBiometrics` is installed. The module should wrap a certified
on-device biometric SDK or supported external fingerprint scanner. Raw face
images, fingerprint images, embeddings, and templates must remain inside the
provider boundary. JavaScript receives only an opaque template reference and a
member-bound verification result.

## Native provider contract

The module must implement these asynchronous methods:

- `getCapabilities()` returns `{ configured, provider, methods }`. Each method
  is `fingerprint` or `face` and declares `available`, `canEnrollOffline`, and
  `canVerifyOffline`.
- `enroll({ memberId, method, challenge, consentVersion })` performs liveness
  and quality checks and returns the same `memberId` and `method`, a stable
  provider name, an opaque `templateReference`, a template version, and capture
  time.
- `verify({ memberId, method, templateReference, challenge })` performs a 1:1
  match against that reference and returns `success`, the same member and
  method, provider name, a unique verification ID, time, and whether the match
  was offline.

The provider should sign or attest results and reject replayed challenges. It
must use liveness/anti-spoofing appropriate to the modality, keep vendor keys in
hardware-backed storage where available, and never return another member's
identifier for the requested reference.

## Local and offline data

Opaque enrolment references and consent metadata are stored in the local-only
`biometricEnrollments` table. The PowerSync database is protected with
SQLCipher and its key is stored with `WHEN_PASSCODE_SET_THIS_DEVICE_ONLY`.
Replacement and consent withdrawal revoke the old row instead of deleting the
audit history.

Successful attendance stores only a proof containing the member ID, local
enrolment ID, method, provider, verification ID, time, and offline flag. No
template reference or capture is included. Community-session and PWP attendance
rows remain in PowerSync's offline CRUD queue and upload after connectivity is
restored.

## Deployment and compliance gates

Before enabling a provider in production:

1. Complete a biometric data protection impact assessment and legal review for
   every operating jurisdiction.
2. Configure role-based enrolment authorization on the backend; the mobile UI
   records the signed-in staff user but is not a substitute for server policy.
3. Localize and approve the consent notice, purpose, retention period, sharing,
   alternative attendance path, withdrawal process, and child/guardian rules.
4. Define retention and deletion for active, replaced, revoked, backup, and
   server-side provider records. Withdrawing locally must also revoke any
   corresponding provider/server reference.
5. Validate false-accept/false-reject thresholds, demographic performance,
   liveness, accessibility, incident response, key rotation, audit access, and
   breach notification procedures.
6. Verify offline templates are device-bound, encrypted, revocable, and cannot
   be exported. If a provider cannot meet this requirement, set its offline
   capability to `false`.
7. Use TLS in production. The current development configuration permits clear
   text Android traffic and must not be shipped for biometric workflows.
