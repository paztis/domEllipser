/*! domEllipser - v1.0.0
 * 
 * Copyright (c) 2014 Jérôme HENAFF <jerome.henaff@gmail.com>;
 **/


interface IOptions {
    ellipsis?: string,
    ellipsisHTML?: string,
    maxHeight?: number
}

interface IConfig {
    options: IOptions,

    originalText: string,
    domE: HTMLElement,
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
        original: "data-original",
        cropped: "data-cropped",
        ellipsis: "data-ellipsis",
        cache: "data-cache"
    }

    public isEllipsed(domE: HTMLElement): boolean {
        return !!this._getOriginalElement(domE);
    }

    public ellipse(domE: HTMLElement, options: IOptions = {}): boolean {
        if(domE) {
            let config = this._getExistingConfig(domE, options);
            let previousResults: IResults;
            if(!config) {
                //Force word break
                domE.style.wordBreak = "break-word";
                domE.style.whiteSpace = "normal";
                domE.style.overflow = "hidden";
            }
            else {
                previousResults = this._getPreviousResults(config);
            }

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
                config = this._generateConfig(domE, options);
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
        
        this._storeCurrentResults(config, {
            cropIndex
        });
    }

    private _getOriginalElement(domE: HTMLElement): HTMLElement {
        return <HTMLElement> domE.querySelector(`[${DomEllipser.DATA_ATTRIBUTES.original}]`);
    }

    private _getExistingConfig(domE: HTMLElement, options: IOptions): IConfig {
        let originalE = this._getOriginalElement(domE);
        if(originalE) {
            let croppedE = <HTMLElement> domE.querySelector(`[${DomEllipser.DATA_ATTRIBUTES.cropped}]`);
            let ellipsisE = <HTMLElement> domE.querySelector(`[${DomEllipser.DATA_ATTRIBUTES.ellipsis}]`);
            return {
                options,
                originalText: originalE.textContent,
                domE,
                originalE,
                croppedE,
                ellipsisE
            };
        }
        else {
            return null;
        }
    }

    private _generateConfig(domE: HTMLElement, options: IOptions): IConfig {
        let originalText = domE.textContent;
        domE.textContent = "";

        let originalE = document.createElement("span");
        originalE.setAttribute(DomEllipser.DATA_ATTRIBUTES.original, "true");
        originalE.style.display = "none";
        originalE.textContent = originalText;
        domE.appendChild(originalE);
        
        let croppedE = document.createElement("span");
        croppedE.setAttribute(DomEllipser.DATA_ATTRIBUTES.cropped, "true");
        croppedE.textContent = originalText;
        domE.appendChild(croppedE);
        
        let ellipsisE = document.createElement("span");
        ellipsisE.setAttribute(DomEllipser.DATA_ATTRIBUTES.ellipsis, "true");
        if(options.ellipsisHTML) {
            ellipsisE.innerHTML = options.ellipsisHTML;
        }
        else {
            ellipsisE.textContent = options.ellipsis || '...';
        }
        domE.appendChild(ellipsisE);

        return {
            options,
            originalText,
            domE,
            originalE,
            croppedE,
            ellipsisE
        };
    }

    private _storeCurrentResults(config: IConfig, results: IResults) {
        config.originalE.setAttribute(DomEllipser.DATA_ATTRIBUTES.cache, JSON.stringify(results));
    }

    private _getPreviousResults(config: IConfig): IResults {
        let textResults = config.originalE.getAttribute(DomEllipser.DATA_ATTRIBUTES.cache);
        return (textResults) ? JSON.parse(textResults) : null;
    }

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

export {ellipserInstance as DomEllipser};
