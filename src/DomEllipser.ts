
interface IOptions {
    ellipsis?: string,
    ellipsisHTML?: string,
    maxHeight?: number,
    tolerance?: number
}

interface IConfig {
    options: IOptions,
    results: IResults,
    originalText: string,
    domE: HTMLElement,
    wrapperE: HTMLElement,
    originalE: HTMLElement,
    croppedE: HTMLElement,
    ellipsisE: HTMLElement,

    maxHeight?: number
}

interface IResults {
    cropIndex: number
}

const DEFAULT_ELLIPSIS = '… ';
const DEFAULT_TOLERANCE = 0;

class DomEllipser {
    private static DATA_ATTRIBUTES: {[name: string]: string} = {
        wrapper: "data-wrapper",
        original: "data-original",
        cropped: "data-cropped",
        ellipsis: "data-ellipsis",
        cache: "data-cache"
    };

    public isAlreadyProcessed = function (domE: HTMLElement): boolean {
        return !!this._getWrapperElement(domE);
    }

    public isAlreadyEllipsed(domE: HTMLElement): boolean {
        return !!domE.querySelector(`[${DomEllipser.DATA_ATTRIBUTES.ellipsis}]`);
    }

    public getOriginalText(domE: HTMLElement): string {
        let originalE = domE.querySelector(`[${DomEllipser.DATA_ATTRIBUTES.original}]`);
        return (originalE) ? originalE.textContent : null;
    }

    public getOriginalContent(domE: HTMLElement): string {
        let originalE = domE.querySelector(`[${DomEllipser.DATA_ATTRIBUTES.original}]`);
        return (originalE) ? originalE.innerHTML : null;
    }

    public ellipse(domE: HTMLElement, options: IOptions = {}): boolean {
        if(domE) {
            let wrapperE = this._getWrapperElement(domE);
            (wrapperE) || (wrapperE = this._wrapElement(domE));

            let config = this._getExistingConfig(domE, wrapperE, options);
            let previousResults: IResults = (config) ? config.results : null;

            let maxHeight = options.maxHeight || domE.clientHeight;
            let isOverflow = this._isTextOverflow(domE, maxHeight, options);

            let isNowEllipsed = false;

            if (isOverflow) {
                // Content overflows
                if (previousResults) {
                    config.maxHeight = maxHeight;
                    this._processEllipsis(config, 0, previousResults.cropIndex);
                } else {
                    config = config || this._generateConfig(domE, wrapperE, options);
                    config.maxHeight = maxHeight;
                    this._processEllipsis(config, 0, config.originalText.length);
                    isNowEllipsed = true;
                }
            } else {
                // Do something only if previous config
                if (config) {
                    // Try to put the original content
                    config.croppedE.innerHTML = config.originalE.innerHTML;
                    config.maxHeight = options.maxHeight || domE.clientHeight;

                    if (this._isTextOverflow(domE, config.maxHeight, config.options)) {
                        if (previousResults) {
                            this._processEllipsis(config, previousResults.cropIndex, config.originalText.length);
                        } else {
                            this._processEllipsis(config, 0, config.originalText.length);
                        }

                        isNowEllipsed = true;
                    }
                }
            }

            if (config) {
                this._displayEllipsis(config, isNowEllipsed);
            }

            return isNowEllipsed;
        }
    }

    private _processEllipsis(config: IConfig, startIndex: number, endIndex: number) {
        let nodeToCrop: Node;
        let originalContent: string;
        if (this._hasChildElements(config.croppedE)) {
            nodeToCrop = this._getOverflowChildNode(config);
            originalContent = nodeToCrop.textContent;
            startIndex = 0;
            endIndex = originalContent.length;
        } else {
            nodeToCrop = config.croppedE;
            originalContent = config.originalText;
        }

        let cropIndex = this._getOverflowPosition(config, startIndex, endIndex, originalContent, nodeToCrop);
        let croppedText = nodeToCrop.textContent.substring(0, cropIndex);
        nodeToCrop.textContent = croppedText;

        if (nodeToCrop === config.wrapperE) {
            this._storeCurrentResults(config.wrapperE, {
                cropIndex
            });
        }
    }

    //--------------------------
    // Wrapper
    //--------------------------
    private _getWrapperElement(domE: HTMLElement): HTMLElement {
        let children = domE.children;
        return (children.length === 1 && children[0].hasAttribute(DomEllipser.DATA_ATTRIBUTES.wrapper)) ? <HTMLElement> children[0] : null;
    }

    private _wrapElement(domE: HTMLElement): HTMLElement {
        let wrapperE = document.createElement("div");
        wrapperE.setAttribute(DomEllipser.DATA_ATTRIBUTES.wrapper, "true");
        wrapperE.setAttribute("style", "word-wrap: break-word; white-space: normal; overflow: hidden");

        for (let child = domE.firstChild; child; child = domE.firstChild) {
            child.parentNode.removeChild(child);
            wrapperE.appendChild(child);
        }

        domE.appendChild(wrapperE);

        return wrapperE;
    }

    //--------------------------
    // Config
    //--------------------------
    private _getExistingConfig(domE: HTMLElement, wrapperE: HTMLElement, options: IOptions): IConfig {
        let originalE = <HTMLElement> wrapperE.querySelector(`[${DomEllipser.DATA_ATTRIBUTES.original}]`);
        if(originalE) {
            let croppedE = <HTMLElement> wrapperE.querySelector(`[${DomEllipser.DATA_ATTRIBUTES.cropped}]`);
            let ellipsisE = <HTMLElement> wrapperE.querySelector(`[${DomEllipser.DATA_ATTRIBUTES.ellipsis}]`);

            let results = this._getCurrentResults(wrapperE);

            return {
                options,
                results,
                originalText: originalE.textContent,
                domE,
                wrapperE,
                originalE,
                croppedE,
                ellipsisE,
            };
        }
        else {
            return null;
        }
    }

