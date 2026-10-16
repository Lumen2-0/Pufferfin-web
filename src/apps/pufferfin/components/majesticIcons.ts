// Drawings of Majesticons (MIT, majesticons.com), 24px grid, 2px stroke
export type Shape = [ 'path' | 'circle', Record<string, string> ];

export const MAJESTIC: Record<string, Shape[]> = {
    ArrowDownward: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'm12 19 6-6m-6 6-6-6m6 6V5'
            }
        ]
    ],
    ArrowForward: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'm19 12-6-6m6 6-6 6m6-6H5'
            }
        ]
    ],
    ArrowUpward: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'm12 5 6 6m-6-6-6 6m6-6v14'
            }
        ]
    ],
    Block: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M5.636 5.636a9 9 0 1 0 12.728 12.728M5.636 5.636a9 9 0 1 1 12.728 12.728M5.636 5.636 12 12l6.364 6.364'
            }
        ]
    ],
    Bookmark: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M17 3H7a2 2 0 0 0-2 2v15.138a.5.5 0 0 0 .748.434l5.26-3.005a2 2 0 0 1 1.984 0l5.26 3.006a.5.5 0 0 0 .748-.435V5a2 2 0 0 0-2-2z'
            }
        ]
    ],
    BookmarkFilled: [
        [
            'path',
            {
                fill: 'currentColor',
                fillRule: 'evenodd',
                d: 'M7 2a3 3 0 0 0-3 3v15.138a1.5 1.5 0 0 0 2.244 1.303l5.26-3.006a1 1 0 0 1 .992 0l5.26 3.006A1.5 1.5 0 0 0 20 20.138V5a3 3 0 0 0-3-3H7z',
                clipRule: 'evenodd'
            }
        ]
    ],
    PhotoCamera: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M3 18V9a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 10.07 4h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 18.07 7H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'
            }
        ],
        [
            'circle',
            {
                cx: '12',
                cy: '13',
                r: '3',
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2'
            }
        ]
    ],
    Cast: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M3 20h.01M7 20a4 4 0 0 0-4-4m8 4a8 8 0 0 0-8-8'
            }
        ],
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M3 8.5V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4'
            }
        ]
    ],
    CastConnected: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M3 20h.01M7 20a4 4 0 0 0-4-4m8 4a8 8 0 0 0-8-8'
            }
        ],
        [
            'path',
            {
                fill: 'currentColor',
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M19 4H5a2 2 0 0 0-2 2v2.5c4 .167 12 2.7 12 11.5h4a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z'
            }
        ]
    ],
    Check: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'm5 12.5 4.5 4.5L19 7'
            }
        ]
    ],
    CheckCircle: [
        [
            'circle',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                cx: '12',
                cy: '12',
                r: '9'
            }
        ],
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'm8.5 12.5 2.5 2.5 4.5-5'
            }
        ]
    ],
    Close: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M12 12 7 7m5 5 5 5m-5-5 5-5m-5 5-5 5'
            }
        ]
    ],
    CloudOutlined: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M2 13.5C2 17.9 5.667 19 7.5 19h10c1.5 0 4.5-.9 4.5-4.5S19 10 17.5 10c0-1.5-1.5-5-5-5-2.8 0-4.5 2-5 3C5.667 8 2 9.1 2 13.5z'
            }
        ]
    ],
    Delete: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M9 7v0a3 3 0 0 1 3-3v0a3 3 0 0 1 3 3v0M9 7h6M9 7H6m9 0h3m2 0h-2M4 7h2m0 0v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7'
            }
        ]
    ],
    Download: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M12 4v11m0 0 5-5m-5 5-5-5M5 20h14'
            }
        ]
    ],
    ErrorOutline: [
        [
            'circle',
            {
                cx: '12',
                cy: '12',
                r: '9',
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2'
            }
        ],
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M12 8v5m0 3v0'
            }
        ]
    ],
    ExpandMore: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'm17 10-5 5-5-5'
            }
        ]
    ],
    Explore: [
        [
            'circle',
            {
                cx: '12',
                cy: '12',
                r: '9',
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2'
            }
        ],
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'm9.879 9.879 6.364-2.122-2.122 6.364-6.364 2.122L9.88 9.879z'
            }
        ]
    ],
    Extension: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M16.75 6H20a1 1 0 0 1 1 1v3.25a.75.75 0 0 1-.75.75H20a2 2 0 1 0 0 4h.25a.75.75 0 0 1 .75.75V20a1 1 0 0 1-1 1h-3.25a.75.75 0 0 1-.75-.75V20a2 2 0 1 0-4 0v.25a.75.75 0 0 1-.75.75H7a1 1 0 0 1-1-1v-4.25a.75.75 0 0 0-.75-.75H5a2 2 0 1 1 0-4h.25a.75.75 0 0 0 .75-.75V7a1 1 0 0 1 1-1h4.25a.75.75 0 0 0 .75-.75V5a2 2 0 1 1 4 0v.25c0 .414.336.75.75.75z'
            }
        ]
    ],
    Groups: [
        [
            'circle',
            {
                cx: '9',
                cy: '9',
                r: '4',
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2'
            }
        ],
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M16 19c0-3.314-3.134-6-7-6s-7 2.686-7 6m13-6a4 4 0 1 0-3-6.646'
            }
        ],
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M22 19c0-3.314-3.134-6-7-6-.807 0-2.103-.293-3-1.235'
            }
        ]
    ],
    Hub: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M10 4h4v4h-4zm0 12h4v4h-4zm-7 0h4v4H3zm14 0h4v4h-4zm-5-8v4m0 4v-4m0 0h5a2 2 0 0 1 2 2v2m-7-4H7a2 2 0 0 0-2 2v2'
            }
        ]
    ],
    InfoOutlined: [
        [
            'circle',
            {
                cx: '12',
                cy: '12',
                r: '9',
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2'
            }
        ],
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M12 15v-3m0-3v0'
            }
        ]
    ],
    KeyOff: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M15 15a6 6 0 1 0-5.743-4.257L9 11l-5.707 5.707a1 1 0 0 0-.293.707V20a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1 1 1 0 0 1 1-1 1 1 0 0 0 1-1 1 1 0 0 1 1-1h.586a1 1 0 0 0 .707-.293L13 15l.257-.257A5.999 5.999 0 0 0 15 15zm2-6a2 2 0 0 0-2-2'
            }
        ]
    ],
    Lock: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M8 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-2m-8 0V7a4 4 0 0 1 4-4v0a4 4 0 0 1 4 4v3m-8 0h8m-4 4v3'
            }
        ]
    ],
    ManageAccounts: [
        [
            'circle',
            {
                cx: '12',
                cy: '10',
                r: '3',
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2'
            }
        ],
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M17 17c0-2.21-2.239-4-5-4s-5 1.79-5 4'
            }
        ]
    ],
    Menu: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M6 8h12M6 12h12M6 16h12'
            }
        ]
    ],
    MenuBook: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M12 6.603c1.667-1.271 5.5-2.86 9 0V19c-3.5-2.86-7.333-1.271-9 0m0-12.397c-1.667-1.271-5.5-2.86-9 0V19c3.5-2.86 7.333-1.271 9 0m0-12.397V19'
            }
        ]
    ],
    Mic: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M9 6a3 3 0 0 1 3-3v0a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3v0a3 3 0 0 1-3-3V6zm3 12v0a7 7 0 0 1-7-7v0-1m7 8v0a7 7 0 0 0 7-7v0-1m-7 8v3'
            }
        ]
    ],
    Movie: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M17 12V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4zm0 0 4-4v8l-4-4z'
            }
        ]
    ],
    MusicNote: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M13 17V8m0 9c0 1-.6 3-3 3s-3-2-3-3 .6-3 3-3 3 2 3 3zm0-9V4h4v4h-4z'
            }
        ]
    ],
    NetworkCheck: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M3 12h4l3 7 4-14 3 7h4'
            }
        ]
    ],
    OpenInNew: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4m-8-2 8-8m0 0v5m0-5h-5'
            }
        ]
    ],
    Queue: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M20 6h-6m6 4h-6m6 4h-8m8 4H4m4-6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 0V7m0 0h2V6H8v1z'
            }
        ]
    ],
    Refresh: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M19 13.5A7.5 7.5 0 1 1 11.5 6H20m0 0-3-3m3 3-3 3'
            }
        ]
    ],
    Replay: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M4 9v5h5m11 2c-.497-4.5-3.367-8-8-8-2.73 0-5.929 2.268-7.294 5.5'
            }
        ]
    ],
    Search: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'm20 20-4.05-4.05m0 0a7 7 0 1 0-9.9-9.9 7 7 0 0 0 9.9 9.9z'
            }
        ]
    ],
    Storage: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M5 15h14M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4M5 15V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10m-6 3h3'
            }
        ]
    ],
    Sync: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M19 13.5A7.5 7.5 0 1 1 11.5 6H20m0 0-3-3m3 3-3 3'
            }
        ]
    ],
    TravelExplore: [
        [
            'circle',
            {
                cx: '12',
                cy: '12',
                r: '9',
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2'
            }
        ],
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M8 4v2a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v0a2 2 0 0 0 2 2v0a2 2 0 0 0 2-2v0a2 2 0 0 1 2-2h1m0 8h-3a2 2 0 0 0-2 2v2m-4 0v-2a2 2 0 0 0-2-2v0a2 2 0 0 1-2-2v0a2 2 0 0 0-2-2H3'
            }
        ]
    ],
    Tune: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M14 21h-4l-.551-2.48a6.991 6.991 0 0 1-1.819-1.05l-2.424.763-2-3.464 1.872-1.718a7.055 7.055 0 0 1 0-2.1L3.206 9.232l2-3.464 2.424.763A6.992 6.992 0 0 1 9.45 5.48L10 3h4l.551 2.48a6.992 6.992 0 0 1 1.819 1.05l2.424-.763 2 3.464-1.872 1.718a7.05 7.05 0 0 1 0 2.1l1.872 1.718-2 3.464-2.424-.763a6.99 6.99 0 0 1-1.819 1.052L14 21z'
            }
        ],
        [
            'circle',
            {
                cx: '12',
                cy: '12',
                r: '3',
                stroke: 'currentColor',
                strokeWidth: '2'
            }
        ]
    ],
    Tv: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M12 7h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h7zm0 0L8 3m4 4 4-4'
            }
        ]
    ],
    VideoLibrary: [
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M4 9v11M4 9h16M4 9H3l9-5 9 5h-1M4 20h16M4 20H3m17 0V9m0 11h1M8 13v3m4 0v-3m4 0v3'
            }
        ]
    ],
    WarningAmber: [
        [
            'circle',
            {
                cx: '12',
                cy: '12',
                r: '9',
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2'
            }
        ],
        [
            'path',
            {
                stroke: 'currentColor',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                strokeWidth: '2',
                d: 'M12 8v5m0 3v0'
            }
        ]
    ]
};
