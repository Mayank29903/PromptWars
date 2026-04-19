class PanicDetector:
    """
    Audio-based panic detection proxy. Analyses aggregated audio features
    (amplitude envelope) to detect crowd panic patterns. Works alongside
    CrushRiskDetector as an independent signal source.
    """

    PANIC_THRESHOLD = 0.75
    CONSECUTIVE_REQUIRED = 2

    def __init__(self):
        self.panic_score = 0.0
        self.consecutive_high = 0

    def detect(self, audio_features: list) -> dict:
        """
        Evaluate audio features for panic indicators.

        Args:
            audio_features: list of float amplitude values (0.0–1.0) from
                            microphone array segments across the zone.

        Returns:
            dict with is_panic (bool), panic_score (float), recommendation (str)
        """
        if not audio_features:
            self.panic_score = 0.0
            self.consecutive_high = 0
            return {
                'is_panic': False,
                'panic_score': 0.0,
                'recommendation': 'No audio data available'
            }

        mean_amplitude = sum(audio_features) / len(audio_features)
        peak_amplitude = max(audio_features)

        # Weighted score: 60% mean amplitude, 40% peak (sudden spikes matter)
        self.panic_score = round(0.6 * mean_amplitude + 0.4 * peak_amplitude, 4)

        if self.panic_score >= self.PANIC_THRESHOLD:
            self.consecutive_high += 1
        else:
            self.consecutive_high = 0

        is_panic = self.consecutive_high >= self.CONSECUTIVE_REQUIRED

        if is_panic:
            recommendation = 'ALERT: Crowd panic audio detected — dispatch security and verify visually'
        elif self.panic_score >= 0.5:
            recommendation = 'WATCH: Elevated crowd noise — monitor zone cameras'
        else:
            recommendation = 'NORMAL: Ambient noise within expected range'

        return {
            'is_panic': is_panic,
            'panic_score': self.panic_score,
            'recommendation': recommendation
        }
