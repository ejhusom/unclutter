<script lang="ts">
    import {
        applySaveThemeOverride,
        fontSizeThemeVariable,
        getThemeValue,
        pageWidthThemeVariable,
        themeName,
    } from "../../../common/theme";
    import { reportEventContentScript } from "../../../content-script/messaging";
    import ThemeModifier from "../../../content-script/modifications/CSSOM/theme";
    import UiControlWithDialog from "./UIControlWithDialog.svelte";

    export let domain: string;
    export let themeModifier: ThemeModifier;

    const reportedEventTypes = {};
    function reportThemeEvent(changedProperty: string) {
        // Use nicer names
        if (changedProperty === fontSizeThemeVariable) {
            changedProperty = "fontSize";
        } else if (changedProperty === pageWidthThemeVariable) {
            changedProperty = "pageWidth";
        }

        if (!reportedEventTypes[changedProperty]) {
            reportEventContentScript("changeTheme", { changedProperty });
            reportedEventTypes[changedProperty] = true;
        }
    }

    function changeCssPixelVariable(varName: string, delta: number) {
        const currentSize = getThemeValue(varName).replace("px", "");
        const newSizePx = `${parseFloat(currentSize) + delta}px`;

        applySaveThemeOverride(domain, varName, newSizePx);

        reportThemeEvent(varName);
    }

    let activeColorTheme: themeName = themeModifier.activeColorTheme;
    themeModifier.activeColorThemeListeners.push((newTheme) => {
        activeColorTheme = newTheme;
    });
    function setTheme(themeName: themeName) {
        themeModifier.changeColorTheme(themeName); // also calls listener above

        reportThemeEvent("colorTheme");
    }
</script>

<UiControlWithDialog iconName="theme">
    <div class="lindy-plusminus">
        <div
            id="lindy-fontsize-decrease"
            on:click={() => changeCssPixelVariable(fontSizeThemeVariable, -1)}
        >
            <svg class="lindy-ui-icon" viewBox="0 0 448 512">
                <path
                    fill="currentColor"
                    d="M400 288h-352c-17.69 0-32-14.32-32-32.01s14.31-31.99 32-31.99h352c17.69 0 32 14.3 32 31.99S417.7 288 400 288z"
                />
            </svg>
        </div>
        <div
            id="lindy-fontsize-increase"
            on:click={() => changeCssPixelVariable(fontSizeThemeVariable, 1)}
        >
            <svg class="lindy-ui-icon" viewBox="0 0 448 512">
                <path
                    fill="currentColor"
                    d="M432 256c0 17.69-14.33 32.01-32 32.01H256v144c0 17.69-14.33 31.99-32 31.99s-32-14.3-32-31.99v-144H48c-17.67 0-32-14.32-32-32.01s14.33-31.99 32-31.99H192v-144c0-17.69 14.33-32.01 32-32.01s32 14.32 32 32.01v144h144C417.7 224 432 238.3 432 256z"
                />
            </svg>
        </div>
    </div>
    <div class="lindy-theme-ui-row-spacer" />
    <div class="lindy-plusminus">
        <div
            id="lindy-pagewidth-decrease"
            on:click={() =>
                changeCssPixelVariable(pageWidthThemeVariable, -100)}
        >
            <svg
                class="lindy-ui-icon"
                viewBox="0 0 512 512"
                style="transform: rotate(45deg);"
            >
                <path
                    fill="currentColor"
                    d="M54.63 502.6L176 381.3V432c0 17.69 14.31 32 32 32s32-14.31 32-32v-128c0-4.164-.8477-8.312-2.465-12.22C234.3 283.9 228.1 277.7 220.2 274.5C216.3 272.8 212.2 272 208 272h-128c-17.69 0-32 14.31-32 32s14.31 32 32 32h50.75l-121.4 121.4c-12.5 12.5-12.5 32.75 0 45.25S42.13 515.1 54.63 502.6zM274.5 220.2c3.242 7.84 9.479 14.08 17.32 17.32C295.7 239.2 299.8 240 304 240h128c17.69 0 32-14.31 32-32s-14.31-32-32-32h-50.75l121.4-121.4c12.5-12.5 12.5-32.75 0-45.25c-12.49-12.49-32.74-12.51-45.25 0L336 130.8V80c0-17.69-14.31-32-32-32s-32 14.31-32 32v127.1C272 212.2 272.8 216.3 274.5 220.2z"
                />
            </svg>
        </div>
        <div
            id="lindy-pagewidth-increase"
            on:click={() => changeCssPixelVariable(pageWidthThemeVariable, 100)}
        >
            <svg
                class="lindy-ui-icon"
                viewBox="0 0 512 512"
                style="transform: rotate(45deg);"
            >
                <path
                    fill="currentColor"
                    d="M177.4 289.4L64 402.8V352c0-17.69-14.31-32-32-32s-32 14.31-32 32v128c0 4.164 .8477 8.312 2.465 12.22c3.24 7.832 9.479 14.07 17.31 17.31C23.69 511.2 27.84 512 32 512h128c17.69 0 32-14.31 32-32s-14.31-32-32-32H109.3l113.4-113.4c12.5-12.5 12.5-32.75 0-45.25S189.9 276.9 177.4 289.4zM509.5 19.78c-3.242-7.84-9.479-14.08-17.32-17.32C488.3 .8477 484.2 0 480 0h-128c-17.69 0-32 14.31-32 32s14.31 32 32 32h50.75l-113.4 113.4c-12.5 12.5-12.5 32.75 0 45.25c12.49 12.49 32.74 12.51 45.25 0L448 109.3V160c0 17.69 14.31 32 32 32s32-14.31 32-32V32C512 27.84 511.2 23.69 509.5 19.78z"
                />
            </svg>
        </div>
    </div>
    <div class="lindy-theme-ui-row-spacer" />
    <div class="lindy-theme-row">
        <div>
            <div
                class={"lindy-theme-button " +
                    (activeColorTheme === "auto" ? "lindy-active-theme" : "")}
                id="lindy-auto-theme-button"
                on:click={() => setTheme("auto")}
            >
                <svg viewBox="0 0 512 512">
                    <path
                        fill="currentColor"
                        d="M327.5 85.19L384 64L405.2 7.491C406.9 2.985 411.2 0 416 0C420.8 0 425.1 2.985 426.8 7.491L448 64L504.5 85.19C509 86.88 512 91.19 512 96C512 100.8 509 105.1 504.5 106.8L448 128L426.8 184.5C425.1 189 420.8 192 416 192C411.2 192 406.9 189 405.2 184.5L384 128L327.5 106.8C322.1 105.1 320 100.8 320 96C320 91.19 322.1 86.88 327.5 85.19V85.19zM257.8 187.3L371.8 240C377.5 242.6 381.1 248.3 381.1 254.6C381.1 260.8 377.5 266.5 371.8 269.1L257.8 321.8L205.1 435.8C202.5 441.5 196.8 445.1 190.6 445.1C184.3 445.1 178.6 441.5 176 435.8L123.3 321.8L9.292 269.1C3.627 266.5 0 260.8 0 254.6C0 248.3 3.627 242.6 9.292 240L123.3 187.3L176 73.29C178.6 67.63 184.3 64 190.6 64C196.8 64 202.5 67.63 205.1 73.29L257.8 187.3zM405.2 327.5C406.9 322.1 411.2 320 416 320C420.8 320 425.1 322.1 426.8 327.5L448 384L504.5 405.2C509 406.9 512 411.2 512 416C512 420.8 509 425.1 504.5 426.8L448 448L426.8 504.5C425.1 509 420.8 512 416 512C411.2 512 406.9 509 405.2 504.5L384 448L327.5 426.8C322.1 425.1 320 420.8 320 416C320 411.2 322.1 406.9 327.5 405.2L384 384L405.2 327.5z"
                    />
                </svg>
            </div>
        </div>
        <div>
            <div
                class={"lindy-theme-button " +
                    (activeColorTheme === "white" ? "lindy-active-theme" : "")}
                id="lindy-white-theme-button"
                on:click={() => setTheme("white")}
            />
        </div>
        <div>
            <div
                class={"lindy-theme-button " +
                    (activeColorTheme === "dark" ? "lindy-active-theme" : "")}
                id="lindy-dark-theme-button"
                on:click={() => setTheme("dark")}
            />
        </div>
    </div>
