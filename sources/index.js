window.onerror = function(msg, url, lineNo, columnNo, error) {
    document.body.innerHTML += `<div style="position:fixed;top:0;left:0;color:red;background:black;z-index:9999;padding:20px">${msg}<br/>${url}:${lineNo}:${columnNo}<br/>${error ? error.stack : ''}</div>`;
};
window.addEventListener('unhandledrejection', function(event) {
    document.body.innerHTML += `<div style="position:fixed;top:0;left:0;color:red;background:black;z-index:9999;padding:20px">Unhandled Promise Rejection: ${event.reason ? (event.reason.stack || event.reason) : event}</div>`;
});

import './threejs-override.js'
import { Game } from './Game/Game.js'
import consoleLog from './data/consoleLog.js'

if(import.meta.env.VITE_LOG)
    console.log(
        ...consoleLog
    )

if(import.meta.env.VITE_GAME_PUBLIC)
    window.game = new Game()
else
    new Game()