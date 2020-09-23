/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

class NodeStore {
    constructor() {
        this.createNodeId = () => NodeStore.nodeId++;
        this.init();
    }
    init() {
        this.nodeMap = new Map();
        this.idMap = new WeakMap();
    }
    reset() {
        this.nodeMap.clear();
    }
    getNode(id) {
        return this.nodeMap.get(id) || null;
    }
    addNode(node, id = this.createNodeId()) {
        this.idMap.set(node, id);
        this.nodeMap.set(id, node);
        return id;
    }
    removeNode(id) {
        this.nodeMap.delete(id);
        this.idMap.delete(this.getNode(id));
    }
    getNodeId(node) {
        return this.idMap.get(node);
    }
    updateNode(id, node) {
        this.idMap.set(node, id);
        this.nodeMap.set(id, node);
    }
}
NodeStore.nodeId = 1;
const nodeStore = new NodeStore();

var RecordType;
(function (RecordType) {
    RecordType[RecordType["HEAD"] = 0] = "HEAD";
    RecordType[RecordType["SNAPSHOT"] = 1] = "SNAPSHOT";
    RecordType[RecordType["WINDOW"] = 2] = "WINDOW";
    RecordType[RecordType["SCROLL"] = 3] = "SCROLL";
    RecordType[RecordType["MOUSE"] = 4] = "MOUSE";
    RecordType[RecordType["DOM"] = 5] = "DOM";
    RecordType[RecordType["FORM_EL"] = 6] = "FORM_EL";
    RecordType[RecordType["LOCATION"] = 7] = "LOCATION";
    RecordType[RecordType["AUDIO"] = 8] = "AUDIO";
    RecordType[RecordType["CANVAS"] = 9] = "CANVAS";
    RecordType[RecordType["TERMINATE"] = 10] = "TERMINATE";
})(RecordType || (RecordType = {}));
var FormElementEvent;
(function (FormElementEvent) {
    FormElementEvent[FormElementEvent["PROP"] = 0] = "PROP";
    FormElementEvent[FormElementEvent["INPUT"] = 1] = "INPUT";
    FormElementEvent[FormElementEvent["CHANGE"] = 2] = "CHANGE";
    FormElementEvent[FormElementEvent["FOCUS"] = 3] = "FOCUS";
    FormElementEvent[FormElementEvent["BLUR"] = 4] = "BLUR";
})(FormElementEvent || (FormElementEvent = {}));
var MouseEventType;
(function (MouseEventType) {
    MouseEventType[MouseEventType["MOVE"] = 0] = "MOVE";
    MouseEventType[MouseEventType["CLICK"] = 1] = "CLICK";
})(MouseEventType || (MouseEventType = {}));
var TransactionMode;
(function (TransactionMode) {
    TransactionMode["READONLY"] = "readonly";
    TransactionMode["READWRITE"] = "readwrite";
    TransactionMode["VERSIONCHANGE"] = "versionchange";
})(TransactionMode || (TransactionMode = {}));

class IndexedDBOperator {
    constructor(DBName, version, storeName, callback) {
        this.listeners = [];
        this.DBName = DBName;
        this.version = version;
        this.storeName = storeName;
        const request = window.indexedDB.open(DBName, version);
        request.onerror = () => {
            console.error('open indexedDB on error');
        };
        request.onsuccess = () => {
            this.db = request.result;
            callback(this.db);
        };
        request.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                const objectStore = db.createObjectStore(storeName, { autoIncrement: true, keyPath: 'id' });
                objectStore.createIndex('type', 'type', { unique: false });
                objectStore.createIndex('data', 'data', { unique: false });
                objectStore.createIndex('relatedId', 'relatedId', { unique: false });
                objectStore.createIndex('time', 'time', { unique: false });
            }
        };
    }
    withIDBStore(type) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(this.storeName, type);
            transaction.oncomplete = () => { };
            transaction.onabort = transaction.onerror = () => {
                reject(transaction.error);
                throw new Error('process indexedDB on error');
            };
            resolve(transaction.objectStore(this.storeName));
        });
    }
    getStore() {
        return this.withIDBStore(TransactionMode.READWRITE);
    }
    add(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const store = yield this.getStore();
            store.add(data);
            this.triggerEvent('add');
        });
    }
    addRecord(data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.add(data);
        });
    }
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            const store = yield this.getStore();
            store.clear();
        });
    }
    readAllRecords() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.readRecords();
        });
    }
    readRecords(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { limit } = options || {};
            const store = yield this.getStore();
            const records = [];
            return new Promise(resolve => {
                store.openCursor().onsuccess = event => {
                    const cursor = event.target.result;
                    if (limit && records.length >= limit) {
                        return resolve(records);
                    }
                    if (cursor) {
                        records.push(cursor.value);
                        cursor.continue();
                        return;
                    }
                    resolve(records);
                };
            }).then((arr) => (arr.length ? arr : null));
        });
    }
    deleteRecords(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const { lowerBound, upperBound } = options || {};
            if (lowerBound && upperBound) {
                const keyRange = IDBKeyRange.bound(lowerBound, upperBound);
                const store = yield this.getStore();
                store.delete(keyRange);
            }
        });
    }
    count() {
        return __awaiter(this, void 0, void 0, function* () {
            const store = yield this.getStore();
            return new Promise(resolve => {
                store.count().onsuccess = event => {
                    const count = event.target.result;
                    resolve(count);
                };
            });
        });
    }
    triggerEvent(name) {
        this.listeners.filter(item => item.name === name).forEach(item => item.fn());
    }
    listen(name, callback) {
        this.listeners.push({ name, fn: callback });
    }
}
const getDBOperator = new Promise(resolve => {
    const DBOperator = new IndexedDBOperator('cat_db', 1, 'cat_data', () => {
        resolve(DBOperator);
    });
});

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

function getCjsExportFromNamespace (n) {
	return n && n['default'] || n;
}