</UiControlWithDialog>

<style global lang="postcss">
    /* row with plus and minus buttons */
    .lindy-plusminus {
        display: flex;
        width: 130px;
    }
    .lindy-plusminus > div {
        all: revert;
    }
    .lindy-theme-ui-row-spacer {
        border-top: 2px solid #f3f4f6;
    }

    /* individual buttons */
    .lindy-plusminus > div {
        width: 100%;
        height: 40px;

        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;

        font-size: 20px;
        font-weight: 700;
    }
    .lindy-plusminus:first-child > div:first-child {
        border-top-left-radius: 5px;
    }
    .lindy-plusminus:first-child > div:last-child {
        border-top-right-radius: 5px;
    }
    .lindy-plusminus:last-child > div:first-child {
        border-bottom-left-radius: 5px;
    }
    .lindy-plusminus:last-child > div:last-child {
        border-bottom-right-radius: 5px;
    }
    .lindy-plusminus > div:hover > svg {
        color: #4b5563 !important;
    }
    .lindy-plusminus > div:hover {
        background-color: #f9fafb;
    }

    .lindy-theme-row {
        display: flex;
        align-items: center;
        justify-content: space-between;

        height: 40px;
        gap: 8px;
        margin: 0 8px;
    }
    .lindy-theme-row > div {
        flex-grow: 1;
    }
    .lindy-theme-button {
        height: 20px;

        border: 2.5px solid #f3f4f6;
        border-radius: 5px;
        box-sizing: content-box !important;
        cursor: pointer;
    }
    .lindy-theme-button:hover {
        box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1),
            0 1px 2px -1px rgb(0 0 0 / 0.1);
    }
    .lindy-active-theme {
        border: 2.5px solid var(--color-muted);
    }
    #lindy-auto-theme-button {
        background: var(--lindy-auto-background-color);
        position: relative;
    }
    #lindy-auto-theme-button > svg {
        position: absolute;
        top: 3px;
        left: 6px;

        width: 14px;
    }
    #lindy-white-theme-button {
        background-color: white;
    }
    #lindy-dark-theme-button {
        background-color: #212121;
    }

    /* popup arrow */
    .lindy-theme-ui:before {
        /* arrow */
        position: absolute;
        top: 10px;
        right: -8px;
        height: 0;
        width: 0;
        content: "";

        border-top: 8px solid transparent;
        border-bottom: 8px solid transparent;
        border-left: 8px solid var(--background-color);
    }
    /* spacer under arrow to avoid breaking hover state */
    .lindy-theme-container:hover:before {
        position: absolute;
        top: 0;
        right: 0;

        display: block;
        content: "";
        width: 200%;
        height: 300%;
        cursor: auto;
    }
</style>
