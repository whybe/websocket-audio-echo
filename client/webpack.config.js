const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

module.exports = {
  entry: "./src/index.js",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "build"),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.worker\.js$/,
        use: {
          loader: "worker-loader",
          // options: {
          //   name: "workers/[name].[hash].[ext]",
          //   publicPath: "/",
          // },
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "static",
        },
      ],
    }),
    new NodePolyfillPlugin(),
  ],
  resolve: {
    fallback: {
      // assert: false,
      // util: false,
      // assert: require.resolve("assert/"),
      // util: require.resolve("util/"),
      // os: require.resolve("os-browserify/browser"),
    },
  },
  devServer: {
    port: 3000,
    open: false,
  },
};
