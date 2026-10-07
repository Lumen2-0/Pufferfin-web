declare module '*.svg' {
    // SVG imports are emitted as files by the bundler and resolve to their URL
    const value: string;
    export default value;
}
