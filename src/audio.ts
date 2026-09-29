export function createAmbience() {
  const context = new AudioContext();
  const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
  const channel = buffer.getChannelData(0);
  let brown = 0;
  for (let i=0;i<channel.length;i++) { brown=(brown+Math.random()*.04-.02)/1.02;channel[i]=brown*3; }
  const source=context.createBufferSource();source.buffer=buffer;source.loop=true;
  const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1100;
  const volume=context.createGain();volume.gain.value=.32;
  source.connect(filter).connect(volume).connect(context.destination);source.start();
  return { start:()=>context.resume(), stop:()=>context.suspend(), dispose:()=>{source.stop();void context.close();} };
}
