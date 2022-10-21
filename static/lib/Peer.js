const rtcConfig = {};

export default class Peer {
  constructor(sc, id, stream, polite) {
    this.sc = sc;
    this.id = id;
    this.polite = polite;
    this.videoEl = document.createElement('video');
    this.videoEl.muted = true;
    this.videoEl.autoplay = true;
    this.videoEl.playsInline = true;
    this.videoEl.onclick = () => this.videoEl.play();
    this.pc = new RTCPeerConnection(rtcConfig);
    this.pc.onnegotiationneeded = async e => {
      if (this.polite && !this.pc.remoteDescription)
        return;
      this.makingOffer = true;
      await this.renegotiate();
      this.makingOffer = false;
    };
    this.pc.onicecandidate = e => {
      this.sendToPeer('ice', e.candidate);
    };
    this.pc.ontrack = e => {
      this.videoEl.srcObject = e.streams[0];
      this.videoEl.play();
    };
    if (stream)
      this.addStream(stream);
    else if (!polite)
      this.renegotiate();
  }
  async renegotiate() {
    const { pc } = this;
    await pc.setLocalDescription();
    this.sendToPeer('sdp', pc.localDescription);
    if (pc.localDescription.type == 'offer')
      this.waitingForAnswer = true;
  }
  async receiveFromPeer({ type, body }) {
    const { pc } = this;
    if (type == 'sdp') {
      if (body.type == 'offer') {
        if (this.polite || (!this.makingOffer && !this.waitingForAnswer)) {
          await this.pc.setRemoteDescription(body);
          this.renegotiate();
        }
      } else {
        this.waitingForAnswer = false;
        await this.pc.setRemoteDescription(body);
      }
    } else if (type == 'ice') {
      if (!this.makingOffer && !this.waitingForAnswer)
        this.pc.addIceCandidate(body);
    }
  }
  sendToPeer(type, body) {
    this.sc.send('peerMessage', { to: this.id, body: { type, body } });
  }
  addStream(stream) {
    const { pc } = this;
    for (const track of stream.getTracks())
      pc.addTrack(track, stream);
  }
  close() {
    this.videoEl.srcObject = null;
    this.pc.close();
  }
}
