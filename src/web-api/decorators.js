"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function route(route, methods, allowAnonymousAccess = false) {
    return function (target, // the function itself and not the prototype
        propertyKey, // The name of the static method
        descriptor) {
        if (!global["WebRoutes"])
            global["WebRoutes"] = [];
        if (!methods)
            methods = { get: true };
        global["WebRoutes"].push(Object.assign({ path: route, allowAnonymousAccess: !!allowAnonymousAccess, target: descriptor.value }, methods));
        //console.log("INPUT, ", value),
        //console.log("StaticMethodDecorator called on: ", target, propertyKey, descriptor);
        //console.log("\r\n\r\n\r\nDescriptor:\r\n", descriptor);
    };
}
exports.route = route;
//# sourceMappingURL=decorators.js.map