var diff = createCommonjsModule(function (module, exports) {
/*!

 diff v4.0.1

Software License Agreement (BSD License)

Copyright (c) 2009-2015, Kevin Decker <kpdecker@gmail.com>

All rights reserved.

Redistribution and use of this software in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above
  copyright notice, this list of conditions and the
  following disclaimer.

* Redistributions in binary form must reproduce the above
  copyright notice, this list of conditions and the
  following disclaimer in the documentation and/or other
  materials provided with the distribution.

* Neither the name of Kevin Decker nor the names of its
  contributors may be used to endorse or promote products
  derived from this software without specific prior
  written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
@license
*/
(function (global, factory) {
   factory(exports) ;
}(commonjsGlobal, function (exports) {
  function Diff() {}
  Diff.prototype = {
    diff: function diff(oldString, newString) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      var callback = options.callback;

      if (typeof options === 'function') {
        callback = options;
        options = {};
      }

      this.options = options;
      var self = this;

      function done(value) {
        if (callback) {
          setTimeout(function () {
            callback(undefined, value);
          }, 0);
          return true;
        } else {
          return value;
        }
      } // Allow subclasses to massage the input prior to running


      oldString = this.castInput(oldString);
      newString = this.castInput(newString);
      oldString = this.removeEmpty(this.tokenize(oldString));
      newString = this.removeEmpty(this.tokenize(newString));
      var newLen = newString.length,
          oldLen = oldString.length;
      var editLength = 1;
      var maxEditLength = newLen + oldLen;
      var bestPath = [{
        newPos: -1,
        components: []
      }]; // Seed editLength = 0, i.e. the content starts with the same values

      var oldPos = this.extractCommon(bestPath[0], newString, oldString, 0);

      if (bestPath[0].newPos + 1 >= newLen && oldPos + 1 >= oldLen) {
        // Identity per the equality and tokenizer
        return done([{
          value: this.join(newString),
          count: newString.length
        }]);
      } // Main worker method. checks all permutations of a given edit length for acceptance.


      function execEditLength() {
        for (var diagonalPath = -1 * editLength; diagonalPath <= editLength; diagonalPath += 2) {
          var basePath = void 0;

          var addPath = bestPath[diagonalPath - 1],
              removePath = bestPath[diagonalPath + 1],
              _oldPos = (removePath ? removePath.newPos : 0) - diagonalPath;

          if (addPath) {
            // No one else is going to attempt to use this value, clear it
            bestPath[diagonalPath - 1] = undefined;
          }

          var canAdd = addPath && addPath.newPos + 1 < newLen,
              canRemove = removePath && 0 <= _oldPos && _oldPos < oldLen;

          if (!canAdd && !canRemove) {
            // If this path is a terminal then prune
            bestPath[diagonalPath] = undefined;
            continue;
          } // Select the diagonal that we want to branch from. We select the prior
          // path whose position in the new string is the farthest from the origin
          // and does not pass the bounds of the diff graph


          if (!canAdd || canRemove && addPath.newPos < removePath.newPos) {
            basePath = clonePath(removePath);
            self.pushComponent(basePath.components, undefined, true);
          } else {
            basePath = addPath; // No need to clone, we've pulled it from the list

            basePath.newPos++;
            self.pushComponent(basePath.components, true, undefined);
          }

          _oldPos = self.extractCommon(basePath, newString, oldString, diagonalPath); // If we have hit the end of both strings, then we are done

          if (basePath.newPos + 1 >= newLen && _oldPos + 1 >= oldLen) {
            return done(buildValues(self, basePath.components, newString, oldString, self.useLongestToken));
          } else {
            // Otherwise track this path as a potential candidate and continue.
            bestPath[diagonalPath] = basePath;
          }
        }

        editLength++;
      } // Performs the length of edit iteration. Is a bit fugly as this has to support the
      // sync and async mode which is never fun. Loops over execEditLength until a value
      // is produced.


      if (callback) {
        (function exec() {
          setTimeout(function () {
            // This should not happen, but we want to be safe.

            /* istanbul ignore next */
            if (editLength > maxEditLength) {
              return callback();
            }

            if (!execEditLength()) {
              exec();
            }
          }, 0);
        })();
      } else {
        while (editLength <= maxEditLength) {
          var ret = execEditLength();

          if (ret) {
            return ret;
          }
        }
      }
    },
    pushComponent: function pushComponent(components, added, removed) {
      var last = components[components.length - 1];

      if (last && last.added === added && last.removed === removed) {
        // We need to clone here as the component clone operation is just
        // as shallow array clone
        components[components.length - 1] = {
          count: last.count + 1,
          added: added,
          removed: removed
        };
      } else {
        components.push({
          count: 1,
          added: added,
          removed: removed
        });
      }
    },
    extractCommon: function extractCommon(basePath, newString, oldString, diagonalPath) {
      var newLen = newString.length,
          oldLen = oldString.length,
          newPos = basePath.newPos,
          oldPos = newPos - diagonalPath,
          commonCount = 0;

      while (newPos + 1 < newLen && oldPos + 1 < oldLen && this.equals(newString[newPos + 1], oldString[oldPos + 1])) {
        newPos++;
        oldPos++;
        commonCount++;
      }

      if (commonCount) {
        basePath.components.push({
          count: commonCount
        });
      }

      basePath.newPos = newPos;
      return oldPos;
    },
    equals: function equals(left, right) {
      if (this.options.comparator) {
        return this.options.comparator(left, right);
      } else {
        return left === right || this.options.ignoreCase && left.toLowerCase() === right.toLowerCase();
      }
    },
    removeEmpty: function removeEmpty(array) {
      var ret = [];

      for (var i = 0; i < array.length; i++) {
        if (array[i]) {
          ret.push(array[i]);
        }
      }

      return ret;
    },
    castInput: function castInput(value) {
      return value;
    },
    tokenize: function tokenize(value) {
      return value.split('');
    },
    join: function join(chars) {
      return chars.join('');
    }
  };

  function buildValues(diff, components, newString, oldString, useLongestToken) {
    var componentPos = 0,
        componentLen = components.length,
        newPos = 0,
        oldPos = 0;

    for (; componentPos < componentLen; componentPos++) {
      var component = components[componentPos];

      if (!component.removed) {
        if (!component.added && useLongestToken) {
          var value = newString.slice(newPos, newPos + component.count);
          value = value.map(function (value, i) {
            var oldValue = oldString[oldPos + i];
            return oldValue.length > value.length ? oldValue : value;
          });
          component.value = diff.join(value);
        } else {
          component.value = diff.join(newString.slice(newPos, newPos + component.count));
        }

        newPos += component.count; // Common case

        if (!component.added) {
          oldPos += component.count;
        }
      } else {
        component.value = diff.join(oldString.slice(oldPos, oldPos + component.count));
        oldPos += component.count; // Reverse add and remove so removes are output first to match common convention
        // The diffing algorithm is tied to add then remove output and this is the simplest
        // route to get the desired output with minimal overhead.

        if (componentPos && components[componentPos - 1].added) {
          var tmp = components[componentPos - 1];
          components[componentPos - 1] = components[componentPos];
          components[componentPos] = tmp;
        }
      }
    } // Special case handle for when one terminal is ignored (i.e. whitespace).
    // For this case we merge the terminal into the prior string and drop the change.
    // This is only available for string mode.


    var lastComponent = components[componentLen - 1];

    if (componentLen > 1 && typeof lastComponent.value === 'string' && (lastComponent.added || lastComponent.removed) && diff.equals('', lastComponent.value)) {
      components[componentLen - 2].value += lastComponent.value;
      components.pop();
    }

    return components;
  }

  function clonePath(path) {
    return {
      newPos: path.newPos,
      components: path.components.slice(0)
    };
  }

  var characterDiff = new Diff();
  function diffChars(oldStr, newStr, options) {
    return characterDiff.diff(oldStr, newStr, options);
  }

  function generateOptions(options, defaults) {
    if (typeof options === 'function') {
      defaults.callback = options;
    } else if (options) {
      for (var name in options) {
        /* istanbul ignore else */
        if (options.hasOwnProperty(name)) {
          defaults[name] = options[name];
        }
      }
    }

    return defaults;
  }

  //
  // Ranges and exceptions:
  // Latin-1 Supplement, 0080–00FF
  //  - U+00D7  × Multiplication sign
  //  - U+00F7  ÷ Division sign
  // Latin Extended-A, 0100–017F
  // Latin Extended-B, 0180–024F
  // IPA Extensions, 0250–02AF
  // Spacing Modifier Letters, 02B0–02FF
  //  - U+02C7  ˇ &#711;  Caron
  //  - U+02D8  ˘ &#728;  Breve
  //  - U+02D9  ˙ &#729;  Dot Above
  //  - U+02DA  ˚ &#730;  Ring Above
  //  - U+02DB  ˛ &#731;  Ogonek
  //  - U+02DC  ˜ &#732;  Small Tilde
  //  - U+02DD  ˝ &#733;  Double Acute Accent
  // Latin Extended Additional, 1E00–1EFF

  var extendedWordChars = /^[A-Za-z\xC0-\u02C6\u02C8-\u02D7\u02DE-\u02FF\u1E00-\u1EFF]+$/;
  var reWhitespace = /\S/;
  var wordDiff = new Diff();

  wordDiff.equals = function (left, right) {
    if (this.options.ignoreCase) {
      left = left.toLowerCase();
      right = right.toLowerCase();
    }

    return left === right || this.options.ignoreWhitespace && !reWhitespace.test(left) && !reWhitespace.test(right);
  };

  wordDiff.tokenize = function (value) {
    var tokens = value.split(/(\s+|[()[\]{}'"]|\b)/); // Join the boundary splits that we do not consider to be boundaries. This is primarily the extended Latin character set.

    for (var i = 0; i < tokens.length - 1; i++) {
      // If we have an empty string in the next field and we have only word chars before and after, merge
      if (!tokens[i + 1] && tokens[i + 2] && extendedWordChars.test(tokens[i]) && extendedWordChars.test(tokens[i + 2])) {
        tokens[i] += tokens[i + 2];
        tokens.splice(i + 1, 2);
        i--;
      }
    }

    return tokens;
  };

  function diffWords(oldStr, newStr, options) {
    options = generateOptions(options, {
      ignoreWhitespace: true
    });
    return wordDiff.diff(oldStr, newStr, options);
  }
  function diffWordsWithSpace(oldStr, newStr, options) {
    return wordDiff.diff(oldStr, newStr, options);
  }

  var lineDiff = new Diff();

  lineDiff.tokenize = function (value) {
    var retLines = [],
        linesAndNewlines = value.split(/(\n|\r\n)/); // Ignore the final empty token that occurs if the string ends with a new line

    if (!linesAndNewlines[linesAndNewlines.length - 1]) {
      linesAndNewlines.pop();
    } // Merge the content and line separators into single tokens


    for (var i = 0; i < linesAndNewlines.length; i++) {
      var line = linesAndNewlines[i];

      if (i % 2 && !this.options.newlineIsToken) {
        retLines[retLines.length - 1] += line;
      } else {
        if (this.options.ignoreWhitespace) {
          line = line.trim();
        }

        retLines.push(line);
      }
    }

    return retLines;
  };

  function diffLines(oldStr, newStr, callback) {
    return lineDiff.diff(oldStr, newStr, callback);
  }
  function diffTrimmedLines(oldStr, newStr, callback) {
    var options = generateOptions(callback, {
      ignoreWhitespace: true
    });
    return lineDiff.diff(oldStr, newStr, options);
  }

  var sentenceDiff = new Diff();

  sentenceDiff.tokenize = function (value) {
    return value.split(/(\S.+?[.!?])(?=\s+|$)/);
  };

  function diffSentences(oldStr, newStr, callback) {
    return sentenceDiff.diff(oldStr, newStr, callback);
  }

  var cssDiff = new Diff();

  cssDiff.tokenize = function (value) {
    return value.split(/([{}:;,]|\s+)/);
  };

  function diffCss(oldStr, newStr, callback) {
    return cssDiff.diff(oldStr, newStr, callback);
  }

  function _typeof(obj) {
    if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
      _typeof = function (obj) {
        return typeof obj;
      };
    } else {
      _typeof = function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
    }

    return _typeof(obj);
  }

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

      return arr2;
    }
  }

  function _iterableToArray(iter) {
    if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance");
  }

  var objectPrototypeToString = Object.prototype.toString;
  var jsonDiff = new Diff(); // Discriminate between two lines of pretty-printed, serialized JSON where one of them has a
  // dangling comma and the other doesn't. Turns out including the dangling comma yields the nicest output:

  jsonDiff.useLongestToken = true;
  jsonDiff.tokenize = lineDiff.tokenize;

  jsonDiff.castInput = function (value) {
    var _this$options = this.options,
        undefinedReplacement = _this$options.undefinedReplacement,
        _this$options$stringi = _this$options.stringifyReplacer,
        stringifyReplacer = _this$options$stringi === void 0 ? function (k, v) {
      return typeof v === 'undefined' ? undefinedReplacement : v;
    } : _this$options$stringi;
    return typeof value === 'string' ? value : JSON.stringify(canonicalize(value, null, null, stringifyReplacer), stringifyReplacer, '  ');
  };

  jsonDiff.equals = function (left, right) {
    return Diff.prototype.equals.call(jsonDiff, left.replace(/,([\r\n])/g, '$1'), right.replace(/,([\r\n])/g, '$1'));
  };

  function diffJson(oldObj, newObj, options) {
    return jsonDiff.diff(oldObj, newObj, options);
  } // This function handles the presence of circular references by bailing out when encountering an
  // object that is already on the "stack" of items being processed. Accepts an optional replacer

  function canonicalize(obj, stack, replacementStack, replacer, key) {
    stack = stack || [];
    replacementStack = replacementStack || [];

    if (replacer) {
      obj = replacer(key, obj);
    }

    var i;

    for (i = 0; i < stack.length; i += 1) {
      if (stack[i] === obj) {
        return replacementStack[i];
      }
    }

    var canonicalizedObj;

    if ('[object Array]' === objectPrototypeToString.call(obj)) {
      stack.push(obj);
      canonicalizedObj = new Array(obj.length);
      replacementStack.push(canonicalizedObj);

      for (i = 0; i < obj.length; i += 1) {
        canonicalizedObj[i] = canonicalize(obj[i], stack, replacementStack, replacer, key);
      }

      stack.pop();
      replacementStack.pop();
      return canonicalizedObj;
    }

    if (obj && obj.toJSON) {
      obj = obj.toJSON();
    }

    if (_typeof(obj) === 'object' && obj !== null) {
      stack.push(obj);
      canonicalizedObj = {};
      replacementStack.push(canonicalizedObj);

      var sortedKeys = [],
          _key;

      for (_key in obj) {
        /* istanbul ignore else */
        if (obj.hasOwnProperty(_key)) {
          sortedKeys.push(_key);
        }
      }

      sortedKeys.sort();

      for (i = 0; i < sortedKeys.length; i += 1) {
        _key = sortedKeys[i];
        canonicalizedObj[_key] = canonicalize(obj[_key], stack, replacementStack, replacer, _key);
      }

      stack.pop();
      replacementStack.pop();
    } else {
      canonicalizedObj = obj;
    }

    return canonicalizedObj;
  }

  var arrayDiff = new Diff();

  arrayDiff.tokenize = function (value) {
    return value.slice();
  };

  arrayDiff.join = arrayDiff.removeEmpty = function (value) {
    return value;
  };

  function diffArrays(oldArr, newArr, callback) {
    return arrayDiff.diff(oldArr, newArr, callback);
  }

  function parsePatch(uniDiff) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var diffstr = uniDiff.split(/\r\n|[\n\v\f\r\x85]/),
        delimiters = uniDiff.match(/\r\n|[\n\v\f\r\x85]/g) || [],
        list = [],
        i = 0;

    function parseIndex() {
      var index = {};
      list.push(index); // Parse diff metadata

      while (i < diffstr.length) {
        var line = diffstr[i]; // File header found, end parsing diff metadata

        if (/^(\-\-\-|\+\+\+|@@)\s/.test(line)) {
          break;
        } // Diff index


        var header = /^(?:Index:|diff(?: -r \w+)+)\s+(.+?)\s*$/.exec(line);

        if (header) {
          index.index = header[1];
        }

        i++;
      } // Parse file headers if they are defined. Unified diff requires them, but
      // there's no technical issues to have an isolated hunk without file header


      parseFileHeader(index);
      parseFileHeader(index); // Parse hunks

      index.hunks = [];

      while (i < diffstr.length) {
        var _line = diffstr[i];

        if (/^(Index:|diff|\-\-\-|\+\+\+)\s/.test(_line)) {
          break;
        } else if (/^@@/.test(_line)) {
          index.hunks.push(parseHunk());
        } else if (_line && options.strict) {
          // Ignore unexpected content unless in strict mode
          throw new Error('Unknown line ' + (i + 1) + ' ' + JSON.stringify(_line));
        } else {
          i++;
        }
      }
    } // Parses the --- and +++ headers, if none are found, no lines
    // are consumed.


    function parseFileHeader(index) {
      var fileHeader = /^(---|\+\+\+)\s+(.*)$/.exec(diffstr[i]);

      if (fileHeader) {
        var keyPrefix = fileHeader[1] === '---' ? 'old' : 'new';
        var data = fileHeader[2].split('\t', 2);
        var fileName = data[0].replace(/\\\\/g, '\\');

        if (/^".*"$/.test(fileName)) {
          fileName = fileName.substr(1, fileName.length - 2);
        }

        index[keyPrefix + 'FileName'] = fileName;
        index[keyPrefix + 'Header'] = (data[1] || '').trim();
        i++;
      }
    } // Parses a hunk
    // This assumes that we are at the start of a hunk.


    function parseHunk() {
      var chunkHeaderIndex = i,
          chunkHeaderLine = diffstr[i++],
          chunkHeader = chunkHeaderLine.split(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      var hunk = {
        oldStart: +chunkHeader[1],
        oldLines: +chunkHeader[2] || 1,
        newStart: +chunkHeader[3],
        newLines: +chunkHeader[4] || 1,
        lines: [],
        linedelimiters: []
      };
      var addCount = 0,
          removeCount = 0;

      for (; i < diffstr.length; i++) {
        // Lines starting with '---' could be mistaken for the "remove line" operation
        // But they could be the header for the next file. Therefore prune such cases out.
        if (diffstr[i].indexOf('--- ') === 0 && i + 2 < diffstr.length && diffstr[i + 1].indexOf('+++ ') === 0 && diffstr[i + 2].indexOf('@@') === 0) {
          break;
        }

        var operation = diffstr[i].length == 0 && i != diffstr.length - 1 ? ' ' : diffstr[i][0];

        if (operation === '+' || operation === '-' || operation === ' ' || operation === '\\') {
          hunk.lines.push(diffstr[i]);
          hunk.linedelimiters.push(delimiters[i] || '\n');

          if (operation === '+') {
            addCount++;
          } else if (operation === '-') {
            removeCount++;
          } else if (operation === ' ') {
            addCount++;
            removeCount++;
          }
        } else {
          break;
        }
      } // Handle the empty block count case


      if (!addCount && hunk.newLines === 1) {
        hunk.newLines = 0;
      }

      if (!removeCount && hunk.oldLines === 1) {
        hunk.oldLines = 0;
      } // Perform optional sanity checking


      if (options.strict) {
        if (addCount !== hunk.newLines) {
          throw new Error('Added line count did not match for hunk at line ' + (chunkHeaderIndex + 1));
        }

        if (removeCount !== hunk.oldLines) {
          throw new Error('Removed line count did not match for hunk at line ' + (chunkHeaderIndex + 1));
        }
      }

      return hunk;
    }

    while (i < diffstr.length) {
      parseIndex();
    }

    return list;
  }

  // Iterator that traverses in the range of [min, max], stepping
  // by distance from a given start position. I.e. for [0, 4], with
  // start of 2, this will iterate 2, 3, 1, 4, 0.
  function distanceIterator (start, minLine, maxLine) {
    var wantForward = true,
        backwardExhausted = false,
        forwardExhausted = false,
        localOffset = 1;
    return function iterator() {
      if (wantForward && !forwardExhausted) {
        if (backwardExhausted) {
          localOffset++;
        } else {
          wantForward = false;
        } // Check if trying to fit beyond text length, and if not, check it fits
        // after offset location (or desired location on first iteration)


        if (start + localOffset <= maxLine) {
          return localOffset;
        }

        forwardExhausted = true;
      }

      if (!backwardExhausted) {
        if (!forwardExhausted) {
          wantForward = true;
        } // Check if trying to fit before text beginning, and if not, check it fits
        // before offset location


        if (minLine <= start - localOffset) {
          return -localOffset++;
        }

        backwardExhausted = true;
        return iterator();
      } // We tried to fit hunk before text beginning and beyond text length, then
      // hunk can't fit on the text. Return undefined

    };
  }

  function applyPatch(source, uniDiff) {
    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    if (typeof uniDiff === 'string') {
      uniDiff = parsePatch(uniDiff);
    }

    if (Array.isArray(uniDiff)) {
      if (uniDiff.length > 1) {
        throw new Error('applyPatch only works with a single input.');
      }

      uniDiff = uniDiff[0];
    } // Apply the diff to the input


    var lines = source.split(/\r\n|[\n\v\f\r\x85]/),
        delimiters = source.match(/\r\n|[\n\v\f\r\x85]/g) || [],
        hunks = uniDiff.hunks,
        compareLine = options.compareLine || function (lineNumber, line, operation, patchContent) {
      return line === patchContent;
    },
        errorCount = 0,
        fuzzFactor = options.fuzzFactor || 0,
        minLine = 0,
        offset = 0,
        removeEOFNL,
        addEOFNL;
    /**
     * Checks if the hunk exactly fits on the provided location
     */


    function hunkFits(hunk, toPos) {
      for (var j = 0; j < hunk.lines.length; j++) {
        var line = hunk.lines[j],
            operation = line.length > 0 ? line[0] : ' ',
            content = line.length > 0 ? line.substr(1) : line;

        if (operation === ' ' || operation === '-') {
          // Context sanity check
          if (!compareLine(toPos + 1, lines[toPos], operation, content)) {
            errorCount++;

            if (errorCount > fuzzFactor) {
              return false;
            }
          }

          toPos++;
        }
      }

      return true;
    } // Search best fit offsets for each hunk based on the previous ones


    for (var i = 0; i < hunks.length; i++) {
      var hunk = hunks[i],
          maxLine = lines.length - hunk.oldLines,
          localOffset = 0,
          toPos = offset + hunk.oldStart - 1;
      var iterator = distanceIterator(toPos, minLine, maxLine);

      for (; localOffset !== undefined; localOffset = iterator()) {
        if (hunkFits(hunk, toPos + localOffset)) {
          hunk.offset = offset += localOffset;
          break;
        }
      }

      if (localOffset === undefined) {
        return false;
      } // Set lower text limit to end of the current hunk, so next ones don't try
      // to fit over already patched text


      minLine = hunk.offset + hunk.oldStart + hunk.oldLines;
    } // Apply patch hunks


    var diffOffset = 0;

    for (var _i = 0; _i < hunks.length; _i++) {
      var _hunk = hunks[_i],
          _toPos = _hunk.oldStart + _hunk.offset + diffOffset - 1;

      diffOffset += _hunk.newLines - _hunk.oldLines;

      if (_toPos < 0) {
        // Creating a new file
        _toPos = 0;
      }

      for (var j = 0; j < _hunk.lines.length; j++) {
        var line = _hunk.lines[j],
            operation = line.length > 0 ? line[0] : ' ',
            content = line.length > 0 ? line.substr(1) : line,
            delimiter = _hunk.linedelimiters[j];

        if (operation === ' ') {
          _toPos++;
        } else if (operation === '-') {
          lines.splice(_toPos, 1);
          delimiters.splice(_toPos, 1);
          /* istanbul ignore else */
        } else if (operation === '+') {
          lines.splice(_toPos, 0, content);
          delimiters.splice(_toPos, 0, delimiter);
          _toPos++;
        } else if (operation === '\\') {
          var previousOperation = _hunk.lines[j - 1] ? _hunk.lines[j - 1][0] : null;

          if (previousOperation === '+') {
            removeEOFNL = true;
          } else if (previousOperation === '-') {
            addEOFNL = true;
          }
        }
      }
    } // Handle EOFNL insertion/removal


    if (removeEOFNL) {
      while (!lines[lines.length - 1]) {
        lines.pop();
        delimiters.pop();
      }
    } else if (addEOFNL) {
      lines.push('');
      delimiters.push('\n');
    }

    for (var _k = 0; _k < lines.length - 1; _k++) {
      lines[_k] = lines[_k] + delimiters[_k];
    }

    return lines.join('');
  } // Wrapper that supports multiple file patches via callbacks.

  function applyPatches(uniDiff, options) {
    if (typeof uniDiff === 'string') {
      uniDiff = parsePatch(uniDiff);
    }

    var currentIndex = 0;

    function processIndex() {
      var index = uniDiff[currentIndex++];

      if (!index) {
        return options.complete();
      }

      options.loadFile(index, function (err, data) {
        if (err) {
          return options.complete(err);
        }

        var updatedContent = applyPatch(data, index, options);
        options.patched(index, updatedContent, function (err) {
          if (err) {
            return options.complete(err);
          }

          processIndex();
        });
      });
    }

    processIndex();
  }

  function structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options) {
    if (!options) {
      options = {};
    }

    if (typeof options.context === 'undefined') {
      options.context = 4;
    }

    var diff = diffLines(oldStr, newStr, options);
    diff.push({
      value: '',
      lines: []
    }); // Append an empty value to make cleanup easier

    function contextLines(lines) {
      return lines.map(function (entry) {
        return ' ' + entry;
      });
    }

    var hunks = [];
    var oldRangeStart = 0,
        newRangeStart = 0,
        curRange = [],
        oldLine = 1,
        newLine = 1;

    var _loop = function _loop(i) {
      var current = diff[i],
          lines = current.lines || current.value.replace(/\n$/, '').split('\n');
      current.lines = lines;

      if (current.added || current.removed) {
        var _curRange;

        // If we have previous context, start with that
        if (!oldRangeStart) {
          var prev = diff[i - 1];
          oldRangeStart = oldLine;
          newRangeStart = newLine;

          if (prev) {
            curRange = options.context > 0 ? contextLines(prev.lines.slice(-options.context)) : [];
            oldRangeStart -= curRange.length;
            newRangeStart -= curRange.length;
          }
        } // Output our changes


        (_curRange = curRange).push.apply(_curRange, _toConsumableArray(lines.map(function (entry) {
          return (current.added ? '+' : '-') + entry;
        }))); // Track the updated file position


        if (current.added) {
          newLine += lines.length;
        } else {
          oldLine += lines.length;
        }
      } else {
        // Identical context lines. Track line changes
        if (oldRangeStart) {
          // Close out any changes that have been output (or join overlapping)
          if (lines.length <= options.context * 2 && i < diff.length - 2) {
            var _curRange2;

            // Overlapping
            (_curRange2 = curRange).push.apply(_curRange2, _toConsumableArray(contextLines(lines)));
          } else {
            var _curRange3;

            // end the range and output
            var contextSize = Math.min(lines.length, options.context);

            (_curRange3 = curRange).push.apply(_curRange3, _toConsumableArray(contextLines(lines.slice(0, contextSize))));

            var hunk = {
              oldStart: oldRangeStart,
              oldLines: oldLine - oldRangeStart + contextSize,
              newStart: newRangeStart,
              newLines: newLine - newRangeStart + contextSize,
              lines: curRange
            };

            if (i >= diff.length - 2 && lines.length <= options.context) {
              // EOF is inside this hunk
              var oldEOFNewline = /\n$/.test(oldStr);
              var newEOFNewline = /\n$/.test(newStr);
              var noNlBeforeAdds = lines.length == 0 && curRange.length > hunk.oldLines;

              if (!oldEOFNewline && noNlBeforeAdds) {
                // special case: old has no eol and no trailing context; no-nl can end up before adds
                curRange.splice(hunk.oldLines, 0, '\\ No newline at end of file');
              }

              if (!oldEOFNewline && !noNlBeforeAdds || !newEOFNewline) {
                curRange.push('\\ No newline at end of file');
              }
            }

            hunks.push(hunk);
            oldRangeStart = 0;
            newRangeStart = 0;
            curRange = [];
          }
        }

        oldLine += lines.length;
        newLine += lines.length;
      }
    };

    for (var i = 0; i < diff.length; i++) {
      _loop(i);
    }

    return {
      oldFileName: oldFileName,
      newFileName: newFileName,
      oldHeader: oldHeader,
      newHeader: newHeader,
      hunks: hunks
    };
  }
  function createTwoFilesPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options) {
    var diff = structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options);
    var ret = [];

    if (oldFileName == newFileName) {
      ret.push('Index: ' + oldFileName);
    }

    ret.push('===================================================================');
    ret.push('--- ' + diff.oldFileName + (typeof diff.oldHeader === 'undefined' ? '' : '\t' + diff.oldHeader));
    ret.push('+++ ' + diff.newFileName + (typeof diff.newHeader === 'undefined' ? '' : '\t' + diff.newHeader));

    for (var i = 0; i < diff.hunks.length; i++) {
      var hunk = diff.hunks[i];
      ret.push('@@ -' + hunk.oldStart + ',' + hunk.oldLines + ' +' + hunk.newStart + ',' + hunk.newLines + ' @@');
      ret.push.apply(ret, hunk.lines);
    }

    return ret.join('\n') + '\n';
  }
  function createPatch(fileName, oldStr, newStr, oldHeader, newHeader, options) {
    return createTwoFilesPatch(fileName, fileName, oldStr, newStr, oldHeader, newHeader, options);
  }

  function arrayEqual(a, b) {
    if (a.length !== b.length) {
      return false;
    }

    return arrayStartsWith(a, b);
  }
  function arrayStartsWith(array, start) {
    if (start.length > array.length) {
      return false;
    }

    for (var i = 0; i < start.length; i++) {
      if (start[i] !== array[i]) {
        return false;
      }
    }

    return true;
  }

  function calcLineCount(hunk) {
    var _calcOldNewLineCount = calcOldNewLineCount(hunk.lines),
        oldLines = _calcOldNewLineCount.oldLines,
        newLines = _calcOldNewLineCount.newLines;

    if (oldLines !== undefined) {
      hunk.oldLines = oldLines;
    } else {
      delete hunk.oldLines;
    }

    if (newLines !== undefined) {
      hunk.newLines = newLines;
    } else {
      delete hunk.newLines;
    }
  }
  function merge(mine, theirs, base) {
    mine = loadPatch(mine, base);
    theirs = loadPatch(theirs, base);
    var ret = {}; // For index we just let it pass through as it doesn't have any necessary meaning.
    // Leaving sanity checks on this to the API consumer that may know more about the
    // meaning in their own context.

    if (mine.index || theirs.index) {
      ret.index = mine.index || theirs.index;
    }

    if (mine.newFileName || theirs.newFileName) {
      if (!fileNameChanged(mine)) {
        // No header or no change in ours, use theirs (and ours if theirs does not exist)
        ret.oldFileName = theirs.oldFileName || mine.oldFileName;
        ret.newFileName = theirs.newFileName || mine.newFileName;
        ret.oldHeader = theirs.oldHeader || mine.oldHeader;
        ret.newHeader = theirs.newHeader || mine.newHeader;
      } else if (!fileNameChanged(theirs)) {
        // No header or no change in theirs, use ours
        ret.oldFileName = mine.oldFileName;
        ret.newFileName = mine.newFileName;
        ret.oldHeader = mine.oldHeader;
        ret.newHeader = mine.newHeader;
      } else {
        // Both changed... figure it out
        ret.oldFileName = selectField(ret, mine.oldFileName, theirs.oldFileName);
        ret.newFileName = selectField(ret, mine.newFileName, theirs.newFileName);
        ret.oldHeader = selectField(ret, mine.oldHeader, theirs.oldHeader);
        ret.newHeader = selectField(ret, mine.newHeader, theirs.newHeader);
      }
    }

    ret.hunks = [];
    var mineIndex = 0,
        theirsIndex = 0,
        mineOffset = 0,
        theirsOffset = 0;

    while (mineIndex < mine.hunks.length || theirsIndex < theirs.hunks.length) {
      var mineCurrent = mine.hunks[mineIndex] || {
        oldStart: Infinity
      },
          theirsCurrent = theirs.hunks[theirsIndex] || {
        oldStart: Infinity
      };

      if (hunkBefore(mineCurrent, theirsCurrent)) {
        // This patch does not overlap with any of the others, yay.
        ret.hunks.push(cloneHunk(mineCurrent, mineOffset));
        mineIndex++;
        theirsOffset += mineCurrent.newLines - mineCurrent.oldLines;
      } else if (hunkBefore(theirsCurrent, mineCurrent)) {
        // This patch does not overlap with any of the others, yay.
        ret.hunks.push(cloneHunk(theirsCurrent, theirsOffset));
        theirsIndex++;
        mineOffset += theirsCurrent.newLines - theirsCurrent.oldLines;
      } else {
        // Overlap, merge as best we can
        var mergedHunk = {
          oldStart: Math.min(mineCurrent.oldStart, theirsCurrent.oldStart),
          oldLines: 0,
          newStart: Math.min(mineCurrent.newStart + mineOffset, theirsCurrent.oldStart + theirsOffset),
          newLines: 0,
          lines: []
        };
        mergeLines(mergedHunk, mineCurrent.oldStart, mineCurrent.lines, theirsCurrent.oldStart, theirsCurrent.lines);
        theirsIndex++;
        mineIndex++;
        ret.hunks.push(mergedHunk);
      }
    }

    return ret;
  }

  function loadPatch(param, base) {
    if (typeof param === 'string') {
      if (/^@@/m.test(param) || /^Index:/m.test(param)) {
        return parsePatch(param)[0];
      }

      if (!base) {
        throw new Error('Must provide a base reference or pass in a patch');
      }

      return structuredPatch(undefined, undefined, base, param);
    }

    return param;
  }

  function fileNameChanged(patch) {
    return patch.newFileName && patch.newFileName !== patch.oldFileName;
  }

  function selectField(index, mine, theirs) {
    if (mine === theirs) {
      return mine;
    } else {
      index.conflict = true;
      return {
        mine: mine,
        theirs: theirs
      };
    }
  }

  function hunkBefore(test, check) {
    return test.oldStart < check.oldStart && test.oldStart + test.oldLines < check.oldStart;
  }

  function cloneHunk(hunk, offset) {
    return {
      oldStart: hunk.oldStart,
      oldLines: hunk.oldLines,
      newStart: hunk.newStart + offset,
      newLines: hunk.newLines,
      lines: hunk.lines
    };
  }

  function mergeLines(hunk, mineOffset, mineLines, theirOffset, theirLines) {
    // This will generally result in a conflicted hunk, but there are cases where the context
    // is the only overlap where we can successfully merge the content here.
    var mine = {
      offset: mineOffset,
      lines: mineLines,
      index: 0
    },
        their = {
      offset: theirOffset,
      lines: theirLines,
      index: 0
    }; // Handle any leading content

    insertLeading(hunk, mine, their);
    insertLeading(hunk, their, mine); // Now in the overlap content. Scan through and select the best changes from each.

    while (mine.index < mine.lines.length && their.index < their.lines.length) {
      var mineCurrent = mine.lines[mine.index],
          theirCurrent = their.lines[their.index];

      if ((mineCurrent[0] === '-' || mineCurrent[0] === '+') && (theirCurrent[0] === '-' || theirCurrent[0] === '+')) {
        // Both modified ...
        mutualChange(hunk, mine, their);
      } else if (mineCurrent[0] === '+' && theirCurrent[0] === ' ') {
        var _hunk$lines;

        // Mine inserted
        (_hunk$lines = hunk.lines).push.apply(_hunk$lines, _toConsumableArray(collectChange(mine)));
      } else if (theirCurrent[0] === '+' && mineCurrent[0] === ' ') {
        var _hunk$lines2;

        // Theirs inserted
        (_hunk$lines2 = hunk.lines).push.apply(_hunk$lines2, _toConsumableArray(collectChange(their)));
      } else if (mineCurrent[0] === '-' && theirCurrent[0] === ' ') {
        // Mine removed or edited
        removal(hunk, mine, their);
      } else if (theirCurrent[0] === '-' && mineCurrent[0] === ' ') {
        // Their removed or edited
        removal(hunk, their, mine, true);
      } else if (mineCurrent === theirCurrent) {
        // Context identity
        hunk.lines.push(mineCurrent);
        mine.index++;
        their.index++;
      } else {
        // Context mismatch
        conflict(hunk, collectChange(mine), collectChange(their));
      }
    } // Now push anything that may be remaining


    insertTrailing(hunk, mine);
    insertTrailing(hunk, their);
    calcLineCount(hunk);
  }

  function mutualChange(hunk, mine, their) {
    var myChanges = collectChange(mine),
        theirChanges = collectChange(their);

    if (allRemoves(myChanges) && allRemoves(theirChanges)) {
      // Special case for remove changes that are supersets of one another
      if (arrayStartsWith(myChanges, theirChanges) && skipRemoveSuperset(their, myChanges, myChanges.length - theirChanges.length)) {
        var _hunk$lines3;

        (_hunk$lines3 = hunk.lines).push.apply(_hunk$lines3, _toConsumableArray(myChanges));

        return;
      } else if (arrayStartsWith(theirChanges, myChanges) && skipRemoveSuperset(mine, theirChanges, theirChanges.length - myChanges.length)) {
        var _hunk$lines4;

        (_hunk$lines4 = hunk.lines).push.apply(_hunk$lines4, _toConsumableArray(theirChanges));

        return;
      }
    } else if (arrayEqual(myChanges, theirChanges)) {
      var _hunk$lines5;

      (_hunk$lines5 = hunk.lines).push.apply(_hunk$lines5, _toConsumableArray(myChanges));

      return;
    }

    conflict(hunk, myChanges, theirChanges);
  }

  function removal(hunk, mine, their, swap) {
    var myChanges = collectChange(mine),
        theirChanges = collectContext(their, myChanges);

    if (theirChanges.merged) {
      var _hunk$lines6;

      (_hunk$lines6 = hunk.lines).push.apply(_hunk$lines6, _toConsumableArray(theirChanges.merged));
    } else {
      conflict(hunk, swap ? theirChanges : myChanges, swap ? myChanges : theirChanges);
    }
  }

  function conflict(hunk, mine, their) {
    hunk.conflict = true;
    hunk.lines.push({
      conflict: true,
      mine: mine,
      theirs: their
    });
  }

  function insertLeading(hunk, insert, their) {
    while (insert.offset < their.offset && insert.index < insert.lines.length) {
      var line = insert.lines[insert.index++];
      hunk.lines.push(line);
      insert.offset++;
    }
  }

  function insertTrailing(hunk, insert) {
    while (insert.index < insert.lines.length) {
      var line = insert.lines[insert.index++];
      hunk.lines.push(line);
    }
  }

  function collectChange(state) {
    var ret = [],
        operation = state.lines[state.index][0];

    while (state.index < state.lines.length) {
      var line = state.lines[state.index]; // Group additions that are immediately after subtractions and treat them as one "atomic" modify change.

      if (operation === '-' && line[0] === '+') {
        operation = '+';
      }

      if (operation === line[0]) {
        ret.push(line);
        state.index++;
      } else {
        break;
      }
    }

    return ret;
  }

  function collectContext(state, matchChanges) {
    var changes = [],
        merged = [],
        matchIndex = 0,
        contextChanges = false,
        conflicted = false;

    while (matchIndex < matchChanges.length && state.index < state.lines.length) {
      var change = state.lines[state.index],
          match = matchChanges[matchIndex]; // Once we've hit our add, then we are done

      if (match[0] === '+') {
        break;
      }

      contextChanges = contextChanges || change[0] !== ' ';
      merged.push(match);
      matchIndex++; // Consume any additions in the other block as a conflict to attempt
      // to pull in the remaining context after this

      if (change[0] === '+') {
        conflicted = true;

        while (change[0] === '+') {
          changes.push(change);
          change = state.lines[++state.index];
        }
      }

      if (match.substr(1) === change.substr(1)) {
        changes.push(change);
        state.index++;
      } else {
        conflicted = true;
      }
    }

    if ((matchChanges[matchIndex] || '')[0] === '+' && contextChanges) {
      conflicted = true;
    }

    if (conflicted) {
      return changes;
    }

    while (matchIndex < matchChanges.length) {
      merged.push(matchChanges[matchIndex++]);
    }

    return {
      merged: merged,
      changes: changes
    };
  }

  function allRemoves(changes) {
    return changes.reduce(function (prev, change) {
      return prev && change[0] === '-';
    }, true);
  }

  function skipRemoveSuperset(state, removeChanges, delta) {
    for (var i = 0; i < delta; i++) {
      var changeContent = removeChanges[removeChanges.length - delta + i].substr(1);

      if (state.lines[state.index + i] !== ' ' + changeContent) {
        return false;
      }
    }

    state.index += delta;
    return true;
  }

  function calcOldNewLineCount(lines) {
    var oldLines = 0;
    var newLines = 0;
    lines.forEach(function (line) {
      if (typeof line !== 'string') {
        var myCount = calcOldNewLineCount(line.mine);
        var theirCount = calcOldNewLineCount(line.theirs);

        if (oldLines !== undefined) {
          if (myCount.oldLines === theirCount.oldLines) {
            oldLines += myCount.oldLines;
          } else {
            oldLines = undefined;
          }
        }

        if (newLines !== undefined) {
          if (myCount.newLines === theirCount.newLines) {
            newLines += myCount.newLines;
          } else {
            newLines = undefined;
          }
        }
      } else {
        if (newLines !== undefined && (line[0] === '+' || line[0] === ' ')) {
          newLines++;
        }

        if (oldLines !== undefined && (line[0] === '-' || line[0] === ' ')) {
          oldLines++;
        }
      }
    });
    return {
      oldLines: oldLines,
      newLines: newLines
    };
  }

  // See: http://code.google.com/p/google-diff-match-patch/wiki/API
  function convertChangesToDMP(changes) {
    var ret = [],
        change,
        operation;

    for (var i = 0; i < changes.length; i++) {
      change = changes[i];

      if (change.added) {
        operation = 1;
      } else if (change.removed) {
        operation = -1;
      } else {
        operation = 0;
      }

      ret.push([operation, change.value]);
    }

    return ret;
  }

  function convertChangesToXML(changes) {
    var ret = [];

    for (var i = 0; i < changes.length; i++) {
      var change = changes[i];

      if (change.added) {
        ret.push('<ins>');
      } else if (change.removed) {
        ret.push('<del>');
      }

      ret.push(escapeHTML(change.value));

      if (change.added) {
        ret.push('</ins>');
      } else if (change.removed) {
        ret.push('</del>');
      }
    }

    return ret.join('');
  }

  function escapeHTML(s) {
    var n = s;
    n = n.replace(/&/g, '&amp;');
    n = n.replace(/</g, '&lt;');
    n = n.replace(/>/g, '&gt;');
    n = n.replace(/"/g, '&quot;');
    return n;
  }

  /* See LICENSE file for terms of use */

  exports.Diff = Diff;
  exports.diffChars = diffChars;
  exports.diffWords = diffWords;
  exports.diffWordsWithSpace = diffWordsWithSpace;
  exports.diffLines = diffLines;
  exports.diffTrimmedLines = diffTrimmedLines;
  exports.diffSentences = diffSentences;
  exports.diffCss = diffCss;
  exports.diffJson = diffJson;
  exports.diffArrays = diffArrays;
  exports.structuredPatch = structuredPatch;
  exports.createTwoFilesPatch = createTwoFilesPatch;
  exports.createPatch = createPatch;
  exports.applyPatch = applyPatch;
  exports.applyPatches = applyPatches;
  exports.parsePatch = parsePatch;
  exports.merge = merge;
  exports.convertChangesToDMP = convertChangesToDMP;
  exports.convertChangesToXML = convertChangesToXML;
  exports.canonicalize = canonicalize;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
});

var diff$1 = unwrapExports(diff);

