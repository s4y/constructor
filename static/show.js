return {
  default: [
    { preview: false, path: "/shaders/util/header.js", },
    { preview: false, path: "/shaders/util/matriculate.js", },
    // { preview: false, path: "/shaders/util/editor.js", },

    // "/shaders/util/align2.s4r",
    // "/shaders/s4y/seal.frag",
    // "/shaders/s4y/cam.s4r",

    // "/shaders/s4y/fade50.s4r",

    // "/shaders/s4y/sky.s4r",

    // "/shaders/s4y/ocean.frag",
    // "shaders/s4y/order_5.s4r",
    // "/shaders/s4y/the_matrix.s4r",
    // "/shaders/s4y/fade50.s4r",
    // "/shaders/s4y/fade50.s4r",
    // "/shaders/deadmau5/mau53d.frag",
    //
    // "/shaders/s4y/sffancy.s4r",
    // "/shaders/util/grid_move.s4r",
    // "/shaders/s4y/ocean.frag",
    // "/shaders/s4y/embrighten.s4r",
    // "/shaders/s4y/black_hole.s4r",

    // "/shaders/s4y/blobbyjamz.s4r",
    // "/shaders/s4y/chonkify.s4r",
    // "/shaders/s4y/cubetunel.frag",
    // "/shaders/s4y/embrighten.s4r",
    // "/shaders/s4y/frax.s4r",
    // "/shaders/s4y/glass_filt.frag",
    // "/shaders/s4y/kaleid.s4r",
    // "/shaders/s4y/matriculate.s4r",
    // "/shaders/s4y/mayglitch.s4r",
    // "/shaders/s4y/morningfternoon.s4r",
    // "/shaders/s4y/make_white.s4r",
    // "/shaders/s4y/ocean.frag",
    // "/shaders/s4y/yet_another_cube.s4r",
    // "/shaders/s4y/rectTun.s4r",
    // "shaders/s4y/flower.s4r",
    // "shaders/s4y/dosome.s4r",
    // "/shaders/s4y/tangents.s4r",
    // "/shaders/s4y/matriculate.s4r",
    // "/shaders/deadmau5/mau53d.frag",
    // j"/shaders/s4y/kaleid.s4r",
    // "/shaders/s4y/wonderflow.s4r",
    // "/shaders/s4y/circlefade.s4r",

    // "shaders/s4y/soup.s4r",
    // "/shaders/s4y/fade50.s4r",
    // "/shaders/s4y/angel_mike_3d.s4r",
    // "/shaders/s4y/halo.s4r",
    "/shaders/s4y/sponge.frag",
    // "/shaders/s4y/pulsediamond.s4r",
    // "/shaders/s4y/sffancy.s4r",
    // "/shaders/util/beat_clock.s4r",
    // "/shaders/util/editor.s4r",
    // "/shaders/util/grid_move.s4r",
    // "shaders/s4y/livecodenyc.s4r",
    //"shaders/s4y/fade50.s4r",

    // "/shaders/s4y/black_hole.s4r",
    // "/shaders/s4y/celluar.s4r",
    // "/shaders/s4y/make_red.s4r",
    // "/shaders/s4y/streamulate.s4r",
    // "/shaders/s4y/mengerice.frag",
    // "/shaders/s4y/edges.frag",
    // "shaders/s4y/nature.s4r",

    // "/shaders/s4y/mountain.s4r",
    // "/shaders/s4y/scan_line.s4r",

    // "/shaders/s4y/light.s4r",

    // "/shaders/s4y/testpilot.frag",
    // "/shaders/s4y/crtify.s4r",
    // "/shaders/s4y/3d_stars.s4r",

    // "/shaders/s4y/beat_glitch.s4r",
    // "/shaders/util/beat_shake.s4r",

    // "/shaders/s4y/glass_filt.frag",
    // "/shaders/s4y/fade50.s4r",
    // "/shaders/s4y/fade50.s4r",
    // "/shaders/s4y/fade50.s4r",
    // "/shaders/s4y/testpilot.frag",

    // "/shaders/s4y/rgbstretch.s4r",
    // "/shaders/s4y/rgbstretch.s4r",
    // "/shaders/s4y/veryedgefade.s4r",
    // "/shaders/s4y/sf.s4r",
    /*
    {
      preview: false,
      path: "/shaders/util/beat_highlight.s4r",
      params: {
        get mult() { return ctx.params.beatPhase; },
      },
      if() { return ctx.params.beatPhase != 0; },
    },
    // */



    // /*


    {
      preview: false,
      path: "/shaders/s4y/glitch.s4r",
      params: {
        // colorChaos: 1,
        colorChaos(ctx) { return ctx.midi.knob4; }
      },
      if(ctx) { return ctx.midi.button9; },
    },

    /*
    {
      path: "/shaders/s4y/stall.s4r",
      params: {
        amt: 0,
        prg: 0,
      },
      if(ctx) {
        const btn = ctx.midi.button14;
        this.params.amt *= 0.99;
        this.params.prg *= 0.99;
        if (btn) {
          this.params.amt = 1;
          this.params.prg = Math.min(this.params.prg + 0.1, 1);
        }
        return btn;
      },
    }, // */

    // /*

    {
      preview: false,
      path: "/shaders/s4y/womp.s4r",
      params: {
        _amt: 0,
        amt() {
          const tgt = ctx.midi.button16;
          this.params._amt = this.params._amt * 0.92 + tgt * 0.08;
          return this.params._amt;
        },
      },
      if(ctx) { return Math.abs(this.params.amt.call(this)) > 0.01; },
    },
    {
      preview: false,
      path: "/shaders/s4y/hook.s4r",
      params: {
        _amt: 0,
        amt() { this.params._amt *= 0.95; if (ctx.midi.button11) this.params._amt = 1; return -this.params._amt; },
      },
      if(ctx) { return Math.abs(this.params.amt.call(this)) > 0.01; },
    },
    {
      preview: false,
      path: "/shaders/s4y/hook.s4r",
      params: {
        _amt: 0,
        amt() { this.params._amt *= 0.95; if (ctx.midi.button12) this.params._amt = 1; return this.params._amt; },
      },
      if(ctx) { return Math.abs(this.params.amt.call(this)) > 0.01; },
    },

    {
      preview: false,
      path: "/shaders/s4y/blackout.s4r",
      params: {
        _brightness: new Gradual(0, 0.98),
        brightness(ctx) {
          if (ctx.midi.kbutton12)
            this.params._brightness.setImmediate(1);
          else
            this.params._brightness.value = ctx.midi.knob12;
          return this.params._brightness;
        },
      },
      if(ctx) { return this.params.brightness.call(this, ctx) > 0; },
    },

    {
      preview: false,
      path: "/shaders/s4y/inv.s4r",
      params: {
        _amt: 0,
        amt(ctx) { this.params._amt *= 0.99; if (ctx.midi.button10) this.params._amt = 1; return this.params._amt; },
      },
      if(ctx) { return this.params.amt.call(this, ctx) > 0; },
    },


    // "/shaders/s4y/embrighten.s4r",

  ],
};
