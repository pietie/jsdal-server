var webpack = require('webpack');
var path = require('path');
var fs = require('fs');


// function isExternal(module) {
//     var userRequest = module.userRequest;

//     if (typeof userRequest !== 'string') {
//         return false;
//     }

//     return userRequest.indexOf('node_modules') >= 0;
// }

var nodeModules = {};

fs.readdirSync('node_modules')
    .filter(function (x) {
        return ['.bin'].indexOf(x) === -1;
    })
    .forEach(function (mod) {
        nodeModules[mod] = 'commonjs ' + mod;
    });



// module.exports = [{
//     entry: {
//         main: './src/start.ts'
//     },
//     output: {
//         filename: 'jsdal-server.js',
//         path: path.resolve(__dirname, 'build'),
//           libraryTarget: 'commonjs2'
//     },
//     resolve: {
//         extensions: ['.ts', '.js', 'json'],
//         modules: [
//             path.resolve('./'),
//             path.resolve('./node_modules'),
//         ]
//     },
//     module: {
//         loaders: [
//             { test: /.ts$/, loader: 'awesome-typescript-loader', exclude: /node_modules/ }
//         ]
//     },
//     target: 'node',
//     // plugins: [
//     //     new webpack.optimize.CommonsChunkPlugin({
//     //         name: 'vendor',
//     //         chunks: ['main'],
//     //         filename: 'node-static.js',
//     //         minChunks: module => /node_modules/.test(module.resource)
//     //     }),
//     //     // new webpack.optimize.CommonsChunkPlugin({
//     //     //     name: 'vendor',
//     //     //     chunks: ['main'],
//     //     //     minChunks: (module) => {
//     //     //         return module.resource && module.resource.indexOf("node_modules") != -1;
//     //     //     }
//     //     // })
//     // ]
//      externals: nodeModules
// }
//     ,
// {
//     entry: {
//         main: './src/start.ts'
//     },
//     output: {
//         filename: 'bull.js',
//         path: path.join(__dirname, 'build'),
//           libraryTarget: 'commonjs2'
//     },

//     module: {
//         loaders: [
//             { test: /.ts$/, loader: 'awesome-typescript-loader', exclude: /node_modules/ }
//         ]
//     },
//     target: 'node',
//     plugins: [
//         new webpack.optimize.CommonsChunkPlugin({
//             name: 'vendor',
//             chunks: ['main'],
//             filename: 'node-static.js',
//             minChunks: module => /node_modules/.test(module.resource)
//         }),
//     ],
//     node: {
//         __dirname: false,
//         __filename: false,
//     }
// }

// ];


module.exports = {
    entry: './src/start.ts',
    target: 'node',
    output: {
        path: path.join(__dirname, 'build'),
        filename: 'jsdal-server.js'
    },
    resolve: {
        extensions: ['.ts']
    },
    module: {
        loaders: [
            { test: /.ts$/, loader: 'awesome-typescript-loader', exclude: /node_modules/ }
        ]
    }, externals: nodeModules
}


