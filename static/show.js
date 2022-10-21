return {
  g1: [
    // {
    //   path: "/shaders/s4y/galactic_laser.s4r",
    //   params: {
    //     hue: 0/3,
    //     sat: 1,
    //     bri: 1,
    //     x: -0.1,
    //     y: 0.7,
    //     s: 0.25
    //   },
    // }
    "/shaders/s4y/galactic.s4r",
    "/shaders/s4y/veryedgefade.s4r",
  ],

  g2: [
    {
      path: "/shaders/s4y/galactic.s4r",
      params: {
        hue: 2/3,
        sat: 0,
        bri: 1,
        x: 0,
        y: 0.64,
        s: 0.5
      },
    },
    // "shaders/s4y/soup.s4r",
    "/shaders/s4y/veryedgefade.s4r",
  ],

  floor: [
    "/shaders/s4y/soup.s4r",
    "/shaders/s4y/make_red.s4r",
  ],

  default: [
    { preview: false, path: "/shaders/util/header.js", },
    { preview: false, path: "/shaders/util/matriculate.js", },
    // { preview: false, path: "/shaders/util/editor.js", },

    // "/shaders/s4y/galactic.s4r",

    // "/shaders/util/align2.s4r",
    // "/shaders/util/alignlaaser.s4r",
    // "/shaders/s4y/sf.s4r",

    // "/shaders/s4y/glass_filt.frag",
    // "/shaders/s4y/edges.frag",
    // "/shaders/s4y/yet_another_cube.s4r",
    // "/shaders/s4y/tangents.s4r",
    // "/shaders/s4y/kaleid.s4r",
    "shaders/s4y/dosome.s4r",
    // "/shaders/s4y/ocean.frag",
    // "/shaders/s4y/laser.s4r",

    // "/shaders/s4y/make_red.s4r",
    // "/shaders/s4y/black_hole.s4r",
    // "/shaders/s4y/morningfternoon.s4r",
    // "/shaders/s4y/yet_another_cube.s4r",
    // "/shaders/s4y/edges.frag",
    // "/shaders/s4y/streamulate.s4r",

    // "/shaders/s4y/fade50.s4r",
    // "shaders/s4y/order_5.s4r",
    // "/shaders/s4y/rectTun.s4r",
    "/shaders/s4y/sffancy.s4r",
    "/shaders/s4y/streamulate.s4r",
    "/shaders/s4y/3d_stars.s4r",
    // "/shaders/s4y/cubetunel.frag",
    // "/shaders/s4y/fade50.s4r",
    // "/shaders/s4y/glass_filt.frag",
    // "/shaders/s4y/matriculate.s4r",
    // "/shaders/s4y/morning.s4r",
    // "shaders/s4y/soup.s4r",
    // "/shaders/s4y/make_red.s4r",
    // "shaders/s4y/flower.s4r",
    // "/shaders/s4y/mau5.frag",
    // "/shaders/s4y/edges.frag",
    // "/shaders/s4y/scan_line.s4r",
    // "/shaders/util/grid_move.s4r",
    "/shaders/s4y/crtify.s4r",
    "/shaders/s4y/embrighten.s4r",
    // "shaders/s4y/nature.s4r",
    // "/shaders/s4y/blobbyjamz.s4r",
    // "/shaders/s4y/chonkify.s4r",
    // "/shaders/s4y/embrighten.s4r",
    // "/shaders/s4y/embrighten.s4r",
    // "/shaders/s4y/fade50.s4r",
    // "/shaders/s4y/make_white.s4r",
    // "/shaders/s4y/matriculate.s4r",
    // "/shaders/s4y/mayglitch.s4r",
    // "/shaders/s4y/mountain.s4r",
    // "/shaders/s4y/chonkify.s4r",
    // "/shaders/s4y/make_red.s4r",
    // "/shaders/s4y/testpilot.frag",
    // "/shaders/util/editor.s4r",
    // "/shaders/s4y/testpilot.frag",
    // "/shaders/util/beat_clock.s4r",
    // "/shaders/s4y/edges.frag",
    // "/shaders/s4y/celluar.s4r",
    // "/shaders/s4y/edges.frag",
    // "/shaders/s4y/make_red.s4r",
    // "/shaders/s4y/rkaleid.s4r",
    // "/shaders/s4y/streamulate.s4r",

    // "/shaders/s4y/edges.frag",
    //
    //
    // "/shaders/s4y/ice.frag",
    // "shaders/s4y/livecodenyc.s4r",

    // "shaders/s4y/livecodenyc.s4r",

    // "/shaders/s4y/streamulate.s4r",
    // "/shaders/s4y/frax.s4r",
    // "/shaders/s4y/rgbstretch.s4r",



    // "/shaders/s4y/rgbstretch.s4r",

    // "/shaders/util/beat_shake.s4r",
    // "/shaders/s4y/beat_glitch.s4r",



    // /*
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

    /*

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
    // "/shaders/s4y/embrighten.s4r",

    // "/shaders/util/align2.s4r",
    // "/shaders/util/h0l0fy.s4r",
    // "/shaders/s4y/fademiddle.s4r",
    // "/shaders/s4y/fade50.s4r",

    // "/shaders/s4y/living_room_mask.s4r",

    // "/shaders/util/black.frag",
    // "/shaders/s4y/zerofade.s4r",


    // "/shaders/s4y/spoopylights.s4r",
    // "/shaders/s4y/h0l0lights.s4r",
    // "/shaders/s4y/veryedgefade.s4r",
    // */

    // "/shaders/util/lr_map.s4r",
  ],
  r2: [
    "/shaders/util/align2.s4r",
    "/shaders/s4y/rgbstretch.s4r",
    "/shaders/s4y/sf.s4r",
  ],
  avatar: [
  ],
};
