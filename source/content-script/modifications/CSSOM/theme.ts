import browser from "../../../common/polyfill";
import { getUserTheme, UserTheme } from "../../../common/storage";
import { createStylesheetLink } from "../../../common/stylesheets";
import {
    activeColorThemeVariable,
    applySaveThemeOverride,
    autoBackgroundThemeVariable,
    backgroundColorThemeVariable,
    colorThemeToBackgroundColor,
    darkThemeTextColor,
    fontSizeThemeVariable,
    pageWidthThemeVariable,
    setCssThemeVariable,
    themeName,
} from "../../../common/theme";
import {
    getBrightness,
    HSLA,
    hslToString,
    parse,
    rgbToHSL,
} from "../../../common/util/color";
import { getOutlineIframe } from "../../../overlay/outline/common";
import AnnotationsModifier from "../annotations/annotationsModifier";
import BodyStyleModifier from "../bodyStyle";
import TextContainerModifier from "../DOM/textContainer";
import { PageModifier, trackModifierExecution } from "../_interface";
import CSSOMProvider, { isMediaRule, isStyleRule } from "./_provider";

@trackModifierExecution
export default class ThemeModifier implements PageModifier {
    private domain: string;
    private cssomProvider: CSSOMProvider;
    private annotationsModifer: AnnotationsModifier;
    private textContainerModifier: TextContainerModifier;
    private bodyStyleModifier: BodyStyleModifier;

    private theme: UserTheme;
    private darkModeActive = false; // seperate from theme -- auto theme enables and disable dark mode

    public activeColorTheme: themeName;
    public activeColorThemeListeners: ((newTheme: themeName) => void)[] = [];

    constructor(
        cssomProvider: CSSOMProvider,
        annotationsModifer: AnnotationsModifier,
        textContainerModifier: TextContainerModifier,
        bodyStyleModifier: BodyStyleModifier
    ) {
        this.cssomProvider = cssomProvider;
        this.annotationsModifer = annotationsModifer;
        this.textContainerModifier = textContainerModifier;
        this.bodyStyleModifier = bodyStyleModifier;
    }

    private systemDarkModeQuery: MediaQueryList;
    async prepare(domain: string) {
        this.domain = domain;

        // Get saved domain-specific theme
        this.theme = await getUserTheme();
        if (!this.theme) {
            return;
        }
        if (this.theme.pageWidth) {
            setCssThemeVariable(pageWidthThemeVariable, this.theme.pageWidth);
        }

        this.activeColorTheme = this.theme.colorTheme;
        if (!this.activeColorTheme) {
            this.activeColorTheme = "auto";
        }

        // Listen to system dark mode preference
        this.systemDarkModeQuery = window.matchMedia(
            "(prefers-color-scheme: dark)"
        );
        this.systemDarkModeQuery.addEventListener(
            "change",
            this.onSystemDarkThemeChange.bind(this)
        );
    }

    async transitionIn() {
        // basic heuristic whether to enable dark mode, to show it earlier
        const darkModeActive =
            this.darkModeActive ||
            this.activeColorTheme === "dark" ||
            (this.activeColorTheme === "auto" &&
                this.systemDarkModeQuery.matches);
        if (darkModeActive) {
            document.documentElement.style.setProperty(
                "background",
                "#131516",
                "important"
            );
            document.body.style.setProperty(
                "background",
                colorThemeToBackgroundColor("dark"),
                "important"
            );
        }

        // look at background color and modify if necessary
        // do now to avoid visible changes later
        this.processBackgroundColor();
        setCssThemeVariable(backgroundColorThemeVariable, this.backgroundColor);

        if (this.theme.fontSize) {
            setCssThemeVariable(fontSizeThemeVariable, this.theme.fontSize);
        }
    }