const ENCODE_TYPE = {
    BASE: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
    BASE_URL: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
};
class Radix64 {
    atob(str, type = 'BASE_URL') {
        if (str.length === 1) {
            return this.decode(str, type);
        }
        const len = str.length;
        const digit = ENCODE_TYPE[type].length;
        let sum = 0;
        let carry = 0;
        for (let i = len - 1; i >= 0; i--) {
            const s = str[i];
            sum += this.decode(s, type) * Math.pow(digit, carry++);
        }
        return sum;
    }
    btoa(num, type = 'BASE_URL') {
        const len = ENCODE_TYPE[type].length;
        if (num < len) {
            return this.encode(num, type);
        }
        return '' + this.btoa(Math.floor(num / len), type) + this.encode(num & (len - 1), type);
    }
    decode(str, type) {
        const data = ENCODE_TYPE[type].indexOf(str);
        return data;
    }
    encode(num, type) {
        const n = num & (ENCODE_TYPE.BASE.length - 1);
        return ENCODE_TYPE[type][n];
    }
}
const radix64 = new Radix64();

function logErrorOverload(e) {
    const msg = e.message || e;
    console.error(`TimeCat Error: ${msg}`);
    return msg;
}
const logError = logErrorOverload;
function getTime() {
    return Math.floor(performance.timing.navigationStart + performance.now());
}
function getRadix64TimeStr() {
    return radix64.btoa(getTime());
}
function getRandomCode(len = 8) {
    const code = (Math.random() * 20 + 16).toString(36).substring(2, len + 2);
    return code.toUpperCase();
}
function isVNode(n) {
    return !!n.tag;
}
function getStrDiffPatches(oldStr, newStr) {
    return getPatches(diff$1.diffChars(oldStr, newStr));
}
function getPatches(changes) {
    let index = 0;
    const patches = changes
        .map(change => {
        const { added: add, removed: rm, value, count } = change;
        const len = count || 0;
        if (add) {
            const ret = {
                index,
                type: 'add',
                value
            };
            index += len;
            return ret;
        }
        else if (rm) {
            const ret = {
                index,
                type: 'rm',
                len
            };
            return ret;
        }
        index += len;
    })
        .filter(Boolean);
    return patches;
}

function throttle(func, wait, options = { leading: false, trailing: false }) {
    let context;
    let args;
    let result;
    let timeout = null;
    let previous = 0;
    const later = function () {
        previous = options.leading === false ? 0 : Date.now();
        timeout = null;
        result = func.apply(context, args);
        if (!timeout)
            context = args = null;
    };
    return function () {
        const now = Date.now();
        if (!previous && options.leading === false)
            previous = now;
        const remaining = wait - (now - previous);
        context = this;
        args = arguments;
        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            previous = now;
            result = func.apply(context, args);
            if (!timeout)
                context = args = null;
        }
        else if (!timeout && options.trailing !== false) {
            timeout = setTimeout(later, remaining);
        }
        return result;
    };
}
function debounce(func, waitMilliseconds, options = {
    isImmediate: false
}) {
    let timeoutId;
    return function (...args) {
        const context = this;
        const doLater = function () {
            timeoutId = undefined;
            if (!options.isImmediate) {
                func.apply(context, args);
            }
        };
        const shouldCallNow = options.isImmediate && timeoutId === undefined;
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(doLater, waitMilliseconds);
        if (shouldCallNow) {
            func.apply(context, args);
        }
    };
}

function isElementNode(node) {
    return node.nodeType === Node.ELEMENT_NODE;
}
function isExistingNode(node) {
    return node.ownerDocument && !!node.ownerDocument.contains(node);
}

function float32ArrayToBase64(data) {
    const uint = new Uint8Array(data.buffer);
    const str = btoa(String.fromCharCode.apply(null, uint));
    return str;
}

const getVNodeByEl = (el, isSVG) => {
    if (isElementNode(el)) {
        return {
            id: nodeStore.createNodeId(),
            type: el.nodeType,
            attrs: getAttr(el),
            tag: el.tagName.toLocaleLowerCase(),
            children: [],
            extra: getExtra(el, isSVG)
        };
    }
    else {
        return {
            id: nodeStore.createNodeId(),
            type: el.nodeType,
            value: el.textContent
        };
    }
};
const getAttr = (el) => {
    const resAttr = {};
    const { attributes } = el;
    if (attributes && attributes.length) {
        return Object.values(attributes).reduce((ret, attr) => {
            const [name, value] = extraAttr(attr);
            if (name) {
                ret[name] = value;
            }
            return ret;
        }, resAttr);
    }
    return resAttr;
};
function getExtra(node, isSVG) {
    const { tagName } = node;
    const extra = {};
    const props = {};
    if (isSVG || tagName.toLowerCase() === 'svg') {
        extra.isSVG = true;
    }
    if (tagName === 'INPUT') {
        const { checked, value } = node;
        if (value !== undefined) {
            props.value = value;
        }
        if (checked !== undefined) {
            props.checked = checked;
        }
    }
    const scrollLeft = node.scrollLeft;
    const scrollTop = node.scrollTop;
    if (scrollTop || scrollLeft) {
        props.scroll = {
            left: scrollLeft,
            top: scrollTop
        };
    }
    if (Object.keys(props).length) {
        extra.props = props;
    }
    return extra;
}
const extraAttr = (attr) => {
    const { name, value } = attr;
    if (name === 'href' || name === 'src') {
        if (value.startsWith('#/')) {
            return [];
        }
        return [name, value];
    }
    return [name, value];
};
const createFlatVNode = (el, isSVG = false) => {
    const vNode = getVNodeByEl(el, isSVG);
    const { id } = vNode;
    nodeStore.addNode(el, id);
    return vNode;
};
const createElement = (el, inheritSVG) => {
    const vNode = getVNodeByEl(el, inheritSVG);
    const { id } = vNode;
    nodeStore.addNode(el, id);
    if (vNode.type === Node.ELEMENT_NODE) {
        const vn = vNode;
        inheritSVG = inheritSVG || vn.extra.isSVG;
        el.childNodes.forEach((node) => {
            const child = createElement(node, inheritSVG);
            if (child) {
                vn.children.push(child);
            }
        });
    }
    return vNode;
};

class Watcher {
    constructor(options) {
        this.getNode = (id) => nodeStore.getNode.call(nodeStore, id);
        this.getNodeId = (n) => nodeStore.getNodeId.call(nodeStore, n);
        const { emit, context, relatedId } = options;
        this.options = options;
        this.relatedId = relatedId;
        this.context = context;
        this.emit = emit;
    }
    uninstall(fn) {
        this.options.listenStore.add(fn);
    }
    emitData(type, record, callback) {
        const data = {
            type,
            data: record,
            relatedId: this.relatedId,
            time: getRadix64TimeStr()
        };
        if (callback) {
            return this.emit(callback(data));
        }
        this.emit(data);
    }
    registerEvent(options) {
        const { context, eventTypes, handleFn, listenerOptions, type, optimizeOptions, waitTime } = options;
        let listenerHandle;
        if (type === 'throttle') {
            listenerHandle = throttle(handleFn, waitTime, optimizeOptions);
        }
        else {
            listenerHandle = debounce(handleFn, waitTime, optimizeOptions);
        }
        eventTypes
            .map(type => (fn) => {
            context.addEventListener(type, fn, listenerOptions);
        })
            .forEach(handle => handle(listenerHandle));
        this.uninstall(() => {
            eventTypes.forEach(type => {
                context.removeEventListener(type, listenerHandle, listenerOptions);
            });
        });
    }
}

class DOMWatcher extends Watcher {
    constructor(options) {
        super(options);
        this.init();
    }
    init() {
        const Watcher = new MutationObserver(callback => this.mutationCallback(callback));
        Watcher.observe(this.context.document.documentElement, {
            attributeOldValue: true,
            attributes: true,
            characterData: true,
            characterDataOldValue: true,
            childList: true,
            subtree: true
        });
        this.uninstall(() => Watcher.disconnect());
    }
    mutationCallback(records) {
        const addNodesSet = new Set();
        const removeNodesMap = new Map();
        const moveNodesSet = new Set();
        const moveMarkSet = new Set();
        const attrNodesArray = [];
        const textNodesSet = new Set();
        const context = this;
        function deepAdd(n, target) {
            const id = context.getNodeId(n);
            if (id) {
                if (target) {
                    moveNodesSet.add(n);
                    removeNodesMap.delete(n);
                    const targetId = context.getNodeId(target);
                    if (targetId) {
                        moveMarkSet.add(targetId + '@' + id);
                    }
                }
            }
            else {
                addNodesSet.add(n);
            }
            n.childNodes.forEach(cn => deepAdd(cn));
        }
        function deepDeleteInSet(set, n) {
            set.delete(n);
            n.childNodes.forEach(cn => {
                deepDeleteInSet(set, cn);
            });
        }
        function rmNode(n, target) {
            if (!n) {
                return;
            }
            const id = context.getNodeId(n);
            const pId = context.getNodeId(n.parentNode);
            if (addNodesSet.has(n)) {
                deepDeleteInSet(addNodesSet, n);
                removeNodesMap.set(n, target);
            }
            else if (moveNodesSet.has(n) && moveMarkSet.has(pId + '@' + id)) {
                deepDeleteInSet(moveNodesSet, n);
                moveMarkSet.delete(pId + '@' + id);
            }
            else {
                removeNodesMap.set(n, target);
            }
        }
        records.forEach(record => {
            const { target, addedNodes, removedNodes, type, attributeName, oldValue } = record;
            switch (type) {
                case 'attributes':
                    attrNodesArray.push({ key: attributeName, node: target, oldValue });
                    break;
                case 'characterData':
                    textNodesSet.add(target);
                    break;
                case 'childList':
                    addedNodes.forEach(n => deepAdd(n, target));
                    removedNodes.forEach(n => rmNode(n, target));
                    break;
            }
        });
        const addedSiblingMap = new Map();
        addNodesSet.forEach(node => {
            const vn = createFlatVNode(node);
            addedSiblingMap.set(node, vn);
        });
        const addedNodes = [];
        const addedVNodesMap = new Map();
        addNodesSet.forEach(node => {
            const parentId = this.getNodeId(node.parentNode);
            const parentVn = addedVNodesMap.get(parentId);
            const isParentSVG = parentVn && parentVn.extra.isSVG;
            const vn = addedSiblingMap.get(node);
            if (isParentSVG && isVNode(vn)) {
                vn.extra.isSVG = true;
            }
            addedNodes.push({
                parentId,
                nextId: this.getNodeId(node.nextSibling) || null,
                node: vn
            });
            if (isVNode(vn)) {
                addedVNodesMap.set(vn.id, vn);
            }
        });
        const movedNodes = [];
        moveNodesSet.forEach(node => {
            const nodeId = this.getNodeId(node);
            movedNodes.push({
                parentId: this.getNodeId(node.parentNode),
                nextId: this.getNodeId(node.nextSibling) || null,
                id: nodeId
            });
        });
        const removedNodes = [];
        removeNodesMap.forEach((parent, node) => {
            const id = this.getNodeId(node);
            const parentId = this.getNodeId(parent);
            if (id && parentId) {
                removedNodes.push({
                    parentId,
                    id
                });
            }
        });
        const attrs = attrNodesArray
            .map(data => {
            const { node, key, oldValue } = data;
            if (isExistingNode(node)) {
                const value = node.getAttribute(key);
                if (oldValue === value) {
                    return null;
                }
                const id = this.getNodeId(node);
                return {
                    id,
                    key,
                    value
                };
            }
        })
            .filter(Boolean);
        const texts = [...textNodesSet]
            .map(textNode => {
            if (isExistingNode(textNode) && textNode.parentNode) {
                return {
                    id: this.getNodeId(textNode),
                    parentId: this.getNodeId(textNode.parentNode),
                    value: textNode.textContent
                };
            }
        })
            .filter(Boolean);
        const data = {
            addedNodes,
            movedNodes,
            removedNodes,
            attrs,
            texts
        };
        Object.keys(data).forEach((type) => {
            if (!data[type].length) {
                delete data[type];
            }
        });
        if (Object.values(data).some(item => item.length)) {
            this.emitData(RecordType.DOM, data);
        }
    }
}

class FormElementWatcher extends Watcher {
    constructor(options) {
        super(options);
        this.init();
    }
    init() {
        this.listenInputs(this.options);
        this.kidnapInputs(this.options);
    }
    listenInputs(options) {
        const { context } = options;
        const eventTypes = ['input', 'change', 'focus', 'blur'];
        const eventListenerOptions = { once: false, passive: true, capture: true };
        eventTypes
            .map(type => (fn) => {
            context.document.addEventListener(type, fn, eventListenerOptions);
            this.uninstall(() => context.document.removeEventListener(type, fn, eventListenerOptions));
        })
            .forEach(call => call(handleFn.bind(this)));
        function handleFn(e) {
            const eventType = e.type;
            let data;
            switch (eventType) {
                case 'input':
                case 'change':
                    const target = e.target;
                    const inputType = target.getAttribute('type') || 'text';
                    let key = 'value';
                    const value = target.value || '';
                    let newValue = '';
                    const patches = [];
                    if (inputType === 'checkbox' || inputType === 'radio') {
                        if (eventType === 'input') {
                            return;
                        }
                        key = 'checked';
                        newValue = target.checked;
                    }
                    else {
                        if (value === target.oldValue) {
                            return;
                        }
                        if (value.length <= 20 || !target.oldValue) {
                            newValue = value;
                        }
                        else {
                            patches.push(...getStrDiffPatches(target.oldValue, value));
                        }
                        target.oldValue = value;
                    }
                    data = {
                        type: eventType === 'input' ? FormElementEvent.INPUT : FormElementEvent.CHANGE,
                        id: this.getNodeId(e.target),
                        key,
                        value: !patches.length ? newValue : value,
                        patches
                    };
                    break;
                case 'focus':
                    data = {
                        type: FormElementEvent.FOCUS,
                        id: this.getNodeId(e.target)
                    };
                    break;
                case 'blur':
                    data = {
                        type: FormElementEvent.BLUR,
                        id: this.getNodeId(e.target)
                    };
                    break;
            }
            this.emitData(RecordType.FORM_EL, data);
        }
    }
    kidnapInputs(options) {
        const { context } = options;
        const self = this;
        const elementList = [
            [context.HTMLInputElement.prototype, 'value'],
            [context.HTMLInputElement.prototype, 'checked'],
            [context.HTMLSelectElement.prototype, 'value'],
            [context.HTMLTextAreaElement.prototype, 'value']
        ];
        const handles = elementList.map(item => {
            return () => {
                const [target, key] = item;
                const original = context.Object.getOwnPropertyDescriptor(target, key);
                context.Object.defineProperty(target, key, {
                    set: function (value) {
                        setTimeout(() => {
                            handleEvent.call(this, key, value);
                        });
                        if (original && original.set) {
                            original.set.call(this, value);
                        }
                    }
                });
                this.uninstall(() => {
                    if (original) {
                        context.Object.defineProperty(target, key, original);
                    }
                });
            };
        });
        handles.concat([]).forEach(handle => handle());
        function handleEvent(key, value) {
            const data = {
                type: FormElementEvent.PROP,
                id: self.getNodeId(this),
                key,
                value
            };
            self.emitData(RecordType.FORM_EL, data);
        }
    }
}

class LocationWatcher extends Watcher {
    constructor(options) {
        super(options);
        this.kidnapLocation = (type) => {
            const ctx = this.context;
            const original = ctx.history[type];
            return function () {
                const result = original.apply(this, arguments);
                const e = new Event(type);
                e.arguments = arguments;
                ctx.dispatchEvent(e);
                return result;
            };
        };
        this.locationHandle = (e) => {
            var _a, _b;
            const contextNodeId = this.getContextNodeId(e);
            const [, , path] = e.arguments || [, , (_b = (_a = this.context) === null || _a === void 0 ? void 0 : _a.location) === null || _b === void 0 ? void 0 : _b.pathname];
            const { href, hash } = this.context.location;
            this.emitData(RecordType.LOCATION, {
                contextNodeId,
                href,
                hash,
                path
            });
        };
        this.init();
    }
    init() {
        this.context.history.pushState = this.kidnapLocation('pushState');
        this.context.history.replaceState = this.kidnapLocation('replaceState');
        const types = ['replaceState', 'pushState', 'popstate', 'hashchange'];
        types.forEach(type => this.toggleListener('add', type, this.locationHandle));
        this.uninstall(() => {
            types.forEach(type => this.toggleListener('rm', type, this.locationHandle));
        });
    }
    toggleListener(methodType, type, handle) {
        this.context[methodType === 'add' ? 'addEventListener' : 'removeEventListener'](type, handle);
    }
    getContextNodeId(e) {
        return this.getNodeId(e.target.document.documentElement);
    }
}

class MouseWatcher extends Watcher {
    constructor(options) {
        super(options);
        this.init();
    }
    init() {
        this.mouseMove();
        this.mouseClick();
        this.detectScrolling();
    }
    detectScrolling() {
        let timer;
        const evt = () => {
            this.scrolling = true;
            clearTimeout(timer);
            timer = this.context.setTimeout(() => {
                this.scrolling = false;
                if (this.latestMove) {
                    this.sendMoveData(this.latestMove);
                    this.latestMove = null;
                }
            }, 500);
        };
        const eventNames = ['mousewheel', 'scroll'];
        eventNames.forEach(name => {
            this.context.document.addEventListener(name, evt, true);
            this.uninstall(() => {
                this.context.document.removeEventListener(name, evt, true);
            });
        });
    }
    sendMoveData(position) {
        const { x, y, id } = position;
        this.emitData(RecordType.MOUSE, {
            type: MouseEventType.MOVE,
            id,
            x,
            y
        });
    }
    mouseMove() {
        const evt = (e) => {
            const offsetPosition = this.getOffsetPosition(e, this.context);
            if (this.scrolling) {
                this.latestMove = offsetPosition;
                return;
            }
            offsetPosition && this.sendMoveData(offsetPosition);
        };
        const name = 'mousemove';
        const listenerHandle = throttle(evt, 300, {
            trailing: true,
            leading: true
        });
        this.context.document.addEventListener(name, listenerHandle);
        this.uninstall(() => {
            this.context.document.removeEventListener(name, listenerHandle);
        });
    }
    mouseClick() {
        const evt = (e) => {
            const offsetPosition = this.getOffsetPosition(e, this.context);
            if (offsetPosition) {
                this.emitData(RecordType.MOUSE, Object.assign({ type: MouseEventType.CLICK }, offsetPosition));
            }
        };
        const name = 'click';
        const listenerHandle = throttle(evt, 250);
        this.uninstall(() => {
            this.context.document.removeEventListener(name, listenerHandle);
        });
        this.context.document.addEventListener(name, listenerHandle);
    }
    getOffsetPosition(event, context) {
        var _a;
        const { mode } = context.G_RECORD_OPTIONS;
        const { view, target, x, y, offsetX, offsetY } = event;
        if (view === context) {
            const doc = target.ownerDocument;
            function isInline(target) {
                return context.getComputedStyle(target).display === 'inline';
            }
            function getRotate(node) {
                if (!isExistingNode(node)) {
                    return 0;
                }
                const computedStyle = context.getComputedStyle(node);
                const matrix = computedStyle['transform'];
                let angle;
                if (matrix !== 'none') {
                    const values = matrix.split('(')[1].split(')')[0].split(',');
                    const a = Number(values[0]);
                    const b = Number(values[1]);
                    angle = Math.round(Math.atan2(b, a) * (180 / Math.PI));
                }
                else {
                    angle = 0;
                }
                return angle < 0 ? angle + 360 : angle;
            }
            let node = target;
            let id = undefined;
            if (isExistingNode(node)) {
                while (isInline(node)) {
                    node = node.parentElement;
                }
                id = this.getNodeId(node);
            }
            const deg = getRotate(node);
            const position = deg
                ? { x, y }
                : {
                    id,
                    x: offsetX,
                    y: offsetY
                };
            const frameElement = (_a = doc === null || doc === void 0 ? void 0 : doc.defaultView) === null || _a === void 0 ? void 0 : _a.frameElement;
            if (frameElement && mode === 'default') {
                position.y += frameElement.offsetTop;
                position.x += frameElement.offsetLeft;
            }
            return position;
        }
        return false;
    }
}

class ScrollWatcher extends Watcher {
    constructor(options) {
        super(options);
        this.getCompatibleTarget = (target) => target.scrollingElement || target.documentElement;
        this.scrollTop = (target) => target.scrollTop;
        this.scrollLeft = (target) => target.scrollLeft;
        this.init();
    }
    init() {
        const { scrollingElement } = this.context.document;
        this.emitData(...this.wrapData(scrollingElement || document));
        this.registerEvent({
            context: this.context,
            eventTypes: ['scroll'],
            handleFn: this.handleFn.bind(this),
            listenerOptions: { capture: true },
            type: 'throttle',
            optimizeOptions: { leading: true, trailing: true },
            waitTime: 300
        });
    }
    wrapData(target) {
        const element = target instanceof this.context.HTMLElement ? target : this.getCompatibleTarget(target);
        return [
            RecordType.SCROLL,
            {
                id: this.getNodeId(element) || null,
                top: this.scrollTop(element),
                left: this.scrollLeft(element)
            }
        ];
    }
    handleFn(e) {
        const { type, target } = e;
        if (type === 'scroll') {
            this.emitData(...this.wrapData(target));
        }
    }
}

class WindowWatcher extends Watcher {
    constructor(options) {
        super(options);
        this.width = () => this.context.innerWidth;
        this.height = () => this.context.innerHeight;
        this.init();
    }
    init() {
        this.emitData(...this.wrapData(this.context.document));
        this.registerEvent({
            context: this.context,
            eventTypes: ['resize'],
            handleFn: this.handleFn.bind(this),
            listenerOptions: { capture: true },
            type: 'throttle',
            optimizeOptions: { trailing: true },
            waitTime: 500
        });
    }
    handleFn(e) {
        const { type, target } = e;
        if (type === 'resize') {
            this.emitData(...this.wrapData(target));
        }
    }
    wrapData(target) {
        return [
            RecordType.WINDOW,
            {
                id: this.getNodeId(target) || null,
                width: this.width(),
                height: this.height()
            }
        ];
    }
}

class CanvasWatcher extends Watcher {
    constructor(options) {
        super(options);
        this.aggregateDataEmitter = this.aggregateManager((id, strokes) => {
            this.emitData(RecordType.CANVAS, {
                id,
                strokes
            });
        }, 30);
        this.init();
    }
    init() {
        const self = this;
        const canvasElements = document.getElementsByTagName('canvas');
        Array.from(canvasElements).forEach(canvas => {
            const dataURL = canvas.toDataURL();
            this.emitData(RecordType.CANVAS, {
                id: this.getNodeId(canvas),
                src: dataURL
            });
        });
        const ctxProto = CanvasRenderingContext2D.prototype;
        const names = Object.getOwnPropertyNames(ctxProto);
        names.forEach(name => {
            const original = Object.getOwnPropertyDescriptor(ctxProto, name);
            const method = original.value;
            if (name === 'canvas') {
                return;
            }
            Object.defineProperty(ctxProto, name, {
                get() {
                    const context = this;
                    const id = self.getNodeId(this.canvas);
                    return typeof method === 'function'
                        ? function () {
                            const args = [...arguments];
                            if (name === 'drawImage') {
                                args[0] = id;
                            }
                            self.aggregateDataEmitter(id, name, args);
                            return method.apply(context, arguments);
                        }
                        : null;
                },
                set: function (value) {
                    var _a;
                    const id = self.getNodeId(this.canvas);
                    if (typeof value !== 'function') {
                        self.aggregateDataEmitter(id, name, value);
                    }
                    return (_a = original.set) === null || _a === void 0 ? void 0 : _a.apply(this, arguments);
                }
            });
            this.uninstall(() => {
                Object.defineProperty(ctxProto, name, original);
            });
        });
    }
    aggregateManager(func, wait) {
        const tasks = Object.create(null);
        const timeouts = Object.create(null);
        const blockInstances = [CanvasGradient];
        return function (id, prop, args) {
            const context = this;
            function emitData(id) {
                const timeout = timeouts[id];
                clearTimeout(timeout);
                timeouts[id] = 0;
                const strokes = tasks[id].slice();
                const clearIndex = strokes.reverse().findIndex(stroke => {
                    if (stroke.name === 'clearRect') {
                        return true;
                    }
                });
                const aSliceOfShit = !~clearIndex ? strokes.reverse() : strokes.slice(0, clearIndex + 1).reverse();
                tasks[id].length = 0;
                func.call(context, id, aSliceOfShit);
            }
            if (!tasks[id]) {
                tasks[id] = [];
            }
            if (!blockInstances.some(instance => args instanceof instance)) {
                tasks[id].push({
                    name: prop,
                    args
                });
            }
            if (!timeouts[id]) {
                const timeout = window.setTimeout(() => {
                    emitData(id);
                }, wait);
                timeouts[id] = timeout;
            }
        };
    }
}

class TerminateWatcher extends Watcher {
    constructor(options) {
        super(options);
        this.init();
    }
    init() {
        this.context.addEventListener('beforeunload', this.handleFn);
        this.uninstall(() => {
            this.context.removeEventListener('beforeunload', this.handleFn);
        });
    }
    handleFn() {
    }
    wrapData() {
        return [RecordType.TERMINATE, null];
    }
}

const watchers = {
    DOMWatcher,
    FormElementWatcher,
    LocationWatcher,
    MouseWatcher,
    ScrollWatcher,
    WindowWatcher,
    CanvasWatcher,
    TerminateWatcher
};

