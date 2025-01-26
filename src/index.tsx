import { render } from 'preact';

import './style.css';

export function App() {
    return <div className={'min-h-screen min-w-screen bg-topography'}></div>;
}

render(<App />, document.getElementById('app'));
