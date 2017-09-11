export function route(route: string, methods?: { get?:boolean, post?:boolean, put?:boolean, delete?:boolean }
    ,allowAnonymousAccess:boolean=false
    ,nocache:boolean=false
) {
    return function (
        target: Function, // the function itself and not the prototype
        propertyKey: string | symbol, // The name of the static method
        descriptor: TypedPropertyDescriptor<any>
    ) {
        if (!global["WebRoutes"]) global["WebRoutes"] = [];

        if (!methods) methods = { get: true };

        global["WebRoutes"].push({ path: route, allowAnonymousAccess: !!allowAnonymousAccess, target: descriptor.value, nocache:nocache, ...methods });

        //console.log("INPUT, ", value),
        //console.log("StaticMethodDecorator called on: ", target, propertyKey, descriptor);
        //console.log("\r\n\r\n\r\nDescriptor:\r\n", descriptor);
    }
}
 
 