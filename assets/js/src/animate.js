(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof exports === "object") {
        module.exports = factory(root);
    } else {
        root.Animate = factory(root);
    }
})(typeof global !== 'undefined' ? global : this.window || this.global, function(root) {

    'use strict';

    var Animate = function(userOptions){
        var el = root.document.createElement("fakeelement");
        var defaultOptions = {
            animatedClass: 'js-animated',
            offset: 0.5,
            delay: 0,
            target: '[data-animate]',
            remove: true,
            scrolled: false,
            reverse: false,
            debug: false,
            onLoad: true,
            onScroll: true,
            onResize: false,
            callbackOnInit: function(){},
            callbackOnAnimate: function(){}
        };

        this.throttledEvent = this._debounce(function() {
            this.render();
        }.bind(this), 15);

        this.supports = 'querySelector' in root.document && 'addEventListener' in root && 'classList' in el && Function.prototype.bind;
        this.options = this._extend(defaultOptions, userOptions || {});
        this.elements = root.document.querySelectorAll(this.options.target);
        this.initialised = false;
    };

    // Returns a function, that, as long as it continues to be invoked, will not
    // be triggered. The function will be called after it stops being called for
    // N milliseconds. If `immediate` is passed, trigger the function on the
    // leading edge, instead of the trailing.
    // @private
    // @author David Walsh
    // @link https://davidwalsh.name/javascript-debounce-function
    Animate.prototype._debounce = function(func, wait, immediate) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate) {
                    func.apply(context, args);
                }
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if(callNow) {
                func.apply(context, args);
            }
        };
    };

    /**
     * Merges unspecified amount of objects into new object
     * @private
     * @return {Object} Merged object of arguments
     */
    Animate.prototype._extend = function() {
        var extended = {};
        var length = arguments.length;

        /**
         * Merge one object into another
         * @param  {Object} obj  Object to merge into extended object
         */
        var merge = function(obj) {
            for(var prop in obj) {
                extended[prop] = obj[prop];
            }
        };

        // Loop through each passed argument
        for(var i = 0; i < length; i++) {
            // Store argument at position i
            var obj = arguments[i];

            // If we are in fact dealing with an object, merge it. Otherwise throw error
            if(this._isType('Object', obj)) {
                merge(obj);
            } else {
                console.error('Custom options must be an object');
            }
        }

        return extended;
    };

    /**
     * Determines when an animation has completed
     * @author  David Walsh
     * @link https://davidwalsh.name/css-animation-callback
     * @private
     * @return {String} Appropriate 'animationEnd' event for browser to handle
     */
    Animate.prototype._whichAnimationEvent = function(){
        var t;
        var el = root.document.createElement("fakeelement");

        var animations = {
            "animation"      : "animationend",
            "OAnimation"     : "oAnimationEnd",
            "MozAnimation"   : "animationend",
            "WebkitAnimation": "webkitAnimationEnd"
        };

        for (t in animations){
            if (el.style[t] !== undefined){
                return animations[t];
            }
        }
    };

    /**
     * Get an element's distance from the top of the page
     * @private
     * @param  {HTMLElement} el Element to test for
     * @return {Number} Elements Distance from top of page
     */
    Animate.prototype._getElemDistance = function(el) {
        var location = 0;
        if (el.offsetParent) {
            do {
                location += el.offsetTop;
                el = el.offsetParent;
            } while (el);
        }
        return location >= 0 ? location : 0;
    };

    /**
     * Determine element height multiplied by any offsets
     * @private
     * @param  {HTMLElement} el Element to test for
     * @return {Number}    Height of element
     */
    Animate.prototype._getElemOffset = function(el) {
        // Get element offset override
        var elOffset = parseFloat(el.getAttribute('data-animation-offset'));

        if(!isNaN(elOffset)) {
            // If elOffset isn't between 0 and 1, round it up or down
            elOffset = Math.min(Math.max(elOffset, 0), 1);
            return Math.max(el.offsetHeight*elOffset);
        } else if(!isNaN(this.options.offset)){
            return Math.max(el.offsetHeight*this.options.offset);
        }
    };

    /**
     * Get scroll position based on top/bottom position
     * @private
     * @return {String} Position of scroll
     */
    Animate.prototype._getScrollPosition = function(position) {
        if(position === 'bottom') {
            // Scroll position from the bottom of the viewport
            return Math.max((root.scrollY || root.pageYOffset) + (root.innerHeight || root.document.documentElement.clientHeight));
        } else {
            // Scroll position from the top of the viewport
            return (root.scrollY || root.pageYOffset);
        }
    };

    /**
     * Determines whether we have already scrolled past the element
     * @param  {HTMLElement}  el Element to test
     * @return {Boolean}
     */
    Animate.prototype._isAboveScrollPos = function(el) {
        return (this._getElemDistance(el) + this._getElemOffset(el)) < (root.scrollY || root.pageYOffset);
    };

    /**
     * Determine whether an element is within the viewport
     * @param  {HTMLElement}  el Element to test for
     * @return {String} Position of scroll
     * @return {Boolean}
     */
    Animate.prototype._isInView = function(el) {
        // If the user has scrolled further than the distance from the element to the top of its parent
        var hasEntered = this._getScrollPosition('bottom') > (this._getElemDistance(el) + this._getElemOffset(el)) ? true : false;
        var hasLeft = this._getScrollPosition('top') > (this._getElemDistance(el) + this._getElemOffset(el)) ? true : false;

        return hasEntered & !hasLeft ? true : false;
    };

    /**
     * Tests whether a DOM node's visibility attribute is set to true
     * @private
     * @param  {HTMLElement}  el Element to test
     * @return {Boolean}
     */
    Animate.prototype._isVisible = function(el){
        var visibility = el.getAttribute('data-visibility');
        return true ? visibility === 'true' : '';
    };

    /**
     * Tests whether a DOM node has already been animated
     * @private
     * @param  {HTMLElement}  el Element to test
     * @return {Boolean}
     */
    Animate.prototype._hasAnimated = function(el){
        var animated = el.getAttribute('data-animated');
        return true ? animated === 'true' : '';
    };

    /**
     * Test whether an object is of a give type
     * @private
     * @param  {String}  type Type to test for e.g. 'String', 'Array'
     * @param  {Object}  obj  Object to test type against
     * @return {Boolean}      Whether object is of a type
     */
    Animate.prototype._isType = function(type, obj) {
        var test = Object.prototype.toString.call(obj).slice(8,-1);
        return obj !== null && obj !== undefined && test === type;
    };

    /**
     * Add animation to given element
     * @private
     * @param {HTMLElement} el Element to target
     */
    Animate.prototype._addAnimation = function(el){
        if(!this._isVisible(el)){
            var classes = el.getAttribute('data-animation-classes');
            if(classes) {
                el.setAttribute('data-visibility', true);
                var animations = classes.split(' ');
                var animationDelay = parseInt(el.getAttribute('data-animation-delay'), 10) || this.options.delay;

                if(animationDelay && this._isType('Number', animationDelay) && animationDelay !== 0) {
                    setTimeout(function() {
                        if(this.options.debug && root.console.debug) console.debug('Animation added');
                        animations.forEach(function(animation) {
                            el.classList.add(animation);
                        });
                    }.bind(this), animationDelay);
                } else {
                    if(this.options.debug && root.console.debug) console.debug('Animation added');
                    animations.forEach(function(animation){
                       el.classList.add(animation);
                    });
                }

                this._completeAnimation(el);
            } else {
                console.error('No animation classes were given');
            }
        }
    };

    /**
     * Remove animation from given element
     * @private
     * @param {HTMLElement} el Element to target
     */
    Animate.prototype._removeAnimation = function(el){
        var classes = el.getAttribute('data-animation-classes');

        if(classes) {
            el.setAttribute('data-visibility', false);
            el.removeAttribute('data-animated');
            var animations = classes.split(' ');
            var animationDelay = parseInt(el.getAttribute('data-animation-delay'), 10);
            animations.push(this.options.animatedClass);

            if(animationDelay && this._isType('Number', animationDelay)) {
                setTimeout(function() {
                    if(this.options.debug && root.console.debug) console.debug('Animation removed');
                    animations.forEach(function(animation) {
                        el.classList.remove(animation);
                    });
                }.bind(this), animationDelay);
            } else {
                if(this.options.debug && root.console.debug) console.debug('Animation removed');
                animations.forEach(function(animation){
                   el.classList.remove(animation);
                });
            }
        } else {
            console.error('No animation classes were given');
        }
    };

    /**
     * Add class & data attribute to element on animation completion
     * @private
     * @param  {HTMLElement} el Element to target
     */
    Animate.prototype._completeAnimation = function(el){
        // Store animation event
        var animationEvent = this._whichAnimationEvent();

        // When animation event has finished
        el.addEventListener(animationEvent, function() {
            if(this.options.debug && root.console.debug) console.debug('Animation completed');

            var removeOveride = el.getAttribute('data-animation-remove');

            // If remove animations on completon option is turned on
            if(removeOveride !== 'false' && this.options.remove) {
                // Seperate each class held in the animation classes attribute
                var animations = el.getAttribute('data-animation-classes').split(' ');

                // Remove each animation from element
                animations.forEach(function(animation) {
                    el.classList.remove(animation);
                });
            }

            // Add animtion complete class
            el.classList.add(this.options.animatedClass);
            // Set animated attribute to true
            el.setAttribute('data-animated', true);

            // If valid callback has been passed, run it with the element as a parameter
            if(this.options.callbackOnAnimate && this._isType('Function', this.options.callbackOnAnimate)) {
                this.options.callbackOnAnimate(el);
            } else {
                console.error('Callback is not a function');
            }

        }.bind(this));
    };

    Animate.prototype.removeEventListeners = function() {
        if(this.options.onResize) {
            root.removeEventListener('resize', this.throttledEvent, false);
        }

        if(this.options.onScroll) {
            root.removeEventListener('scroll', this.throttledEvent, false);
        }
    };

    /**
     * Trigger event listeners
     */
    Animate.prototype.addEventListeners = function() {
        if(this.options.onLoad) {
            root.document.addEventListener('DOMContentLoaded', function(){
                this.render();
            }.bind(this));
        }

        if(this.options.onResize) {
            root.addEventListener('resize', this.throttledEvent, false);
        }

        if(this.options.onScroll) {
            root.addEventListener('scroll', this.throttledEvent, false);
        }
    };

    /**
     * Initalises event listeners
     * @public
     */
    Animate.prototype.init = function(){
        if(this.options.debug && root.console.debug) {
            console.debug('Animate.js successfully initialised. Found ' + this.elements.length + ' elements to animate');
        }

        // If browser doesn't cut the mustard, let it fail silently
        if(!this.supports) return;

        this.initialised = true;

        this.addEventListeners();

        // If valid callback has been passed, run it with the element as a parameter
        if(this.options.callbackOnInit && this._isType('Function', this.options.callbackOnInit)) {
            this.options.callbackOnInit();
        } else {
            console.error('Callback is not a function');
        }
        
    };

    /**
     * Stop all running event listeners & resets options to null
     * @public
     */
    Animate.prototype.kill = function(){
        if(this.options.debug && root.console.debug) console.debug('Animation.js nuked');

        // If we haven't initialised, there is nothing to kill.
        if (!this.initialised) return;

        this.removeEventListeners();

        // Reset settings
        this.options = null;
        this.initialised = false;
    };

    /**
     * Toggles animations on an event
     * @public
     * @return {}
     */
    Animate.prototype.render = function(){
        // Grab all elements in the DOM with the correct target
        var els = this.elements;

        // Loop through all elements
        for (var i = els.length - 1; i >= 0; i--) {
            // Store element at location 'i'
            var el = els[i];
            // See whether it has a reverse override
            var reverseOveride = el.getAttribute('data-animation-reverse');
            var animateScrolled = el.getAttribute('data-animation-scrolled');

            // If element is in view
            if(this._isInView(el)) {
                // Add those snazzy animations
                this._addAnimation(el);
            } else if(this._hasAnimated(el)) {
                if(reverseOveride !== 'false' && this.options.reverse) {
                    this._removeAnimation(el);
                }
            } else if(this._isAboveScrollPos(el) && (this.options.scrolled || animateScrolled)) {
                 this._addAnimation(el);
            }
        }
    };

    return Animate;
});
