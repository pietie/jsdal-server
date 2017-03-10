"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
function route(route, methods) {
    return function (target, // the function itself and not the prototype
        propertyKey, // The name of the static method
        descriptor) {
        if (!global["WebRoutes"])
            global["WebRoutes"] = [];
        if (!methods)
            methods = { get: true };
        global["WebRoutes"].push(__assign({ path: route, target: descriptor.value }, methods));
        //console.log("INPUT, ", value),
        //console.log("StaticMethodDecorator called on: ", target, propertyKey, descriptor);
        //console.log("\r\n\r\n\r\nDescriptor:\r\n", descriptor);
    };
}
exports.route = route;
//# sourceMappingURL=decorators.js.map