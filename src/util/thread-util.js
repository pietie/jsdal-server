"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ThreadUtil = (function () {
    function ThreadUtil() {
    }
    ThreadUtil.Sleep = function (timeoutInMs) {
        return new Promise(function (r) {
            setTimeout(r, timeoutInMs);
        });
    };
    return ThreadUtil;
}());
exports.ThreadUtil = ThreadUtil;
//# sourceMappingURL=thread-util.js.map