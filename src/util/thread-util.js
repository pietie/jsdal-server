"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ThreadUtil {
    static Sleep(timeoutInMs) {
        return new Promise(r => {
            setTimeout(r, timeoutInMs);
        });
    }
}
exports.ThreadUtil = ThreadUtil;
//# sourceMappingURL=thread-util.js.map