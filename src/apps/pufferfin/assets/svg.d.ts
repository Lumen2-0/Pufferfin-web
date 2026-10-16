declare module '*.svg' {
    // SVG imports are emitted as files by the bundler and resolve to their URL
    const value: string;
    export default value;
}

declare module '*.mp4' {
    const src: string;
    export default src;
}

declare module '*.png' {
    const src: string;
    export default src;
}
