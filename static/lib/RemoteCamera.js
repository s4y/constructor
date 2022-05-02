export default class RemoteCamera {
  constructor() {
    const pc = this.pc = new RTCPeerConnection();
    this.stream = new MediaStream([]);

    pc.setLocalDescription().then(async () => {
      const initialOffer = JSON.stringify(pc.localDescription);
      reserve.broadcast({
        initialOffer,
        offer: pc.localDescription,
      });
      pc.onnegotiationneeded = async e => {
        await pc.setLocalDescription();
        console.log('neg send', pc.localDescription);
        reserve.broadcast({
          initialOffer,
          offer: pc.localDescription,
        });
      }
      pc.onsignalingstatechange = e => {
        console.log('state', pc.signalingState);
      };
      window.addEventListener('broadcast', async e => {
        const { response } = e.detail;
        if (e.detail.type == 'cam')
          location.reload();
        if (!response)
          return;
        if (response.initialOffer != initialOffer)
          return;
        if (response.answer) {
          console.log(response.answer);
          await pc.setRemoteDescription(response.answer);
          if (response.answer.type == 'offer')
            pc.onnegotiationneeded();
        } if (response.ice)
          pc.addIceCandidate(response.ice);
      });
    });

    pc.ontrack = e => {
      this.stream.addTrack(e.track);
      if (this.onaddtrack)
        this.onaddtrack();
    };
  }
}
