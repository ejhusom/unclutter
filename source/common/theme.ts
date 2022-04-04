import { mergeUserTheme } from "./storage";

export type themeName = "auto" | "white" | "sepia" | "dark";

// persisted
export const fontSizeThemeVariable = "--lindy-active-font-size";
export const pageWidthThemeVariable = "--lindy-pagewidth";
export const activeColorThemeVariable = "--lindy-color-theme";

// computed
export const backgroundColorThemeVariable = "--lindy-background-color";
export const originalBackgroundThemeVariable =
    "--lindy-original-background-color";
export const autoBackgroundThemeVariable = "--lindy-auto-background-color";
export const darkThemeTextColor = "--lindy-dark-theme-text-color";

export function applySaveThemeOverride(domain, varName, value) {
    if (varName === fontSizeThemeVariable) {
        setCssThemeVariable(varName, value, true);

        mergeUserTheme({ fontSize: value });
    } else if (varName === pageWidthThemeVariable) {
        setCssThemeVariable(varName, value, true);

        mergeUserTheme({ pageWidth: value });
    } else if (varName === activeColorThemeVariable) {
        // apply handled in ThemeModifier.ts

        mergeUserTheme({ colorTheme: value });
    }
}

export function getThemeValue(varName) {
    return window
        .getComputedStyle(document.documentElement)
        .getPropertyValue(varName)
        .trim();
}

export function setCssThemeVariable(varName, value, overwrite = false) {
    const prevValue = getThemeValue(varName);
    if (prevValue && !overwrite) {
        // Don't overwrite explicit user theme with config parsed from page
        return;
    }

    document.documentElement.style.setProperty(varName, value);
}

export function colorThemeToBackgroundColor(themeName) {
    // Get concrete color of selected theme
    if (themeName === "white") {
        return "white";
    } else if (themeName === "dark") {
        return "#212121";
    } else if (themeName === "sepia") {
        return "#F4ECD8"; // firefox sepia
    }
}