class AudioRecorder {
    constructor(opts = AudioRecorder.defaultRecordOptions) {
        this.setOptions(opts);
    }
    getOptions() {
        return this.opts;
    }
    setOptions(opts = AudioRecorder.defaultRecordOptions) {
        this.opts = Object.assign(Object.assign({}, this.opts), opts);
    }
    beginRecord() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: this.opts.sampleRate });
        this.mediaNode = this.audioContext.createMediaStreamSource(this.mediaStream);
        const createScript = this.audioContext.createScriptProcessor;
        this.processNode = createScript.call(this.audioContext, 4096, this.opts.channelCount, this.opts.channelCount);
        this.processNode.connect(this.audioContext.destination);
        this.processNode.onaudioprocess = onAudioProcess.bind(this);
        function onAudioProcess(event) {
            const inputBuffer = event.inputBuffer;
            const audioBuffer_0 = inputBuffer.getChannelData(0).slice();
            if (this.onProgress) {
                const data = [float32ArrayToBase64(audioBuffer_0)];
                this.onProgress(data);
            }
        }
        this.mediaNode.connect(this.processNode);
    }
    initRecorder() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                window.navigator.mediaDevices
                    .getUserMedia({
                    audio: {
                        sampleRate: this.opts.sampleRate,
                        channelCount: this.opts.channelCount,
                        echoCancellation: true,
                        autoGainControl: true,
                        noiseSuppression: true,
                        latency: 0
                    }
                })
                    .then(mediaStream => resolve(mediaStream))
                    .catch(err => reject(err));
            });
        });
    }
    start(opts = AudioRecorder.defaultRecordOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            this.setOptions(opts);
            this.mediaStream = yield this.initRecorder();
            this.mediaStream && this.beginRecord();
        });
    }
    stop() {
        this.mediaStream && this.mediaStream.getAudioTracks()[0].stop();
        this.processNode && this.processNode.disconnect();
        this.mediaNode && this.mediaNode.disconnect();
    }
    pause() { }
    resume() { }
}
AudioRecorder.defaultRecordOptions = {
    sampleBits: 8,
    sampleRate: 8000,
    channelCount: 1
};

class RecordAudio extends Watcher {
    constructor(options) {
        super(options);
        this.init();
    }
    init() {
        const recorder = new AudioRecorder({
            sampleBits: 8,
            sampleRate: 8000,
            channelCount: 1
        });
        recorder.start();
        this.uninstall(() => {
            recorder.stop();
        });
        this.emitData(RecordType.AUDIO, {
            type: 'opts',
            data: recorder.getOptions()
        });
        recorder.onProgress = audioBase64Data => {
            this.emitData(RecordType.AUDIO, {
                type: 'base64',
                data: audioBase64Data
            });
        };
    }
}

class Snapshot extends Watcher {
    constructor(options) {
        super(options);
        this.init();
    }
    init() {
        const snapshotData = this.DOMSnapshotData(this.options.context || window);
        this.emitData(RecordType.SNAPSHOT, snapshotData);
    }
    DOMSnapshotData(context) {
        return Object.assign({ vNode: createElement(context.document.documentElement) }, this.getInitInfo(context));
    }
    getInitInfo(context) {
        const { name, publicId, systemId } = context.document.doctype || {};
        const doctype = () => ({ name, publicId, systemId });
        const href = () => context.location.href;
        const width = () => context.innerWidth;
        const height = () => context.innerHeight;
        const scrollTop = () => context.pageYOffset;
        const scrollLeft = () => context.pageXOffset;
        const getFrameElement = () => context.frameElement;
        const frameElement = getFrameElement();
        const frameId = nodeStore.getNodeId(frameElement) || null;
        return {
            doctype: doctype(),
            href: href(),
            scrollTop: scrollTop(),
            scrollLeft: scrollLeft(),
            width: width(),
            height: height(),
            frameId
        };
    }
}

var name = "timecat";
var author = "oct16";
var version = "1.2.0-alpha.12";
var description = "TimeCat Web Recorder";
var main = "lib/timecat.cjs.js";
var module = "lib/timecat.esm.js";
var files = [
	"lib"
];
var keywords = [
	"recorder",
	"replay",
	"player",
	"virtual-dom",
	"screenshots",
	"audio",
	"video",
	"chrome",
	"chrome-extension"
];
var license = "GPL-3.0-or-later";
var workspaces = [
	"packages/*"
];
var scripts = {
	dev: "node scripts/dev.js",
	build: "node scripts/build.js",
	release: "node scripts/release.js",
	checkyarn: "node ./scripts/checkYarn.js",
	"ls-lint": "ls-lint",
	lint: "eslint 'packages/**/*.{js,ts}' --quiet --fix",
	test: "jest",
	live: "node scripts/live.js",
	embed: "cp packages/timecat/dist/timecat.global.prod.js ../TimeCatChrome/src/assets/",
	gh: "node scripts/gh.js",
	count: "git ls-files --exclude-standard -- ':!:**/*.[pjs][npv]g' ':!:.eslintrc' ':!: examples/*' ':!:.gitignore' ':!:README.*' ':!:LICENSE' ':!:yarn.lock' | xargs wc -l"
};
var engines = {
	node: ">=10.0.0"
};
var devDependencies = {
	"@ls-lint/ls-lint": "^1.9.2",
	"@microsoft/api-extractor": "^7.9.13",
	"@rollup/plugin-commonjs": "^11.0.2",
	"@rollup/plugin-html": "^0.2.0",
	"@rollup/plugin-json": "^4.1.0",
	"@rollup/plugin-node-resolve": "^7.1.3",
	"@rollup/plugin-replace": "^2.3.1",
	"@types/diff": "^4.0.2",
	"@types/fingerprintjs2": "^2.0.0",
	"@types/jest": "^26.0.0",
	"@types/node": "^13.9.2",
	"@types/pako": "^1.0.1",
	"@types/smoothscroll-polyfill": "^0.3.1",
	"@types/tapable": "^1.0.6",
	"@typescript-eslint/eslint-plugin": "^3.9.0",
	"@typescript-eslint/parser": "^3.9.0",
	"@zerollup/ts-transform-paths": "^1.7.17",
	brotli: "^1.3.2",
	"browser-sync": "^2.26.12",
	chalk: "^4.1.0",
	diff: "^4.0.2",
	enquirer: "^2.3.6",
	eslint: "^7.6.0",
	"eslint-config-prettier": "^6.11.0",
	"eslint-plugin-node": "^11.1.0",
	"eslint-plugin-prettier": "^3.1.4",
	execa: "^4.0.0",
	fingerprintjs2: "^2.1.2",
	"fs-extra": "^8.1.0",
	husky: "^4.2.5",
	jest: "^26.0.1",
	koa: "^2.13.0",
	"lint-staged": "^10.2.11",
	minimist: "^1.2.5",
	pako: "^1.0.11",
	prettier: "^2.0.5",
	rollup: "^2.26.10",
	"rollup-plugin-node-polyfills": "^0.2.1",
	"rollup-plugin-scss": "^2.5.0",
	"rollup-plugin-string": "^3.0.0",
	"rollup-plugin-terser": "^7.0.0",
	"rollup-plugin-typescript2": "^0.26.0",
	"rollup-plugin-visualizer": "^4.0.4",
	semver: "^7.3.2",
	"smoothscroll-polyfill": "^0.4.4",
	tapable: "^1.1.3",
	"ts-jest": "^26.1.0",
	typescript: "^3.9.7"
};
var repository = {
	type: "git",
	url: "git+https://github.com/oct16/TimeCat.git"
};
var bugs = {
	url: "https://github.com/oct16/TimeCat/issues"
};
var homepage = "https://github.com/oct16/TimeCat#readme";
var pkg = {
	"private": true,
	name: name,
	author: author,
	version: version,
	description: description,
	main: main,
	module: module,
	files: files,
	keywords: keywords,
	license: license,
	workspaces: workspaces,
	scripts: scripts,
	"lint-staged": {
	"*.js": [
		"prettier --write"
	],
	"*.ts?(x)": [
		"eslint",
		"prettier --parser=typescript --write"
	]
},
	engines: engines,
	devDependencies: devDependencies,
	repository: repository,
	bugs: bugs,
	homepage: homepage
};

