# constructor

<video src="https://user-images.githubusercontent.com/111870/125859043-fa65041c-4126-4759-8aa4-9d82734458a0.mp4" muted autoplay loop></video>

A platform for live shader performance. Key features:

- UI and rendering are 100% web-based.
- Supports s4r (a stack-based metalanguage for writing shaders), 
- Audio FFT available to shaders
- Changes to shaders are loaded on the fly.
- Changes are only visible to you until you send them to the audience with the "take" button.
- MIDI controller input
- Any number of outputs via any number of computers (which don't have to be the same as yours!)

Documentation is limited right now because I'm mainly making this for myself.

## Running

Prerequisites: `golang`.

1. `git clone https://github.com/s4y/constructor && cd constructor`
2. `git submodule update --init`
3. `make run`
4. Edit `static/shaders/hello/hello.frag`. Changes to it or files it includes should hot reload.
