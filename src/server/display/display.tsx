import * as ReactDOM from 'react-dom/client';
import App from './components/app';
import './display.css';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = document.getElementById('root')!;
// get data-collab property from SSR root node
ReactDOM.hydrateRoot(root, <App collab={root.dataset.collab === 'true'} />);
