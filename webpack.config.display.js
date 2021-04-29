const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');

module.exports = {
  name: 'display',
  entry: {
    display: path.resolve(__dirname, 'display/display.tsx'),
  },
  mode: 'development',
  devtool: 'source-map',
  output: {
    path: path.resolve(`${__dirname}/assets/dist/static`),
    filename: '[name].js',
    publicPath: '',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'babel-loader',
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  target: 'web',
  plugins: [new CleanWebpackPlugin(), new WebpackManifestPlugin()],
};