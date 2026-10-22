import { createRoot } from 'react-dom/client';
import { defineCustomElements as definePwaElements } from '@ionic/pwa-elements/loader';
import App from './App';

/* Ionic core CSS */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
/* Dark palette, switched on with the .ion-palette-dark class on <html> */
import '@ionic/react/css/palettes/dark.class.css';

import './theme/variables.css';
import './theme/app.css';

// Camera UI for the browser version (the Android app uses the native camera).
definePwaElements(window);

createRoot(document.getElementById('root')).render(<App />);