var fingerprint2 = createCommonjsModule(function (module) {
/*
* Fingerprintjs2 2.1.2 - Modern & flexible browser fingerprint library v2
* https://github.com/Valve/fingerprintjs2
* Copyright (c) 2020 Valentin Vasilyev (valentin@fingerprintjs.com)
* Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
*
* THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
* AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
* IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
* ARE DISCLAIMED. IN NO EVENT SHALL VALENTIN VASILYEV BE LIABLE FOR ANY
* DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
* (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
* LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
* ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
* (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
* THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
/*
* This software contains code from open-source projects:
* MurmurHash3 by Karan Lyons (https://github.com/karanlyons/murmurHash3.js)
*/

/* global define */
(function (name, context, definition) {
  if (typeof window !== 'undefined' && typeof undefined === 'function' && undefined.amd) { undefined(definition); } else if ( module.exports) { module.exports = definition(); } else if (context.exports) { context.exports = definition(); } else { context[name] = definition(); }
})('Fingerprint2', commonjsGlobal, function () {

  // detect if object is array
  // only implement if no native implementation is available
  if (typeof Array.isArray === 'undefined') {
    Array.isArray = function (obj) {
      return Object.prototype.toString.call(obj) === '[object Array]'
    };
  }
  /// MurmurHash3 related functions

  //
  // Given two 64bit ints (as an array of two 32bit ints) returns the two
  // added together as a 64bit int (as an array of two 32bit ints).
  //
  var x64Add = function (m, n) {
    m = [m[0] >>> 16, m[0] & 0xffff, m[1] >>> 16, m[1] & 0xffff];
    n = [n[0] >>> 16, n[0] & 0xffff, n[1] >>> 16, n[1] & 0xffff];
    var o = [0, 0, 0, 0];
    o[3] += m[3] + n[3];
    o[2] += o[3] >>> 16;
    o[3] &= 0xffff;
    o[2] += m[2] + n[2];
    o[1] += o[2] >>> 16;
    o[2] &= 0xffff;
    o[1] += m[1] + n[1];
    o[0] += o[1] >>> 16;
    o[1] &= 0xffff;
    o[0] += m[0] + n[0];
    o[0] &= 0xffff;
    return [(o[0] << 16) | o[1], (o[2] << 16) | o[3]]
  };

  //
  // Given two 64bit ints (as an array of two 32bit ints) returns the two
  // multiplied together as a 64bit int (as an array of two 32bit ints).
  //
  var x64Multiply = function (m, n) {
    m = [m[0] >>> 16, m[0] & 0xffff, m[1] >>> 16, m[1] & 0xffff];
    n = [n[0] >>> 16, n[0] & 0xffff, n[1] >>> 16, n[1] & 0xffff];
    var o = [0, 0, 0, 0];
    o[3] += m[3] * n[3];
    o[2] += o[3] >>> 16;
    o[3] &= 0xffff;
    o[2] += m[2] * n[3];
    o[1] += o[2] >>> 16;
    o[2] &= 0xffff;
    o[2] += m[3] * n[2];
    o[1] += o[2] >>> 16;
    o[2] &= 0xffff;
    o[1] += m[1] * n[3];
    o[0] += o[1] >>> 16;
    o[1] &= 0xffff;
    o[1] += m[2] * n[2];
    o[0] += o[1] >>> 16;
    o[1] &= 0xffff;
    o[1] += m[3] * n[1];
    o[0] += o[1] >>> 16;
    o[1] &= 0xffff;
    o[0] += (m[0] * n[3]) + (m[1] * n[2]) + (m[2] * n[1]) + (m[3] * n[0]);
    o[0] &= 0xffff;
    return [(o[0] << 16) | o[1], (o[2] << 16) | o[3]]
  };
  //
  // Given a 64bit int (as an array of two 32bit ints) and an int
  // representing a number of bit positions, returns the 64bit int (as an
  // array of two 32bit ints) rotated left by that number of positions.
  //
  var x64Rotl = function (m, n) {
    n %= 64;
    if (n === 32) {
      return [m[1], m[0]]
    } else if (n < 32) {
      return [(m[0] << n) | (m[1] >>> (32 - n)), (m[1] << n) | (m[0] >>> (32 - n))]
    } else {
      n -= 32;
      return [(m[1] << n) | (m[0] >>> (32 - n)), (m[0] << n) | (m[1] >>> (32 - n))]
    }
  };
  //
  // Given a 64bit int (as an array of two 32bit ints) and an int
  // representing a number of bit positions, returns the 64bit int (as an
  // array of two 32bit ints) shifted left by that number of positions.
  //
  var x64LeftShift = function (m, n) {
    n %= 64;
    if (n === 0) {
      return m
    } else if (n < 32) {
      return [(m[0] << n) | (m[1] >>> (32 - n)), m[1] << n]
    } else {
      return [m[1] << (n - 32), 0]
    }
  };
  //
  // Given two 64bit ints (as an array of two 32bit ints) returns the two
  // xored together as a 64bit int (as an array of two 32bit ints).
  //
  var x64Xor = function (m, n) {
    return [m[0] ^ n[0], m[1] ^ n[1]]
  };
  //
  // Given a block, returns murmurHash3's final x64 mix of that block.
  // (`[0, h[0] >>> 1]` is a 33 bit unsigned right shift. This is the
  // only place where we need to right shift 64bit ints.)
  //
  var x64Fmix = function (h) {
    h = x64Xor(h, [0, h[0] >>> 1]);
    h = x64Multiply(h, [0xff51afd7, 0xed558ccd]);
    h = x64Xor(h, [0, h[0] >>> 1]);
    h = x64Multiply(h, [0xc4ceb9fe, 0x1a85ec53]);
    h = x64Xor(h, [0, h[0] >>> 1]);
    return h
  };

  //
  // Given a string and an optional seed as an int, returns a 128 bit
  // hash using the x64 flavor of MurmurHash3, as an unsigned hex.
  //
  var x64hash128 = function (key, seed) {
    key = key || '';
    seed = seed || 0;
    var remainder = key.length % 16;
    var bytes = key.length - remainder;
    var h1 = [0, seed];
    var h2 = [0, seed];
    var k1 = [0, 0];
    var k2 = [0, 0];
    var c1 = [0x87c37b91, 0x114253d5];
    var c2 = [0x4cf5ad43, 0x2745937f];
    for (var i = 0; i < bytes; i = i + 16) {
      k1 = [((key.charCodeAt(i + 4) & 0xff)) | ((key.charCodeAt(i + 5) & 0xff) << 8) | ((key.charCodeAt(i + 6) & 0xff) << 16) | ((key.charCodeAt(i + 7) & 0xff) << 24), ((key.charCodeAt(i) & 0xff)) | ((key.charCodeAt(i + 1) & 0xff) << 8) | ((key.charCodeAt(i + 2) & 0xff) << 16) | ((key.charCodeAt(i + 3) & 0xff) << 24)];
      k2 = [((key.charCodeAt(i + 12) & 0xff)) | ((key.charCodeAt(i + 13) & 0xff) << 8) | ((key.charCodeAt(i + 14) & 0xff) << 16) | ((key.charCodeAt(i + 15) & 0xff) << 24), ((key.charCodeAt(i + 8) & 0xff)) | ((key.charCodeAt(i + 9) & 0xff) << 8) | ((key.charCodeAt(i + 10) & 0xff) << 16) | ((key.charCodeAt(i + 11) & 0xff) << 24)];
      k1 = x64Multiply(k1, c1);
      k1 = x64Rotl(k1, 31);
      k1 = x64Multiply(k1, c2);
      h1 = x64Xor(h1, k1);
      h1 = x64Rotl(h1, 27);
      h1 = x64Add(h1, h2);
      h1 = x64Add(x64Multiply(h1, [0, 5]), [0, 0x52dce729]);
      k2 = x64Multiply(k2, c2);
      k2 = x64Rotl(k2, 33);
      k2 = x64Multiply(k2, c1);
      h2 = x64Xor(h2, k2);
      h2 = x64Rotl(h2, 31);
      h2 = x64Add(h2, h1);
      h2 = x64Add(x64Multiply(h2, [0, 5]), [0, 0x38495ab5]);
    }
    k1 = [0, 0];
    k2 = [0, 0];
    switch (remainder) {
      case 15:
        k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 14)], 48));
      // fallthrough
      case 14:
        k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 13)], 40));
      // fallthrough
      case 13:
        k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 12)], 32));
      // fallthrough
      case 12:
        k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 11)], 24));
      // fallthrough
      case 11:
        k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 10)], 16));
      // fallthrough
      case 10:
        k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 9)], 8));
      // fallthrough
      case 9:
        k2 = x64Xor(k2, [0, key.charCodeAt(i + 8)]);
        k2 = x64Multiply(k2, c2);
        k2 = x64Rotl(k2, 33);
        k2 = x64Multiply(k2, c1);
        h2 = x64Xor(h2, k2);
      // fallthrough
      case 8:
        k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 7)], 56));
      // fallthrough
      case 7:
        k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 6)], 48));
      // fallthrough
      case 6:
        k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 5)], 40));
      // fallthrough
      case 5:
        k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 4)], 32));
      // fallthrough
      case 4:
        k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 3)], 24));
      // fallthrough
      case 3:
        k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 2)], 16));
      // fallthrough
      case 2:
        k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 1)], 8));
      // fallthrough
      case 1:
        k1 = x64Xor(k1, [0, key.charCodeAt(i)]);
        k1 = x64Multiply(k1, c1);
        k1 = x64Rotl(k1, 31);
        k1 = x64Multiply(k1, c2);
        h1 = x64Xor(h1, k1);
      // fallthrough
    }
    h1 = x64Xor(h1, [0, key.length]);
    h2 = x64Xor(h2, [0, key.length]);
    h1 = x64Add(h1, h2);
    h2 = x64Add(h2, h1);
    h1 = x64Fmix(h1);
    h2 = x64Fmix(h2);
    h1 = x64Add(h1, h2);
    h2 = x64Add(h2, h1);
    return ('00000000' + (h1[0] >>> 0).toString(16)).slice(-8) + ('00000000' + (h1[1] >>> 0).toString(16)).slice(-8) + ('00000000' + (h2[0] >>> 0).toString(16)).slice(-8) + ('00000000' + (h2[1] >>> 0).toString(16)).slice(-8)
  };

  var defaultOptions = {
    preprocessor: null,
    audio: {
      timeout: 1000,
      // On iOS 11, audio context can only be used in response to user interaction.
      // We require users to explicitly enable audio fingerprinting on iOS 11.
      // See https://stackoverflow.com/questions/46363048/onaudioprocess-not-called-on-ios11#46534088
      excludeIOS11: true
    },
    fonts: {
      swfContainerId: 'fingerprintjs2',
      swfPath: 'flash/compiled/FontList.swf',
      userDefinedFonts: [],
      extendedJsFonts: false
    },
    screen: {
      // To ensure consistent fingerprints when users rotate their mobile devices
      detectScreenOrientation: true
    },
    plugins: {
      sortPluginsFor: [/palemoon/i],
      excludeIE: false
    },
    extraComponents: [],
    excludes: {
      // Unreliable on Windows, see https://github.com/Valve/fingerprintjs2/issues/375
      'enumerateDevices': true,
      // devicePixelRatio depends on browser zoom, and it's impossible to detect browser zoom
      'pixelRatio': true,
      // DNT depends on incognito mode for some browsers (Chrome) and it's impossible to detect incognito mode
      'doNotTrack': true,
      // uses js fonts already
      'fontsFlash': true
    },
    NOT_AVAILABLE: 'not available',
    ERROR: 'error',
    EXCLUDED: 'excluded'
  };

  var each = function (obj, iterator) {
    if (Array.prototype.forEach && obj.forEach === Array.prototype.forEach) {
      obj.forEach(iterator);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        iterator(obj[i], i, obj);
      }
    } else {
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          iterator(obj[key], key, obj);
        }
      }
    }
  };

  var map = function (obj, iterator) {
    var results = [];
    // Not using strict equality so that this acts as a
    // shortcut to checking for `null` and `undefined`.
    if (obj == null) {
      return results
    }
    if (Array.prototype.map && obj.map === Array.prototype.map) { return obj.map(iterator) }
    each(obj, function (value, index, list) {
      results.push(iterator(value, index, list));
    });
    return results
  };

  var extendSoft = function (target, source) {
    if (source == null) { return target }
    var value;
    var key;
    for (key in source) {
      value = source[key];
      if (value != null && !(Object.prototype.hasOwnProperty.call(target, key))) {
        target[key] = value;
      }
    }
    return target
  };

  // https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices
  var enumerateDevicesKey = function (done, options) {
    if (!isEnumerateDevicesSupported()) {
      return done(options.NOT_AVAILABLE)
    }
    navigator.mediaDevices.enumerateDevices().then(function (devices) {
      done(devices.map(function (device) {
        return 'id=' + device.deviceId + ';gid=' + device.groupId + ';' + device.kind + ';' + device.label
      }));
    })['catch'](function (error) {
      done(error);
    });
  };

  var isEnumerateDevicesSupported = function () {
    return (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices)
  };
  // Inspired by and based on https://github.com/cozylife/audio-fingerprint
  var audioKey = function (done, options) {
    var audioOptions = options.audio;
    if (audioOptions.excludeIOS11 && navigator.userAgent.match(/OS 11.+Version\/11.+Safari/)) {
      // See comment for excludeUserAgent and https://stackoverflow.com/questions/46363048/onaudioprocess-not-called-on-ios11#46534088
      return done(options.EXCLUDED)
    }

    var AudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;

    if (AudioContext == null) {
      return done(options.NOT_AVAILABLE)
    }

    var context = new AudioContext(1, 44100, 44100);

    var oscillator = context.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(10000, context.currentTime);

    var compressor = context.createDynamicsCompressor();
    each([
      ['threshold', -50],
      ['knee', 40],
      ['ratio', 12],
      ['reduction', -20],
      ['attack', 0],
      ['release', 0.25]
    ], function (item) {
      if (compressor[item[0]] !== undefined && typeof compressor[item[0]].setValueAtTime === 'function') {
        compressor[item[0]].setValueAtTime(item[1], context.currentTime);
      }
    });

    oscillator.connect(compressor);
    compressor.connect(context.destination);
    oscillator.start(0);
    context.startRendering();

    var audioTimeoutId = setTimeout(function () {
      console.warn('Audio fingerprint timed out. Please report bug at https://github.com/Valve/fingerprintjs2 with your user agent: "' + navigator.userAgent + '".');
      context.oncomplete = function () { };
      context = null;
      return done('audioTimeout')
    }, audioOptions.timeout);

    context.oncomplete = function (event) {
      var fingerprint;
      try {
        clearTimeout(audioTimeoutId);
        fingerprint = event.renderedBuffer.getChannelData(0)
          .slice(4500, 5000)
          .reduce(function (acc, val) { return acc + Math.abs(val) }, 0)
          .toString();
        oscillator.disconnect();
        compressor.disconnect();
      } catch (error) {
        done(error);
        return
      }
      done(fingerprint);
    };
  };
  var UserAgent = function (done) {
    done(navigator.userAgent);
  };
  var webdriver = function (done, options) {
    done(navigator.webdriver == null ? options.NOT_AVAILABLE : navigator.webdriver);
  };
  var languageKey = function (done, options) {
    done(navigator.language || navigator.userLanguage || navigator.browserLanguage || navigator.systemLanguage || options.NOT_AVAILABLE);
  };
  var colorDepthKey = function (done, options) {
    done(window.screen.colorDepth || options.NOT_AVAILABLE);
  };
  var deviceMemoryKey = function (done, options) {
    done(navigator.deviceMemory || options.NOT_AVAILABLE);
  };
  var pixelRatioKey = function (done, options) {
    done(window.devicePixelRatio || options.NOT_AVAILABLE);
  };
  var screenResolutionKey = function (done, options) {
    done(getScreenResolution(options));
  };
  var getScreenResolution = function (options) {
    var resolution = [window.screen.width, window.screen.height];
    if (options.screen.detectScreenOrientation) {
      resolution.sort().reverse();
    }
    return resolution
  };
  var availableScreenResolutionKey = function (done, options) {
    done(getAvailableScreenResolution(options));
  };
  var getAvailableScreenResolution = function (options) {
    if (window.screen.availWidth && window.screen.availHeight) {
      var available = [window.screen.availHeight, window.screen.availWidth];
      if (options.screen.detectScreenOrientation) {
        available.sort().reverse();
      }
      return available
    }
    // headless browsers
    return options.NOT_AVAILABLE
  };
  var timezoneOffset = function (done) {
    done(new Date().getTimezoneOffset());
  };
  var timezone = function (done, options) {
    if (window.Intl && window.Intl.DateTimeFormat) {
      done(new window.Intl.DateTimeFormat().resolvedOptions().timeZone);
      return
    }
    done(options.NOT_AVAILABLE);
  };
  var sessionStorageKey = function (done, options) {
    done(hasSessionStorage(options));
  };
  var localStorageKey = function (done, options) {
    done(hasLocalStorage(options));
  };
  var indexedDbKey = function (done, options) {
    done(hasIndexedDB(options));
  };
  var addBehaviorKey = function (done) {
    // body might not be defined at this point or removed programmatically
    done(!!(document.body && document.body.addBehavior));
  };
  var openDatabaseKey = function (done) {
    done(!!window.openDatabase);
  };
  var cpuClassKey = function (done, options) {
    done(getNavigatorCpuClass(options));
  };
  var platformKey = function (done, options) {
    done(getNavigatorPlatform(options));
  };
  var doNotTrackKey = function (done, options) {
    done(getDoNotTrack(options));
  };
  var canvasKey = function (done, options) {
    if (isCanvasSupported()) {
      done(getCanvasFp(options));
      return
    }
    done(options.NOT_AVAILABLE);
  };
  var webglKey = function (done, options) {
    if (isWebGlSupported()) {
      done(getWebglFp());
      return
    }
    done(options.NOT_AVAILABLE);
  };
  var webglVendorAndRendererKey = function (done) {
    if (isWebGlSupported()) {
      done(getWebglVendorAndRenderer());
      return
    }
    done();
  };
  var adBlockKey = function (done) {
    done(getAdBlock());
  };
  var hasLiedLanguagesKey = function (done) {
    done(getHasLiedLanguages());
  };
  var hasLiedResolutionKey = function (done) {
    done(getHasLiedResolution());
  };
  var hasLiedOsKey = function (done) {
    done(getHasLiedOs());
  };
  var hasLiedBrowserKey = function (done) {
    done(getHasLiedBrowser());
  };
  // flash fonts (will increase fingerprinting time 20X to ~ 130-150ms)
  var flashFontsKey = function (done, options) {
    // we do flash if swfobject is loaded
    if (!hasSwfObjectLoaded()) {
      return done('swf object not loaded')
    }
    if (!hasMinFlashInstalled()) {
      return done('flash not installed')
    }
    if (!options.fonts.swfPath) {
      return done('missing options.fonts.swfPath')
    }
    loadSwfAndDetectFonts(function (fonts) {
      done(fonts);
    }, options);
  };
  // kudos to http://www.lalit.org/lab/javascript-css-font-detect/
  var jsFontsKey = function (done, options) {
    // a font will be compared against all the three default fonts.
    // and if it doesn't match all 3 then that font is not available.
    var baseFonts = ['monospace', 'sans-serif', 'serif'];

    var fontList = [
      'Andale Mono', 'Arial', 'Arial Black', 'Arial Hebrew', 'Arial MT', 'Arial Narrow', 'Arial Rounded MT Bold', 'Arial Unicode MS',
      'Bitstream Vera Sans Mono', 'Book Antiqua', 'Bookman Old Style',
      'Calibri', 'Cambria', 'Cambria Math', 'Century', 'Century Gothic', 'Century Schoolbook', 'Comic Sans', 'Comic Sans MS', 'Consolas', 'Courier', 'Courier New',
      'Geneva', 'Georgia',
      'Helvetica', 'Helvetica Neue',
      'Impact',
      'Lucida Bright', 'Lucida Calligraphy', 'Lucida Console', 'Lucida Fax', 'LUCIDA GRANDE', 'Lucida Handwriting', 'Lucida Sans', 'Lucida Sans Typewriter', 'Lucida Sans Unicode',
      'Microsoft Sans Serif', 'Monaco', 'Monotype Corsiva', 'MS Gothic', 'MS Outlook', 'MS PGothic', 'MS Reference Sans Serif', 'MS Sans Serif', 'MS Serif', 'MYRIAD', 'MYRIAD PRO',
      'Palatino', 'Palatino Linotype',
      'Segoe Print', 'Segoe Script', 'Segoe UI', 'Segoe UI Light', 'Segoe UI Semibold', 'Segoe UI Symbol',
      'Tahoma', 'Times', 'Times New Roman', 'Times New Roman PS', 'Trebuchet MS',
      'Verdana', 'Wingdings', 'Wingdings 2', 'Wingdings 3'
    ];

    if (options.fonts.extendedJsFonts) {
      var extendedFontList = [
        'Abadi MT Condensed Light', 'Academy Engraved LET', 'ADOBE CASLON PRO', 'Adobe Garamond', 'ADOBE GARAMOND PRO', 'Agency FB', 'Aharoni', 'Albertus Extra Bold', 'Albertus Medium', 'Algerian', 'Amazone BT', 'American Typewriter',
        'American Typewriter Condensed', 'AmerType Md BT', 'Andalus', 'Angsana New', 'AngsanaUPC', 'Antique Olive', 'Aparajita', 'Apple Chancery', 'Apple Color Emoji', 'Apple SD Gothic Neo', 'Arabic Typesetting', 'ARCHER',
        'ARNO PRO', 'Arrus BT', 'Aurora Cn BT', 'AvantGarde Bk BT', 'AvantGarde Md BT', 'AVENIR', 'Ayuthaya', 'Bandy', 'Bangla Sangam MN', 'Bank Gothic', 'BankGothic Md BT', 'Baskerville',
        'Baskerville Old Face', 'Batang', 'BatangChe', 'Bauer Bodoni', 'Bauhaus 93', 'Bazooka', 'Bell MT', 'Bembo', 'Benguiat Bk BT', 'Berlin Sans FB', 'Berlin Sans FB Demi', 'Bernard MT Condensed', 'BernhardFashion BT', 'BernhardMod BT', 'Big Caslon', 'BinnerD',
        'Blackadder ITC', 'BlairMdITC TT', 'Bodoni 72', 'Bodoni 72 Oldstyle', 'Bodoni 72 Smallcaps', 'Bodoni MT', 'Bodoni MT Black', 'Bodoni MT Condensed', 'Bodoni MT Poster Compressed',
        'Bookshelf Symbol 7', 'Boulder', 'Bradley Hand', 'Bradley Hand ITC', 'Bremen Bd BT', 'Britannic Bold', 'Broadway', 'Browallia New', 'BrowalliaUPC', 'Brush Script MT', 'Californian FB', 'Calisto MT', 'Calligrapher', 'Candara',
        'CaslonOpnface BT', 'Castellar', 'Centaur', 'Cezanne', 'CG Omega', 'CG Times', 'Chalkboard', 'Chalkboard SE', 'Chalkduster', 'Charlesworth', 'Charter Bd BT', 'Charter BT', 'Chaucer',
        'ChelthmITC Bk BT', 'Chiller', 'Clarendon', 'Clarendon Condensed', 'CloisterBlack BT', 'Cochin', 'Colonna MT', 'Constantia', 'Cooper Black', 'Copperplate', 'Copperplate Gothic', 'Copperplate Gothic Bold',
        'Copperplate Gothic Light', 'CopperplGoth Bd BT', 'Corbel', 'Cordia New', 'CordiaUPC', 'Cornerstone', 'Coronet', 'Cuckoo', 'Curlz MT', 'DaunPenh', 'Dauphin', 'David', 'DB LCD Temp', 'DELICIOUS', 'Denmark',
        'DFKai-SB', 'Didot', 'DilleniaUPC', 'DIN', 'DokChampa', 'Dotum', 'DotumChe', 'Ebrima', 'Edwardian Script ITC', 'Elephant', 'English 111 Vivace BT', 'Engravers MT', 'EngraversGothic BT', 'Eras Bold ITC', 'Eras Demi ITC', 'Eras Light ITC', 'Eras Medium ITC',
        'EucrosiaUPC', 'Euphemia', 'Euphemia UCAS', 'EUROSTILE', 'Exotc350 Bd BT', 'FangSong', 'Felix Titling', 'Fixedsys', 'FONTIN', 'Footlight MT Light', 'Forte',
        'FrankRuehl', 'Fransiscan', 'Freefrm721 Blk BT', 'FreesiaUPC', 'Freestyle Script', 'French Script MT', 'FrnkGothITC Bk BT', 'Fruitger', 'FRUTIGER',
        'Futura', 'Futura Bk BT', 'Futura Lt BT', 'Futura Md BT', 'Futura ZBlk BT', 'FuturaBlack BT', 'Gabriola', 'Galliard BT', 'Gautami', 'Geeza Pro', 'Geometr231 BT', 'Geometr231 Hv BT', 'Geometr231 Lt BT', 'GeoSlab 703 Lt BT',
        'GeoSlab 703 XBd BT', 'Gigi', 'Gill Sans', 'Gill Sans MT', 'Gill Sans MT Condensed', 'Gill Sans MT Ext Condensed Bold', 'Gill Sans Ultra Bold', 'Gill Sans Ultra Bold Condensed', 'Gisha', 'Gloucester MT Extra Condensed', 'GOTHAM', 'GOTHAM BOLD',
        'Goudy Old Style', 'Goudy Stout', 'GoudyHandtooled BT', 'GoudyOLSt BT', 'Gujarati Sangam MN', 'Gulim', 'GulimChe', 'Gungsuh', 'GungsuhChe', 'Gurmukhi MN', 'Haettenschweiler', 'Harlow Solid Italic', 'Harrington', 'Heather', 'Heiti SC', 'Heiti TC', 'HELV',
        'Herald', 'High Tower Text', 'Hiragino Kaku Gothic ProN', 'Hiragino Mincho ProN', 'Hoefler Text', 'Humanst 521 Cn BT', 'Humanst521 BT', 'Humanst521 Lt BT', 'Imprint MT Shadow', 'Incised901 Bd BT', 'Incised901 BT',
        'Incised901 Lt BT', 'INCONSOLATA', 'Informal Roman', 'Informal011 BT', 'INTERSTATE', 'IrisUPC', 'Iskoola Pota', 'JasmineUPC', 'Jazz LET', 'Jenson', 'Jester', 'Jokerman', 'Juice ITC', 'Kabel Bk BT', 'Kabel Ult BT', 'Kailasa', 'KaiTi', 'Kalinga', 'Kannada Sangam MN',
        'Kartika', 'Kaufmann Bd BT', 'Kaufmann BT', 'Khmer UI', 'KodchiangUPC', 'Kokila', 'Korinna BT', 'Kristen ITC', 'Krungthep', 'Kunstler Script', 'Lao UI', 'Latha', 'Leelawadee', 'Letter Gothic', 'Levenim MT', 'LilyUPC', 'Lithograph', 'Lithograph Light', 'Long Island',
        'Lydian BT', 'Magneto', 'Maiandra GD', 'Malayalam Sangam MN', 'Malgun Gothic',
        'Mangal', 'Marigold', 'Marion', 'Marker Felt', 'Market', 'Marlett', 'Matisse ITC', 'Matura MT Script Capitals', 'Meiryo', 'Meiryo UI', 'Microsoft Himalaya', 'Microsoft JhengHei', 'Microsoft New Tai Lue', 'Microsoft PhagsPa', 'Microsoft Tai Le',
        'Microsoft Uighur', 'Microsoft YaHei', 'Microsoft Yi Baiti', 'MingLiU', 'MingLiU_HKSCS', 'MingLiU_HKSCS-ExtB', 'MingLiU-ExtB', 'Minion', 'Minion Pro', 'Miriam', 'Miriam Fixed', 'Mistral', 'Modern', 'Modern No. 20', 'Mona Lisa Solid ITC TT', 'Mongolian Baiti',
        'MONO', 'MoolBoran', 'Mrs Eaves', 'MS LineDraw', 'MS Mincho', 'MS PMincho', 'MS Reference Specialty', 'MS UI Gothic', 'MT Extra', 'MUSEO', 'MV Boli',
        'Nadeem', 'Narkisim', 'NEVIS', 'News Gothic', 'News GothicMT', 'NewsGoth BT', 'Niagara Engraved', 'Niagara Solid', 'Noteworthy', 'NSimSun', 'Nyala', 'OCR A Extended', 'Old Century', 'Old English Text MT', 'Onyx', 'Onyx BT', 'OPTIMA', 'Oriya Sangam MN',
        'OSAKA', 'OzHandicraft BT', 'Palace Script MT', 'Papyrus', 'Parchment', 'Party LET', 'Pegasus', 'Perpetua', 'Perpetua Titling MT', 'PetitaBold', 'Pickwick', 'Plantagenet Cherokee', 'Playbill', 'PMingLiU', 'PMingLiU-ExtB',
        'Poor Richard', 'Poster', 'PosterBodoni BT', 'PRINCETOWN LET', 'Pristina', 'PTBarnum BT', 'Pythagoras', 'Raavi', 'Rage Italic', 'Ravie', 'Ribbon131 Bd BT', 'Rockwell', 'Rockwell Condensed', 'Rockwell Extra Bold', 'Rod', 'Roman', 'Sakkal Majalla',
        'Santa Fe LET', 'Savoye LET', 'Sceptre', 'Script', 'Script MT Bold', 'SCRIPTINA', 'Serifa', 'Serifa BT', 'Serifa Th BT', 'ShelleyVolante BT', 'Sherwood',
        'Shonar Bangla', 'Showcard Gothic', 'Shruti', 'Signboard', 'SILKSCREEN', 'SimHei', 'Simplified Arabic', 'Simplified Arabic Fixed', 'SimSun', 'SimSun-ExtB', 'Sinhala Sangam MN', 'Sketch Rockwell', 'Skia', 'Small Fonts', 'Snap ITC', 'Snell Roundhand', 'Socket',
        'Souvenir Lt BT', 'Staccato222 BT', 'Steamer', 'Stencil', 'Storybook', 'Styllo', 'Subway', 'Swis721 BlkEx BT', 'Swiss911 XCm BT', 'Sylfaen', 'Synchro LET', 'System', 'Tamil Sangam MN', 'Technical', 'Teletype', 'Telugu Sangam MN', 'Tempus Sans ITC',
        'Terminal', 'Thonburi', 'Traditional Arabic', 'Trajan', 'TRAJAN PRO', 'Tristan', 'Tubular', 'Tunga', 'Tw Cen MT', 'Tw Cen MT Condensed', 'Tw Cen MT Condensed Extra Bold',
        'TypoUpright BT', 'Unicorn', 'Univers', 'Univers CE 55 Medium', 'Univers Condensed', 'Utsaah', 'Vagabond', 'Vani', 'Vijaya', 'Viner Hand ITC', 'VisualUI', 'Vivaldi', 'Vladimir Script', 'Vrinda', 'Westminster', 'WHITNEY', 'Wide Latin',
        'ZapfEllipt BT', 'ZapfHumnst BT', 'ZapfHumnst Dm BT', 'Zapfino', 'Zurich BlkEx BT', 'Zurich Ex BT', 'ZWAdobeF'];
      fontList = fontList.concat(extendedFontList);
    }

    fontList = fontList.concat(options.fonts.userDefinedFonts);

    // remove duplicate fonts
    fontList = fontList.filter(function (font, position) {
      return fontList.indexOf(font) === position
    });

    // we use m or w because these two characters take up the maximum width.
    // And we use a LLi so that the same matching fonts can get separated
    var testString = 'mmmmmmmmmmlli';

    // we test using 72px font size, we may use any size. I guess larger the better.
    var testSize = '72px';

    var h = document.getElementsByTagName('body')[0];

    // div to load spans for the base fonts
    var baseFontsDiv = document.createElement('div');

    // div to load spans for the fonts to detect
    var fontsDiv = document.createElement('div');

    var defaultWidth = {};
    var defaultHeight = {};

    // creates a span where the fonts will be loaded
    var createSpan = function () {
      var s = document.createElement('span');
      /*
       * We need this css as in some weird browser this
       * span elements shows up for a microSec which creates a
       * bad user experience
       */
      s.style.position = 'absolute';
      s.style.left = '-9999px';
      s.style.fontSize = testSize;

      // css font reset to reset external styles
      s.style.fontStyle = 'normal';
      s.style.fontWeight = 'normal';
      s.style.letterSpacing = 'normal';
      s.style.lineBreak = 'auto';
      s.style.lineHeight = 'normal';
      s.style.textTransform = 'none';
      s.style.textAlign = 'left';
      s.style.textDecoration = 'none';
      s.style.textShadow = 'none';
      s.style.whiteSpace = 'normal';
      s.style.wordBreak = 'normal';
      s.style.wordSpacing = 'normal';

      s.innerHTML = testString;
      return s
    };

    // creates a span and load the font to detect and a base font for fallback
    var createSpanWithFonts = function (fontToDetect, baseFont) {
      var s = createSpan();
      s.style.fontFamily = "'" + fontToDetect + "'," + baseFont;
      return s
    };

    // creates spans for the base fonts and adds them to baseFontsDiv
    var initializeBaseFontsSpans = function () {
      var spans = [];
      for (var index = 0, length = baseFonts.length; index < length; index++) {
        var s = createSpan();
        s.style.fontFamily = baseFonts[index];
        baseFontsDiv.appendChild(s);
        spans.push(s);
      }
      return spans
    };

    // creates spans for the fonts to detect and adds them to fontsDiv
    var initializeFontsSpans = function () {
      var spans = {};
      for (var i = 0, l = fontList.length; i < l; i++) {
        var fontSpans = [];
        for (var j = 0, numDefaultFonts = baseFonts.length; j < numDefaultFonts; j++) {
          var s = createSpanWithFonts(fontList[i], baseFonts[j]);
          fontsDiv.appendChild(s);
          fontSpans.push(s);
        }
        spans[fontList[i]] = fontSpans; // Stores {fontName : [spans for that font]}
      }
      return spans
    };

    // checks if a font is available
    var isFontAvailable = function (fontSpans) {
      var detected = false;
      for (var i = 0; i < baseFonts.length; i++) {
        detected = (fontSpans[i].offsetWidth !== defaultWidth[baseFonts[i]] || fontSpans[i].offsetHeight !== defaultHeight[baseFonts[i]]);
        if (detected) {
          return detected
        }
      }
      return detected
    };

    // create spans for base fonts
    var baseFontsSpans = initializeBaseFontsSpans();

    // add the spans to the DOM
    h.appendChild(baseFontsDiv);

    // get the default width for the three base fonts
    for (var index = 0, length = baseFonts.length; index < length; index++) {
      defaultWidth[baseFonts[index]] = baseFontsSpans[index].offsetWidth; // width for the default font
      defaultHeight[baseFonts[index]] = baseFontsSpans[index].offsetHeight; // height for the default font
    }

    // create spans for fonts to detect
    var fontsSpans = initializeFontsSpans();

    // add all the spans to the DOM
    h.appendChild(fontsDiv);

    // check available fonts
    var available = [];
    for (var i = 0, l = fontList.length; i < l; i++) {
      if (isFontAvailable(fontsSpans[fontList[i]])) {
        available.push(fontList[i]);
      }
    }

    // remove spans from DOM
    h.removeChild(fontsDiv);
    h.removeChild(baseFontsDiv);
    done(available);
  };
  var pluginsComponent = function (done, options) {
    if (isIE()) {
      if (!options.plugins.excludeIE) {
        done(getIEPlugins(options));
      } else {
        done(options.EXCLUDED);
      }
    } else {
      done(getRegularPlugins(options));
    }
  };
  var getRegularPlugins = function (options) {
    if (navigator.plugins == null) {
      return options.NOT_AVAILABLE
    }

    var plugins = [];
    // plugins isn't defined in Node envs.
    for (var i = 0, l = navigator.plugins.length; i < l; i++) {
      if (navigator.plugins[i]) { plugins.push(navigator.plugins[i]); }
    }

    // sorting plugins only for those user agents, that we know randomize the plugins
    // every time we try to enumerate them
    if (pluginsShouldBeSorted(options)) {
      plugins = plugins.sort(function (a, b) {
        if (a.name > b.name) { return 1 }
        if (a.name < b.name) { return -1 }
        return 0
      });
    }
    return map(plugins, function (p) {
      var mimeTypes = map(p, function (mt) {
        return [mt.type, mt.suffixes]
      });
      return [p.name, p.description, mimeTypes]
    })
  };
  var getIEPlugins = function (options) {
    var result = [];
    if ((Object.getOwnPropertyDescriptor && Object.getOwnPropertyDescriptor(window, 'ActiveXObject')) || ('ActiveXObject' in window)) {
      var names = [
        'AcroPDF.PDF', // Adobe PDF reader 7+
        'Adodb.Stream',
        'AgControl.AgControl', // Silverlight
        'DevalVRXCtrl.DevalVRXCtrl.1',
        'MacromediaFlashPaper.MacromediaFlashPaper',
        'Msxml2.DOMDocument',
        'Msxml2.XMLHTTP',
        'PDF.PdfCtrl', // Adobe PDF reader 6 and earlier, brrr
        'QuickTime.QuickTime', // QuickTime
        'QuickTimeCheckObject.QuickTimeCheck.1',
        'RealPlayer',
        'RealPlayer.RealPlayer(tm) ActiveX Control (32-bit)',
        'RealVideo.RealVideo(tm) ActiveX Control (32-bit)',
        'Scripting.Dictionary',
        'SWCtl.SWCtl', // ShockWave player
        'Shell.UIHelper',
        'ShockwaveFlash.ShockwaveFlash', // flash plugin
        'Skype.Detection',
        'TDCCtl.TDCCtl',
        'WMPlayer.OCX', // Windows media player
        'rmocx.RealPlayer G2 Control',
        'rmocx.RealPlayer G2 Control.1'
      ];
      // starting to detect plugins in IE
      result = map(names, function (name) {
        try {
          // eslint-disable-next-line no-new
          new window.ActiveXObject(name);
          return name
        } catch (e) {
          return options.ERROR
        }
      });
    } else {
      result.push(options.NOT_AVAILABLE);
    }
    if (navigator.plugins) {
      result = result.concat(getRegularPlugins(options));
    }
    return result
  };
  var pluginsShouldBeSorted = function (options) {
    var should = false;
    for (var i = 0, l = options.plugins.sortPluginsFor.length; i < l; i++) {
      var re = options.plugins.sortPluginsFor[i];
      if (navigator.userAgent.match(re)) {
        should = true;
        break
      }
    }
    return should
  };
  var touchSupportKey = function (done) {
    done(getTouchSupport());
  };
  var hardwareConcurrencyKey = function (done, options) {
    done(getHardwareConcurrency(options));
  };
  var hasSessionStorage = function (options) {
    try {
      return !!window.sessionStorage
    } catch (e) {
      return options.ERROR // SecurityError when referencing it means it exists
    }
  };

  // https://bugzilla.mozilla.org/show_bug.cgi?id=781447
  var hasLocalStorage = function (options) {
    try {
      return !!window.localStorage
    } catch (e) {
      return options.ERROR // SecurityError when referencing it means it exists
    }
  };
  var hasIndexedDB = function (options) {
    try {
      return !!window.indexedDB
    } catch (e) {
      return options.ERROR // SecurityError when referencing it means it exists
    }
  };
  var getHardwareConcurrency = function (options) {
    if (navigator.hardwareConcurrency) {
      return navigator.hardwareConcurrency
    }
    return options.NOT_AVAILABLE
  };
  var getNavigatorCpuClass = function (options) {
    return navigator.cpuClass || options.NOT_AVAILABLE
  };
  var getNavigatorPlatform = function (options) {
    if (navigator.platform) {
      return navigator.platform
    } else {
      return options.NOT_AVAILABLE
    }
  };
  var getDoNotTrack = function (options) {
    if (navigator.doNotTrack) {
      return navigator.doNotTrack
    } else if (navigator.msDoNotTrack) {
      return navigator.msDoNotTrack
    } else if (window.doNotTrack) {
      return window.doNotTrack
    } else {
      return options.NOT_AVAILABLE
    }
  };
  // This is a crude and primitive touch screen detection.
  // It's not possible to currently reliably detect the  availability of a touch screen
  // with a JS, without actually subscribing to a touch event.
  // http://www.stucox.com/blog/you-cant-detect-a-touchscreen/
  // https://github.com/Modernizr/Modernizr/issues/548
  // method returns an array of 3 values:
  // maxTouchPoints, the success or failure of creating a TouchEvent,
  // and the availability of the 'ontouchstart' property

  var getTouchSupport = function () {
    var maxTouchPoints = 0;
    var touchEvent;
    if (typeof navigator.maxTouchPoints !== 'undefined') {
      maxTouchPoints = navigator.maxTouchPoints;
    } else if (typeof navigator.msMaxTouchPoints !== 'undefined') {
      maxTouchPoints = navigator.msMaxTouchPoints;
    }
    try {
      document.createEvent('TouchEvent');
      touchEvent = true;
    } catch (_) {
      touchEvent = false;
    }
    var touchStart = 'ontouchstart' in window;
    return [maxTouchPoints, touchEvent, touchStart]
  };
  // https://www.browserleaks.com/canvas#how-does-it-work

  var getCanvasFp = function (options) {
    var result = [];
    // Very simple now, need to make it more complex (geo shapes etc)
    var canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 200;
    canvas.style.display = 'inline';
    var ctx = canvas.getContext('2d');
    // detect browser support of canvas winding
    // http://blogs.adobe.com/webplatform/2013/01/30/winding-rules-in-canvas/
    // https://github.com/Modernizr/Modernizr/blob/master/feature-detects/canvas/winding.js
    ctx.rect(0, 0, 10, 10);
    ctx.rect(2, 2, 6, 6);
    result.push('canvas winding:' + ((ctx.isPointInPath(5, 5, 'evenodd') === false) ? 'yes' : 'no'));

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    // https://github.com/Valve/fingerprintjs2/issues/66
    if (options.dontUseFakeFontInCanvas) {
      ctx.font = '11pt Arial';
    } else {
      ctx.font = '11pt no-real-font-123';
    }
    ctx.fillText('Cwm fjordbank glyphs vext quiz, \ud83d\ude03', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.2)';
    ctx.font = '18pt Arial';
    ctx.fillText('Cwm fjordbank glyphs vext quiz, \ud83d\ude03', 4, 45);

    // canvas blending
    // http://blogs.adobe.com/webplatform/2013/01/28/blending-features-in-canvas/
    // http://jsfiddle.net/NDYV8/16/
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgb(255,0,255)';
    ctx.beginPath();
    ctx.arc(50, 50, 50, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgb(0,255,255)';
    ctx.beginPath();
    ctx.arc(100, 50, 50, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgb(255,255,0)';
    ctx.beginPath();
    ctx.arc(75, 100, 50, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgb(255,0,255)';
    // canvas winding
    // http://blogs.adobe.com/webplatform/2013/01/30/winding-rules-in-canvas/
    // http://jsfiddle.net/NDYV8/19/
    ctx.arc(75, 75, 75, 0, Math.PI * 2, true);
    ctx.arc(75, 75, 25, 0, Math.PI * 2, true);
    ctx.fill('evenodd');

    if (canvas.toDataURL) { result.push('canvas fp:' + canvas.toDataURL()); }
    return result
  };
  var getWebglFp = function () {
    var gl;
    var fa2s = function (fa) {
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      return '[' + fa[0] + ', ' + fa[1] + ']'
    };
    var maxAnisotropy = function (gl) {
      var ext = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic') || gl.getExtension('MOZ_EXT_texture_filter_anisotropic');
      if (ext) {
        var anisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        if (anisotropy === 0) {
          anisotropy = 2;
        }
        return anisotropy
      } else {
        return null
      }
    };

    gl = getWebglCanvas();
    if (!gl) { return null }
    // WebGL fingerprinting is a combination of techniques, found in MaxMind antifraud script & Augur fingerprinting.
    // First it draws a gradient object with shaders and convers the image to the Base64 string.
    // Then it enumerates all WebGL extensions & capabilities and appends them to the Base64 string, resulting in a huge WebGL string, potentially very unique on each device
    // Since iOS supports webgl starting from version 8.1 and 8.1 runs on several graphics chips, the results may be different across ios devices, but we need to verify it.
    var result = [];
    var vShaderTemplate = 'attribute vec2 attrVertex;varying vec2 varyinTexCoordinate;uniform vec2 uniformOffset;void main(){varyinTexCoordinate=attrVertex+uniformOffset;gl_Position=vec4(attrVertex,0,1);}';
    var fShaderTemplate = 'precision mediump float;varying vec2 varyinTexCoordinate;void main() {gl_FragColor=vec4(varyinTexCoordinate,0,1);}';
    var vertexPosBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPosBuffer);
    var vertices = new Float32Array([-0.2, -0.9, 0, 0.4, -0.26, 0, 0, 0.732134444, 0]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    vertexPosBuffer.itemSize = 3;
    vertexPosBuffer.numItems = 3;
    var program = gl.createProgram();
    var vshader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vshader, vShaderTemplate);
    gl.compileShader(vshader);
    var fshader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fshader, fShaderTemplate);
    gl.compileShader(fshader);
    gl.attachShader(program, vshader);
    gl.attachShader(program, fshader);
    gl.linkProgram(program);
    gl.useProgram(program);
    program.vertexPosAttrib = gl.getAttribLocation(program, 'attrVertex');
    program.offsetUniform = gl.getUniformLocation(program, 'uniformOffset');
    gl.enableVertexAttribArray(program.vertexPosArray);
    gl.vertexAttribPointer(program.vertexPosAttrib, vertexPosBuffer.itemSize, gl.FLOAT, !1, 0, 0);
    gl.uniform2f(program.offsetUniform, 1, 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexPosBuffer.numItems);
    try {
      result.push(gl.canvas.toDataURL());
    } catch (e) {
      /* .toDataURL may be absent or broken (blocked by extension) */
    }
    result.push('extensions:' + (gl.getSupportedExtensions() || []).join(';'));
    result.push('webgl aliased line width range:' + fa2s(gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE)));
    result.push('webgl aliased point size range:' + fa2s(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)));
    result.push('webgl alpha bits:' + gl.getParameter(gl.ALPHA_BITS));
    result.push('webgl antialiasing:' + (gl.getContextAttributes().antialias ? 'yes' : 'no'));
    result.push('webgl blue bits:' + gl.getParameter(gl.BLUE_BITS));
    result.push('webgl depth bits:' + gl.getParameter(gl.DEPTH_BITS));
    result.push('webgl green bits:' + gl.getParameter(gl.GREEN_BITS));
    result.push('webgl max anisotropy:' + maxAnisotropy(gl));
    result.push('webgl max combined texture image units:' + gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS));
    result.push('webgl max cube map texture size:' + gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE));
    result.push('webgl max fragment uniform vectors:' + gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS));
    result.push('webgl max render buffer size:' + gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
    result.push('webgl max texture image units:' + gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS));
    result.push('webgl max texture size:' + gl.getParameter(gl.MAX_TEXTURE_SIZE));
    result.push('webgl max varying vectors:' + gl.getParameter(gl.MAX_VARYING_VECTORS));
    result.push('webgl max vertex attribs:' + gl.getParameter(gl.MAX_VERTEX_ATTRIBS));
    result.push('webgl max vertex texture image units:' + gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS));
    result.push('webgl max vertex uniform vectors:' + gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS));
    result.push('webgl max viewport dims:' + fa2s(gl.getParameter(gl.MAX_VIEWPORT_DIMS)));
    result.push('webgl red bits:' + gl.getParameter(gl.RED_BITS));
    result.push('webgl renderer:' + gl.getParameter(gl.RENDERER));
    result.push('webgl shading language version:' + gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
    result.push('webgl stencil bits:' + gl.getParameter(gl.STENCIL_BITS));
    result.push('webgl vendor:' + gl.getParameter(gl.VENDOR));
    result.push('webgl version:' + gl.getParameter(gl.VERSION));

    try {
      // Add the unmasked vendor and unmasked renderer if the debug_renderer_info extension is available
      var extensionDebugRendererInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (extensionDebugRendererInfo) {
        result.push('webgl unmasked vendor:' + gl.getParameter(extensionDebugRendererInfo.UNMASKED_VENDOR_WEBGL));
        result.push('webgl unmasked renderer:' + gl.getParameter(extensionDebugRendererInfo.UNMASKED_RENDERER_WEBGL));
      }
    } catch (e) { /* squelch */ }

    if (!gl.getShaderPrecisionFormat) {
      loseWebglContext(gl);
      return result
    }

    each(['FLOAT', 'INT'], function (numType) {
      each(['VERTEX', 'FRAGMENT'], function (shader) {
        each(['HIGH', 'MEDIUM', 'LOW'], function (numSize) {
          each(['precision', 'rangeMin', 'rangeMax'], function (key) {
            var format = gl.getShaderPrecisionFormat(gl[shader + '_SHADER'], gl[numSize + '_' + numType])[key];
            if (key !== 'precision') {
              key = 'precision ' + key;
            }
            var line = ['webgl ', shader.toLowerCase(), ' shader ', numSize.toLowerCase(), ' ', numType.toLowerCase(), ' ', key, ':', format].join('');
            result.push(line);
          });
        });
      });
    });
    loseWebglContext(gl);
    return result
  };
  var getWebglVendorAndRenderer = function () {
    /* This a subset of the WebGL fingerprint with a lot of entropy, while being reasonably browser-independent */
    try {
      var glContext = getWebglCanvas();
      var extensionDebugRendererInfo = glContext.getExtension('WEBGL_debug_renderer_info');
      var params = glContext.getParameter(extensionDebugRendererInfo.UNMASKED_VENDOR_WEBGL) + '~' + glContext.getParameter(extensionDebugRendererInfo.UNMASKED_RENDERER_WEBGL);
      loseWebglContext(glContext);
      return params
    } catch (e) {
      return null
    }
  };
  var getAdBlock = function () {
    var ads = document.createElement('div');
    ads.innerHTML = '&nbsp;';
    ads.className = 'adsbox';
    var result = false;
    try {
      // body may not exist, that's why we need try/catch
      document.body.appendChild(ads);
      result = document.getElementsByClassName('adsbox')[0].offsetHeight === 0;
      document.body.removeChild(ads);
    } catch (e) {
      result = false;
    }
    return result
  };
  var getHasLiedLanguages = function () {
    // We check if navigator.language is equal to the first language of navigator.languages
    // navigator.languages is undefined on IE11 (and potentially older IEs)
    if (typeof navigator.languages !== 'undefined') {
      try {
        var firstLanguages = navigator.languages[0].substr(0, 2);
        if (firstLanguages !== navigator.language.substr(0, 2)) {
          return true
        }
      } catch (err) {
        return true
      }
    }
    return false
  };
  var getHasLiedResolution = function () {
    return window.screen.width < window.screen.availWidth || window.screen.height < window.screen.availHeight
  };
  var getHasLiedOs = function () {
    var userAgent = navigator.userAgent.toLowerCase();
    var oscpu = navigator.oscpu;
    var platform = navigator.platform.toLowerCase();
    var os;
    // We extract the OS from the user agent (respect the order of the if else if statement)
    if (userAgent.indexOf('windows phone') >= 0) {
      os = 'Windows Phone';
    } else if (userAgent.indexOf('windows') >= 0 || userAgent.indexOf('win16') >= 0 || userAgent.indexOf('win32') >= 0 || userAgent.indexOf('win64') >= 0 || userAgent.indexOf('win95') >= 0 || userAgent.indexOf('win98') >= 0 || userAgent.indexOf('winnt') >= 0 || userAgent.indexOf('wow64') >= 0) {
      os = 'Windows';
    } else if (userAgent.indexOf('android') >= 0) {
      os = 'Android';
    } else if (userAgent.indexOf('linux') >= 0 || userAgent.indexOf('cros') >= 0 || userAgent.indexOf('x11') >= 0) {
      os = 'Linux';
    } else if (userAgent.indexOf('iphone') >= 0 || userAgent.indexOf('ipad') >= 0 || userAgent.indexOf('ipod') >= 0 || userAgent.indexOf('crios') >= 0 || userAgent.indexOf('fxios') >= 0) {
      os = 'iOS';
    } else if (userAgent.indexOf('macintosh') >= 0 || userAgent.indexOf('mac_powerpc)') >= 0) {
      os = 'Mac';
    } else {
      os = 'Other';
    }
    // We detect if the person uses a touch device
    var mobileDevice = (('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (navigator.msMaxTouchPoints > 0));

    if (mobileDevice && os !== 'Windows' && os !== 'Windows Phone' && os !== 'Android' && os !== 'iOS' && os !== 'Other' && userAgent.indexOf('cros') === -1) {
      return true
    }

    // We compare oscpu with the OS extracted from the UA
    if (typeof oscpu !== 'undefined') {
      oscpu = oscpu.toLowerCase();
      if (oscpu.indexOf('win') >= 0 && os !== 'Windows' && os !== 'Windows Phone') {
        return true
      } else if (oscpu.indexOf('linux') >= 0 && os !== 'Linux' && os !== 'Android') {
        return true
      } else if (oscpu.indexOf('mac') >= 0 && os !== 'Mac' && os !== 'iOS') {
        return true
      } else if ((oscpu.indexOf('win') === -1 && oscpu.indexOf('linux') === -1 && oscpu.indexOf('mac') === -1) !== (os === 'Other')) {
        return true
      }
    }

    // We compare platform with the OS extracted from the UA
    if (platform.indexOf('win') >= 0 && os !== 'Windows' && os !== 'Windows Phone') {
      return true
    } else if ((platform.indexOf('linux') >= 0 || platform.indexOf('android') >= 0 || platform.indexOf('pike') >= 0) && os !== 'Linux' && os !== 'Android') {
      return true
    } else if ((platform.indexOf('mac') >= 0 || platform.indexOf('ipad') >= 0 || platform.indexOf('ipod') >= 0 || platform.indexOf('iphone') >= 0) && os !== 'Mac' && os !== 'iOS') {
      return true
    } else if (platform.indexOf('arm') >= 0 && os === 'Windows Phone') {
      return false
    } else if (platform.indexOf('pike') >= 0 && userAgent.indexOf('opera mini') >= 0) {
      return false
    } else {
      var platformIsOther = platform.indexOf('win') < 0 &&
        platform.indexOf('linux') < 0 &&
        platform.indexOf('mac') < 0 &&
        platform.indexOf('iphone') < 0 &&
        platform.indexOf('ipad') < 0 &&
        platform.indexOf('ipod') < 0;
      if (platformIsOther !== (os === 'Other')) {
        return true
      }
    }

    return typeof navigator.plugins === 'undefined' && os !== 'Windows' && os !== 'Windows Phone'
  };
  var getHasLiedBrowser = function () {
    var userAgent = navigator.userAgent.toLowerCase();
    var productSub = navigator.productSub;

    // we extract the browser from the user agent (respect the order of the tests)
    var browser;
    if (userAgent.indexOf('edge/') >= 0 || userAgent.indexOf('iemobile/') >= 0) {
      // Unreliable, different versions use EdgeHTML, Webkit, Blink, etc.
      return false
    } else if (userAgent.indexOf('opera mini') >= 0) {
      // Unreliable, different modes use Presto, WebView, Webkit, etc.
      return false
    } else if (userAgent.indexOf('firefox/') >= 0) {
      browser = 'Firefox';
    } else if (userAgent.indexOf('opera/') >= 0 || userAgent.indexOf(' opr/') >= 0) {
      browser = 'Opera';
    } else if (userAgent.indexOf('chrome/') >= 0) {
      browser = 'Chrome';
    } else if (userAgent.indexOf('safari/') >= 0) {
      if (userAgent.indexOf('android 1.') >= 0 || userAgent.indexOf('android 2.') >= 0 || userAgent.indexOf('android 3.') >= 0 || userAgent.indexOf('android 4.') >= 0) {
        browser = 'AOSP';
      } else {
        browser = 'Safari';
      }
    } else if (userAgent.indexOf('trident/') >= 0) {
      browser = 'Internet Explorer';
    } else {
      browser = 'Other';
    }

    if ((browser === 'Chrome' || browser === 'Safari' || browser === 'Opera') && productSub !== '20030107') {
      return true
    }

    // eslint-disable-next-line no-eval
    var tempRes = eval.toString().length;
    if (tempRes === 37 && browser !== 'Safari' && browser !== 'Firefox' && browser !== 'Other') {
      return true
    } else if (tempRes === 39 && browser !== 'Internet Explorer' && browser !== 'Other') {
      return true
    } else if (tempRes === 33 && browser !== 'Chrome' && browser !== 'AOSP' && browser !== 'Opera' && browser !== 'Other') {
      return true
    }

    // We create an error to see how it is handled
    var errFirefox;
    try {
      // eslint-disable-next-line no-throw-literal
      throw 'a'
    } catch (err) {
      try {
        err.toSource();
        errFirefox = true;
      } catch (errOfErr) {
        errFirefox = false;
      }
    }
    return errFirefox && browser !== 'Firefox' && browser !== 'Other'
  };
  var isCanvasSupported = function () {
    var elem = document.createElement('canvas');
    return !!(elem.getContext && elem.getContext('2d'))
  };
  var isWebGlSupported = function () {
    // code taken from Modernizr
    if (!isCanvasSupported()) {
      return false
    }

    var glContext = getWebglCanvas();
    var isSupported = !!window.WebGLRenderingContext && !!glContext;
    loseWebglContext(glContext);
    return isSupported
  };
  var isIE = function () {
    if (navigator.appName === 'Microsoft Internet Explorer') {
      return true
    } else if (navigator.appName === 'Netscape' && /Trident/.test(navigator.userAgent)) { // IE 11
      return true
    }
    return false
  };
  var hasSwfObjectLoaded = function () {
    return typeof window.swfobject !== 'undefined'
  };
  var hasMinFlashInstalled = function () {
    return window.swfobject.hasFlashPlayerVersion('9.0.0')
  };
  var addFlashDivNode = function (options) {
    var node = document.createElement('div');
    node.setAttribute('id', options.fonts.swfContainerId);
    document.body.appendChild(node);
  };
  var loadSwfAndDetectFonts = function (done, options) {
    var hiddenCallback = '___fp_swf_loaded';
    window[hiddenCallback] = function (fonts) {
      done(fonts);
    };
    var id = options.fonts.swfContainerId;
    addFlashDivNode();
    var flashvars = { onReady: hiddenCallback };
    var flashparams = { allowScriptAccess: 'always', menu: 'false' };
    window.swfobject.embedSWF(options.fonts.swfPath, id, '1', '1', '9.0.0', false, flashvars, flashparams, {});
  };
  var getWebglCanvas = function () {
    var canvas = document.createElement('canvas');
    var gl = null;
    try {
      gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    } catch (e) { /* squelch */ }
    if (!gl) { gl = null; }
    return gl
  };
  var loseWebglContext = function (context) {
    var loseContextExtension = context.getExtension('WEBGL_lose_context');
    if (loseContextExtension != null) {
      loseContextExtension.loseContext();
    }
  };

  var components = [
    { key: 'userAgent', getData: UserAgent },
    { key: 'webdriver', getData: webdriver },
    { key: 'language', getData: languageKey },
    { key: 'colorDepth', getData: colorDepthKey },
    { key: 'deviceMemory', getData: deviceMemoryKey },
    { key: 'pixelRatio', getData: pixelRatioKey },
    { key: 'hardwareConcurrency', getData: hardwareConcurrencyKey },
    { key: 'screenResolution', getData: screenResolutionKey },
    { key: 'availableScreenResolution', getData: availableScreenResolutionKey },
    { key: 'timezoneOffset', getData: timezoneOffset },
    { key: 'timezone', getData: timezone },
    { key: 'sessionStorage', getData: sessionStorageKey },
    { key: 'localStorage', getData: localStorageKey },
    { key: 'indexedDb', getData: indexedDbKey },
    { key: 'addBehavior', getData: addBehaviorKey },
    { key: 'openDatabase', getData: openDatabaseKey },
    { key: 'cpuClass', getData: cpuClassKey },
    { key: 'platform', getData: platformKey },
    { key: 'doNotTrack', getData: doNotTrackKey },
    { key: 'plugins', getData: pluginsComponent },
    { key: 'canvas', getData: canvasKey },
    { key: 'webgl', getData: webglKey },
    { key: 'webglVendorAndRenderer', getData: webglVendorAndRendererKey },
    { key: 'adBlock', getData: adBlockKey },
    { key: 'hasLiedLanguages', getData: hasLiedLanguagesKey },
    { key: 'hasLiedResolution', getData: hasLiedResolutionKey },
    { key: 'hasLiedOs', getData: hasLiedOsKey },
    { key: 'hasLiedBrowser', getData: hasLiedBrowserKey },
    { key: 'touchSupport', getData: touchSupportKey },
    { key: 'fonts', getData: jsFontsKey, pauseBefore: true },
    { key: 'fontsFlash', getData: flashFontsKey, pauseBefore: true },
    { key: 'audio', getData: audioKey },
    { key: 'enumerateDevices', getData: enumerateDevicesKey }
  ];

  var Fingerprint2 = function (options) {
    throw new Error("'new Fingerprint()' is deprecated, see https://github.com/Valve/fingerprintjs2#upgrade-guide-from-182-to-200")
  };

  Fingerprint2.get = function (options, callback) {
    if (!callback) {
      callback = options;
      options = {};
    } else if (!options) {
      options = {};
    }
    extendSoft(options, defaultOptions);
    options.components = options.extraComponents.concat(components);

    var keys = {
      data: [],
      addPreprocessedComponent: function (key, value) {
        if (typeof options.preprocessor === 'function') {
          value = options.preprocessor(key, value);
        }
        keys.data.push({ key: key, value: value });
      }
    };

    var i = -1;
    var chainComponents = function (alreadyWaited) {
      i += 1;
      if (i >= options.components.length) { // on finish
        callback(keys.data);
        return
      }
      var component = options.components[i];

      if (options.excludes[component.key]) {
        chainComponents(false); // skip
        return
      }

      if (!alreadyWaited && component.pauseBefore) {
        i -= 1;
        setTimeout(function () {
          chainComponents(true);
        }, 1);
        return
      }

      try {
        component.getData(function (value) {
          keys.addPreprocessedComponent(component.key, value);
          chainComponents(false);
        }, options);
      } catch (error) {
        // main body error
        keys.addPreprocessedComponent(component.key, String(error));
        chainComponents(false);
      }
    };

    chainComponents(false);
  };

  Fingerprint2.getPromise = function (options) {
    return new Promise(function (resolve, reject) {
      Fingerprint2.get(options, resolve);
    })
  };

  Fingerprint2.getV18 = function (options, callback) {
    if (callback == null) {
      callback = options;
      options = {};
    }
    return Fingerprint2.get(options, function (components) {
      var newComponents = [];
      for (var i = 0; i < components.length; i++) {
        var component = components[i];
        if (component.value === (options.NOT_AVAILABLE || 'not available')) {
          newComponents.push({ key: component.key, value: 'unknown' });
        } else if (component.key === 'plugins') {
          newComponents.push({
            key: 'plugins',
            value: map(component.value, function (p) {
              var mimeTypes = map(p[2], function (mt) {
                if (mt.join) { return mt.join('~') }
                return mt
              }).join(',');
              return [p[0], p[1], mimeTypes].join('::')
            })
          });
        } else if (['canvas', 'webgl'].indexOf(component.key) !== -1 && Array.isArray(component.value)) {
          // sometimes WebGL returns error in headless browsers (during CI testing for example)
          // so we need to join only if the values are array
          newComponents.push({ key: component.key, value: component.value.join('~') });
        } else if (['sessionStorage', 'localStorage', 'indexedDb', 'addBehavior', 'openDatabase'].indexOf(component.key) !== -1) {
          if (component.value) {
            newComponents.push({ key: component.key, value: 1 });
          } else {
            // skip
            continue
          }
        } else {
          if (component.value) {
            newComponents.push(component.value.join ? { key: component.key, value: component.value.join(';') } : component);
          } else {
            newComponents.push({ key: component.key, value: component.value });
          }
        }
      }
      var murmur = x64hash128(map(newComponents, function (component) { return component.value }).join('~~~'), 31);
      callback(murmur, newComponents);
    })
  };

  Fingerprint2.x64hash128 = x64hash128;
  Fingerprint2.VERSION = '2.1.2';
  return Fingerprint2
});
});

