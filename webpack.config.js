const { resolve } = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const ExtensionReloaderPlugin = require("webpack-extension-reloader");


const mode = process.env.NODE_ENV;
module.exports = {
  mode,
  devtool: "inline-source-map",
  entry: {
    "content-script": "./src/script.js",
    background: "./src/background.js"
  },
  output: {
    publicPath: "./",
    path: resolve(__dirname, "dist/"),
    filename: "[name].bundle.js",
    libraryTarget: "umd",
  },
  target: "web",
  resolve: {
    extensions: [".css", ".js"],
  },
  plugins: [
    /***********************************************************************/
    /* By default the plugin will work only when NODE_ENV is "development" */
    /***********************************************************************/
    new ExtensionReloaderPlugin({
      port: 9090, // Which port use to create the server
      reloadPage: true, // Force the reload of the page also
      entries: {
        // The entries used for the content/background scripts
        contentScript: "content-script",
        background: "background"
      }
    }),

    new MiniCssExtractPlugin({ filename: "style.css" }),
    new CopyWebpackPlugin([
      { from: "./src/options", to: "options/" },
      { from: "./icons" ,to: "icons/" },
      { from: "./images" ,to: "images/"},
      { from: "./manifest.json" }
    ])
  ],
  module: {
    rules: [
      {
        test: /\.js?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [require("@babel/preset-env")]
          }
        }
      },
      {
        test: /\.css$/,
        exclude: /node_modules/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },
          "css-loader"
        ]
      },
    ]
  }
};
