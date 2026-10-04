import { TranslationProvider } from './i18n';
import { VirtualTryOn } from './components/VirtualTryOn';

function App() {
  return (
    <TranslationProvider>
      <VirtualTryOn />
    </TranslationProvider>
  );
}

export default App;
