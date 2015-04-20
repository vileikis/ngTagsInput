/*!
 * ngTagsInput v2.0.1
 * http://mbenford.github.io/ngTagsInput
 *
 * Copyright (c) 2013-2014 Michael Benford
 * License: MIT
 *
 * Generated at 2014-04-13 21:25:38 -0300
 */
(function() {
    'use strict';

    var KEYS = {
        backspace: 8,
        tab: 9,
        enter: 13,
        escape: 27,
        space: 32,
        up: 38,
        down: 40,
        comma: 188
    };

    function SimplePubSub() {
        var events = {};
        return {
            on: function(names, handler) {
                names.split(' ').forEach(function(name) {
                    if (!events[name]) {
                        events[name] = [];
                    }
                    events[name].push(handler);
                });
                return this;
            },
            trigger: function(name, args) {
                angular.forEach(events[name], function(handler) {
                    handler.call(null, args);
                });
                return this;
            }
        };
    }

    function makeObjectArray(array, key) {
        array = array || [];
        if (array.length > 0 && !angular.isObject(array[0])) {
            array.forEach(function(item, index) {
                array[index] = {};
                array[index][key] = item;
            });
        }
        return array;
    }

    function findInObjectArray(array, obj, key) {
        var item = null;
        for (var i = 0; i < array.length; i++) {
            // I'm aware of the internationalization issues regarding toLowerCase()
            // but I couldn't come up with a better solution right now
            if (array[i][key].toLowerCase() === obj[key].toLowerCase()) {
                item = array[i];
                break;
            }
        }
        return item;
    }

    function replaceAll(str, substr, newSubstr) {
        var expression = substr.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
        return str.replace(new RegExp(expression, 'gi'), newSubstr);
    }

    var tagsInput = angular.module('ngTagsInput', []);

    /**
     * @ngdoc directive
     * @name tagsInput
     * @module ngTagsInput
     *
     * @description
     * Renders an input box with tag editing support.
     *
     * @param {string} ngModel Assignable angular expression to data-bind to.
     * @param {string=} [displayProperty=text] Property to be rendered as the tag label.
     * @param {number=} tabindex Tab order of the control.
     * @param {string=} [placeholder=Add a tag] Placeholder text for the control.
     * @param {number=} [minLength=3] Minimum length for a new tag.
     * @param {number=} maxLength Maximum length allowed for a new tag.
     * @param {number=} minTags Sets minTags validation error key if the number of tags added is less than minTags.
     * @param {number=} maxTags Sets maxTags validation error key if the number of tags added is greater than maxTags.
     * @param {boolean=} [allowLeftoverText=false] Sets leftoverText validation error key if there is any leftover text in
     *                                             the input element when the directive loses focus.
     * @param {string=} [removeTagSymbol=×] Symbol character for the remove tag button.
     * @param {boolean=} [addOnEnter=true] Flag indicating that a new tag will be added on pressing the ENTER key.
     * @param {boolean=} [addOnSpace=false] Flag indicating that a new tag will be added on pressing the SPACE key.
     * @param {boolean=} [addOnComma=true] Flag indicating that a new tag will be added on pressing the COMMA key.
     * @param {boolean=} [addOnBlur=true] Flag indicating that a new tag will be added when the input field loses focus.
     * @param {boolean=} [replaceSpacesWithDashes=true] Flag indicating that spaces will be replaced with dashes.
     * @param {string=} [allowedTagsPattern=.+] Regular expression that determines whether a new tag is valid.
     * @param {boolean=} [enableEditingLastTag=false] Flag indicating that the last tag will be moved back into
     *                                                the new tag input box instead of being removed when the backspace key
     *                                                is pressed and the input box is empty.
     * @param {boolean=} [addFromAutocompleteOnly=false] Flag indicating that only tags coming from the autocomplete list will be allowed.
     *                                                   When this flag is true, addOnEnter, addOnComma, addOnSpace, addOnBlur and
     *                                                   allowLeftoverText values are ignored.
     * @param {expression} onTagAdded Expression to evaluate upon adding a new tag. The new tag is available as $tag.
     * @param {expression} onTagRemoved Expression to evaluate upon removing an existing tag. The removed tag is available as $tag.
     */
    tagsInput.directive('tagsInput', ["$timeout","$document","tagsInputConfig", function($timeout, $document, tagsInputConfig) {
        function TagList(options, events) {
            var self = {}, getTagText, setTagText, tagIsValid;

            getTagText = function(tag) {
                return tag[options.displayProperty];
            };

            setTagText = function(tag, text) {
                tag[options.displayProperty] = text;
            };

            tagIsValid = function(tag) {
                var tagText = getTagText(tag);

                return tagText.length >= options.minLength &&
                    tagText.length <= (options.maxLength || tagText.length) &&
                    options.allowedTagsPattern.test(tagText) &&
                    !findInObjectArray(self.items, tag, options.displayProperty);
            };

            self.items = [];

            self.addText = function(text) {
                var tag = {};
                setTagText(tag, text);
                return self.add(tag);
            };
            // TODO there is no need to return tags
            self.add = function(tags) {

                var tagText = getTagText(tags).trim();

                if (options.replaceSpacesWithDashes) {
                    tagText = tagText.replace(/\s/g, '-');
                }

                var tempTagList = tagText.split(",");
                angular.forEach(tempTagList, function (item) {
                    var tag = {};

                    item = item.trim();

                    setTagText(tag, item);

                    if (tagIsValid(tag)) {
                        self.items.push(tag);
                        events.trigger('tag-added', { $tag: tag });
                    }
                    else {
                        events.trigger('invalid-tag', { $tag: tag });
                    }
                });

                return tags;
            };

            self.remove = function(index) {
                var tag = self.items[index],
                    hasPreRemoved = events.trigger('tag-pre-removed',
                        {
                            $tag: tag,
                            onConfirm: function () {
                                removeTag(index, tag);
                            }
                        });

                if (!hasPreRemoved) {
                    removeTag(index, tag);
                }

                return tag;
            };

            function removeTag(index, tag) {
                self.items.splice(index, 1)[0];
                events.trigger('tag-removed', { $tag: tag });
            }

            self.removeLast = function() {
                var tag, lastTagIndex = self.items.length - 1;

                if (options.enableEditingLastTag || self.selected) {
                    self.selected = null;
                    tag = self.remove(lastTagIndex);
                }
                else if (!self.selected) {
                    self.selected = self.items[lastTagIndex];
                }

                return tag;
            };

            return self;
        }

        return {
            restrict: 'AE',
            require: 'ngModel',
            scope: {
                tags: '=ngModel',
                onTagAdded: '&',
                onTagPreRemoved: '&',
                onTagRemoved: '&'
            },
            replace: false,
            transclude: true,
            templateUrl: 'ngTagsInput/tags-input.html',
            controller: ["$scope","$attrs","$element", function($scope, $attrs, $element) {
                tagsInputConfig.load('tagsInput', $scope, $attrs, {
                    placeholder: [String, 'Add a tag'],
                    tabindex: [Number],
                    removeTagSymbol: [String, String.fromCharCode(215)],
                    replaceSpacesWithDashes: [Boolean, true],
                    minLength: [Number, 3],
                    maxLength: [Number],
                    addOnEnter: [Boolean, true],
                    addOnSpace: [Boolean, false],
                    addOnComma: [Boolean, true],
                    addOnBlur: [Boolean, true],
                    allowedTagsPattern: [RegExp, /.+/],
                    enableEditingLastTag: [Boolean, false],
                    minTags: [Number],
                    maxTags: [Number],
                    displayProperty: [String, 'text'],
                    allowLeftoverText: [Boolean, false],
                    addFromAutocompleteOnly: [Boolean, false],
                    enableBackspaceRemove: [Boolean, true]
                });

                $scope.events = new SimplePubSub();
                $scope.tagList = new TagList($scope.options, $scope.events);

                this.registerAutocomplete = function() {
                    var input = $element.find('input');
                    input.on('keydown', function(e) {
                        $scope.events.trigger('input-keydown', e);
                    });

                    return {
                        addTag: function(tag) {
                            return $scope.tagList.add(tag);
                        },
                        focusInput: function() {
                            input[0].focus();
                        },
                        getTags: function() {
                            return $scope.tags;
                        },
                        getOptions: function() {
                            return $scope.options;
                        },
                        on: function(name, handler) {
                            $scope.events.on(name, handler);
                            return this;
                        }
                    };
                };
            }],
            link: function(scope, element, attrs, ngModelCtrl) {
                var hotkeys = [KEYS.enter, KEYS.comma, KEYS.space, KEYS.backspace],
                    tagList = scope.tagList,
                    events = scope.events,
                    options = scope.options,
                    input = element.find('input');

                events
                    .on('tag-added', scope.onTagAdded)
                    .on ('tag-pre-removed', function (opt) {
                    if (scope.onTagRemoved) {
                        scope.onTagPreRemoved({opt: opt});
                    } else {
                        opt.onConfirm();
                    }
                })
                    .on('tag-removed', scope.onTagRemoved)
                    .on('tag-added', function() {
                        scope.newTag.text = '';
                    })
                    .on('tag-added tag-removed', function() {
                        ngModelCtrl.$setViewValue(scope.tags);
                    })
                    .on('invalid-tag', function() {
                        scope.newTag.invalid = true;
                    })
                    .on('input-change', function() {
                        tagList.selected = null;
                        scope.newTag.invalid = null;
                    })
                    .on('input-focus', function() {
                        ngModelCtrl.$setValidity('leftoverText', true);
                    })
                    .on('input-blur', function() {
                        if (!options.addFromAutocompleteOnly) {
                            if (options.addOnBlur) {
                                tagList.addText(scope.newTag.text);
                            }

                            ngModelCtrl.$setValidity('leftoverText', options.allowLeftoverText ? true : !scope.newTag.text);
                        }
                    });

                scope.newTag = { text: '', invalid: null };

                scope.getDisplayText = function(tag) {
                    return tag[options.displayProperty].trim();
                };

                scope.track = function(tag) {
                    return tag[options.displayProperty];
                };

                scope.newTagChange = function() {
                    events.trigger('input-change', scope.newTag.text);
                };

                scope.$watch('tags', function(value) {
                    scope.tags = makeObjectArray(value, options.displayProperty);
                    tagList.items = scope.tags;
                });

                scope.$watch('tags.length', function(value) {
                    ngModelCtrl.$setValidity('maxTags', angular.isUndefined(options.maxTags) || value <= options.maxTags);
                    ngModelCtrl.$setValidity('minTags', angular.isUndefined(options.minTags) || value >= options.minTags);
                });

                input
                    .on('keydown', function(e) {
                        // This hack is needed because jqLite doesn't implement stopImmediatePropagation properly.
                        // I've sent a PR to Angular addressing this issue and hopefully it'll be fixed soon.
                        // https://github.com/angular/angular.js/pull/4833
                        if (e.isImmediatePropagationStopped && e.isImmediatePropagationStopped()) {
                            return;
                        }

                        var key = e.keyCode,
                            isModifier = e.shiftKey || e.altKey || e.ctrlKey || e.metaKey,
                            addKeys = {},
                            shouldAdd, shouldRemove;

                        if (isModifier || hotkeys.indexOf(key) === -1) {
                            return;
                        }

                        addKeys[KEYS.enter] = options.addOnEnter;
                        addKeys[KEYS.comma] = options.addOnComma;
                        addKeys[KEYS.space] = options.addOnSpace;

                        shouldAdd = !options.addFromAutocompleteOnly && addKeys[key];
                        shouldRemove = !shouldAdd && key === KEYS.backspace && scope.newTag.text.length === 0;

                        if (shouldAdd) {
                            tagList.addText(scope.newTag.text);

                            scope.$apply();
                            e.preventDefault();
                        }
                        else if (shouldRemove) {

                            if (key === KEYS.backspace && !options.enableBackspaceRemove) {
                                return;
                            }

                            var tag = tagList.removeLast();
                            if (tag && options.enableEditingLastTag) {
                                scope.newTag.text = tag[options.displayProperty];
                            }

                            scope.$apply();
                            e.preventDefault();

                        }
                    })
                    .on('focus', function() {
                        if (scope.hasFocus) {
                            return;
                        }
                        scope.hasFocus = true;
                        events.trigger('input-focus');

                        scope.$apply();
                    })
                    .on('blur', function() {
                        $timeout(function() {
                            var activeElement = $document.prop('activeElement'),
                                lostFocusToBrowserWindow = activeElement === input[0],
                                lostFocusToChildElement = element[0].contains(activeElement);

                            if (lostFocusToBrowserWindow || !lostFocusToChildElement) {
                                scope.hasFocus = false;
                                events.trigger('input-blur');
                            }
                        });
                    });

                element.find('div').on('click', function() {
                    input[0].focus();
                });
            }
        };
    }]);

    /**
     * @ngdoc directive
     * @name tiTranscludeAppend
     * @module ngTagsInput
     *
     * @description
     * Re-creates the old behavior of ng-transclude. Used internally by tagsInput directive.
     */
    tagsInput.directive('tiTranscludeAppend', function() {
        return function(scope, element, attrs, ctrl, transcludeFn) {
            transcludeFn(function(clone) {
                element.append(clone);
            });
        };
    });

    /**
     * @ngdoc directive
     * @name tiAutosize
     * @module ngTagsInput
     *
     * @description
     * Automatically sets the input's width so its content is always visible. Used internally by tagsInput directive.
     */
    tagsInput.directive('tiAutosize', function() {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attrs, ctrl) {
                var THRESHOLD = 3,
                    span, resize;

                span = angular.element('<span class="input"></span>');
                span.css('display', 'none')
                    .css('visibility', 'hidden')
                    .css('width', 'auto')
                    .css('white-space', 'pre');

                element.parent().append(span);

                resize = function(originalValue) {
                    var value = originalValue, width;

                    if (angular.isString(value) && value.length === 0) {
                        value = attrs.placeholder;
                    }

                    if (value) {
                        span.text(value);
                        span.css('display', '');
                        width = span.prop('offsetWidth');
                        span.css('display', 'none');
                    }

                    element.css('width', width ? width + THRESHOLD + 'px' : '');

                    return originalValue;
                };

                ctrl.$parsers.unshift(resize);
                ctrl.$formatters.unshift(resize);

                attrs.$observe('placeholder', function(value) {
                    if (!ctrl.$modelValue) {
                        resize(value);
                    }
                });
            }
        };
    });

    /**
     * @ngdoc service
     * @name tagsInputConfig
     * @module ngTagsInput
     *
     * @description
     * Sets global configuration settings for both tagsInput and autoComplete directives. It's also used internally to parse and
     * initialize options from HTML attributes.
     */
    tagsInput.provider('tagsInputConfig', function() {
        var globalDefaults = {}, interpolationStatus = {};

        /**
         * @ngdoc method
         * @name setDefaults
         * @description Sets the default configuration option for a directive.
         * @methodOf tagsInputConfig
         *
         * @param {string} directive Name of the directive to be configured. Must be either 'tagsInput' or 'autoComplete'.
         * @param {object} defaults Object containing options and their values.
         *
         * @returns {object} The service itself for chaining purposes.
         */
        this.setDefaults = function(directive, defaults) {
            globalDefaults[directive] = defaults;
            return this;
        };

        /***
         * @ngdoc method
         * @name setActiveInterpolation
         * @description Sets active interpolation for a set of options.
         * @methodOf tagsInputConfig
         *
         * @param {string} directive Name of the directive to be configured. Must be either 'tagsInput' or 'autoComplete'.
         * @param {object} options Object containing which options should have interpolation turned on at all times.
         *
         * @returns {object} The service itself for chaining purposes.
         */
        this.setActiveInterpolation = function(directive, options) {
            interpolationStatus[directive] = options;
            return this;
        };

        this.$get = ["$interpolate", function($interpolate) {
            var converters = {};
            converters[String] = function(value) { return value; };
            converters[Number] = function(value) { return parseInt(value, 10); };
            converters[Boolean] = function(value) { return value.toLowerCase() === 'true'; };
            converters[RegExp] = function(value) { return new RegExp(value); };

            return {
                load: function(directive, scope, attrs, options) {
                    scope.options = {};

                    angular.forEach(options, function(value, key) {
                        var type, localDefault, converter, getDefault, updateValue;

                        type = value[0];
                        localDefault = value[1];
                        converter = converters[type];

                        getDefault = function() {
                            var globalValue = globalDefaults[directive] && globalDefaults[directive][key];
                            return angular.isDefined(globalValue) ? globalValue : localDefault;
                        };

                        updateValue = function(value) {
                            scope.options[key] = value ? converter(value) : getDefault();
                        };

                        if (interpolationStatus[directive] && interpolationStatus[directive][key]) {
                            attrs.$observe(key, function(value) {
                                updateValue(value);
                            });
                        }
                        else {
                            updateValue(attrs[key] && $interpolate(attrs[key])(scope.$parent));
                        }
                    });
                }
            };
        }];
    });


    /* HTML templates */
    tagsInput.run(["$templateCache", function($templateCache) {
        $templateCache.put('ngTagsInput/tags-input.html',
            "<div class=\"host\" tabindex=\"-1\" ti-transclude-append=\"\"><div class=\"tags\" ng-class=\"{focused: hasFocus}\"><ul class=\"tag-list\"><li class=\"tag-item\" ng-repeat=\"tag in tagList.items track by track(tag)\" ng-class=\"{ selected: tag == tagList.selected }\"><span>{{getDisplayText(tag)}}</span> <a class=\"remove-button\" ng-click=\"tagList.remove($index)\">{{options.removeTagSymbol}}</a></li></ul><input class=\"input\" placeholder=\"{{options.placeholder}}\" tabindex=\"{{options.tabindex}}\" ng-model=\"newTag.text\" ng-change=\"newTagChange()\" ng-trim=\"false\" ng-class=\"{'invalid-tag': newTag.invalid}\" ti-autosize=\"\"></div></div>"
        );

        $templateCache.put('ngTagsInput/auto-complete.html',
            "<div class=\"autocomplete\" ng-show=\"suggestionList.visible\"><ul class=\"suggestion-list\"><li class=\"suggestion-item\" ng-repeat=\"item in suggestionList.items track by track(item)\" ng-class=\"{selected: item == suggestionList.selected}\" ng-click=\"addSuggestion()\" ng-mouseenter=\"suggestionList.select($index)\" ng-bind-html=\"highlight(item)\"></li></ul></div>"
        );
    }]);

}());
