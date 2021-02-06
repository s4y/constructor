export default class HotFile {
  constructor(url, onchange) {
    this.url = url;
    this.onchange = onchange;
    this.changeListener = e => {
      const changedPath = new URL(e.detail, location).pathname;
      if (changedPath == this.url.pathname)
        this.ready = this.reload();
    };
    window.addEventListener('sourcechange', this.changeListener);
    this.ready = this.reload();
  }
  async reload() {
    const r = await fetch(this.url);
    this.onchange(await r.text());
  }
  release() {
    window.removeEventListener('sourcechange', this.changeListener);
  }
}
