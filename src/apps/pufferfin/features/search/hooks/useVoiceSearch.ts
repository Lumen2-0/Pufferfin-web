import { useCallback, useEffect, useRef, useState } from 'react';

/** The part of the Web Speech API used here; not every DOM lib version ships its types. */
interface RecognitionResultEvent {
    results: ArrayLike<ArrayLike<{ transcript: string }>>
}

interface Recognition {
    lang: string
    interimResults: boolean
    maxAlternatives: number
    onresult: ((event: RecognitionResultEvent) => void) | null
    onerror: (() => void) | null
    onend: (() => void) | null
    start: () => void
    abort: () => void
}

type RecognitionConstructor = new () => Recognition;

const getRecognitionConstructor = (): RecognitionConstructor | undefined => {
    const scope = window as unknown as {
        SpeechRecognition?: RecognitionConstructor
        webkitSpeechRecognition?: RecognitionConstructor
    };
    return scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
};

export type VoiceState = 'idle' | 'listening' | 'error';

/**
 * Dictation through the browser speech recognition, when the browser has it.
 * `isSupported` is false otherwise, and the caller hides the voice button.
 */
export function useVoiceSearch(locale: string, onTranscript: (text: string) => void) {
    const [ state, setState ] = useState<VoiceState>('idle');
    const recognitionRef = useRef<Recognition>();
    const onTranscriptRef = useRef(onTranscript);
    onTranscriptRef.current = onTranscript;

    const isSupported = !!getRecognitionConstructor();

    // Stop listening when the screen goes away
    useEffect(() => () => recognitionRef.current?.abort(), []);

    const start = useCallback(() => {
        const RecognitionClass = getRecognitionConstructor();
        if (!RecognitionClass) return;

        recognitionRef.current?.abort();
        const recognition = new RecognitionClass();
        recognition.lang = locale;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = event => {
            const transcript = Array.from(event.results)
                .map(result => result[0]?.transcript ?? '')
                .join('');
            onTranscriptRef.current(transcript);
        };
        recognition.onerror = () => setState('error');
        recognition.onend = () => setState(current => (current === 'listening' ? 'idle' : current));

        recognitionRef.current = recognition;
        setState('listening');
        try {
            recognition.start();
        } catch (err) {
            console.error('[Pufferfin] Voice search failed to start', err);
            setState('error');
        }
    }, [ locale ]);

    const stop = useCallback(() => {
        recognitionRef.current?.abort();
        setState('idle');
    }, []);

    return { isSupported, state, start, stop };
}
