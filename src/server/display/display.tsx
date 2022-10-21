import * as ReactDOM from 'react-dom/client';
import App from './components/app';
import './display.css';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.hydrateRoot(document.getElementById('root')!, <App />);