function getHeadData() {
    return __awaiter(this, void 0, void 0, function* () {
        const fp = yield fingerprint2.getPromise({}).then(components => {
            const values = components.map(component => {
                return component.value;
            });
            const murmur = fingerprint2.x64hash128(values.join(''), 31);
            return murmur;
        });
        return {
            href: location.href,
            relatedId: getRandomCode(),
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            beginTime: getTime().toString(),
            version: pkg.version,
            fp
        };
    });
}

var global$1 = (typeof global !== "undefined" ? global :
  typeof self !== "undefined" ? self :
  typeof window !== "undefined" ? window : {});

var lookup = [];
var revLookup = [];
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
var inited = false;
function init () {
  inited = true;
  var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  for (var i = 0, len = code.length; i < len; ++i) {
    lookup[i] = code[i];
    revLookup[code.charCodeAt(i)] = i;
  }

  revLookup['-'.charCodeAt(0)] = 62;
  revLookup['_'.charCodeAt(0)] = 63;
}

function toByteArray (b64) {
  if (!inited) {
    init();
  }
  var i, j, l, tmp, placeHolders, arr;
  var len = b64.length;

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0;

  // base64 is 4/3 + up to two characters of the original data
  arr = new Arr(len * 3 / 4 - placeHolders);

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len;

  var L = 0;

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)];
    arr[L++] = (tmp >> 16) & 0xFF;
    arr[L++] = (tmp >> 8) & 0xFF;
    arr[L++] = tmp & 0xFF;
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4);
    arr[L++] = tmp & 0xFF;
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2);
    arr[L++] = (tmp >> 8) & 0xFF;
    arr[L++] = tmp & 0xFF;
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp;
  var output = [];
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
    output.push(tripletToBase64(tmp));
  }
  return output.join('')
}

function fromByteArray (uint8) {
  if (!inited) {
    init();
  }
  var tmp;
  var len = uint8.length;
  var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
  var output = '';
  var parts = [];
  var maxChunkLength = 16383; // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1];
    output += lookup[tmp >> 2];
    output += lookup[(tmp << 4) & 0x3F];
    output += '==';
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1]);
    output += lookup[tmp >> 10];
    output += lookup[(tmp >> 4) & 0x3F];
    output += lookup[(tmp << 2) & 0x3F];
    output += '=';
  }

  parts.push(output);

  return parts.join('')
}

