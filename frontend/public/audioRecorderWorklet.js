class AudioRecorderProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this._initialized = false;
        this._isRecording = true;
        console.log('AudioRecorderProcessor initialized');
        
        this.port.onmessage = (event) => {
            if (event.data === 'stop') {
                console.log('AudioWorklet received stop command');
                this._isRecording = false;
            }
        };
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || !input[0] || !this._isRecording) {
            console.log('AudioWorklet stopping');
            return false;
        }

        if (!this._initialized) {
            console.log('First audio chunk received');
            this._initialized = true;
        }

        const channelData = input[0];
        this.port.postMessage({
            eventType: 'data',
            audioData: channelData
        });

        return true;
    }
}

registerProcessor('audio-recorder-worklet', AudioRecorderProcessor); 