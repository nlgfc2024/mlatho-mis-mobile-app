import type { Href, ImperativeRouter } from "expo-router";

type BackRouter = Pick<ImperativeRouter, "back" | "canGoBack" | "replace">;

/**
 * Navigate back when history exists, or replace a directly opened screen with
 * its logical parent. Calling `back` without history produces an unhandled
 * GO_BACK action in development and leaves the user stranded in production.
 */
export function goBackOrReplace(router: BackRouter, fallback: Href) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}
