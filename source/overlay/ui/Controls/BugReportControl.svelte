<script lang="ts">
    import { reportPageContentScript } from "../../../common/bugReport";
    import TextContainerModifier from "../../../content-script/modifications/DOM/textContainer";
    import ElementPickerModifier from "../../../content-script/modifications/elementPicker";
    import Icon from "../Icon.svelte";
    import ElementPickerModifierDialog from "./ElementPickerDialog.svelte";
    import UiControlWithDialog from "./UIControlWithDialog.svelte";

    export let elementPickerModifier: ElementPickerModifier;
    // export let textContainerModifier: TextContainerModifier;

    let defaultOpen: boolean = false;
    let supportElementBlocker: boolean = true;
    let activeElementBlocker: boolean = false;
    let captionMessage: string = `Is there an issue with this article?`;
    if (document.body.scrollHeight < 500) {
        captionMessage = `Sorry this article doesn't work.`;
        setDefaultOpen();
    }

    let containerElement: HTMLDivElement;
    async function setDefaultOpen() {
        await new Promise((r) => setTimeout(r, 600));

        function onInteraction() {
            // close popup on user action
            defaultOpen = false;

            window.removeEventListener("click", onInteraction);
            window.removeEventListener("blur", onInteraction);
            containerElement.removeEventListener("mouseenter", onInteraction); // popup will still be shown through hover style
        }
        window.addEventListener("click", onInteraction);
        window.addEventListener("blur", onInteraction); // iframe click
        containerElement.addEventListener("mouseenter", onInteraction);

        supportElementBlocker = false;
        defaultOpen = true;
    }

    let reportedPage: boolean = false;
    function reportPage() {
        reportedPage = true;
        reportPageContentScript();

        // setTimeout(() => {
        //     reportedPage = false;
        // }, 3000);
    }

    function toggleElementBlocker() {
        activeElementBlocker = !activeElementBlocker;
        if (activeElementBlocker) {
            elementPickerModifier.enable();
        } else {
            elementPickerModifier.disable();
        }
    }
</script>

<UiControlWithDialog
    iconName="bug"
    defaultOpen={defaultOpen || activeElementBlocker}
>
    <div class="lindy-bugreport-content" bind:this={containerElement}>
        <div class="lindy-bugreport-caption">{captionMessage}</div>
        <div class="lindy-bugreport-buttons">
            {#if supportElementBlocker}
                <div
                    class="lindy-bugreport-button lindy-bugreport-block"
                    on:click={toggleElementBlocker}
                >
                    <Icon iconName="selector" />
                    <div>Block elements</div>
                </div>
            {/if}

            <div
                class={"lindy-bugreport-button lindy-bugreport-flag " +
                    (reportedPage ? "lindy-selected" : "")}
                on:click={reportPage}
            >
                <Icon iconName="flag" />
                <div>{reportedPage ? "Thank you!" : "Report page"}</div>
            </div>
        </div>
    </div>
    {#if activeElementBlocker}
        <ElementPickerModifierDialog
            {elementPickerModifier}
            on:save={toggleElementBlocker}
        />
    {/if}
</UiControlWithDialog>

<style global lang="postcss">
    .lindy-bugreport-content {
        position: relative;
        padding: 10px;
        width: max-content;
        z-index: 100;

        color: var(--text-color);
        font-family: Poppins, sans-serif;
    }

    .lindy-bugreport-caption {
        margin-bottom: 10px;

        font-size: 14px;
        font-weight: 600;
    }

    .lindy-bugreport-buttons {
        display: flex;
        justify-content: end;
        gap: 10px;
    }
    .lindy-bugreport-button {
        padding: 2px 8px;
        display: flex;
        align-items: center;

        font-size: 13px;
        font-weight: 600;
        color: var(--text-color);

        cursor: pointer;
        border: none;
        border-radius: 5px;
        box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1),
            0 1px 2px -1px rgb(0 0 0 / 0.1);
        background-color: #f3f4f6;
        user-select: none;

        transform: scale(100%);
        filter: brightness(100%);
        transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .lindy-bugreport-button > .lindy-ui-icon {
        color: var(--text-color) !important;
        width: 1em !important;
        margin-right: 3px;
    }

    .lindy-bugreport-button:not(.lindy-selected):hover {
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1),
            0 2px 4px -2px rgb(0 0 0 / 0.1);
        filter: brightness(90%);
    }
    .lindy-bugreport-button.lindy-selected {
        transform: scale(97%);
        box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    }

    .lindy-bugreport-flag {
        background-color: #edd75b;
    }
    /* .lindy-bugreport-block:hover {
        background-color: #f87171;
    } */
</style>
