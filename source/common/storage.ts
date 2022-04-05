import { defaultFontSizePx } from "./defaultStorage";
import browser from "./polyfill";

export async function getAllCustomDomainSettings() {
    const config = await browser.storage.sync.get([
        "domain-allowlist",
        "domain-denylist",
    ]);
    return {
        allow: Object.keys(config["domain-allowlist"] || {}),
        deny: Object.keys(config["domain-denylist"] || {}),
    };
}

export type domainUserSetting = "allow" | "deny" | null;
export async function getUserSettingForDomain(
    domain: string
): Promise<domainUserSetting> {
    const config = await browser.storage.sync.get([
        "domain-allowlist",
        "domain-denylist",
    ]);

    if (config["domain-allowlist"]?.[domain]) {
        return "allow";
    }
    if (config["domain-denylist"]?.[domain]) {
        return "deny";
    }
    return null;
}

export async function setUserSettingsForDomain(domain, status) {
    const config = await browser.storage.sync.get([
        "domain-allowlist",
        "domain-denylist",
    ]);
    if (!config["domain-allowlist"]) {
        config["domain-allowlist"] = {};
    }
    if (!config["domain-denylist"]) {
        config["domain-denylist"] = {};
    }

    if (status === "allow") {
        config["domain-allowlist"][domain] = true;
        delete config["domain-denylist"][domain];
    } else if (status === "deny") {
        config["domain-denylist"][domain] = true;
        delete config["domain-allowlist"][domain];
    } else {
        delete config["domain-denylist"][domain];
        delete config["domain-allowlist"][domain];
    }

    await browser.storage.sync.set({
        "domain-allowlist": config["domain-allowlist"],
        "domain-denylist": config["domain-denylist"],
    });
}

export async function getUserTheme() {
    const config = await browser.storage.sync.get(["custom-global-theme"]);
    const theme = config["custom-global-theme"];

    if (
        theme?.fontSize &&
        isNaN(parseFloat(theme.fontSize.replace("px", "")))
    ) {
        theme.fontSize = defaultFontSizePx;
    }

    return (
        theme || {
            fontSize: defaultFontSizePx,
        }
    );
}
export async function mergeUserTheme(partialTheme) {
    const config = await browser.storage.sync.get(["custom-global-theme"]);
    const themeConfig = {
        ...(config["custom-global-theme"] || {}),
        ...partialTheme,
    };
    await browser.storage.sync.set({ "custom-global-theme": themeConfig });
}
