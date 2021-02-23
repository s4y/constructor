import ShaderProgram from '/lib/ShaderProgram.js'
import S4r from '/lib/S4r.js'

class ShowLayer {
  constructor(ctx, config) {
    this.config = config;
    this.state = { fade: 1, };
    const childCtx = { ...ctx, state: this.state };
    const ext = config.path.split('.').reduce((a,x) => x);
    if (ext == 's4r') {
      this.instance = new S4r(childCtx, [
        'shaders/s4y/common.s4r',
        config.path,
      ]);
    } else if (ext == 'frag' || ext == 'fs') {
      this.instance = new ShaderProgram(
        childCtx, '/shaders/default.vert', config.path);
    }
  }
}

export default class Show {
  constructor(ctx, path) {
    this.ctx = ctx;
    this.path = path;
    this.config = null;
    this.layerStates = [];
    this.layers = [];
    this.observers = [];
    this.ready = this.reload();

    window.addEventListener('sourcechange', e => {
      const changedPath = new URL(e.detail, location).pathname;
      if (changedPath == path) {
        e.preventDefault();
        this.init();
        return;
      }
      for (let i = 0; i < this.layers.length; i++) {
        const layer = this.layers[i];
        if (!layer.instance.interestedPaths.has(changedPath))
          continue;
        this.layers[i] = this.instantiateLayer(this.layers[i].config);
        this.notifyObservers();
      }
    });
    this.init();
  }
  addObserver(observer) {
    this.observers.push(observer);
    if (this.layers)
      observer(this.layers);
  }
  notifyObservers() {
    for (const observer of this.observers)
      observer(this.layers);
  }
  // adopt() {
  //   this.config = null;
  //   this.init();
  // }
  init() {
    this.ready = this.reload();
  }
  setFade(which, fade) {
    this.layers[which].state.fade = fade;
    // this.layers[which].instance.setParam('fade', fade);
  }
  instantiateLayer(config) {
    return new ShowLayer(this.ctx, config);
  }
  async reload() {
    const r = await fetch(this.path);
    const text = await r.text();
    const oldLayers = this.layers;
    const oldLayersByPath = oldLayers.reduce((o, layer) =>
      (o[layer.config.path] = layer, o), {});
    const config = new Function(text)();
    let anythingChanged = false;
    this.layers = config.layers.map((layerConfig, i) => {
      if (typeof layerConfig == 'string')
        layerConfig = { path: layerConfig };
      const s = JSON.stringify(layerConfig);
      if (oldLayers[i] && s == JSON.stringify(oldLayers[i].config))
        return this.layers[i];
      anythingChanged = true;
      const byPath = oldLayersByPath[layerConfig.path];
      if (byPath && s == JSON.stringify(byPath.config)) {
        delete oldLayersByPath[layerConfig.path];
        return byPath;
      }
      return this.instantiateLayer(layerConfig);
    });
    while (this.layerStates.length < this.layers.length) {
      this.layerStates.push({
        fade: 0,
      });
    }
    this.config = config;
    if (anythingChanged || this.layers.length != oldLayers.length)
      this.notifyObservers();
  }
}
