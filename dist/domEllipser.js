/*!
 * @license domEllipser v1.0.0
 * https://github.com/paztis/domEllipser
 * 
 * Copyright (c) 2017 Jerome HENAFF <jerome.henaff@gmail.com>
 * Licensed under the MIT license
 */
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.DomEllipser = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
var DEFAULT_ELLIPSIS = '… ';
var DEFAULT_TOLERANCE = 0;
var DomEllipser = (function () {
    function DomEllipser() {
        this.isAlreadyProcessed = function (domE) {
            return !!this._getWrapperElement(domE);
        };
    }
    DomEllipser.prototype.isAlreadyEllipsed = function (domE) {
        return !!domE.querySelector("[" + DomEllipser.DATA_ATTRIBUTES.ellipsis + "]");
    };
    DomEllipser.prototype.getOriginalText = function (domE) {
        var originalE = domE.querySelector("[" + DomEllipser.DATA_ATTRIBUTES.original + "]");
        return (originalE) ? originalE.textContent : null;
    };
    DomEllipser.prototype.getOriginalContent = function (domE) {
        var originalE = domE.querySelector("[" + DomEllipser.DATA_ATTRIBUTES.original + "]");
        return (originalE) ? originalE.innerHTML : null;
    };
    DomEllipser.prototype.ellipse = function (domE, options) {
        if (options === void 0) { options = {}; }
        if (domE) {
            var wrapperE = this._getWrapperElement(domE);
            (wrapperE) || (wrapperE = this._wrapElement(domE));
            var config = this._getExistingConfig(domE, wrapperE, options);
            var previousResults = (config) ? config.results : null;
            var maxHeight = options.maxHeight || domE.clientHeight;
            var isOverflow = this._isTextOverflow(domE, maxHeight, options);
            var isNowEllipsed = false;
            if (isOverflow) {
                // Content overflows
                if (previousResults) {
                    config.maxHeight = maxHeight;
                    this._processEllipsis(config, 0, previousResults.cropIndex);
                }
                else {
                    config = config || this._generateConfig(domE, wrapperE, options);
                    config.maxHeight = maxHeight;
                    this._processEllipsis(config, 0, config.originalText.length);
                    isNowEllipsed = true;
                }
            }
            else {
                // Do something only if previous config
                if (config) {
                    // Try to put the original content
                    config.croppedE.innerHTML = config.originalE.innerHTML;
                    config.maxHeight = options.maxHeight || domE.clientHeight;
                    if (this._isTextOverflow(domE, config.maxHeight, config.options)) {
                        if (previousResults) {
                            this._processEllipsis(config, previousResults.cropIndex, config.originalText.length);
                        }
                        else {
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
    };
    DomEllipser.prototype._processEllipsis = function (config, startIndex, endIndex) {
        var nodeToCrop;
        var originalContent;
        if (this._hasChildElements(config.croppedE)) {
            nodeToCrop = this._getOverflowChildNode(config);
            originalContent = nodeToCrop.textContent;
            startIndex = 0;
            endIndex = originalContent.length;
        }
        else {
            nodeToCrop = config.croppedE;
            originalContent = config.originalText;
        }
        var cropIndex = this._getOverflowPosition(config, startIndex, endIndex, originalContent, nodeToCrop);
        var croppedText = nodeToCrop.textContent.substring(0, cropIndex);
        nodeToCrop.textContent = croppedText;
        if (nodeToCrop === config.wrapperE) {
            this._storeCurrentResults(config.wrapperE, {
                cropIndex: cropIndex
            });
        }
    };
    //--------------------------
    // Wrapper
    //--------------------------
    DomEllipser.prototype._getWrapperElement = function (domE) {
        var children = domE.children;
        return (children.length === 1 && children[0].hasAttribute(DomEllipser.DATA_ATTRIBUTES.wrapper)) ? children[0] : null;
    };
    DomEllipser.prototype._wrapElement = function (domE) {
        var wrapperE = document.createElement("div");
        wrapperE.setAttribute(DomEllipser.DATA_ATTRIBUTES.wrapper, "true");
        wrapperE.setAttribute("style", "word-wrap: break-word; white-space: normal; overflow: hidden");
        for (var child = domE.firstChild; child; child = domE.firstChild) {
            child.parentNode.removeChild(child);
            wrapperE.appendChild(child);
        }
        domE.appendChild(wrapperE);
        return wrapperE;
    };
    //--------------------------
    // Config
    //--------------------------
    DomEllipser.prototype._getExistingConfig = function (domE, wrapperE, options) {
        var originalE = wrapperE.querySelector("[" + DomEllipser.DATA_ATTRIBUTES.original + "]");
        if (originalE) {
            var croppedE = wrapperE.querySelector("[" + DomEllipser.DATA_ATTRIBUTES.cropped + "]");
            var ellipsisE = wrapperE.querySelector("[" + DomEllipser.DATA_ATTRIBUTES.ellipsis + "]");
            var results = this._getCurrentResults(wrapperE);
            return {
                options: options,
                results: results,
                originalText: originalE.textContent,
                domE: domE,
                wrapperE: wrapperE,
                originalE: originalE,
                croppedE: croppedE,
                ellipsisE: ellipsisE,
            };
        }
        else {
            return null;
        }
    };
    DomEllipser.prototype._generateConfig = function (domE, wrapperE, options) {
        var hasChildElements = this._hasChildElements(wrapperE);
        var originalText = hasChildElements ? wrapperE.innerHTML : wrapperE.textContent;
        var fragment = document.createDocumentFragment();
        var originalE = document.createElement("span");
        originalE.setAttribute(DomEllipser.DATA_ATTRIBUTES.original, "true");
        originalE.style.display = "none";
        fragment.appendChild(originalE);
        var croppedE = document.createElement("span");
        croppedE.setAttribute(DomEllipser.DATA_ATTRIBUTES.cropped, "true");
        croppedE.setAttribute("style", "white-space: normal;");
        fragment.appendChild(croppedE);
        var ellipsisE = document.createElement("span");
        ellipsisE.setAttribute(DomEllipser.DATA_ATTRIBUTES.ellipsis, "true");
        if (options.ellipsisHTML) {
            ellipsisE.innerHTML = options.ellipsisHTML;
        }
        else {
            ellipsisE.textContent = options.ellipsis || DEFAULT_ELLIPSIS;
        }
        fragment.appendChild(ellipsisE);
        for (var child = wrapperE.firstChild; child; child = wrapperE.firstChild) {
            child.parentNode.removeChild(child);
            if (!this._isConfigElement(child)) {
                var cropChild = child.cloneNode(true);
                originalE.appendChild(child);
                if (cropChild.nodeType === Node.TEXT_NODE) {
                    var cropChildWrapper = document.createElement('span');
                    cropChildWrapper.appendChild(cropChild);
                    croppedE.appendChild(cropChildWrapper);
                }
                else {
                    croppedE.appendChild(cropChild);
                }
            }
        }
        wrapperE.appendChild(fragment);
        return {
            options: options,
            results: null,
            originalText: originalText,
            domE: domE,
            wrapperE: wrapperE,
            originalE: originalE,
            croppedE: croppedE,
            ellipsisE: ellipsisE
        };
    };
    //--------------------------
    // Results
    //--------------------------
    DomEllipser.prototype._getCurrentResults = function (wrapperE) {
        var textResults = wrapperE.getAttribute(DomEllipser.DATA_ATTRIBUTES.cache);
        return (textResults) ? JSON.parse(textResults) : null;
    };
    DomEllipser.prototype._storeCurrentResults = function (wrapperE, results) {
        wrapperE.setAttribute(DomEllipser.DATA_ATTRIBUTES.cache, JSON.stringify(results));
    };
    //--------------------------
    // Overflow Position search
    //--------------------------
    DomEllipser.prototype._getOverflowPosition = function (config, startIndex, endIndex, originalText, node) {
        var startPosition = startIndex;
        var endPosition = endIndex;
        var middlePosition = -1;
        while (startPosition < endPosition) {
            var m = Math.floor((startPosition + endPosition) / 2);
            if (m === middlePosition) {
                break;
            }
            middlePosition = m;
            if (!this._testTextOverflow(config, node, originalText.substring(0, middlePosition))) {
                endPosition = middlePosition;
            }
            else {
                startPosition = middlePosition;
            }
        }
        return middlePosition;
    };
    DomEllipser.prototype._getOverflowChildNode = function (config) {
        var lastRemovedChild, lastChild = config.croppedE.lastChild;
        while (lastChild && this._isTextOverflow(config.domE, config.maxHeight, config.options)) {
            lastChild.parentNode.removeChild(lastChild);
            lastRemovedChild = lastChild;
            lastChild = config.croppedE.lastChild;
        }
        if (lastRemovedChild) {
            config.croppedE.appendChild(lastRemovedChild);
        }
        return config.croppedE.lastChild;
    };
    DomEllipser.prototype._isTextOverflow = function (domE, maxHeight, options) {
        var tolerance = options.tolerance || DEFAULT_TOLERANCE;
        return domE.scrollHeight - maxHeight > tolerance;
    };
    DomEllipser.prototype._testTextOverflow = function (config, node, textContent) {
        node.textContent = textContent;
        return !this._isTextOverflow(config.domE, config.maxHeight, config.options);
    };
    DomEllipser.prototype._hasChildElements = function (domE) {
        for (var childNode = domE.firstChild; childNode; childNode = childNode.nextSibling) {
            if (childNode.nodeType === Node.ELEMENT_NODE && !this._isConfigElement(childNode)) {
                return true;
            }
        }
    };
    DomEllipser.prototype._isConfigElement = function (node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            var elt = node;
            for (var key in DomEllipser.DATA_ATTRIBUTES) {
                if (elt.hasAttribute(DomEllipser.DATA_ATTRIBUTES[key])) {
                    return true;
                }
            }
        }
        return false;
    };
    /**
     * Show/hide the ellipsis element.
     *
     * @param config
     * @param show
     */
    DomEllipser.prototype._displayEllipsis = function (config, show) {
        if (config) {
            if (show) {
                config.ellipsisE.removeAttribute('style');
            }
            else {
                config.ellipsisE.setAttribute('style', 'display: none');
            }
        }
    };
    return DomEllipser;
}());
DomEllipser.DATA_ATTRIBUTES = {
    wrapper: "data-wrapper",
    original: "data-original",
    cropped: "data-cropped",
    ellipsis: "data-ellipsis",
    cache: "data-cache"
};
var ellipserInstance = new DomEllipser();
module.exports = ellipserInstance;

},{}]},{},[1])(1)
});