// reserve:hot_reload

export default class FPSView {
  constructor(label) {
    this.el = document.createElement('div');
    this.init();
  }
  init() {
    this.titleEl = document.createElement('h2');
    this.el.appendChild(this.titleEl);
    this.fpsEl = document.createElement('div');
    this.fpsEl.classList.add('fps');
    this.el.appendChild(this.fpsEl);
    this.update();
  }
  update() {
    const title = this.title || '';
    if (this.titleEl.textConteht != title)
      this.titleEl.textContent = title;
    const fps = `${this.fps && Math.floor(this.fps) || '--'}${this.downscale != 1 ? `@${this.downscale}` : ''}`;
    if (this.fpsEl.textContent != fps);
      this.fpsEl.textContent = fps;
  }
  adopt() {
    this.el.innerHTML = '';
    this.init();
  }
}