    private backgroundColor: string;
    private siteUsesDefaultDarkMode: boolean = false;
    private processBackgroundColor() {
        // use detected site color to keep personality
        this.backgroundColor =
            this.textContainerModifier.originalBackgroundColor ||
            this.bodyStyleModifier.originalBackgroundColor ||
            "white";

        // TODO test color distance to background color (brightness alone doesn't look nice)
        // but only known case is https://arstechnica.com/science/2022/05/rocket-report-starliner-soars-into-orbit-about-those-raptor-ruds-in-texas/
        if (this.backgroundColor === "rgb(240, 241, 242)") {
            this.backgroundColor = "white";
        }

        // test if dark mode enabled
        const backgroundBrightness = getBrightness(this.backgroundColor);
        const textBrightness = this.textContainerModifier.mainTextColor
            ? getBrightness(this.textContainerModifier.mainTextColor)
            : null;

        if (backgroundBrightness < 0.6 && !this.darkModeActive) {
            if (!textBrightness || textBrightness > 0.5) {
                // Site uses dark mode by default
                this.siteUsesDefaultDarkMode = true;

                if (backgroundBrightness < 0.1) {
                    // so dark that it conflicts with the html background, e.g. https://wale.id.au/posts/iviewed-your-api-keys/
                    this.backgroundColor = colorThemeToBackgroundColor("dark");
                }
            } else {
                // we likely picked the wrong background color
                this.backgroundColor = "white";
            }
        }

        // this.siteUsesDefaultDarkMode read in applyActiveColorTheme() below
    }

    afterTransitionIn() {
        this.applyActiveColorTheme();
    }

    transitionOut() {
        if (this.darkModeActive) {
            this.disableDarkMode();
        }

        this.systemDarkModeQuery.removeEventListener(
            "change",
            this.onSystemDarkThemeChange.bind(this)
        );
    }

    private onSystemDarkThemeChange({ matches: isDarkMode }: MediaQueryList) {
        this.applyActiveColorTheme();
    }

    async changeColorTheme(newColorThemeName: themeName) {
        // apply theme change
        this.activeColorTheme = newColorThemeName;
        this.applyActiveColorTheme();

        // save in storage
        applySaveThemeOverride(
            this.domain,
            activeColorThemeVariable,
            newColorThemeName
        );
    }

    // also called from overlay theme selector
    private applyActiveColorTheme() {
        // State for UI switch
        setCssThemeVariable(activeColorThemeVariable, this.activeColorTheme);
        this.activeColorThemeListeners.map((listener) =>
            listener(this.activeColorTheme)
        );

        // Determine if should use dark mode
        const prevDarkModeState = this.darkModeActive;
        this.darkModeActive = this.activeColorTheme === "dark";
        if (this.activeColorTheme === "auto") {
            this.darkModeActive = this.systemDarkModeQuery.matches;
        }

        if (this.siteUsesDefaultDarkMode) {
            // turn ui dark
            this.darkModeActive = true;
        }

        // enable or disable dark mode if there's been a change
        if (this.darkModeActive && !prevDarkModeState) {
            this.enableDarkMode();
        } else if (!this.darkModeActive && prevDarkModeState) {
            this.disableDarkMode();
        }

        // apply other background colors
        if (!this.darkModeActive) {
            let concreteColor: string;
            if (this.activeColorTheme === "auto") {
                concreteColor = this.backgroundColor;
            } else {
                concreteColor = colorThemeToBackgroundColor(
                    this.activeColorTheme
                );
            }
            setCssThemeVariable(backgroundColorThemeVariable, concreteColor);
            this.annotationsModifer.setSidebarCssVariable(
                backgroundColorThemeVariable,
                concreteColor
            );
        }

        this.updateAutoModeColor();
    }

    // Update auto state (shown in theme switcher)
    private updateAutoModeColor() {
        if (this.systemDarkModeQuery.matches) {
            const darkColor = colorThemeToBackgroundColor("dark");
            setCssThemeVariable(autoBackgroundThemeVariable, darkColor);
        } else {
            setCssThemeVariable(
                autoBackgroundThemeVariable,
                this.backgroundColor
            );
        }
    }

