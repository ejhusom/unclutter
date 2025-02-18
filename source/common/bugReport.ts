import browser, { getBrowserType } from "./polyfill";
import { getDomainFrom } from "./util";

// gather info from the page to report, and send event to background script (where we know the extension version)
export async function reportPageContentScript() {
    const url = window.location.href;
    const domain = getDomainFrom(new URL(url));

    browser.runtime.sendMessage(null, {
        event: "reportBrokenPage",
        data: {
            url,
            domain,
        },
    });
}

export async function handleReportBrokenPage(data) {
    const browserType = getBrowserType();
    const extensionInfo = await browser.management.getSelf();

    // running in unclutter-web via Next.js API function
    fetch(`https://unclutter.lindylearn.io/api/reportBrokenPage`, {
        method: "POST",
        body: JSON.stringify({
            ...data,
            userAgent: navigator.userAgent,
            browserType,
            unclutterVersion: extensionInfo.version,
        }),
    });
}
