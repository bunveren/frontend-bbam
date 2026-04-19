import * as Speech from 'expo-speech';

class FeedbackProvider {
  constructor() {
    this.lastFeedbackTime = 0;
    this.errorThreshold = 5000;
    this.lastSpokenTime = 0;
    this.lastMessage = "";
    this.globalMinGap = 1500;
  }

  processFeedback(evaluation) {
    const currentTime = Date.now();

    if (!evaluation.isCorrect) {
      if (evaluation.message !== this.lastMessage || (currentTime - this.lastFeedbackTime > this.errorThreshold)) {
        this.triggerVoiceOutput(evaluation.message, 'ERROR');
        this.lastFeedbackTime = currentTime;
      }
      return evaluation.message;
    }

    return "Looking good!";
  }

  async triggerVoiceOutput(message, type = 'INFO', onDoneCallback) {
    const now = Date.now();
    if (type === 'COUNT' || type === 'INFO') {
      await Speech.stop(); 
    } else {
      if (now - this.lastSpokenTime < this.globalMinGap) return;
      if (type === 'ERROR' && message === this.lastMessage && (now - this.lastSpokenTime < this.errorThreshold)) return;
    }

    this.lastSpokenTime = now;
    this.lastMessage = message;

    Speech.speak(message.toString(), {
      language: 'en',
      pitch: 1.0,
      rate: 1.2,
      onDone: () => {
        if (onDoneCallback) onDoneCallback();
      }
    });
  }
}

export const feedbackProvider = new FeedbackProvider();