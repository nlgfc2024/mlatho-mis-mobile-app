const { withMainActivity } = require("@expo/config-plugins");

const GUARD_MARKER = "React Native may deliver this callback before ReactDelegate is ready.";
const INSERTION_ANCHOR = "  override fun invokeDefaultOnBackPressed() {";

const USER_LEAVE_HINT_GUARD = `  override fun onUserLeaveHint() {
    // ${GUARD_MARKER}
    if (getReactDelegate() != null) {
      super.onUserLeaveHint()
    }
  }

`;

function addUserLeaveHintGuard(contents) {
  if (contents.includes(GUARD_MARKER)) {
    return contents;
  }

  if (!contents.includes(INSERTION_ANCHOR)) {
    throw new Error(
      "Unable to add the Android user-leave-hint guard: MainActivity template anchor was not found.",
    );
  }

  return contents.replace(INSERTION_ANCHOR, `${USER_LEAVE_HINT_GUARD}${INSERTION_ANCHOR}`);
}

function withAndroidUserLeaveHintGuard(config) {
  return withMainActivity(config, (mainActivityConfig) => {
    if (mainActivityConfig.modResults.language !== "kt") {
      throw new Error(
        "The Android user-leave-hint guard currently requires a Kotlin MainActivity.",
      );
    }

    mainActivityConfig.modResults.contents = addUserLeaveHintGuard(
      mainActivityConfig.modResults.contents,
    );

    return mainActivityConfig;
  });
}

module.exports = withAndroidUserLeaveHintGuard;
module.exports.addUserLeaveHintGuard = addUserLeaveHintGuard;