function read (buffer, offset, isLE, mLen, nBytes) {
  var e, m;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var nBits = -7;
  var i = isLE ? (nBytes - 1) : 0;
  var d = isLE ? -1 : 1;
  var s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

function write (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
  var i = isLE ? 0 : (nBytes - 1);
  var d = isLE ? 1 : -1;
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128;
}

var toString = {}.toString;

var isArray = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var INSPECT_MAX_BYTES = 50;

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global$1.TYPED_ARRAY_SUPPORT !== undefined
  ? global$1.TYPED_ARRAY_SUPPORT
  : true;

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length);
    that.__proto__ = Buffer.prototype;
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length);
    }
    that.length = length;
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192; // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype;
  return arr
};

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
};

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype;
  Buffer.__proto__ = Uint8Array;
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size);
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
};

function allocUnsafe (that, size) {
  assertSize(size);
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0);
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0;
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
};
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
};

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8';
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0;
  that = createBuffer(that, length);

  var actual = that.write(string, encoding);

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual);
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0;
  that = createBuffer(that, length);
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255;
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength; // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array);
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset);
  } else {
    array = new Uint8Array(array, byteOffset, length);
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array;
    that.__proto__ = Buffer.prototype;
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array);
  }
  return that
}

function fromObject (that, obj) {
  if (internalIsBuffer(obj)) {
    var len = checked(obj.length) | 0;
    that = createBuffer(that, len);

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len);
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}
Buffer.isBuffer = isBuffer;
function internalIsBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!internalIsBuffer(a) || !internalIsBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length;
  var y = b.length;

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i];
      y = b[i];
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
};

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
};

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i;
  if (length === undefined) {
    length = 0;
    for (i = 0; i < list.length; ++i) {
      length += list[i].length;
    }
  }

  var buffer = Buffer.allocUnsafe(length);
  var pos = 0;
  for (i = 0; i < list.length; ++i) {
    var buf = list[i];
    if (!internalIsBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer
};

function byteLength (string, encoding) {
  if (internalIsBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string;
  }

  var len = string.length;
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false;
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase();
        loweredCase = true;
    }
  }
}
Buffer.byteLength = byteLength;

function slowToString (encoding, start, end) {
  var loweredCase = false;

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0;
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length;
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0;
  start >>>= 0;

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8';

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase();
        loweredCase = true;
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true;

function swap (b, n, m) {
  var i = b[n];
  b[n] = b[m];
  b[m] = i;
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length;
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1);
  }
  return this
};

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length;
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3);
    swap(this, i + 1, i + 2);
  }
  return this
};

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length;
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7);
    swap(this, i + 1, i + 6);
    swap(this, i + 2, i + 5);
    swap(this, i + 3, i + 4);
  }
  return this
};

Buffer.prototype.toString = function toString () {
  var length = this.length | 0;
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
};

Buffer.prototype.equals = function equals (b) {
  if (!internalIsBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
};

Buffer.prototype.inspect = function inspect () {
  var str = '';
  var max = INSPECT_MAX_BYTES;
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ');
    if (this.length > max) str += ' ... ';
  }
  return '<Buffer ' + str + '>'
};

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!internalIsBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0;
  }
  if (end === undefined) {
    end = target ? target.length : 0;
  }
  if (thisStart === undefined) {
    thisStart = 0;
  }
  if (thisEnd === undefined) {
    thisEnd = this.length;
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0;
  end >>>= 0;
  thisStart >>>= 0;
  thisEnd >>>= 0;

  if (this === target) return 0

  var x = thisEnd - thisStart;
  var y = end - start;
  var len = Math.min(x, y);

  var thisCopy = this.slice(thisStart, thisEnd);
  var targetCopy = target.slice(start, end);

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i];
      y = targetCopy[i];
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
};

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset;
    byteOffset = 0;
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff;
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000;
  }
  byteOffset = +byteOffset;  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1);
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1;
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0;
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding);
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (internalIsBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF; // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1;
  var arrLength = arr.length;
  var valLength = val.length;

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase();
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2;
      arrLength /= 2;
      valLength /= 2;
      byteOffset /= 2;
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i;
  if (dir) {
    var foundIndex = -1;
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i;
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex;
        foundIndex = -1;
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
    for (i = byteOffset; i >= 0; i--) {
      var found = true;
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false;
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
};

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
};

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
};

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0;
  var remaining = buf.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = Number(length);
    if (length > remaining) {
      length = remaining;
    }
  }

  // must be an even number of digits
  var strLen = string.length;
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16);
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed;
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8';
    length = this.length;
    offset = 0;
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset;
    length = this.length;
    offset = 0;
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0;
    if (isFinite(length)) {
      length = length | 0;
      if (encoding === undefined) encoding = 'utf8';
    } else {
      encoding = length;
      length = undefined;
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset;
  if (length === undefined || length > remaining) length = remaining;

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8';

  var loweredCase = false;
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase();
        loweredCase = true;
    }
  }
};

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
};

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return fromByteArray(buf)
  } else {
    return fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end);
  var res = [];

  var i = start;
  while (i < end) {
    var firstByte = buf[i];
    var codePoint = null;
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1;

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint;

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte;
          }
          break
        case 2:
          secondByte = buf[i + 1];
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint;
            }
          }
          break
        case 3:
          secondByte = buf[i + 1];
          thirdByte = buf[i + 2];
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint;
            }
          }
          break
        case 4:
          secondByte = buf[i + 1];
          thirdByte = buf[i + 2];
          fourthByte = buf[i + 3];
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint;
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD;
      bytesPerSequence = 1;
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000;
      res.push(codePoint >>> 10 & 0x3FF | 0xD800);
      codePoint = 0xDC00 | codePoint & 0x3FF;
    }

    res.push(codePoint);
    i += bytesPerSequence;
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000;

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length;
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = '';
  var i = 0;
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    );
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = '';
  end = Math.min(buf.length, end);

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F);
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = '';
  end = Math.min(buf.length, end);

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i]);
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i]);
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end);
  var res = '';
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length;
  start = ~~start;
  end = end === undefined ? len : ~~end;

  if (start < 0) {
    start += len;
    if (start < 0) start = 0;
  } else if (start > len) {
    start = len;
  }

  if (end < 0) {
    end += len;
    if (end < 0) end = 0;
  } else if (end > len) {
    end = len;
  }

  if (end < start) end = start;

  var newBuf;
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end);
    newBuf.__proto__ = Buffer.prototype;
  } else {
    var sliceLen = end - start;
    newBuf = new Buffer(sliceLen, undefined);
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start];
    }
  }

  return newBuf
};

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var val = this[offset];
  var mul = 1;
  var i = 0;
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul;
  }

  return val
};

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length);
  }

  var val = this[offset + --byteLength];
  var mul = 1;
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul;
  }

  return val
};

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length);
  return this[offset]
};

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  return this[offset] | (this[offset + 1] << 8)
};

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  return (this[offset] << 8) | this[offset + 1]
};

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
};

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
};

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var val = this[offset];
  var mul = 1;
  var i = 0;
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul;
  }
  mul *= 0x80;

  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

  return val
};

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var i = byteLength;
  var mul = 1;
  var val = this[offset + --i];
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul;
  }
  mul *= 0x80;

  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

  return val
};

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length);
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
};

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  var val = this[offset] | (this[offset + 1] << 8);
  return (val & 0x8000) ? val | 0xFFFF0000 : val
};

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length);
  var val = this[offset + 1] | (this[offset] << 8);
  return (val & 0x8000) ? val | 0xFFFF0000 : val
};

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
};

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
};

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);
  return read(this, offset, true, 23, 4)
};

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length);
  return read(this, offset, false, 23, 4)
};

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length);
  return read(this, offset, true, 52, 8)
};

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length);
  return read(this, offset, false, 52, 8)
};

function checkInt (buf, value, offset, ext, max, min) {
  if (!internalIsBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1;
    checkInt(this, value, offset, byteLength, maxBytes, 0);
  }

  var mul = 1;
  var i = 0;
  this[offset] = value & 0xFF;
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  byteLength = byteLength | 0;
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1;
    checkInt(this, value, offset, byteLength, maxBytes, 0);
  }

  var i = byteLength - 1;
  var mul = 1;
  this[offset + i] = value & 0xFF;
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
  this[offset] = (value & 0xff);
  return offset + 1
};

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1;
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8;
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff);
    this[offset + 1] = (value >>> 8);
  } else {
    objectWriteUInt16(this, value, offset, true);
  }
  return offset + 2
};

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8);
    this[offset + 1] = (value & 0xff);
  } else {
    objectWriteUInt16(this, value, offset, false);
  }
  return offset + 2
};

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1;
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff;
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24);
    this[offset + 2] = (value >>> 16);
    this[offset + 1] = (value >>> 8);
    this[offset] = (value & 0xff);
  } else {
    objectWriteUInt32(this, value, offset, true);
  }
  return offset + 4
};

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24);
    this[offset + 1] = (value >>> 16);
    this[offset + 2] = (value >>> 8);
    this[offset + 3] = (value & 0xff);
  } else {
    objectWriteUInt32(this, value, offset, false);
  }
  return offset + 4
};

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1);

    checkInt(this, value, offset, byteLength, limit - 1, -limit);
  }

  var i = 0;
  var mul = 1;
  var sub = 0;
  this[offset] = value & 0xFF;
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1;
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1);

    checkInt(this, value, offset, byteLength, limit - 1, -limit);
  }

  var i = byteLength - 1;
  var mul = 1;
  var sub = 0;
  this[offset + i] = value & 0xFF;
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1;
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
  }

  return offset + byteLength
};

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
  if (value < 0) value = 0xff + value + 1;
  this[offset] = (value & 0xff);
  return offset + 1
};

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff);
    this[offset + 1] = (value >>> 8);
  } else {
    objectWriteUInt16(this, value, offset, true);
  }
  return offset + 2
};

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8);
    this[offset + 1] = (value & 0xff);
  } else {
    objectWriteUInt16(this, value, offset, false);
  }
  return offset + 2
};

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff);
    this[offset + 1] = (value >>> 8);
    this[offset + 2] = (value >>> 16);
    this[offset + 3] = (value >>> 24);
  } else {
    objectWriteUInt32(this, value, offset, true);
  }
  return offset + 4
};

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value;
  offset = offset | 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
  if (value < 0) value = 0xffffffff + value + 1;
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24);
    this[offset + 1] = (value >>> 16);
    this[offset + 2] = (value >>> 8);
    this[offset + 3] = (value & 0xff);
  } else {
    objectWriteUInt32(this, value, offset, false);
  }
  return offset + 4
};

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4);
  }
  write(buf, value, offset, littleEndian, 23, 4);
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
};

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
};

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8);
  }
  write(buf, value, offset, littleEndian, 52, 8);
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
};

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
};

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0;
  if (!end && end !== 0) end = this.length;
  if (targetStart >= target.length) targetStart = target.length;
  if (!targetStart) targetStart = 0;
  if (end > 0 && end < start) end = start;

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length;
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start;
  }

  var len = end - start;
  var i;

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start];
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start];
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    );
  }

  return len
};

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start;
      start = 0;
      end = this.length;
    } else if (typeof end === 'string') {
      encoding = end;
      end = this.length;
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0);
      if (code < 256) {
        val = code;
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255;
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0;
  end = end === undefined ? this.length : end >>> 0;

  if (!val) val = 0;

  var i;
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val;
    }
  } else {
    var bytes = internalIsBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString());
    var len = bytes.length;
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len];
    }
  }

  return this
};

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '');
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '=';
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity;
  var codePoint;
  var length = string.length;
  var leadSurrogate = null;
  var bytes = [];

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i);

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
          continue
        }

        // valid lead
        leadSurrogate = codePoint;

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
        leadSurrogate = codePoint;
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
    }

    leadSurrogate = null;

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      );
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      );
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = [];
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF);
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo;
  var byteArray = [];
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i);
    hi = c >> 8;
    lo = c % 256;
    byteArray.push(lo);
    byteArray.push(hi);
  }

  return byteArray
}


function base64ToBytes (str) {
  return toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i];
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}


// the following is from is-buffer, also by Feross Aboukhadijeh and with same lisence
// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
function isBuffer(obj) {
  return obj != null && (!!obj._isBuffer || isFastBuffer(obj) || isSlowBuffer(obj))
}

function isFastBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isFastBuffer(obj.slice(0, 0))
}

var inherits;
if (typeof Object.create === 'function'){
  inherits = function inherits(ctor, superCtor) {
    // implementation from standard node.js 'util' module
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  inherits = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor;
    var TempCtor = function () {};
    TempCtor.prototype = superCtor.prototype;
    ctor.prototype = new TempCtor();
    ctor.prototype.constructor = ctor;
  };
}
var inherits$1 = inherits;

var formatRegExp = /%[sdj%]/g;
function format(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
}

// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
function deprecate(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global$1.process)) {
    return function() {
      return deprecate(fn, msg).apply(this, arguments);
    };
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

var debugs = {};
var debugEnviron;
function debuglog(set) {
  if (isUndefined(debugEnviron))
    debugEnviron =  '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = 0;
      debugs[set] = function() {
        var msg = format.apply(null, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
}

/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    _extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}

// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray$1(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var length = output.reduce(function(prev, cur) {
    if (cur.indexOf('\n') >= 0) ;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray$1(ar) {
  return Array.isArray(ar);
}

function isBoolean(arg) {
  return typeof arg === 'boolean';
}

function isNull(arg) {
  return arg === null;
}

function isNullOrUndefined(arg) {
  return arg == null;
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isString(arg) {
  return typeof arg === 'string';
}

function isSymbol(arg) {
  return typeof arg === 'symbol';
}

function isUndefined(arg) {
  return arg === void 0;
}

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}

function isFunction(arg) {
  return typeof arg === 'function';
}

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}

function isBuffer$1(maybeBuf) {
  return Buffer.isBuffer(maybeBuf);
}

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
function log() {
  console.log('%s - %s', timestamp(), format.apply(null, arguments));
}

function _extend(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
}
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

var util = {
  inherits: inherits$1,
  _extend: _extend,
  log: log,
  isBuffer: isBuffer$1,
  isPrimitive: isPrimitive,
  isFunction: isFunction,
  isError: isError,
  isDate: isDate,
  isObject: isObject,
  isRegExp: isRegExp,
  isUndefined: isUndefined,
  isSymbol: isSymbol,
  isString: isString,
  isNumber: isNumber,
  isNullOrUndefined: isNullOrUndefined,
  isNull: isNull,
  isBoolean: isBoolean,
  isArray: isArray$1,
  inspect: inspect,
  deprecate: deprecate,
  format: format,
  debuglog: debuglog
};

var util$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    format: format,
    deprecate: deprecate,
    debuglog: debuglog,
    inspect: inspect,
    isArray: isArray$1,
    isBoolean: isBoolean,
    isNull: isNull,
    isNullOrUndefined: isNullOrUndefined,
    isNumber: isNumber,
    isString: isString,
    isSymbol: isSymbol,
    isUndefined: isUndefined,
    isRegExp: isRegExp,
    isObject: isObject,
    isDate: isDate,
    isError: isError,
    isFunction: isFunction,
    isPrimitive: isPrimitive,
    isBuffer: isBuffer$1,
    log: log,
    inherits: inherits$1,
    _extend: _extend,
    'default': util
});

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

class Hook {
	constructor(args) {
		if (!Array.isArray(args)) args = [];
		this._args = args;
		this.taps = [];
		this.interceptors = [];
		this.call = this._call;
		this.promise = this._promise;
		this.callAsync = this._callAsync;
		this._x = undefined;
	}

	compile(options) {
		throw new Error("Abstract: should be overriden");
	}

	_createCall(type) {
		return this.compile({
			taps: this.taps,
			interceptors: this.interceptors,
			args: this._args,
			type: type
		});
	}

	tap(options, fn) {
		if (typeof options === "string") options = { name: options };
		if (typeof options !== "object" || options === null)
			throw new Error(
				"Invalid arguments to tap(options: Object, fn: function)"
			);
		options = Object.assign({ type: "sync", fn: fn }, options);
		if (typeof options.name !== "string" || options.name === "")
			throw new Error("Missing name for tap");
		options = this._runRegisterInterceptors(options);
		this._insert(options);
	}

	tapAsync(options, fn) {
		if (typeof options === "string") options = { name: options };
		if (typeof options !== "object" || options === null)
			throw new Error(
				"Invalid arguments to tapAsync(options: Object, fn: function)"
			);
		options = Object.assign({ type: "async", fn: fn }, options);
		if (typeof options.name !== "string" || options.name === "")
			throw new Error("Missing name for tapAsync");
		options = this._runRegisterInterceptors(options);
		this._insert(options);
	}

	tapPromise(options, fn) {
		if (typeof options === "string") options = { name: options };
		if (typeof options !== "object" || options === null)
			throw new Error(
				"Invalid arguments to tapPromise(options: Object, fn: function)"
			);
		options = Object.assign({ type: "promise", fn: fn }, options);
		if (typeof options.name !== "string" || options.name === "")
			throw new Error("Missing name for tapPromise");
		options = this._runRegisterInterceptors(options);
		this._insert(options);
	}

	_runRegisterInterceptors(options) {
		for (const interceptor of this.interceptors) {
			if (interceptor.register) {
				const newOptions = interceptor.register(options);
				if (newOptions !== undefined) options = newOptions;
			}
		}
		return options;
	}

	withOptions(options) {
		const mergeOptions = opt =>
			Object.assign({}, options, typeof opt === "string" ? { name: opt } : opt);

		// Prevent creating endless prototype chains
		options = Object.assign({}, options, this._withOptions);
		const base = this._withOptionsBase || this;
		const newHook = Object.create(base);

		(newHook.tapAsync = (opt, fn) => base.tapAsync(mergeOptions(opt), fn)),
			(newHook.tap = (opt, fn) => base.tap(mergeOptions(opt), fn));
		newHook.tapPromise = (opt, fn) => base.tapPromise(mergeOptions(opt), fn);
		newHook._withOptions = options;
		newHook._withOptionsBase = base;
		return newHook;
	}

	isUsed() {
		return this.taps.length > 0 || this.interceptors.length > 0;
	}

	intercept(interceptor) {
		this._resetCompilation();
		this.interceptors.push(Object.assign({}, interceptor));
		if (interceptor.register) {
			for (let i = 0; i < this.taps.length; i++)
				this.taps[i] = interceptor.register(this.taps[i]);
		}
	}

	_resetCompilation() {
		this.call = this._call;
		this.callAsync = this._callAsync;
		this.promise = this._promise;
	}

	_insert(item) {
		this._resetCompilation();
		let before;
		if (typeof item.before === "string") before = new Set([item.before]);
		else if (Array.isArray(item.before)) {
			before = new Set(item.before);
		}
		let stage = 0;
		if (typeof item.stage === "number") stage = item.stage;
		let i = this.taps.length;
		while (i > 0) {
			i--;
			const x = this.taps[i];
			this.taps[i + 1] = x;
			const xStage = x.stage || 0;
			if (before) {
				if (before.has(x.name)) {
					before.delete(x.name);
					continue;
				}
				if (before.size > 0) {
					continue;
				}
			}
			if (xStage > stage) {
				continue;
			}
			i++;
			break;
		}
		this.taps[i] = item;
	}
}

function createCompileDelegate(name, type) {
	return function lazyCompileHook(...args) {
		this[name] = this._createCall(type);
		return this[name](...args);
	};
}

Object.defineProperties(Hook.prototype, {
	_call: {
		value: createCompileDelegate("call", "sync"),
		configurable: true,
		writable: true
	},
	_promise: {
		value: createCompileDelegate("promise", "promise"),
		configurable: true,
		writable: true
	},
	_callAsync: {
		value: createCompileDelegate("callAsync", "async"),
		configurable: true,
		writable: true
	}
});

var Hook_1 = Hook;

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

class HookCodeFactory {
	constructor(config) {
		this.config = config;
		this.options = undefined;
		this._args = undefined;
	}

	create(options) {
		this.init(options);
		let fn;
		switch (this.options.type) {
			case "sync":
				fn = new Function(
					this.args(),
					'"use strict";\n' +
						this.header() +
						this.content({
							onError: err => `throw ${err};\n`,
							onResult: result => `return ${result};\n`,
							resultReturns: true,
							onDone: () => "",
							rethrowIfPossible: true
						})
				);
				break;
			case "async":
				fn = new Function(
					this.args({
						after: "_callback"
					}),
					'"use strict";\n' +
						this.header() +
						this.content({
							onError: err => `_callback(${err});\n`,
							onResult: result => `_callback(null, ${result});\n`,
							onDone: () => "_callback();\n"
						})
				);
				break;
			case "promise":
				let errorHelperUsed = false;
				const content = this.content({
					onError: err => {
						errorHelperUsed = true;
						return `_error(${err});\n`;
					},
					onResult: result => `_resolve(${result});\n`,
					onDone: () => "_resolve();\n"
				});
				let code = "";
				code += '"use strict";\n';
				code += "return new Promise((_resolve, _reject) => {\n";
				if (errorHelperUsed) {
					code += "var _sync = true;\n";
					code += "function _error(_err) {\n";
					code += "if(_sync)\n";
					code += "_resolve(Promise.resolve().then(() => { throw _err; }));\n";
					code += "else\n";
					code += "_reject(_err);\n";
					code += "};\n";
				}
				code += this.header();
				code += content;
				if (errorHelperUsed) {
					code += "_sync = false;\n";
				}
				code += "});\n";
				fn = new Function(this.args(), code);
				break;
		}
		this.deinit();
		return fn;
	}

	setup(instance, options) {
		instance._x = options.taps.map(t => t.fn);
	}

	/**
	 * @param {{ type: "sync" | "promise" | "async", taps: Array<Tap>, interceptors: Array<Interceptor> }} options
	 */
	init(options) {
		this.options = options;
		this._args = options.args.slice();
	}

	deinit() {
		this.options = undefined;
		this._args = undefined;
	}

	header() {
		let code = "";
		if (this.needContext()) {
			code += "var _context = {};\n";
		} else {
			code += "var _context;\n";
		}
		code += "var _x = this._x;\n";
		if (this.options.interceptors.length > 0) {
			code += "var _taps = this.taps;\n";
			code += "var _interceptors = this.interceptors;\n";
		}
		for (let i = 0; i < this.options.interceptors.length; i++) {
			const interceptor = this.options.interceptors[i];
			if (interceptor.call) {
				code += `${this.getInterceptor(i)}.call(${this.args({
					before: interceptor.context ? "_context" : undefined
				})});\n`;
			}
		}
		return code;
	}

	needContext() {
		for (const tap of this.options.taps) if (tap.context) return true;
		return false;
	}

	callTap(tapIndex, { onError, onResult, onDone, rethrowIfPossible }) {
		let code = "";
		let hasTapCached = false;
		for (let i = 0; i < this.options.interceptors.length; i++) {
			const interceptor = this.options.interceptors[i];
			if (interceptor.tap) {
				if (!hasTapCached) {
					code += `var _tap${tapIndex} = ${this.getTap(tapIndex)};\n`;
					hasTapCached = true;
				}
				code += `${this.getInterceptor(i)}.tap(${
					interceptor.context ? "_context, " : ""
				}_tap${tapIndex});\n`;
			}
		}
		code += `var _fn${tapIndex} = ${this.getTapFn(tapIndex)};\n`;
		const tap = this.options.taps[tapIndex];
		switch (tap.type) {
			case "sync":
				if (!rethrowIfPossible) {
					code += `var _hasError${tapIndex} = false;\n`;
					code += "try {\n";
				}
				if (onResult) {
					code += `var _result${tapIndex} = _fn${tapIndex}(${this.args({
						before: tap.context ? "_context" : undefined
					})});\n`;
				} else {
					code += `_fn${tapIndex}(${this.args({
						before: tap.context ? "_context" : undefined
					})});\n`;
				}
				if (!rethrowIfPossible) {
					code += "} catch(_err) {\n";
					code += `_hasError${tapIndex} = true;\n`;
					code += onError("_err");
					code += "}\n";
					code += `if(!_hasError${tapIndex}) {\n`;
				}
				if (onResult) {
					code += onResult(`_result${tapIndex}`);
				}
				if (onDone) {
					code += onDone();
				}
				if (!rethrowIfPossible) {
					code += "}\n";
				}
				break;
			case "async":
				let cbCode = "";
				if (onResult) cbCode += `(_err${tapIndex}, _result${tapIndex}) => {\n`;
				else cbCode += `_err${tapIndex} => {\n`;
				cbCode += `if(_err${tapIndex}) {\n`;
				cbCode += onError(`_err${tapIndex}`);
				cbCode += "} else {\n";
				if (onResult) {
					cbCode += onResult(`_result${tapIndex}`);
				}
				if (onDone) {
					cbCode += onDone();
				}
				cbCode += "}\n";
				cbCode += "}";
				code += `_fn${tapIndex}(${this.args({
					before: tap.context ? "_context" : undefined,
					after: cbCode
				})});\n`;
				break;
			case "promise":
				code += `var _hasResult${tapIndex} = false;\n`;
				code += `var _promise${tapIndex} = _fn${tapIndex}(${this.args({
					before: tap.context ? "_context" : undefined
				})});\n`;
				code += `if (!_promise${tapIndex} || !_promise${tapIndex}.then)\n`;
				code += `  throw new Error('Tap function (tapPromise) did not return promise (returned ' + _promise${tapIndex} + ')');\n`;
				code += `_promise${tapIndex}.then(_result${tapIndex} => {\n`;
				code += `_hasResult${tapIndex} = true;\n`;
				if (onResult) {
					code += onResult(`_result${tapIndex}`);
				}
				if (onDone) {
					code += onDone();
				}
				code += `}, _err${tapIndex} => {\n`;
				code += `if(_hasResult${tapIndex}) throw _err${tapIndex};\n`;
				code += onError(`_err${tapIndex}`);
				code += "});\n";
				break;
		}
		return code;
	}

