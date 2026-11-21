// hud.js — the DOM overlay: key counter, timer, sneak state, alarm bar, toasts,
// and the title / win / lose / pause screens. The canvas stays purely the game.

import { KEY_SPOTS } from './level.js';

export class Hud {
  constructor() {
    this.el = {
      hud: document.getElementById('hud'),
      keys: document.getElementById('hudKeys'),
      time: document.getElementById('hudTime'),
      sneak: document.getElementById('hudSneak'),
      alarmFill: document.getElementById('alarmFill'),
      toast: document.getElementById('toast'),
      title: document.getElementById('screen-title'),
      win: document.getElementById('screen-win'),
      lose: document.getElementById('screen-lose'),
      pause: document.getElementById('screen-pause'),
      winStats: document.getElementById('winStats'),
      loseStats: document.getElementById('loseStats'),
      loseReason: document.getElementById('loseReason'),
      hint: document.getElementById('hint'),
    };
    this.toastTimer = 0;
  }

  showGame() {
    this.el.hud.classList.remove('hidden');
    this.el.hint.classList.remove('hidden');
    this.hideScreens();
  }

  showTitle() {
    this.el.hud.classList.add('hidden');
    this.el.hint.classList.add('hidden');
    this.hideScreens();
    this.el.title.classList.remove('hidden');
  }

  hideScreens() {
    this.el.title.classList.add('hidden');
    this.el.win.classList.add('hidden');
    this.el.lose.classList.add('hidden');
    this.el.pause.classList.add('hidden');
  }

  showWin(statsText) {
    this.hideScreens();
    this.el.winStats.textContent = statsText;
    this.el.win.classList.remove('hidden');
  }

  showLose(statsText, reasonText) {
    this.hideScreens();
    this.el.loseStats.textContent = statsText;
    this.el.loseReason.textContent = reasonText;
    this.el.lose.classList.remove('hidden');
  }

  showPause(show) {
    this.el.pause.classList.toggle('hidden', !show);
  }

  update(state) {
    const { player, alarm, time } = state;
    this.el.keys.textContent = `${player.keys} / ${KEY_SPOTS.length}`;
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    this.el.time.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    this.el.sneak.textContent = player.sneaking ? '🤫 Sneaking' : '🚶 Walking';
    this.el.alarmFill.style.width = `${Math.round(alarm * 100)}%`;
    this.el.alarmFill.style.background =
      alarm < 0.4 ? '#ffd97a' : alarm < 0.75 ? '#ff9e3c' : '#ff483c';
  }

  toast(text, ms = 2200) {
    this.el.toast.textContent = text;
    this.el.toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.el.toast.classList.remove('show'), ms);
  }
}

export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
