
interface IOptions {
    ellipsis?: string,
    ellipsisHTML?: string,
    maxHeight?: number
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

class DomEllipser {
    private static DATA_ATTRIBUTES = {
        wrapper: "data-wrapper",
        original: "data-original",
        cropped: "data-cropped",
        ellipsis: "data-ellipsis",
        cache: "data-cache"
    }
    
    public isAlreadyProcessed = function (domE: HTMLElement): boolean {
        return !!this._getWrapperElement(domE);
    }

    public isAlreadyEllipsed(domE: HTMLElement): boolean {
        return !!domE.querySelector(`[${DomEllipser.DATA_ATTRIBUTES.ellipsis}]`);
    }

    public getOriginalContent(domE: HTMLElement): string {
        let originalE = domE.querySelector(`[${DomEllipser.DATA_ATTRIBUTES.original}]`);
        return (originalE) ? originalE.textContent : null;
    }

    public ellipse(domE: HTMLElement, options: IOptions = {}): boolean {
        if(domE) {
            let wrapperE = this._getWrapperElement(domE);
            (wrapperE) || (wrapperE = this._wrapElement(domE));

            let config = this._getExistingConfig(domE, wrapperE, options);
            let previousResults: IResults = (config) ? config.results : null;

            let maxHeight = options.maxHeight || domE.clientHeight;
            let isTextOverflow = this._isTextOverflow(domE, maxHeight);

            let isNowEllipsed = false;
            if(previousResults) {
                if(isTextOverflow) {
                    config.maxHeight = maxHeight;
                    this._processEllipsis(config, 0, previousResults.cropIndex);
                }
                else {
                    config.croppedE.textContent = config.originalText;
                    config.maxHeight = options.maxHeight || domE.clientHeight;
                    
                    this._processEllipsis(config, previousResults.cropIndex, config.originalText.length);
                }
                isNowEllipsed = true;
            }
            else if(isTextOverflow) {
                config = this._generateConfig(domE, wrapperE, options);
                config.maxHeight = maxHeight;
                this._processEllipsis(config, 0, config.originalText.length);
                isNowEllipsed = true;
            }

            return isNowEllipsed;
        } 
    }

    private _processEllipsis(config: IConfig, startIndex: number, endIndex: number) {
        let cropIndex = this._getOverflowPosition(config, startIndex, endIndex);
        let croppedText = config.originalText.substring(0, cropIndex);
        config.croppedE.textContent = croppedText;
        
        this._storeCurrentResults(config.wrapperE, {
            cropIndex
        });
    }

    //--------------------------
    // Wrapper
    //--------------------------
    private _getWrapperElement(domE: HTMLElement): HTMLElement {
        let children = domE.children;
        return (children.length === 1 && children[0].hasAttribute(DomEllipser.DATA_ATTRIBUTES.wrapper)) ? <HTMLElement> children[0] : null;
    }
    
    private _wrapElement(domE: HTMLElement): HTMLElement {
        let originalText = domE.textContent;
        domE.textContent = "";

        let wrapperE = document.createElement("div");
        wrapperE.setAttribute(DomEllipser.DATA_ATTRIBUTES.wrapper, "true");
        wrapperE.setAttribute("style", "word-break: break-word; white-space: normal; overflow: hidden");
        wrapperE.textContent = originalText;
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
        let originalText = wrapperE.textContent;
        wrapperE.textContent = "";

        let originalE = document.createElement("span");
        originalE.setAttribute(DomEllipser.DATA_ATTRIBUTES.original, "true");
        originalE.style.display = "none";
        originalE.textContent = originalText;
        wrapperE.appendChild(originalE);
        
        let croppedE = document.createElement("span");
        croppedE.setAttribute(DomEllipser.DATA_ATTRIBUTES.cropped, "true");
        croppedE.textContent = originalText;
        wrapperE.appendChild(croppedE);
        
        let ellipsisE = document.createElement("span");
        ellipsisE.setAttribute(DomEllipser.DATA_ATTRIBUTES.ellipsis, "true");
        if(options.ellipsisHTML) {
            ellipsisE.innerHTML = options.ellipsisHTML;
        }
        else {
            ellipsisE.textContent = options.ellipsis || '...';
        }
        wrapperE.appendChild(ellipsisE);

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
    private _getOverflowPosition(config: IConfig, startIndex: number, endIndex: number): number {
        let startPosition = startIndex;
        let endPosition = endIndex;
        let middlePosition = -1;

        while(startPosition < endPosition) {
            let m = Math.floor((startPosition + endPosition) / 2);
            if (m == middlePosition) {
                break;
            }
            middlePosition = m;

            if (!this._testTextOverflow(config, config.originalText.substring(0, middlePosition))) {
                endPosition = middlePosition;
            } else {
                startPosition = middlePosition;
            }
        }

        return middlePosition;
    }

    private _isTextOverflow (domE: HTMLElement, maxHeight: number): boolean {
        return (domE.scrollHeight > maxHeight);
    }

    private _testTextOverflow (config: IConfig, textContent: string): boolean {
        config.croppedE.textContent = textContent;
        return !this._isTextOverflow(config.domE, config.maxHeight);
    }
}

let ellipserInstance = new DomEllipser();

export = ellipserInstance;
