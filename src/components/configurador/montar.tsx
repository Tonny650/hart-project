// Monta el configurador bajo demanda: three.js (~1 MB) solo se descarga cuando la persona interactúa.
import { createRoot } from 'react-dom/client';
import Configurador from './Configurador';

export function montar(el: HTMLElement) {
  const root = createRoot(el);
  root.render(<Configurador />);
  return () => root.unmount();
}
