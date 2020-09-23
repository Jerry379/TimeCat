'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

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
})(exports.RecordType || (exports.RecordType = {}));
(function (FormElementEvent) {
    FormElementEvent[FormElementEvent["PROP"] = 0] = "PROP";
    FormElementEvent[FormElementEvent["INPUT"] = 1] = "INPUT";
    FormElementEvent[FormElementEvent["CHANGE"] = 2] = "CHANGE";
    FormElementEvent[FormElementEvent["FOCUS"] = 3] = "FOCUS";
    FormElementEvent[FormElementEvent["BLUR"] = 4] = "BLUR";
})(exports.FormElementEvent || (exports.FormElementEvent = {}));
(function (MouseEventType) {
    MouseEventType[MouseEventType["MOVE"] = 0] = "MOVE";
    MouseEventType[MouseEventType["CLICK"] = 1] = "CLICK";
})(exports.MouseEventType || (exports.MouseEventType = {}));
(function (TransactionMode) {
    TransactionMode["READONLY"] = "readonly";
    TransactionMode["READWRITE"] = "readwrite";
    TransactionMode["VERSIONCHANGE"] = "versionchange";
})(exports.TransactionMode || (exports.TransactionMode = {}));
//# sourceMappingURL=share.cjs.js.map