	callTapsSeries({
		onError,
		onResult,
		resultReturns,
		onDone,
		doneReturns,
		rethrowIfPossible
	}) {
		if (this.options.taps.length === 0) return onDone();
		const firstAsync = this.options.taps.findIndex(t => t.type !== "sync");
		const somethingReturns = resultReturns || doneReturns || false;
		let code = "";
		let current = onDone;
		for (let j = this.options.taps.length - 1; j >= 0; j--) {
			const i = j;
			const unroll = current !== onDone && this.options.taps[i].type !== "sync";
			if (unroll) {
				code += `function _next${i}() {\n`;
				code += current();
				code += `}\n`;
				current = () => `${somethingReturns ? "return " : ""}_next${i}();\n`;
			}
			const done = current;
			const doneBreak = skipDone => {
				if (skipDone) return "";
				return onDone();
			};
			const content = this.callTap(i, {
				onError: error => onError(i, error, done, doneBreak),
				onResult:
					onResult &&
					(result => {
						return onResult(i, result, done, doneBreak);
					}),
				onDone: !onResult && done,
				rethrowIfPossible:
					rethrowIfPossible && (firstAsync < 0 || i < firstAsync)
			});
			current = () => content;
		}
		code += current();
		return code;
	}

	callTapsLooping({ onError, onDone, rethrowIfPossible }) {
		if (this.options.taps.length === 0) return onDone();
		const syncOnly = this.options.taps.every(t => t.type === "sync");
		let code = "";
		if (!syncOnly) {
			code += "var _looper = () => {\n";
			code += "var _loopAsync = false;\n";
		}
		code += "var _loop;\n";
		code += "do {\n";
		code += "_loop = false;\n";
		for (let i = 0; i < this.options.interceptors.length; i++) {
			const interceptor = this.options.interceptors[i];
			if (interceptor.loop) {
				code += `${this.getInterceptor(i)}.loop(${this.args({
					before: interceptor.context ? "_context" : undefined
				})});\n`;
			}
		}
		code += this.callTapsSeries({
			onError,
			onResult: (i, result, next, doneBreak) => {
				let code = "";
				code += `if(${result} !== undefined) {\n`;
				code += "_loop = true;\n";
				if (!syncOnly) code += "if(_loopAsync) _looper();\n";
				code += doneBreak(true);
				code += `} else {\n`;
				code += next();
				code += `}\n`;
				return code;
			},
			onDone:
				onDone &&
				(() => {
					let code = "";
					code += "if(!_loop) {\n";
					code += onDone();
					code += "}\n";
					return code;
				}),
			rethrowIfPossible: rethrowIfPossible && syncOnly
		});
		code += "} while(_loop);\n";
		if (!syncOnly) {
			code += "_loopAsync = true;\n";
			code += "};\n";
			code += "_looper();\n";
		}
		return code;
	}

	callTapsParallel({
		onError,
		onResult,
		onDone,
		rethrowIfPossible,
		onTap = (i, run) => run()
	}) {
		if (this.options.taps.length <= 1) {
			return this.callTapsSeries({
				onError,
				onResult,
				onDone,
				rethrowIfPossible
			});
		}
		let code = "";
		code += "do {\n";
		code += `var _counter = ${this.options.taps.length};\n`;
		if (onDone) {
			code += "var _done = () => {\n";
			code += onDone();
			code += "};\n";
		}
		for (let i = 0; i < this.options.taps.length; i++) {
			const done = () => {
				if (onDone) return "if(--_counter === 0) _done();\n";
				else return "--_counter;";
			};
			const doneBreak = skipDone => {
				if (skipDone || !onDone) return "_counter = 0;\n";
				else return "_counter = 0;\n_done();\n";
			};
			code += "if(_counter <= 0) break;\n";
			code += onTap(
				i,
				() =>
					this.callTap(i, {
						onError: error => {
							let code = "";
							code += "if(_counter > 0) {\n";
							code += onError(i, error, done, doneBreak);
							code += "}\n";
							return code;
						},
						onResult:
							onResult &&
							(result => {
								let code = "";
								code += "if(_counter > 0) {\n";
								code += onResult(i, result, done, doneBreak);
								code += "}\n";
								return code;
							}),
						onDone:
							!onResult &&
							(() => {
								return done();
							}),
						rethrowIfPossible
					}),
				done,
				doneBreak
			);
		}
		code += "} while(false);\n";
		return code;
	}

	args({ before, after } = {}) {
		let allArgs = this._args;
		if (before) allArgs = [before].concat(allArgs);
		if (after) allArgs = allArgs.concat(after);
		if (allArgs.length === 0) {
			return "";
		} else {
			return allArgs.join(", ");
		}
	}

	getTapFn(idx) {
		return `_x[${idx}]`;
	}

	getTap(idx) {
		return `_taps[${idx}]`;
	}

	getInterceptor(idx) {
		return `_interceptors[${idx}]`;
	}
}

var HookCodeFactory_1 = HookCodeFactory;

class SyncBailHookCodeFactory extends HookCodeFactory_1 {
	content({ onError, onResult, resultReturns, onDone, rethrowIfPossible }) {
		return this.callTapsSeries({
			onError: (i, err) => onError(err),
			onResult: (i, result, next) =>
				`if(${result} !== undefined) {\n${onResult(
					result
				)};\n} else {\n${next()}}\n`,
			resultReturns,
			onDone,
			rethrowIfPossible
		});
	}
}

const factory = new SyncBailHookCodeFactory();

class SyncBailHook extends Hook_1 {
	tapAsync() {
		throw new Error("tapAsync is not supported on a SyncBailHook");
	}

	tapPromise() {
		throw new Error("tapPromise is not supported on a SyncBailHook");
	}

	compile(options) {
		factory.setup(this, options);
		return factory.create(options);
	}
}

var SyncBailHook_1 = SyncBailHook;

var util$2 = getCjsExportFromNamespace(util$1);

function Tapable() {
	this._pluginCompat = new SyncBailHook_1(["options"]);
	this._pluginCompat.tap(
		{
			name: "Tapable camelCase",
			stage: 100
		},
		options => {
			options.names.add(
				options.name.replace(/[- ]([a-z])/g, (str, ch) => ch.toUpperCase())
			);
		}
	);
	this._pluginCompat.tap(
		{
			name: "Tapable this.hooks",
			stage: 200
		},
		options => {
			let hook;
			for (const name of options.names) {
				hook = this.hooks[name];
				if (hook !== undefined) {
					break;
				}
			}
			if (hook !== undefined) {
				const tapOpt = {
					name: options.fn.name || "unnamed compat plugin",
					stage: options.stage || 0
				};
				if (options.async) hook.tapAsync(tapOpt, options.fn);
				else hook.tap(tapOpt, options.fn);
				return true;
			}
		}
	);
}
var Tapable_1 = Tapable;

Tapable.addCompatLayer = function addCompatLayer(instance) {
	Tapable.call(instance);
	instance.plugin = Tapable.prototype.plugin;
	instance.apply = Tapable.prototype.apply;
};

Tapable.prototype.plugin = util$2.deprecate(function plugin(name, fn) {
	if (Array.isArray(name)) {
		name.forEach(function(name) {
			this.plugin(name, fn);
		}, this);
		return;
	}
	const result = this._pluginCompat.call({
		name: name,
		fn: fn,
		names: new Set([name])
	});
	if (!result) {
		throw new Error(
			`Plugin could not be registered at '${name}'. Hook was not found.\n` +
				"BREAKING CHANGE: There need to exist a hook at 'this.hooks'. " +
				"To create a compatibility layer for this hook, hook into 'this._pluginCompat'."
		);
	}
}, "Tapable.plugin is deprecated. Use new API on `.hooks` instead");

Tapable.prototype.apply = util$2.deprecate(function apply() {
	for (var i = 0; i < arguments.length; i++) {
		arguments[i].apply(this);
	}
}, "Tapable.apply is deprecated. Call apply on the plugin directly instead");

class SyncHookCodeFactory extends HookCodeFactory_1 {
	content({ onError, onDone, rethrowIfPossible }) {
		return this.callTapsSeries({
			onError: (i, err) => onError(err),
			onDone,
			rethrowIfPossible
		});
	}
}

const factory$1 = new SyncHookCodeFactory();

class SyncHook extends Hook_1 {
	tapAsync() {
		throw new Error("tapAsync is not supported on a SyncHook");
	}

	tapPromise() {
		throw new Error("tapPromise is not supported on a SyncHook");
	}

	compile(options) {
		factory$1.setup(this, options);
		return factory$1.create(options);
	}
}

var SyncHook_1 = SyncHook;

class SyncWaterfallHookCodeFactory extends HookCodeFactory_1 {
	content({ onError, onResult, resultReturns, rethrowIfPossible }) {
		return this.callTapsSeries({
			onError: (i, err) => onError(err),
			onResult: (i, result, next) => {
				let code = "";
				code += `if(${result} !== undefined) {\n`;
				code += `${this._args[0]} = ${result};\n`;
				code += `}\n`;
				code += next();
				return code;
			},
			onDone: () => onResult(this._args[0]),
			doneReturns: resultReturns,
			rethrowIfPossible
		});
	}
}

const factory$2 = new SyncWaterfallHookCodeFactory();

class SyncWaterfallHook extends Hook_1 {
	constructor(args) {
		super(args);
		if (args.length < 1)
			throw new Error("Waterfall hooks must have at least one argument");
	}

	tapAsync() {
		throw new Error("tapAsync is not supported on a SyncWaterfallHook");
	}

	tapPromise() {
		throw new Error("tapPromise is not supported on a SyncWaterfallHook");
	}

	compile(options) {
		factory$2.setup(this, options);
		return factory$2.create(options);
	}
}

var SyncWaterfallHook_1 = SyncWaterfallHook;

class SyncLoopHookCodeFactory extends HookCodeFactory_1 {
	content({ onError, onDone, rethrowIfPossible }) {
		return this.callTapsLooping({
			onError: (i, err) => onError(err),
			onDone,
			rethrowIfPossible
		});
	}
}

const factory$3 = new SyncLoopHookCodeFactory();

class SyncLoopHook extends Hook_1 {
	tapAsync() {
		throw new Error("tapAsync is not supported on a SyncLoopHook");
	}

	tapPromise() {
		throw new Error("tapPromise is not supported on a SyncLoopHook");
	}

	compile(options) {
		factory$3.setup(this, options);
		return factory$3.create(options);
	}
}

var SyncLoopHook_1 = SyncLoopHook;

class AsyncParallelHookCodeFactory extends HookCodeFactory_1 {
	content({ onError, onDone }) {
		return this.callTapsParallel({
			onError: (i, err, done, doneBreak) => onError(err) + doneBreak(true),
			onDone
		});
	}
}

const factory$4 = new AsyncParallelHookCodeFactory();

class AsyncParallelHook extends Hook_1 {
	compile(options) {
		factory$4.setup(this, options);
		return factory$4.create(options);
	}
}

Object.defineProperties(AsyncParallelHook.prototype, {
	_call: { value: undefined, configurable: true, writable: true }
});

var AsyncParallelHook_1 = AsyncParallelHook;

class AsyncParallelBailHookCodeFactory extends HookCodeFactory_1 {
	content({ onError, onResult, onDone }) {
		let code = "";
		code += `var _results = new Array(${this.options.taps.length});\n`;
		code += "var _checkDone = () => {\n";
		code += "for(var i = 0; i < _results.length; i++) {\n";
		code += "var item = _results[i];\n";
		code += "if(item === undefined) return false;\n";
		code += "if(item.result !== undefined) {\n";
		code += onResult("item.result");
		code += "return true;\n";
		code += "}\n";
		code += "if(item.error) {\n";
		code += onError("item.error");
		code += "return true;\n";
		code += "}\n";
		code += "}\n";
		code += "return false;\n";
		code += "}\n";
		code += this.callTapsParallel({
			onError: (i, err, done, doneBreak) => {
				let code = "";
				code += `if(${i} < _results.length && ((_results.length = ${i +
					1}), (_results[${i}] = { error: ${err} }), _checkDone())) {\n`;
				code += doneBreak(true);
				code += "} else {\n";
				code += done();
				code += "}\n";
				return code;
			},
			onResult: (i, result, done, doneBreak) => {
				let code = "";
				code += `if(${i} < _results.length && (${result} !== undefined && (_results.length = ${i +
					1}), (_results[${i}] = { result: ${result} }), _checkDone())) {\n`;
				code += doneBreak(true);
				code += "} else {\n";
				code += done();
				code += "}\n";
				return code;
			},
			onTap: (i, run, done, doneBreak) => {
				let code = "";
				if (i > 0) {
					code += `if(${i} >= _results.length) {\n`;
					code += done();
					code += "} else {\n";
				}
				code += run();
				if (i > 0) code += "}\n";
				return code;
			},
			onDone
		});
		return code;
	}
}

const factory$5 = new AsyncParallelBailHookCodeFactory();

class AsyncParallelBailHook extends Hook_1 {
	compile(options) {
		factory$5.setup(this, options);
		return factory$5.create(options);
	}
}

Object.defineProperties(AsyncParallelBailHook.prototype, {
	_call: { value: undefined, configurable: true, writable: true }
});

var AsyncParallelBailHook_1 = AsyncParallelBailHook;

class AsyncSeriesHookCodeFactory extends HookCodeFactory_1 {
	content({ onError, onDone }) {
		return this.callTapsSeries({
			onError: (i, err, next, doneBreak) => onError(err) + doneBreak(true),
			onDone
		});
	}
}

const factory$6 = new AsyncSeriesHookCodeFactory();

class AsyncSeriesHook extends Hook_1 {
	compile(options) {
		factory$6.setup(this, options);
		return factory$6.create(options);
	}
}

Object.defineProperties(AsyncSeriesHook.prototype, {
	_call: { value: undefined, configurable: true, writable: true }
});

var AsyncSeriesHook_1 = AsyncSeriesHook;

class AsyncSeriesBailHookCodeFactory extends HookCodeFactory_1 {
	content({ onError, onResult, resultReturns, onDone }) {
		return this.callTapsSeries({
			onError: (i, err, next, doneBreak) => onError(err) + doneBreak(true),
			onResult: (i, result, next) =>
				`if(${result} !== undefined) {\n${onResult(
					result
				)};\n} else {\n${next()}}\n`,
			resultReturns,
			onDone
		});
	}
}

const factory$7 = new AsyncSeriesBailHookCodeFactory();

class AsyncSeriesBailHook extends Hook_1 {
	compile(options) {
		factory$7.setup(this, options);
		return factory$7.create(options);
	}
}

Object.defineProperties(AsyncSeriesBailHook.prototype, {
	_call: { value: undefined, configurable: true, writable: true }
});

var AsyncSeriesBailHook_1 = AsyncSeriesBailHook;

class AsyncSeriesWaterfallHookCodeFactory extends HookCodeFactory_1 {
	content({ onError, onResult, onDone }) {
		return this.callTapsSeries({
			onError: (i, err, next, doneBreak) => onError(err) + doneBreak(true),
			onResult: (i, result, next) => {
				let code = "";
				code += `if(${result} !== undefined) {\n`;
				code += `${this._args[0]} = ${result};\n`;
				code += `}\n`;
				code += next();
				return code;
			},
			onDone: () => onResult(this._args[0])
		});
	}
}

const factory$8 = new AsyncSeriesWaterfallHookCodeFactory();

class AsyncSeriesWaterfallHook extends Hook_1 {
	constructor(args) {
		super(args);
		if (args.length < 1)
			throw new Error("Waterfall hooks must have at least one argument");
	}

	compile(options) {
		factory$8.setup(this, options);
		return factory$8.create(options);
	}
}

Object.defineProperties(AsyncSeriesWaterfallHook.prototype, {
	_call: { value: undefined, configurable: true, writable: true }
});

var AsyncSeriesWaterfallHook_1 = AsyncSeriesWaterfallHook;

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

class HookMap {
	constructor(factory) {
		this._map = new Map();
		this._factory = factory;
		this._interceptors = [];
	}

	get(key) {
		return this._map.get(key);
	}

	for(key) {
		const hook = this.get(key);
		if (hook !== undefined) {
			return hook;
		}
		let newHook = this._factory(key);
		const interceptors = this._interceptors;
		for (let i = 0; i < interceptors.length; i++) {
			newHook = interceptors[i].factory(key, newHook);
		}
		this._map.set(key, newHook);
		return newHook;
	}

	intercept(interceptor) {
		this._interceptors.push(
			Object.assign(
				{
					factory: (key, hook) => hook
				},
				interceptor
			)
		);
	}

	tap(key, options, fn) {
		return this.for(key).tap(options, fn);
	}

	tapAsync(key, options, fn) {
		return this.for(key).tapAsync(options, fn);
	}

	tapPromise(key, options, fn) {
		return this.for(key).tapPromise(options, fn);
	}
}

var HookMap_1 = HookMap;

class MultiHook {
	constructor(hooks) {
		this.hooks = hooks;
	}

	tap(options, fn) {
		for (const hook of this.hooks) {
			hook.tap(options, fn);
		}
	}

	tapAsync(options, fn) {
		for (const hook of this.hooks) {
			hook.tapAsync(options, fn);
		}
	}

	tapPromise(options, fn) {
		for (const hook of this.hooks) {
			hook.tapPromise(options, fn);
		}
	}

	isUsed() {
		for (const hook of this.hooks) {
			if (hook.isUsed()) return true;
		}
		return false;
	}

	intercept(interceptor) {
		for (const hook of this.hooks) {
			hook.intercept(interceptor);
		}
	}

	withOptions(options) {
		return new MultiHook(this.hooks.map(h => h.withOptions(options)));
	}
}

var MultiHook_1 = MultiHook;

var lib = createCommonjsModule(function (module, exports) {

exports.__esModule = true;
exports.Tapable = Tapable_1;
exports.SyncHook = SyncHook_1;
exports.SyncBailHook = SyncBailHook_1;
exports.SyncWaterfallHook = SyncWaterfallHook_1;
exports.SyncLoopHook = SyncLoopHook_1;
exports.AsyncParallelHook = AsyncParallelHook_1;
exports.AsyncParallelBailHook = AsyncParallelBailHook_1;
exports.AsyncSeriesHook = AsyncSeriesHook_1;
exports.AsyncSeriesBailHook = AsyncSeriesBailHook_1;
exports.AsyncSeriesWaterfallHook = AsyncSeriesWaterfallHook_1;
exports.HookMap = HookMap_1;
exports.MultiHook = MultiHook_1;
});

unwrapExports(lib);
var lib_1 = lib.Tapable;
var lib_2 = lib.SyncHook;
var lib_3 = lib.SyncBailHook;
var lib_4 = lib.SyncWaterfallHook;
var lib_5 = lib.SyncLoopHook;
var lib_6 = lib.AsyncParallelHook;
var lib_7 = lib.AsyncParallelBailHook;
var lib_8 = lib.AsyncSeriesHook;
var lib_9 = lib.AsyncSeriesBailHook;
var lib_10 = lib.AsyncSeriesWaterfallHook;
var lib_11 = lib.HookMap;
var lib_12 = lib.MultiHook;

const defaultPlugins = [];
const HOOKS = {
    beforeRun: new lib_2(),
    run: new lib_2(),
    emit: new lib_2(['data']),
    end: new lib_2()
};
class Pluginable {
    constructor(options) {
        this.plugins = [];
        this.hooks = HOOKS;
        this.plugin = (type, cb) => {
            const name = this.hooks[type].constructor.name;
            const method = /Async/.test(name) ? 'tapAsync' : 'tap';
            this.hooks[type][method](type, cb);
        };
        this.initPlugin(options);
    }
    initPlugin(options) {
        const { plugins } = options || {};
        this.plugins.push(...defaultPlugins, ...(plugins || []));
    }
    pluginsOnload() {
        this.plugins.forEach(plugin => {
            plugin.apply.call(plugin, this);
        });
    }
    use(plugin) {
        this.plugins.push(plugin);
        plugin.apply(this);
    }
}

class Recorder extends Pluginable {
    constructor(options) {
        super(options);
        this.destroyStore = new Set();
        this.listenStore = new Set();
        this.watchesReadyPromise = new Promise(resolve => (this.watcherResolve = resolve));
        const opts = Object.assign(Object.assign({}, Recorder.defaultRecordOpts), options);
        this.watchers = this.getWatchers(opts);
        this.init(opts);
    }
    init(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const db = yield getDBOperator;
            this.db = db;
            this.pluginsOnload();
            this.hooks.beforeRun.call(this);
            this.record(options);
            this.hooks.run.call(this);
            this.listenVisibleChange(options);
        });
    }
    onData(cb) {
        this.onDataCallback = cb;
    }
    destroy() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.cancelListen();
            this.destroyStore.forEach(un => un());
        });
    }
    cancelListen() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.watchesReadyPromise;
            this.listenStore.forEach(un => un());
            nodeStore.reset();
        });
    }
    getWatchers(options) {
        const watchers$1 = [
            Snapshot,
            ...Object.values(watchers)
        ];
        if (options && options.audio) {
            watchers$1.push(RecordAudio);
        }
        return watchers$1;
    }
    record(options) {
        const opts = Object.assign(Object.assign({}, Recorder.defaultRecordOpts), options);
        this.startRecord((opts.context.G_RECORD_OPTIONS = opts));
    }
    startRecord(options) {
        return __awaiter(this, void 0, void 0, function* () {
            let activeWatchers = this.watchers;
            if (options.context === window) {
                if (!options.skip) {
                    this.db.clear();
                }
            }
            else {
                activeWatchers = [
                    Snapshot,
                    watchers.MouseWatcher,
                    watchers.DOMWatcher,
                    watchers.FormElementWatcher,
                    watchers.ScrollWatcher
                ];
            }
            const onEmit = (options) => {
                const { write } = options;
                return (data) => {
                    if (!data) {
                        return;
                    }
                    this.hooks.emit.call(data);
                    this.onDataCallback && this.onDataCallback(data);
                    if (write) {
                        this.db.addRecord(data);
                    }
                };
            };
            const emit = onEmit(options);
            const headData = yield getHeadData();
            const relatedId = headData.relatedId;
            if (options.context) {
                options.context.G_RECORD_RELATED_ID = relatedId;
            }
            emit({
                type: RecordType.HEAD,
                data: headData,
                relatedId: relatedId,
                time: getRadix64TimeStr()
            });
            activeWatchers.forEach(watcher => {
                new watcher({
                    context: options && options.context,
                    listenStore: this.listenStore,
                    relatedId: relatedId,
                    emit
                });
            });
            this.watcherResolve();
            yield this.recordFrames();
        });
    }
    waitingFramesLoaded() {
        return __awaiter(this, void 0, void 0, function* () {
            const frames = window.frames;
            const validFrames = Array.from(frames)
                .filter(frame => {
                try {
                    const frameElement = frame.frameElement;
                    return frameElement.getAttribute('src');
                }
                catch (e) {
                    logError(e);
                    return false;
                }
            })
                .map(frame => {
                const frameDocument = frame;
                return new Promise(resolve => {
                    frameDocument.addEventListener('load', () => {
                        resolve(frame);
                    });
                });
            });
            if (!validFrames.length) {
                return Promise.resolve([]);
            }
            return Promise.all(validFrames);
        });
    }
    recordFrames() {
        return __awaiter(this, void 0, void 0, function* () {
            const frames = yield this.waitingFramesLoaded();
            frames.forEach(frameWindow => this.record({ context: frameWindow }));
        });
    }
    listenVisibleChange(options) {
        if (typeof document.hidden !== 'undefined') {
            const hidden = 'hidden';
            const visibilityChange = 'visibilitychange';
            function handleVisibilityChange() {
                return __awaiter(this, void 0, void 0, function* () {
                    if (document[hidden]) {
                        const data = {
                            type: RecordType.TERMINATE,
                            data: null,
                            relatedId: options.context.G_RECORD_RELATED_ID,
                            time: getRadix64TimeStr()
                        };
                        this.db.addRecord(data);
                        this.onDataCallback && this.onDataCallback(data);
                        this.cancelListen();
                        this.hooks.end.call();
                    }
                    else {
                        this.record(Object.assign(Object.assign({}, options), { skip: true }));
                    }
                });
            }
            const handle = handleVisibilityChange.bind(this);
            document.addEventListener(visibilityChange, handle, false);
            this.destroyStore.add(() => document.removeEventListener(visibilityChange, handle, false));
        }
    }
}
Recorder.defaultRecordOpts = { mode: 'default', write: true, context: window };

export { Recorder };
//# sourceMappingURL=recorder.esm.js.map
