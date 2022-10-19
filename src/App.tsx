import React from 'react';
import * as ReactDOM from 'react-dom/client';
import './App.global.css';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
// eslint-disable-next-line import/no-named-as-default
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import OBS from './components/OBS';
import Preferences from './components/Preferences';
import Emotes from './components/Emotes';
import Home from './components/Home';
import TTSSettings from './components/TTSSettings';
import enTranslations from './translations/en';
import jaTranslations from './translations/ja';
import deTranslations from './translations/de';

// export default class App extends React.Component {
//   constructor(props: never) {
//     super(props);
//     this.state = {};
//   }

//   render() {
//     return (
//       <Router>
//         <Switch>
//           <Route path="/home" component={Home} />
//           <Route path="/obs" component={OBS} />
//           <Route path="/preferences" component={Preferences} />
//         </Switch>
//       </Router>
//     );
//   }
// }\

// Initialize i18n
i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      ja: {
        translation: jaTranslations,
      },
      de: {
        translation: deTranslations,
      },
    },
    lng: localStorage.getItem('selectedLang') || navigator.language,
    fallbackLng: 'en',

    interpolation: {
      escapeValue: false,
    },
  });

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/home" element={<OBS />} />
        <Route path="/preferences" element={<Preferences />} />
        <Route path="/emotes" element={<Emotes />} />
        <Route path="/tts" element={<TTSSettings />} />
      </Routes>
    </Router>
  );
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
