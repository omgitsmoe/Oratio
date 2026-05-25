import path from 'path';
import fs from 'fs';
import webpack from 'webpack';
import webpackPaths from './webpack.paths';
import { dependencies as externals } from '../../src/package.json';
import { env } from 'process';

const hiddenPath = path.join(webpackPaths.rootPath, 'hidden.json');
let hidden;
if (fs.existsSync(hiddenPath)) {
  const hiddenText = fs.readFileSync(hiddenPath);
  hidden = JSON.parse(hiddenText);
} else if (env.PN_PUB) {
  hidden = { pnPub: env.PN_PUB, pnSub: env.PN_SUB };
}

export default {
  mode: 'development',

  devtool: 'eval',

  target: 'electron-main',

  entry: {
    main: './src/main.dev.ts',
  },

  output: {
    path: webpackPaths.srcPath,
    filename: 'main.dev.js',
  },

  externals: [...Object.keys(externals || {})],
  externalsType: 'commonjs2',

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
          },
        },
      },
    ],
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    modules: [path.join(webpackPaths.srcPath), 'node_modules'],
  },

  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'development',
      TWITCH_CLIENT_ID: '2f58s8a4cjlbel33rm48kutmmdh2sm',
      PN_PUB: hidden ? hidden.pnPub : '',
      PN_SUB: hidden ? hidden.pnSub : '',
    }),
  ],

  node: {
    __dirname: false,
    __filename: false,
  },
};
