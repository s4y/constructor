import Framebuffer from '/lib/Framebuffer.js'
import ShaderProgram from '/lib/ShaderProgram.js'
import S4r from '/lib/S4r.js'

class ScriptProgram {
  constructor(ctx, path) {
    this.ctx = ctx;
    this.interestedPaths = new Set([path]);
    this.load(path);
    this.fn = null;
  }
  async load(path) {
    const r = await fetch(path);
    const text = await r.text();
    try {
      const ctor = new Function('ctx', text);
      this.fn = ctor(this.ctx);
    } catch(e) {
      this.error = e;
      this.fn = null;
    }
  }
  usesInput(k) {
    return false;
  }
  checkReady() {
    return this.fn != null;
  }
  uniformsChanged(){
  }
  draw() {
    this.fn();
  }
}

class ShowLayer {
  constructor(ctx, config, old) {
    this.ctx = ctx;
    this.config = config;
    this.state = { fade: 1, };
  
    const childCtx = Object.assign(Object.create(ctx), {
      config,
      globalTextures: ctx.textures,
      textures: {
        ...ctx.textures,
        self: () => {
          return this.getFramebuffer();
        },
        last: () => {
          if (!this.instance.usesInput("last"))
            throw new Error("I thought you didn't need `last`.");
          return this.getLastbuffer();
        },
        filt: () => {
          return this.getFilterbuffer();
        },
      },
      state: this.state
    });
    const ext = config.path.split('.').reduce((a,x) => x);
    if (ext == 'js') {
      this.instance = new ScriptProgram(childCtx, config.path);
    } else if (ext == 's4r') {
      this.instance = new S4r(childCtx, [
        'shaders/s4y/common.s4r',
        config.path,
      ], old);
    } else if (ext == 'frag' || ext == 'fs') {
      this.instance = new ShaderProgram(
        childCtx, '/shaders/default.vert', config.path);
    }
  }
  getFramebuffer() {
    if (!this.framebufferLoop)
      this.framebufferLoop = [
        new Framebuffer(this.ctx),
        new Framebuffer(this.ctx),
      ];
    return this.framebufferLoop[0];
  }
  getFilterbuffer() {
    if (!this.filterBuffer)
      this.filterBuffer = new Framebuffer(this.ctx);
    return this.filterBuffer;
  }
  getLastbuffer() {
    if (!this.lastBuffer)
      this.lastBuffer = new Framebuffer(this.ctx);
    return this.lastBuffer;
  }
  get error() {
    return this.instance.error;
  }
  uniformsChanged() {
    this.instance.uniformsChanged();
  }
  checkReady() {
    if (!this.instance.checkReady())
      return false;
    if (!this.didPredrawOnce) {
      this.didPredrawOnce = true;
      this.usesLast = this.instance.usesInput("last");
      this.usesFilt = this.instance.usesInput("filt");
      this.instance.predraw && this.instance.predraw();
    }
    return true;
  }
	drawPreview() {
    this.draw();
	}
  drawRecursive(alwaysDraw) {
    let topLayer = this;
    while (topLayer && (topLayer.usesFilt || topLayer.usesLast))
      topLayer = topLayer.usesFilt ? null : topLayer.lastLayer;
    if (topLayer)
      topLayer = topLayer.lastLayer;
    if (topLayer)
      topLayer.drawRecursive(alwaysDraw);
    if (this.draw(alwaysDraw) == false) {
      if (this.usesFilt)
        this.ctx.drawCopy(this.filterBuffer);
      if (this.usesLast)
        this.ctx.drawCopy(this.lastBuffer);
    }
  }
  draw(alwaysDraw) {
    if (this.isDiscarded)
      throw new Error("tried to draw discarded layer");
    if (!this.checkReady())
      return false;

    let lastLayer = this.lastLayer;
    if (this.usesLast) {
      this.getLastbuffer().drawInto(() => {
        lastLayer.draw(alwaysDraw);
        lastLayer = lastLayer.lastLayer;
      });
    }
    if (this.usesFilt && lastLayer) {
      this.getFilterbuffer().drawInto(() => {
        lastLayer.drawRecursive(alwaysDraw);
      });
    }

    if (!alwaysDraw && this.config && this.config.if) {
      if (!this.config.if(this.ctx))
        return false;
    }
    if (this.framebufferLoop) {
      this.framebufferLoop[1].drawInto(() => {
        this.instance.draw(alwaysDraw);
      });
      ctx.drawCopy(this.framebufferLoop[1]);
      this.framebufferLoop.reverse();
    } else {
      this.instance.draw(alwaysDraw);
    }
  }
  discard() {
    for (const fb of [...this.framebufferLoop, this.filterBuffer, this.lastBuffer])
      Framebuffer.reuse(fb);
    if (this.instance.discard)
      this.instance.discard();
    this.isDiscarded = true;
  }
}

export default class Show {
  constructor(ctx) {
    this.ctx = ctx;
    this.path = ctx.showFile;
    this.config = null;
    this.scenes = {};
    this.observers = [];
    this.ready = this.reload();

    window.addEventListener('sourcechange', e => {
      const changedPath = new URL(e.detail, location).pathname;
      if (changedPath == this.path) {
        e.preventDefault();
        this.init();
        return;
      }
      for (const k in this.scenes) {
        const scene = this.scenes[k];
        for (let i = 0; i < scene.layers.length; i++) {
          const layer = scene.layers[i];
          if (!layer.instance.interestedPaths.has(changedPath))
            continue;
          this.reload(changedPath);
          this.notifyObservers();
        }
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
      observer(this.scenes);
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
  instantiateLayer(config, old) {
    return new ShowLayer(this.ctx, config, old);
  }
  async reload(changedPath) {
    const r = await fetch(this.path);
    const text = await r.text();
    const config = new Function(text)();
    const oldScenes = this.scenes;
    this.scenes = {};
    let anythingChanged;
    for (const k in config) {
      let anythingChangedHere = false;
      const oldLayers = oldScenes[k] ? oldScenes[k].layers : [];
      const leftoverLayers = new Set(oldLayers);
      const layers = config[k].map((layerConfig, i) => {
        if (typeof layerConfig == 'string')
          layerConfig = { path: layerConfig };
        const s = JSON.stringify(layerConfig);
        const oldLayer = (oldLayers[i] && s == JSON.stringify(oldLayers[i].config)) ? oldLayers[i] : null;
        if (!anythingChangedHere) {
          if (oldLayer) {
            if (!changedPath || !oldLayers[i].instance.interestedPaths.has(changedPath)) {
              leftoverLayers.delete(oldLayer);
              return oldLayer;
            }
          }
          anythingChangedHere = true;
          anythingChanged = true;
        }
        return this.instantiateLayer(layerConfig, oldLayer && oldLayer.instance);
      });
      if (layers.length != oldLayers.length)
        anythingChanged = true;
      layers.forEach((layer, i) => {
        layer.lastLayer = layers[i-1];
      });
      this.scenes[k] = { layers };
    }
    this.config = config;
    if (anythingChanged)
      this.notifyObservers();
  }
}