    private _generateConfig(domE: HTMLElement, wrapperE: HTMLElement, options: IOptions): IConfig {
        let hasChildElements = this._hasChildElements(wrapperE);
        let originalText = hasChildElements ? wrapperE.innerHTML : wrapperE.textContent;

        var fragment = document.createDocumentFragment();

        let originalE = document.createElement("span");
        originalE.setAttribute(DomEllipser.DATA_ATTRIBUTES.original, "true");
        originalE.style.display = "none";
        fragment.appendChild(originalE);

        let croppedE = document.createElement("span");
        croppedE.setAttribute(DomEllipser.DATA_ATTRIBUTES.cropped, "true");
        croppedE.setAttribute("style", "white-space: normal;");
        fragment.appendChild(croppedE);

        let ellipsisE = document.createElement("span");
        ellipsisE.setAttribute(DomEllipser.DATA_ATTRIBUTES.ellipsis, "true");
        if (options.ellipsisHTML) {
            ellipsisE.innerHTML = options.ellipsisHTML;
        }
        else {
            ellipsisE.textContent = options.ellipsis || DEFAULT_ELLIPSIS;
        }
        fragment.appendChild(ellipsisE);

        for (let child = wrapperE.firstChild; child; child = wrapperE.firstChild) {
            child.parentNode.removeChild(child);

            if (!this._isConfigElement(child)) {
                let cropChild = child.cloneNode(true);
                originalE.appendChild(child);

                if (cropChild.nodeType === Node.TEXT_NODE) {
                    let cropChildWrapper = document.createElement('span');
                    cropChildWrapper.appendChild(cropChild);
                    croppedE.appendChild(cropChildWrapper);
                } else {
                    croppedE.appendChild(cropChild);
                }
            }
        }

        wrapperE.appendChild(fragment);

        return {
            options,
            results: null,
            originalText,
            domE,
            wrapperE,
            originalE,
            croppedE,
            ellipsisE
        };
    }

    //--------------------------
    // Results
    //--------------------------
    private _getCurrentResults(wrapperE: HTMLElement): IResults {
        let textResults = wrapperE.getAttribute(DomEllipser.DATA_ATTRIBUTES.cache);
        return (textResults) ? JSON.parse(textResults) : null;
    }

    private _storeCurrentResults(wrapperE: HTMLElement, results: IResults) {
        wrapperE.setAttribute(DomEllipser.DATA_ATTRIBUTES.cache, JSON.stringify(results));
    }


    //--------------------------
    // Overflow Position search
    //--------------------------
    private _getOverflowPosition(config: IConfig, startIndex: number, endIndex: number, originalText: string, node: Node): number {
        let startPosition = startIndex;
        let endPosition = endIndex;
        let middlePosition = -1;

        while (startPosition < endPosition) {
            let m = Math.floor((startPosition + endPosition) / 2);
            if (m === middlePosition) {
                break;
            }
            middlePosition = m;

            if (!this._testTextOverflow(config, node, originalText.substring(0, middlePosition))) {
                endPosition = middlePosition;
            } else {
                startPosition = middlePosition;
            }
        }

        return middlePosition;
    }

    private _getOverflowChildNode (config: IConfig): Node {
        let lastRemovedChild: Node, lastChild = config.croppedE.lastChild;

        while (lastChild && this._isTextOverflow(config.domE, config.maxHeight, config.options)) {
            lastChild.parentNode.removeChild(lastChild);
            lastRemovedChild = lastChild;
            lastChild = config.croppedE.lastChild;
        }

        if (lastRemovedChild) {
            config.croppedE.appendChild(lastRemovedChild);
        }

        return config.croppedE.lastChild;
    }

    private _isTextOverflow (domE: HTMLElement, maxHeight: number, options: IOptions): boolean {
        let tolerance = options.tolerance || DEFAULT_TOLERANCE;
        return domE.scrollHeight - maxHeight > tolerance;
    }

    private _testTextOverflow (config: IConfig, node: Node, textContent: string): boolean {
        node.textContent = textContent;
        return !this._isTextOverflow(config.domE, config.maxHeight, config.options);
    }

    private _hasChildElements (domE: HTMLElement) {
        for (let childNode = domE.firstChild; childNode; childNode = childNode.nextSibling) {
            if (childNode.nodeType === Node.ELEMENT_NODE && !this._isConfigElement(childNode)) { // 1 == Element
                return true;
            }
        }
    }

    private _isConfigElement (node: Node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            let elt = node as HTMLElement;
            for (let key in DomEllipser.DATA_ATTRIBUTES) {
                if (elt.hasAttribute(DomEllipser.DATA_ATTRIBUTES[key])) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Show/hide the ellipsis element.
     *
     * @param config
     * @param show
     */
    private _displayEllipsis (config: IConfig, show: boolean) {
        if (config) {
            if (show) {
                config.ellipsisE.removeAttribute('style');
            } else {
                config.ellipsisE.setAttribute('style', 'display: none');
            }
        }
    }
}

let ellipserInstance = new DomEllipser();

export = ellipserInstance;