    private enableDarkMode() {
        // UI dark style
        createStylesheetLink(
            browser.runtime.getURL("content-script/pageview/contentDark.css"),
            "dark-mode-ui-style",
            // insert at beginning of header to not override site dark styles
            document.head.firstChild as HTMLElement
        );
        createStylesheetLink(
            browser.runtime.getURL("overlay/indexDark.css"),
            "dark-mode-ui-style"
        );
        createStylesheetLink(
            browser.runtime.getURL("overlay/outline/outlineDark.css"),
            "dark-mode-ui-style",
            getOutlineIframe()?.head.lastChild as HTMLElement
        );
        this.annotationsModifer.setSidebarDarkMode(true);

        // enable site dark mode styles if present, but always run our css tweaks too
        this.detectSiteDarkMode(true);
        const siteSupportsDarkMode = false;

        // set our text color even if using site style (need for headings)
        // (setting the variable always would override other text container styles)
        this.textContainerModifier.setTextDarkModeVariable(true);

        if (this.siteUsesDefaultDarkMode) {
            // use default background elsewhere
            setCssThemeVariable(
                backgroundColorThemeVariable,
                this.backgroundColor
            );
            this.annotationsModifer.setSidebarCssVariable(
                backgroundColorThemeVariable,
                this.backgroundColor
            );
        } else if (siteSupportsDarkMode) {
            // parse background color from site dark mode styles
            let backgroundColor: string;
            this.enabledSiteDarkModeRules.map((mediaRule) => {
                for (const styleRule of mediaRule.cssRules) {
                    if (!isStyleRule(styleRule)) {
                        return;
                    }

                    if (styleRule.style.background) {
                        backgroundColor = styleRule.style.background;
                    }
                }
            });

            // TODO handle opacity

            if (!backgroundColor) {
                // this may not always work (e.g. if css variables are used), so use default fallback
                backgroundColor = colorThemeToBackgroundColor("dark");
            }

            setCssThemeVariable(backgroundColorThemeVariable, backgroundColor);
            this.annotationsModifer.setSidebarCssVariable(
                backgroundColorThemeVariable,
                backgroundColor
            );

            if (this.activeColorTheme === "auto") {
                setCssThemeVariable(
                    autoBackgroundThemeVariable,
                    backgroundColor
                );
            }
        } else {
            // Background color
            const concreteColor = colorThemeToBackgroundColor("dark");
            setCssThemeVariable(backgroundColorThemeVariable, concreteColor);
            this.annotationsModifer.setSidebarCssVariable(
                backgroundColorThemeVariable,
                concreteColor
            );

            this.enableDarkModeStyleTweaks();
        }

        // always dark text color for ui elements
        const darkTextColor = "rgb(232, 230, 227)";
        setCssThemeVariable(darkThemeTextColor, darkTextColor, {
            setOnlyUi: true,
        });
        this.annotationsModifer.setSidebarCssVariable(
            darkThemeTextColor,
            darkTextColor
        );
    }

    private disableDarkMode() {
        document.documentElement.style.removeProperty("color");
        document.documentElement.style.removeProperty("background");
        document.documentElement.style.removeProperty(darkThemeTextColor);
        this.textContainerModifier.setTextDarkModeVariable(false);

        // undo dark mode style tweaks
        this.disableDarkModeStyleTweaks();

        document
            .querySelectorAll(".dark-mode-ui-style")
            .forEach((e) => e.remove());

        getOutlineIframe()
            ?.querySelectorAll(".dark-mode-ui-style")
            .forEach((e) => e.remove());

        this.annotationsModifer.setSidebarDarkMode(false);
    }

    private enabledSiteDarkModeRules: CSSMediaRule[] = [];
    private detectSiteDarkMode(enableIfFound = false): boolean {
        let siteSupportsDarkMode = false;

        if (this.domain === "theatlantic.com") {
            // their dark styles do not work for some reason
            return false;
        }

        // iterate only top level for performance
        // also don't iterate the rules we added
        this.cssomProvider.stylesheets.map((sheet) => {
            for (const rule of sheet.cssRules) {
                if (!isMediaRule(rule)) {
                    continue;
                }
                if (
                    !rule.media.mediaText.includes(
                        "prefers-color-scheme: dark"
                    ) ||
                    rule.media.mediaText.includes("prefers-color-scheme: light")
                ) {
                    continue;
                }

                siteSupportsDarkMode = true;

                if (enableIfFound) {
                    // insert rule copy that's always active
                    const newCssText = `@media screen ${rule.cssText.replace(
                        /@media[^{]*/,
                        ""
                    )}`;
                    const newIndex = rule.parentStyleSheet.insertRule(
                        newCssText,
                        rule.parentStyleSheet.cssRules.length
                    );
                    const newRule = rule.parentStyleSheet.cssRules[newIndex];
                    this.enabledSiteDarkModeRules.push(newRule as CSSMediaRule);
                }
            }
        });

        return siteSupportsDarkMode;
    }

    private activeDarkModeStyleTweaks: [CSSStyleRule, object][] = [];
    private enableDarkModeStyleTweaks() {
        // patch site stylesheet colors
        this.cssomProvider.iterateRules((rule) => {
            if (!isStyleRule(rule)) {
                return;
            }

            const modifications = darkModeStyleRuleMap(rule);
            if (modifications) {
                // save properties for restoration later
                const obj = {};
                for (const key of rule.style) {
                    obj[key] = rule.style.getPropertyValue(key);
                }
                this.activeDarkModeStyleTweaks.push([rule, obj]);

                // apply modifications
                for (const [key, val] of Object.entries(modifications)) {
                    rule.style.setProperty(
                        key,
                        val,
                        rule.style.getPropertyPriority(key)
                    );
                }
            }
        });
    }

