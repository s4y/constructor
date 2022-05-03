return {

  default: [
    "/shaders/util/header.js",

    // ===========
    // CALIBRATION

    // "/shaders/util/align2.s4r",
    // "/shaders/s4y/sffancy.s4r",
    // "/shaders/s4y/seal.frag",

    // ===========
    // BACKGROUNDS

    // "/shaders/s4y/morning.s4r",
    // "/shaders/s4y/morningfternoon.s4r",
    // "/shaders/s4y/train_home.s4r",
    // "/shaders/s4y/make_red.s4r",
    "/shaders/util/beat_clock.s4r",
    // "/shaders/s4y/twitch_ocean.frag",
    "shaders/s4y/edges.frag",
    // "/shaders/s4y/make_red.s4r",
    // "/shaders/s4y/streamulate.s4r",
    // "/shaders/s4y/chonkify.s4r",
    // "/shaders/s4y/01.frag",
    // "/shaders/s4y/ocean.frag",
    // "/shaders/s4y/pulsediamond.s4r",
    // "/shaders/s4y/relax2.s4r",
    // "/shaders/s4y/streamulate.s4r",
    // "shaders/s4y/edges.frag",
    // "shaders/s4y/edges.frag",
    // "/shaders/s4y/chonkify.s4r",
    // "/shaders/s4y/sffancy.s4r",
    // "/shaders/util/grid_move.s4r",
    // "/shaders/s4y/sponge.frag",
    // "/shaders/s4y/wonderflow.s4r",
    // "/shaders/s4y/shapes.s4r",
    // "/shaders/s4y/streamulate.s4r",
    // "/shaders/s4y/sqrz.s4r",

    // ===========
    // ACCESSORIES

    // "/shaders/s4y/beatTunnel.frag",
    // "/shaders/s4y/reel_1.s4r",
    // "/shaders/s4y/scan_line.s4r",
    // { 0.5 *
    //   path: "/shaders/s4y/order_5b.s4r",
    //   flash: 0,
    //   params: {
    //     brightness(ctx) { if (ctx.midi.button12) this.flash = 1; return this.flash*=0.99; }
    //   },
    //   if(ctx) { return this.flash > 0; },
    // },


    // "/shaders/s4y/reel_1.s4r",

    // ===========
    // LOGO


    // "/shaders/s4y/3d_stars.s4r",
    // "/shaders/s4y/black_hole.s4r",
    // "/shaders/s4y/whisps.s4r",
    // "shaders/s4y/edges.frag",
    // "/shaders/s4y/rectTun.s4r",
    // "/shaders/s4y/yet_another_cube.s4r",
    // "/shaders/s4y/angel_mike_3d.s4r",
    // "/shaders/s4y/halo.s4r",
    // "/shaders/s4y/streamulate.s4r",
    // "/shaders/s4y/streamulate.s4r",
    // "/shaders/s4y/streamulate.s4r",
    
    // "/shaders/s4y/embrighten.s4r",
    // "/shaders/s4y/streamulate.s4r",

    // ===========
    // TOP ACCESSORIES

    // "/shaders/s4y/streamulate.s4r",
    // "/shaders/s4y/kaleid.s4r",
    // "/shaders/s4y/tangents.s4r",
    // "shaders/s4y/bighalo.s4r",
    // "/shaders/s4y/make_red.s4r",
    // "/shaders/s4y/streamulate.s4r",


    // ===========
    // BEAT ACCESSORIES

    "/shaders/util/beat_flash.s4r",
    "/shaders/util/beat_shake.s4r",
    "/shaders/s4y/beat_glitch.s4r",
    // {
    //   path: "/shaders/util/beat_highlight.s4r",
    //   params: {
    //     mult: 1,
    //   },
    // },


    // ===========
    // FILTER

    // "/shaders/s4y/make_white.s4r",

    // "/shaders/s4y/streamulate.s4r",
    // "/shaders/s4y/kaleid.s4r",

    // "/shaders/s4y/adieu_but_amazingly_broken.s4r",
    // "/shaders/s4y/dusty_bugs.frag",

    // "shaders/s4y/order_3.s4r",


    // "/shaders/s4y/reel_1.s4r",
    // "/shaders/s4y/streamulate.s4r",
    // "/shaders/s4y/redSlice.s4r",
//    "/shaders/s4y/reel_1.s4r",


    // "/shaders/s4y/train_home.s4r",
    // "/shaders/s4y/sffancy.s4r",

    // "/shaders/s4y/blobbyjamz.s4r",

    // "/shaders/s4y/lattice.s4r",

    // "/shaders/s4y/make_red.s4r",
    // "/shaders/s4y/streamulate.s4r",
    // "/shaders/s4y/redSlice.s4r",
    // "/shaders/s4y/inv.s4r",
    // "/shaders/s4y/make_red.s4r",
    // "/shaders/s4y/bean.s4r",
    // "/shaders/s4y/streamulate.s4r",
    // "/shaders/s4y/embrighten.s4r",
    // "/shaders/s4y/morningfternoon.s4r",

    // "/shaders/s4y/rectTun.s4r",

    // {
    //   path: "/shaders/s4y/make_red.s4r",
    //   params: {
    //   },
    //   if(ctx) { return ctx.midi.button11; },
    // },



    // "/shaders/s4y/glass_filt.frag",


    // "/shaders/s4y/edges.frag",

    // "/shaders/s4y/edges.frag",
    // "/shaders/s4y/streamulate.s4r",
    // "/shaders/s4y/chonkify.s4r",
    // "/shaders/s4y/streamulate.s4r",
    // "/shaders/s4y/sqrz.s4r",
    // "/shaders/s4y/ice_ice_bby.frag",
    // "/shaders/s4y/streamulate.s4r",
    // "/shaders/s4y/reel_1.s4r",
    // "/shaders/s4y/streamulate.s4r",

    // "/shaders/s4y/stars.s4r",
    // "/shaders/s4y/stars.s4r",
    // "/shaders/s4y/bean.s4r",


    //
    // "/shaders/s4y/streamulate.s4r",
    // "/shaders/s4y/jellyCube.frag",




    // "/shaders/util/editor.s4r",

    // "/shaders/util/editor.s4r",


    // "/shaders/s4y/cam.s4r",

    // "/shaders/s4y/cam.s4r",

    // "/shaders/s4y/snapshot.js",
    // "/shaders/s4y/snapshot.s4r",

    // "/shaders/s4y/boxify.s4r",



    // "/shaders/s4y/clouds.frag",

    // "/shaders/s4y/bpm.s4r",
    // "/shaders/s4y/streamulate.s4r",



// 
    // "/shaders/s4y/videoglitch.s4r",

    // {
    //   path: "/shaders/s4y/inv.s4r",
    //   params: {
    //     _flash: 0,
    //     _fade: 0,
    //     _lastBeat: 0,
    //     flash() {
    //       this.params._flash *= 0.99;
    //       const beat = Math.floor(ctx.params.beat / Math.max(1/4, (Math.floor(ctx.midi.knob7 * 4) / 4)));
    //       if (beat != this.params._lastBeat) {
    //         this.params._flash = 1;
    //         this.params._lastBeat = beat;
    //       }
    //       return this.params._flash;
    //     },
    //     fade() {
    //       console.log(this.params._fade);
    //       this.params._fade *= 0.95;
    //       if (ctx.midi.kbutton7)
    //         this.params._fade = 1;
    //       return this.params._fade;
    //     }
    //   },
    //   if(ctx) { return this.params.fade() > 0; },
    // },
    // "/shaders/util/build_flash.s4r",


    //


    // "/shaders/s4y/rectTun.s4r",
    {
      path: "/shaders/s4y/glitch.s4r",
      params: {
        // colorChaos: 1,
        colorChaos(ctx) { return ctx.midi.knob4; }
      },
      if(ctx) { return ctx.midi.button9; },
    },

    // "/shaders/s4y/chonkify.s4r",
    // "/shaders/s4y/chonkify.s4r",
    // "/shaders/s4y/streamulate.s4r",

    // "/shaders/s4y/kaleid.s4r",

    {
      path: "/shaders/s4y/stall.s4r",
      params: {
        amt: 0,
        prg: 0,
      },
      if(ctx) {
        const btn = ctx.midi.button14;
        this.params.amt *= 0.95;
        this.params.prg *= 0.95;
        if (btn) {
          this.params.amt = 1;
          this.params.prg = Math.min(this.params.prg + 0.1, 1);
        }
        return btn;
      },
    },

    {
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
      path: "/shaders/s4y/hook.s4r",
      params: {
        _amt: 0,
        amt() { this.params._amt *= 0.95; if (ctx.midi.button11) this.params._amt = 1; return -this.params._amt; },
      },
      if(ctx) { return Math.abs(this.params.amt.call(this)) > 0.01; },
    },
    {
      path: "/shaders/s4y/hook.s4r",
      params: {
        _amt: 0,
        amt() { this.params._amt *= 0.95; if (ctx.midi.button12) this.params._amt = 1; return this.params._amt; },
      },
      if(ctx) { return Math.abs(this.params.amt.call(this)) > 0.01; },
    },

    {
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
      path: "/shaders/s4y/inv.s4r",
      params: {
        _amt: 0,
        amt(ctx) { this.params._amt *= 0.96; if (ctx.midi.button10) this.params._amt = 1; return this.params._amt; },
      },
      if(ctx) { return this.params.amt.call(this, ctx) > 0; },
    },

    // "/shaders/s4y/veryedgefade.s4r",
    "/shaders/s4y/circlefade.s4r",
  ],
  avatar: [
  ],
};
