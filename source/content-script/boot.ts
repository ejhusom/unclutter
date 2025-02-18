import {
    extensionSupportsUrl,
    isConfiguredToEnable,
    isDeniedForDomain,
    isNonLeafPage,
} from "../common/articleDetection";
import {
    enableBootUnclutterMessage,
    getFeatureFlag,
} from "../common/featureFlags";
import browser from "../common/polyfill";
import { getDomainFrom } from "../common/util";
import { displayToast } from "../overlay/toast";

// script injected into every tab before dom constructed
// if configured by the user, initialize the extension funcationality
async function boot() {
    const url = new URL(window.location.href);
    const domain = getDomainFrom(url);

    // hard denylists
    if (!extensionSupportsUrl(url)) {
        return;
    }
    const deniedForDomain = await isDeniedForDomain(domain);
    if (deniedForDomain) {
        return;
    }

    let triggeredIsLikelyArticle = false;

    // heuristic check
    if (!isNonLeafPage(url)) {
        isLikelyArticle(domain);
        triggeredIsLikelyArticle = true;
    }

    // check local url map for article annotation count matches
    const foundCount = await browser.runtime.sendMessage(null, {
        event: "checkLocalAnnotationCount",
    });
    if (foundCount && !triggeredIsLikelyArticle) {
        console.log("Found annotations count, assuming this is an article");
        isLikelyArticle(domain);
    }

    if (domain === "unclutter.lindylearn.io") {
        listenForTutorialPageEvents();
    }
}

async function isLikelyArticle(domain: string) {
    const configuredEnable = await isConfiguredToEnable(domain);
    const enableUnclutterMessage = await getFeatureFlag(
        enableBootUnclutterMessage
    );
    if (configuredEnable) {
        enablePageView("allowlisted");
    } else if (enableUnclutterMessage) {
        showUnclutterMessage();
    }
}

async function showUnclutterMessage() {
    if (document.readyState !== "complete") {
        await new Promise((resolve) =>
            window.addEventListener("load", resolve)
        );
    }

    displayToast("Unclutter article", () => {
        enablePageView("message");
    });
}

function enablePageView(trigger) {
    // request injection of additional extension functionality
    browser.runtime.sendMessage(null, {
        event: "requestEnhance",
        trigger,
    });
}

// handle events from unclutter.lindylearn.io/welcome
function listenForTutorialPageEvents() {
    window.addEventListener("message", function (event) {
        if (event.data.type === "openUnclutterOptionsPage") {
            browser.runtime.sendMessage({ event: "openOptionsPage" });
        }
    });
}

boot();