    private disableDarkModeStyleTweaks() {
        this.activeDarkModeStyleTweaks.map(([rule, originalStyle]) => {
            for (const [key, value] of Object.entries(originalStyle)) {
                rule.style.setProperty(key, value);
            }
        });
        this.activeDarkModeStyleTweaks = [];

        this.enabledSiteDarkModeRules.map((mediaRule) => {
            for (const styleRule of mediaRule.cssRules) {
                styleRule.style = {};
            }
        });
        this.enabledSiteDarkModeRules = [];
    }
}

function darkModeStyleRuleMap(rule: CSSStyleRule): object {
    const modifications = {};

    if (rule.style.color) {
        modifications["color"] = changeTextColor(
            rule.style.color,
            rule.selectorText
        );
    }
    if (rule.style.backgroundColor) {
        modifications["background-color"] = changeBackgroundColor(
            rule.style.backgroundColor,
            rule.selectorText
        );
    }

    if (rule.style.boxShadow) {
        modifications["box-shadow"] = "none";
    }

    // TODO parse CSS variables better, e.g. ones set via JS or inline styles
    if (
        rule.selectorText === ":root" ||
        rule.selectorText === "*, :after, :before" // tailwind
    ) {
        for (const key of rule.style) {
            if (key.startsWith("--")) {
                const value = rule.style.getPropertyValue(key);

                // ideally transform the variables where used
                if (key.includes("background")) {
                    modifications[key] = changeBackgroundColor(
                        value,
                        rule.selectorText
                    );
                } else {
                    modifications[key] = changeTextColor(
                        value,
                        rule.selectorText
                    );
                }
            }
        }
    }

    return modifications;
}

// TODO cache

function changeTextColor(colorString: string, selectorText): string {
    if (colorString === "initial") {
        return `var(${darkThemeTextColor})`;
    }

    const hslColor = parseHslColor(colorString);
    if (!hslColor) {
        return colorString;
    }

    let newColor = colorString;
    if (hslColor.l < 0.4) {
        // main text
        // standardize most text around this

        // l e.g. 0.35 at https://fly.io/blog/a-foolish-consistency/
        newColor = `var(${darkThemeTextColor})`;
    } else {
        // make other colors more visible

        if (hslColor.s > 0.9) {
            hslColor.s = 0.9;
        }
        if (hslColor.l < 0.6) {
            hslColor.l = 0.6;
        }

        newColor = hslToString(hslColor);
    }

    // console.log(
    //     `%c     %c -> %c     %c\t${colorString}\t -> ${newColor} \t${selectorText}`,
    //     `background: ${colorString}`,
    //     `background: inherit`,
    //     `background: ${newColor}`,
    //     `background: inherit`
    // );
    return newColor;
}

function changeBackgroundColor(colorString: string, selectorText) {
    const hslColor = parseHslColor(colorString);
    if (!hslColor) {
        return colorString;
    }

    let newColor = colorString;
    if (hslColor.l > 0.8) {
        // main background
        // show through background element
        newColor = "transparent";
    } else {
        // darken other colors

        if (hslColor.s > 0.7) {
            hslColor.s = 0.7;
        }
        if (hslColor.l > 0.2) {
            hslColor.l = 0.2;
        }

        newColor = hslToString(hslColor);
    }

    // console.log(
    //     `%c     %c -> %c     %c\t${hslToString(
    //         parseHslColor(colorString)
    //     )}\t -> ${newColor} \t${selectorText}`,
    //     `background: ${colorString}`,
    //     `background: inherit`,
    //     `background: ${newColor}`,
    //     `background: inherit`
    // );
    return newColor;
}

const unparsableColors = new Set([
    "inherit",
    "transparent",
    "initial",
    "currentcolor",
    "none",
    "unset",
]);
function parseHslColor(colorString: string): HSLA | null {
    if (unparsableColors.has(colorString.toLowerCase())) {
        return null;
    }
    if (colorString.includes("var(")) {
        // remove for now
        // could still be a valid color string, e.g. rgb(59 130 246/var(--x)) at https://fly.io/blog/a-foolish-consistency/
        colorString = colorString.replace(/var\(--.*?\)/, "");
    }

    try {
        const rgbColor = parse(colorString);
        return rgbToHSL(rgbColor);
    } catch (err) {
        // console.error(colorString, err);
        return null;
    }
}
